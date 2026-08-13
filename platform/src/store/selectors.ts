import type { FireData, Profile, ProjectionPoint, MonthEntry } from '../lib/types'
import { annuityPV, requiredMonthlyDeposit } from '../lib/finance/annuity'
import { projectMonths } from '../lib/finance/projection'
import { computeCatchUp, type CatchUpResult } from '../lib/finance/catchup'

export function selectTargetCapital(profile: Profile): number {
  return annuityPV(profile.targetMonthlyIncome, profile.retirementYears * 12, profile.expectedRealYieldPct)
}

export function selectRequiredDeposit(profile: Profile): number {
  return requiredMonthlyDeposit(
    selectTargetCapital(profile),
    profile.initialCapital,
    (profile.targetAge - profile.currentAge) * 12,
    profile.expectedRealYieldPct,
  )
}

export function selectPoints(state: FireData, now: Date = new Date()): ProjectionPoint[] {
  return projectMonths({
    profile: state.profile,
    entries: state.months,
    startYear: now.getFullYear(),
    currentMonthIndex: now.getMonth(),
  })
}

export function selectMaxBalance(state: FireData, now: Date = new Date()): number {
  return selectPoints(state, now).reduce((max, p) => Math.max(max, p.balance), 0)
}

export function selectCatchUp(state: FireData, now: Date = new Date()): CatchUpResult | null {
  return computeCatchUp(state.months, now.getFullYear(), now.getMonth(), state.profile.expectedRealYieldPct)
}

export interface YearGroup {
  year: number
  age: number
  entries: { point: ProjectionPoint; entry: MonthEntry | undefined }[]
  plannedTotal: number
  actualTotal: number
  endBalance: number
}

export function selectYearGroups(state: FireData, now: Date = new Date()): YearGroup[] {
  const points = selectPoints(state, now)
  const byId = new Map(state.months.map((m) => [m.id, m]))
  const groups = new Map<number, YearGroup>()
  for (const point of points) {
    const entry = byId.get(point.id)
    let group = groups.get(point.year)
    if (!group) {
      group = { year: point.year, age: point.age, entries: [], plannedTotal: 0, actualTotal: 0, endBalance: 0 }
      groups.set(point.year, group)
    }
    group.entries.push({ point, entry })
    group.plannedTotal += entry?.plannedDeposit ?? 0
    group.actualTotal += entry?.isCompleted ? entry.actualDeposit : 0
    group.endBalance = point.balance
  }
  return [...groups.values()]
}
