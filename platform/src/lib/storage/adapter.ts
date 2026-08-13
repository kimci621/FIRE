import type { FireData } from '../types'

export const STORAGE_KEY = 'fire-tracker-storage-v1'

/** Единая точка доступа к данным: localStorage (Фаза 1), Supabase (Фаза 2). */
export interface StorageAdapter {
  load(): FireData | null
  save(data: FireData): void
  // Duck-typed Storage API для zustand persist:
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
