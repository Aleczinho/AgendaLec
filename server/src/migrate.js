import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from './db.js'

const migrationsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../migrations')
const LOCK_KEY = 704_201_126 // advisory lock: evita duas instâncias migrando juntas

/** Aplica, em ordem, as migrations .sql ainda não registradas em schema_migrations. */
export const runMigrations = async (log = console.log) => {
  const files = (await fs.readdir(migrationsDir)).filter(name => name.endsWith('.sql')).sort()
  const client = await pool.connect()
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY])
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`)
    const { rows } = await client.query('SELECT name FROM schema_migrations')
    const applied = new Set(rows.map(row => row.name))
    let count = 0
    for (const file of files) {
      if (applied.has(file)) continue
      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8')
      try {
        await client.query('BEGIN')
        await client.query(sql)
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw new Error(`Falha na migration ${file}: ${error.message}`)
      }
      log(`[migrate] aplicada ${file}`)
      count += 1
    }
    if (count === 0) log('[migrate] banco já está atualizado')
  } finally {
    try { await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]) } catch { /* ignore */ }
    client.release()
  }
}
