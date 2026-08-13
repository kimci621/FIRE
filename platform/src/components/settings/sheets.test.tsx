import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useFireStore } from '../../store/useFireStore'
import { SettingsSheet } from './SettingsSheet'
import { DataSheet } from '../data/DataSheet'

beforeEach(() => {
  useFireStore.getState().resetAll()
})

describe('SettingsSheet', () => {
  it('renders all parameter fields', () => {
    render(<SettingsSheet open onOpenChange={() => {}} />)
    expect(screen.getByLabelText('Имя')).toBeInTheDocument()
    expect(screen.getByLabelText('Текущий возраст')).toBeInTheDocument()
    expect(screen.getByLabelText('Целевой возраст')).toBeInTheDocument()
    expect(screen.getByLabelText('Догонялки, мес')).toBeInTheDocument()
    expect(screen.getByText('Реальная доходность')).toBeInTheDocument()
  })

  it('blocks invalid target age', () => {
    render(<SettingsSheet open onOpenChange={() => {}} />)
    fireEvent.change(screen.getByLabelText('Целевой возраст'), { target: { value: '20' } })
    expect(screen.getByText(/должен быть больше/)).toBeInTheDocument()
  })

  it('switches currency', () => {
    render(<SettingsSheet open onOpenChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'RUB' }))
    expect(useFireStore.getState().profile.currency).toBe('RUB')
  })
})

describe('DataSheet', () => {
  it('renders sync status and action buttons', () => {
    render(<DataSheet open onOpenChange={() => {}} />)
    expect(screen.getByText('Offline Mode')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Экспорт JSON/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Импорт JSON/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Сбросить/ })).toBeInTheDocument()
  })
})
