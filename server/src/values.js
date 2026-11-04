import { Prisma } from './db.js'
import { ApiError } from './errors.js'

// O front fala em texto: DATE = "2026-11-03", TIME = "08:00:00", timestamptz = ISO-8601.
// O Prisma trabalha com objetos Date. Estas funções convertem nos dois sentidos, sempre em UTC,
// para o dia/horário não "andar" por causa do fuso do servidor.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE = /^\d{4}-\d{2}-\d{2}/
const TIME = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/

const invalid = (what, code = '22P02') => new ApiError(`Valor inválido para ${what}.`, { code })

const parseDate = value => {
  const match = typeof value === 'string' ? DATE.exec(value) : null
  const date = match ? new Date(`${match[0]}T00:00:00.000Z`) : null
  // Recusa dias que não existem (2026-02-31): sem esta conferência o JS os "rola" para o mês seguinte.
  if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== match[0]) {
    throw invalid('data', '22007')
  }
  return date
}

const parseTime = value => {
  const match = typeof value === 'string' ? TIME.exec(value.trim()) : null
  const [hh, mm, ss = '00'] = match ? match.slice(1) : []
  if (!match || Number(hh) > 23 || Number(mm) > 59 || Number(ss) > 59) throw invalid('hora', '22007')
  return new Date(`1970-01-01T${hh}:${mm}:${ss}.000Z`)
}

const parseTimestamp = value => {
  const date = typeof value === 'string' || typeof value === 'number' ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) throw invalid('data/hora', '22007')
  return date
}

/** Texto/JSON do cliente → valor aceito pelo Prisma para uma coluna do tipo `type`. */
export const toDb = (type, value, { write = false } = {}) => {
  if (type === 'json') return value === null && write ? Prisma.DbNull : value
  if (value === null || value === undefined) return null
  switch (type) {
    case 'uuid':
      if (typeof value !== 'string' || !UUID.test(value)) throw invalid('identificador (uuid)')
      return value
    case 'date': return parseDate(value)
    case 'time': return parseTime(value)
    case 'timestamp': return parseTimestamp(value)
    case 'int[]':
      if (!Array.isArray(value)) throw invalid('lista')
      return value
    default: return value
  }
}

/** Linha devolvida pelo Prisma → formato que o front espera (datas/horas como texto). */
export const fromDb = (def, row) => {
  const out = {}
  for (const [key, value] of Object.entries(row)) {
    const type = def.types[key]
    if (!(value instanceof Date)) out[key] = value
    else if (type === 'date') out[key] = value.toISOString().slice(0, 10)
    else if (type === 'time') out[key] = value.toISOString().slice(11, 19)
    else out[key] = value.toISOString()
  }
  return out
}
