import { useMemo } from 'react'
import { useFireStore } from '@/store/useFireStore'
import type { FireData } from '@/lib/types'

/**
 * Подписка на стабильные ссылки стора (months/profile/meta меняют ссылку только при апдейте).
 * Объектные селекторы (selectPoints, selectCatchUp, selectYearGroups) создают новые ссылки
 * при каждом вызове — их нужно оборачивать в useMemo поверх этого хука, иначе
 * zustand v5 (useSyncExternalStore) уходит в бесконечный ре-рендер.
 */
export function useFireData(): FireData {
  const months = useFireStore((s) => s.months)
  const profile = useFireStore((s) => s.profile)
  const meta = useFireStore((s) => s.meta)
  return useMemo(() => ({ months, profile, meta }), [months, profile, meta])
}
