import { describe, it, expect } from 'vitest'
import type { MonthEntry } from '../types'
import { selectStreak } from './streak'
import { monthId } from './finance/projection'

function m(year: number, month: number, done: boolean): MonthEntry {
  return { id: monthId(year, month), year, month, age: 28, plannedDeposit: 1000, actualDeposit: 1000, isCompleted: done }
}

describe('selectStreak', () => {
  const now = new Date(2026, 7, 15) // август 2026

  it('counts consecutive completed months ending at previous month', () => {
    const months = [m(2026, 5, true), m(2026, 6, true), m(2026, 7, true), m(2026, 8, false)]
    expect(selectStreak(months, now)).toBe(3)
  })

  it('includes current month when completed', () => {
    const months = [m(2026, 7, true), m(2026, 8, true)]
    expect(selectStreak(months, now)).toBe(2)
  })

  it('returns 0 when previous month is not completed', () => {
    const months = [m(2026, 6, true), m(2026, 7, false)]
    expect(selectStreak(months, now)).toBe(0)
  })

  it('handles empty months', () => {
    expect(selectStreak([], now)).toBe(0)
  })
})
