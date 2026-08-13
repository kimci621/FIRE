export type Currency = 'USD' | 'EUR' | 'RUB' | 'GBP' | 'CHF' | 'CNY' | 'JPY' | 'KZT' | 'AED' | 'TRY'
export type Theme = 'dark' | 'light' | 'system'
export type AvatarType = 'emoji' | 'image'

export interface Avatar {
  type: AvatarType
  value: string
}

export interface Profile {
  name: string
  avatar: Avatar
  currency: Currency
  currentAge: number
  targetAge: number
  retirementYears: number
  initialCapital: number
  targetMonthlyIncome: number
  expectedRealYieldPct: number
  inflationPct: number
  /** Горизонт «догонялок»: за сколько месяцев закрывать недобор (6-36). */
  catchUpMonths: number
  theme: Theme
}

export interface MonthEntry {
  id: string // "YYYY-MM"
  year: number
  month: number // 1-12
  age: number
  plannedDeposit: number
  actualDeposit: number
  isCompleted: boolean
  /** Свой взнос вместо системного плана (для будущих месяцев). undefined = по плану. */
  customDeposit?: number
  notes?: string
}

export interface FireMeta {
  unlockedMilestones: string[]
  /** Локальные таймстемпы изменений (ISO). Используются для last-write-wins синка. */
  lastModified?: {
    profile?: string
    months?: Record<string, string>
  }
  /** Напоминания о взносе (локальные, Notification API). */
  remindersEnabled?: boolean
  /** День месяца, с которого напоминать (1-28). */
  remindDay?: number
}

export interface FireData {
  profile: Profile
  months: MonthEntry[]
  meta: FireMeta
}

export interface ProjectionPoint {
  id: string
  year: number
  month: number
  age: number
  balance: number
  contributions: number
  interest: number
  isFuture: boolean
}

export const DEFAULT_PROFILE: Profile = {
  name: 'Амир',
  avatar: { type: 'emoji', value: '🚀' },
  currency: 'USD',
  currentAge: 28,
  targetAge: 50,
  retirementYears: 25,
  initialCapital: 100000,
  targetMonthlyIncome: 5000,
  expectedRealYieldPct: 4,
  inflationPct: 8,
  catchUpMonths: 12,
  theme: 'dark',
}

export const DEFAULT_META: FireMeta = { unlockedMilestones: [] }
