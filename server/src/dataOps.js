// Tradução do corpo de POST /api/db (select/insert/upsert/update/delete) para chamadas do Prisma Client.
// Recebe `client`: o próprio `prisma` (leituras) ou o `tx` de uma transação (escritas).
import { TABLES } from './schema.js'
import { ApiError } from './errors.js'
import { fromDb, toDb } from './values.js'

const MAX_ROWS = 5000
const COMPARATORS = { gt: 'gt', gte: 'gte', lt: 'lt', lte: 'lte' }
const SINGLE_ERROR = 'JSON object requested, multiple (or no) rows returned'

const isObject = value => value && typeof value === 'object' && !Array.isArray(value)
const pick = (source, keys) => Object.fromEntries(keys.map(key => [key, source[key]]))

const assertColumn = (def, column) => {
  if (typeof column !== 'string' || !def.columns.has(column)) {
    throw new ApiError(`Coluna desconhecida: ${String(column)}`, { code: 'PGRST204' })
  }
  return column
}

/** Um filtro do front → condição `where` do Prisma. */
const condition = (def, filter) => {
  if (!isObject(filter)) throw new ApiError('Filtro inválido.')
  const column = assertColumn(def, filter.col)
  const type = def.types[column]
  const { op, value } = filter

  if (op === 'is') {
    if (value === null || value === true || value === false) return { [column]: value }
    throw new ApiError('Valor inválido para o operador "is".')
  }
  if (op === 'in') {
    if (!Array.isArray(value)) throw new ApiError('O operador "in" exige uma lista.')
    return { [column]: { in: value.map(item => toDb(type, item)) } } // lista vazia = nenhuma linha
  }
  const known = op === 'eq' || op === 'neq' || Object.hasOwn(COMPARATORS, op)
  if (!known) throw new ApiError(`Operador não suportado: ${String(op)}`)
  if (value === null) throw new ApiError('Use "is" para comparar com NULL.')

  const converted = toDb(type, value)
  if (op === 'eq') return { [column]: type.endsWith('[]') ? { equals: converted } : converted }
  if (op === 'neq') return { [column]: { not: converted } }
  return { [column]: { [COMPARATORS[op]]: converted } }
}

/** where = escopo do dono + filtros (AND) + grupos "or" (cada grupo é um OR). */
const buildWhere = (def, userId, body, { forRead }) => {
  const owner = def.owner
  const parts = [
    forRead && def.readGlobal ? { OR: [{ [owner]: userId }, { [owner]: null }] } : { [owner]: userId },
  ]
  if (body.filters != null && !Array.isArray(body.filters)) throw new ApiError('Filtros inválidos.')
  if (body.or != null && !Array.isArray(body.or)) throw new ApiError('Grupos "or" inválidos.')
  for (const filter of body.filters ?? []) parts.push(condition(def, filter))
  for (const group of body.or ?? []) {
    if (!Array.isArray(group) || group.length === 0) throw new ApiError('Grupo "or" inválido.')
    parts.push({ OR: group.map(filter => condition(def, filter)) })
  }
  return { AND: parts }
}

const selection = (def, columns) => {
  if (columns === undefined || columns === null || columns === '*' || columns === '') return undefined
  const names = String(columns).split(',').map(name => name.trim()).filter(Boolean)
  if (names.length === 0) return undefined
  return Object.fromEntries(names.map(name => [assertColumn(def, name), true]))
}

const orderBy = (def, order) => {
  if (order === undefined || order === null) return undefined
  if (!Array.isArray(order)) throw new ApiError('Ordenação inválida.')
  if (order.length === 0) return undefined
  return order.map(item => ({ [assertColumn(def, item?.col)]: item.ascending === false ? 'desc' : 'asc' }))
}

const toRowArray = values => {
  const rows = Array.isArray(values) ? values : [values]
  if (rows.length === 0) return rows
  if (rows.length > MAX_ROWS) throw new ApiError(`Máximo de ${MAX_ROWS} linhas por operação.`)
  for (const row of rows) if (!isObject(row)) throw new ApiError('Linha inválida.')
  return rows
}

/** Linha do cliente → `data` do Prisma, com o dono sempre forçado para o usuário da sessão. */
const prepareRow = (def, userId, row) => {
  const data = {}
  for (const [key, value] of Object.entries(row)) {
    assertColumn(def, key)
    if (value !== undefined) data[key] = toDb(def.types[key], value, { write: true })
  }
  data[def.owner] = userId
  return data
}

const insertRows = async (delegate, def, userId, body, select, returning) => {
  const data = toRowArray(body.values).map(row => prepareRow(def, userId, row))
  if (data.length === 0) return { rows: returning ? [] : null, count: 0 }
  if (returning) {
    const rows = await delegate.createManyAndReturn({ data, select })
    return { rows, count: rows.length }
  }
  const { count } = await delegate.createMany({ data })
  return { rows: null, count }
}

/**
 * Equivale a INSERT ... ON CONFLICT (alvo) DO UPDATE / DO NOTHING do SQL antigo.
 * Nunca reatribui linhas de outro dono: o UPDATE só enxerga linhas do próprio usuário e,
 * se o conflito for com linha alheia, o INSERT é ignorado (skipDuplicates).
 */
