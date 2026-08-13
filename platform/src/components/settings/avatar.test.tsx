import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useFireStore } from '../../store/useFireStore'
import { SettingsSheet } from './SettingsSheet'
import { ProfileBanner } from '../header/ProfileBanner'

beforeEach(() => {
  useFireStore.getState().resetAll()
})

describe('avatar', () => {
  it('renders upload button and preview', () => {
    render(<SettingsSheet open onOpenChange={() => {}} />)
    expect(screen.getByRole('button', { name: /Загрузить фото/ })).toBeInTheDocument()
  })

  it('renders image avatar in banner when type is image', () => {
    useFireStore.getState().setProfile({ avatar: { type: 'image', value: 'data:image/jpeg;base64,AAAA' } })
    render(<ProfileBanner />)
    const img = screen.getByAltText('Аватар')
    expect(img).toHaveAttribute('src', 'data:image/jpeg;base64,AAAA')
  })
})
