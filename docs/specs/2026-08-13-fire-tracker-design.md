# ТЗ: FIRE Tracker

**Дата:** 2026-08-13
**Статус:** утверждено пользователем
**Роль документа:** единственный источник истины для всей работы над проектом.
Агенты `platform-architect`, `designer`, `developer` работают строго по этому ТЗ.
Изменения решений — только через пользователя.

---

## 1. Цель и рамки

FIRE Tracker — mobile-first Progressive Web App для отслеживания пути к финансовой независимости
(early retirement). Один пользователь ведёт календарь ежемесячных пополнений; финансовый движок
пересчитывает прогноз капитала к целевому возрасту (аннуитет + сложный процент) и даёт рекомендации
«догонялок» при отставании от плана.

**Жёсткие рамки:**
- Приложение 100% клиентское: все расчёты в браузере, сервер не нужен
- Offline-first: полный функционал без интернета (localStorage), sync — опциональная надстройка
- Один пользователь на устройство; cross-device sync через аккаунт Supabase (Фаза 2)
- UI и документация — на русском, код и коммиты — на английском
- Деплой: Vercel (статический билд Vite)

## 2. Технологический стек

| Слой | Технология | Обоснование |
|------|-----------|-------------|
| Фреймворк | React 19 + Vite + TypeScript (strict) | 100% клиентское приложение, быстрая сборка, типы для финансового ядра |
| Стили/UI | Tailwind CSS + shadcn/ui + Lucide + Framer Motion + canvas-confetti | По брифу; shadcn даёт доступные компоненты (dialog, slider, switch) |
| Графики | Recharts | Декларативный React-API, AreaChart со стеком из коробки |
| State | Zustand + persist-middleware → localStorage | Производные через селекторы; persist решает offline-first |
| Storage-абстракция | Интерфейс `StorageAdapter` | Сейчас localStorage, в Фазе 2 — Supabase, без переделки UI |
| PWA | vite-plugin-pwa (Workbox) | Manifest + service worker + offline из коробки |
| Тесты | Vitest + React Testing Library, Playwright (смоук) | Юниты движка, скриншот-смоук приложения |
| Sync (Фаза 2) | @supabase/supabase-js | Auth (email OTP) + PostgreSQL, local-first |
| Деплой | Vercel | HTTPS из коробки (нужен для service worker) |

## 3. Структура проекта

```
FIRE/
├── platform/                     # приложение (React + Vite)
│   ├── index.html
│   ├── vite.config.ts            # + vite-plugin-pwa (manifest, SW)
│   ├── tsconfig.json
│   ├── package.json
│   ├── public/                   # PWA-иконки, favicon
│   └── src/
│       ├── main.tsx / App.tsx
│       ├── lib/
│       │   ├── finance/          # ФИНАНСОВОЕ ЯДРО (чистые TS-функции, без React)
│       │   │   ├── annuity.ts    # PV аннуитета, PMT, ставки
│       │   │   ├── projection.ts # помесячный прогноз, слои вклады/проценты
│       │   │   ├── catchup.ts    # «догонялки»
│       │   │   └── format.ts     # форматирование валют (Intl)
│       │   ├── storage/          # StorageAdapter
│       │   │   ├── adapter.ts    # интерфейс
│       │   │   ├── localStorageAdapter.ts
│       │   │   └── supabaseAdapter.ts   # заглушка → Фаза 2
│       │   ├── milestones.ts     # пороги, тексты достижений
│       │   └── exportImport.ts   # JSON export/import/валидация
│       ├── store/useFireStore.ts # Zustand + persist
│       ├── components/
│       │   ├── ui/               # shadcn/ui
│       │   ├── header/           # профиль, streak, карточка капитала
│       │   ├── chart/            # Recharts: stacked area + toggle
│       │   ├── calendar/         # годы → месяцы, toggle, ввод взноса
│       │   ├── milestones/       # confetti + achievement modal
│       │   └── settings/         # drawer настроек, импорт/экспорт
│       └── styles/               # Tailwind, токены, тема
├── e2e/                          # Playwright-смоук
├── docs/
│   ├── specs/                    # ТЗ (этот документ)
│   └── superpowers/plans/        # планы реализации
├── skills/                       # агенты
├── Makefile                      # setup / dev / test / e2e / build / serve
├── AGENTS.md
└── CLAUDE.md
```

