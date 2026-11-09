import { config } from '../src/config.js'
import { runMigrations } from '../src/migrate.js'

try {
  console.log(`Aplicando migrations em ${config.databaseLabel}`)
  await runMigrations()
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
