// Uso:
//   npm run user:create   -- email@exemplo.com [senha]
//   npm run user:password -- email@exemplo.com [nova-senha]
// Sem senha na linha de comando, ela é pedida no terminal (não fica no histórico).
import readline from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { config } from '../src/config.js'
import { pool, withTransaction } from '../src/db.js'
import { runMigrations } from '../src/migrate.js'
import { MIN_PASSWORD_LENGTH, hashPassword, normalizeEmail } from '../src/auth.js'

const [command, rawEmail, rawPassword] = process.argv.slice(2)

const usage = () => {
  console.error('Uso: node scripts/user.js <create|password> <email> [senha]')
  process.exitCode = 1
}

const askPassword = async () => {
  const rl = readline.createInterface({ input: stdin, output: stdout })
  try {
    return await rl.question('Senha: ')
  } finally {
    rl.close()
  }
}

try {
  if (!['create', 'password'].includes(command) || !rawEmail) {
    usage()
  } else {
    const email = normalizeEmail(rawEmail)
    const password = rawPassword ?? await askPassword()
    if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`)
    const passwordHash = await hashPassword(password)
    await runMigrations(() => {}) // garante que as tabelas existem mesmo antes de a API subir pela 1ª vez

    if (command === 'create') {
      await withTransaction(async client => {
        const { rows } = await client.query(
          'INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id',
          [email, passwordHash],
        )
        if (rows.length === 0) throw new Error('Este e-mail já está cadastrado.')
        await client.query('INSERT INTO profiles (id) VALUES ($1)', [rows[0].id])
      })
      console.log(`Usuário criado: ${email} (${config.databaseLabel})`)
    } else {
      const { rowCount } = await pool.query(
        'UPDATE users SET password_hash = $2, updated_at = NOW() WHERE lower(email) = $1',
        [email, passwordHash],
      )
      if (rowCount === 0) throw new Error('Usuário não encontrado.')
      console.log(`Senha atualizada: ${email}`)
    }
  }
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  await pool.end()
}
