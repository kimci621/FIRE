import { describe, it, expect, beforeEach } from 'vitest'
import { useFireStore } from './useFireStore'
import { DEFAULT_PROFILE, type FireData, type MonthEntry } from '../lib/types'
import { monthId } from '../lib/finance/projection'

const NOW = new Date(2026, 7, 15)

function month(year: number, month: number): MonthEntry {
  return { id: monthId(year, month), year, month, age: 28, plannedDeposit: 1714, actualDeposit: 0, isCompleted: false }
}

const baseData: FireData = {
  profile: DEFAULT_PROFILE,
  months: [month(2026, 1)],
  meta: { unlockedMilestones: [] },
}

beforeEach(() => {
  useFireStore.getState().importData(baseData, NOW)
})

describe('lastModified bookkeeping', () => {
  it('bumps profile timestamp on setProfile', () => {
    useFireStore.getState().setProfile({ name: 'Тест' }, NOW)
    expect(useFireStore.getState().meta.lastModified?.profile).toBeDefined()
  })

  it('bumps month timestamp on setMonthActual and toggle', () => {
    useFireStore.getState().setMonthActual('2026-01', 500, NOW)
    const t1 = useFireStore.getState().meta.lastModified?.months?.['2026-01']
    expect(t1).toBeDefined()
    useFireStore.getState().toggleMonthCompleted('2026-01', NOW)
    const t2 = useFireStore.getState().meta.lastModified?.months?.['2026-01']
    expect(t2).toBeDefined()
  })

  it('clears per-month timestamps on importData', () => {
    useFireStore.getState().setMonthActual('2026-01', 500, NOW)
    useFireStore.getState().importData(baseData, NOW)
    const lm = useFireStore.getState().meta.lastModified
    expect(lm?.profile).toBeDefined()
    expect(lm?.months?.['2026-01']).toBeUndefined()
  })

  it('survives export/import roundtrip', async () => {
    useFireStore.getState().setMonthActual('2026-01', 500, NOW)
    const { exportJson, parseImport } = await import('../lib/exportImport')
    const s = useFireStore.getState()
    const result = parseImport(exportJson({ profile: s.profile, months: s.months, meta: s.meta }))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.meta.lastModified?.months?.['2026-01']).toBeDefined()
    }
  })
})
