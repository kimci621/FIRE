import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useFireStore } from './useFireStore'
import { DEFAULT_PROFILE, type FireData } from '../lib/types'
import { monthId } from '../lib/finance/projection'

vi.mock('../lib/sync/supabaseAdapter', () => {
  const adapter = {
    signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
    verifyOtp: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    getSession: vi.fn().mockResolvedValue(null),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    pullRows: vi.fn().mockResolvedValue({ profile: null, months: [] }),
    pushRows: vi.fn().mockResolvedValue(undefined),
  }
  return {
    createSupabaseAdapter: vi.fn(() => adapter),
    testAdapter: adapter,
  }
})

import { createSupabaseAdapter } from '../lib/sync/supabaseAdapter'

// Фабрика замокана на уровне модуля и возвращает общий инстанс — получить его типизированно
const testAdapter = createSupabaseAdapter('https://x.supabase.co', 'key') as unknown as {
  signInWithOtp: ReturnType<typeof vi.fn>
  verifyOtp: ReturnType<typeof vi.fn>
  signOut: ReturnType<typeof vi.fn>
  getSession: ReturnType<typeof vi.fn>
  onAuthStateChange: ReturnType<typeof vi.fn>
  pullRows: ReturnType<typeof vi.fn>
  pushRows: ReturnType<typeof vi.fn>
}

const NOW = new Date(2026, 7, 15)

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'key')
  const data: FireData = {
    profile: { ...DEFAULT_PROFILE, name: 'Тест' },
    months: [{ id: monthId(2026, 1), year: 2026, month: 1, age: 28, plannedDeposit: 1714, actualDeposit: 0, isCompleted: false }],
    meta: { unlockedMilestones: [] },
  }
  useFireStore.getState().importData(data, NOW)
  useFireStore.getState().setSync({ status: 'offline', email: null })
})

describe('sync actions', () => {
  it('sendCode keeps pending email and verifies into online state', async () => {
    await useFireStore.getState().sendCode('a@b.c')
    expect(useFireStore.getState().sync.email).toBe('a@b.c')
    await useFireStore.getState().verifyCode('a@b.c', '123456')
    expect(useFireStore.getState().sync.status).toBe('synced')
  })

  it('verifyCode failure sets error', async () => {
    ;testAdapter.verifyOtp.mockResolvedValueOnce({ error: { message: 'bad code' } })
    await useFireStore.getState().verifyCode('a@b.c', '000000')
    expect(useFireStore.getState().sync.status).toBe('error')
  })

  it('syncNow pulls remote data and merges', async () => {
    ;testAdapter.pullRows.mockResolvedValueOnce({
      profile: { id: null, data: { ...DEFAULT_PROFILE, name: 'Облако' }, updatedAt: '2030-01-01T00:00:00Z' },
      months: [],
    })
    useFireStore.getState().setSync({ status: 'synced', email: 'a@b.c' })
    await useFireStore.getState().syncNow()
    expect(useFireStore.getState().profile.name).toBe('Облако')
    expect(useFireStore.getState().sync.status).toBe('synced')
  })

  it('signOut returns to offline', async () => {
    useFireStore.getState().setSync({ status: 'synced', email: 'a@b.c' })
    await useFireStore.getState().signOut()
    expect(useFireStore.getState().sync.status).toBe('offline')
  })
})
