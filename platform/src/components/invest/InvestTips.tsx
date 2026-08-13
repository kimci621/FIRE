import { useFireStore } from '@/store/useFireStore'

const TIPS = [
  {
    emoji: '🌍',
    title: 'Диверсифицируйте широко',
    text:
      'Исторически мировой рынок акций давал в среднем ~5% реальной доходности в год (данные за 1900–2025). Прогноз Vanguard на 10 лет (июнь 2026): акции США 4,2–6,2% номинальных в год — за вычетом инфляции это как раз зона 2–4% реальных. Широкий индексный фонд мировых акций — базовый инструмент для этой цели.',
    source: 'UBS Global Investment Returns Yearbook 2026; Vanguard VCMM, июнь 2026',
  },
  {
    emoji: '⏳',
    title: 'Держите горизонт 10+ лет',
    text:
      'Премия за риск акций реализуется только на длинных дистанциях: на коротких отрезках рынок может быть глубоко в минусе. Если до цели больше 10 лет — волатильность ваш союзник, а не враг.',
    source: 'UBS Global Investment Returns Yearbook 2026',
  },
  {
    emoji: '📉',
    title: 'Снижайте издержки',
    text:
      'Комиссии фондов и брокера вычитаются из реальной доходности напрямую. Индексные фонды с низкой комиссией (TER 0,1–0,3%) на 10–20 лет экономят десятки процентов капитала по сравнению с активными фондами.',
    source: 'Bogleheads, принципы индексного инвестирования',
  },
  {
    emoji: '🛡️',
    title: 'В рублях — прямая защита от инфляции',
    text:
      'ОФЗ-ИН — облигации с номиналом, индексируемым на инфляцию: купон = ИПЦ + реальная надбавка (у классического выпуска 52002 — 2,5% годовых). Это прямой способ зафиксировать реальную доходность без угадывания инфляции. Депозиты и фонды денежного рынка реальную доходность дают только когда ключевая ставка выше инфляции.',
    source: 'Минфин России / Банк России, параметры ОФЗ-ИН',
  },
  {
    emoji: '🧘',
    title: 'Не усложняйте',
    text:
      'Одного–трёх широких фондов достаточно. Частые сделки, тайминг и «горячие» идеи статистически ухудшают результат частного инвестора. Простота — это и есть стратегия.',
    source: 'Bogleheads, портфель из трёх фондов',
  },
]

export function InvestTips() {
  const currency = useFireStore((s) => s.profile.currency)
  const yieldPct = useFireStore((s) => s.profile.expectedRealYieldPct)

  return (
    <section className="rounded-2xl border bg-card p-4 space-y-3">
      <div>
        <h2 className="font-semibold">Реальная доходность {yieldPct.toFixed(1)}% — как её получить</h2>
        <p className="text-xs text-muted-foreground">
          Общие принципы из открытых источников. Инструменты и цифры — для информации, в {currency} вкладываться не обязательно.
        </p>
      </div>
      <div className="space-y-2">
        {TIPS.map((tip) => (
          <div key={tip.title} className="rounded-lg border bg-background/60 p-3 space-y-1">
            <div className="flex items-center gap-2">
              <span aria-hidden className="text-lg">
                {tip.emoji}
              </span>
              <span className="text-sm font-medium">{tip.title}</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{tip.text}</p>
            <p className="text-[10px] text-muted-foreground/70">Источник: {tip.source}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] leading-relaxed text-muted-foreground/80">
        ⚠️ Не является индивидуальной инвестиционной рекомендацией и не призыв к действиям (ст. 6.1–6.2 ФЗ № 39-ФЗ
        «О рынке ценных бумаг»). Материал носит исключительно информационный характер. Прошлая доходность и прогнозы
        не гарантируют будущих результатов.
      </p>
    </section>
  )
}
