import type { MonthEntry } from './types'

/** Серия подряд отмеченных месяцев, заканчивающаяся предыдущим (или текущим, если отмечен). */
export function selectStreak(months: MonthEntry[], now: Date = new Date()): number {
  const byId = new Map(months.map((m) => [m.id, m]))
  let streak = 0
  let year = now.getFullYear()
  let month = now.getMonth() + 1 // 1-12, текущий

  const currentId = `${year}-${String(month).padStart(2, '0')}`
  if (!byId.get(currentId)?.isCompleted) {
    month -= 1
    if (month === 0) {
      month = 12
      year -= 1
    }
  }

  for (;;) {
    const id = `${year}-${String(month).padStart(2, '0')}`
    if (!byId.get(id)?.isCompleted) break
    streak += 1
    month -= 1
    if (month === 0) {
      month = 12
      year -= 1
    }
  }
  return streak
}
