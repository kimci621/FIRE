import { describe, it, expect, beforeEach } from 'vitest'
import { createLocalStorageAdapter } from './localStorageAdapter'
import { STORAGE_KEY } from './adapter'
import { DEFAULT_PROFILE, DEFAULT_META } from '../types'

beforeEach(() => {
  window.localStorage.clear()
})

describe('createLocalStorageAdapter', () => {
  it('returns null when storage is empty', () => {
    const adapter = createLocalStorageAdapter(window.localStorage)
    expect(adapter.load()).toBeNull()
  })

  it('saves and loads data roundtrip', () => {
    const adapter = createLocalStorageAdapter(window.localStorage)
    const data = { profile: DEFAULT_PROFILE, months: [], meta: DEFAULT_META }
    adapter.save(data)
    expect(adapter.load()).toEqual(data)
  })

  it('returns null on corrupted json', () => {
    window.localStorage.setItem(STORAGE_KEY, '{oops')
    const adapter = createLocalStorageAdapter(window.localStorage)
    expect(adapter.load()).toBeNull()
  })
})
