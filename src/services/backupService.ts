import { db } from '@/lib/api'
import { chunk, prepareImport, type ParsedBackup } from '@/lib/calendarBackup'

type Row = Record<string, unknown>
type DbError = { code?: string; message: string } | null

const CHUNK_SIZE = 500
const MISSING_TABLE = '42P01' // undefined_table

const check = (error: DbError, label: string, optional = false) => {
  if (!error) return
  if (optional && error.code === MISSING_TABLE) return
  throw new Error(`${label}: ${error.message}`)
}

const upsertAll = async (table: string, rows: Row[], onConflict: string, optional = false) => {
  for (const part of chunk(rows, CHUNK_SIZE)) {
    const { error } = await db.from(table).upsert(part, { onConflict })
    check(error, table, optional)
  }
}

export interface DeleteCounts {
  routineExceptions: number
  routineRules: number
  events: number
  holidays: number
  calendars: number
}

/** Apaga todos os dados do usuário. Preferências do perfil e a conta são mantidas. */
export const deleteAllUserData = async (userId: string): Promise<DeleteCounts> => {
  const remove = async (table: string, optional = false) => {
    const { error, count } = await db.from(table).delete({ count: 'exact' }).eq('user_id', userId)
    check(error, table, optional)
    return count ?? 0
  }
  // Ordem respeita as chaves estrangeiras: dependentes primeiro.
  const routineExceptions = await remove('routine_exceptions', true)
  const routineRules = await remove('routine_rules', true)
  const events = await remove('events')
  const holidays = await remove('holiday_dates')
  const calendars = await remove('calendars')
  return { routineExceptions, routineRules, events, holidays, calendars }
}

export interface ImportCounts {
  calendars: number
  events: number
  holidays: number
  routineRules: number
  routineExceptions: number
}

export const importBackup = async (
  userId: string,
  backup: ParsedBackup,
  options: { replace: boolean },
): Promise<ImportCounts> => {
  const prepared = prepareImport(backup.tables, userId)
  if (options.replace) await deleteAllUserData(userId)

  // 1. Calendários
  await upsertAll('calendars', prepared.calendars, 'id')
  const { data: calendarRows, error: calendarError } = await db.from('calendars').select('id').eq('user_id', userId)
  check(calendarError, 'calendars')
  const knownCalendars = new Set((calendarRows ?? []).map((row: Row) => row.id as string))
  const fixCalendar = (row: Row): Row => (
    row.calendar_id && !knownCalendars.has(row.calendar_id as string) ? { ...row, calendar_id: null } : row
  )

  // 2. Compromissos e feriados
  await upsertAll('events', prepared.events.map(fixCalendar), 'id')
  await upsertAll('holiday_dates', prepared.seededHolidays, 'user_id,seed_key')
  await upsertAll('holiday_dates', prepared.holidays, 'id')

  // 3. Rotina: regras com seed_key podem já existir com outro id, então mapeamos os ids.
  const hasRoutine = backup.tables.routineRules.length > 0 || backup.tables.routineExceptions.length > 0
  const ruleIdMap = new Map<string, string>()
  if (hasRoutine) {
    await upsertAll('routine_rules', prepared.seededRules.map(fixCalendar), 'user_id,seed_key')
    await upsertAll('routine_rules', prepared.rules.map(fixCalendar), 'id')
    const { data: ruleRows, error: ruleError } = await db
      .from('routine_rules').select('id, seed_key').eq('user_id', userId)
    check(ruleError, 'routine_rules')
    const idBySeed = new Map<string, string>()
    for (const row of (ruleRows ?? []) as Row[]) if (row.seed_key) idBySeed.set(row.seed_key as string, row.id as string)
    for (const rule of backup.tables.routineRules as Row[]) {
      const actual = rule.seed_key ? idBySeed.get(rule.seed_key as string) : (rule.id as string)
      if (actual) ruleIdMap.set(rule.id as string, actual)
    }
  }

  const exceptions = prepared.exceptions
    .filter(row => ruleIdMap.has(row.routine_rule_id as string))
    .map(row => ({ ...row, routine_rule_id: ruleIdMap.get(row.routine_rule_id as string) }))
  await upsertAll('routine_exceptions', exceptions, 'routine_rule_id,occurrence_date')

  // 4. Preferências: o backup é mesclado por cima das atuais.
  if (prepared.preferences) {
    const { data: profile, error: readError } = await db.from('profiles').select('preferences').eq('id', userId).maybeSingle()
    check(readError, 'profiles')
    const current = (profile?.preferences ?? {}) as Row
    const { error } = await db
      .from('profiles')
      .upsert({ id: userId, preferences: { ...current, ...prepared.preferences } }, { onConflict: 'id' })
    check(error, 'profiles')
  }

  return {
    calendars: prepared.calendars.length,
    events: prepared.events.length,
    holidays: prepared.seededHolidays.length + prepared.holidays.length,
    routineRules: prepared.seededRules.length + prepared.rules.length,
    routineExceptions: exceptions.length,
  }
}
