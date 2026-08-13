import { useEffect, useMemo, useState } from 'react'
import { buildMilestones } from '@/lib/milestones'
import { useFireStore } from '@/store/useFireStore'
import { selectCurrentBalance, selectTargetCapital } from '@/store/selectors'
import { useFireData } from './useFireData'

export interface CelebrationState {
  queue: string[]
  shift: () => void
}

export function useMilestoneCelebration(): CelebrationState {
  const data = useFireData()
  const currentBalance = useMemo(() => selectCurrentBalance(data), [data])
  const unlocked = useFireStore((s) => s.meta.unlockedMilestones)
  const addUnlockedMilestone = useFireStore((s) => s.addUnlockedMilestone)
  const [queue, setQueue] = useState<string[]>([])

  const milestones = useMemo(() => buildMilestones(selectTargetCapital(data.profile)), [data.profile])

  useEffect(() => {
    const crossed = milestones.filter((m) => currentBalance >= m.threshold && !unlocked.includes(m.key)).map((m) => m.key)
    if (crossed.length === 0) return
    crossed.forEach((key) => addUnlockedMilestone(key))
    setQueue((q) => [...q, ...crossed])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBalance, unlocked, milestones])

  return { queue, shift: () => setQueue((q) => q.slice(1)) }
}
