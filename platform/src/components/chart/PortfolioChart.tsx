import { useMemo, useState } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatMoney, formatMoneyCompact } from '@/lib/finance/format'
import { useFireData } from '@/hooks/useFireData'
import { selectPoints } from '@/store/selectors'
import { Hint } from '@/components/ui/hint'

type Mode = 'real' | 'nominal'

export function PortfolioChart() {
  const data = useFireData()
  const { profile } = data
  const [mode, setMode] = useState<Mode>('real')

  const points = useMemo(() => selectPoints(data), [data])

  const chartData = useMemo(() => {
    const now = new Date()
    const currentMonthIndex = now.getMonth()
    return points.map((p, i) => {
      const monthsAhead = Math.max(0, i - currentMonthIndex)
      const k = mode === 'nominal' ? Math.pow(1 + profile.inflationPct / 100, monthsAhead / 12) : 1
      return {
        id: p.id,
        year: p.year,
        contributions: p.contributions * k,
        interest: p.interest * k,
      }
    })
  }, [points, mode, profile.inflationPct])

  const toggleClass = (active: boolean) =>
    `flex-1 rounded-md px-2 py-1.5 text-xs transition-colors ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`

  return (
    <section className="rounded-2xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1 font-semibold">
          Портфель
          <Hint
            text={`Слои: вклады (Emerald) и сложный процент (Violet). «Сегодняшние деньги» — реальная покупательная способность. «Номинальные» — с учётом инфляции ${profile.inflationPct}%/год, только отображение: расчёты не меняются.`}
          />
        </h2>
        <div className="flex rounded-lg border p-0.5">
          <button className={toggleClass(mode === 'real')} onClick={() => setMode('real')}>
            Сегодняшние деньги
          </button>
          <button className={toggleClass(mode === 'nominal')} onClick={() => setMode('nominal')}>
            Номинальные
          </button>
        </div>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="grad-contrib" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="grad-interest" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="year" minTickGap={40} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              tickFormatter={(v: number) => formatMoneyCompact(v, profile.currency)}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={72}
            />
            <Tooltip
              formatter={(v, name) => [
                formatMoney(Number(v ?? 0), profile.currency),
                name === 'contributions' ? 'Вклады' : 'Проценты',
              ]}
              labelFormatter={(_label, payload) => payload?.[0]?.payload?.id ?? ''}
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12 }}
            />
            <Area stackId="1" type="monotone" dataKey="contributions" stroke="#10b981" fill="url(#grad-contrib)" strokeWidth={2} />
            <Area stackId="1" type="monotone" dataKey="interest" stroke="#8b5cf6" fill="url(#grad-interest)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Вклады
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-violet-500" /> Сложный процент
        </span>
      </div>
    </section>
  )
}
