import { useEffect, useMemo, useRef, useState } from 'react'
import { useFireData } from '@/hooks/useFireData'
import { selectYearGroups } from '@/store/selectors'
import { Hint } from '@/components/ui/hint'
import { monthId } from '@/lib/finance/projection'
import { MonthRow } from './MonthRow'
import { MonthDialog } from './MonthDialog'

export function Calendar() {
  const data = useFireData()
  const groups = useMemo(() => selectYearGroups(data), [data])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const selected = useMemo(() => {
    if (!selectedId) return null
    for (const g of groups) {
      const found = g.entries.find((e) => e.point.id === selectedId)
      if (found) return found
    }
    return null
  }, [selectedId, groups])
  const currentId = monthId(new Date().getFullYear(), new Date().getMonth() + 1)

  // при открытии сайта — активный месяц по центру контейнера
  useEffect(() => {
    const container = containerRef.current
    const row = container?.querySelector<HTMLElement>(`[data-month-id="${currentId}"]`)
    if (container && row) {
      container.scrollTop = row.offsetTop - container.clientHeight / 2 + row.clientHeight / 2
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const items = useMemo(
    () =>
      groups.flatMap((g) => [
        { type: 'header' as const, key: `y-${g.year}`, year: g.year, age: g.age },
        ...g.entries.map((e) => ({ type: 'month' as const, key: e.point.id, point: e.point, entry: e.entry })),
      ]),
    [groups],
  )

  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-1 px-1 font-semibold">
        План взносов
        <Hint text="Тап по кружку — отметить пополнение (с салютом). Тап по строке — раскрыть детали: фактический взнос, план, итог месяца. Раскрытие не сдвигает список. Активный месяц — по центру." />
      </h2>
      <div ref={containerRef} className="no-scrollbar relative h-80 overflow-y-auto rounded-2xl border bg-card p-2">
        {items.map((item) =>
          item.type === 'header' ? (
            <div
              key={item.key}
              className="sticky -top-2 z-10 -mx-2 mb-1 border-b border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground"
            >
              {item.year} — {item.age} лет
            </div>
          ) : (
            <MonthRow
              key={item.key}
              point={item.point}
              entry={item.entry}
              onSelect={() => setSelectedId(item.point.id)}
            />
          ),
        )}
      </div>
      <MonthDialog
        open={selected !== null}
        onOpenChange={(o) => !o && setSelectedId(null)}
        point={selected?.point ?? null}
        entry={selected?.entry}
      />
    </section>
  )
}
