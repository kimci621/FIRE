import { useMemo } from 'react'
import { useFireData } from '@/hooks/useFireData'
import { selectYearGroups } from '@/store/selectors'
import { YearSection } from './YearSection'

export function Calendar() {
  const data = useFireData()
  const groups = useMemo(() => selectYearGroups(data), [data])
  const currentYear = new Date().getFullYear()

  return (
    <section className="space-y-2">
      <h2 className="px-1 font-semibold">План взносов</h2>
      {groups.map((g) => (
        <YearSection key={g.year} group={g} defaultOpen={g.year === currentYear} />
      ))}
    </section>
  )
}
