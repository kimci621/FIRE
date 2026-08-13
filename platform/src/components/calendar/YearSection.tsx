import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoneyCompact } from '@/lib/finance/format'
import type { YearGroup } from '@/store/selectors'
import { useFireStore } from '@/store/useFireStore'
import { MonthCard } from './MonthCard'

export function YearSection({ group, defaultOpen }: { group: YearGroup; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const currency = useFireStore((s) => s.profile.currency)
  const toggleMonthCompleted = useFireStore((s) => s.toggleMonthCompleted)
  const setMonthActual = useFireStore((s) => s.setMonthActual)

  return (
    <div className="rounded-xl border bg-card">
      <button className="flex w-full items-center justify-between gap-2 p-3 text-left" onClick={() => setOpen((o) => !o)}>
        <span className="font-medium">
          {group.year} — {group.age} лет
        </span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {formatMoneyCompact(group.plannedTotal, currency)} план · {formatMoneyCompact(group.actualTotal, currency)} факт
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 gap-2 p-3 pt-0 md:grid-cols-2">
              {group.entries.map(({ point, entry }) => (
                <MonthCard
                  key={point.id}
                  point={point}
                  entry={entry}
                  currency={currency}
                  onToggle={() => toggleMonthCompleted(point.id)}
                  onActual={(v) => setMonthActual(point.id, v)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
