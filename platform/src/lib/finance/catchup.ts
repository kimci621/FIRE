import type { MonthEntry } from '../types'
import { monthlyRate } from './annuity'

export const CATCHUP_MONTHS = 12

export interface CatchUpResult {
  shortfall: number
  extraPerMonth: number
  months: number
}

/**
 * «Догонялки»: недобор по прошедшим месяцам сетки (gridIndex < currentMonthIndex).
 * Доп. взнос = «кредитный» платёж, закрывающий недобор за CATCHUP_MONTHS при той же ставке:
 * P = S * r / (1 - (1+r)^-Y), округление вверх до 100.
 */
export function computeCatchUp(
  entries: MonthEntry[],
  startYear: number,
  currentMonthIndex: number,
  annualYieldPct: number,
): CatchUpResult | null {
  let shortfall = 0
  for (const e of entries) {
    const gridIndex = (e.year - startYear) * 12 + (e.month - 1)
    if (gridIndex < currentMonthIndex) {
      shortfall += Math.max(0, e.plannedDeposit - e.actualDeposit)
    }
  }
  if (shortfall <= 0) return null
  const r = monthlyRate(annualYieldPct)
  const raw = (shortfall * r) / (1 - Math.pow(1 + r, -CATCHUP_MONTHS))
  const extraPerMonth = Math.ceil(raw / 100) * 100
  return { shortfall, extraPerMonth, months: CATCHUP_MONTHS }
}
