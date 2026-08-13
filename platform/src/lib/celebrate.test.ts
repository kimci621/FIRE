import { describe, it, expect, vi } from 'vitest'

vi.mock('canvas-confetti', () => ({ default: vi.fn() }))

import confetti from 'canvas-confetti'
import { celebrateDeposit } from './celebrate'

describe('celebrateDeposit', () => {
  it('fires small confetti burst at origin', () => {
    celebrateDeposit(0.5, 0.6)
    expect(confetti).toHaveBeenCalledWith(expect.objectContaining({ particleCount: 40, origin: { x: 0.5, y: 0.6 } }))
  })
})
