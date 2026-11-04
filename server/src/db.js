import pg from 'pg'
import { config } from './config.js'

// DATE e TIME devem chegar ao navegador como texto ("2026-11-03", "08:00:00").
// Sem isso o driver cria um Date em fuso local e o dia pode "andar" na serialização.
pg.types.setTypeParser(1082, value => value)
pg.types.setTypeParser(1083, value => value)
// timestamptz sempre em ISO-8601 UTC.
pg.types.setTypeParser(1184, value => new Date(value).toISOString())

export const pool = new pg.Pool(config.database)
pool.on('error', error => console.error('[db] erro em conexão ociosa:', error.message))

export const query = (text, params) => pool.query(text, params)

/** Executa `fn(client)` dentro de uma transação. */
export const withTransaction = async fn => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    try { await client.query('ROLLBACK') } catch { /* conexão já perdida */ }
    throw error
  } finally {
    client.release()
  }
}
