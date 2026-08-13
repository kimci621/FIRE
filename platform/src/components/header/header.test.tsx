import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useFireStore } from '../../store/useFireStore'
import type { FireData } from '../../lib/types'
import { DEFAULT_PROFILE } from '../../lib/types'
import { monthId } from '../../lib/finance/projection'
import { ProfileBanner } from './ProfileBanner'
import { CatchUpBanner } from './CatchUpBanner'

const data: FireData = {
  profile: DEFAULT_PROFILE,
  months: [
    { id: monthId(2026, 1), year: 2026, month: 1, age: 28, plannedDeposit: 1714, actualDeposit: 0, isCompleted: false },
  ],
  meta: { unlockedMilestones: [] },
}

beforeEach(() => {
  useFireStore.getState().importData(data)
})

describe('ProfileBanner', () => {
  it('renders name, target capital and yield presets', () => {
    render(<ProfileBanner />)
    expect(screen.getByText('Амир')).toBeInTheDocument()
    expect(screen.getByText('К целевому возрасту')).toBeInTheDocument()
    expect(screen.getByText('Накоплено сейчас')).toBeInTheDocument()
    expect(screen.getByText(/пути/)).toBeInTheDocument()
    expect(screen.getByText(/Изъятие после 50 лет/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2%' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '4%' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '6%' })).toBeInTheDocument()
  })
})

describe('CatchUpBanner', () => {
  it('shows banner when behind plan', () => {
    render(<CatchUpBanner />)
    expect(screen.getByText(/увеличивайте взносы/)).toBeInTheDocument()
  })
})
