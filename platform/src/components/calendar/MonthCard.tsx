import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { formatMoney, formatMoneyCompact } from '@/lib/finance/format'
import type { Currency, MonthEntry, ProjectionPoint } from '@/lib/types'

export const MONTH_NAMES = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

interface MonthCardProps {
  point: ProjectionPoint
  entry: MonthEntry | undefined
  currency: Currency
  onToggle: () => void
  onActual: (value: number) => void
}

export function MonthCard({ point, entry, currency, onToggle, onActual }: MonthCardProps) {
  const done = entry?.isCompleted ?? false
  const skipped = !point.isFuture && !done
  const tone = done ? 'border-emerald-500/40 bg-emerald-500/5' : skipped ? 'border-rose-500/30 bg-rose-500/5' : 'border-border bg-muted/30'

  return (
    <motion.div layout transition={{ duration: 0.2 }} className={cn('rounded-xl border p-3 space-y-2', tone)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            aria-label={done ? 'Снять отметку' : 'Отметил пополнение'}
            onClick={onToggle}
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors',
              done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-muted-foreground/40 text-transparent',
            )}
          >
            <Check className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">
            {MONTH_NAMES[point.month - 1]} {point.year}
          </span>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">{formatMoneyCompact(point.balance, currency)}</span>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">{point.isFuture ? 'План' : 'Факт'}</label>
        {point.isFuture ? (
          <div className="text-sm tabular-nums">{formatMoney(entry?.plannedDeposit ?? 0, currency)}</div>
        ) : (
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            value={entry?.actualDeposit || ''}
            placeholder="0"
            onChange={(e) => onActual(Number(e.target.value))}
            className="h-9"
            aria-label={`Взнос за ${MONTH_NAMES[point.month - 1]} ${point.year}`}
          />
        )}
      </div>
    </motion.div>
  )
}
