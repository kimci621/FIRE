import { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { buildMilestones } from '@/lib/milestones'
import { useFireStore } from '@/store/useFireStore'
import { selectTargetCapital } from '@/store/selectors'
import type { CelebrationState } from '@/hooks/useMilestoneCelebration'

export function AchievementModal({ celebration }: { celebration: CelebrationState }) {
  const profile = useFireStore((s) => s.profile)
  const current = celebration.queue[0]
  const milestone = current ? buildMilestones(selectTargetCapital(profile)).find((m) => m.key === current) : undefined

  useEffect(() => {
    if (current) {
      confetti({ particleCount: 160, spread: 80, origin: { y: 0.7 } })
    }
  }, [current])

  return (
    <Dialog open={!!milestone} onOpenChange={(o) => !o && celebration.shift()}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="items-center gap-2 text-center">
          <div className="text-6xl" aria-hidden>
            {milestone?.emoji}
          </div>
          <DialogTitle className="text-2xl">{milestone?.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-center">
          <p>{milestone?.text}</p>
          <p className="text-muted-foreground">Отличный шаг, {profile.name}!</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
