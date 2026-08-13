import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import type { MonthEntry, Profile } from '../types'
import type { RemoteRow } from './merge'

export interface PulledRows {
  profile: RemoteRow | null
  months: RemoteRow[]
}

const PROFILE_TABLE = 'profiles'
const MONTHS_TABLE = 'months'

export function createSupabaseAdapter(url: string, anonKey: string) {
  const client: SupabaseClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, storage: window.localStorage },
  })

  return {
    client,
    async signInWithOtp(email: string) {
      return client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
    },
    async verifyOtp(email: string, code: string) {
      return client.auth.verifyOtp({ email, token: code, type: 'email' })
    },
    async signOut() {
      return client.auth.signOut()
    },
    async getSession(): Promise<Session | null> {
      const { data } = await client.auth.getSession()
      return data.session
    },
    onAuthStateChange(cb: (session: Session | null) => void) {
      return client.auth.onAuthStateChange((_event, session) => cb(session))
    },
    /** Забрать облачные строки текущего юзера. */
    async pullRows(): Promise<PulledRows> {
      const { data: profileRows } = await client.from(PROFILE_TABLE).select('user_id, data, updated_at').limit(1)
      const { data: monthRows } = await client.from(MONTHS_TABLE).select('id, data, updated_at').order('id', { ascending: true })
      const toRemote = (row: { data: unknown; updated_at: string }): RemoteRow => ({
        id: null,
        data: row.data,
        updatedAt: row.updated_at,
      })
      return {
        profile: profileRows && profileRows.length > 0 ? toRemote(profileRows[0]) : null,
        months: (monthRows ?? []).map((r) => ({
          id: String(r.id),
          data: r.data,
          updatedAt: r.updated_at,
        })),
      }
    },
    /** Залить локально-новые строки (upsert). */
    async pushRows(profile: Profile | undefined, months: MonthEntry[]): Promise<void> {
      if (profile) {
        await client.from(PROFILE_TABLE).upsert({ data: profile, updated_at: new Date().toISOString() })
      }
      for (const m of months) {
        await client.from(MONTHS_TABLE).upsert({ id: m.id, data: m, updated_at: new Date().toISOString() })
      }
    },
  }
}

export type SupabaseAdapter = ReturnType<typeof createSupabaseAdapter>
