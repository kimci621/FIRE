import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useFireStore } from '../../store/useFireStore'
import { SettingsSheet } from './SettingsSheet'

beforeEach(() => {
  useFireStore.getState().resetAll()
})

describe('reminders settings', () => {
  it('toggles remindersEnabled in meta', () => {
    render(<SettingsSheet open onOpenChange={() => {}} />)
    const button = screen.getByRole('button', { name: /Напоминания о взносе/ })
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    expect(useFireStore.getState().meta.remindersEnabled).toBe(false)
    fireEvent.click(button)
    expect(useFireStore.getState().meta.remindersEnabled).toBe(true)
  })

  it('changes remind day', () => {
    render(<SettingsSheet open onOpenChange={() => {}} />)
    fireEvent.change(screen.getByLabelText('Напоминать с дня'), { target: { value: '25' } })
    expect(useFireStore.getState().meta.remindDay).toBe(25)
  })
})
