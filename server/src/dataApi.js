import { Router } from 'express'
import { withTransaction } from './db.js'
import { RPCS, TABLES } from './schema.js'
import { requireAuth } from './auth.js'

class ApiError extends Error {
  constructor(message, { status = 400, code } = {}) {
    super(message)
    this.status = status
    this.code = code
  }
}

const OPERATORS = {
  eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=',
}
const MAX_ROWS = 5000
const ident = name => `"${name}"`

const assertColumn = (def, column) => {
  if (typeof column !== 'string' || !def.columns.has(column)) {
    throw new ApiError(`Coluna desconhecida: ${String(column)}`, { code: 'PGRST204' })
  }
  return column
}

/** Acumula parâmetros posicionais ($1, $2, ...). */
const createParams = () => {
  const values = []
  return {
    values,
    add(value, cast = '') {
      values.push(value)
      return `$${values.length}${cast}`
    },
  }
}

const buildCondition = (def, filter, params) => {
  if (!filter || typeof filter !== 'object') throw new ApiError('Filtro inválido.')
  const column = ident(assertColumn(def, filter.col))
  const { op, value } = filter
  if (op === 'is') {
    if (value === null) return `${column} IS NULL`
    if (value === true) return `${column} IS TRUE`
    if (value === false) return `${column} IS FALSE`
    throw new ApiError('Valor inválido para o operador "is".')
  }
  if (op === 'in') {
    if (!Array.isArray(value)) throw new ApiError('O operador "in" exige uma lista.')
    if (value.length === 0) return 'FALSE'
    return `${column} = ANY(${params.add(value)})`
  }
  if (!Object.hasOwn(OPERATORS, op)) throw new ApiError(`Operador não suportado: ${String(op)}`)
  if (value === null) {
    throw new ApiError('Use "is" para comparar com NULL.')
  }
  return `${column} ${OPERATORS[op]} ${params.add(value)}`
}

/** WHERE = escopo do dono + filtros (AND) + grupos "or" (cada grupo é um OR). */
const buildWhere = (def, userId, body, params, { forRead }) => {
  const parts = []
  const owner = ident(def.owner)
  const ownerParam = params.add(userId)
  parts.push(forRead && def.readGlobal ? `(${owner} = ${ownerParam} OR ${owner} IS NULL)` : `${owner} = ${ownerParam}`)

  for (const filter of body.filters ?? []) parts.push(buildCondition(def, filter, params))
  for (const group of body.or ?? []) {
    if (!Array.isArray(group) || group.length === 0) throw new ApiError('Grupo "or" inválido.')
    parts.push(`(${group.map(filter => buildCondition(def, filter, params)).join(' OR ')})`)
  }
  return `WHERE ${parts.join(' AND ')}`
}

const selectList = (def, columns) => {
  if (columns === undefined || columns === null || columns === '*' || columns === '') return '*'
  const names = String(columns).split(',').map(name => name.trim()).filter(Boolean)
  if (names.length === 0) return '*'
  return names.map(name => ident(assertColumn(def, name))).join(', ')
}

const orderClause = (def, order) => {
  if (!order?.length) return ''
  const parts = order.map(item => `${ident(assertColumn(def, item.col))} ${item.ascending === false ? 'DESC' : 'ASC'}`)
  return ` ORDER BY ${parts.join(', ')}`
}

const toRowArray = values => {
  const rows = Array.isArray(values) ? values : [values]
  if (rows.length === 0) return rows
  if (rows.length > MAX_ROWS) throw new ApiError(`Máximo de ${MAX_ROWS} linhas por operação.`)
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new ApiError('Linha inválida.')
  }
  return rows
}

const encodeValue = (def, column, value) => {
  if (value === undefined) return null
  if (def.json.has(column) && value !== null) return JSON.stringify(value)
  return value
}
const cast = (def, column) => (def.json.has(column) ? '::jsonb' : '')

const buildInsert = (def, userId, body, params, { upsert }) => {
  const rows = toRowArray(body.values).map(row => ({ ...row, [def.owner]: userId }))
  const columns = []
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      assertColumn(def, key)
      if (!columns.includes(key)) columns.push(key)
    }
  }
  const valuesSql = rows.map(row => `(${columns.map(column => (
    Object.hasOwn(row, column) && row[column] !== undefined
      ? params.add(encodeValue(def, column, row[column]), cast(def, column))
      : 'DEFAULT'
  )).join(', ')})`).join(', ')

  let sql = `INSERT INTO ${ident(body.table)} (${columns.map(ident).join(', ')}) VALUES ${valuesSql}`

  if (upsert) {
    const target = String(body.onConflict ?? 'id').split(',').map(name => name.trim()).filter(Boolean)
    if (target.length === 0) throw new ApiError('onConflict inválido.')
    target.forEach(column => assertColumn(def, column))
    sql += ` ON CONFLICT (${target.map(ident).join(', ')})`
    // Nunca reatribui linhas de outro dono: o DO UPDATE só age se o dono for o mesmo.
    const updatable = columns.filter(column => !target.includes(column) && column !== 'id' && column !== def.owner)
    if (body.ignoreDuplicates || updatable.length === 0) {
      sql += ' DO NOTHING'
    } else {
      const sets = updatable.map(column => `${ident(column)} = EXCLUDED.${ident(column)}`).join(', ')
      sql += ` DO UPDATE SET ${sets} WHERE ${ident(body.table)}.${ident(def.owner)} = EXCLUDED.${ident(def.owner)}`
    }
  }
  return sql
}

