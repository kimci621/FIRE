import { describe, it, expect } from 'vitest'
import type { FireData } from './types'
import { DEFAULT_PROFILE } from './types'
import { monthId } from './finance/projection'
import { shouldRemind } from './reminders'

function data(done: boolean, remindDay: number, enabled = true): FireData {
  const y = new Date().getFullYear()
  const mo = new Date().getMonth() + 1
  return {
    profile: DEFAULT_PROFILE,
    months: [{ id: monthId(y, mo), year: y, month: mo, age: 28, plannedDeposit: 1714, actualDeposit: 0, isCompleted: done }],
    meta: { unlockedMilestones: [], remindersEnabled: enabled, remindDay },
  }
}

describe('shouldRemind', () => {
  it('reminds after configured day when current month not completed', () => {
    const now = new Date(new Date().getFullYear(), new Date().getMonth(), 21)
    const result = shouldRemind(data(false, 20), now)
    expect(result.remind).toBe(true)
    expect(result.message).toContain('714')
  })

  it('stays silent before configured day', () => {
    const now = new Date(new Date().getFullYear(), new Date().getMonth(), 10)
    expect(shouldRemind(data(false, 20), now).remind).toBe(false)
  })

  it('respects custom remind day', () => {
    const now = new Date(new Date().getFullYear(), new Date().getMonth(), 15)
    expect(shouldRemind(data(false, 10), now).remind).toBe(true)
    expect(shouldRemind(data(false, 25), now).remind).toBe(false)
  })

  it('stays silent when month completed', () => {
    const now = new Date(new Date().getFullYear(), new Date().getMonth(), 21)
    expect(shouldRemind(data(true, 20), now).remind).toBe(false)
  })

  it('stays silent when reminders disabled', () => {
    const now = new Date(new Date().getFullYear(), new Date().getMonth(), 21)
    expect(shouldRemind(data(false, 20, false), now).remind).toBe(false)
  })
})
