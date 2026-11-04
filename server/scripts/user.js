// Uso:
//   node scripts/user.js create email@exemplo.com [senha]
//   node scripts/user.js password email@exemplo.com [nova-senha]
// Sem senha na linha de comando, ela é pedida no terminal (não fica no histórico).
import { randomUUID } from 'node:crypto'
import readline from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/db.js'
import { runMigrations } from '../src/migrate.js'

const [command, rawEmail, rawPassword] = process.argv.slice(2)
const MIN_PASSWORD_LENGTH = 8
const BCRYPT_ROUNDS = 12

const usage = () => {
  console.error('Uso: node scripts/user.js <create|password> <email> [senha]')
  process.exitCode = 1
}

const askPassword = async () => {
  const rl = readline.createInterface({ input: stdin, output: stdout })
  try { return await rl.question('Senha: ') } finally { rl.close() }
}

try {
  if (!['create', 'password'].includes(command) || !rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
    usage()
  } else {
    const email = rawEmail.trim().toLowerCase()
    const password = rawPassword ?? await askPassword()
    if (password.length < MIN_PASSWORD_LENGTH || password.length > 200) {
      throw new Error('A senha precisa ter entre 8 e 200 caracteres.')
    }

    await runMigrations(() => {})
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS)

    if (command === 'create') {
      const id = randomUUID()
      await prisma.$transaction(async tx => {
        const user = await tx.users.create({
          data: { id, name: email.split('@')[0], email, email_verified: false },
          select: { id: true },
        })
        await tx.profiles.create({ data: { id: user.id, display_name: email.split('@')[0] } })
        await tx.accounts.create({
          data: {
            id: randomUUID(), account_id: user.id, provider_id: 'credential',
            user_id: user.id, password: hash,
          },
        })
      })
      console.log(`Usuário criado: ${email}`)
    } else {
      const user = await prisma.users.findFirst({ where: { email }, select: { id: true } })
      if (!user) throw new Error('Usuário não encontrado.')
      await prisma.$transaction(async tx => {
        const updated = await tx.accounts.updateMany({
          where: { user_id: user.id, provider_id: 'credential', account_id: user.id },
          data: { password: hash, updated_at: new Date() },
        })
        if (updated.count === 0) throw new Error('Credencial de senha não encontrada para este usuário.')
        // Revoga as sessões existentes quando a senha é redefinida pelo administrador.
        await tx.sessions.deleteMany({ where: { user_id: user.id } })
      })
      console.log(`Senha atualizada: ${email}; sessões anteriores revogadas.`)
    }
  }
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
