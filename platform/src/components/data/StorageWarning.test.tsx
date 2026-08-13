import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useFireStore } from '../../store/useFireStore'
import { STORAGE_KEY } from '../../lib/storage/adapter'
import { StorageWarning } from './StorageWarning'

beforeEach(() => {
  window.localStorage.clear()
  useFireStore.getState().resetAll()
})

describe('StorageWarning', () => {
  it('shows warning when storage is corrupted', () => {
    window.localStorage.setItem(STORAGE_KEY, '{oops')
    render(<StorageWarning />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('clears corruption and resets on click', () => {
    window.localStorage.setItem(STORAGE_KEY, '{oops')
    render(<StorageWarning />)
    fireEvent.click(screen.getByRole('button', { name: /Сбросить данные/ }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    // persist перезапишет ключ валидным JSON после resetAll
    expect(() => JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).not.toThrow()
  })
})
