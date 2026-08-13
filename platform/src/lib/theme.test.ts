import { describe, it, expect } from 'vitest'
import { resolveTheme } from './theme'

describe('resolveTheme', () => {
  it('returns explicit theme regardless of system', () => {
    expect(resolveTheme('dark', true)).toBe('dark')
    expect(resolveTheme('light', false)).toBe('light')
  })
  it('follows system preference for system theme', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })
})
