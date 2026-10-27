import { describe, expect, it } from 'vitest'
import { getMonthGridDates, isSameLocalDay, shiftMonth } from './calendarDates'

describe('calendar date helpers', () => {
  it('creates a Sunday-first grid with adjacent month dates', () => {
    const dates = getMonthGridDates(2026, 8)

    expect(dates.length).toBe(42)
    expect(dates[0]?.getDay()).toBe(0)
    expect(dates[0]?.getMonth()).toBe(6)
    expect(dates[dates.length - 1]?.getDay()).toBe(6)
  })

  it('supports a Monday-first week and five-week months', () => {
    const dates = getMonthGridDates(2026, 2, 1)

    expect(dates.length).toBe(35)
    expect(dates[0]?.getDay()).toBe(1)
    expect(dates[0]?.getMonth()).toBe(0)
  })

  it('moves across year boundaries', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 })
    expect(shiftMonth(2027, 1, -1)).toEqual({ year: 2026, month: 12 })
  })

  it('compares dates by local calendar day', () => {
    expect(isSameLocalDay(new Date(2026, 5, 2, 1), new Date(2026, 5, 2, 22))).toBe(true)
  })
})
