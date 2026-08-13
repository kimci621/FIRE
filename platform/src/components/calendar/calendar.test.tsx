import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useFireStore } from '../../store/useFireStore'
import { Calendar } from './Calendar'
import { MONTH_NAMES, MonthRow } from './MonthRow'
import type { ProjectionPoint, MonthEntry } from '../../lib/types'

vi.mock('canvas-confetti', () => ({ default: vi.fn() }))

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
  plannedDeposit: 1714,
  actualDeposit: 1714,
  isCompleted: true,
}

beforeEach(() => {
  useFireStore.getState().resetAll()
})

describe('Calendar', () => {
  it('renders scroll container with month rows and year headers', () => {
    render(<Calendar />)
    const currentYear = new Date().getFullYear()
    const headers = screen.getAllByText(/лет/)
    expect(headers.length).toBeGreaterThan(0)
    expect(headers[0].textContent).toContain(String(currentYear))
    expect(document.querySelector('.no-scrollbar')).not.toBeNull()
  })

  it('marks current month with data attribute for centering', () => {
    render(<Calendar />)
    const now = new Date()
    const id = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    expect(document.querySelector(`[data-month-id="${id}"]`)).not.toBeNull()
  })
})

describe('MonthRow', () => {
  it('expands panel with actual input without shifting list', () => {
    render(<MonthRow point={point} entry={entry} expanded onSelect={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByLabelText('Фактический взнос')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Готово' })).toBeInTheDocument()
    expect(screen.getByText('Итог портфеля на конец месяца')).toBeInTheDocument()
  })

  it('toggles month via circle button', () => {
    useFireStore.getState().setMonthActual('2026-01', 0)
    useFireStore.getState().toggleMonthCompleted('2026-01')
    expect(useFireStore.getState().months.find((m) => m.id === '2026-01')?.isCompleted).toBe(true)
    render(<MonthRow point={point} entry={entry} expanded={false} onSelect={vi.fn()} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Снять отметку' }))
    expect(useFireStore.getState().months.find((m) => m.id === '2026-01')?.isCompleted).toBe(false)
  })
})

describe('MonthRow custom deposit', () => {
  const futurePoint: ProjectionPoint = { ...point, id: '2027-01', year: 2027, month: 1, isFuture: true }
  const futureEntry: MonthEntry = { ...entry, id: '2027-01', year: 2027, month: 1, isCompleted: false, actualDeposit: 0 }

  it('shows custom deposit input for future months', () => {
    render(<MonthRow point={futurePoint} entry={futureEntry} expanded onSelect={vi.fn()} onClose={vi.fn()} />)
    const input = screen.getByLabelText('Свой взнос на этот месяц (пусто = по плану)')
    fireEvent.input(input, { target: { value: '50000' } })
    expect(useFireStore.getState().months.find((m) => m.id === '2027-01')?.customDeposit).toBe(50000)
    fireEvent.input(input, { target: { value: '0' } })
    expect(useFireStore.getState().months.find((m) => m.id === '2027-01')?.customDeposit).toBe(0)
    fireEvent.input(input, { target: { value: '' } })
    expect(useFireStore.getState().months.find((m) => m.id === '2027-01')?.customDeposit).toBeUndefined()
  })
})

describe('MONTH_NAMES', () => {
  it('has 12 months', () => {
    expect(MONTH_NAMES).toHaveLength(12)
  })
})
