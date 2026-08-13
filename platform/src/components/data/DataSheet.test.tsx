import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useFireStore } from '../../store/useFireStore'
import { DataSheet } from './DataSheet'

vi.mock('../../lib/sync/supabaseAdapter', () => {
  const adapter = {
    signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
    verifyOtp: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    getSession: vi.fn().mockResolvedValue(null),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    pullRows: vi.fn().mockResolvedValue({ profile: null, months: [] }),
    pushRows: vi.fn().mockResolvedValue(undefined),
  }
  return { createSupabaseAdapter: vi.fn(() => adapter) }
})

beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'key')
  useFireStore.getState().resetAll()
})

describe('DataSheet sync ui', () => {
  it('shows auth form when offline', () => {
    render(<DataSheet open onOpenChange={() => {}} />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Получить код/ })).toBeInTheDocument()
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('shows email and logout when logged in', () => {
    useFireStore.getState().setSync({ status: 'synced', email: 'a@b.c' })
    render(<DataSheet open onOpenChange={() => {}} />)
    expect(screen.getByText('a@b.c')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Выйти/ })).toBeInTheDocument()
    expect(screen.getByText('Синхронизировано')).toBeInTheDocument()
  })

  it('sends code from email input', async () => {
    render(<DataSheet open onOpenChange={() => {}} />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.c' } })
    fireEvent.click(screen.getByRole('button', { name: /Получить код/ }))
    await waitFor(() => expect(useFireStore.getState().sync.email).toBe('a@b.c'))
  })
})
