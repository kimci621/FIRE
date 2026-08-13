import { describe, it, expect } from 'vitest'
import { buildMilestones } from './milestones'

describe('buildMilestones', () => {
  it('builds ladder every 500k up to 10M plus final milestone', () => {
    const milestones = buildMilestones(954370)
    expect(milestones).toHaveLength(21) // 20 ступеней + финал
    expect(milestones[0].threshold).toBe(500000)
    expect(milestones[19].threshold).toBe(10000000)
    const finale = milestones[20]
    expect(finale.key).toBe('final')
    expect(finale.threshold).toBe(954370)
    expect(finale.emoji).toBe('🎓')
  })

  it('keeps legacy keys and special texts for headline milestones', () => {
    const byKey = new Map(buildMilestones(2000000).map((m) => [m.key, m]))
    expect(byKey.get('m500k')?.title).toBe('Первые полмиллиона!')
    expect(byKey.get('m1m')?.text).toContain('топ 10%')
    expect(byKey.get('m5m')?.emoji).toBe('⚡')
    expect(byKey.get('m10m')?.emoji).toBe('🏰')
    expect(byKey.get('m1m5')?.title).toMatch(/1\s500\s000/)
  })
})
