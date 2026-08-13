import { describe, it, expect } from 'vitest'
import { monthlyRate, annuityPV, requiredMonthlyDeposit } from './annuity'

describe('monthlyRate', () => {
  it('converts annual real yield to monthly rate', () => {
    expect(Math.abs(monthlyRate(4) - 0.0032737)).toBeLessThan(0.00001)
  })
  it('returns 0 for 0% yield', () => {
    expect(monthlyRate(0)).toBe(0)
  })
})

describe('annuityPV', () => {
  it('computes present value of monthly income annuity (defaults: 5000/mo, 25y, 4%)', () => {
    const pv = annuityPV(5000, 300, 4)
    expect(pv).toBeCloseTo(954387.4, 1)
  })
  it('handles zero yield as simple sum', () => {
    expect(annuityPV(1000, 12, 0)).toBe(12000)
  })
})

describe('requiredMonthlyDeposit', () => {
  it('computes PMT to grow initial capital to target (264 months, 4%)', () => {
    const pmt = requiredMonthlyDeposit(954387.4, 100000, 264, 4)
    expect(pmt).toBeCloseTo(1714.38, 0)
  })
  it('handles zero yield as linear gap fill', () => {
    expect(requiredMonthlyDeposit(300000, 100000, 24, 0)).toBeCloseTo(8333.33, 1)
  })
  it('returns 0 when target already reached', () => {
    expect(requiredMonthlyDeposit(50000, 100000, 120, 4)).toBe(0)
  })
})
