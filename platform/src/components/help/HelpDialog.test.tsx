import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HelpDialog } from './HelpDialog'

describe('HelpDialog', () => {
  it('lists all feature sections', () => {
    render(<HelpDialog open onOpenChange={() => {}} />)
    expect(screen.getByText('Как пользоваться приложением')).toBeInTheDocument()
    expect(screen.getByText('Идея')).toBeInTheDocument()
    expect(screen.getByText('Календарь взносов')).toBeInTheDocument()
    expect(screen.getByText('Данные и синк')).toBeInTheDocument()
  })
})
