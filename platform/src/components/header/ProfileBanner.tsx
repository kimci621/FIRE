import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { formatMoney } from '@/lib/finance/format'
import { useFireStore } from '@/store/useFireStore'
import { useFireData } from '@/hooks/useFireData'
import { selectCurrentBalance, selectRequiredDeposit, selectTargetCapital } from '@/store/selectors'
import { selectStreak } from '@/lib/streak'
import { AnimatedMoney } from './AnimatedMoney'

const PRESETS = [2, 4, 6]

export function ProfileBanner() {
  const profile = useFireStore((s) => s.profile)
  const setProfile = useFireStore((s) => s.setProfile)
  const data = useFireData()
  const targetCapital = selectTargetCapital(profile)
  const required = selectRequiredDeposit(profile)
  const streak = useMemo(() => selectStreak(data.months), [data.months])
  const currentBalance = useMemo(() => selectCurrentBalance(data), [data])
  const progressPct = targetCapital > 0 ? Math.round((currentBalance / targetCapital) * 100) : 0
  const barPct = Math.min(100, progressPct)
  const remaining = Math.max(0, targetCapital - currentBalance)

  return (
    <section className="rounded-2xl border bg-card p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-2xl">
          {profile.avatar.type === 'image' ? (
            <img src={profile.avatar.value} alt="Аватар" className="h-full w-full object-cover" />
          ) : (
            profile.avatar.value
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold">{profile.name}</div>
          <div className="text-sm text-muted-foreground">
            Путь к {profile.targetAge} годам · {profile.currency}
          </div>
          <div className="text-sm text-muted-foreground">🔥 {streak} мес. подряд</div>
        </div>
      </div>
      <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-violet-500/10 p-4 space-y-3">
        <div>
          <div className="text-sm text-muted-foreground">Накоплено сейчас</div>
          <AnimatedMoney
            value={formatMoney(currentBalance, profile.currency)}
            className="text-2xl font-semibold tabular-nums tracking-tight"
          />
        </div>
        <div>
          <div className="text-sm text-muted-foreground">
            К целевому возрасту{' '}
            <span className="text-muted-foreground/70 tabular-nums">· {progressPct}% пути</span>
          </div>
        <AnimatedMoney
          value={formatMoney(targetCapital, profile.currency)}
          className="text-3xl font-bold tabular-nums tracking-tight"
        />
        </div>
        <div className="text-sm text-muted-foreground">
          Базовый взнос:{' '}
          <span className="font-medium text-foreground">{formatMoney(required, profile.currency)}/мес</span>
        </div>
        <div className="space-y-1.5">
          <div
            role="progressbar"
            aria-label="Прогресс к цели"
            aria-valuenow={barPct}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-violet-500 transition-all duration-500"
              style={{ width: `${barPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
            <span>Накоплено {formatMoney(currentBalance, profile.currency)}</span>
            <span>Осталось {formatMoney(remaining, profile.currency)}</span>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Изъятие после {profile.targetAge} лет:{' '}
          <span className="font-medium text-foreground">{formatMoney(profile.targetMonthlyIncome, profile.currency)}/мес</span>{' '}
          · {profile.retirementYears} лет выплат
        </div>
        <p className="text-xs text-muted-foreground/80">
          Капитал продолжает инвестироваться под {profile.expectedRealYieldPct.toFixed(1)}% реальной доходности и
          иссякает ровно к концу срока. Всё считается в сегодняшних деньгах — инфляция уже учтена.
        </p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Реальная доходность</span>
          <span className="font-medium tabular-nums">{profile.expectedRealYieldPct.toFixed(1)}%</span>
        </div>
        <Slider
          min={1}
          max={10}
          step={0.5}
          value={[profile.expectedRealYieldPct]}
          onValueChange={([v]) => setProfile({ expectedRealYieldPct: v })}
        />
        <div className="flex gap-1">
          {PRESETS.map((p) => (
            <Button
              key={p}
              size="sm"
              variant={profile.expectedRealYieldPct === p ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => setProfile({ expectedRealYieldPct: p })}
            >
              {p}%
            </Button>
          ))}
        </div>
      </div>
    </section>
  )
}