`dist/` — результат сборки, в `.gitignore`.

**Makefile:**
- `make setup` — npm install
- `make dev` — vite dev server
- `make test` — vitest run
- `make e2e` — playwright test
- `make build` — vite build → `dist/`
- `make serve` — vite preview

## 4. Модель данных

### 4.1. Профиль

```ts
interface Profile {
  name: string;
  avatar: { type: 'emoji' | 'image'; value: string };
  currency: 'USD' | 'EUR' | 'RUB';  // default: 'USD'
  currentAge: number;            // 28
  targetAge: number;             // 50
  retirementYears: number;       // 25
  initialCapital: number;        // 100 000 (USD-дефолт)
  targetMonthlyIncome: number;   // 5 000 (USD-дефолт)
  expectedRealYieldPct: number;  // 4.0, слайдер 1.0–10.0
  inflationPct: number;          // 8.0 — для «номинального» режима
  theme: 'dark' | 'light' | 'system';
}
```

Валюта: набор USD / EUR / RUB, по умолчанию USD. Форматирование — `Intl.NumberFormat`
с кодом валюты. Смена валюты **не конвертирует** уже введённые суммы — только переобозначает;
в UI предупреждение об этом.

### 4.2. Месяц

```ts
interface MonthEntry {
  id: string;              // "YYYY-MM"
  year: number;
  month: number;           // 1–12
  age: number;             // возраст пользователя в этом месяце
  plannedDeposit: number;  // расчётный взнос (снапшот на момент создания)
  actualDeposit: number;   // фактический (редактируемый)
  isCompleted: boolean;
  notes?: string;
}
```

### 4.3. Производные величины (derived state, не хранятся)

- **Месячная реальная ставка:** `r = (1 + yield)^(1/12) − 1`, где `yield = expectedRealYieldPct / 100`
- **Целевой капитал** — PV аннуитета (выплаты в конце месяца):
  `targetCapital = targetMonthlyIncome × (1 − (1+r)^−N) / r`, `N = retirementYears × 12`
- **Требуемый взнос** — PMT с учётом стартового капитала:
  `targetCapital − initialCapital×(1+r)^M = PMT × ((1+r)^M − 1) / r`, `M = (targetAge − currentAge) × 12`
- **Прогноз (помесячная итерация, месяцы от текущего возраста до targetAge):**
  - `interest = balance × r`
  - `deposit = isCompleted ? actualDeposit : (isFuture ? plannedDeposit : 0)`
  - `balance = balance + interest + deposit`
  - Параллельно копятся слои: **вклады** (sum deposit) и **сложный процент** (sum interest)
- **«Догонялки»:** недобор = Σ(planned − actual) по прошедшим месяцам → дополнительный PMT
  на Y = 12 месяцев, округление до 100 единиц валюты

### 4.4. Хранение

- **localStorage:** ключ `fire-tracker-storage-v1` = `{ profile, months, meta }`
  (`meta.unlockedMilestones: string[]`). Версионировано под миграции.
- **Экспорт JSON:** `{ version: 1, exportedAt, profile, months, meta }`
- **Supabase (Фаза 2):**
  - `profiles(user_id uuid, data jsonb, updated_at timestamptz)` — PK user_id
  - `months(user_id uuid, id text, data jsonb, updated_at timestamptz)` — PK (user_id, id)
  - RLS по user_id; синк last-write-wins по `updated_at`

## 5. Экраны / Интерфейсы

Single-page PWA, мобильный портрет в приоритете (360px+), на десктопе — центрированная колонка.

### Экран 1. Dashboard (главный)

- **Header/баннер профиля:** аватар + имя + streak «🔥 N месяцев подряд» (Фаза 2);
  карточка «К целевому возрасту: **N**» + строка «Базовый взнос: **N/мес**» (в валюте профиля);
  слайдер доходности с пресетами 2/4/6% (Framer Motion-переход цифр).
