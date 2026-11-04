import { PrismaClient, Prisma } from '@prisma/client'
import { config } from './config.js'

export { Prisma }

/**
 * Único ponto de acesso ao banco. Toda leitura/escrita da API passa pelo Prisma Client.
 * O pool de conexões é configurado pela URL (connection_limit, connect_timeout).
 */
export const prisma = new PrismaClient({
  datasources: { db: { url: config.databaseUrl } },
  log: ['warn', 'error'],
})

/** Executa `fn(tx)` dentro de uma transação (commit se resolver, rollback se lançar). */
export const withTransaction = (fn, options = {}) => prisma.$transaction(fn, {
  maxWait: 10_000,
  timeout: 30_000,
  ...options,
})
