import type { StorageAdapter } from './adapter'

/** Фаза 2: Supabase Auth + PostgreSQL sync. В MVP — заглушка. */
export function createSupabaseAdapter(): StorageAdapter {
  throw new Error('Supabase sync arrives in Phase 2')
}
