import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from './config.js'
import { prisma, Prisma } from './db.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const MIN_PASSWORD_LENGTH = 8
const BCRYPT_ROUNDS = 12
// Hash de uma senha qualquer: usado para gastar o mesmo tempo quando o e-mail não existe.
const DUMMY_HASH = bcrypt.hashSync('agendalec-dummy-password', BCRYPT_ROUNDS)

export const normalizeEmail = value => String(value ?? '').trim().toLowerCase()
export const hashPassword = password => bcrypt.hash(password, BCRYPT_ROUNDS)

const publicUser = row => ({ id: row.id, email: row.email })

// Os e-mails são sempre gravados já normalizados (minúsculos) por register e pelo scripts/user.js,
// então a busca é por igualdade exata no valor normalizado.
const findUserByEmail = email => prisma.users.findFirst({
  where: { email },
  select: { id: true, email: true, password_hash: true },
})

/**
 * Cria usuário + perfil na mesma transação. Devolve null se o e-mail já existe
 * (o índice único em lower(email) do banco recusa duplicatas, inclusive com caixa diferente).
 */
export const createAccount = async (email, passwordHash) => {
  try {
    return await prisma.$transaction(async tx => {
      const user = await tx.users.create({
        data: { email, password_hash: passwordHash },
        select: { id: true, email: true },
      })
      await tx.profiles.create({ data: { id: user.id } })
      return user
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return null
    throw error
  }
}

const signToken = user => jwt.sign(
  { email: user.email },
  config.jwtSecret,
  { subject: user.id, expiresIn: config.jwtExpiresIn, algorithm: 'HS256' },
)

const fail = (res, status, message, code) => res.status(status).json({ error: { message, code } })

export const requireAuth = (req, res, next) => {
  const header = req.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return fail(res, 401, 'Autenticação necessária.', 'unauthenticated')
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] })
    req.user = { id: payload.sub, email: payload.email }
    return next()
  } catch {
    return fail(res, 401, 'Sessão expirada. Entre novamente.', 'invalid_token')
  }
}

// Limite simples de tentativas por IP+e-mail (em memória; suficiente para uma instância).
const attempts = new Map()
const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 10

const attemptKey = req => `${req.ip}|${normalizeEmail(req.body?.email)}`
const isLimited = key => {
  const entry = attempts.get(key)
  if (!entry) return false
  if (Date.now() - entry.first > WINDOW_MS) {
    attempts.delete(key)
    return false
  }
  return entry.count >= MAX_ATTEMPTS
}
const registerFailure = key => {
  const entry = attempts.get(key)
  if (!entry || Date.now() - entry.first > WINDOW_MS) attempts.set(key, { first: Date.now(), count: 1 })
  else entry.count += 1
}
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of attempts) if (now - entry.first > WINDOW_MS) attempts.delete(key)
}, WINDOW_MS).unref()

export const authRouter = Router()

authRouter.post('/register', async (req, res, next) => {
  try {
    if (!config.allowRegistration) {
      return fail(res, 403, 'O cadastro de novas contas está desativado neste servidor.', 'signup_disabled')
    }
    const email = normalizeEmail(req.body?.email)
    const password = String(req.body?.password ?? '')
    if (!EMAIL_PATTERN.test(email) || email.length > 254) return fail(res, 400, 'Informe um e-mail válido.', 'invalid_email')
    if (password.length < MIN_PASSWORD_LENGTH) {
      return fail(res, 400, `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`, 'weak_password')
    }
    if (password.length > 200) return fail(res, 400, 'A senha é longa demais.', 'weak_password')

    const user = await createAccount(email, await hashPassword(password))
    if (!user) return fail(res, 409, 'Este e-mail já está cadastrado.', 'email_exists')
    return res.status(201).json({ token: signToken(user), user: publicUser(user) })
  } catch (error) {
    return next(error)
  }
})

authRouter.post('/login', async (req, res, next) => {
  try {
    const key = attemptKey(req)
    if (isLimited(key)) {
      return fail(res, 429, 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.', 'rate_limited')
    }
    const email = normalizeEmail(req.body?.email)
    const password = String(req.body?.password ?? '')
    const user = await findUserByEmail(email)
    const valid = await bcrypt.compare(password.slice(0, 200), user?.password_hash ?? DUMMY_HASH)
    if (!user || !valid) {
      registerFailure(key)
      return fail(res, 401, 'E-mail ou senha incorretos.', 'invalid_credentials')
    }
    attempts.delete(key)
    return res.json({ token: signToken(user), user: publicUser(user) })
  } catch (error) {
    return next(error)
  }
})

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.users.findUnique({ where: { id: req.user.id }, select: { id: true, email: true } })
    if (!user) return fail(res, 401, 'Conta não encontrada.', 'invalid_token')
    return res.json({ user: publicUser(user) })
  } catch (error) {
    return next(error)
  }
})
