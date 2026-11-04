import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

// Lê o .env da raiz do projeto (../.env). Em Docker as variáveis já vêm do
// ambiente e o arquivo não existe — dotenv ignora silenciosamente nesse caso.
const here = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(here, '../../.env') })
dotenv.config() // .env dentro de server/, se existir (não sobrescreve)

const env = process.env

const bool = (value, fallback) => {
  if (value === undefined || value === '') return fallback
  return ['1', 'true', 'yes', 'sim', 'on'].includes(String(value).trim().toLowerCase())
}

const int = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

/** DB_SSL: false | true (valida certificado) | no-verify (TLS sem validar o certificado) */
const sslOption = () => {
  const raw = String(env.DB_SSL ?? 'false').trim().toLowerCase()
  if (['', 'false', '0', 'off', 'disable', 'no'].includes(raw)) return false
  if (['no-verify', 'allow-self-signed', 'insecure'].includes(raw)) return { rejectUnauthorized: false }
  return { rejectUnauthorized: true }
}

const databaseConfig = () => {
  const common = {
    max: int(env.DB_POOL_MAX, 10),
    connectionTimeoutMillis: int(env.DB_CONNECTION_TIMEOUT_MS, 10_000),
    idleTimeoutMillis: 30_000,
  }
  if (env.DATABASE_URL) {
    const ssl = env.DB_SSL === undefined ? undefined : sslOption()
    return { connectionString: env.DATABASE_URL, ...(ssl === undefined ? {} : { ssl }), ...common }
  }
  return {
    host: env.DB_HOST || 'localhost',
    port: int(env.DB_PORT, 5432),
    user: env.DB_USER || 'postgres',
    password: env.DB_PASSWORD || undefined,
    database: env.DB_NAME || 'agendalec',
    ssl: sslOption(),
    ...common,
  }
}

export const config = {
  port: int(env.API_PORT ?? env.PORT, 3001),
  host: env.API_HOST || '0.0.0.0',
  database: databaseConfig(),
  databaseLabel: env.DATABASE_URL
    ? 'DATABASE_URL'
    : `${env.DB_USER || 'postgres'}@${env.DB_HOST || 'localhost'}:${int(env.DB_PORT, 5432)}/${env.DB_NAME || 'agendalec'}`,
  autoMigrate: bool(env.DB_AUTO_MIGRATE, true),
  jwtSecret: env.JWT_SECRET || '',
  jwtExpiresIn: env.JWT_EXPIRES_IN || '7d',
  allowRegistration: bool(env.ALLOW_REGISTRATION, false),
  corsOrigins: (env.CORS_ORIGIN || '').split(',').map(item => item.trim()).filter(Boolean),
  bodyLimit: env.API_BODY_LIMIT || '10mb',
}

/** Retorna a lista de problemas de configuração que impedem o servidor de subir. */
export const configProblems = () => {
  const problems = []
  if (!config.jwtSecret || config.jwtSecret.length < 32) {
    problems.push('JWT_SECRET precisa ter pelo menos 32 caracteres. Gere um com: openssl rand -hex 48')
  }
  if (!env.DATABASE_URL && !env.DB_HOST) {
    problems.push('Configure DB_HOST (e DB_PORT, DB_USER, DB_PASSWORD, DB_NAME) ou DATABASE_URL no .env.')
  }
  return problems
}