- **Catch-up баннер** (при недоборе): «Чтобы восстановить график к 50 годам, увеличивайте
  взносы на +X/мес в течение следующих Y месяцев». При недоборе > 3× плана — примечание
  «или сдвиньте целевой возраст».
- **Аналитика:** stacked area chart (Emerald = вклады, Violet = сложный процент), легенда,
  toggle «Сегодняшние деньги / Номинальные» (только отображение: умножение на `(1+inf)^лет`).
- **Календарь месяцев:** группы по годам с возрастом («2026 — 28 лет»), коллапс-карточки года
  с итогами (план/факт/дельта); карточки месяцев: зелёная галочка (пополнено) / серый (пропущен) /
  нейтральный (будущий), tap = toggle «Отметил пополнение», инпут фактического взноса
  (numeric keypad), итог портфеля на конец месяца.
- Состояния: первый запуск → дефолты из брифа; повреждённый localStorage → предложение сброса.

### Экран 2. Settings (drawer/sheet)

Имя, аватар (эмодзи-пресеты; загрузка фото — Фаза 3), валюта (USD/EUR/RUB), возраст,
целевой возраст, срок выплат, стартовый капитал, целевой доход, слайдер реальной доходности
1–10%, инфляция, тема (dark дефолт; light/system — Фаза 3). Все изменения — live-пересчёт.
Валидация: `targetAge > currentAge`, суммы > 0; иначе поле подсвечивается, сохранение блокируется.

### Экран 3. Achievement modal + Hall of Badges

При пересечении порога — canvas-confetti + модалка с текстом достижения и именем
(«Отличный шаг, Амир!»). Hall of Badges: полученные и следующие ачивки с прогресс-барами
(сам hall — Фаза 3; триггеры конфетти — в MVP).

### Экран 4. Data Management (drawer)

Sync status («Offline Mode» в Фазе 1 → «Online Sync» в Фазе 2). Export JSON (blob + `a[download]`),
Import JSON (валидация схемы/версии, предпросмотр «N месяцев, профиль» перед заменой,
несовместимая версия → отклонение с сообщением), Reset к дефолтам (с подтверждением).

## 6. Поведение и логика

- **Reactive движок:** все производные — derived state (селекторы Zustand), пересчёт синхронно
  при любом изменении профиля или месяца. Дублирования данных нет.
- **Снапшот плана:** `plannedDeposit` пересчитывается только для будущих месяцев; у прошедших
  сохраняется план, действовавший на тот момент. «Догонялки» считаются от снапшотов.
- **Движок всегда в реальных деньгах**; номинальный режим — только отображение.
- **Геймификация:** milestone срабатывает, когда баланс на конец месяца прогноза (или текущий
  фактический) пересекает порог; разблокировка — в `meta.unlockedMilestones`, повторно не срабатывает.
- **Пороги:** 500 000 («Первые полмиллиона! Фундамент заложен! 🧱»), 1 000 000 («1 МИЛЛИОН!
  Вы в топ 10% накоплений! 🚀»), 5 000 000 («5 Миллионов! Сложный процент теперь генерирует
  больше, чем взносы! ⚡»), 10 000 000 («10 Миллионов! Половина пути к абсолютной свободе! 🏰»),
  targetCapital («ФИНАЛ! Финансовая независимость достигнута! 🎓»). Суммы — в валюте профиля.
- **PWA:** manifest (тёмная тема, иконки 192/512), service worker: precache + runtime-cache →
  полный офлайн. Локальные напоминания о взносе (Notification API) — Фаза 2.

## 7. Дизайн-система

- **Тема:** sleek dark fintech, по умолчанию тёмная. Фон Slate/Zinc, поверхности с мягкими
  границами, акцент Emerald (пополнения, успех), Violet/Indigo (сложный процент, прогноз).
