import { formatTimeValue, type TimeFormat } from '@/lib/timeFormat'

export type RoutineScheduleType = 'fixed' | 'flexible' | 'optional'
export type RoutineExceptionAction = 'modified' | 'cancelled' | 'confirmed' | 'skipped' | 'kept'
export type RoutineOccurrenceStatus = 'scheduled' | 'possible' | 'confirmed' | 'modified' | 'cancelled' | 'skipped'

export interface RoutineRule {
  id: string
  user_id: string
  seed_key: string | null
  title: string
  description: string | null
  category: string
  calendar_id: string | null
  weekdays: number[]
  start_time: string | null
  end_time: string | null
  start_time_earliest: string | null
  start_time_latest: string | null
  end_time_earliest: string | null
  end_time_latest: string | null
  schedule_type: RoutineScheduleType
  is_approximate: boolean
  recurrence_interval_weeks: number
  recurrence_anchor_date: string | null
  first_confirmed_on: string | null
  confirmation_required: boolean
  valid_from: string
  valid_until: string | null
  timezone: string
  is_active: boolean
}

export interface RoutineException {
  id?: string
  routine_rule_id: string
  user_id: string
  occurrence_date: string
  action: RoutineExceptionAction
  overridden_title: string | null
  overridden_start_time: string | null
  overridden_end_time: string | null
  notes: string | null
}

export interface RoutineOccurrence {
  id: string
  ruleId: string
  date: string
  title: string
  description: string | null
  category: string
  scheduleType: RoutineScheduleType
  status: RoutineOccurrenceStatus
  startTime: string | null
  endTime: string | null
  startEarliest: string | null
  startLatest: string | null
  endEarliest: string | null
  endLatest: string | null
  isApproximate: boolean
  exception: RoutineException | null
}

const dateFromISO = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day)
}

const toISODate = (date: Date) => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
)

const startOfWeek = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  start.setDate(start.getDate() - start.getDay())
  return start
}

const isEveryOtherWeekMatch = (date: Date, anchor: Date, interval: number) => {
  const weeks = Math.floor((startOfWeek(date).getTime() - startOfWeek(anchor).getTime()) / 604_800_000)
  return weeks >= 0 && weeks % interval === 0
}

const toOccurrence = (
  rule: RoutineRule,
  date: string,
  exception: RoutineException | null,
  status: RoutineOccurrenceStatus = 'scheduled',
): RoutineOccurrence => ({
  id: `${rule.id}:${date}`,
  ruleId: rule.id,
  date,
  title: exception?.overridden_title || rule.title,
  description: rule.description,
  category: rule.category,
  scheduleType: rule.schedule_type,
  status: exception?.action === 'confirmed'
    ? 'confirmed'
    : exception?.action === 'modified'
      ? 'modified'
      : exception?.action === 'cancelled'
        ? 'cancelled'
        : exception?.action === 'skipped'
          ? 'skipped'
          : status,
  startTime: exception?.overridden_start_time ?? rule.start_time,
  endTime: exception?.overridden_end_time ?? rule.end_time,
  startEarliest: exception?.overridden_start_time ? null : rule.start_time_earliest,
  startLatest: exception?.overridden_start_time ? null : rule.start_time_latest,
  endEarliest: exception?.overridden_end_time ? null : rule.end_time_earliest,
  endLatest: exception?.overridden_end_time ? null : rule.end_time_latest,
  isApproximate: rule.is_approximate,
  exception,
})

