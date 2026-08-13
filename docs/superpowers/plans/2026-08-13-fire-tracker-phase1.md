# FIRE Tracker — Фаза 1 (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Работающий mobile-first PWA: финансовое ядро, календарь взносов, график портфеля, настройки, геймификация (milestone-конфетти), импорт/экспорт JSON, офлайн, деплой на Vercel.

**Architecture:** React 19 + Vite + TypeScript (strict), Tailwind CSS 4 + shadcn/ui, Zustand + persist (localStorage), Recharts, Framer Motion, canvas-confetti, vite-plugin-pwa. Финансовое ядро — чистые TS-функции в `src/lib/finance/` без React-зависимостей, покрыто Vitest. Домен-типы — в `src/lib/types.ts`. Все расчёты — derived state в селекторах `src/store/selectors.ts`. Supabase появится в Фазе 2 за интерфейсом `StorageAdapter`.

**Tech Stack:** React 19, Vite 7, TS 5.8, Tailwind 4, shadcn/ui (new-york, zinc), Recharts 3, Zustand 5, framer-motion 12, canvas-confetti, vite-plugin-pwa, Vitest 3, React Testing Library, Playwright.

**Спецификация:** `docs/specs/2026-08-13-fire-tracker-design.md` — единственный источник истины. При расхождении плана и спеки — правь план, не спеку.

---

## Карта файлов (что создаём)

| Файл | Ответственность |
|------|-----------------|
| `platform/package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html` | Скаффолд, сборка, тесты, PWA |
| `platform/Makefile` → корневой `Makefile` | Команды: setup/dev/test/e2e/build/serve/icons |
| `platform/src/lib/types.ts` | Домен-типы (Profile, MonthEntry, FireData, …) + DEFAULT_PROFILE |
| `platform/src/lib/finance/annuity.ts` | monthlyRate, annuityPV, requiredMonthlyDeposit |
| `platform/src/lib/finance/projection.ts` | monthId, addMonths, projectMonths (слои вклады/проценты) |
| `platform/src/lib/finance/catchup.ts` | computeCatchUp («догонялки») |
| `platform/src/lib/finance/format.ts` | formatMoney, formatMoneyCompact |
| `platform/src/lib/storage/adapter.ts`, `localStorageAdapter.ts`, `supabaseAdapter.ts` | StorageAdapter (localStorage сейчас, Supabase — Фаза 2) |
| `platform/src/lib/exportImport.ts` | Экспорт/импорт JSON + валидация схемы |
| `platform/src/lib/milestones.ts` | Пороги, тексты достижений |
| `platform/src/store/useFireStore.ts`, `selectors.ts` | Zustand-стор + производные |
| `platform/src/hooks/useMilestoneCelebration.ts` | Детект пересечения порогов, очередь конфетти |
| `platform/src/components/ui/*` | shadcn/ui (button, card, dialog, sheet, slider, input, label, badge, separator) |
| `platform/src/components/header/ProfileBanner.tsx`, `CatchUpBanner.tsx`, `AnimatedMoney.tsx` | Баннер профиля, «догонялки», анимация цифр |
| `platform/src/components/chart/PortfolioChart.tsx` | Stacked area + toggle реальные/номинальные |
| `platform/src/components/calendar/Calendar.tsx`, `YearSection.tsx`, `MonthCard.tsx` | Календарь по годам/месяцам |
| `platform/src/components/settings/SettingsSheet.tsx` | Настройки профиля |
| `platform/src/components/data/DataSheet.tsx` | Импорт/экспорт/сброс, статус синка |
| `platform/src/components/milestones/AchievementModal.tsx` | Конфетти + модалка достижения |
| `platform/src/App.tsx`, `main.tsx`, `index.css`, `src/test/setup.ts` | Сборка приложения, стили, тест-окружение |
| `platform/public/fire-icon.svg`, `pwa-assets.config.ts` | PWA-иконки |
| `platform/e2e/*.spec.ts`, `playwright.config.ts` | E2E-смоук |
| `platform/vercel.json` | Деплой-конфиг Vercel (root = platform) |

**Конвенции:** UI-тексты на русском; код/коммиты на английском. Коммит после каждой задачи.
**Известные допущения (из спеки):** сетка месяцев начинается с января текущего года; возраст месяца = `currentAge + floor(index/12)`; прошлые месяцы сетки — «прошедшие» (незаполненные = пропущены), текущий и будущие — «будущие» (считаются по плану).

---

## Task 1: Скаффолд Vite + React + TS

**Files:**
- Create: `platform/package.json`, `platform/tsconfig.json`, `platform/tsconfig.app.json`, `platform/tsconfig.node.json`, `platform/vite.config.ts`, `platform/index.html`, `platform/src/main.tsx`, `platform/src/App.tsx`, `platform/src/index.css`, `.gitignore`, `Makefile`
- Create: `platform/.gitignore`, `platform/src/vite-env.d.ts`

- [ ] **Step 1: Создать package.json**

`platform/package.json`:

```json
{
  "name": "fire-tracker",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "icons": "pwa-assets-generator"
  },
  "dependencies": {
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-label": "^2.1.8",
    "@radix-ui/react-slider": "^1.3.6",
    "@radix-ui/react-slot": "^1.2.4",
    "canvas-confetti": "^1.9.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "framer-motion": "^12.23.0",
    "lucide-react": "^0.525.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "recharts": "^3.1.0",
    "tailwind-merge": "^3.3.0",
    "zustand": "^5.0.6"
  },
  "devDependencies": {
    "@playwright/test": "^1.53.0",
    "@tailwindcss/vite": "^4.1.11",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@types/canvas-confetti": "^1.9.0",
    "@types/node": "^24.0.0",
    "@types/react": "^19.1.8",
    "@types/react-dom": "^19.1.6",
    "@vite-pwa/assets-generator": "^1.0.0",
    "@vitejs/plugin-react": "^4.6.0",
    "jsdom": "^26.1.0",
    "tailwindcss": "^4.1.11",
    "typescript": "~5.8.3",
    "vite": "^7.0.0",
    "vite-plugin-pwa": "^1.0.1",
    "vitest": "^3.2.0"
  }
}
```

- [ ] **Step 2: Создать tsconfig-трио**

`platform/tsconfig.json`:

```json
{
  "files": [],
  "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }]
}
```

`platform/tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] },
    "types": ["vite/client", "vite-plugin-pwa/client"]
  },
  "include": ["src"]
}
```

`platform/tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts", "playwright.config.ts", "pwa-assets.config.ts"]
}
```

- [ ] **Step 3: Создать vite.config.ts (react + tailwind + vitest; PWA добавим в Task 18)**

`platform/vite.config.ts`:

```ts
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
```

- [ ] **Step 4: Создать index.html, main.tsx, App.tsx, index.css, vite-env.d.ts**

`platform/index.html`:

```html
<!doctype html>
<html lang="ru" class="dark">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/fire-icon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#09090b" />
    <title>FIRE Tracker</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`platform/src/main.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

`platform/src/App.tsx` (заглушка, заменим в Task 17):

```tsx
export default function App() {
  return <div className="p-8">FIRE Tracker</div>
}
```

`platform/src/index.css` (временный минимум, shadcn перезапишет в Task 2):

```css
@import "tailwindcss";
```

`platform/src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 5: Создать .gitignore (корень) и platform/.gitignore**

`.gitignore` (корень репозитория):

```gitignore
.DS_Store
.vercel
```

`platform/.gitignore`:

```gitignore
node_modules
dist
dev-dist
test-results
playwright-report
*.tsbuildinfo
```

- [ ] **Step 6: Создать корневой Makefile**

`Makefile`:

```make
.PHONY: setup dev test e2e build serve icons

setup:
	cd platform && npm install

dev:
	cd platform && npm run dev

test:
	cd platform && npm run test

e2e:
	cd platform && npm run e2e

build:
	cd platform && npm run build

serve:
	cd platform && npm run preview

icons:
	cd platform && npm run icons
```

- [ ] **Step 7: Установить зависимости и проверить сборку**

Run:
```bash
cd platform && npm install
npm run build
```
Expected: build успешен (dist/ создан), ошибок tsc нет.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold vite react ts platform"
```

---

## Task 2: Tailwind + shadcn/ui + тёмная тема

**Files:**
- Modify: `platform/src/index.css` (перезапишется shadcn init)
- Create: `platform/components.json`, `platform/src/lib/utils.ts`, `platform/src/components/ui/*` (CLI)
- Modify: `platform/src/index.css`, `platform/index.html` (уже содержит class="dark")

- [ ] **Step 1: Инициализировать shadcn (неинтерактивно, база zinc)**

Run:
```bash
cd platform && npx shadcn@latest init -d -b zinc
```
Expected: созданы `components.json`, `src/lib/utils.ts`, обновлён `src/index.css` (токены CSS-переменных), подтверждение в выводе.

- [ ] **Step 2: Добавить компоненты**

Run:
```bash
cd platform && npx shadcn@latest add button card dialog sheet slider input label badge separator -y --overwrite
```
Expected: созданы `src/components/ui/button.tsx`, `card.tsx`, `dialog.tsx`, `sheet.tsx`, `slider.tsx`, `input.tsx`, `label.tsx`, `badge.tsx`, `separator.tsx`.

- [ ] **Step 3: Проверить тёмную тему и фон приложения**

`src/index.css` — после шапки shadcn (первая строка `@import "tailwindcss";`) добавить базовые стили тела:

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  html {
    -webkit-tap-highlight-color: transparent;
  }
  body {
    @apply bg-background text-foreground antialiased;
    overscroll-behavior-y: none;
  }
}
```

Убедиться, что в css есть `@custom-variant dark (&:is(.dark *));` (shadcn генерирует) и что `index.html` содержит `class="dark"` на `<html>` — тёмная тема включена всегда в MVP.

- [ ] **Step 4: Проверить сборку**

Run: `cd platform && npm run build`
Expected: успешно.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: init shadcn ui with zinc dark theme"
```

---

## Task 3: Домен-типы

**Files:**
- Create: `platform/src/lib/types.ts`

- [ ] **Step 1: Создать types.ts**

