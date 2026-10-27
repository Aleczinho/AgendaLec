import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('joins class names and omits falsy values', () => {
    expect(cn('card', false, undefined, 'selected')).toBe('card selected')
  })
})
