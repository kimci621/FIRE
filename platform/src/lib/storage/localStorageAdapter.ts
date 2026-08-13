import type { FireData } from '../types'
import { STORAGE_KEY, type StorageAdapter } from './adapter'

export function createLocalStorageAdapter(storage: Storage): StorageAdapter {
  return {
    load(): FireData | null {
      const raw = storage.getItem(STORAGE_KEY)
      if (!raw) return null
      try {
        return JSON.parse(raw) as FireData
      } catch {
        return null
      }
    },
    save(data: FireData): void {
      storage.setItem(STORAGE_KEY, JSON.stringify(data))
    },
    getItem(key: string): string | null {
      return storage.getItem(key)
    },
    setItem(key: string, value: string): void {
      storage.setItem(key, value)
    },
    removeItem(key: string): void {
      storage.removeItem(key)
    },
  }
}
