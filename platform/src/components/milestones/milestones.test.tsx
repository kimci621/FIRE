import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useFireStore } from '../../store/useFireStore'
import { useMilestoneCelebration } from '../../hooks/useMilestoneCelebration'
import { AchievementModal } from './AchievementModal'
import { monthId } from '../../lib/finance/projection'

vi.mock('canvas-confetti', () => ({ default: vi.fn() }))

function Probe() {
  const celebration = useMilestoneCelebration()
  return <AchievementModal celebration={celebration} />
}

beforeEach(() => {
  useFireStore.getState().resetAll()
})

describe('milestone celebration', () => {
  it('unlocks and shows modal when balance crosses threshold', () => {
    // Взнос, пробивающий 500k с дефолтными параметрами
    const currentId = monthId(new Date().getFullYear(), new Date().getMonth() + 1)
    useFireStore.getState().setMonthActual(currentId, 500000)
    useFireStore.getState().toggleMonthCompleted(currentId)
    render(<Probe />)
    expect(useFireStore.getState().meta.unlockedMilestones).toContain('m500k')
    expect(screen.getByText('Первые полмиллиона!')).toBeInTheDocument()
  })

  it('does not re-trigger already unlocked milestone', () => {
    useFireStore.getState().addUnlockedMilestone('m500k')
    render(<Probe />)
    expect(screen.queryByText('Первые полмиллиона!')).not.toBeInTheDocument()
  })
})
