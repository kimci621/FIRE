import { useMemo } from 'react'
import { useFireData } from '@/hooks/useFireData'
import { selectYearGroups } from '@/store/selectors'
import { YearSection } from './YearSection'
import { Hint } from '@/components/ui/hint'

export function Calendar() {
  const data = useFireData()
  const groups = useMemo(() => selectYearGroups(data), [data])
  const currentYear = new Date().getFullYear()

  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-1 px-1 font-semibold">
        План взносов
        <Hint text="План будущих месяцев пересчитывается при изменении параметров; у прошедших сохраняется план, действовавший на тот момент. Факт — сколько реально внесли. Итог месяца — баланс портфеля на его конец." />
      </h2>
      {groups.map((g) => (
        <YearSection key={g.year} group={g} defaultOpen={g.year === currentYear} />
      ))}
    </section>
  )
}
