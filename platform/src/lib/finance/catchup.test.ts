import { describe, it, expect } from 'vitest'
import type { MonthEntry } from '../types'
import { computeCatchUp, CATCHUP_MONTHS } from './catchup'

function entry(id: string, planned: number, actual: number, done = true): MonthEntry {
  const [year, month] = id.split('-').map(Number)
  return { id, year, month, age: 28, plannedDeposit: planned, actualDeposit: actual, isCompleted: done }
}

describe('computeCatchUp', () => {
  it('computes shortfall over past months and extra PMT over 12 months', () => {
    const entries = [
      entry('2026-01', 1000, 400),
      entry('2026-02', 1000, 900),
      entry('2026-08', 1000, 0, false), // текущий месяц — не считается
    ]
    const result = computeCatchUp(entries, 2026, 7, 4)
    expect(result?.shortfall).toBeCloseTo(700, 5)
    // extra = ceil(shortfall * r / (1 - (1+r)^-12) / 100) * 100 → 100
    expect(result?.extraPerMonth).toBe(100)
    expect(result?.months).toBe(CATCHUP_MONTHS)
  })

  it('returns null when on track or ahead', () => {
    const entries = [entry('2026-01', 1000, 1200), entry('2026-02', 1000, 1000)]
    expect(computeCatchUp(entries, 2026, 7, 4)).toBeNull()
  })

  it('ignores future months entirely', () => {
    const entries = [entry('2026-12', 1000, 0, false)]
    expect(computeCatchUp(entries, 2026, 7, 4)).toBeNull()
  })

  it('treats skipped past months as full shortfall', () => {
    const entries = [entry('2026-01', 2000, 0, false)]
    const result = computeCatchUp(entries, 2026, 7, 4)
    expect(result?.shortfall).toBeCloseTo(2000, 5)
    expect(result?.extraPerMonth).toBe(200)
  })
})
