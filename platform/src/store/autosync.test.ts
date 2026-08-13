import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useFireStore } from './useFireStore'
import { DEFAULT_PROFILE, type FireData } from '../lib/types'
import { monthId } from '../lib/finance/projection'

vi.mock('../lib/sync/supabaseAdapter', () => {
  const adapter = {
    signUp: vi.fn().mockResolvedValue({ error: null }),
    signIn: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    getSession: vi.fn().mockResolvedValue(null),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    pullRows: vi.fn().mockResolvedValue({ profile: null, months: [] }),
    pushRows: vi.fn().mockResolvedValue(undefined),
  }
  return { createSupabaseAdapter: vi.fn(() => adapter) }
})

import { createSupabaseAdapter } from '../lib/sync/supabaseAdapter'

const testAdapter = createSupabaseAdapter('https://x.supabase.co', 'key') as unknown as {
  pushRows: ReturnType<typeof vi.fn>
  pullRows: ReturnType<typeof vi.fn>
}

const NOW = new Date(2026, 7, 15)

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'key')
  const data: FireData = {
    profile: DEFAULT_PROFILE,
    months: [{ id: monthId(2026, 1), year: 2026, month: 1, age: 28, plannedDeposit: 1714, actualDeposit: 0, isCompleted: false }],
    meta: { unlockedMilestones: [] },
  }
  useFireStore.getState().importData(data, NOW)
  useFireStore.getState().setSync({ status: 'synced', email: 'a@b.c' })
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('auto-sync', () => {
  it('pushes after a change when logged in (debounced)', async () => {
    useFireStore.getState().setMonthActual('2026-01', 500, NOW)
    expect(testAdapter.pushRows).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(2100)
    expect(testAdapter.pushRows).toHaveBeenCalled()
  })

  it('debounces multiple rapid changes into one push', async () => {
    useFireStore.getState().setMonthActual('2026-01', 100, NOW)
    useFireStore.getState().setMonthActual('2026-01', 200, NOW)
    useFireStore.getState().setProfile({ name: 'Тест' }, NOW)
    await vi.advanceTimersByTimeAsync(2100)
    expect(testAdapter.pushRows).toHaveBeenCalledTimes(1)
  })

  it('does not push when offline', async () => {
    useFireStore.getState().setSync({ status: 'offline', email: null })
    useFireStore.getState().setMonthActual('2026-01', 500, NOW)
    await vi.advanceTimersByTimeAsync(5000)
    expect(testAdapter.pushRows).not.toHaveBeenCalled()
  })
})
