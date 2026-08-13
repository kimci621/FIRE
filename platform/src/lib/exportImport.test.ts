import { describe, it, expect } from 'vitest'
import { exportJson, parseImport, EXPORT_VERSION } from './exportImport'
import { DEFAULT_PROFILE, DEFAULT_META } from './types'

const validData = { profile: DEFAULT_PROFILE, months: [], meta: DEFAULT_META }

describe('exportJson', () => {
  it('produces versioned json', () => {
    const parsed = JSON.parse(exportJson(validData))
    expect(parsed.version).toBe(EXPORT_VERSION)
    expect(parsed.profile.name).toBe('Амир')
    expect(parsed).toHaveProperty('exportedAt')
  })
})

describe('parseImport', () => {
  it('roundtrips valid export', () => {
    const result = parseImport(exportJson(validData))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.months).toEqual([])
  })

  it('rejects invalid json', () => {
    const result = parseImport('not json')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('JSON')
  })

  it('rejects unsupported version', () => {
    const result = parseImport(JSON.stringify({ version: 2, profile: {}, months: [], meta: {} }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('верси')
  })

  it('rejects missing months array', () => {
    const result = parseImport(JSON.stringify({ version: 1, profile: DEFAULT_PROFILE, meta: {} }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('months')
  })
})
