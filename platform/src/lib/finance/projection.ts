import type { MonthEntry, Profile, ProjectionPoint } from '../types'
import { monthlyRate, requiredMonthlyDeposit, annuityPV } from './annuity'

export function monthId(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function addMonths(d: { year: number; month: number }, delta: number): { year: number; month: number } {
  const total = d.year * 12 + (d.month - 1) + delta
  return { year: Math.floor(total / 12), month: (total % 12) + 1 }
}

export interface ProjectionInput {
  profile: Profile
  entries: MonthEntry[]
  startYear: number // январь текущего года — начало сетки
  currentMonthIndex: number // индекс текущего месяца в сетке (0-based, = now.getMonth())
}

export function projectMonths(input: ProjectionInput): ProjectionPoint[] {
  const { profile, entries, startYear, currentMonthIndex } = input
  const totalMonths = (profile.targetAge - profile.currentAge) * 12
  if (totalMonths <= 0) return []
  const r = monthlyRate(profile.expectedRealYieldPct)
  const targetCapital = annuityPV(profile.targetMonthlyIncome, profile.retirementYears * 12, profile.expectedRealYieldPct)
  const defaultPlanned = requiredMonthlyDeposit(targetCapital, profile.initialCapital, totalMonths, profile.expectedRealYieldPct)
  const byId = new Map(entries.map((e) => [e.id, e]))

  let balance = profile.initialCapital
  let contributions = 0
  let interest = 0
  const points: ProjectionPoint[] = []

  for (let i = 0; i < totalMonths; i++) {
    const { year, month } = addMonths({ year: startYear, month: 1 }, i)
    const id = monthId(year, month)
    const entry = byId.get(id)
    const isFuture = i >= currentMonthIndex
    const earned = balance * r
    const deposit = entry?.isCompleted
      ? entry.actualDeposit
      : isFuture
        ? (entry?.plannedDeposit ?? defaultPlanned)
        : 0
    interest += earned
    balance += earned + deposit
    contributions += deposit
    points.push({
      id,
      year,
      month,
      age: profile.currentAge + Math.floor(i / 12),
      balance,
      contributions,
      interest,
      isFuture,
    })
  }
  return points
}
