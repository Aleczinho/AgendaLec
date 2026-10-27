import { describe, expect, it } from 'vitest'
import { formatTimeValue } from './timeFormat'

describe('formatTimeValue', () => {
  it('formats routine times using the selected 12-hour or 24-hour format', () => {
    expect(formatTimeValue('00:15', '12h')).toBe('12:15 AM')
    expect(formatTimeValue('13:05', '12h')).toBe('01:05 PM')
    expect(formatTimeValue('13:05', '24h')).toBe('13:05')
  })
})
