import { describe, it, expect } from 'vitest'
import type { MonthEntry, Profile } from '../types'
import { DEFAULT_PROFILE } from '../types'
import { monthId, addMonths, projectMonths } from './projection'

const profile: Profile = {
  ...DEFAULT_PROFILE,
  currentAge: 28,
  targetAge: 30,
  expectedRealYieldPct: 0,
  initialCapital: 100000,
  targetMonthlyIncome: 1000,
}

function entry(year: number, month: number, planned: number, actual: number, done: boolean): MonthEntry {
  return { id: monthId(year, month), year, month, age: 28, plannedDeposit: planned, actualDeposit: actual, isCompleted: done }
}

describe('monthId', () => {
  it('pads month to two digits', () => {
    expect(monthId(2026, 8)).toBe('2026-08')
  })
})

describe('addMonths', () => {
  it('crosses year boundary', () => {
    expect(addMonths({ year: 2026, month: 11 }, 3)).toEqual({ year: 2027, month: 2 })
  })
})

describe('projectMonths', () => {
  // Сетка: 24 месяца (28→30 лет), старт январь 2026, текущий месяц август (index 7)
  const entries = [entry(2026, 1, 8333.33, 5000, true)]

  it('iterates month by month with layers and past/future logic', () => {
    const points = projectMonths({ profile, entries, startYear: 2026, currentMonthIndex: 7 })
    expect(points).toHaveLength(24)
    // Январь 2026: completed, взнос 5000
    expect(points[0].balance).toBeCloseTo(105000, 5)
    expect(points[0].contributions).toBeCloseTo(5000, 5)
    expect(points[0].interest).toBe(0)
    expect(points[0].isFuture).toBe(false)
    // Февраль 2026: прошедший, не отмечен → 0
    expect(points[1].balance).toBeCloseTo(105000, 5)
    // Август 2026 (текущий): считается плановый взнос
    expect(points[7].balance).toBeCloseTo(113333.33, 1)
    expect(points[7].isFuture).toBe(true)
    // Последний месяц: 105000 + 17 × 8333.33
    expect(points[23].balance).toBeCloseTo(246666.66, 1)
    expect(points[23].contributions).toBeCloseTo(146666.66, 1)
  })

  it('computes age from index', () => {
    const points = projectMonths({ profile, entries, startYear: 2026, currentMonthIndex: 7 })
    expect(points[0].age).toBe(28)
    expect(points[23].age).toBe(29)
  })

  it('accumulates interest with nonzero yield', () => {
    const p = { ...profile, expectedRealYieldPct: 12 }
    const points = projectMonths({ profile: p, entries: [], startYear: 2026, currentMonthIndex: 7 })
    const r = Math.pow(1.12, 1 / 12) - 1
    expect(points[0].interest).toBeCloseTo(100000 * r, 5)
    expect(points[1].interest).toBeCloseTo(points[0].interest + points[0].balance * r, 5)
  })

  it('uses planned deposit snapshot from entry for future months', () => {
    const e = entry(2026, 9, 7777, 0, false)
    const points = projectMonths({ profile, entries: [e], startYear: 2026, currentMonthIndex: 7 })
    expect(points[8].balance - points[7].balance).toBeCloseTo(7777, 5)
  })
})
