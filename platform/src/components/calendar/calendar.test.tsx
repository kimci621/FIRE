import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useFireStore } from '../../store/useFireStore'
import { Calendar } from './Calendar'
import { MONTH_NAMES, MonthRow } from './MonthRow'
import { MonthDialog } from './MonthDialog'
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

  it('opens month dialog on row click', () => {
    render(<Calendar />)
    const now = new Date()
    const id = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    fireEvent.click(document.querySelector(`[data-month-id="${id}"]`)!)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Отметил пополнение' })).toBeInTheDocument()
  })
})

describe('MonthRow', () => {
  it('toggles month via circle button', () => {
    useFireStore.getState().setMonthActual('2026-01', 0)
    useFireStore.getState().toggleMonthCompleted('2026-01')
    expect(useFireStore.getState().months.find((m) => m.id === '2026-01')?.isCompleted).toBe(true)
    render(<MonthRow point={point} entry={entry} onSelect={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Снять отметку' }))
    expect(useFireStore.getState().months.find((m) => m.id === '2026-01')?.isCompleted).toBe(false)
  })

  it('calls onSelect on row click', () => {
    const onSelect = vi.fn()
    render(<MonthRow point={point} entry={entry} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('Янв 2026'))
    expect(onSelect).toHaveBeenCalled()
  })
})

describe('MonthDialog', () => {
  it('shows actual input for past month and plan rows', () => {
    render(<MonthDialog open onOpenChange={vi.fn()} point={point} entry={entry} />)
    expect(screen.getByLabelText('Фактический взнос')).toBeInTheDocument()
    expect(screen.getByText('Итог портфеля на конец месяца')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Готово' })).toBeInTheDocument()
  })

  it('shows custom deposit input for future month', () => {
    const futurePoint: ProjectionPoint = { ...point, id: '2027-01', year: 2027, month: 1, isFuture: true }
    const futureEntry: MonthEntry = { ...entry, id: '2027-01', year: 2027, month: 1, isCompleted: false, actualDeposit: 0 }
    render(<MonthDialog open onOpenChange={vi.fn()} point={futurePoint} entry={futureEntry} />)
    const input = screen.getByLabelText('Свой взнос на этот месяц (пусто = по плану)')
    fireEvent.input(input, { target: { value: '50000' } })
    expect(useFireStore.getState().months.find((m) => m.id === '2027-01')?.customDeposit).toBe(50000)
  })

  it('clears custom deposit back to plan', () => {
    useFireStore.getState().setMonthCustom('2027-01', 50000)
    const storeEntry = useFireStore.getState().months.find((m) => m.id === '2027-01')
    const futurePoint: ProjectionPoint = { ...point, id: '2027-01', year: 2027, month: 1, isFuture: true }
    render(<MonthDialog open onOpenChange={vi.fn()} point={futurePoint} entry={storeEntry} />)
    const input = screen.getByLabelText('Свой взнос на этот месяц (пусто = по плану)') as HTMLInputElement
    expect(input.value).toBe('50000')
    fireEvent.input(input, { target: { value: '' } })
    expect(useFireStore.getState().months.find((m) => m.id === '2027-01')?.customDeposit).toBeUndefined()
  })
})

describe('MONTH_NAMES', () => {
  it('has 12 months', () => {
    expect(MONTH_NAMES).toHaveLength(12)
  })
})
