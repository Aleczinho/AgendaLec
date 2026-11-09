import { describe, expect, it } from 'vitest'
import { buildBackup } from './calendarExport'
import { chunk, parseBackup, prepareImport } from './calendarBackup'

const tables = {
  profile: { id: 'u1', preferences: { theme: 'escuro' } },
  calendars: [{ id: 'c1', name: 'Escola' }],
  events: [{ id: 'e1', user_id: 'old', title: 'Prova', start_at: '2026-11-10T13:00:00Z', calendar_id: 'c1' }],
  holidays: [{ id: 'h1', name: 'Natal', date: '2026-12-25', seed_key: 'nat' }, { id: 'h2', name: 'Meu dia', date: '2026-11-11' }],
  routineRules: [
    { id: 'r1', title: 'Acordar', weekdays: [1], seed_key: 'routine-v1:wake' },
    { id: 'r2', title: 'Treino', weekdays: [2] },
  ],
  routineExceptions: [{ id: 'x1', routine_rule_id: 'r1', occurrence_date: '2026-11-03', action: 'cancelled' }],
}

describe('parseBackup', () => {
  it('lê um backup gerado por buildBackup (com BOM)', () => {
    const result = parseBackup(`﻿${buildBackup(tables)}`)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.backup.tables.events).toHaveLength(1)
  })

  it('rejeita arquivos que não são do app, JSON inválido e versão futura', () => {
    expect(parseBackup('não é json')).toMatchObject({ ok: false })
    expect(parseBackup('{"app":"Outro","data":{}}')).toMatchObject({ ok: false })
    expect(parseBackup('{"app":"AgendaLec","version":99,"data":{}}')).toMatchObject({ ok: false })
  })

  it('rejeita linhas inválidas sem importar nada', () => {
    const broken = JSON.stringify({ app: 'AgendaLec', version: 1, data: { events: [{ title: 'sem data' }] } })
    const result = parseBackup(broken)
    expect(result).toMatchObject({ ok: false })
    if (!result.ok) expect(result.error).toContain('item 1')
  })

  it('aceita tabelas ausentes como listas vazias', () => {
    const result = parseBackup('{"app":"AgendaLec","version":1,"data":{}}')
    expect(result.ok && result.backup.tables.routineRules).toEqual([])
  })
})

describe('prepareImport', () => {
  const prepared = prepareImport(tables as never, 'novo')

  it('reatribui tudo ao usuário atual', () => {
    expect(prepared.events[0].user_id).toBe('novo')
    expect(prepared.calendars[0].user_id).toBe('novo')
  })

  it('descarta id de itens com seed_key e de ajustes, mantém nos demais', () => {
    expect(prepared.seededRules[0]).not.toHaveProperty('id')
    expect(prepared.rules[0].id).toBe('r2')
    expect(prepared.seededHolidays[0]).not.toHaveProperty('id')
    expect(prepared.exceptions[0]).not.toHaveProperty('id')
    expect(prepared.preferences).toEqual({ theme: 'escuro' })
  })
})

describe('chunk', () => {
  it('divide em blocos', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })
})
