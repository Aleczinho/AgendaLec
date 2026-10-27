import { describe, expect, it } from 'vitest'
import { errorMessage, routineSchemaErrorMessage } from './errors'

describe('error messages', () => {
  it('uses the message from a Supabase error object', () => {
    expect(errorMessage({ code: '42501', message: 'permission denied' }, 'fallback'))
      .toBe('permission denied')
  })

  it('explains how to resolve a missing routine table', () => {
    expect(routineSchemaErrorMessage({
      code: 'PGRST205',
      message: "Could not find the table 'public.routine_rules' in the schema cache",
    })).toContain('Aplique a migration 20261027000001_routine_rules.sql')
  })

  it('preserves other routine load errors', () => {
    expect(routineSchemaErrorMessage({ code: '42501', message: 'permission denied' }))
      .toBe('permission denied')
  })
})
