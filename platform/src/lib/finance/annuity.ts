/** Месячная ставка из годовой (проценты): r = (1 + pct/100)^(1/12) - 1 */
export function monthlyRate(annualYieldPct: number): number {
  return Math.pow(1 + annualYieldPct / 100, 1 / 12) - 1
}

/** PV аннуитета: выплата в конце каждого месяца в течение `months` */
export function annuityPV(monthlyIncome: number, months: number, annualYieldPct: number): number {
  const r = monthlyRate(annualYieldPct)
  if (r === 0) return monthlyIncome * months
  return (monthlyIncome * (1 - Math.pow(1 + r, -months))) / r
}

/** PMT: ежемесячный взнос, чтобы initialCapital вырос до targetCapital за `months` */
export function requiredMonthlyDeposit(
  targetCapital: number,
  initialCapital: number,
  months: number,
  annualYieldPct: number,
): number {
  if (months <= 0) return 0
  const r = monthlyRate(annualYieldPct)
  if (r === 0) return Math.max(0, (targetCapital - initialCapital) / months)
  const fv = initialCapital * Math.pow(1 + r, months)
  return Math.max(0, (r * (targetCapital - fv)) / (Math.pow(1 + r, months) - 1))
}
