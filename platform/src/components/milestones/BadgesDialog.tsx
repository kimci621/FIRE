import { useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { buildMilestones } from '@/lib/milestones'
import { formatMoney } from '@/lib/finance/format'
import { useFireData } from '@/hooks/useFireData'
import { useFireStore } from '@/store/useFireStore'
import { selectCurrentBalance, selectTargetCapital } from '@/store/selectors'

export function BadgesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const data = useFireData()
  const unlocked = useFireStore((s) => s.meta.unlockedMilestones)

  const milestones = useMemo(() => buildMilestones(selectTargetCapital(data.profile)), [data.profile])
  const currentBalance = useMemo(() => selectCurrentBalance(data), [data])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-sm overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Зал достижений</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {milestones.map((m) => {
            const done = unlocked.includes(m.key)
            const progress = Math.min(1, currentBalance / m.threshold)
            return (
              <div
                key={m.key}
                className={cn(
                  'rounded-xl border p-3 space-y-2',
                  done ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border bg-muted/30',
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl" aria-hidden>
                    {done ? m.emoji : '🔒'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{m.title}</span>
                      {done && <Badge variant="secondary">Получено</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{m.text}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div
                    role="progressbar"
                    aria-valuenow={Math.round(progress * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className={cn('h-full rounded-full transition-all', done ? 'bg-emerald-500' : 'bg-violet-500')}
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                  </div>
                  <div className="text-xs tabular-nums text-muted-foreground">
                    {formatMoney(currentBalance, data.profile.currency)} / {formatMoney(m.threshold, data.profile.currency)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
