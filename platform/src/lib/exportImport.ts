import type { Currency, FireData, MonthEntry, Profile } from './types'

export const EXPORT_VERSION = 1

export function exportJson(data: FireData): string {
  return JSON.stringify({ version: EXPORT_VERSION, exportedAt: new Date().toISOString(), ...data }, null, 2)
}

export function downloadJson(data: FireData): void {
  const blob = new Blob([exportJson(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fire-tracker-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export type ImportResult = { ok: true; data: FireData } | { ok: false; error: string }

const CURRENCIES: Currency[] = ['USD', 'EUR', 'RUB', 'GBP', 'CHF', 'CNY', 'JPY', 'KZT', 'AED', 'TRY']

function isProfile(p: unknown): p is Profile {
  if (typeof p !== 'object' || p === null) return false
  const o = p as Record<string, unknown>
  return (
    typeof o.name === 'string' &&
    typeof o.currentAge === 'number' &&
    typeof o.targetAge === 'number' &&
    typeof o.retirementYears === 'number' &&
    typeof o.initialCapital === 'number' &&
    typeof o.targetMonthlyIncome === 'number' &&
    typeof o.expectedRealYieldPct === 'number' &&
    typeof o.inflationPct === 'number' &&
    typeof o.catchUpMonths === 'number' &&
    CURRENCIES.includes(o.currency as Currency)
  )
}

function isMonthEntry(m: unknown): m is MonthEntry {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.year === 'number' &&
    typeof o.month === 'number' &&
    typeof o.plannedDeposit === 'number' &&
    typeof o.actualDeposit === 'number' &&
    typeof o.isCompleted === 'boolean'
  )
}

export function parseImport(text: string): ImportResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Некорректный JSON' }
  }
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'Некорректный JSON' }
  const o = raw as Record<string, unknown>
  if (o.version !== EXPORT_VERSION) {
    return { ok: false, error: `Несовместимая версия файла: ${String(o.version)} (ожидалась ${EXPORT_VERSION})` }
  }
  if (!isProfile(o.profile)) return { ok: false, error: 'Поле profile некорректно' }
  if (!Array.isArray(o.months) || !o.months.every(isMonthEntry)) {
    return { ok: false, error: 'Поле months должно быть массивом записей месяцев' }
  }
  const meta =
    typeof o.meta === 'object' && o.meta !== null && Array.isArray((o.meta as { unlockedMilestones?: unknown }).unlockedMilestones)
      ? (o.meta as FireData['meta'])
      : { unlockedMilestones: [] }
  return { ok: true, data: { profile: o.profile, months: o.months, meta } }
}