```ts
export type Currency = 'USD' | 'EUR' | 'RUB'
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
  notes?: string
}

export interface FireMeta {
  unlockedMilestones: string[]
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
  theme: 'dark',
}

export const DEFAULT_META: FireMeta = { unlockedMilestones: [] }
```

- [ ] **Step 2: Проверить сборку (типы компилируются)**

Run: `cd platform && npx tsc -b --force`
Expected: без ошибок.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add domain types and default profile"
```

---

## Task 4: Финансовое ядро — annuity (TDD)

**Files:**
- Create: `platform/src/lib/finance/annuity.ts`
- Test: `platform/src/lib/finance/annuity.test.ts`

- [ ] **Step 1: Написать падающие тесты**

`platform/src/lib/finance/annuity.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { monthlyRate, annuityPV, requiredMonthlyDeposit } from './annuity'

describe('monthlyRate', () => {
  it('converts annual real yield to monthly rate', () => {
    expect(Math.abs(monthlyRate(4) - 0.0032737)).toBeLessThan(0.00001)
  })
  it('returns 0 for 0% yield', () => {
    expect(monthlyRate(0)).toBe(0)
  })
})

describe('annuityPV', () => {
  it('computes present value of monthly income annuity (defaults: 5000/mo, 25y, 4%)', () => {
    const pv = annuityPV(5000, 300, 4)
    expect(pv).toBeCloseTo(954387.4, 1)
  })
  it('handles zero yield as simple sum', () => {
    expect(annuityPV(1000, 12, 0)).toBe(12000)
  })
})

describe('requiredMonthlyDeposit', () => {
  it('computes PMT to grow initial capital to target (264 months, 4%)', () => {
    const pmt = requiredMonthlyDeposit(954387.4, 100000, 264, 4)
    expect(pmt).toBeCloseTo(1714.38, 0)
  })
  it('handles zero yield as linear gap fill', () => {
    expect(requiredMonthlyDeposit(300000, 100000, 24, 0)).toBeCloseTo(8333.33, 1)
  })
  it('returns 0 when target already reached', () => {
    expect(requiredMonthlyDeposit(50000, 100000, 120, 4)).toBe(0)
  })
})
```

- [ ] **Step 2: Запустить тесты — убедиться, что падают**

Run: `cd platform && npx vitest run src/lib/finance/annuity.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Написать реализацию**

`platform/src/lib/finance/annuity.ts`:

```ts
/** Месячная ставка из годовой (проценты): r = (1 + pct/100)^(1/12) - 1 */
export function monthlyRate(annualYieldPct: number): number {
  return Math.pow(1 + annualYieldPct / 100, 1 / 12) - 1
}

/** PV аннуитета: выплата в конце каждого месяца в течение `months` */
export function annuityPV(monthlyIncome: number, months: number, annualYieldPct: number): number {
  const r = monthlyRate(annualYieldPct)
  if (r === 0) return monthlyIncome * months
  return (monthlyIncome * (1 - Math.pow(1 + r, -months))) / r
}

/** PMT: ежемесячный взнос, чтобы initialCapital вырос до targetCapital за `months` */
export function requiredMonthlyDeposit(
  targetCapital: number,
  initialCapital: number,
  months: number,
  annualYieldPct: number,
): number {
  if (months <= 0) return 0
  const r = monthlyRate(annualYieldPct)
  if (r === 0) return Math.max(0, (targetCapital - initialCapital) / months)
  const fv = initialCapital * Math.pow(1 + r, months)
  return Math.max(0, (r * (targetCapital - fv)) / (Math.pow(1 + r, months) - 1))
}
```

- [ ] **Step 4: Запустить тесты — убедиться, что проходят**

Run: `cd platform && npx vitest run src/lib/finance/annuity.test.ts`
Expected: PASS (5 тестов).

- [ ] **Step 5: Commit**

```bash
git add platform/src/lib/finance
git commit -m "feat: financial core - annuity pv and required deposit"
```

---

## Task 5: Финансовое ядро — projection (TDD)

**Files:**
- Create: `platform/src/lib/finance/projection.ts`
- Test: `platform/src/lib/finance/projection.test.ts`

- [ ] **Step 1: Написать падающие тесты**

`platform/src/lib/finance/projection.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import type { MonthEntry, Profile } from '../types'
import { DEFAULT_PROFILE } from '../types'
import { monthId, addMonths, projectMonths } from './projection'

const profile: Profile = {
  ...DEFAULT_PROFILE,
  currentAge: 28,
  targetAge: 30,
  expectedRealYieldPct: 0,
  initialCapital: 100000,
  targetMonthlyIncome: 1000,
}

function entry(year: number, month: number, planned: number, actual: number, done: boolean): MonthEntry {
  return { id: monthId(year, month), year, month, age: 28, plannedDeposit: planned, actualDeposit: actual, isCompleted: done }
}

describe('monthId', () => {
  it('pads month to two digits', () => {
    expect(monthId(2026, 8)).toBe('2026-08')
  })
})

describe('addMonths', () => {
  it('crosses year boundary', () => {
    expect(addMonths({ year: 2026, month: 11 }, 3)).toEqual({ year: 2027, month: 2 })
  })
})

describe('projectMonths', () => {
  // Сетка: 24 месяца (28→30 лет), старт январь 2026, текущий месяц август (index 7)
  const entries = [entry(2026, 1, 8333.33, 5000, true)]

  it('iterates month by month with layers and past/future logic', () => {
    const points = projectMonths({ profile, entries, startYear: 2026, currentMonthIndex: 7 })
    expect(points).toHaveLength(24)
    // Январь 2026: completed, взнос 5000
    expect(points[0].balance).toBeCloseTo(105000, 5)
    expect(points[0].contributions).toBeCloseTo(5000, 5)
    expect(points[0].interest).toBe(0)
    expect(points[0].isFuture).toBe(false)
    // Февраль 2026: прошедший, не отмечен → 0
    expect(points[1].balance).toBeCloseTo(105000, 5)
    // Август 2026 (текущий): считается плановый взнос
    expect(points[7].balance).toBeCloseTo(113333.33, 1)
    expect(points[7].isFuture).toBe(true)
    // Последний месяц: 105000 + 17 × 8333.33
    expect(points[23].balance).toBeCloseTo(246666.66, 1)
    expect(points[23].contributions).toBeCloseTo(146666.66, 1)
  })

  it('computes age from index', () => {
    const points = projectMonths({ profile, entries, startYear: 2026, currentMonthIndex: 7 })
    expect(points[0].age).toBe(28)
    expect(points[23].age).toBe(29)
  })

  it('accumulates interest with nonzero yield', () => {
    const p = { ...profile, expectedRealYieldPct: 12 }
    const points = projectMonths({ profile: p, entries: [], startYear: 2026, currentMonthIndex: 7 })
    const r = Math.pow(1.12, 1 / 12) - 1
    expect(points[0].interest).toBeCloseTo(100000 * r, 5)
    expect(points[1].interest).toBeCloseTo(points[0].interest + points[0].balance * r, 5)
  })

  it('uses planned deposit snapshot from entry for future months', () => {
    const e = entry(2026, 9, 7777, 0, false)
    const points = projectMonths({ profile, entries: [e], startYear: 2026, currentMonthIndex: 7 })
    expect(points[8].balance - points[7].balance).toBeCloseTo(7777, 5)
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падают**

Run: `cd platform && npx vitest run src/lib/finance/projection.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Написать реализацию**

`platform/src/lib/finance/projection.ts`:

```ts
import type { MonthEntry, Profile, ProjectionPoint } from '../types'
import { monthlyRate, requiredMonthlyDeposit, annuityPV } from './annuity'

export function monthId(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function addMonths(d: { year: number; month: number }, delta: number): { year: number; month: number } {
  const total = d.year * 12 + (d.month - 1) + delta
  return { year: Math.floor(total / 12), month: (total % 12) + 1 }
}

export interface ProjectionInput {
  profile: Profile
  entries: MonthEntry[]
  startYear: number // январь текущего года — начало сетки
  currentMonthIndex: number // индекс текущего месяца в сетке (0-based, = now.getMonth())
}

export function projectMonths(input: ProjectionInput): ProjectionPoint[] {
  const { profile, entries, startYear, currentMonthIndex } = input
  const totalMonths = (profile.targetAge - profile.currentAge) * 12
  if (totalMonths <= 0) return []
  const r = monthlyRate(profile.expectedRealYieldPct)
  const targetCapital = annuityPV(profile.targetMonthlyIncome, profile.retirementYears * 12, profile.expectedRealYieldPct)
  const defaultPlanned = requiredMonthlyDeposit(targetCapital, profile.initialCapital, totalMonths, profile.expectedRealYieldPct)
  const byId = new Map(entries.map((e) => [e.id, e]))

  let balance = profile.initialCapital
  let contributions = 0
  let interest = 0
  const points: ProjectionPoint[] = []

  for (let i = 0; i < totalMonths; i++) {
    const { year, month } = addMonths({ year: startYear, month: 1 }, i)
    const id = monthId(year, month)
    const entry = byId.get(id)
    const isFuture = i >= currentMonthIndex
    const earned = balance * r
    const deposit = entry?.isCompleted
      ? entry.actualDeposit
      : isFuture
        ? (entry?.plannedDeposit ?? defaultPlanned)
        : 0
    interest += earned
    balance += earned + deposit
    contributions += deposit
    points.push({
      id,
      year,
      month,
      age: profile.currentAge + Math.floor(i / 12),
      balance,
      contributions,
      interest,
      isFuture,
    })
  }
  return points
}
```

- [ ] **Step 4: Запустить — убедиться, что проходят**

Run: `cd platform && npx vitest run src/lib/finance/projection.test.ts`
Expected: PASS (7 тестов).

- [ ] **Step 5: Commit**

```bash
git add platform/src/lib/finance
git commit -m "feat: financial core - monthly projection with layers"
```

---

## Task 6: Финансовое ядро — catch-up (TDD)

**Files:**
- Create: `platform/src/lib/finance/catchup.ts`
- Test: `platform/src/lib/finance/catchup.test.ts`

- [ ] **Step 1: Написать падающие тесты**

