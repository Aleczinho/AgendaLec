import { describe, expect, it } from 'vitest'
import { combineLocalDateTime } from './dates'

describe('combineLocalDateTime', () => {
  it('keeps the selected calendar date when converting date input values', () => {
    const dateInputValue = new Date(Date.UTC(2026, 2, 16))
    const result = new Date(combineLocalDateTime(dateInputValue, '09:30'))

    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(2)
    expect(result.getDate()).toBe(16)
    expect(result.getHours()).toBe(9)
    expect(result.getMinutes()).toBe(30)
  })

  it('uses midnight when no time is supplied', () => {
    const dateInputValue = new Date(Date.UTC(2026, 2, 16))
    const result = new Date(combineLocalDateTime(dateInputValue))

    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(2)
    expect(result.getDate()).toBe(16)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
  })
})
