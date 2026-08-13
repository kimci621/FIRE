import { Check } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/finance/format'
import { celebrateDeposit } from '@/lib/celebrate'
import type { Currency, MonthEntry, ProjectionPoint } from '@/lib/types'
import { useFireStore } from '@/store/useFireStore'
import { MONTH_NAMES } from './MonthRow'

interface MonthDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  point: ProjectionPoint | null
  entry: MonthEntry | undefined
}

export function MonthDialog({ open, onOpenChange, point, entry }: MonthDialogProps) {
  const currency = useFireStore((s) => s.profile.currency) as Currency
  const toggleMonthCompleted = useFireStore((s) => s.toggleMonthCompleted)
  const setMonthActual = useFireStore((s) => s.setMonthActual)
  const setMonthCustom = useFireStore((s) => s.setMonthCustom)

  if (!point) return null
  const done = entry?.isCompleted ?? false

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {MONTH_NAMES[point.month - 1]} {point.year}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {done ? 'пополнено ✓' : point.isFuture ? 'по плану' : 'пропущен'}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Button
            className={cn('w-full', done && 'bg-emerald-600 text-white hover:bg-emerald-700')}
            variant={done ? 'default' : 'outline'}
            onClick={() => {
              const completing = !done
              toggleMonthCompleted(point.id)
              if (completing) celebrateDeposit(0.5, 0.55)
            }}
          >
            {done && <Check className="mr-2 h-4 w-4" />}
            {done ? 'Снять отметку' : 'Отметил пополнение'}
          </Button>

          {!point.isFuture && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground" htmlFor={`actual-${point.id}`}>
                Фактический взнос
              </label>
              <Input
                id={`actual-${point.id}`}
                type="number"
                inputMode="decimal"
                min={0}
                value={entry?.actualDeposit || ''}
                placeholder="0"
                onChange={(e) => setMonthActual(point.id, Number(e.target.value))}
                className="h-9"
              />
            </div>
          )}

          {point.isFuture && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground" htmlFor={`custom-${point.id}`}>
                Свой взнос на этот месяц (пусто = по плану)
              </label>
              <Input
                id={`custom-${point.id}`}
                type="number"
                inputMode="decimal"
                min={0}
                value={entry?.customDeposit ?? ''}
                placeholder={formatMoney(entry?.plannedDeposit ?? 0, currency)}
                onChange={(e) => {
                  const v = e.target.value
                  setMonthCustom(point.id, v === '' ? undefined : Number(v))
                }}
                className="h-9"
              />
            </div>
          )}

          <div className="space-y-1 text-xs tabular-nums text-muted-foreground">
            <div className="flex justify-between">
              <span>{point.isFuture ? 'Взнос в прогнозе' : 'План'}</span>
              <span>
                {formatMoney(
                  point.isFuture ? (entry?.customDeposit ?? entry?.plannedDeposit ?? 0) : (entry?.plannedDeposit ?? 0),
                  currency,
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Итог портфеля на конец месяца</span>
              <span className="font-medium text-foreground">{formatMoney(point.balance, currency)}</span>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Готово
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