const buildUpdate = (def, userId, body, params) => {
  const values = body.values
  if (!values || typeof values !== 'object' || Array.isArray(values)) throw new ApiError('Valores inválidos.')
  const columns = Object.keys(values).filter(column => column !== def.owner)
  columns.forEach(column => assertColumn(def, column))
  if (columns.length === 0) throw new ApiError('Nenhuma coluna para atualizar.')
  const sets = columns.map(column => `${ident(column)} = ${params.add(encodeValue(def, column, values[column]), cast(def, column))}`)
  const where = buildWhere(def, userId, body, params, { forRead: false })
  return `UPDATE ${ident(body.table)} SET ${sets.join(', ')} ${where}`
}

const SINGLE_ERROR = 'JSON object requested, multiple (or no) rows returned'

const execute = async (client, userId, body) => {
  const def = Object.hasOwn(TABLES, body.table) ? TABLES[body.table] : undefined
  if (!def) throw new ApiError(`Tabela desconhecida: ${String(body.table)}`, { code: '42P01' })

  const params = createParams()
  const returning = body.op === 'select' || body.returning === true
  const columnsSql = selectList(def, body.columns)
  let sql

  switch (body.op) {
    case 'select': {
      const where = buildWhere(def, userId, body, params, { forRead: true })
      sql = `SELECT ${columnsSql} FROM ${ident(body.table)} ${where}${orderClause(def, body.order)}`
      if (Number.isInteger(body.limit) && body.limit > 0) sql += ` LIMIT ${Math.min(body.limit, MAX_ROWS)}`
      break
    }
    case 'insert':
      sql = buildInsert(def, userId, body, params, { upsert: false })
      break
    case 'upsert':
      sql = buildInsert(def, userId, body, params, { upsert: true })
      break
    case 'update':
      sql = buildUpdate(def, userId, body, params)
      break
    case 'delete':
      sql = `DELETE FROM ${ident(body.table)} ${buildWhere(def, userId, body, params, { forRead: false })}`
      break
    default:
      throw new ApiError(`Operação não suportada: ${String(body.op)}`)
  }

  if (body.op !== 'select') sql += returning ? ` RETURNING ${columnsSql}` : ''

  // Inserção vazia (ex.: upsert de uma lista vazia) não precisa ir ao banco.
  if ((body.op === 'insert' || body.op === 'upsert') && toRowArray(body.values).length === 0) {
    return { data: returning ? [] : null, count: 0 }
  }

  const result = await client.query(sql, params.values)
  let data = returning ? result.rows : null
  const count = result.rowCount ?? (data ? data.length : 0)

  if (body.single === 'single' || body.single === 'maybe') {
    const rows = data ?? []
    const tooMany = rows.length > 1
    const none = rows.length === 0 && body.single === 'single'
    if (tooMany || none) throw new ApiError(SINGLE_ERROR, { status: 406, code: 'PGRST116' })
    data = rows[0] ?? null
  }
  return { data, count }
}

const sendError = (res, error) => {
  if (error instanceof ApiError) {
    return res.status(error.status).json({ data: null, error: { message: error.message, code: error.code } })
  }
  // Erros do PostgreSQL (constraint, tipo inválido, RAISE EXCEPTION...) são repassados.
  if (error && typeof error.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code)) {
    return res.status(400).json({ data: null, error: { message: error.message, code: error.code } })
  }
  console.error('[api] erro inesperado:', error)
  return res.status(500).json({ data: null, error: { message: 'Erro interno do servidor.' } })
}

export const dataRouter = Router()
dataRouter.use(requireAuth)

dataRouter.post('/db', async (req, res) => {
  try {
    const body = req.body ?? {}
    const result = await withTransaction(client => execute(client, req.user.id, body))
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
    const params = createParams()
    const placeholders = [params.add(req.user.id, '::uuid')]
    for (const [name, type] of rpc.args) {
      if (args[name] === undefined || args[name] === null) throw new ApiError(`Parâmetro obrigatório: ${name}`)
      placeholders.push(params.add(args[name], `::${type}`))
    }
    await withTransaction(client => client.query(
      `SELECT ${ident(req.params.name)}(${placeholders.join(', ')})`,
      params.values,
    ))
    res.json({ data: null, error: null })
  } catch (error) {
    sendError(res, error)
  }
})
