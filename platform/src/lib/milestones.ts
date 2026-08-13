export interface Milestone {
  key: string
  threshold: number
  title: string
  text: string
  emoji: string
}

export const FIXED_MILESTONES: Milestone[] = [
  { key: 'm500k', threshold: 500000, title: 'Первые полмиллиона!', text: 'Фундамент заложен!', emoji: '🧱' },
  { key: 'm1m', threshold: 1000000, title: '1 МИЛЛИОН!', text: 'Вы в топ 10% накоплений!', emoji: '🚀' },
  { key: 'm5m', threshold: 5000000, title: '5 Миллионов!', text: 'Сложный процент теперь генерирует больше, чем взносы!', emoji: '⚡' },
  { key: 'm10m', threshold: 10000000, title: '10 Миллионов!', text: 'Половина пути к абсолютной свободе!', emoji: '🏰' },
]

export function buildMilestones(targetCapital: number): Milestone[] {
  return [
    ...FIXED_MILESTONES,
    { key: 'final', threshold: Math.round(targetCapital), title: 'ФИНАЛ!', text: 'Финансовая независимость достигнута!', emoji: '🎓' },
  ]
}
