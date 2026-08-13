import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ProjectionPoint, MonthEntry } from '../../lib/types'
import { MonthCard } from './MonthCard'

const point: ProjectionPoint = {
  id: '2026-01',
  year: 2026,
  month: 1,
  age: 28,
  balance: 105000,
  contributions: 5000,
  interest: 0,
  isFuture: false,
}

const entry: MonthEntry = {
  id: '2026-01',
  year: 2026,
  month: 1,
  age: 28,
  plannedDeposit: 1000,
  actualDeposit: 1000,
  isCompleted: true,
}

describe('MonthCard', () => {
  it('renders completed state with check', () => {
    render(<MonthCard point={point} entry={entry} onToggle={vi.fn()} onActual={vi.fn()} currency="USD" />)
    expect(screen.getByText('Янв 2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Снять отметку' })).toBeInTheDocument()
  })

  it('calls onToggle on click and onActual on input change', () => {
    const onToggle = vi.fn()
    const onActual = vi.fn()
    render(<MonthCard point={point} entry={entry} onToggle={onToggle} onActual={onActual} currency="USD" />)
    fireEvent.click(screen.getByRole('button', { name: 'Снять отметку' }))
    expect(onToggle).toHaveBeenCalled()
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '1500' } })
    expect(onActual).toHaveBeenCalledWith(1500)
  })
})
