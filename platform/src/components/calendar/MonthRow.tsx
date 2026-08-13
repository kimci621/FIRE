import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { formatMoney, formatMoneyCompact } from '@/lib/finance/format'
import { celebrateDeposit } from '@/lib/celebrate'
import type { Currency, MonthEntry, ProjectionPoint } from '@/lib/types'
import { useFireStore } from '@/store/useFireStore'

export const MONTH_NAMES = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

interface MonthRowProps {
  point: ProjectionPoint
  entry: MonthEntry | undefined
  expanded: boolean
  onSelect: (e: React.MouseEvent<HTMLDivElement>) => void
  onClose: () => void
}

export function MonthRow({ point, entry, expanded, onSelect, onClose }: MonthRowProps) {
  const currency = useFireStore((s) => s.profile.currency) as Currency
  const toggleMonthCompleted = useFireStore((s) => s.toggleMonthCompleted)
  const setMonthActual = useFireStore((s) => s.setMonthActual)
  const rowRef = useRef<HTMLDivElement>(null)
  const [panelTop, setPanelTop] = useState(0)

  const done = entry?.isCompleted ?? false
  const skipped = !point.isFuture && !done

  const openPanel = (e: React.MouseEvent<HTMLDivElement>) => {
    if (rowRef.current) setPanelTop(rowRef.current.offsetTop + rowRef.current.offsetHeight)
    onSelect(e)
  }

  return (
    <>
      <div
        ref={rowRef}
        data-month-id={point.id}
        onClick={openPanel}
        className={cn(
          'relative flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-2 py-2 transition-colors',
          expanded ? 'border-primary/60 bg-primary/5' : 'border-transparent hover:bg-muted/40',
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
          <span>{formatMoneyCompact(point.isFuture ? (entry?.plannedDeposit ?? 0) : (entry?.actualDeposit ?? 0), currency)}</span>
          <span className="text-muted-foreground/60">{formatMoneyCompact(point.balance, currency)}</span>
        </div>
      </div>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute left-2 right-2 z-20 space-y-2 rounded-xl border bg-popover p-3 shadow-lg"
          style={{ top: panelTop }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-sm font-medium">
            {MONTH_NAMES[point.month - 1]} {point.year}
            {done ? ' · пополнено ✓' : point.isFuture ? ' · план' : ' · пропущен'}
          </div>
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
          <div className="space-y-1 text-xs tabular-nums text-muted-foreground">
            <div className="flex justify-between">
              <span>План</span>
              <span>{formatMoney(entry?.plannedDeposit ?? 0, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span>Итог портфеля на конец месяца</span>
              <span className="font-medium text-foreground">{formatMoney(point.balance, currency)}</span>
            </div>
          </div>
          <Button size="sm" variant="outline" className="w-full" onClick={onClose}>
            Готово
          </Button>
        </motion.div>
      )}
    </>
  )
}
