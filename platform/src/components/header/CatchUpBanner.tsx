import { useMemo } from 'react'
import { formatMoney } from '@/lib/finance/format'
import { useFireData } from '@/hooks/useFireData'
import { selectCatchUp, selectRequiredDeposit } from '@/store/selectors'

export function CatchUpBanner() {
  const data = useFireData()
  const { profile } = data
  const catchUp = useMemo(() => selectCatchUp(data), [data])
  if (!catchUp) return null
  const required = selectRequiredDeposit(profile)
  const extreme = catchUp.extraPerMonth > required * 3

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm space-y-1">
      <p>
        Чтобы восстановить график к {profile.targetAge} годам, увеличивайте взносы на{' '}
        <span className="font-semibold">+{formatMoney(catchUp.extraPerMonth, profile.currency)}/мес</span> в течение
        следующих {catchUp.months} месяцев.
      </p>
      {extreme && <p className="text-muted-foreground">…или сдвиньте целевой возраст в настройках.</p>}
    </div>
  )
}
