import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useFireStore } from '../../store/useFireStore'
import { PortfolioChart } from './PortfolioChart'

beforeEach(() => {
  useFireStore.getState().resetAll()
})

describe('PortfolioChart', () => {
  it('renders toggle and legend', () => {
    render(<PortfolioChart />)
    expect(screen.getByRole('button', { name: 'Сегодняшние деньги' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Номинальные' })).toBeInTheDocument()
    expect(screen.getByText('Вклады')).toBeInTheDocument()
    expect(screen.getByText('Сложный процент')).toBeInTheDocument()
  })

  it('switches mode on toggle click', () => {
    render(<PortfolioChart />)
    fireEvent.click(screen.getByRole('button', { name: 'Номинальные' }))
    expect(screen.getByRole('button', { name: 'Номинальные' })).toHaveClass('bg-primary')
  })
})
