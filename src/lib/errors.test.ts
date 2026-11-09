import { describe, expect, it } from 'vitest'
import { errorMessage, routineSchemaErrorMessage } from './errors'

describe('error messages', () => {
  it('uses the message from an error object', () => {
    expect(errorMessage({ code: '42501', message: 'permission denied' }, 'fallback'))
      .toBe('permission denied')
  })

  it('explains how to resolve a missing routine table', () => {
    expect(routineSchemaErrorMessage({
      code: '42P01',
      message: 'relation "routine_rules" does not exist',
    })).toContain('npm run migrate')
  })

  it('preserves other routine load errors', () => {
    expect(routineSchemaErrorMessage({ code: '42501', message: 'permission denied' }))
      .toBe('permission denied')
  })
})
