export type ExportFormat = 'ics' | 'csv'

export interface ExportEvent {
  id?: string
  title?: string | null
  description?: string | null
  notes?: string | null
  category?: string | null
  location?: string | null
  start_at: string
  end_at?: string | null
  all_day?: boolean | null
  status?: string | null
  recurrence_rule?: string | null
}

export interface ExportHoliday {
  id?: string
  date: string
  name: string
}

export interface ExportRange {
  /** Inclusive, YYYY-MM-DD. Empty/undefined = sem limite. */
  from?: string
  to?: string
}

const pad = (value: number) => String(value).padStart(2, '0')

const toIcsUtc = (date: Date) =>
  `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`

const toIcsDate = (date: Date) =>
  `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`

const localDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const escapeIcsText = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Dobra linhas com mais de 75 octetos, conforme RFC 5545. */
export const foldIcsLine = (line: string) => {
  const encoder = new TextEncoder()
  if (encoder.encode(line).length <= 75) return line
  const parts: string[] = []
  let current = ''
  let size = 0
  let limit = 75
  for (const char of line) {
    const charSize = encoder.encode(char).length
    if (size + charSize > limit) {
      parts.push(current)
      current = ''
      size = 0
      limit = 74 // a linha de continuação começa com um espaço
    }
    current += char
    size += charSize
  }
  parts.push(current)
  return parts.join('\r\n ')
}

export const filterByRange = <T,>(items: T[], getDate: (item: T) => Date, range: ExportRange) =>
  items.filter(item => {
    const key = localDateKey(getDate(item))
    if (range.from && key < range.from) return false
    if (range.to && key > range.to) return false
    return true
  })

export const buildIcs = (
  events: ExportEvent[],
  holidays: ExportHoliday[] = [],
  options: { calendarName?: string; now?: Date } = {},
) => {
  const stamp = toIcsUtc(options.now ?? new Date())
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AgendaLec//Exportação//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(options.calendarName ?? 'AgendaLec')}`,
  ]

  for (const event of events) {
    const start = new Date(event.start_at)
    if (Number.isNaN(start.getTime())) continue
    const end = event.end_at ? new Date(event.end_at) : null

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${event.id ?? `${event.start_at}-${event.title ?? ''}`}@agendalec`)
    lines.push(`DTSTAMP:${stamp}`)
    if (event.all_day) {
      const nextDay = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1)
      lines.push(`DTSTART;VALUE=DATE:${toIcsDate(start)}`)
      lines.push(`DTEND;VALUE=DATE:${toIcsDate(nextDay)}`)
    } else {
      lines.push(`DTSTART:${toIcsUtc(start)}`)
      if (end && !Number.isNaN(end.getTime())) lines.push(`DTEND:${toIcsUtc(end)}`)
    }
    lines.push(`SUMMARY:${escapeIcsText(event.title || 'Sem título')}`)
    const description = [event.description, event.notes].filter(Boolean).join('\n\n')
    if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`)
    if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`)
    if (event.category) lines.push(`CATEGORIES:${escapeIcsText(event.category)}`)
    if (event.status === 'completed' || event.status === 'done') lines.push('STATUS:CONFIRMED')
    if (event.status === 'cancelled' || event.status === 'canceled') lines.push('STATUS:CANCELLED')
    const rule = event.recurrence_rule?.trim().replace(/^RRULE:/i, '')
    if (rule && /^FREQ=/i.test(rule)) lines.push(`RRULE:${rule}`)
    lines.push('END:VEVENT')
  }

  for (const holiday of holidays) {
    const [year, month, day] = holiday.date.split('-').map(Number)
    if (!year || !month || !day) continue
    const date = new Date(year, month - 1, day)
    const nextDay = new Date(year, month - 1, day + 1)
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${holiday.id ?? holiday.date}-feriado@agendalec`)
    lines.push(`DTSTAMP:${stamp}`)
    lines.push(`DTSTART;VALUE=DATE:${toIcsDate(date)}`)
    lines.push(`DTEND;VALUE=DATE:${toIcsDate(nextDay)}`)
    lines.push(`SUMMARY:${escapeIcsText(holiday.name)}`)
    lines.push('CATEGORIES:Feriado')
    lines.push('TRANSP:TRANSPARENT')
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`
}

const csvCell = (value: unknown) => {
  let text = value == null ? '' : String(value)
  // Evita injeção de fórmulas ao abrir no Excel/Sheets.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",;\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export const buildCsv = (events: ExportEvent[], holidays: ExportHoliday[] = []) => {
  const header = ['Título', 'Início', 'Fim', 'Dia inteiro', 'Local', 'Categoria', 'Status', 'Descrição', 'Notas', 'Recorrência']
  const rows: unknown[][] = events.map(event => [
    event.title,
    event.start_at,
    event.end_at,
    event.all_day ? 'sim' : 'não',
    event.location,
    event.category,
    event.status,
    event.description,
    event.notes,
    event.recurrence_rule,
  ])
  for (const holiday of holidays) {
    rows.push([holiday.name, holiday.date, holiday.date, 'sim', '', 'Feriado', '', '', '', ''])
  }
  // BOM para o Excel reconhecer UTF-8 (acentos).
  return `\uFEFF${[header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n')}\r\n`
}

export const exportFileName = (format: ExportFormat, today = new Date()) =>
  `agendalec-${localDateKey(today)}.${format}`

export const downloadTextFile = (content: string, fileName: string, mimeType: string) => {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const BACKUP_VERSION = 1

export interface BackupTables {
  profile: Record<string, unknown> | null
  calendars: unknown[]
  events: unknown[]
  holidays: unknown[]
  routineRules: unknown[]
  routineExceptions: unknown[]
}

export const buildBackup = (
  tables: BackupTables,
  options: { warnings?: string[]; now?: Date } = {},
) => JSON.stringify({
  app: 'AgendaLec',
  version: BACKUP_VERSION,
  exportedAt: (options.now ?? new Date()).toISOString(),
  counts: {
    calendars: tables.calendars.length,
    events: tables.events.length,
    holidays: tables.holidays.length,
    routineRules: tables.routineRules.length,
    routineExceptions: tables.routineExceptions.length,
  },
  warnings: options.warnings ?? [],
  data: tables,
}, null, 2)

export const backupFileName = (today = new Date()) =>
  `agendalec-backup-${localDateKey(today)}.json`
