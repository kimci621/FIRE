import { describe, it, expect } from 'vitest'
import { buildMilestones, FIXED_MILESTONES } from './milestones'

describe('buildMilestones', () => {
  it('adds dynamic final milestone with target capital threshold', () => {
    const milestones = buildMilestones(954370)
    expect(milestones).toHaveLength(5)
    const finale = milestones[4]
    expect(finale.key).toBe('final')
    expect(finale.threshold).toBe(954370)
    expect(finale.emoji).toBe('🎓')
  })

  it('fixed milestones have exact thresholds and keys', () => {
    expect(FIXED_MILESTONES.map((m) => m.key)).toEqual(['m500k', 'm1m', 'm5m', 'm10m'])
    expect(FIXED_MILESTONES[1].threshold).toBe(1000000)
  })
})
