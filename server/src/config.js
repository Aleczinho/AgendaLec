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
const sslMode = () => {
  const raw = String(env.DB_SSL ?? 'false').trim().toLowerCase()
  if (['', 'false', '0', 'off', 'disable', 'no'].includes(raw)) return 'disable'
  if (['no-verify', 'allow-self-signed', 'insecure'].includes(raw)) return 'no-verify'
  return 'verify'
}

/**
 * Monta a URL de conexão que o Prisma usa (o schema.prisma lê DATABASE_URL).
 * Aceita DATABASE_URL pronta ou as variáveis DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME.
 * Parâmetros que já vierem na DATABASE_URL (connection_limit, sslmode...) são respeitados.
 */
const buildDatabaseUrl = () => {
  let url
  if (env.DATABASE_URL) {
    url = new URL(env.DATABASE_URL)
  } else {
    url = new URL('postgresql://localhost')
    url.hostname = env.DB_HOST || 'localhost'
    url.port = String(int(env.DB_PORT, 5432))
    url.username = encodeURIComponent(env.DB_USER || 'postgres')
    if (env.DB_PASSWORD) url.password = encodeURIComponent(env.DB_PASSWORD)
    url.pathname = `/${encodeURIComponent(env.DB_NAME || 'agendalec')}`
  }
  const params = url.searchParams
  const setDefault = (key, value) => { if (!params.has(key)) params.set(key, String(value)) }

  // Com DATABASE_URL o SSL só é sobrescrito se DB_SSL estiver definido (comportamento anterior).
  if (!env.DATABASE_URL || env.DB_SSL !== undefined) {
    const mode = sslMode()
    params.delete('sslaccept')
    if (mode === 'disable') {
      params.set('sslmode', 'disable')
    } else {
      params.set('sslmode', 'require')
      params.set('sslaccept', mode === 'no-verify' ? 'accept_invalid_certs' : 'strict')
    }
  }
  setDefault('connection_limit', int(env.DB_POOL_MAX, 10))
  setDefault('connect_timeout', Math.max(1, Math.ceil(int(env.DB_CONNECTION_TIMEOUT_MS, 10_000) / 1000)))
  return url.toString()
}

export const config = {
  port: int(env.API_PORT ?? env.PORT, 3001),
  host: env.API_HOST || '0.0.0.0',
  databaseUrl: buildDatabaseUrl(),
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
