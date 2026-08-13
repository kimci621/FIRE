import { describe, it, expect, beforeEach } from 'vitest'
import { useFireStore } from './useFireStore'
import { selectPoints, selectRequiredDeposit, selectTargetCapital, selectCatchUp, selectCurrentBalance, selectYearGroups } from './selectors'
import { DEFAULT_PROFILE, type FireData, type MonthEntry } from '../lib/types'
import { monthId } from '../lib/finance/projection'

const NOW = new Date(2026, 7, 15) // август 2026, currentMonthIndex = 7

function month(year: number, month: number, planned: number, actual: number, done: boolean): MonthEntry {
  return { id: monthId(year, month), year, month, age: 28, plannedDeposit: planned, actualDeposit: actual, isCompleted: done }
}

const baseData: FireData = {
  profile: DEFAULT_PROFILE,
  months: [month(2026, 1, 1000, 1000, true), month(2026, 2, 1000, 400, true)],
  meta: { unlockedMilestones: [] },
}

beforeEach(() => {
  useFireStore.getState().importData(baseData, NOW)
})

describe('selectors', () => {
  it('computes target capital and required deposit', () => {
    const profile = useFireStore.getState().profile
    expect(selectTargetCapital(profile)).toBeCloseTo(954387.4, 1)
    expect(selectRequiredDeposit(profile)).toBeCloseTo(1714.38, 1)
  })

  it('projects points with snapshots from entries', () => {
    const points = selectPoints(useFireStore.getState(), NOW)
    expect(points).toHaveLength(264)
    expect(points[0].balance).toBeCloseTo(100000 + 1000 + 100000 * (Math.pow(1.04, 1 / 12) - 1), 2)
    expect(points[7].isFuture).toBe(true)
  })

  it('computes catch-up from past months', () => {
    const result = selectCatchUp(useFireStore.getState(), NOW)
    // Feb: 600 недобора + Mar..Jul созданы importData с планом required и фактом 0 (пропущены)
    const required = selectRequiredDeposit(useFireStore.getState().profile)
    expect(result?.shortfall).toBeCloseTo(600 + 5 * required, 5)
  })

  it('computes current balance and year groups', () => {
    const state = useFireStore.getState()
    expect(selectCurrentBalance(state, NOW)).toBeGreaterThan(0)
    const groups = selectYearGroups(state, NOW)
    expect(groups[0].year).toBe(2026)
    expect(groups[0].age).toBe(28)
    expect(groups[0].entries.length).toBe(12)
  })
})

describe('actions', () => {
  it('setProfile updates future planned deposits but keeps past snapshots', () => {
    useFireStore.getState().setProfile({ expectedRealYieldPct: 6 }, NOW)
    const months = useFireStore.getState().months
    const past = months.find((m) => m.id === '2026-01')
    const future = months.find((m) => m.id === '2027-01')
    expect(past?.plannedDeposit).toBe(1000) // снапшот не тронут
    expect(future?.plannedDeposit).not.toBe(1000)
    expect(future?.plannedDeposit).toBeCloseTo(selectRequiredDeposit(useFireStore.getState().profile), 5)
  })

  it('toggleMonthCompleted sets actual to planned when zero', () => {
    // 2026-03 создан importData: не completed, actual 0, planned = required
    useFireStore.getState().toggleMonthCompleted('2026-03')
    const m = useFireStore.getState().months.find((x) => x.id === '2026-03')
    expect(m?.isCompleted).toBe(true)
    expect(m?.actualDeposit).toBeCloseTo(selectRequiredDeposit(useFireStore.getState().profile), 5)
  })

  it('setMonthActual clamps negatives to zero', () => {
    useFireStore.getState().setMonthActual('2026-01', -50, NOW)
    expect(useFireStore.getState().months[0].actualDeposit).toBe(0)
  })

  it('importData replaces everything and realigns future plans', () => {
    const imported: FireData = { profile: { ...DEFAULT_PROFILE, name: 'Тест' }, months: [], meta: { unlockedMilestones: ['m500k'] } }
    useFireStore.getState().importData(imported, NOW)
    const state = useFireStore.getState()
    expect(state.profile.name).toBe('Тест')
    expect(state.meta.unlockedMilestones).toEqual(['m500k'])
    expect(state.months).toHaveLength(264)
  })

  it('resetAll restores defaults', () => {
    useFireStore.getState().resetAll(NOW)
    const state = useFireStore.getState()
    expect(state.profile).toEqual(DEFAULT_PROFILE)
    expect(state.months.length).toBeGreaterThan(0)
    expect(state.meta.unlockedMilestones).toEqual([])
  })
})
