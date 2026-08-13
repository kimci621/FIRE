import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoneyCompact } from '@/lib/finance/format'
import { celebrateDeposit } from '@/lib/celebrate'
import type { Currency, MonthEntry, ProjectionPoint } from '@/lib/types'
import { useFireStore } from '@/store/useFireStore'

export const MONTH_NAMES = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

interface MonthRowProps {
  point: ProjectionPoint
  entry: MonthEntry | undefined
  onSelect: () => void
}

export function MonthRow({ point, entry, onSelect }: MonthRowProps) {
  const currency = useFireStore((s) => s.profile.currency) as Currency
  const toggleMonthCompleted = useFireStore((s) => s.toggleMonthCompleted)

  const done = entry?.isCompleted ?? false
  const skipped = !point.isFuture && !done

  return (
    <div
      data-month-id={point.id}
      onClick={onSelect}
      className={cn(
        'relative flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-2 py-2 transition-colors',
        'border-transparent hover:bg-muted/40',
        done && 'border-emerald-500/30',
        skipped && 'border-rose-500/20',
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          aria-label={done ? 'Снять отметку' : 'Отметил пополнение'}
          onClick={(e) => {
            e.stopPropagation()
            const completing = !done
            toggleMonthCompleted(point.id)
            if (completing) celebrateDeposit(e.clientX / window.innerWidth, e.clientY / window.innerHeight)
          }}
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors',
            done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-muted-foreground/40 text-transparent',
          )}
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <span className="truncate text-sm font-medium">
          {MONTH_NAMES[point.month - 1]} {point.year}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs tabular-nums text-muted-foreground">
        <span>
          {formatMoneyCompact(
            point.isFuture ? (entry?.customDeposit ?? entry?.plannedDeposit ?? 0) : (entry?.actualDeposit ?? 0),
            currency,
          )}
        </span>
        <span className="text-muted-foreground/60">{formatMoneyCompact(point.balance, currency)}</span>
      </div>
    </div>
  )
}
