import { describe, expect, it } from 'vitest'
import { formatDateInput, isValidDateInput, maskDateInput, parseDateInput } from './dateInput'

describe('Brazilian date input', () => {
  it('formats and parses dates as dd/mm/yy without changing the selected day', () => {
    const date = new Date(Date.UTC(2026, 2, 16))

    expect(formatDateInput(date)).toBe('16/03/26')
    expect(parseDateInput('16/03/26')?.toISOString()).toBe('2026-03-16T00:00:00.000Z')
  })

  it('rejects invalid and ambiguous dates', () => {
    expect(isValidDateInput('31/02/26')).toBe(false)
    expect(isValidDateInput('3/2/26')).toBe(false)
    expect(parseDateInput('01/01/26')).not.toBeNull()
  })

  it('inserts Brazilian date separators while typing digits', () => {
    expect(maskDateInput('160326')).toBe('16/03/26')
    expect(maskDateInput('16/03/26')).toBe('16/03/26')
  })
})
