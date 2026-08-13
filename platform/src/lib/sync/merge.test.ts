import { describe, it, expect } from 'vitest'
import type { FireData, MonthEntry } from '../types'
import { DEFAULT_PROFILE, DEFAULT_META } from '../types'
import { mergePull, diffPush, type RemoteRow } from './merge'

const T0 = '2026-08-01T00:00:00.000Z'
const T1 = '2026-08-02T00:00:00.000Z'
const T2 = '2026-08-03T00:00:00.000Z'

function month(id: string, actual: number): MonthEntry {
  const [year, month] = id.split('-').map(Number)
  return { id, year, month, age: 28, plannedDeposit: 1714, actualDeposit: actual, isCompleted: true }
}

function localData(): FireData {
  return {
    profile: { ...DEFAULT_PROFILE, name: 'Локальный' },
    months: [month('2026-01', 500)],
    meta: {
      unlockedMilestones: [],
      lastModified: { profile: T1, months: { '2026-01': T1 } },
    },
  }
}

describe('mergePull', () => {
  it('applies remote rows newer than local', () => {
    const local = localData()
    const remoteProfile: RemoteRow = { id: null, data: { ...DEFAULT_PROFILE, name: 'Облако' }, updatedAt: T2 }
    const remoteMonths: RemoteRow[] = [{ id: '2026-01', data: month('2026-01', 999), updatedAt: T2 }]
    const result = mergePull(local, remoteProfile, remoteMonths)
    expect(result.data.profile.name).toBe('Облако')
    expect(result.data.months.find((m) => m.id === '2026-01')?.actualDeposit).toBe(999)
    expect(result.pulled).toBe(2)
  })

  it('keeps local when local is newer', () => {
    const local = localData()
    const remoteProfile: RemoteRow = { id: null, data: { ...DEFAULT_PROFILE, name: 'Облако' }, updatedAt: T0 }
    const result = mergePull(local, remoteProfile, [])
    expect(result.data.profile.name).toBe('Локальный')
    expect(result.pulled).toBe(0)
  })

  it('applies remote when no local timestamp', () => {
    const local: FireData = { profile: DEFAULT_PROFILE, months: [], meta: DEFAULT_META }
    const remoteProfile: RemoteRow = { id: null, data: { ...DEFAULT_PROFILE, name: 'Облако' }, updatedAt: T2 }
    const result = mergePull(local, remoteProfile, [])
    expect(result.data.profile.name).toBe('Облако')
    expect(result.pulled).toBe(1)
  })

  it('ignores remote month rows not present locally (adds them)', () => {
    const local = localData()
    const remoteMonths: RemoteRow[] = [{ id: '2026-02', data: month('2026-02', 300), updatedAt: T2 }]
    const result = mergePull(local, null, remoteMonths)
    expect(result.data.months.find((m) => m.id === '2026-02')?.actualDeposit).toBe(300)
  })
})

describe('diffPush', () => {
  it('pushes rows where local is newer than remote', () => {
    const local = localData()
    const remoteProfile: RemoteRow = { id: null, data: { ...DEFAULT_PROFILE, name: 'Облако' }, updatedAt: T0 }
    const remoteMonths: RemoteRow[] = [{ id: '2026-01', data: month('2026-01', 1), updatedAt: T0 }]
    const diff = diffPush(local, remoteProfile, remoteMonths)
    expect(diff.profile?.name).toBe('Локальный')
    expect(diff.months).toHaveLength(1)
    expect(diff.months[0].actualDeposit).toBe(500)
  })

  it('pushes nothing when remote is newer or equal', () => {
    const local = localData()
    const remoteProfile: RemoteRow = { id: null, data: { ...DEFAULT_PROFILE, name: 'Облако' }, updatedAt: T2 }
    const remoteMonths: RemoteRow[] = [{ id: '2026-01', data: month('2026-01', 1), updatedAt: T2 }]
    const diff = diffPush(local, remoteProfile, remoteMonths)
    expect(diff.profile).toBeUndefined()
    expect(diff.months).toHaveLength(0)
  })

  it('pushes profile when no remote row exists', () => {
    const local = localData()
    const diff = diffPush(local, null, [])
    expect(diff.profile?.name).toBe('Локальный')
  })
})
