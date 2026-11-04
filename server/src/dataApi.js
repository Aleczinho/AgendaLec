import { Router } from 'express'
import { prisma, withTransaction } from './db.js'
import { requireAuth } from './auth.js'
import { ApiError, toApiError } from './errors.js'
import { execute } from './dataOps.js'
import { RPCS, coerceArg } from './routineOps.js'

const sendError = (res, error) => {
  const apiError = toApiError(error)
  if (apiError) {
    return res.status(apiError.status).json({ data: null, error: { message: apiError.message, code: apiError.code } })
  }
  console.error('[api] erro inesperado:', error)
  return res.status(500).json({ data: null, error: { message: 'Erro interno do servidor.' } })
}

export const dataRouter = Router()
dataRouter.use(requireAuth)

dataRouter.post('/db', async (req, res) => {
  try {
    const body = req.body ?? {}
    // Leituras não precisam de transação; escritas rodam todas dentro de uma.
    const result = body.op === 'select'
      ? await execute(prisma, req.user.id, body)
      : await withTransaction(tx => execute(tx, req.user.id, body))
    res.json({ ...result, error: null })
  } catch (error) {
    sendError(res, error)
  }
})

dataRouter.post('/rpc/:name', async (req, res) => {
  try {
    const rpc = Object.hasOwn(RPCS, req.params.name) ? RPCS[req.params.name] : undefined
    if (!rpc) throw new ApiError(`Função desconhecida: ${req.params.name}`, { status: 404, code: '42883' })
    const args = req.body?.args ?? {}
    const parsed = {}
    for (const [name, type] of rpc.args) {
      if (args[name] === undefined || args[name] === null) throw new ApiError(`Parâmetro obrigatório: ${name}`)
      parsed[name] = coerceArg(type, args[name], name)
    }
    await withTransaction(tx => rpc.run(tx, req.user.id, parsed))
    res.json({ data: null, error: null })
  } catch (error) {
    sendError(res, error)
  }
})