export const generateRoutineOccurrences = (
  rules: RoutineRule[],
  exceptions: RoutineException[],
  rangeStart: Date,
  rangeEnd: Date,
) => {
  const start = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate())
  const end = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate())
  const exceptionByKey = new Map(
    exceptions.map(exception => [`${exception.routine_rule_id}:${exception.occurrence_date}`, exception]),
  )
  const occurrences: RoutineOccurrence[] = []

  for (const rule of rules) {
    if (!rule.is_active) continue
    const validFrom = dateFromISO(rule.valid_from)
    const validUntil = rule.valid_until ? dateFromISO(rule.valid_until) : null
    const confirmedAnchor = rule.first_confirmed_on ? dateFromISO(rule.first_confirmed_on) : null
    const anchor = confirmedAnchor
      ?? (rule.recurrence_anchor_date ? dateFromISO(rule.recurrence_anchor_date) : validFrom)
    const pendingOptional = rule.confirmation_required && !confirmedAnchor
    const interval = pendingOptional ? 1 : Math.max(1, rule.recurrence_interval_weeks || 1)

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const isoDate = toISODate(date)
      if (date < validFrom || (validUntil && date > validUntil) || !rule.weekdays.includes(date.getDay())) continue
      if (date < anchor || !isEveryOtherWeekMatch(date, anchor, interval)) continue
      const exception = exceptionByKey.get(`${rule.id}:${isoDate}`) ?? null
      if (pendingOptional && exception?.action !== 'confirmed' && exception?.action !== 'modified') {
        occurrences.push(toOccurrence(rule, isoDate, exception, 'possible'))
      } else {
        occurrences.push(toOccurrence(rule, isoDate, exception))
      }
    }
  }

  return occurrences.sort((left, right) => (
    left.date.localeCompare(right.date)
    || (left.startTime ?? left.startEarliest ?? '99:99').localeCompare(right.startTime ?? right.startEarliest ?? '99:99')
    || left.title.localeCompare(right.title)
  ))
}

export const routineTimeLabel = (occurrence: RoutineOccurrence, timeFormat: TimeFormat = '24h') => {
  const displayTime = (value: string | null | undefined) => value ? formatTimeValue(value, timeFormat) : undefined
  const start = displayTime(occurrence.startTime)
  const startWindow = occurrence.startEarliest && occurrence.startLatest
    ? `${formatTimeValue(occurrence.startEarliest, timeFormat)}–${formatTimeValue(occurrence.startLatest, timeFormat)}`
    : displayTime(occurrence.startEarliest)
  const end = displayTime(occurrence.endTime)
  const endWindow = occurrence.endEarliest && occurrence.endLatest
    ? `${formatTimeValue(occurrence.endEarliest, timeFormat)}–${formatTimeValue(occurrence.endLatest, timeFormat)}`
    : displayTime(occurrence.endEarliest)

  if (startWindow && endWindow) return `Início ${startWindow} · término ${endWindow}`
  if (startWindow) return start ? `Início ${startWindow} · até ${end}` : `Início ${startWindow}`
  if (start && endWindow) return `Início ${start} · término ${endWindow}`
  if (start && end) return `${start}–${end}`
  if (start) return occurrence.isApproximate ? `Por volta de ${start}` : start
  if (endWindow) return `Término ${endWindow}`
  if (end) return `Término ${end}`
  return 'Sem horário definido'
}

export const findRoutineConflicts = (occurrences: RoutineOccurrence[]) => {
  const timed = occurrences.filter(item =>
    item.status !== 'cancelled'
    && item.status !== 'skipped'
    && (
      item.startTime || item.startEarliest || item.startLatest
      || item.endTime || item.endEarliest || item.endLatest
    ),
  )
  const conflicts: Array<{ first: RoutineOccurrence; second: RoutineOccurrence }> = []

  for (let left = 0; left < timed.length; left += 1) {
    for (let right = left + 1; right < timed.length; right += 1) {
      const first = timed[left]
      const second = timed[right]
      if (first.date !== second.date) continue
      if (first.status === 'possible' || second.status === 'possible') continue
      const firstEnd = first.endLatest ?? first.endEarliest ?? first.endTime
      const secondStart = second.startEarliest ?? second.startLatest ?? second.startTime
      const secondEnd = second.endLatest ?? second.endEarliest ?? second.endTime
      const firstStart = first.startEarliest ?? first.startLatest ?? first.startTime
      const secondStartsBeforeFirstEnds = firstEnd && secondStart && secondStart < firstEnd
      const firstStartsBeforeSecondEnds = secondEnd && firstStart && firstStart < secondEnd
      if (secondStartsBeforeFirstEnds && firstStartsBeforeSecondEnds) conflicts.push({ first, second })
    }
  }

  return conflicts
}

export const dateToLocalISO = toISODate
