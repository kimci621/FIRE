import { useState, type ReactNode } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import type { Currency, Profile } from '@/lib/types'
import { useFireStore } from '@/store/useFireStore'

const CURRENCIES: Currency[] = ['USD', 'EUR', 'RUB', 'GBP', 'CHF', 'CNY', 'JPY', 'KZT', 'AED', 'TRY']
const EMOJIS = ['🚀', '💰', '📈', '🎯', '🔥', '💎']

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

export function SettingsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const profile = useFireStore((s) => s.profile)
  const setProfile = useFireStore((s) => s.setProfile)
  const remindersEnabled = useFireStore((s) => s.meta.remindersEnabled ?? true)
  const remindDay = useFireStore((s) => s.meta.remindDay ?? 20)
  const toggleReminders = useFireStore((s) => s.toggleReminders)
  const setRemindDay = useFireStore((s) => s.setRemindDay)
  const [error, setError] = useState<string | null>(null)

  const setNumber = (
    field:
      | 'currentAge'
      | 'targetAge'
      | 'retirementYears'
      | 'initialCapital'
      | 'targetMonthlyIncome'
      | 'inflationPct'
      | 'catchUpMonths',
    value: string,
    min: number,
  ) => {
    const n = Number(value)
    if (!Number.isFinite(n) || n < min) {
      setError('Значение должно быть числом ≥ ' + min)
      return
    }
    const patch: Partial<Profile> = { [field]: n }
    if (field === 'targetAge' && n <= profile.currentAge) {
      setError('Целевой возраст должен быть больше текущего')
      return
    }
    if (field === 'currentAge' && n >= profile.targetAge) {
      setError('Текущий возраст должен быть меньше целевого')
      return
    }
    if (field === 'catchUpMonths' && n > 36) {
      setError('Горизонт догонялок — не более 36 месяцев')
      return
    }
    setError(null)
    setProfile(patch)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-sm overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Настройки</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4 px-4 pb-8">
          <Field label="Имя" htmlFor="profile-name">
            <Input id="profile-name" value={profile.name} onChange={(e) => setProfile({ name: e.target.value })} />
          </Field>
          <div className="space-y-1.5">
            <Label>Аватар</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  aria-label={`Аватар ${e}`}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border text-xl transition-colors',
                    profile.avatar.value === e ? 'border-primary bg-primary/10' : 'border-border',
                  )}
                  onClick={() => setProfile({ avatar: { type: 'emoji', value: e } })}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Валюта</Label>
            <div className="grid grid-cols-5 gap-1 rounded-lg border p-0.5">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  className={cn(
                    'rounded-md px-1 py-1.5 text-xs transition-colors',
                    profile.currency === c ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
                  )}
                  onClick={() => setProfile({ currency: c })}
                >
                  {c}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Смена валюты не конвертирует суммы — только переобозначает.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Текущий возраст" htmlFor="current-age">
              <Input id="current-age" type="number" inputMode="numeric" value={profile.currentAge} onChange={(e) => setNumber('currentAge', e.target.value, 1)} />
            </Field>
            <Field label="Целевой возраст" htmlFor="target-age">
              <Input id="target-age" type="number" inputMode="numeric" value={profile.targetAge} onChange={(e) => setNumber('targetAge', e.target.value, 1)} />
            </Field>
            <Field label="Срок выплат, лет" htmlFor="retirement-years">
              <Input id="retirement-years" type="number" inputMode="numeric" value={profile.retirementYears} onChange={(e) => setNumber('retirementYears', e.target.value, 1)} />
            </Field>
            <Field label="Инфляция, %" htmlFor="inflation">
              <Input id="inflation" type="number" inputMode="decimal" value={profile.inflationPct} onChange={(e) => setNumber('inflationPct', e.target.value, 0)} />
            </Field>
            <Field label="Догонялки, мес" htmlFor="catchup-months">
              <Input id="catchup-months" type="number" inputMode="numeric" value={profile.catchUpMonths} onChange={(e) => setNumber('catchUpMonths', e.target.value, 6)} />
            </Field>
          </div>
          <Field label="Стартовый капитал" htmlFor="initial-capital">
            <Input id="initial-capital" type="number" inputMode="decimal" value={profile.initialCapital} onChange={(e) => setNumber('initialCapital', e.target.value, 0)} />
          </Field>
          <Field label="Целевой доход в месяц" htmlFor="target-income">
            <Input id="target-income" type="number" inputMode="decimal" value={profile.targetMonthlyIncome} onChange={(e) => setNumber('targetMonthlyIncome', e.target.value, 0.01)} />
          </Field>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label>Реальная доходность</Label>
              <span className="text-sm font-medium tabular-nums">{profile.expectedRealYieldPct.toFixed(1)}%</span>
            </div>
            <Slider min={1} max={10} step={0.5} value={[profile.expectedRealYieldPct]} onValueChange={([v]) => setProfile({ expectedRealYieldPct: v })} />
          </div>
          <div className="space-y-1.5">
            <Label>Тема</Label>
            <div className="flex rounded-lg border p-0.5">
              {(['dark', 'light', 'system'] as const).map((t) => (
                <button
                  key={t}
                  className={cn(
                    'flex-1 rounded-md px-2 py-1.5 text-sm transition-colors',
                    profile.theme === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
                  )}
                  onClick={() => setProfile({ theme: t })}
                >
                  {t === 'dark' ? 'Тёмная' : t === 'light' ? 'Светлая' : 'Система'}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Уведомления</Label>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                if (remindersEnabled && 'Notification' in window) {
                  void Notification.requestPermission()
                }
                toggleReminders()
              }}
            >
              Напоминания о взносе: {remindersEnabled ? 'вкл' : 'выкл'}
            </Button>
            {remindersEnabled && (
              <Field label="Напоминать с дня" htmlFor="remind-day">
                <Input
                  id="remind-day"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={28}
                  value={remindDay}
                  onChange={(e) => setRemindDay(Number(e.target.value))}
                />
              </Field>
            )}
          </div>
          {error && <p className="text-sm text-rose-500">{error}</p>}
        </div>
      </SheetContent>
    </Sheet>
  )
}
