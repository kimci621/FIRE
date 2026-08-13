import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useFireStore } from '../../store/useFireStore'
import { BadgesDialog } from './BadgesDialog'

beforeEach(() => {
  useFireStore.getState().resetAll()
})

describe('BadgesDialog', () => {
  it('lists all milestones with progress', () => {
    render(<BadgesDialog open onOpenChange={() => {}} />)
    // 21 ачивка: лесенка каждые 500k до 10M + финал
    expect(screen.getAllByRole('progressbar')).toHaveLength(21)
    expect(screen.getByText('Первые полмиллиона!')).toBeInTheDocument()
    expect(screen.getByText('ФИНАЛ!')).toBeInTheDocument()
  })

  it('marks unlocked milestone', () => {
    useFireStore.getState().addUnlockedMilestone('m500k')
    render(<BadgesDialog open onOpenChange={() => {}} />)
    expect(screen.getByText('Получено')).toBeInTheDocument()
  })
})
