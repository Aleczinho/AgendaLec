import { config } from '../src/config.js'
import { pool } from '../src/db.js'
import { runMigrations } from '../src/migrate.js'

try {
  console.log(`Aplicando migrations em ${config.databaseLabel}`)
  await runMigrations()
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  await pool.end()
}
