import { describe, expect, it } from 'vitest'
import { buildCsv, buildIcs, escapeIcsText, exportFileName, filterByRange, foldIcsLine } from './calendarExport'

const now = new Date('2026-11-03T12:00:00Z')

describe('buildIcs', () => {
  it('gera um VEVENT com escape e CRLF', () => {
    const ics = buildIcs([
      { id: 'a1', title: 'Reunião, equipe', description: 'linha1\nlinha2', start_at: '2026-11-10T13:00:00Z', end_at: '2026-11-10T14:00:00Z', location: 'Sala; 2' },
    ], [], { now })
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('UID:a1@agendalec')
    expect(ics).toContain('DTSTART:20261110T130000Z')
    expect(ics).toContain('DTEND:20261110T140000Z')
    expect(ics).toContain('SUMMARY:Reunião\\, equipe')
    expect(ics).toContain('DESCRIPTION:linha1\\nlinha2')
    expect(ics).toContain('LOCATION:Sala\\; 2')
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })

  it('exporta dia inteiro, recorrência e feriados', () => {
    const ics = buildIcs(
      [{ id: 'b', title: 'Aniversário', start_at: '2026-12-05T12:00:00', all_day: true, recurrence_rule: 'RRULE:FREQ=YEARLY' }],
      [{ date: '2026-12-25', name: 'Natal' }],
      { now },
    )
    expect(ics).toContain('DTSTART;VALUE=DATE:20261205')
    expect(ics).toContain('DTEND;VALUE=DATE:20261206')
    expect(ics).toContain('RRULE:FREQ=YEARLY')
    expect(ics).toContain('DTSTART;VALUE=DATE:20261225')
    expect(ics).toContain('SUMMARY:Natal')
  })

  it('ignora datas inválidas e recorrência fora do padrão', () => {
    const ics = buildIcs([
      { title: 'x', start_at: 'invalida' },
      { id: 'c', title: 'y', start_at: '2026-11-10T13:00:00Z', recurrence_rule: 'semanal' },
    ], [], { now })
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1)
    expect(ics).not.toContain('RRULE')
  })
})

describe('foldIcsLine / escapeIcsText', () => {
  it('dobra linhas longas em até 75 octetos', () => {
    const folded = foldIcsLine(`SUMMARY:${'á'.repeat(100)}`)
    for (const part of folded.split('\r\n')) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75)
    expect(folded.replace(/\r\n /g, '')).toBe(`SUMMARY:${'á'.repeat(100)}`)
  })
  it('escapa barras invertidas', () => {
    expect(escapeIcsText('a\\b')).toBe('a\\\\b')
  })
})

describe('buildCsv', () => {
  it('escapa aspas, vírgulas e previne injeção de fórmula', () => {
    const csv = buildCsv([{ title: '=SOMA(A1)', start_at: '2026-11-10T13:00:00Z', description: 'diz "oi", ok' }])
    expect(csv.startsWith('﻿Título,')).toBe(true)
    expect(csv).toContain("'=SOMA(A1)")
    expect(csv).toContain('"diz ""oi"", ok"')
  })
})

describe('filterByRange / exportFileName', () => {
  it('filtra por intervalo inclusivo', () => {
    const items = [{ d: '2026-11-01T12:00:00' }, { d: '2026-11-15T12:00:00' }, { d: '2026-12-01T12:00:00' }]
    const result = filterByRange(items, item => new Date(item.d), { from: '2026-11-15', to: '2026-11-30' })
    expect(result).toEqual([items[1]])
  })
  it('nomeia o arquivo com a data', () => {
    expect(exportFileName('ics', new Date(2026, 10, 3))).toBe('agendalec-2026-11-03.ics')
  })
})

import { backupFileName, buildBackup } from './calendarExport'

describe('buildBackup', () => {
  it('reúne todas as tabelas com contagens e avisos', () => {
    const json = JSON.parse(buildBackup(
      { profile: { id: 'u' }, calendars: [], events: [{ id: 1 }, { id: 2 }], holidays: [], routineRules: [{ id: 'r' }], routineExceptions: [] },
      { warnings: ['x'], now: new Date('2026-11-03T12:00:00Z') },
    ))
    expect(json.app).toBe('AgendaLec')
    expect(json.exportedAt).toBe('2026-11-03T12:00:00.000Z')
    expect(json.counts).toMatchObject({ events: 2, routineRules: 1, calendars: 0 })
    expect(json.warnings).toEqual(['x'])
    expect(json.data.profile).toEqual({ id: 'u' })
    expect(backupFileName(new Date(2026, 10, 3))).toBe('agendalec-backup-2026-11-03.json')
  })
})