- **Типографика:** системные шрифты, крупные цифры для денег (tabular-nums), иерархия заголовков.
- **Компоненты (shadcn/ui + Lucide):** button, card, dialog, slider, switch, input, drawer/sheet —
  с крупными touch-targets (≥ 44px).
- **Микро-взаимодействия:** Framer Motion layout-переходы при отметке месяцев и движении
  слайдеров; анимации только на transform/opacity, 60fps на мобильных.
- **Адаптивность:** mobile-first, проверка 360px–1024px; числовые инпуты открывают цифровую клавиатуру.

## 8. Крайние случаи

| Ситуация | Поведение |
|----------|----------|
| `targetAge ≤ currentAge` или неположительные суммы | Валидация в настройках, сохранение блокируется |
| Недобор > 3× плана | Баннер с честной цифрой + примечание «или сдвиньте целевой возраст» |
| Completed-месяц без введённого взноса | Считается по `actualDeposit`; 0 → месяц «пропущен» (серый) |
| Повреждённый localStorage | При старте — предложение сброса к дефолтам |
| Снятие отметки completed | Месяц → пропущен, слои и прогноз пересчитываются |
| Импорт несовместимой версии | Отклонение с сообщением |
| Високосные годы / длина месяцев | Не влияют: гранулярность — месяц |
| Смена валюты | Суммы не конвертируются, только переобозначаются; предупреждение в UI |

## 9. Тестирование

- **Юнит (Vitest):** `lib/finance/*` — 100% покрытие: PV, PMT, итерация прогноза, слои,
  «догонялки», снапшот плана, реальные/номинальные, крайние случаи (нулевая доходность,
  нулевой капитал, отставание). Форматеры валют. Импорт/экспорт: валидные, битые, чужие версии.
- **Компонентные (React Testing Library):** toggle месяца, ввод взноса, слайдеры, модалки.
- **E2E (Playwright, смоук):** первый запуск → дефолты; отметка месяца → пересчёт;
  экспорт/импорт; офлайн-режим (SW); PWA manifest валиден.
- **TDD:** каждый юнит — сначала падающий тест (RED), затем реализация (GREEN), коммит на задачу.

## 10. Критерии готовности

- [ ] `make test` — зелёный (движок 100% покрыт)
- [ ] `make build` — успешен, `make serve` — приложение работает
- [ ] PWA: устанавливается, работает офлайн, manifest валиден (Lighthouse)
- [ ] Все экраны Фазы 1 соответствуют разделу 5, тёмная тема дефолтная
- [ ] Экспорт → сброс → импорт восстанавливает состояние 1-в-1
- [ ] Milestone-конфетти срабатывает при пересечении порога и не повторяется
- [ ] Задеплоено на Vercel, открывается с мобильного

## 11. Фазы реализации

1. **Фаза 1 — MVP:** скаффолд (Vite+React+TS+Tailwind+shadcn+PWA, Makefile) → финансовое ядро
   (TDD) → store+persist+StorageAdapter+импорт/экспорт → UI (дизайн-система → header → календарь →
   график → настройки → data drawer) → геймификация MVP (триггеры+confetti+модалка) → PWA →
   e2e-смоук → деплой на Vercel.
2. **Фаза 2 — Sync и напоминания:** **забрать у пользователя доступы Supabase (URL, anon key,
   service key для миграций)** → проект + SQL-схема (profiles, months, RLS) + Auth (email OTP) →
   SupabaseAdapter (last-write-wins, статус в data drawer) → streak-счётчик → локальные уведомления.
3. **Фаза 3 — Полировка:** Hall of Badges, загрузка аватара, светлая/system тема, анимации,
   крайние состояния, перфоманс.

---

## Приложение: дефолты профиля

```json
{
  "name": "Амир",
  "avatar": { "type": "emoji", "value": "🚀" },
  "currency": "USD",
  "currentAge": 28,
  "targetAge": 50,
  "retirementYears": 25,
  "initialCapital": 100000,
  "targetMonthlyIncome": 5000,
  "expectedRealYieldPct": 4.0,
  "inflationPct": 8.0,
  "theme": "dark"
}
```