`platform/src/lib/finance/catchup.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import type { MonthEntry } from '../types'
import { computeCatchUp, CATCHUP_MONTHS } from './catchup'

function entry(id: string, planned: number, actual: number, done = true): MonthEntry {
  const [year, month] = id.split('-').map(Number)
  return { id, year, month, age: 28, plannedDeposit: planned, actualDeposit: actual, isCompleted: done }
}

describe('computeCatchUp', () => {
  it('computes shortfall over past months and extra PMT over 12 months', () => {
    const entries = [
      entry('2026-01', 1000, 400),
      entry('2026-02', 1000, 900),
      entry('2026-08', 1000, 0, false), // текущий месяц — не считается
    ]
    const result = computeCatchUp(entries, 2026, 7, 4)
    expect(result?.shortfall).toBeCloseTo(700, 5)
    // extra = ceil(shortfall * r / (1 - (1+r)^-12) / 100) * 100 → 100
    expect(result?.extraPerMonth).toBe(100)
    expect(result?.months).toBe(CATCHUP_MONTHS)
  })

  it('returns null when on track or ahead', () => {
    const entries = [entry('2026-01', 1000, 1200), entry('2026-02', 1000, 1000)]
    expect(computeCatchUp(entries, 2026, 7, 4)).toBeNull()
  })

  it('ignores future months entirely', () => {
    const entries = [entry('2026-12', 1000, 0, false)]
    expect(computeCatchUp(entries, 2026, 7, 4)).toBeNull()
  })

  it('treats skipped past months as full shortfall', () => {
    const entries = [entry('2026-01', 2000, 0, false)]
    const result = computeCatchUp(entries, 2026, 7, 4)
    expect(result?.shortfall).toBeCloseTo(2000, 5)
    expect(result?.extraPerMonth).toBe(200)
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падают**

Run: `cd platform && npx vitest run src/lib/finance/catchup.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Написать реализацию**

`platform/src/lib/finance/catchup.ts`:

```ts
import type { MonthEntry } from '../types'
import { monthlyRate } from './annuity'

export const CATCHUP_MONTHS = 12

export interface CatchUpResult {
  shortfall: number
  extraPerMonth: number
  months: number
}

/**
 * «Догонялки»: недобор по прошедшим месяцам сетки (gridIndex < currentMonthIndex).
 * Доп. взнос = «кредитный» платёж, закрывающий недобор за CATCHUP_MONTHS при той же ставке:
 * P = S * r / (1 - (1+r)^-Y), округление вверх до 100.
 */
export function computeCatchUp(
  entries: MonthEntry[],
  startYear: number,
  currentMonthIndex: number,
  annualYieldPct: number,
): CatchUpResult | null {
  let shortfall = 0
  for (const e of entries) {
    const gridIndex = (e.year - startYear) * 12 + (e.month - 1)
    if (gridIndex < currentMonthIndex) {
      shortfall += Math.max(0, e.plannedDeposit - e.actualDeposit)
    }
  }
  if (shortfall <= 0) return null
  const r = monthlyRate(annualYieldPct)
  const raw = (shortfall * r) / (1 - Math.pow(1 + r, -CATCHUP_MONTHS))
  const extraPerMonth = Math.ceil(raw / 100) * 100
  return { shortfall, extraPerMonth, months: CATCHUP_MONTHS }
}
```

- [ ] **Step 4: Запустить — убедиться, что проходят**

Run: `cd platform && npx vitest run src/lib/finance/catchup.test.ts`
Expected: PASS (4 теста). Справка по ожиданиям: S=2000, raw = 2000×0.0032737/0.038462 ≈ 170.2 → ceil до сотни → 200.

- [ ] **Step 5: Commit**

```bash
git add platform/src/lib/finance
git commit -m "feat: financial core - catch-up recommendation"
```

---

## Task 7: Финансовое ядро — форматирование валют (TDD)

**Files:**
- Create: `platform/src/lib/finance/format.ts`
- Test: `platform/src/lib/finance/format.test.ts`

- [ ] **Step 1: Написать падающие тесты**

`platform/src/lib/finance/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatMoney, formatMoneyCompact } from './format'

describe('formatMoney', () => {
  it('formats USD with ru-RU locale', () => {
    const f = formatMoney(954370, 'USD')
    expect(f).toContain('954')
    expect(f).toContain('370')
    expect(f).toContain('$')
  })
  it('formats RUB with ruble sign', () => {
    expect(formatMoney(1200, 'RUB')).toContain('₽')
  })
  it('formats EUR with euro sign', () => {
    expect(formatMoney(500, 'EUR')).toContain('€')
  })
  it('respects fraction digits option', () => {
    expect(formatMoney(1.5, 'USD', { maximumFractionDigits: 1 })).toContain('1,5')
  })
})

describe('formatMoneyCompact', () => {
  it('compacts large numbers', () => {
    expect(formatMoneyCompact(954370, 'USD')).toContain('954')
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падают**

Run: `cd platform && npx vitest run src/lib/finance/format.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Написать реализацию**

`platform/src/lib/finance/format.ts`:

```ts
import type { Currency } from '../types'

export interface FormatOptions {
  maximumFractionDigits?: number
}

export function formatMoney(value: number, currency: Currency, options?: FormatOptions): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
  }).format(value)
}

export function formatMoneyCompact(value: number, currency: Currency): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}
```

- [ ] **Step 4: Запустить — убедиться, что проходят**

Run: `cd platform && npx vitest run src/lib/finance/format.test.ts`
Expected: PASS (5 тестов).

- [ ] **Step 5: Commit**

```bash
git add platform/src/lib/finance
git commit -m "feat: money formatting via intl"
```

---

## Task 8: Storage-адаптеры (TDD)

**Files:**
- Create: `platform/src/lib/storage/adapter.ts`, `platform/src/lib/storage/localStorageAdapter.ts`, `platform/src/lib/storage/supabaseAdapter.ts`
- Test: `platform/src/lib/storage/localStorageAdapter.test.ts`
- Create: `platform/src/test/setup.ts`

- [ ] **Step 1: Написать падающий тест + setup**

`platform/src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'

// Recharts использует ResizeObserver — в jsdom его нет
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
```

`platform/src/lib/storage/localStorageAdapter.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createLocalStorageAdapter } from './localStorageAdapter'
import { STORAGE_KEY } from './adapter'
import { DEFAULT_PROFILE, DEFAULT_META } from '../types'

beforeEach(() => {
  window.localStorage.clear()
})

describe('createLocalStorageAdapter', () => {
  it('returns null when storage is empty', () => {
    const adapter = createLocalStorageAdapter(window.localStorage)
    expect(adapter.load()).toBeNull()
  })

  it('saves and loads data roundtrip', () => {
    const adapter = createLocalStorageAdapter(window.localStorage)
    const data = { profile: DEFAULT_PROFILE, months: [], meta: DEFAULT_META }
    adapter.save(data)
    expect(adapter.load()).toEqual(data)
  })

  it('returns null on corrupted json', () => {
    window.localStorage.setItem(STORAGE_KEY, '{oops')
    const adapter = createLocalStorageAdapter(window.localStorage)
    expect(adapter.load()).toBeNull()
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `cd platform && npx vitest run src/lib/storage`
Expected: FAIL (module not found).

- [ ] **Step 3: Написать реализацию**

`platform/src/lib/storage/adapter.ts`:

```ts
import type { FireData } from '../types'

export const STORAGE_KEY = 'fire-tracker-storage-v1'

