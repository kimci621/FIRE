export interface Milestone {
  key: string
  threshold: number
  title: string
  text: string
  emoji: string
}

const LEGACY_KEYS: Record<number, string> = {
  500000: 'm500k',
  1000000: 'm1m',
  5000000: 'm5m',
  10000000: 'm10m',
}

const SPECIAL: Record<number, Pick<Milestone, 'title' | 'text' | 'emoji'>> = {
  500000: { title: 'Первые полмиллиона!', text: 'Фундамент заложен!', emoji: '🧱' },
  1000000: { title: '1 МИЛЛИОН!', text: 'Вы в топ 10% накоплений!', emoji: '🚀' },
  5000000: { title: '5 Миллионов!', text: 'Сложный процент теперь генерирует больше, чем взносы!', emoji: '⚡' },
  10000000: { title: '10 Миллионов!', text: 'Половина пути к абсолютной свободе!', emoji: '🏰' },
}

const CHEER_EMOJIS = ['💪', '✨', '🔥', '⚡']

function ladderKey(threshold: number): string {
  return LEGACY_KEYS[threshold] ?? `m${threshold / 1000000}`.replace('.', 'm')
}

/** Лесенка достижений: каждые 500 000 до 10 млн + финальная цель. */
export function buildMilestones(targetCapital: number): Milestone[] {
  const milestones: Milestone[] = []
  let cheer = 0
  for (let t = 500000; t <= 10000000; t += 500000) {
    const special = SPECIAL[t]
    milestones.push({
      key: ladderKey(t),
      threshold: t,
      title: special?.title ?? new Intl.NumberFormat('ru-RU').format(t),
      text: special?.text ?? 'Ещё полмиллиона в копилку! Так держать!',
      emoji: special?.emoji ?? CHEER_EMOJIS[cheer++ % CHEER_EMOJIS.length],
    })
  }
  milestones.push({
    key: 'final',
    threshold: Math.round(targetCapital),
    title: 'ФИНАЛ!',
    text: 'Финансовая независимость достигнута!',
    emoji: '🎓',
  })
  return milestones
}
