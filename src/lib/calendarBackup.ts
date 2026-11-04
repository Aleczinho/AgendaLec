import { BACKUP_VERSION, type BackupTables } from '@/lib/calendarExport'

type Row = Record<string, unknown>

export interface ParsedBackup {
  exportedAt: string | null
  tables: BackupTables
}

export type ParseResult = { ok: true; backup: ParsedBackup } | { ok: false; error: string }

const isRow = (value: unknown): value is Row => typeof value === 'object' && value !== null && !Array.isArray(value)
const isText = (value: unknown): value is string => typeof value === 'string' && value.trim() !== ''
const isDate = (value: unknown) => isText(value) && !Number.isNaN(new Date(value).getTime())

const rowChecks: Record<string, { label: string; valid: (row: Row) => boolean }> = {
  calendars: { label: 'calendário', valid: row => isText(row.id) && isText(row.name) },
  events: { label: 'compromisso', valid: row => isText(row.title) && isDate(row.start_at) },
  holidays: { label: 'feriado', valid: row => isText(row.name) && isText(row.date) },
  routineRules: { label: 'regra da rotina', valid: row => isText(row.id) && isText(row.title) && Array.isArray(row.weekdays) },
  routineExceptions: {
    label: 'ocorrência da rotina',
    valid: row => isText(row.routine_rule_id) && isText(row.occurrence_date) && isText(row.action),
  },
}

export const parseBackup = (text: string): ParseResult => {
  let json: unknown
  try {
    json = JSON.parse(text.replace(/^﻿/, ''))
  } catch {
    return { ok: false, error: 'O arquivo não é um JSON válido.' }
  }
  if (!isRow(json) || json.app !== 'AgendaLec' || !isRow(json.data)) {
    return { ok: false, error: 'Este arquivo não parece ser um backup do AgendaLec.' }
  }
  if (typeof json.version !== 'number' || json.version > BACKUP_VERSION) {
    return { ok: false, error: 'Este backup foi gerado por uma versão mais nova do app. Atualize o app e tente de novo.' }
  }

  const data = json.data
  const tables: Record<string, Row[]> = {}
  for (const [key, check] of Object.entries(rowChecks)) {
    const value = data[key] ?? []
    if (!Array.isArray(value)) return { ok: false, error: `O backup está corrompido (${key} não é uma lista).` }
    const badIndex = value.findIndex(row => !isRow(row) || !check.valid(row))
    if (badIndex >= 0) {
      return { ok: false, error: `O backup tem um ${check.label} inválido (item ${badIndex + 1}). Nada foi importado.` }
    }
    tables[key] = value as Row[]
  }
  if (data.profile != null && !isRow(data.profile)) {
    return { ok: false, error: 'O backup está corrompido (perfil inválido).' }
  }

  return {
    ok: true,
    backup: {
      exportedAt: isText(json.exportedAt) ? json.exportedAt : null,
      tables: {
        profile: (data.profile ?? null) as Row | null,
        calendars: tables.calendars,
        events: tables.events,
        holidays: tables.holidays,
        routineRules: tables.routineRules,
        routineExceptions: tables.routineExceptions,
      },
    },
  }
}

export const summarizeBackup = (tables: BackupTables) => [
  `${tables.events.length} compromisso(s)`,
  `${tables.routineRules.length} regra(s) de rotina`,
  `${tables.routineExceptions.length} ajuste(s) de rotina`,
  `${tables.calendars.length} calendário(s)`,
  `${tables.holidays.length} feriado(s)`,
].join(', ')

const withOwner = (row: Row, userId: string): Row => ({ ...row, user_id: userId })
const withoutId = ({ id: _id, ...rest }: Row): Row => rest

export interface PreparedImport {
  calendars: Row[]
  events: Row[]
  /** Feriados com seed_key: id é descartado e o conflito resolve por (user_id, seed_key). */
  seededHolidays: Row[]
  holidays: Row[]
  seededRules: Row[]
  rules: Row[]
  exceptions: Row[]
  preferences: Row | null
}

/** Reatribui tudo ao usuário atual e separa o que precisa de tratamento por seed_key. */
export const prepareImport = (tables: BackupTables, userId: string): PreparedImport => {
  const rules = tables.routineRules as Row[]
  const holidays = tables.holidays as Row[]
  const hasSeed = (row: Row) => isText(row.seed_key)
  const profile = tables.profile as Row | null
  const preferences = profile && isRow(profile.preferences) ? profile.preferences : null

  return {
    calendars: (tables.calendars as Row[]).map(row => withOwner(row, userId)),
    events: (tables.events as Row[]).map(row => withOwner(row, userId)),
    seededHolidays: holidays.filter(hasSeed).map(row => withOwner(withoutId(row), userId)),
    holidays: holidays.filter(row => !hasSeed(row)).map(row => withOwner(withoutId(row), userId)),
    seededRules: rules.filter(hasSeed).map(row => withOwner(withoutId(row), userId)),
    rules: rules.filter(row => !hasSeed(row)).map(row => withOwner(row, userId)),
    exceptions: (tables.routineExceptions as Row[]).map(row => withOwner(withoutId(row), userId)),
    preferences,
  }
}

export const chunk = <T,>(items: T[], size: number) => {
  const parts: T[][] = []
  for (let index = 0; index < items.length; index += size) parts.push(items.slice(index, index + size))
  return parts
}

export const DELETE_CONFIRMATION = 'APAGAR'