const upsertRows = async (delegate, def, userId, body, select, returning) => {
  const prepared = toRowArray(body.values).map(row => prepareRow(def, userId, row))
  if (prepared.length === 0) return { rows: returning ? [] : null, count: 0 }

  const target = String(body.onConflict ?? 'id').split(',').map(name => name.trim()).filter(Boolean)
  if (target.length === 0) throw new ApiError('onConflict inválido.')
  target.forEach(column => assertColumn(def, column))

  const rows = []
  let count = 0
  const insertIgnoringDuplicates = async data => {
    if (returning) {
      const created = await delegate.createManyAndReturn({ data, select, skipDuplicates: true })
      rows.push(...created)
      count += created.length
    } else {
      count += (await delegate.createMany({ data, skipDuplicates: true })).count
    }
  }

  if (body.ignoreDuplicates) {
    await insertIgnoringDuplicates(prepared)
    return { rows: returning ? rows : null, count }
  }

  for (const row of prepared) {
    const updatable = Object.keys(row).filter(column => !target.includes(column) && column !== 'id' && column !== def.owner)
    // No PostgreSQL, NULL nunca conflita: sem valor no alvo, é sempre um INSERT.
    const canConflict = updatable.length > 0 && target.every(column => row[column] !== undefined && row[column] !== null)
    if (canConflict) {
      const where = { [def.owner]: userId, ...pick(row, target) }
      const data = pick(row, updatable)
      if (returning) {
        const updated = await delegate.updateManyAndReturn({ where, data, select })
        if (updated.length > 0) { rows.push(...updated); count += updated.length; continue }
      } else {
        const { count: updated } = await delegate.updateMany({ where, data })
        if (updated > 0) { count += updated; continue }
      }
    }
    await insertIgnoringDuplicates([row])
  }
  return { rows: returning ? rows : null, count }
}

const updateRows = async (delegate, def, userId, body, select, returning) => {
  const values = body.values
  if (!isObject(values)) throw new ApiError('Valores inválidos.')
  const columns = Object.keys(values).filter(column => column !== def.owner)
  columns.forEach(column => assertColumn(def, column))
  if (columns.length === 0) throw new ApiError('Nenhuma coluna para atualizar.')
  const data = Object.fromEntries(columns.map(column => [
    column, toDb(def.types[column], values[column] === undefined ? null : values[column], { write: true }),
  ]))
  const where = buildWhere(def, userId, body, { forRead: false })
  if (returning) {
    const rows = await delegate.updateManyAndReturn({ where, data, select })
    return { rows, count: rows.length }
  }
  const { count } = await delegate.updateMany({ where, data })
  return { rows: null, count }
}

const deleteRows = async (delegate, def, userId, body, select, returning) => {
  const where = buildWhere(def, userId, body, { forRead: false })
  if (!returning) {
    const { count } = await delegate.deleteMany({ where })
    return { rows: null, count }
  }
  const found = await delegate.findMany({ where })
  const { count } = await delegate.deleteMany({ where: { AND: [where, { id: { in: found.map(row => row.id) } }] } })
  const keys = select ? Object.keys(select) : null
  return { rows: keys ? found.map(row => pick(row, keys)) : found, count }
}

/** Executa uma operação de /api/db. `client` é o prisma ou o tx de uma transação. */
export const execute = async (client, userId, body) => {
  const def = Object.hasOwn(TABLES, body.table) ? TABLES[body.table] : undefined
  if (!def) throw new ApiError(`Tabela desconhecida: ${String(body.table)}`, { code: '42P01' })

  const delegate = client[body.table]
  const returning = body.op === 'select' || body.returning === true
  const select = selection(def, body.columns)
  let result

  switch (body.op) {
    case 'select': {
      const take = Number.isInteger(body.limit) && body.limit > 0 ? Math.min(body.limit, MAX_ROWS) : undefined
      const rows = await delegate.findMany({
        where: buildWhere(def, userId, body, { forRead: true }),
        select,
        orderBy: orderBy(def, body.order),
        take,
      })
      result = { rows, count: rows.length }
      break
    }
    case 'insert': result = await insertRows(delegate, def, userId, body, select, returning); break
    case 'upsert': result = await upsertRows(delegate, def, userId, body, select, returning); break
    case 'update': result = await updateRows(delegate, def, userId, body, select, returning); break
    case 'delete': result = await deleteRows(delegate, def, userId, body, select, returning); break
    default: throw new ApiError(`Operação não suportada: ${String(body.op)}`)
  }

  let data = result.rows ? result.rows.map(row => fromDb(def, row)) : null
  if (body.single === 'single' || body.single === 'maybe') {
    const list = data ?? []
    if (list.length > 1 || (list.length === 0 && body.single === 'single')) {
      throw new ApiError(SINGLE_ERROR, { status: 406, code: 'PGRST116' })
    }
    data = list[0] ?? null
  }
  return { data, count: result.count }
}
