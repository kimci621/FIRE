import { describe, it, expect } from 'vitest'
import { formatMoney, formatMoneyCompact } from './format'

describe('formatMoney', () => {
  it('formats USD with ru-RU locale', () => {
    const f = formatMoney(954370, 'USD')
    expect(f).toContain('954')
    expect(f).toContain('370')
    expect(f).toContain('$')
  })
  it('formats RUB with ruble sign', () => {
    expect(formatMoney(1200, 'RUB')).toContain('₽')
  })
  it('formats EUR with euro sign', () => {
    expect(formatMoney(500, 'EUR')).toContain('€')
  })
  it('respects fraction digits option', () => {
    expect(formatMoney(1.5, 'USD', { maximumFractionDigits: 1 })).toContain('1,5')
  })
})

describe('formatMoneyCompact', () => {
  it('compacts large numbers', () => {
    expect(formatMoneyCompact(954370, 'USD')).toContain('954')
  })
})
