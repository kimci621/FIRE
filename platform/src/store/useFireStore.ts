import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { FireData, FireMeta, MonthEntry, Profile } from '../lib/types'
import { DEFAULT_META, DEFAULT_PROFILE } from '../lib/types'
import { monthId, addMonths } from '../lib/finance/projection'
import { requiredMonthlyDeposit } from '../lib/finance/annuity'
import { STORAGE_KEY } from '../lib/storage/adapter'
import { createLocalStorageAdapter } from '../lib/storage/localStorageAdapter'
import { createSupabaseAdapter, type SupabaseAdapter } from '../lib/sync/supabaseAdapter'
import { mergePull, diffPush } from '../lib/sync/merge'
import { selectTargetCapital } from './selectors'

export type SyncStatus = 'offline' | 'syncing' | 'synced' | 'error'

export interface SyncState {
  status: SyncStatus
  email: string | null
  error: string | null
  lastSyncAt: string | null
}

let adapterSingleton: SupabaseAdapter | null | undefined

export function getAdapter(): SupabaseAdapter | null {
  if (adapterSingleton === undefined) {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
    adapterSingleton = url && anonKey ? createSupabaseAdapter(url, anonKey) : null
  }
  return adapterSingleton
}

export interface FireStoreState extends FireData {
  sync: SyncState
  setProfile(patch: Partial<Profile>, now?: Date): void
  toggleMonthCompleted(id: string, now?: Date): void
  setMonthActual(id: string, value: number, now?: Date): void
  addUnlockedMilestone(key: string): void
  importData(data: FireData, now?: Date): void
  resetAll(now?: Date): void
  setSync(patch: Partial<SyncState>): void
  sendCode(email: string): Promise<void>
  verifyCode(email: string, code: string): Promise<void>
  signOut(): Promise<void>
  syncNow(): Promise<void>
}

function regenerateMonths(profile: Profile, prevMonths: MonthEntry[], now: Date): MonthEntry[] {
  const totalMonths = (profile.targetAge - profile.currentAge) * 12
  if (totalMonths <= 0) return prevMonths
  const startYear = now.getFullYear()
  const currentMonthIndex = now.getMonth()
  const required = requiredMonthlyDeposit(
    selectTargetCapital(profile),
    profile.initialCapital,
    totalMonths,
    profile.expectedRealYieldPct,
  )
  const byId = new Map(prevMonths.map((m) => [m.id, m]))
  const months: MonthEntry[] = []
  for (let i = 0; i < totalMonths; i++) {
    const { year, month } = addMonths({ year: startYear, month: 1 }, i)
    const id = monthId(year, month)
    const prev = byId.get(id)
    const age = profile.currentAge + Math.floor(i / 12)
    const isFuture = i >= currentMonthIndex
    months.push(
      prev
        ? { ...prev, age, plannedDeposit: isFuture ? required : prev.plannedDeposit }
        : { id, year, month, age, plannedDeposit: required, actualDeposit: 0, isCompleted: false },
    )
  }
  return months
}

function bumpProfile(meta: FireMeta, now: Date): FireMeta {
  return { ...meta, lastModified: { ...meta.lastModified, profile: now.toISOString() } }
}

function bumpMonth(meta: FireMeta, id: string, now: Date): FireMeta {
  return { ...meta, lastModified: { ...meta.lastModified, months: { ...meta.lastModified?.months, [id]: now.toISOString() } } }
}

function clearMonthTimestamps(meta: FireMeta): FireMeta {
  return { ...meta, lastModified: { ...meta.lastModified, months: undefined } }
}

function initialData(): FireData {
  const profile = DEFAULT_PROFILE
  return { profile, months: regenerateMonths(profile, [], new Date()), meta: DEFAULT_META }
}

const INITIAL_SYNC: SyncState = { status: 'offline', email: null, error: null, lastSyncAt: null }

