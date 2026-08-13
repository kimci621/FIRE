import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useFireStore } from '../../store/useFireStore'
import { ProfileBanner } from './ProfileBanner'

beforeEach(() => {
  useFireStore.getState().resetAll()
})

describe('streak in banner', () => {
  it('renders streak counter', () => {
    render(<ProfileBanner />)
    expect(screen.getByText(/мес. подряд/)).toBeInTheDocument()
  })
})
