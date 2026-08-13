import { useState } from 'react'
import { STORAGE_KEY } from '@/lib/storage/adapter'

export function useStorageHealth(): { corrupt: boolean; clear: () => void } {
  const [corrupt, setCorrupt] = useState<boolean>(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    try {
      JSON.parse(raw)
      return false
    } catch {
      return true
    }
  })
  const clear = () => {
    window.localStorage.removeItem(STORAGE_KEY)
    setCorrupt(false)
  }
  return { corrupt, clear }
}
