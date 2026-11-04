import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from './config.js'
import { query, withTransaction } from './db.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const MIN_PASSWORD_LENGTH = 8
const BCRYPT_ROUNDS = 12
// Hash de uma senha qualquer: usado para gastar o mesmo tempo quando o e-mail não existe.
const DUMMY_HASH = bcrypt.hashSync('agendalec-dummy-password', BCRYPT_ROUNDS)

export const normalizeEmail = value => String(value ?? '').trim().toLowerCase()
export const hashPassword = password => bcrypt.hash(password, BCRYPT_ROUNDS)

const publicUser = row => ({ id: row.id, email: row.email })

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

    const passwordHash = await hashPassword(password)
    const user = await withTransaction(async client => {
      const { rows } = await client.query(
        `INSERT INTO users (email, password_hash) VALUES ($1, $2)
         ON CONFLICT DO NOTHING RETURNING id, email`,
        [email, passwordHash],
      )
      if (rows.length === 0) return null
      await client.query('INSERT INTO profiles (id) VALUES ($1)', [rows[0].id])
      return rows[0]
    })
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
    const { rows } = await query('SELECT id, email, password_hash FROM users WHERE lower(email) = $1', [email])
    const user = rows[0]
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
    const { rows } = await query('SELECT id, email FROM users WHERE id = $1', [req.user.id])
    if (rows.length === 0) return fail(res, 401, 'Conta não encontrada.', 'invalid_token')
    return res.json({ user: publicUser(rows[0]) })
  } catch (error) {
    return next(error)
  }
})