export const useFireStore = create<FireStoreState>()(
  persist(
    (set, get) => ({
      ...initialData(),
      sync: INITIAL_SYNC,
      setProfile(patch, now = new Date()) {
        const profile = { ...get().profile, ...patch }
        const totalMonths = (profile.targetAge - profile.currentAge) * 12
        set({
          profile,
          months: totalMonths > 0 ? regenerateMonths(profile, get().months, now) : get().months,
          meta: bumpProfile(get().meta, now),
        })
      },
      toggleMonthCompleted(id, now = new Date()) {
        set((state) => ({
          months: state.months.map((m) =>
            m.id === id
              ? {
                  ...m,
                  isCompleted: !m.isCompleted,
                  actualDeposit: !m.isCompleted && m.actualDeposit <= 0 ? m.plannedDeposit : m.actualDeposit,
                }
              : m,
          ),
          meta: bumpMonth(state.meta, id, now),
        }))
      },
      setMonthActual(id, value, now = new Date()) {
        const clamped = Number.isFinite(value) && value >= 0 ? value : 0
        set((state) => ({
          months: state.months.map((m) => (m.id === id ? { ...m, actualDeposit: clamped } : m)),
          meta: bumpMonth(state.meta, id, now),
        }))
      },
      addUnlockedMilestone(key) {
        set((state) => {
          if (state.meta.unlockedMilestones.includes(key)) return state
          const meta: FireMeta = { unlockedMilestones: [...state.meta.unlockedMilestones, key] }
          return { meta }
        })
      },
      importData(data, now = new Date()) {
        set({
          profile: data.profile,
          meta: clearMonthTimestamps({ ...data.meta, lastModified: { profile: now.toISOString() } }),
          months: regenerateMonths(data.profile, data.months, now),
        })
      },
      resetAll(now = new Date()) {
        set({
          profile: DEFAULT_PROFILE,
          meta: { unlockedMilestones: [], lastModified: { profile: now.toISOString() } },
          months: regenerateMonths(DEFAULT_PROFILE, [], now),
          sync: INITIAL_SYNC,
        })
      },
      setSync(patch) {
        set((state) => ({ sync: { ...state.sync, ...patch } }))
      },
      async sendCode(email) {
        const adapter = getAdapter()
        if (!adapter) {
          set((s) => ({ sync: { ...s.sync, status: 'error', error: 'Supabase не настроен' } }))
          return
        }
        const { error } = await adapter.signInWithOtp(email)
        set((s) => ({ sync: { ...s.sync, email: error ? null : email, error: error ? error.message : null } }))
      },
      async verifyCode(email, code) {
        const adapter = getAdapter()
        if (!adapter) return
        const { error } = await adapter.verifyOtp(email, code)
        if (error) {
          set((s) => ({ sync: { ...s.sync, status: 'error', error: error.message } }))
          return
        }
        set((s) => ({ sync: { ...s.sync, status: 'synced', email, error: null } }))
        await get().syncNow()
      },
      async signOut() {
        const adapter = getAdapter()
        await adapter?.signOut()
        set(() => ({ sync: { status: 'offline', email: null, error: null, lastSyncAt: null } }))
      },
      async syncNow() {
        const adapter = getAdapter()
        if (!adapter) return
        set((s) => ({ sync: { ...s.sync, status: 'syncing', error: null } }))
        try {
          const remote = await adapter.pullRows()
          const merged = mergePull(get(), remote.profile, remote.months)
          if (merged.pulled > 0) set({ profile: merged.data.profile, months: merged.data.months })
          const diff = diffPush(get(), remote.profile, remote.months)
          await adapter.pushRows(diff.profile, diff.months)
          set((s) => ({ sync: { ...s.sync, status: 'synced', error: null, lastSyncAt: new Date().toISOString() } }))
        } catch (e) {
          set((s) => ({
            sync: { ...s.sync, status: 'error', error: e instanceof Error ? e.message : 'Ошибка синхронизации' },
          }))
        }
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => createLocalStorageAdapter(window.localStorage)),
      partialize: (s) => ({ profile: s.profile, months: s.months, meta: s.meta }),
    },
  ),
)