/** Единая точка доступа к данным: localStorage (Фаза 1), Supabase (Фаза 2). */
export interface StorageAdapter {
  load(): FireData | null
  save(data: FireData): void
  // Duck-typed Storage API для zustand persist:
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
```

`platform/src/lib/storage/localStorageAdapter.ts`:

```ts
import type { FireData } from '../types'
import { STORAGE_KEY, type StorageAdapter } from './adapter'

export function createLocalStorageAdapter(storage: Storage): StorageAdapter {
  return {
    load(): FireData | null {
      const raw = storage.getItem(STORAGE_KEY)
      if (!raw) return null
      try {
        return JSON.parse(raw) as FireData
      } catch {
        return null
      }
    },
    save(data: FireData): void {
      storage.setItem(STORAGE_KEY, JSON.stringify(data))
    },
    getItem(key: string): string | null {
      return storage.getItem(key)
    },
    setItem(key: string, value: string): void {
      storage.setItem(key, value)
    },
    removeItem(key: string): void {
      storage.removeItem(key)
    },
  }
}
```

`platform/src/lib/storage/supabaseAdapter.ts`:

```ts
import type { StorageAdapter } from './adapter'

/** Фаза 2: Supabase Auth + PostgreSQL sync. В MVP — заглушка. */
export function createSupabaseAdapter(): StorageAdapter {
  throw new Error('Supabase sync arrives in Phase 2')
}
```

- [ ] **Step 4: Запустить — убедиться, что проходят**

Run: `cd platform && npx vitest run src/lib/storage`
Expected: PASS (3 теста).

- [ ] **Step 5: Commit**

```bash
git add platform/src/lib/storage platform/src/test
git commit -m "feat: storage adapter interface with localStorage impl"
```

---

## Task 9: Экспорт/импорт JSON (TDD)

**Files:**
- Create: `platform/src/lib/exportImport.ts`
- Test: `platform/src/lib/exportImport.test.ts`

- [ ] **Step 1: Написать падающие тесты**

`platform/src/lib/exportImport.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { exportJson, parseImport, EXPORT_VERSION } from './exportImport'
import { DEFAULT_PROFILE, DEFAULT_META } from './types'

const validData = { profile: DEFAULT_PROFILE, months: [], meta: DEFAULT_META }

describe('exportJson', () => {
  it('produces versioned json', () => {
    const parsed = JSON.parse(exportJson(validData))
    expect(parsed.version).toBe(EXPORT_VERSION)
    expect(parsed.profile.name).toBe('Амир')
    expect(parsed).toHaveProperty('exportedAt')
  })
})

describe('parseImport', () => {
  it('roundtrips valid export', () => {
    const result = parseImport(exportJson(validData))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.months).toEqual([])
  })

  it('rejects invalid json', () => {
    const result = parseImport('not json')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('JSON')
  })

  it('rejects unsupported version', () => {
    const result = parseImport(JSON.stringify({ version: 2, profile: {}, months: [], meta: {} }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('верси')
  })

  it('rejects missing months array', () => {
    const result = parseImport(JSON.stringify({ version: 1, profile: DEFAULT_PROFILE, meta: {} }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('months')
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падают**

Run: `cd platform && npx vitest run src/lib/exportImport.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Написать реализацию**

`platform/src/lib/exportImport.ts`:

```ts
import type { Currency, FireData, MonthEntry, Profile } from './types'

export const EXPORT_VERSION = 1

export function exportJson(data: FireData): string {
  return JSON.stringify({ version: EXPORT_VERSION, exportedAt: new Date().toISOString(), ...data }, null, 2)
}

export function downloadJson(data: FireData): void {
  const blob = new Blob([exportJson(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fire-tracker-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export type ImportResult = { ok: true; data: FireData } | { ok: false; error: string }

const CURRENCIES: Currency[] = ['USD', 'EUR', 'RUB']

function isProfile(p: unknown): p is Profile {
  if (typeof p !== 'object' || p === null) return false
  const o = p as Record<string, unknown>
  return (
    typeof o.name === 'string' &&
    typeof o.currentAge === 'number' &&
    typeof o.targetAge === 'number' &&
    typeof o.retirementYears === 'number' &&
    typeof o.initialCapital === 'number' &&
    typeof o.targetMonthlyIncome === 'number' &&
    typeof o.expectedRealYieldPct === 'number' &&
    typeof o.inflationPct === 'number' &&
    CURRENCIES.includes(o.currency as Currency)
  )
}

function isMonthEntry(m: unknown): m is MonthEntry {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.year === 'number' &&
    typeof o.month === 'number' &&
    typeof o.plannedDeposit === 'number' &&
    typeof o.actualDeposit === 'number' &&
    typeof o.isCompleted === 'boolean'
  )
}

export function parseImport(text: string): ImportResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Некорректный JSON' }
  }
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'Некорректный JSON' }
  const o = raw as Record<string, unknown>
  if (o.version !== EXPORT_VERSION) {
    return { ok: false, error: `Несовместимая версия файла: ${String(o.version)} (ожидалась ${EXPORT_VERSION})` }
  }
  if (!isProfile(o.profile)) return { ok: false, error: 'Поле profile некорректно' }
  if (!Array.isArray(o.months) || !o.months.every(isMonthEntry)) {
    return { ok: false, error: 'Поле months должно быть массивом записей месяцев' }
  }
  const meta = typeof o.meta === 'object' && o.meta !== null && Array.isArray((o.meta as { unlockedMilestones?: unknown }).unlockedMilestones)
    ? (o.meta as FireData['meta'])
    : { unlockedMilestones: [] }
  return { ok: true, data: { profile: o.profile, months: o.months, meta } }
}
```

- [ ] **Step 4: Запустить — убедиться, что проходят**

Run: `cd platform && npx vitest run src/lib/exportImport.test.ts`
Expected: PASS (5 тестов).

- [ ] **Step 5: Commit**

```bash
git add platform/src/lib/exportImport.ts platform/src/lib/exportImport.test.ts
git commit -m "feat: json export import with schema validation"
```

---

## Task 10: Milestones (TDD)

**Files:**
- Create: `platform/src/lib/milestones.ts`
- Test: `platform/src/lib/milestones.test.ts`

- [ ] **Step 1: Написать падающие тесты**

`platform/src/lib/milestones.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildMilestones, FIXED_MILESTONES } from './milestones'

describe('buildMilestones', () => {
  it('adds dynamic final milestone with target capital threshold', () => {
    const milestones = buildMilestones(954370)
    expect(milestones).toHaveLength(5)
    const finale = milestones[4]
    expect(finale.key).toBe('final')
    expect(finale.threshold).toBe(954370)
    expect(finale.emoji).toBe('🎓')
  })

  it('fixed milestones have exact thresholds and keys', () => {
    expect(FIXED_MILESTONES.map((m) => m.key)).toEqual(['m500k', 'm1m', 'm5m', 'm10m'])
    expect(FIXED_MILESTONES[1].threshold).toBe(1000000)
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падают**

Run: `cd platform && npx vitest run src/lib/milestones.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Написать реализацию**

`platform/src/lib/milestones.ts`:

```ts
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
```

- [ ] **Step 4: Запустить — убедиться, что проходят**

Run: `cd platform && npx vitest run src/lib/milestones.test.ts`
Expected: PASS (2 теста).

- [ ] **Step 5: Commit**

```bash
git add platform/src/lib/milestones.ts platform/src/lib/milestones.test.ts
git commit -m "feat: milestone thresholds and texts"
```

---

## Task 11: Zustand store + селекторы (TDD)

**Files:**
- Create: `platform/src/store/useFireStore.ts`, `platform/src/store/selectors.ts`
- Test: `platform/src/store/store.test.ts`

- [ ] **Step 1: Написать падающие тесты**

`platform/src/store/store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useFireStore } from './useFireStore'
import { selectPoints, selectRequiredDeposit, selectTargetCapital, selectCatchUp, selectMaxBalance, selectYearGroups } from './selectors'
import { DEFAULT_PROFILE, type FireData, type MonthEntry } from '../lib/types'
import { monthId } from '../lib/finance/projection'

const NOW = new Date(2026, 7, 15) // август 2026, currentMonthIndex = 7

function month(year: number, month: number, planned: number, actual: number, done: boolean): MonthEntry {
  return { id: monthId(year, month), year, month, age: 28, plannedDeposit: planned, actualDeposit: actual, isCompleted: done }
}

const baseData: FireData = {
  profile: DEFAULT_PROFILE,
  months: [month(2026, 1, 1000, 1000, true), month(2026, 2, 1000, 400, true)],
  meta: { unlockedMilestones: [] },
}

beforeEach(() => {
  useFireStore.getState().importData(baseData, NOW)
})

describe('selectors', () => {
  it('computes target capital and required deposit', () => {
    const profile = useFireStore.getState().profile
    expect(selectTargetCapital(profile)).toBeCloseTo(954387.4, 1)
    expect(selectRequiredDeposit(profile)).toBeCloseTo(1714.38, 1)
  })

  it('projects points with snapshots from entries', () => {
    const points = selectPoints(useFireStore.getState(), NOW)
    expect(points).toHaveLength(264)
    expect(points[0].balance).toBeCloseTo(100000 + 1000 + 100000 * (Math.pow(1.04, 1 / 12) - 1), 2)
    expect(points[7].isFuture).toBe(true)
  })

  it('computes catch-up from past months', () => {
    const result = selectCatchUp(useFireStore.getState(), NOW)
    expect(result?.shortfall).toBeCloseTo(600, 5)
  })

  it('computes max balance and year groups', () => {
    const state = useFireStore.getState()
    expect(selectMaxBalance(state, NOW)).toBeGreaterThan(0)
    const groups = selectYearGroups(state, NOW)
    expect(groups[0].year).toBe(2026)
    expect(groups[0].age).toBe(28)
    expect(groups[0].entries.length).toBe(12)
  })
})

describe('actions', () => {
  it('setProfile updates future planned deposits but keeps past snapshots', () => {
    useFireStore.getState().setProfile({ expectedRealYieldPct: 6 }, NOW)
    const months = useFireStore.getState().months
    const past = months.find((m) => m.id === '2026-01')
    const future = months.find((m) => m.id === '2027-01')
    expect(past?.plannedDeposit).toBe(1000) // снапшот не тронут
    expect(future?.plannedDeposit).not.toBe(1000)
    expect(future?.plannedDeposit).toBeCloseTo(selectRequiredDeposit(useFireStore.getState().profile), 5)
  })

  it('toggleMonthCompleted sets actual to planned when zero', () => {
    useFireStore.getState().setMonthActual('2026-02', 0, NOW)
    useFireStore.getState().toggleMonthCompleted('2026-02')
    const m = useFireStore.getState().months.find((x) => x.id === '2026-02')
    expect(m?.isCompleted).toBe(true)
    expect(m?.actualDeposit).toBe(1000)
  })

  it('setMonthActual clamps negatives to zero', () => {
    useFireStore.getState().setMonthActual('2026-01', -50, NOW)
    expect(useFireStore.getState().months[0].actualDeposit).toBe(0)
  })

  it('importData replaces everything and realigns future plans', () => {
    const imported: FireData = { profile: { ...DEFAULT_PROFILE, name: 'Тест' }, months: [], meta: { unlockedMilestones: ['m500k'] } }
    useFireStore.getState().importData(imported, NOW)
    const state = useFireStore.getState()
    expect(state.profile.name).toBe('Тест')
    expect(state.meta.unlockedMilestones).toEqual(['m500k'])
    expect(state.months).toHaveLength(264)
  })

  it('resetAll restores defaults', () => {
    useFireStore.getState().resetAll(NOW)
    const state = useFireStore.getState()
    expect(state.profile).toEqual(DEFAULT_PROFILE)
    expect(state.months.length).toBeGreaterThan(0)
    expect(state.meta.unlockedMilestones).toEqual([])
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падают**

Run: `cd platform && npx vitest run src/store/store.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Написать store**

`platform/src/store/useFireStore.ts`:

```ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { FireData, FireMeta, MonthEntry, Profile } from '../lib/types'
import { DEFAULT_META, DEFAULT_PROFILE } from '../lib/types'
import { monthId, addMonths } from '../lib/finance/projection'
import { requiredMonthlyDeposit } from '../lib/finance/annuity'
import { STORAGE_KEY } from '../lib/storage/adapter'
import { createLocalStorageAdapter } from '../lib/storage/localStorageAdapter'
import { selectTargetCapital } from './selectors'

export interface FireStoreState extends FireData {
  setProfile(patch: Partial<Profile>, now?: Date): void
  toggleMonthCompleted(id: string): void
  setMonthActual(id: string, value: number, now?: Date): void
  addUnlockedMilestone(key: string): void
  importData(data: FireData, now?: Date): void
  resetAll(now?: Date): void
}

function regenerateMonths(profile: Profile, prevMonths: MonthEntry[], now: Date): MonthEntry[] {
  const totalMonths = (profile.targetAge - profile.currentAge) * 12
  if (totalMonths <= 0) return prevMonths
  const startYear = now.getFullYear()
  const currentMonthIndex = now.getMonth()
  const required = requiredMonthlyDeposit(
    selectTargetCapital(profile),
    profile.initialCapital,
    totalMonths,
    profile.expectedRealYieldPct,
  )
  const byId = new Map(prevMonths.map((m) => [m.id, m]))
  const months: MonthEntry[] = []
  for (let i = 0; i < totalMonths; i++) {
    const { year, month } = addMonths({ year: startYear, month: 1 }, i)
    const id = monthId(year, month)
    const prev = byId.get(id)
    const age = profile.currentAge + Math.floor(i / 12)
    const isFuture = i >= currentMonthIndex
    months.push(
      prev
        ? { ...prev, age, plannedDeposit: isFuture ? required : prev.plannedDeposit }
        : { id, year, month, age, plannedDeposit: required, actualDeposit: 0, isCompleted: false },
    )
  }
  return months
}

function initialData(): FireData {
  const profile = DEFAULT_PROFILE
  return { profile, months: regenerateMonths(profile, [], new Date()), meta: DEFAULT_META }
}

export const useFireStore = create<FireStoreState>()(
  persist(
    (set, get) => ({
      ...initialData(),
      setProfile(patch, now = new Date()) {
        const profile = { ...get().profile, ...patch }
        const totalMonths = (profile.targetAge - profile.currentAge) * 12
        set({ profile, months: totalMonths > 0 ? regenerateMonths(profile, get().months, now) : get().months })
      },
      toggleMonthCompleted(id) {
        set((state) => ({
          months: state.months.map((m) =>
            m.id === id
              ? { ...m, isCompleted: !m.isCompleted, actualDeposit: !m.isCompleted && m.actualDeposit <= 0 ? m.plannedDeposit : m.actualDeposit }
              : m,
          ),
        }))
      },
      setMonthActual(id, value, _now = new Date()) {
        const clamped = Number.isFinite(value) && value >= 0 ? value : 0
        set((state) => ({
          months: state.months.map((m) => (m.id === id ? { ...m, actualDeposit: clamped } : m)),
        }))
      },
      addUnlockedMilestone(key) {
        set((state) => {
          if (state.meta.unlockedMilestones.includes(key)) return state
          const meta: FireMeta = { unlockedMilestones: [...state.meta.unlockedMilestones, key] }
          return { meta }
        })
      },
      importData(data, now = new Date()) {
        set({ profile: data.profile, meta: data.meta, months: regenerateMonths(data.profile, data.months, now) })
      },
      resetAll(now = new Date()) {
        set({ profile: DEFAULT_PROFILE, meta: DEFAULT_META, months: regenerateMonths(DEFAULT_PROFILE, [], now) })
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => createLocalStorageAdapter(window.localStorage)),
      partialize: (s) => ({ profile: s.profile, months: s.months, meta: s.meta }),
    },
  ),
)
```

- [ ] **Step 4: Написать селекторы**

`platform/src/store/selectors.ts`:

```ts
import type { FireData, Profile, ProjectionPoint, MonthEntry } from '../lib/types'
import { annuityPV, requiredMonthlyDeposit } from '../lib/finance/annuity'
import { projectMonths } from '../lib/finance/projection'
import { computeCatchUp, type CatchUpResult } from '../lib/finance/catchup'

export function selectTargetCapital(profile: Profile): number {
  return annuityPV(profile.targetMonthlyIncome, profile.retirementYears * 12, profile.expectedRealYieldPct)
}

export function selectRequiredDeposit(profile: Profile): number {
  return requiredMonthlyDeposit(
    selectTargetCapital(profile),
    profile.initialCapital,
    (profile.targetAge - profile.currentAge) * 12,
    profile.expectedRealYieldPct,
  )
}

export function selectPoints(state: FireData, now: Date = new Date()): ProjectionPoint[] {
  return projectMonths({
    profile: state.profile,
    entries: state.months,
    startYear: now.getFullYear(),
    currentMonthIndex: now.getMonth(),
  })
}

export function selectMaxBalance(state: FireData, now: Date = new Date()): number {
  return selectPoints(state, now).reduce((max, p) => Math.max(max, p.balance), 0)
}

export function selectCatchUp(state: FireData, now: Date = new Date()): CatchUpResult | null {
  return computeCatchUp(state.months, now.getFullYear(), now.getMonth(), state.profile.expectedRealYieldPct)
}

export interface YearGroup {
  year: number
  age: number
  entries: { point: ProjectionPoint; entry: MonthEntry | undefined }[]
  plannedTotal: number
  actualTotal: number
  endBalance: number
}

export function selectYearGroups(state: FireData, now: Date = new Date()): YearGroup[] {
  const points = selectPoints(state, now)
  const byId = new Map(state.months.map((m) => [m.id, m]))
  const groups = new Map<number, YearGroup>()
  for (const point of points) {
    const entry = byId.get(point.id)
    let group = groups.get(point.year)
    if (!group) {
      group = { year: point.year, age: point.age, entries: [], plannedTotal: 0, actualTotal: 0, endBalance: 0 }
      groups.set(point.year, group)
    }
    group.entries.push({ point, entry })
    group.plannedTotal += entry?.plannedDeposit ?? 0
    group.actualTotal += entry?.isCompleted ? entry.actualDeposit : 0
    group.endBalance = point.balance
  }
  return [...groups.values()]
}
```

- [ ] **Step 5: Запустить — убедиться, что проходят**

Run: `cd platform && npx vitest run src/store/store.test.ts`
Expected: PASS (9 тестов). ВНИМАНИЕ: если `selectTargetCapital` toBeCloseTo(954370, -3) не сходится — точность ±0.5×10³, ожидание валидно; при расхождении проверить формулу, не подгонять тест.

- [ ] **Step 6: Commit**

```bash
git add platform/src/store
git commit -m "feat: zustand store with persist and derived selectors"
```

---

## Task 12: Баннер профиля + «догонялки» + анимация цифр

**Files:**
- Create: `platform/src/components/header/AnimatedMoney.tsx`, `ProfileBanner.tsx`, `CatchUpBanner.tsx`
- Test: `platform/src/components/header/header.test.tsx`

- [ ] **Step 1: Написать падающий тест**

`platform/src/components/header/header.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useFireStore } from '../../store/useFireStore'
import type { FireData } from '../../lib/types'
import { DEFAULT_PROFILE } from '../../lib/types'
import { monthId } from '../../lib/finance/projection'
import { ProfileBanner } from './ProfileBanner'
import { CatchUpBanner } from './CatchUpBanner'

const data: FireData = {
  profile: DEFAULT_PROFILE,
  months: [
    { id: monthId(2026, 1), year: 2026, month: 1, age: 28, plannedDeposit: 1714, actualDeposit: 0, isCompleted: false },
  ],
  meta: { unlockedMilestones: [] },
}

beforeEach(() => {
  useFireStore.getState().importData(data)
})

describe('ProfileBanner', () => {
  it('renders name, target capital and yield presets', () => {
    render(<ProfileBanner />)
    expect(screen.getByText('Амир')).toBeInTheDocument()
    expect(screen.getByText('К целевому возрасту')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2%' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '4%' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '6%' })).toBeInTheDocument()
  })
})

describe('CatchUpBanner', () => {
  it('shows banner when behind plan', () => {
    render(<CatchUpBanner />)
    expect(screen.getByText(/увеличивайте взносы/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `cd platform && npx vitest run src/components/header`
Expected: FAIL (module not found).

- [ ] **Step 3: Написать компоненты**

`platform/src/components/header/AnimatedMoney.tsx`:

```tsx
import { motion } from 'framer-motion'

export function AnimatedMoney({ value, className }: { value: string; className?: string }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={className}
    >
      {value}
    </motion.span>
  )
}
```

`platform/src/components/header/ProfileBanner.tsx`:

```tsx
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { formatMoney } from '@/lib/finance/format'
import { useFireStore } from '@/store/useFireStore'
import { selectRequiredDeposit, selectTargetCapital } from '@/store/selectors'
import { AnimatedMoney } from './AnimatedMoney'

const PRESETS = [2, 4, 6]

export function ProfileBanner() {
  const profile = useFireStore((s) => s.profile)
  const setProfile = useFireStore((s) => s.setProfile)
  const targetCapital = selectTargetCapital(profile)
  const required = selectRequiredDeposit(profile)

  return (
    <section className="rounded-2xl border bg-card p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl">
          {profile.avatar.value}
        </div>
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold">{profile.name}</div>
          <div className="text-sm text-muted-foreground">
            Путь к {profile.targetAge} годам · {profile.currency}
          </div>
        </div>
      </div>
      <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-violet-500/10 p-4">
        <div className="text-sm text-muted-foreground">К целевому возрасту</div>
        <AnimatedMoney
          value={formatMoney(targetCapital, profile.currency)}
          className="text-3xl font-bold tabular-nums tracking-tight"
        />
        <div className="mt-2 text-sm text-muted-foreground">
          Базовый взнос:{' '}
          <span className="font-medium text-foreground">{formatMoney(required, profile.currency)}/мес</span>
        </div>
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
```

`platform/src/components/header/CatchUpBanner.tsx`:

```tsx
import { formatMoney } from '@/lib/finance/format'
import { useFireStore } from '@/store/useFireStore'
import { selectCatchUp, selectRequiredDeposit } from '@/store/selectors'

export function CatchUpBanner() {
  const profile = useFireStore((s) => s.profile)
  const catchUp = useFireStore((s) => selectCatchUp(s))
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
```

- [ ] **Step 4: Запустить — убедиться, что проходят**

Run: `cd platform && npx vitest run src/components/header`
Expected: PASS (2 теста).

- [ ] **Step 5: Commit**

```bash
git add platform/src/components/header
git commit -m "feat: profile banner and catch-up banner"
```

---

## Task 13: График портфеля (Recharts)

**Files:**
- Create: `platform/src/components/chart/PortfolioChart.tsx`
- Test: `platform/src/components/chart/PortfolioChart.test.tsx`

- [ ] **Step 1: Написать падающий тест**

`platform/src/components/chart/PortfolioChart.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useFireStore } from '../../store/useFireStore'
import { PortfolioChart } from './PortfolioChart'

beforeEach(() => {
  useFireStore.getState().resetAll()
})

describe('PortfolioChart', () => {
  it('renders toggle and legend', () => {
    render(<PortfolioChart />)
    expect(screen.getByRole('button', { name: 'Сегодняшние деньги' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Номинальные' })).toBeInTheDocument()
    expect(screen.getByText('Вклады')).toBeInTheDocument()
    expect(screen.getByText('Сложный процент')).toBeInTheDocument()
  })

  it('switches mode on toggle click', () => {
    render(<PortfolioChart />)
    fireEvent.click(screen.getByRole('button', { name: 'Номинальные' }))
    expect(screen.getByRole('button', { name: 'Номинальные' })).toHaveClass('bg-primary')
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `cd platform && npx vitest run src/components/chart`
Expected: FAIL (module not found).

- [ ] **Step 3: Написать компонент**

`platform/src/components/chart/PortfolioChart.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatMoney, formatMoneyCompact } from '@/lib/finance/format'
import { useFireStore } from '@/store/useFireStore'
import { selectPoints } from '@/store/selectors'

type Mode = 'real' | 'nominal'

export function PortfolioChart() {
  const profile = useFireStore((s) => s.profile)
  const points = useFireStore((s) => selectPoints(s))
  const [mode, setMode] = useState<Mode>('real')

  const data = useMemo(() => {
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
        <h2 className="font-semibold">Портфель</h2>
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
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
              formatter={(v: number | string, name: string) => [
                formatMoney(Number(v), profile.currency),
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
```

- [ ] **Step 4: Запустить — убедиться, что проходят**

Run: `cd platform && npx vitest run src/components/chart`
Expected: PASS (2 теста).

- [ ] **Step 5: Commit**

```bash
git add platform/src/components/chart
git commit -m "feat: stacked area portfolio chart with real nominal toggle"
```

---

## Task 14: Календарь месяцев

**Files:**
- Create: `platform/src/components/calendar/Calendar.tsx`, `YearSection.tsx`, `MonthCard.tsx`
- Test: `platform/src/components/calendar/calendar.test.tsx`

- [ ] **Step 1: Написать падающие тесты**

`platform/src/components/calendar/calendar.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ProjectionPoint, MonthEntry } from '../../lib/types'
import { MonthCard } from './MonthCard'

const point: ProjectionPoint = {
  id: '2026-01',
  year: 2026,
  month: 1,
  age: 28,
  balance: 105000,
  contributions: 5000,
  interest: 0,
  isFuture: false,
}

const entry: MonthEntry = {
  id: '2026-01',
  year: 2026,
  month: 1,
  age: 28,
  plannedDeposit: 1000,
  actualDeposit: 1000,
  isCompleted: true,
}

describe('MonthCard', () => {
  it('renders completed state with check', () => {
    render(<MonthCard point={point} entry={entry} onToggle={vi.fn()} onActual={vi.fn()} currency="USD" />)
    expect(screen.getByText('Янв 2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Снять отметку' })).toBeInTheDocument()
  })

  it('calls onToggle on click and onActual on input change', () => {
    const onToggle = vi.fn()
    const onActual = vi.fn()
    render(<MonthCard point={point} entry={entry} onToggle={onToggle} onActual={onActual} currency="USD" />)
    fireEvent.click(screen.getByRole('button', { name: 'Снять отметку' }))
    expect(onToggle).toHaveBeenCalled()
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '1500' } })
    expect(onActual).toHaveBeenCalledWith(1500)
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падают**

Run: `cd platform && npx vitest run src/components/calendar`
Expected: FAIL (module not found).

- [ ] **Step 3: Написать компоненты**

`platform/src/components/calendar/MonthCard.tsx`:

```tsx
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { formatMoney, formatMoneyCompact } from '@/lib/finance/format'
import type { Currency, MonthEntry, ProjectionPoint } from '@/lib/types'

export const MONTH_NAMES = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

interface MonthCardProps {
  point: ProjectionPoint
  entry: MonthEntry | undefined
  currency: Currency
  onToggle: () => void
  onActual: (value: number) => void
}

export function MonthCard({ point, entry, currency, onToggle, onActual }: MonthCardProps) {
  const done = entry?.isCompleted ?? false
  const skipped = !point.isFuture && !done
  const tone = done ? 'border-emerald-500/40 bg-emerald-500/5' : skipped ? 'border-rose-500/30 bg-rose-500/5' : 'border-border bg-muted/30'

  return (
    <motion.div layout transition={{ duration: 0.2 }} className={cn('rounded-xl border p-3 space-y-2', tone)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            aria-label={done ? 'Снять отметку' : 'Отметил пополнение'}
            onClick={onToggle}
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors',
              done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-muted-foreground/40 text-transparent',
            )}
          >
            <Check className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">
            {MONTH_NAMES[point.month - 1]} {point.year}
          </span>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">{formatMoneyCompact(point.balance, currency)}</span>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">{point.isFuture ? 'План' : 'Факт'}</label>
        {point.isFuture ? (
          <div className="text-sm tabular-nums">{formatMoney(entry?.plannedDeposit ?? 0, currency)}</div>
        ) : (
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            value={entry?.actualDeposit || ''}
            placeholder="0"
            onChange={(e) => onActual(Number(e.target.value))}
            className="h-9"
            aria-label={`Взнос за ${MONTH_NAMES[point.month - 1]} ${point.year}`}
          />
        )}
      </div>
    </motion.div>
  )
}
```

`platform/src/components/calendar/YearSection.tsx`:

```tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoneyCompact } from '@/lib/finance/format'
import type { Currency } from '@/lib/types'
import type { YearGroup } from '@/store/selectors'
import { useFireStore } from '@/store/useFireStore'
import { MonthCard } from './MonthCard'

export function YearSection({ group, defaultOpen }: { group: YearGroup; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const currency = useFireStore((s) => s.profile.currency) as Currency
  const toggleMonthCompleted = useFireStore((s) => s.toggleMonthCompleted)
  const setMonthActual = useFireStore((s) => s.setMonthActual)

  return (
    <div className="rounded-xl border bg-card">
      <button className="flex w-full items-center justify-between gap-2 p-3 text-left" onClick={() => setOpen((o) => !o)}>
        <span className="font-medium">
          {group.year} — {group.age} лет
        </span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {formatMoneyCompact(group.plannedTotal, currency)} план · {formatMoneyCompact(group.actualTotal, currency)} факт
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 gap-2 p-3 pt-0 md:grid-cols-2">
              {group.entries.map(({ point, entry }) => (
                <MonthCard
                  key={point.id}
                  point={point}
                  entry={entry}
                  currency={currency}
                  onToggle={() => toggleMonthCompleted(point.id)}
                  onActual={(v) => setMonthActual(point.id, v)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

`platform/src/components/calendar/Calendar.tsx`:

```tsx
import { useFireStore } from '@/store/useFireStore'
import { selectYearGroups } from '@/store/selectors'
import { YearSection } from './YearSection'

export function Calendar() {
  const groups = useFireStore((s) => selectYearGroups(s))
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
```

- [ ] **Step 4: Запустить — убедиться, что проходят**

Run: `cd platform && npx vitest run src/components/calendar`
Expected: PASS (2 теста).

- [ ] **Step 5: Commit**

```bash
git add platform/src/components/calendar
git commit -m "feat: monthly calendar with year sections and month cards"
```

---

## Task 15: Настройки + Управление данными

**Files:**
- Create: `platform/src/components/settings/SettingsSheet.tsx`, `platform/src/components/data/DataSheet.tsx`
- Test: `platform/src/components/settings/sheets.test.tsx`

- [ ] **Step 1: Написать падающие тесты**

`platform/src/components/settings/sheets.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useFireStore } from '../../store/useFireStore'
import { SettingsSheet } from './SettingsSheet'
import { DataSheet } from '../data/DataSheet'

beforeEach(() => {
  useFireStore.getState().resetAll()
})

describe('SettingsSheet', () => {
  it('renders all parameter fields', () => {
    render(<SettingsSheet open onOpenChange={() => {}} />)
    expect(screen.getByLabelText('Имя')).toBeInTheDocument()
    expect(screen.getByLabelText('Текущий возраст')).toBeInTheDocument()
    expect(screen.getByLabelText('Целевой возраст')).toBeInTheDocument()
    expect(screen.getByText('Реальная доходность')).toBeInTheDocument()
  })

  it('blocks invalid target age', () => {
    render(<SettingsSheet open onOpenChange={() => {}} />)
    fireEvent.change(screen.getByLabelText('Целевой возраст'), { target: { value: '20' } })
    expect(screen.getByText(/должен быть больше/)).toBeInTheDocument()
  })

  it('switches currency', () => {
    render(<SettingsSheet open onOpenChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'RUB' }))
    expect(useFireStore.getState().profile.currency).toBe('RUB')
  })
})

describe('DataSheet', () => {
  it('renders sync status and action buttons', () => {
    render(<DataSheet open onOpenChange={() => {}} />)
    expect(screen.getByText('Offline Mode')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Экспорт JSON/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Импорт JSON/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Сбросить/ })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падают**

Run: `cd platform && npx vitest run src/components/settings src/components/data`
Expected: FAIL (module not found).

- [ ] **Step 3: Написать SettingsSheet**

`platform/src/components/settings/SettingsSheet.tsx`:

```tsx
import { useState, type ReactNode } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import type { Currency, Profile } from '@/lib/types'
import { useFireStore } from '@/store/useFireStore'

const CURRENCIES: Currency[] = ['USD', 'EUR', 'RUB']
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
  const [error, setError] = useState<string | null>(null)

  const setNumber = (field: 'currentAge' | 'targetAge' | 'retirementYears' | 'initialCapital' | 'targetMonthlyIncome' | 'inflationPct', value: string, min: number) => {
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
    setError(null)
    setProfile(patch)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-sm overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Настройки</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4 pb-8">
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
            <div className="flex rounded-lg border p-0.5">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  className={cn(
                    'flex-1 rounded-md px-2 py-1.5 text-sm transition-colors',
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
            <p className="text-sm text-muted-foreground">Тёмная (по умолчанию). Светлая и системная — в Фазе 3.</p>
          </div>
          {error && <p className="text-sm text-rose-500">{error}</p>}
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 4: Написать DataSheet**

`platform/src/components/data/DataSheet.tsx`:

```tsx
import { useRef, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { downloadJson, parseImport } from '@/lib/exportImport'
import type { FireData } from '@/lib/types'
import { useFireStore } from '@/store/useFireStore'

export function DataSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const parsedRef = useRef<FireData | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const onExport = () => {
    const s = useFireStore.getState()
    downloadJson({ profile: s.profile, months: s.months, meta: s.meta })
    setMessage('Экспортировано ✓')
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const result = parseImport(await file.text())
    if (!result.ok) {
      parsedRef.current = null
      setMessage(result.error)
      return
    }
    parsedRef.current = result.data
    setMessage(`Файл готов: ${result.data.months.length} мес. Нажмите «Применить импорт».`)
  }

  const applyImport = () => {
    if (!parsedRef.current) return
    useFireStore.getState().importData(parsedRef.current)
    parsedRef.current = null
    setMessage('Импортировано ✓')
  }

  const doReset = () => {
    useFireStore.getState().resetAll()
    setConfirmReset(false)
    setMessage('Сброшено к дефолтам ✓')
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full max-w-sm overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Данные</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 pb-8">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Синхронизация</span>
              <Badge variant="secondary">Offline Mode</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Supabase-синк появится в Фазе 2.</p>
            <Separator />
            <Button className="w-full" onClick={onExport}>
              Экспорт JSON
            </Button>
            <Button className="w-full" variant="outline" onClick={() => fileRef.current?.click()}>
              Импорт JSON
            </Button>
            <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={onFile} data-testid="import-file" />
            {parsedRef.current && (
              <Button className="w-full" onClick={applyImport}>
                Применить импорт
              </Button>
            )}
            <Button className="w-full" variant="destructive" onClick={() => setConfirmReset(true)}>
              Сбросить к дефолтам
            </Button>
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
          </div>
        </SheetContent>
      </Sheet>
      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Сбросить все данные?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Все месяцы и настройки вернутся к значениям по умолчанию.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmReset(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={doReset}>
              Сбросить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

- [ ] **Step 5: Запустить — убедиться, что проходят**

Run: `cd platform && npx vitest run src/components/settings src/components/data`
Expected: PASS (4 теста).

- [ ] **Step 6: Commit**

```bash
git add platform/src/components/settings platform/src/components/data
git commit -m "feat: settings sheet and data management sheet"
```

---

## Task 16: Достижения: конфетти + модалка

**Files:**
- Create: `platform/src/hooks/useMilestoneCelebration.ts`, `platform/src/components/milestones/AchievementModal.tsx`
- Test: `platform/src/components/milestones/milestones.test.tsx`

- [ ] **Step 1: Написать падающий тест (confetti замокан)**

`platform/src/components/milestones/milestones.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { useFireStore } from '../../store/useFireStore'
import { useMilestoneCelebration } from '../../hooks/useMilestoneCelebration'
import { AchievementModal } from './AchievementModal'
import { monthId } from '../../lib/finance/projection'

vi.mock('canvas-confetti', () => ({ default: vi.fn() }))

function Probe() {
  const celebration = useMilestoneCelebration()
  return <AchievementModal celebration={celebration} />
}

beforeEach(() => {
  useFireStore.getState().resetAll()
})

describe('milestone celebration', () => {
  it('unlocks and shows modal when balance crosses threshold', () => {
    // Взнос, пробивающий 500k с дефолтными параметрами
    const currentId = monthId(new Date().getFullYear(), new Date().getMonth() + 1)
    useFireStore.getState().setMonthActual(currentId, 500000)
    useFireStore.getState().toggleMonthCompleted(currentId)
    render(<Probe />)
    expect(useFireStore.getState().meta.unlockedMilestones).toContain('m500k')
    expect(screen.getByText('Первые полмиллиона!')).toBeInTheDocument()
  })

  it('does not re-trigger already unlocked milestone', () => {
    useFireStore.getState().addUnlockedMilestone('m500k')
    render(<Probe />)
    expect(screen.queryByText('Первые полмиллиона!')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падают**

Run: `cd platform && npx vitest run src/components/milestones src/hooks`
Expected: FAIL (module not found).

- [ ] **Step 3: Написать хук**

`platform/src/hooks/useMilestoneCelebration.ts`:

```ts
import { useEffect, useMemo, useState } from 'react'
import { buildMilestones } from '@/lib/milestones'
import { useFireStore } from '@/store/useFireStore'
import { selectMaxBalance, selectTargetCapital } from '@/store/selectors'

export interface CelebrationState {
  queue: string[]
  shift: () => void
}

export function useMilestoneCelebration(): CelebrationState {
  const maxBalance = useFireStore((s) => selectMaxBalance(s))
  const unlocked = useFireStore((s) => s.meta.unlockedMilestones)
  const profile = useFireStore((s) => s.profile)
  const addUnlockedMilestone = useFireStore((s) => s.addUnlockedMilestone)
  const [queue, setQueue] = useState<string[]>([])

  const milestones = useMemo(() => buildMilestones(selectTargetCapital(profile)), [profile])

  useEffect(() => {
    const crossed = milestones.filter((m) => maxBalance >= m.threshold && !unlocked.includes(m.key)).map((m) => m.key)
    if (crossed.length === 0) return
    crossed.forEach((key) => addUnlockedMilestone(key))
    setQueue((q) => [...q, ...crossed])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxBalance, unlocked, milestones])

  return { queue, shift: () => setQueue((q) => q.slice(1)) }
}
```

- [ ] **Step 4: Написать модалку**

`platform/src/components/milestones/AchievementModal.tsx`:

```tsx
import { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { buildMilestones } from '@/lib/milestones'
import { useFireStore } from '@/store/useFireStore'
import { selectTargetCapital } from '@/store/selectors'
import type { CelebrationState } from '@/hooks/useMilestoneCelebration'

export function AchievementModal({ celebration }: { celebration: CelebrationState }) {
  const profile = useFireStore((s) => s.profile)
  const current = celebration.queue[0]
  const milestone = current ? buildMilestones(selectTargetCapital(profile)).find((m) => m.key === current) : undefined

  useEffect(() => {
    if (current) {
      confetti({ particleCount: 160, spread: 80, origin: { y: 0.7 } })
    }
  }, [current])

  return (
    <Dialog open={!!milestone} onOpenChange={(o) => !o && celebration.shift()}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="items-center gap-2 text-center">
          <div className="text-6xl" aria-hidden>
            {milestone?.emoji}
          </div>
          <DialogTitle className="text-2xl">{milestone?.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-center">
          <p>{milestone?.text}</p>
          <p className="text-muted-foreground">Отличный шаг, {profile.name}!</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 5: Запустить — убедиться, что проходят**

Run: `cd platform && npx vitest run src/components/milestones src/hooks`
Expected: PASS (2 теста).

- [ ] **Step 6: Commit**

```bash
git add platform/src/hooks platform/src/components/milestones
git commit -m "feat: milestone celebration with confetti and modal"
```

---

## Task 17: Сборка приложения (App.tsx)

**Files:**
- Modify: `platform/src/App.tsx`

- [ ] **Step 1: Заменить заглушку App.tsx**

```tsx
import { useState } from 'react'
import { Database, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProfileBanner } from '@/components/header/ProfileBanner'
import { CatchUpBanner } from '@/components/header/CatchUpBanner'
import { PortfolioChart } from '@/components/chart/PortfolioChart'
import { Calendar } from '@/components/calendar/Calendar'
import { SettingsSheet } from '@/components/settings/SettingsSheet'
import { DataSheet } from '@/components/data/DataSheet'
import { AchievementModal } from '@/components/milestones/AchievementModal'
import { useMilestoneCelebration } from '@/hooks/useMilestoneCelebration'

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dataOpen, setDataOpen] = useState(false)
  const celebration = useMilestoneCelebration()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-md space-y-4 px-4 pb-16 pt-6">
        <ProfileBanner />
        <CatchUpBanner />
        <PortfolioChart />
        <Calendar />
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setSettingsOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Настройки
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => setDataOpen(true)}>
            <Database className="mr-2 h-4 w-4" />
            Данные
          </Button>
        </div>
      </div>
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
      <DataSheet open={dataOpen} onOpenChange={setDataOpen} />
      <AchievementModal celebration={celebration} />
    </div>
  )
}
```

- [ ] **Step 2: Проверить сборку и все юнит-тесты**

Run:
```bash
cd platform && npm run build
npm run test
```
Expected: build успешен; все тесты PASS.

- [ ] **Step 3: Визуальная проверка в dev-режиме**

Run: `cd platform && npm run dev`
Проверить в браузере (webapp-testing): тёмная тема, баннер профиля с $954K+, график, календарь 264 месяца, toggle месяца пересчитывает цифры, слайдер доходности живой, конфетти при +500k взносе, экспорт/импорт работают.

- [ ] **Step 4: Commit**

```bash
git add platform/src/App.tsx
git commit -m "feat: assemble app layout with sheets and modal"
```

---

## Task 18: PWA: манифест, иконки, service worker

**Files:**
- Create: `platform/public/fire-icon.svg`, `platform/pwa-assets.config.ts`
- Modify: `platform/vite.config.ts`, `platform/src/main.tsx`

- [ ] **Step 1: Создать SVG-иконку**

`platform/public/fire-icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#09090b"/>
  <path fill="#f59e0b" d="M256 88c0 56-18 92-18 92s36-18 36-56c0 0 56 28 56 102 0 74-37 139-93 158-56-19-93-84-93-158 0-56 37-102 112-138z"/>
  <path fill="#fbbf24" d="M234 306c0 22 10 34 28 34s28-12 28-34c0-32-28-70-28-70s-28 38-28 70z"/>
</svg>
```

- [ ] **Step 2: Создать конфиг генератора иконок**

`platform/pwa-assets.config.ts`:

```ts
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: minimal2023Preset,
  images: ['public/fire-icon.svg'],
})
```

- [ ] **Step 3: Сгенерировать иконки**

Run: `cd platform && npm run icons`
Expected: в `public/` появились `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `favicon.ico`.

- [ ] **Step 4: Включить VitePWA в vite.config.ts**

Добавить в `vite.config.ts` (import + plugins):

```ts
import { VitePWA } from 'vite-plugin-pwa'

// в plugins: [react(), tailwindcss(), VitePWA({...})]
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['fire-icon.svg', 'apple-touch-icon-180x180.png'],
  manifest: {
    name: 'FIRE Tracker',
    short_name: 'FIRE',
    description: 'Трекер финансовой независимости',
    lang: 'ru',
    theme_color: '#09090b',
    background_color: '#09090b',
    display: 'standalone',
    start_url: '/',
    icons: [
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
    navigateFallback: 'index.html',
  },
})
```

- [ ] **Step 5: Зарегистрировать service worker в main.tsx**

Добавить в начало `platform/src/main.tsx`:

```ts
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })
```

- [ ] **Step 6: Сборка и проверка**

Run:
```bash
cd platform && npm run build
npm run test
```
Expected: build успешен (в dist/: manifest.webmanifest, sw.js, registerSW.js), тесты PASS.

- [ ] **Step 7: Commit**

```bash
git add platform/public platform/pwa-assets.config.ts platform/vite.config.ts platform/src/main.tsx
git commit -m "feat: pwa manifest service worker and icons"
```

---

## Task 19: E2E-смоук (Playwright)

**Files:**
- Create: `platform/playwright.config.ts`, `platform/e2e/fire.spec.ts`
- Modify: `platform/package.json` (скрипт e2e уже есть)

- [ ] **Step 1: Установить браузер Playwright**

Run: `cd platform && npx playwright install chromium`
Expected: chromium установлен.

- [ ] **Step 2: Создать конфиг**

`platform/playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
})
```

- [ ] **Step 3: Написать смоук-тесты**

`platform/e2e/fire.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('first run shows defaults', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Амир')).toBeVisible()
  await expect(page.getByText('К целевому возрасту')).toBeVisible()
  await expect(page.getByText(/Базовый взнос/)).toBeVisible()
  await expect(page.getByText('План взносов')).toBeVisible()
})

test('marking current month as completed shows check state', async ({ page }) => {
  await page.goto('/')
  const toggle = page.getByRole('button', { name: 'Отметил пополнение' }).first()
  await toggle.click()
  await expect(page.getByRole('button', { name: 'Снять отметку' }).first()).toBeVisible()
})

test('export → reset → import roundtrip', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Данные' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Экспорт JSON' }).click()
  const download = await downloadPromise
  const filePath = await download.path()
  await page.getByRole('button', { name: 'Сбросить к дефолтам' }).click()
  await page.getByRole('button', { name: 'Сбросить', exact: true }).click()
  await page.getByTestId('import-file').setInputFiles(filePath ?? '')
  await page.getByRole('button', { name: 'Применить импорт' }).click()
  await expect(page.getByText('Амир')).toBeVisible()
})

test('app works offline via service worker', async ({ page, context }) => {
  await page.goto('/')
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 15_000 })
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByText('К целевому возрасту')).toBeVisible()
})
```

- [ ] **Step 4: Запустить e2e**

Run: `cd platform && npm run e2e`
Expected: 4 теста × 2 проекта = 8 PASS. При падении offline-теста: убедиться, что SW зарегистрирован (dev-режим не используется, только preview поверх build), и что тест ждёт `serviceWorker.controller`.

- [ ] **Step 5: Commit**

```bash
git add platform/playwright.config.ts platform/e2e
git commit -m "test: e2e smoke via playwright"
```

---

## Task 20: Деплой на Vercel + верификация

**Files:**
- Create: `platform/vercel.json`

- [ ] **Step 1: Создать vercel.json**

`platform/vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

- [ ] **Step 2: Commit и push**

```bash
git add platform/vercel.json
git commit -m "chore: vercel deploy config"
git push origin master
```

- [ ] **Step 3: Подключить репозиторий на Vercel**

Действия пользователя (Vercel Dashboard → Add New → Project → Import `kimci621/FIRE`):
- Framework Preset: **Vite**
- Root Directory: **platform**
- Build/Output — из `vercel.json` (автоматически)
- Deploy. Далее автодеплой на каждый push в `master`.

Альтернатива (CLI, если установлен и выполнен `vercel login`):
```bash
cd platform && npx vercel --prod --yes
```

- [ ] **Step 4: Верификация**

Run:
```bash
curl -sI https://<project-url> | head -3
```
Expected: HTTP/2 200. Затем веб-приёмка по чек-листу (webapp-testing):
- [ ] Открывается с мобильного viewport, тёмная тема
- [ ] PWA устанавливается (Lighthouse PWA ≥ 90)
- [ ] Офлайн-режим работает после первого визита
- [ ] Экспорт → сброс → импорт восстанавливает состояние
- [ ] Конфетти при пересечении порога 500k

- [ ] **Step 5: Финальный коммит состояния**

```bash
git status
git push origin master
```
Expected: working tree clean, всё запушено. Фаза 1 завершена — критерии готовности из ТЗ (раздел 10) выполнены.

---

## Приложение: порядок проверки при сбоях

| Симптом | Где смотреть |
|---------|--------------|
| Тест падает из-за типа | `src/lib/types.ts` — сигнатуры должны совпадать 1-в-1 с планом |
| tsc ошибки в UI-компонентах | shadcn-компоненты импортируются из `@/components/ui/*`; alias в vite.config.ts и tsconfig.app.json |
| Recharts не рендерится в тестах | `src/test/setup.ts` — ResizeObserver-стаб обязателен |
| Persist-состояние «протекает» между тестами | вызывать `useFireStore.getState().resetAll()` в beforeEach; localStorage очищается setup'ом persist |
| Offline e2e падает | SW кеширует только после первого load; ждать `serviceWorker.controller` |
| Конфетти-модалка не появляется | milestone-порог сверяется с `maxBalance` прогноза; id текущего месяца вычислять через `monthId`, не хардкодить |

---

## Task 21: Предупреждение о повреждённом хранилище (ТЗ, раздел 8)

> **Порядок:** выполняется сразу после Task 15. Финальная последовательность: …14 → 15 → 21 → 16 → 17 → 18 → 19 → 20.

**Files:**
- Create: `platform/src/hooks/useStorageHealth.ts`, `platform/src/components/data/StorageWarning.tsx`
- Test: `platform/src/components/data/StorageWarning.test.tsx`
- Modify: `platform/src/App.tsx` (в Task 17 добавить `<StorageWarning />`)

- [ ] **Step 1: Написать падающий тест**

`platform/src/components/data/StorageWarning.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useFireStore } from '../../store/useFireStore'
import { STORAGE_KEY } from '../../lib/storage/adapter'
import { StorageWarning } from './StorageWarning'

beforeEach(() => {
  window.localStorage.clear()
  useFireStore.getState().resetAll()
})

describe('StorageWarning', () => {
  it('shows warning when storage is corrupted', () => {
    window.localStorage.setItem(STORAGE_KEY, '{oops')
    render(<StorageWarning />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('clears corruption and resets on click', () => {
    window.localStorage.setItem(STORAGE_KEY, '{oops')
    render(<StorageWarning />)
    fireEvent.click(screen.getByRole('button', { name: /Сбросить данные/ }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    // persist перезапишет ключ валидным JSON после resetAll
    expect(() => JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).not.toThrow()
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `cd platform && npx vitest run src/components/data`
Expected: FAIL (module not found).

- [ ] **Step 3: Написать хук и компонент**

`platform/src/hooks/useStorageHealth.ts`:

```ts
import { useState } from 'react'
import { STORAGE_KEY } from '@/lib/storage/adapter'

export function useStorageHealth(): { corrupt: boolean; clear: () => void } {
  const [corrupt, setCorrupt] = useState<boolean>(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    try {
      JSON.parse(raw)
      return false
    } catch {
      return true
    }
  })
  const clear = () => {
    window.localStorage.removeItem(STORAGE_KEY)
    setCorrupt(false)
  }
  return { corrupt, clear }
}
```

`platform/src/components/data/StorageWarning.tsx`:

```tsx
import { Button } from '@/components/ui/button'
import { useStorageHealth } from '@/hooks/useStorageHealth'
import { useFireStore } from '@/store/useFireStore'

export function StorageWarning() {
  const { corrupt, clear } = useStorageHealth()
  if (!corrupt) return null
  return (
    <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm space-y-2">
      <p>Локальные данные повреждены. Сбросьте их к значениям по умолчанию, чтобы продолжить.</p>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => {
          clear()
          useFireStore.getState().resetAll()
        }}
      >
        Сбросить данные
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Добавить в App.tsx**

В Task 17 (App.tsx) добавить: import `StorageWarning` из `@/components/data/StorageWarning` и разместить `<StorageWarning />` сразу после `<ProfileBanner />`.

- [ ] **Step 5: Запустить — убедиться, что проходят**

Run: `cd platform && npx vitest run src/components/data`
Expected: PASS (4 теста: 2 из Task 15 + 2 новых).

- [ ] **Step 6: Commit**

```bash
git add platform/src/hooks/useStorageHealth.ts platform/src/components/data
git commit -m "feat: corrupted storage warning with reset action"
```

---

## Self-review (выполнен автором плана)

1. **Spec coverage:** все разделы ТЗ покрыты задачами. Стек (1–2, 13, 18, 19, 20), модель данных (3, 8, 9, 11), экраны (12–17, 21), поведение: reactive/snapshot (11), «догонялки» (6, 12), геймификация (10, 16), реальные/номинальные (13), валидация и предупреждение о валюте (15), повреждённое хранилище (21), PWA офлайн (18), импорт/экспорт (9, 15), критерии готовности (19, 20).
2. **Placeholder scan:** пройден — весь код приведён полностью, «TBD» отсутствуют.
3. **Type consistency:** сигнатуры `importData(data, now?)`, `setMonthActual(id, value, now?)`, `resetAll(now?)`, `selectPoints(state, now?)` согласованы между задачами; `MonthEntry`/`ProjectionPoint`/`YearGroup` совпадают с Task 3/11; импорт `monthId` из `lib/finance/projection` в тестах Task 16/19 соответствует его экспорту в Task 5.
