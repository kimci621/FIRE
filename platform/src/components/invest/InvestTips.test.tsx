import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useFireStore } from '../../store/useFireStore'
import { InvestTips } from './InvestTips'

beforeEach(() => {
  useFireStore.getState().resetAll()
})

describe('InvestTips', () => {
  it('is collapsed by default and expands on click', () => {
    render(<InvestTips />)
    expect(screen.getByText(/как её получить/)).toBeInTheDocument()
    expect(screen.queryByText('Диверсифицируйте широко')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText(/как её получить/))
    expect(screen.getByText('Диверсифицируйте широко')).toBeInTheDocument()
    expect(screen.getByText('Не усложняйте')).toBeInTheDocument()
    expect(screen.getAllByText(/Источник:/).length).toBeGreaterThanOrEqual(5)
    expect(screen.getByText(/не является индивидуальной инвестиционной рекомендацией/i)).toBeInTheDocument()
  })
})
