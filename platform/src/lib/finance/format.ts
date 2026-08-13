import type { Currency } from '../types'

export interface FormatOptions {
  maximumFractionDigits?: number
}

export function formatMoney(value: number, currency: Currency, options?: FormatOptions): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
  }).format(value)
}

export function formatMoneyCompact(value: number, currency: Currency): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}
