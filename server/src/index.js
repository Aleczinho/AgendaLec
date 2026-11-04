import express from 'express'
import cors from 'cors'
import { config, configProblems } from './config.js'
import { prisma } from './db.js'
import { runMigrations } from './migrate.js'
import { authRouter } from './auth.js'
import { dataRouter } from './dataApi.js'

const problems = configProblems()
if (problems.length > 0) {
  console.error('Configuração inválida:\n' + problems.map(problem => `  - ${problem}`).join('\n'))
  process.exit(1)
}

const app = express()
app.disable('x-powered-by')
// Atrás do nginx/proxy reverso em rede privada o IP real vem em X-Forwarded-For.
app.set('trust proxy', 'loopback, linklocal, uniquelocal')

if (config.corsOrigins.length > 0) {
  app.use(cors({ origin: config.corsOrigins, allowedHeaders: ['Content-Type', 'Authorization'] }))
}
app.use(express.json({ limit: config.bodyLimit }))

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1` // ping: único SQL literal do sistema, sem parâmetros
    res.json({ status: 'ok' })
  } catch {
    res.status(503).json({ status: 'database_unavailable' })
  }
})

app.use('/api/auth', authRouter)
app.use('/api', dataRouter)

app.use('/api', (_req, res) => res.status(404).json({ error: { message: 'Rota não encontrada.' } }))

// eslint-disable-next-line no-unused-vars
app.use((error, _req, res, _next) => {
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ error: { message: 'Requisição grande demais.' } })
  }
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'JSON inválido.' } })
  }
  console.error('[api] erro inesperado:', error)
  return res.status(500).json({ error: { message: 'Erro interno do servidor.' } })
})

const start = async () => {
  try {
    await prisma.$connect()
  } catch (error) {
    console.error(`Não foi possível conectar ao PostgreSQL (${config.databaseLabel}): ${error.message}`)
    console.error('Confira DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME e DB_SSL no .env, e se o servidor aceita conexões desta máquina (pg_hba.conf / firewall).')
    process.exit(1)
  }
  console.log(`[db] conectado a ${config.databaseLabel}`)
  if (config.autoMigrate) await runMigrations()

  const server = app.listen(config.port, config.host, () => {
    console.log(`[api] AgendaLec ouvindo em http://${config.host}:${config.port}`)
    if (config.allowRegistration) console.log('[api] cadastro aberto (ALLOW_REGISTRATION=true)')
  })

  const shutdown = signal => {
    console.log(`[api] ${signal} recebido, encerrando...`)
    server.close(() => prisma.$disconnect().finally(() => process.exit(0)))
    setTimeout(() => process.exit(1), 10_000).unref()
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

start().catch(error => {
  console.error('Falha ao iniciar:', error.message)
  process.exit(1)
})
