import type { FireData } from './types'
import { formatMoney } from './finance/format'
import { monthId } from './finance/projection'

export const DEFAULT_REMIND_DAY = 20

export interface ReminderDecision {
  remind: boolean
  message?: string
}

/** Напоминать о взносе текущего месяца, если он не отмечен и день ≥ настроенного дня. */
export function shouldRemind(data: FireData, now: Date = new Date()): ReminderDecision {
  if (!data.meta.remindersEnabled) return { remind: false }
  const remindDay = data.meta.remindDay ?? DEFAULT_REMIND_DAY
  if (now.getDate() < remindDay) return { remind: false }
  const id = monthId(now.getFullYear(), now.getMonth() + 1)
  const entry = data.months.find((m) => m.id === id)
  if (!entry || entry.isCompleted) return { remind: false }
  return {
    remind: true,
    message: `Не забудьте пополнить портфель: ${formatMoney(entry.plannedDeposit, data.profile.currency)} до конца месяца`,
  }
}
