import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from './config.js'

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASELINE = '20261103000000_init'

/** Roda o CLI do Prisma (instalado em node_modules) com a DATABASE_URL montada a partir do .env. */
export const prismaCli = args => new Promise((resolve, reject) => {
  const child = spawn('npx', ['--no-install', 'prisma', ...args], {
    cwd: serverDir,
    env: { ...process.env, DATABASE_URL: config.databaseUrl },
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  child.stdout.on('data', chunk => { output += chunk })
  child.stderr.on('data', chunk => { output += chunk })
  child.on('error', reject)
  child.on('close', code => resolve({ code, output: output.trim() }))
})

const fail = (what, output) => new Error(`Falha em ${what}:\n${output}`)

/**
 * Aplica as migrations de prisma/migrations (controle na tabela _prisma_migrations).
 *
 * Banco criado pela versão antiga da API (tabelas já existem, mas sem _prisma_migrations):
 * o Prisma recusa com P3005. Nesse caso a migration inicial (idempotente: só IF NOT EXISTS /
 * CREATE OR REPLACE) é executada uma vez para garantir o esquema e marcada como aplicada.
 */
export const runMigrations = async (log = console.log) => {
  let result = await prismaCli(['migrate', 'deploy'])
  if (result.code !== 0 && result.output.includes('P3005')) {
    log('[migrate] banco existente sem histórico do Prisma: adotando a migration inicial')
    const file = `prisma/migrations/${BASELINE}/migration.sql`
    const exec = await prismaCli(['db', 'execute', '--file', file, '--schema', 'prisma/schema.prisma'])
    if (exec.code !== 0) throw fail('db execute (migration inicial)', exec.output)
    const resolved = await prismaCli(['migrate', 'resolve', '--applied', BASELINE])
    if (resolved.code !== 0) throw fail('migrate resolve', resolved.output)
    result = await prismaCli(['migrate', 'deploy'])
  }
  if (result.code !== 0) throw fail('migrate deploy', result.output)
  const applied = [...result.output.matchAll(/Applying migration `([^`]+)`/g)].map(match => match[1])
  if (applied.length === 0) log('[migrate] banco já está atualizado')
  else applied.forEach(name => log(`[migrate] aplicada ${name}`))
}
