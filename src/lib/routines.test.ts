import { describe, expect, it } from 'vitest'
import { initialRoutineRules } from './routineSeed'
import { findRoutineConflicts, generateRoutineOccurrences, routineTimeLabel } from './routines'
import type { RoutineRule } from './routines'

const rules = initialRoutineRules.map((rule, index) => ({
  ...rule,
  id: `rule-${index}`,
  user_id: 'user-1',
})) as RoutineRule[]

describe('routine occurrence generation', () => {
  it('generates the November 2026 weekly schedule without duplicates', () => {
    const occurrences = generateRoutineOccurrences(
      rules,
      [],
      new Date(2026, 10, 1),
      new Date(2026, 10, 30),
    )
    const mondaySchool = occurrences.filter(item =>
      item.ruleId === 'rule-1' && item.date === '2026-11-02',
    )
    const churchOnSundays = occurrences.filter(item =>
      item.title === 'Igreja' && item.date === '2026-11-01',
    )

    expect(occurrences).toHaveLength(173)
    expect(mondaySchool).toHaveLength(1)
    expect(churchOnSundays).toHaveLength(1)
    expect(new Set(occurrences.map(item => item.id)).size).toBe(occurrences.length)
  })

  it('keeps Aprisco pending and possible until a first date is confirmed', () => {
    const rule = rules.find(item => item.seed_key === 'routine-v1:aprisco-pending')
    expect(rule).toBeDefined()
    const possibilities = generateRoutineOccurrences(
      [rule!],
      [],
      new Date(2026, 10, 1),
      new Date(2026, 10, 30),
    )

    expect(possibilities).toHaveLength(4)
    expect(possibilities.every(item => item.status === 'possible')).toBe(true)
    expect(possibilities.map(item => item.date)).toEqual([
      '2026-11-06',
      '2026-11-13',
      '2026-11-20',
      '2026-11-27',
    ])
  })

  it('applies date-specific changes without modifying the recurring rule', () => {
    const rule = rules.find(item => item.seed_key === 'routine-v1:church-sunday')
    expect(rule).toBeDefined()
    const [modified] = generateRoutineOccurrences(
      [rule!],
      [{
        routine_rule_id: rule!.id,
        user_id: 'user-1',
        occurrence_date: '2026-11-08',
        action: 'modified',
        overridden_title: 'Igreja (horário alterado)',
        overridden_start_time: '18:30',
        overridden_end_time: '20:30',
        notes: null,
      }],
      new Date(2026, 10, 8),
      new Date(2026, 10, 8),
    )

    expect(modified.title).toBe('Igreja (horário alterado)')
    expect(modified.startTime).toBe('18:30')
    expect(modified.startEarliest).toBeNull()
    expect(modified.endEarliest).toBeNull()
    expect(rule!.start_time).toBe('18:00')
  })

  it('keeps a skipped optional occurrence out of the possible status', () => {
    const rule = rules.find(item => item.seed_key === 'routine-v1:aprisco-pending')
    expect(rule).toBeDefined()
    const [skipped] = generateRoutineOccurrences(
      [rule!],
      [{
        routine_rule_id: rule!.id,
        user_id: 'user-1',
        occurrence_date: '2026-11-06',
        action: 'skipped',
        overridden_title: null,
        overridden_start_time: null,
        overridden_end_time: null,
        notes: 'Não haverá Aprisco nesta data.',
      }],
      new Date(2026, 10, 6),
      new Date(2026, 10, 6),
    )

    expect(skipped.status).toBe('skipped')
  })

  it('detects the weekday academy/church overlap and labels approximate windows', () => {
    const weekday = generateRoutineOccurrences(
      rules,
      [],
      new Date(2026, 10, 3),
      new Date(2026, 10, 3),
    )
    const overlap = findRoutineConflicts(weekday)
    const internship = weekday.find(item => item.title === 'Deslocamento e estágio')

    expect(overlap.some(item => item.first.title === 'Academia' || item.second.title === 'Academia')).toBe(true)
    expect(routineTimeLabel(internship!)).toContain('11:50–13:00')
  })
})
