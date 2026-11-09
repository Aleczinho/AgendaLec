// Atalho para o CLI do Prisma já com a DATABASE_URL montada a partir do .env da raiz.
//   npm run prisma -- studio
//   npm run prisma -- migrate dev --name minha_mudanca
//   npm run prisma -- migrate status
import { spawnSync } from 'node:child_process'
import { config } from '../src/config.js'

const result = spawnSync('npx', ['--no-install', 'prisma', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: config.databaseUrl },
  shell: process.platform === 'win32',
})
process.exit(result.status ?? 1)
