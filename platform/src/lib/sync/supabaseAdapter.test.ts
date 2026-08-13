import { describe, it, expect, vi, beforeEach } from 'vitest'

const authMock = {
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
}

const supabaseMock = {
  auth: authMock,
  from: vi.fn(),
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => supabaseMock),
}))

import { createSupabaseAdapter } from './supabaseAdapter'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createSupabaseAdapter', () => {
  it('signs up and signs in with password', async () => {
    authMock.signUp.mockResolvedValue({ error: null })
    authMock.signInWithPassword.mockResolvedValue({ error: null })
    const adapter = createSupabaseAdapter('https://x.supabase.co', 'key')
    await adapter.signUp('a@b.c', 'secret123')
    expect(authMock.signUp).toHaveBeenCalledWith({ email: 'a@b.c', password: 'secret123' })
    await adapter.signIn('a@b.c', 'secret123')
    expect(authMock.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.c', password: 'secret123' })
  })

  it('returns session state', async () => {
    authMock.getSession.mockResolvedValue({ data: { session: { user: { email: 'a@b.c' } } } })
    const adapter = createSupabaseAdapter('https://x.supabase.co', 'key')
    const session = await adapter.getSession()
    expect(session?.user?.email).toBe('a@b.c')
  })

  it('pulls remote rows', async () => {
    const monthRow = { id: '2026-01', data: { id: '2026-01' }, updated_at: '2026-08-01T00:00:00Z' }
    const chainForProfiles = {
      select: vi.fn(() => ({ limit: vi.fn().mockResolvedValue({ data: [], error: null }) })),
    }
    const chainForMonths = {
      select: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: [monthRow], error: null }) })),
    }
    supabaseMock.from.mockImplementation((table: string) =>
      table === 'profiles' ? chainForProfiles : chainForMonths,
    )
    const adapter = createSupabaseAdapter('https://x.supabase.co', 'key')
    const result = await adapter.pullRows()
    expect(result.profile).toBeNull()
    expect(result.months).toHaveLength(1)
    expect(result.months[0].id).toBe('2026-01')
  })

  it('pushes rows with upsert', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const chain = { upsert: vi.fn(() => ({ select: upsert })) }
    supabaseMock.from.mockReturnValue(chain)
    const adapter = createSupabaseAdapter('https://x.supabase.co', 'key')
    const profile = { name: 'Амир' } as never
    await adapter.pushRows(profile, [])
    expect(supabaseMock.from).toHaveBeenCalledWith('profiles')
    expect(chain.upsert).toHaveBeenCalled()
  })
})
