import bcrypt from 'bcryptjs'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { fromNodeHeaders } from 'better-auth/node'
import { config } from './config.js'
import { prisma } from './db.js'

const BCRYPT_ROUNDS = 12

export const auth = betterAuth({
  appName: 'AgendaLec',
  baseURL: config.authUrl,
  basePath: '/api/auth',
  secret: config.authSecret,
  trustedOrigins: config.trustedOrigins,
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
                               emailAndPassword: {
                                 enabled: true,
                               disableSignUp: !config.allowRegistration,
                               minPasswordLength: 8,
                               maxPasswordLength: 200,
                               autoSignIn: true,
                               // Mantém compatibilidade com os hashes bcrypt das contas já cadastradas.
                               password: {
                                 hash: password => bcrypt.hash(password, BCRYPT_ROUNDS),
                               verify: ({ hash, password }) => bcrypt.compare(password, hash),
                               },
                               },
                               user: {
                                 modelName: 'users',
                               fields: {
                                 emailVerified: 'email_verified',
                               createdAt: 'created_at',
                               updatedAt: 'updated_at',
                               },
                               },
                               session: {
                                 modelName: 'sessions',
                               expiresIn: 60 * 60 * 24 * 7,
                               updateAge: 60 * 60 * 24,
                               fields: {
                                 userId: 'user_id',
                               expiresAt: 'expires_at',
                               ipAddress: 'ip_address',
                               userAgent: 'user_agent',
                               createdAt: 'created_at',
                               updatedAt: 'updated_at',
                               },
                               },
                               account: {
                                 modelName: 'accounts',
                               fields: {
                                 accountId: 'account_id',
                               providerId: 'provider_id',
                               userId: 'user_id',
                               accessToken: 'access_token',
                               refreshToken: 'refresh_token',
                               idToken: 'id_token',
                               accessTokenExpiresAt: 'access_token_expires_at',
                               refreshTokenExpiresAt: 'refresh_token_expires_at',
                               createdAt: 'created_at',
                               updatedAt: 'updated_at',
                               },
                               },
                               verification: {
                                 modelName: 'verifications',
                               fields: {
                                 expiresAt: 'expires_at',
                               createdAt: 'created_at',
                               updatedAt: 'updated_at',
                               },
                               },
                               databaseHooks: {
                                 user: {
                                   create: {
                                     after: async user => {
                                       // Mantém o registro de perfil que o AgendaLec espera após o cadastro.
                                       await prisma.profiles.upsert({
                                         where: { id: user.id },
                                         create: { id: user.id, display_name: user.name || null },
                                         update: {},
                                       })
                                     },
                                   },
                                 },
                               },
                               advanced: {
                                 database: {
                                   // As quatro tabelas usam UUID; o PostgreSQL fornece os IDs.
                                   generateId: false,
                               // Joins desligados: com eles o adaptador do Prisma monta a relação como
                               // `${modelName}s` (accounts -> accountss), que não existe no schema.
                               joins: false,
                                 },
                               },
})

const fail = (res, status, message, code) =>
res.status(status).json({ error: { message, code } })

/** Protege a API de dados usando a sessão de cookie validada pelo Better Auth. */
export const requireAuth = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) })
    if (!session?.user) return fail(res, 401, 'Autenticação necessária. Entre novamente.', 'unauthenticated')
      req.user = { id: session.user.id, email: session.user.email }
      return next()
  } catch (error) {
    return next(error)
  }
}
