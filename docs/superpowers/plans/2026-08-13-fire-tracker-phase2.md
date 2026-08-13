# FIRE Tracker — Фаза 2 (Supabase sync + уведомления + streak) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cross-device sync через Supabase (Auth email-OTP + PostgreSQL, last-write-wins), статус синка в DataSheet, streak-счётчик в баннере, локальные напоминания о взносе.

**Architecture:** Supabase JS-клиент (v2, `@supabase/supabase-js`) за интерфейсом `StorageAdapter`-логики в `lib/supabase/` + `lib/sync/`. Офлайн-первый: localStorage остаётся источником истины, облако — реплика. Синк: pull (remote новее → применяем) → push (local новее → upsert), конфликты по `updated_at` per-row (last-write-wins). `meta.lastModified` хранит локальные таймстемпы изменений. Auth: email → 6-значный OTP-код (без redirect-ссылок — PWA-friendly).

**Tech Stack:** @supabase/supabase-js, существующий стек Фазы 1.

**Спецификация:** `docs/specs/2026-08-13-fire-tracker-design.md` (разделы 4.4, 5.4, 11-Фаза 2). При расхождении — правь план, не спеку.

**Креды (не коммитить):** URL `https://dyczemxbjfxgvlkqduoj.supabase.co`; anon key — в `platform/.env` (gitignored) и в Vercel env vars; service_role — НЕ используется в коде (SQL исполняет пользователь вручную в Dashboard).

**Разовое действие пользователя (до Task 4):** выполнить `supabase/schema.sql` в Supabase Dashboard → SQL Editor → Run; в Authentication → Providers → Email включить «Email OTP» (если пункта нет — оставить Magic Link, код-флоу работает на `signInWithOtp`/`verifyOtp`).

---

## Task 1: Схема БД, env, зависимости

**Files:**
- Create: `supabase/schema.sql`, `platform/.env`, `platform/.env.example`, `platform/src/lib/supabase/client.ts`
- Modify: `platform/.gitignore`, `platform/package.json` (+ `@supabase/supabase-js`)

- [ ] **Step 1: Создать SQL-схему**

`supabase/schema.sql`:

```sql
-- FIRE Tracker: cloud replica tables (local-first, last-write-wins by updated_at)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.months (
  user_id uuid references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.profiles enable row level security;
alter table public.months enable row level security;

drop policy if exists "own profiles" on public.profiles;
create policy "own profiles" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own months" on public.months;
create policy "own months" on public.months
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- [ ] **Step 2: env-файлы**

`platform/.env` (локально, НЕ коммитить — уже в .gitignore после Step 3):

```env
VITE_SUPABASE_URL=https://dyczemxbjfxgvlkqduoj.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key из чата>
```

`platform/.env.example` (коммитить):

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

- [ ] **Step 3: .gitignore + зависимость**

Добавить в `platform/.gitignore`:

```gitignore
.env
.env.local
```

Run: `cd platform && npm install @supabase/supabase-js`

- [ ] **Step 4: Клиент с graceful degradation**

`platform/src/lib/supabase/client.ts`:

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseEnabled = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = supabaseEnabled
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: window.localStorage,
      },
    })
  : null
```

- [ ] **Step 5: Сборка + Commit**

Run: `cd platform && npm run build`
Expected: успешно.

```bash
git add -A
git commit -m "chore: supabase schema, env config and client"
```

---

## Task 2: Локальные таймстемпы изменений (meta.lastModified) — TDD

**Files:**
- Modify: `platform/src/lib/types.ts`, `platform/src/lib/exportImport.ts`, `platform/src/store/useFireStore.ts`
- Test: `platform/src/store/lastModified.test.ts`

- [ ] **Step 1: Падающие тесты**

`platform/src/store/lastModified.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useFireStore } from './useFireStore'
import { DEFAULT_PROFILE, type FireData, type MonthEntry } from '../lib/types'
import { monthId } from '../lib/finance/projection'

const NOW = new Date(2026, 7, 15)

function month(year: number, month: number): MonthEntry {
  return { id: monthId(year, month), year, month, age: 28, plannedDeposit: 1714, actualDeposit: 0, isCompleted: false }
}

const baseData: FireData = {
  profile: DEFAULT_PROFILE,
  months: [month(2026, 1)],
  meta: { unlockedMilestones: [] },
}

beforeEach(() => {
  useFireStore.getState().importData(baseData, NOW)
})

describe('lastModified bookkeeping', () => {
  it('bumps profile timestamp on setProfile', () => {
    useFireStore.getState().setProfile({ name: 'Тест' }, NOW)
    expect(useFireStore.getState().meta.lastModified?.profile).toBeDefined()
  })

  it('bumps month timestamp on setMonthActual and toggle', () => {
    useFireStore.getState().setMonthActual('2026-01', 500, NOW)
    const t1 = useFireStore.getState().meta.lastModified?.months?.['2026-01']
    expect(t1).toBeDefined()
    useFireStore.getState().toggleMonthCompleted('2026-01')
    const t2 = useFireStore.getState().meta.lastModified?.months?.['2026-01']
    expect(t2).toBeDefined()
  })

  it('clears per-month timestamps on importData', () => {
    useFireStore.getState().setMonthActual('2026-01', 500, NOW)
    useFireStore.getState().importData(baseData, NOW)
    const lm = useFireStore.getState().meta.lastModified
    expect(lm?.profile).toBeDefined()
    expect(lm?.months?.['2026-01']).toBeUndefined()
  })

  it('survives export/import roundtrip', async () => {
    useFireStore.getState().setMonthActual('2026-01', 500, NOW)
    const { exportJson, parseImport } = await import('../lib/exportImport')
    const s = useFireStore.getState()
    const result = parseImport(exportJson({ profile: s.profile, months: s.months, meta: s.meta }))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.meta.lastModified?.months?.['2026-01']).toBeDefined()
    }
  })
})
```

- [ ] **Step 2: RED**

Run: `cd platform && npx vitest run src/store/lastModified.test.ts`
Expected: FAIL (lastModified не существует).

- [ ] **Step 3: types.ts — расширить FireMeta**

```ts
export interface FireMeta {
  unlockedMilestones: string[]
  /** Локальные таймстемпы изменений (ISO). Используются для last-write-wins синка. */
  lastModified?: {
    profile?: string
    months?: Record<string, string>
  }
}
```

- [ ] **Step 4: exportImport — сохранять meta целиком**

В `parseImport` заменить блок meta на:

```ts
  const meta =
    typeof o.meta === 'object' && o.meta !== null && Array.isArray((o.meta as { unlockedMilestones?: unknown }).unlockedMilestones)
      ? (o.meta as FireData['meta'])
      : { unlockedMilestones: [] }
```

(уже так — проверить, что `lastModified` проходит сквозь каст; добавить `lastModified` в допускаемые поля не требуется — каст объекта целиком.)

- [ ] **Step 5: store — писать lastModified в мутациях**

В `useFireStore.ts`:

```ts
import type { FireMeta } from '../lib/types'

function bumpProfile(meta: FireMeta, now: Date): FireMeta {
  return { ...meta, lastModified: { ...meta.lastModified, profile: now.toISOString() } }
}

function bumpMonth(meta: FireMeta, id: string, now: Date): FireMeta {
  return { ...meta, lastModified: { ...meta.lastModified, months: { ...meta.lastModified?.months, [id]: now.toISOString() } } }
}

function clearMonthTimestamps(meta: FireMeta): FireMeta {
  return { ...meta, lastModified: { ...meta.lastModified, months: undefined } }
}
```

Обновить действия:
- `setProfile`: `const profile = { ...get().profile, ...patch }` → `set({ profile, months: ..., meta: bumpProfile(get().meta, now) })`
- `toggleMonthCompleted(id, now = new Date())`: добавить параметр `now`, в set включить `meta: bumpMonth(state.meta, id, now)`
- `setMonthActual(id, value, now = new Date())`: использовать `now` вместо `_now`, включить `meta: bumpMonth(state.meta, id, now)`
- `importData(data, now = new Date())`: `meta: clearMonthTimestamps({ ...data.meta, lastModified: { profile: now.toISOString() } })`
- `resetAll(now = new Date())`: `meta: { unlockedMilestones: [], lastModified: { profile: now.toISOString() } }`

Интерфейс: `toggleMonthCompleted(id: string, now?: Date): void`.

- [ ] **Step 6: GREEN**

Run: `cd platform && npx vitest run src/store/lastModified.test.ts`
Expected: PASS (4 теста). Прошлые тесты стора не ломаются (meta — прозрачное расширение).

- [ ] **Step 7: Commit**

```bash
git add platform/src/lib/types.ts platform/src/lib/exportImport.ts platform/src/store
git commit -m "feat: track local modification timestamps for sync"
```

---

## Task 3: Merge-логика last-write-wins (чистая, TDD)

**Files:**
- Create: `platform/src/lib/sync/merge.ts`
- Test: `platform/src/lib/sync/merge.test.ts`

- [ ] **Step 1: Падающие тесты**

`platform/src/lib/sync/merge.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import type { FireData, MonthEntry } from '../types'
import { DEFAULT_PROFILE, DEFAULT_META } from '../types'
import { mergePull, diffPush, type RemoteRow } from './merge'

const T0 = '2026-08-01T00:00:00.000Z'
const T1 = '2026-08-02T00:00:00.000Z'
const T2 = '2026-08-03T00:00:00.000Z'

function month(id: string, actual: number): MonthEntry {
  const [year, month] = id.split('-').map(Number)
  return { id, year, month, age: 28, plannedDeposit: 1714, actualDeposit: actual, isCompleted: true }
}

function localData(): FireData {
  return {
    profile: { ...DEFAULT_PROFILE, name: 'Локальный' },
    months: [month('2026-01', 500)],
    meta: {
      unlockedMilestones: [],
      lastModified: { profile: T1, months: { '2026-01': T1 } },
    },
  }
}

describe('mergePull', () => {
  it('applies remote rows newer than local', () => {
    const local = localData()
    const remoteProfile: RemoteRow = { id: null, data: { ...DEFAULT_PROFILE, name: 'Облако' }, updatedAt: T2 }
    const remoteMonths: RemoteRow[] = [{ id: '2026-01', data: month('2026-01', 999), updatedAt: T2 }]
    const result = mergePull(local, remoteProfile, remoteMonths)
    expect(result.data.profile.name).toBe('Облако')
    expect(result.data.months.find((m) => m.id === '2026-01')?.actualDeposit).toBe(999)
    expect(result.pulled).toBe(2)
  })

  it('keeps local when local is newer', () => {
    const local = localData()
    const remoteProfile: RemoteRow = { id: null, data: { ...DEFAULT_PROFILE, name: 'Облако' }, updatedAt: T0 }
    const result = mergePull(local, remoteProfile, [])
    expect(result.data.profile.name).toBe('Локальный')
    expect(result.pulled).toBe(0)
  })

  it('applies remote when no local timestamp', () => {
    const local: FireData = { profile: DEFAULT_PROFILE, months: [], meta: DEFAULT_META }
    const remoteProfile: RemoteRow = { id: null, data: { ...DEFAULT_PROFILE, name: 'Облако' }, updatedAt: T2 }
    const result = mergePull(local, remoteProfile, [])
    expect(result.data.profile.name).toBe('Облако')
    expect(result.pulled).toBe(1)
  })

  it('ignores remote month rows not present locally (adds them)', () => {
    const local = localData()
    const remoteMonths: RemoteRow[] = [{ id: '2026-02', data: month('2026-02', 300), updatedAt: T2 }]
    const result = mergePull(local, null, remoteMonths)
    expect(result.data.months.find((m) => m.id === '2026-02')?.actualDeposit).toBe(300)
  })
})

describe('diffPush', () => {
  it('pushes rows where local is newer than remote', () => {
    const local = localData()
    const remoteProfile: RemoteRow = { id: null, data: { ...DEFAULT_PROFILE, name: 'Облако' }, updatedAt: T0 }
    const remoteMonths: RemoteRow[] = [{ id: '2026-01', data: month('2026-01', 1), updatedAt: T0 }]
    const diff = diffPush(local, remoteProfile, remoteMonths)
    expect(diff.profile?.name).toBe('Локальный')
    expect(diff.months).toHaveLength(1)
    expect(diff.months[0].actualDeposit).toBe(500)
  })

  it('pushes nothing when remote is newer or equal', () => {
    const local = localData()
    const remoteProfile: RemoteRow = { id: null, data: { ...DEFAULT_PROFILE, name: 'Облако' }, updatedAt: T2 }
    const remoteMonths: RemoteRow[] = [{ id: '2026-01', data: month('2026-01', 1), updatedAt: T2 }]
    const diff = diffPush(local, remoteProfile, remoteMonths)
    expect(diff.profile).toBeUndefined()
    expect(diff.months).toHaveLength(0)
  })

  it('pushes profile when no remote row exists', () => {
    const local = localData()
    const diff = diffPush(local, null, [])
    expect(diff.profile?.name).toBe('Локальный')
  })
})
```

- [ ] **Step 2: RED**

Run: `cd platform && npx vitest run src/lib/sync/merge.test.ts`
Expected: FAIL.

- [ ] **Step 3: Реализация**

`platform/src/lib/sync/merge.ts`:

```ts
import type { FireData, MonthEntry, Profile } from '../types'

export interface RemoteRow {
  id: string | null
  data: unknown
  updatedAt: string
}

/** Применить облачные строки новее локальных. Возвращает новое FireData и число применённых строк. */
export function mergePull(
  local: FireData,
  remoteProfile: RemoteRow | null,
  remoteMonths: RemoteRow[],
): { data: FireData; pulled: number } {
  let pulled = 0
  let profile = local.profile
  const months = [...local.months]

  const remoteNewer = (localTs: string | undefined, remoteTs: string) => !localTs || remoteTs > localTs

  if (remoteProfile && remoteNewer(local.meta.lastModified?.profile, remoteProfile.updatedAt)) {
    profile = remoteProfile.data as Profile
    pulled++
  }

  for (const row of remoteMonths) {
    if (!row.id) continue
    const localTs = local.meta.lastModified?.months?.[row.id]
    const existing = months.findIndex((m) => m.id === row.id)
    if (remoteNewer(localTs, row.updatedAt)) {
      const entry = row.data as MonthEntry
      if (existing >= 0) months[existing] = entry
      else months.push(entry)
      pulled++
    }
  }

  return { data: { ...local, profile, months }, pulled }
}

/** Строки, где локальная версия новее облачной (или облачной нет) — для push. */
export function diffPush(
  local: FireData,
  remoteProfile: RemoteRow | null,
  remoteMonths: RemoteRow[],
): { profile?: Profile; months: MonthEntry[] } {
  const localNewer = (localTs: string | undefined, remoteTs: string | undefined) =>
    Boolean(localTs) && (!remoteTs || localTs > remoteTs)

  const result: { profile?: Profile; months: MonthEntry[] } = { months: [] }
  if (localNewer(local.meta.lastModified?.profile, remoteProfile?.updatedAt)) {
    result.profile = local.profile
  }
  const remoteById = new Map(remoteMonths.map((r) => [r.id, r.updatedAt]))
  for (const m of local.months) {
    if (localNewer(local.meta.lastModified?.months?.[m.id], remoteById.get(m.id))) {
      result.months.push(m)
    }
  }
  return result
}
```

- [ ] **Step 4: GREEN**

Run: `cd platform && npx vitest run src/lib/sync/merge.test.ts`
Expected: PASS (7 тестов).

- [ ] **Step 5: Commit**

```bash
git add platform/src/lib/sync
git commit -m "feat: last-write-wins merge logic"
```

---

## Task 4: SupabaseAdapter (TDD, клиент замокан)

**Files:**
- Create: `platform/src/lib/sync/supabaseAdapter.ts`
- Test: `platform/src/lib/sync/supabaseAdapter.test.ts`

- [ ] **Step 1: Падающие тесты**

`platform/src/lib/sync/supabaseAdapter.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const authMock = {
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
}
const queryMock = vi.fn()

const supabaseMock = {
  auth: authMock,
  from: vi.fn(() => ({
    select: vi.fn(() => ({ eq: vi.fn(() => ({ order: queryMock })) })),
    upsert: vi.fn(() => ({ select: queryMock })),
  })),
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => supabaseMock),
}))

import { createSupabaseAdapter } from './supabaseAdapter'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createSupabaseAdapter', () => {
  it('sends otp and verifies code', async () => {
    authMock.signInWithOtp.mockResolvedValue({ error: null })
    authMock.verifyOtp.mockResolvedValue({ error: null })
    const adapter = createSupabaseAdapter('https://x.supabase.co', 'key')
    await adapter.signInWithOtp('a@b.c')
    expect(authMock.signInWithOtp).toHaveBeenCalledWith({ email: 'a@b.c', options: { shouldCreateUser: true } })
    await adapter.verifyOtp('a@b.c', '123456')
    expect(authMock.verifyOtp).toHaveBeenCalledWith({ email: 'a@b.c', token: '123456', type: 'email' })
  })

  it('returns session state', async () => {
    authMock.getSession.mockResolvedValue({ data: { session: { user: { email: 'a@b.c' } } } })
    const adapter = createSupabaseAdapter('https://x.supabase.co', 'key')
    const session = await adapter.getSession()
    expect(session?.user?.email).toBe('a@b.c')
  })

  it('pulls remote rows', async () => {
    const row = { id: '2026-01', data: { id: '2026-01' }, updated_at: '2026-08-01T00:00:00Z' }
    const chain = {
      select: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: [row], error: null }) })) })),
    }
    supabaseMock.from.mockReturnValue(chain)
    const adapter = createSupabaseAdapter('https://x.supabase.co', 'key')
    const result = await adapter.pullRows()
    expect(result.profile).toBeNull()
    expect(result.months).toHaveLength(1)
    expect(result.months[0].id).toBe('2026-01')
  })

  it('pushes rows with upsert', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const chain = { upsert: vi.fn(() => ({ select: upsert })) }
    supabaseMock.from.mockReturnValue(chain)
    const adapter = createSupabaseAdapter('https://x.supabase.co', 'key')
    const profile = { name: 'Амир' } as never
    await adapter.pushRows(profile, [])
    expect(supabaseMock.from).toHaveBeenCalledWith('profiles')
    expect(chain.upsert).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: RED**

Run: `cd platform && npx vitest run src/lib/sync/supabaseAdapter.test.ts`
Expected: FAIL.

- [ ] **Step 3: Реализация**

`platform/src/lib/sync/supabaseAdapter.ts`:

```ts
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import type { MonthEntry, Profile } from '../types'
import type { RemoteRow } from './merge'

export interface PulledRows {
  profile: RemoteRow | null
  months: RemoteRow[]
}

const PROFILE_TABLE = 'profiles'
const MONTHS_TABLE = 'months'

export function createSupabaseAdapter(url: string, anonKey: string) {
  const client: SupabaseClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, storage: window.localStorage },
  })

  return {
    client,
    async signInWithOtp(email: string) {
      return client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
    },
    async verifyOtp(email: string, code: string) {
      return client.auth.verifyOtp({ email, token: code, type: 'email' })
    },
    async signOut() {
      return client.auth.signOut()
    },
    async getSession(): Promise<Session | null> {
      const { data } = await client.auth.getSession()
      return data.session
    },
    onAuthStateChange(cb: (session: Session | null) => void) {
      return client.auth.onAuthStateChange((_event, session) => cb(session))
    },
    /** Забрать облачные строки текущего юзера. */
    async pullRows(): Promise<PulledRows> {
      const { data: profileRows } = await client
        .from(PROFILE_TABLE)
        .select('user_id, data, updated_at')
        .limit(1)
      const { data: monthRows } = await client
        .from(MONTHS_TABLE)
        .select('id, data, updated_at')
        .order('id', { ascending: true })
      const toRemote = (row: { data: unknown; updated_at: string }): RemoteRow => ({
        id: null,
        data: row.data,
        updatedAt: row.updated_at,
      })
      return {
        profile: profileRows && profileRows.length > 0 ? toRemote(profileRows[0]) : null,
        months: (monthRows ?? []).map((r) => ({
          id: String(r.id),
          data: r.data,
          updatedAt: r.updated_at,
        })),
      }
    },
    /** Залить локально-новые строки (upsert). */
    async pushRows(profile: Profile | undefined, months: MonthEntry[]): Promise<void> {
      if (profile) {
        await client.from(PROFILE_TABLE).upsert({ data: profile, updated_at: new Date().toISOString() })
      }
      for (const m of months) {
        await client
          .from(MONTHS_TABLE)
          .upsert({ id: m.id, data: m, updated_at: new Date().toISOString() })
      }
    },
  }
}

export type SupabaseAdapter = ReturnType<typeof createSupabaseAdapter>
```

- [ ] **Step 4: GREEN**

Run: `cd platform && npx vitest run src/lib/sync/supabaseAdapter.test.ts`
Expected: PASS (4 теста). При несовпадении мок-цепочек (`.limit(1)` и пр.) — подправить моки под фактическую форму цепочки запросов, не трогая логику.

- [ ] **Step 5: Commit**

```bash
git add platform/src/lib/sync/supabaseAdapter.ts platform/src/lib/sync/supabaseAdapter.test.ts
git commit -m "feat: supabase adapter with otp auth and row pull push"
```

---

## Task 5: Sync-состояние в сторе (TDD)

**Files:**
- Modify: `platform/src/store/useFireStore.ts`, `platform/src/hooks/useSyncInit.ts` (новый)
- Test: `platform/src/store/sync.test.ts`

- [ ] **Step 1: Падающие тесты**

`platform/src/store/sync.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useFireStore } from './useFireStore'
import { DEFAULT_PROFILE, type FireData } from '../lib/types'

vi.mock('../lib/sync/supabaseAdapter', () => {
  const adapter = {
    signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
    verifyOtp: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    getSession: vi.fn().mockResolvedValue(null),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    pullRows: vi.fn().mockResolvedValue({ profile: null, months: [] }),
    pushRows: vi.fn().mockResolvedValue(undefined),
  }
  return {
    createSupabaseAdapter: vi.fn(() => adapter),
    testAdapter: adapter,
  }
})

import { testAdapter } from '../lib/sync/supabaseAdapter'
import { monthId } from '../lib/finance/projection'

const NOW = new Date(2026, 7, 15)

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'key')
  useFireStore.getState().importData(
    {
      profile: { ...DEFAULT_PROFILE, name: 'Тест' },
      months: [{ id: monthId(2026, 1), year: 2026, month: 1, age: 28, plannedDeposit: 1714, actualDeposit: 0, isCompleted: false }],
      meta: { unlockedMilestones: [] },
    },
    NOW,
  )
  useFireStore.getState().setSync({ status: 'offline', email: null })
})

describe('sync actions', () => {
  it('sendCode keeps pending email and verifies into online state', async () => {
    await useFireStore.getState().sendCode('a@b.c')
    expect(useFireStore.getState().sync.email).toBe('a@b.c')
    await useFireStore.getState().verifyCode('a@b.c', '123456')
    expect(useFireStore.getState().sync.status).toBe('synced')
  })

  it('verifyCode failure sets error', async () => {
    ;(testAdapter.verifyOtp as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ error: { message: 'bad code' } })
    await useFireStore.getState().verifyCode('a@b.c', '000000')
    expect(useFireStore.getState().sync.status).toBe('error')
  })

  it('syncNow pulls remote data and merges', async () => {
    ;(testAdapter.pullRows as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      profile: { id: null, data: { ...DEFAULT_PROFILE, name: 'Облако' }, updatedAt: '2030-01-01T00:00:00Z' },
      months: [],
    })
    useFireStore.getState().setSync({ status: 'synced', email: 'a@b.c' })
    await useFireStore.getState().syncNow()
    expect(useFireStore.getState().profile.name).toBe('Облако')
    expect(useFireStore.getState().sync.status).toBe('synced')
  })

  it('signOut returns to offline', async () => {
    useFireStore.getState().setSync({ status: 'synced', email: 'a@b.c' })
    await useFireStore.getState().signOut()
    expect(useFireStore.getState().sync.status).toBe('offline')
  })
})
```

- [ ] **Step 2: RED**

Run: `cd platform && npx vitest run src/store/sync.test.ts`
Expected: FAIL (нет sync-состояния).

- [ ] **Step 3: Реализация в сторе**

В `useFireStore.ts`:

```ts
import { createSupabaseAdapter, type SupabaseAdapter } from '../lib/sync/supabaseAdapter'
import { mergePull, diffPush } from '../lib/sync/merge'

export type SyncStatus = 'offline' | 'syncing' | 'synced' | 'error'

export interface SyncState {
  status: SyncStatus
  email: string | null
  error: string | null
  lastSyncAt: string | null
}

// ... в FireStoreState:
  sync: SyncState
  setSync(patch: Partial<SyncState>): void
  sendCode(email: string): Promise<void>
  verifyCode(email: string, code: string): Promise<void>
  signOut(): Promise<void>
  syncNow(): Promise<void>
```

Инициализация: `sync: { status: 'offline', email: null, error: null, lastSyncAt: null }`.

Реализация действий (внутри create):

```ts
      setSync(patch) {
        set((state) => ({ sync: { ...state.sync, ...patch } }))
      },
      async sendCode(email) {
        const adapter = getAdapter()
        if (!adapter) {
          set((s) => ({ sync: { ...s.sync, status: 'error', error: 'Supabase не настроен' } }))
          return
        }
        const { error } = await adapter.signInWithOtp(email)
        set((s) => ({ sync: { ...s.sync, email: error ? null : email, error: error ? error.message : null } }))
      },
      async verifyCode(email, code) {
        const adapter = getAdapter()
        if (!adapter) return
        const { error } = await adapter.verifyOtp(email, code)
        if (error) {
          set((s) => ({ sync: { ...s.sync, status: 'error', error: error.message } }))
          return
        }
        set((s) => ({ sync: { ...s.sync, status: 'synced', email, error: null } }))
        await get().syncNow()
      },
      async signOut() {
        const adapter = getAdapter()
        await adapter?.signOut()
        set((s) => ({ sync: { status: 'offline', email: null, error: null, lastSyncAt: null } }))
      },
      async syncNow() {
        const adapter = getAdapter()
        if (!adapter) return
        set((s) => ({ sync: { ...s.sync, status: 'syncing', error: null } }))
        try {
          const remote = await adapter.pullRows()
          const merged = mergePull(get(), remote.profile, remote.months)
          if (merged.pulled > 0) set({ profile: merged.data.profile, months: merged.data.months })
          const diff = diffPush(get(), remote.profile, remote.months)
          await adapter.pushRows(diff.profile, diff.months)
          set((s) => ({ sync: { ...s.sync, status: 'synced', error: null, lastSyncAt: new Date().toISOString() } }))
        } catch (e) {
          set((s) => ({ sync: { ...s.sync, status: 'error', error: e instanceof Error ? e.message : 'Ошибка синхронизации' } }))
        }
      },
```

Вне create, в этом же файле:

```ts
import { supabase, supabaseEnabled } from '../lib/supabase/client'

let adapterSingleton: SupabaseAdapter | null | undefined

function getAdapter(): SupabaseAdapter | null {
  if (adapterSingleton === undefined) {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
    adapterSingleton = url && anonKey ? createSupabaseAdapter(url, anonKey) : null
  }
  return adapterSingleton
}
```

(использовать `import.meta.env` напрямую; `supabase`/`supabaseEnabled` из client.ts оставить для useSyncInit).

- [ ] **Step 4: useSyncInit — восстановление сессии**

`platform/src/hooks/useSyncInit.ts`:

```ts
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useFireStore } from '@/store/useFireStore'
import { getAdapter } from '@/store/useFireStore' // реэкспорт из стора — см. Step 5

export function useSyncInit() {
  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled || !data.session) return
      const email = data.session.user.email ?? null
      useFireStore.getState().setSync({ status: 'synced', email })
      void useFireStore.getState().syncNow()
    })
    return () => {
      cancelled = true
    }
  }, [])
}
```

- [ ] **Step 5: реэкспорт getAdapter для хука**

В `useFireStore.ts` заменить `function getAdapter` на `export function getAdapter` (тесты это не ломают — мок адаптера на модульном уровне).

- [ ] **Step 6: App.tsx — вызвать useSyncInit**

В `App.tsx` добавить `useSyncInit()` первой строкой компонента.

- [ ] **Step 7: GREEN**

Run: `cd platform && npx vitest run src/store/sync.test.ts src/store/lastModified.test.ts src/store/store.test.ts`
Expected: PASS (4 + 4 + 9).

- [ ] **Step 8: Commit**

```bash
git add platform/src/store platform/src/hooks platform/src/App.tsx
git commit -m "feat: sync state machine with otp login and pull push"
```

---

## Task 6: DataSheet — авторизация и статус синка

**Files:**
- Modify: `platform/src/components/data/DataSheet.tsx`
- Test: `platform/src/components/data/DataSheet.test.tsx`

- [ ] **Step 1: Падающий тест**

`platform/src/components/data/DataSheet.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useFireStore } from '../../store/useFireStore'
import { DataSheet } from './DataSheet'

beforeEach(() => {
  useFireStore.getState().resetAll()
})

describe('DataSheet sync ui', () => {
  it('shows auth form when offline', () => {
    render(<DataSheet open onOpenChange={() => {}} />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Получить код/ })).toBeInTheDocument()
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('shows email and logout when logged in', () => {
    useFireStore.getState().setSync({ status: 'synced', email: 'a@b.c' })
    render(<DataSheet open onOpenChange={() => {}} />)
    expect(screen.getByText('a@b.c')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Выйти/ })).toBeInTheDocument()
    expect(screen.getByText('Синхронизировано')).toBeInTheDocument()
  })

  it('sends code from email input', () => {
    render(<DataSheet open onOpenChange={() => {}} />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.c' } })
    fireEvent.click(screen.getByRole('button', { name: /Получить код/ }))
    expect(useFireStore.getState().sync.email).toBe('a@b.c')
  })
})
```

- [ ] **Step 2: RED**

Run: `cd platform && npx vitest run src/components/data/DataSheet.test.tsx`
Expected: FAIL (старая разметка).

- [ ] **Step 3: Реализация**

Заменить в `DataSheet.tsx` блок статуса на секцию синка (перед `Separator`):

```tsx
import { useState, useRef } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useFireStore } from '@/store/useFireStore'

const STATUS_TEXT: Record<string, string> = {
  offline: 'Offline',
  syncing: 'Синхронизация…',
  synced: 'Синхронизировано',
  error: 'Ошибка синка',
}
```

Внутри компонента:

```tsx
  const sync = useFireStore((s) => s.sync)
  const sendCode = useFireStore((s) => s.sendCode)
  const verifyCode = useFireStore((s) => s.verifyCode)
  const signOut = useFireStore((s) => s.signOut)
  const syncNow = useFireStore((s) => s.syncNow)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')

  const loggedIn = sync.status === 'synced' || sync.status === 'syncing'
```

Разметка (заменяет прежнюю строку «Синхронизация» + Badge + подпись):

```tsx
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Синхронизация</span>
                <Badge variant={sync.status === 'error' ? 'destructive' : 'secondary'}>
                  {STATUS_TEXT[sync.status] ?? 'Offline'}
                </Badge>
              </div>
              {sync.lastSyncAt && (
                <p className="text-xs text-muted-foreground">
                  Последняя синхронизация: {new Date(sync.lastSyncAt).toLocaleString('ru-RU')}
                </p>
              )}
              {loggedIn ? (
                <div className="space-y-2">
                  <p className="text-sm">{sync.email}</p>
                  <div className="flex gap-2">
                    <Button className="flex-1" variant="outline" onClick={() => void syncNow()}>
                      Синхронизировать
                    </Button>
                    <Button className="flex-1" variant="outline" onClick={() => void signOut()}>
                      Выйти
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="sync-email">Email</Label>
                  <Input id="sync-email" type="email" value={email} placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)} />
                  {sync.email && (
                    <div className="space-y-2">
                      <Label htmlFor="sync-code">Код из письма</Label>
                      <Input id="sync-code" inputMode="numeric" value={code} placeholder="6 цифр" onChange={(e) => setCode(e.target.value)} />
                      <Button className="w-full" onClick={() => void verifyCode(sync.email!, code)}>
                        Войти
                      </Button>
                    </div>
                  )}
                  {!sync.email && (
                    <Button className="w-full" onClick={() => void sendCode(email)}>
                      Получить код
                    </Button>
                  )}
                </div>
              )}
              {sync.error && <p className="text-xs text-rose-500">{sync.error}</p>}
              <p className="text-xs text-muted-foreground">Локальные данные никуда не отправляются без входа.</p>
            </div>
```

- [ ] **Step 4: GREEN**

Run: `cd platform && npx vitest run src/components/data`
Expected: PASS (3 + старые 2 StorageWarning + sheets 4). ВНИМАНИЕ: старый тест `sheets.test.tsx` проверял Badge «Offline Mode» — обновить его ожидание на `Offline` (STATUS_TEXT.offline). В e2e (Task 9) то же самое.

- [ ] **Step 5: Commit**

```bash
git add platform/src/components/data
git commit -m "feat: auth form and sync status in data sheet"
```

---

## Task 7: Streak-счётчик (TDD + UI)

**Files:**
- Create: `platform/src/lib/streak.ts`
- Test: `platform/src/lib/streak.test.ts`
- Modify: `platform/src/components/header/ProfileBanner.tsx`
- Test: `platform/src/components/header/streak.test.tsx`

- [ ] **Step 1: Падающие тесты**

`platform/src/lib/streak.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import type { MonthEntry } from '../types'
import { selectStreak } from './streak'
import { monthId } from './finance/projection'

function m(year: number, month: number, done: boolean): MonthEntry {
  return { id: monthId(year, month), year, month, age: 28, plannedDeposit: 1000, actualDeposit: 1000, isCompleted: done }
}

describe('selectStreak', () => {
  const now = new Date(2026, 7, 15) // август 2026

  it('counts consecutive completed months ending at previous month', () => {
    const months = [m(2026, 5, true), m(2026, 6, true), m(2026, 7, true), m(2026, 8, false)]
    expect(selectStreak(months, now)).toBe(3)
  })

  it('includes current month when completed', () => {
    const months = [m(2026, 7, true), m(2026, 8, true)]
    expect(selectStreak(months, now)).toBe(2)
  })

  it('returns 0 when previous month is not completed', () => {
    const months = [m(2026, 6, true), m(2026, 7, false)]
    expect(selectStreak(months, now)).toBe(0)
  })

  it('handles empty months', () => {
    expect(selectStreak([], now)).toBe(0)
  })
})
```

`platform/src/components/header/streak.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useFireStore } from '../../store/useFireStore'
import { ProfileBanner } from './ProfileBanner'

beforeEach(() => {
  useFireStore.getState().resetAll()
})

describe('streak in banner', () => {
  it('renders streak counter', () => {
    render(<ProfileBanner />)
    expect(screen.getByText(/мес. подряд/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: RED**

Run: `cd platform && npx vitest run src/lib/streak.test.ts src/components/header/streak.test.tsx`
Expected: FAIL.

- [ ] **Step 3: streak.ts**

```ts
import type { MonthEntry } from '../types'

/** Серия подряд отмеченных месяцев, заканчивающаяся предыдущим (или текущим, если отмечен). */
export function selectStreak(months: MonthEntry[], now: Date = new Date()): number {
  const byId = new Map(months.map((m) => [m.id, m]))
  let streak = 0
  let year = now.getFullYear()
  let month = now.getMonth() + 1 // 1-12, текущий

  if (byId.get(`${year}-${String(month).padStart(2, '0')}`)?.isCompleted) {
    // текущий месяц отмечен — считаем с него
  } else {
    // иначе начинаем с предыдущего
    month -= 1
    if (month === 0) {
      month = 12
      year -= 1
    }
  }

  for (;;) {
    const id = `${year}-${String(month).padStart(2, '0')}`
    if (!byId.get(id)?.isCompleted) break
    streak += 1
    month -= 1
    if (month === 0) {
      month = 12
      year -= 1
    }
  }
  return streak
}
```

- [ ] **Step 4: ProfileBanner — строка streak**

Под строкой имени (в блоке с именем) добавить:

```tsx
import { selectStreak } from '@/lib/streak'
import { useFireData } from '@/hooks/useFireData'
import { useMemo } from 'react'

// в компоненте:
  const data = useFireData()
  const streak = useMemo(() => selectStreak(data.months), [data.months])

// разметка после <div className="truncate text-lg font-semibold">{profile.name}</div>:
          <div className="text-sm text-muted-foreground">🔥 {streak} мес. подряд</div>
```

- [ ] **Step 5: GREEN**

Run: `cd platform && npx vitest run src/lib/streak.test.ts src/components/header`
Expected: PASS (4 + 2 + 2).

- [ ] **Step 6: Commit**

```bash
git add platform/src/lib/streak.ts platform/src/lib/streak.test.ts platform/src/components/header
git commit -m "feat: deposit streak counter in profile banner"
```

---

## Task 8: Локальные напоминания о взносе (TDD + UI)

**Files:**
- Create: `platform/src/lib/reminders.ts`
- Test: `platform/src/lib/reminders.test.ts`
- Modify: `platform/src/components/settings/SettingsSheet.tsx`, `platform/src/App.tsx`
- Test: `platform/src/components/settings/reminders.test.tsx`

- [ ] **Step 1: Падающие тесты**

`platform/src/lib/reminders.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import type { FireData } from '../types'
import { DEFAULT_PROFILE } from '../types'
import { monthId } from './finance/projection'
import { shouldRemind } from './reminders'

function data(done: boolean, day: number): FireData {
  const y = new Date().getFullYear()
  const mo = new Date().getMonth() + 1
  return {
    profile: DEFAULT_PROFILE,
    months: [{ id: monthId(y, mo), year: y, month: mo, age: 28, plannedDeposit: 1714, actualDeposit: 0, isCompleted: done }],
    meta: { unlockedMilestones: [], remindersEnabled: true },
  }
}

describe('shouldRemind', () => {
  it('reminds after day 20 when current month not completed', () => {
    const now = new Date(new Date().getFullYear(), new Date().getMonth(), 21)
    const result = shouldRemind(data(false, 21), now)
    expect(result.remind).toBe(true)
    expect(result.message).toContain('1 714')
  })

  it('stays silent before day 20', () => {
    const now = new Date(new Date().getFullYear(), new Date().getMonth(), 10)
    expect(shouldRemind(data(false, 10), now).remind).toBe(false)
  })

  it('stays silent when month completed', () => {
    const now = new Date(new Date().getFullYear(), new Date().getMonth(), 21)
    expect(shouldRemind(data(true, 21), now).remind).toBe(false)
  })

  it('stays silent when reminders disabled', () => {
    const now = new Date(new Date().getFullYear(), new Date().getMonth(), 21)
    const d = data(false, 21)
    d.meta.remindersEnabled = false
    expect(shouldRemind(d, now).remind).toBe(false)
  })
})
```

`platform/src/components/settings/reminders.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useFireStore } from '../../store/useFireStore'
import { SettingsSheet } from './SettingsSheet'

beforeEach(() => {
  useFireStore.getState().resetAll()
})

describe('reminders toggle', () => {
  it('toggles remindersEnabled in meta', () => {
    render(<SettingsSheet open onOpenChange={() => {}} />)
    const button = screen.getByRole('button', { name: /Напоминания о взносе/ })
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    expect(useFireStore.getState().meta.remindersEnabled).toBe(true)
    fireEvent.click(button)
    expect(useFireStore.getState().meta.remindersEnabled).toBe(false)
  })
})
```

- [ ] **Step 2: RED**

Run: `cd platform && npx vitest run src/lib/reminders.test.ts src/components/settings/reminders.test.tsx`
Expected: FAIL.

- [ ] **Step 3: reminders.ts**

```ts
import type { FireData } from '../types'
import { formatMoney } from './finance/format'
import { monthId } from './finance/projection'

export const REMIND_DAY = 20

export interface ReminderDecision {
  remind: boolean
  message?: string
}

/** Напоминать о взносе текущего месяца, если он не отмечен и день ≥ REMIND_DAY. */
export function shouldRemind(data: FireData, now: Date = new Date()): ReminderDecision {
  if (!data.meta.remindersEnabled) return { remind: false }
  if (now.getDate() < REMIND_DAY) return { remind: false }
  const id = monthId(now.getFullYear(), now.getMonth() + 1)
  const entry = data.months.find((m) => m.id === id)
  if (!entry || entry.isCompleted) return { remind: false }
  return {
    remind: true,
    message: `Не забудьте пополнить портфель: ${formatMoney(entry.plannedDeposit, data.profile.currency)} до конца месяца`,
  }
}
```

- [ ] **Step 4: meta — флаг remindersEnabled**

В `types.ts` добавить в FireMeta: `remindersEnabled?: boolean`. В `resetAll` — `meta: { unlockedMilestones: [], remindersEnabled: true, lastModified: { profile: now.toISOString() } }`.

- [ ] **Step 5: Тумблер в настройках**

В `SettingsSheet.tsx` (после блока «Тема»):

```tsx
          <div className="space-y-1.5">
            <Label>Уведомления</Label>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                if (!remindersEnabled && 'Notification' in window) {
                  void Notification.requestPermission()
                }
                toggleReminders()
              }}
            >
              Напоминания о взносе: {remindersEnabled ? 'вкл' : 'выкл'}
            </Button>
          </div>
```

Подписки в компоненте (реактивные):

```tsx
  const remindersEnabled = useFireStore((s) => s.meta.remindersEnabled)
  const toggleReminders = useFireStore((s) => s.toggleReminders)
```

В сторе — действие:

```ts
      toggleReminders() {
        set((state) => ({ meta: { ...state.meta, remindersEnabled: !state.meta.remindersEnabled } }))
      },
```

(в FireStoreState добавить `toggleReminders(): void`)

- [ ] **Step 6: Показ уведомления в App**

`platform/src/hooks/useReminder.ts`:

```ts
import { useEffect } from 'react'
import { shouldRemind } from '@/lib/reminders'
import { useFireData } from './useFireData'

let shownForMonth: string | null = null

export function useReminder() {
  const data = useFireData()
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const decision = shouldRemind(data)
    if (!decision.remind || !decision.message) return
    const now = new Date()
    const key = `${now.getFullYear()}-${now.getMonth()}`
    if (shownForMonth === key) return
    shownForMonth = key
    void new Notification('FIRE Tracker', { body: decision.message })
  }, [data])
}
```

В `App.tsx` добавить `useReminder()`.

- [ ] **Step 7: GREEN**

Run: `cd platform && npx vitest run src/lib/reminders.test.ts src/components/settings`
Expected: PASS (4 + 1 + 4 старых).

- [ ] **Step 8: Commit**

```bash
git add platform/src/lib/reminders.ts platform/src/lib/reminders.test.ts platform/src/lib/types.ts platform/src/store platform/src/hooks platform/src/components/settings platform/src/App.tsx
git commit -m "feat: local deposit reminders with settings toggle"
```

---

## Task 9: E2E-обновления и полная верификация

**Files:**
- Modify: `platform/e2e/fire.spec.ts`

- [ ] **Step 1: Обновить ожидания DataSheet**

В тесте «export → reset → import roundtrip» после открытия «Данные» теперь видна форма входа. В тесте «first run shows defaults» ничего не меняется. Добавить проверку формы:

```ts
test('data sheet shows auth form', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Данные' }).click()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByText('Offline')).toBeVisible()
})
```

- [ ] **Step 2: Прогнать всё**

Run:
```bash
cd platform && npm run test && npm run build && npm run e2e
```
Expected: юниты все зелёные (старые 55 + новые ~25), build успешен, e2e 10/10 (5 тестов × 2 проекта).

- [ ] **Step 3: Commit**

```bash
git add platform/e2e
git commit -m "test: e2e auth form visibility"
```

---

## Task 10: Деплой и приёмка

- [ ] **Step 1: Vercel env vars**

Пользователь добавляет в Vercel → Project → Settings → Environment Variables (Production + Preview):
- `VITE_SUPABASE_URL` = `https://dyczemxbjfxgvlkqduoj.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = anon key

Redeploy (после добавления переменных).

- [ ] **Step 2: Пользователь выполняет schema.sql**

Supabase Dashboard → SQL Editor → вставить содержимое `supabase/schema.sql` → Run. Проверить: в Authentication → Policies у `profiles` и `months` появились политики «own profiles» / «own months».

- [ ] **Step 3: Push + проверка**

```bash
git push origin master
```
Vercel автодеплой. Проверка: открыть прод-URL, «Данные» → ввести email → получить код → войти → статус «Синхронизировано»; открыть с другого устройства/профиля браузера → войти тем же email → данные подтянулись.

- [ ] **Step 4: Финальный отчёт и Session Log**

Обновить `AGENTS.md` Session Log (Фаза 2), сверить критерии готовности ТЗ.

---

## Self-review (автор плана)

1. **Spec coverage:** Supabase схема (ТЗ 4.4) — Task 1; Auth email OTP (ТЗ 11.2) — Tasks 4–6; last-write-wins синк (ТЗ 4.4/11.2) — Tasks 2–5; статус в DataSheet (ТЗ 5.4) — Task 6; streak (ТЗ 5.1) — Task 7; уведомления (ТЗ 6) — Task 8; деплой (ТЗ 2/11) — Task 10.
2. **Placeholder scan:** код приведён полностью; «РАЗРЕШАЮ»-изменений спеки нет (уведомления — «локальные напоминания о взносе» из ТЗ, Notification API).
3. **Type consistency:** `FireMeta.lastModified`/`remindersEnabled` — опциональные, обратная совместимость с экспортом v1; `RemoteRow.updatedAt` в camelCase на границе адаптера, `updated_at` — только в SQL/строках таблиц; сигнатуры `sendCode/verifyCode/signOut/syncNow/setSync/toggleReminders` согласованы между store и UI.

---

## Исправления, внесённые при исполнении (2026-08-13)

| # | Что | Причина |
|---|-----|---------|
| 1 | `vi.stubEnv` для VITE_* в тестах sync/DataSheet | Синглтон адаптера без env возвращает null |
| 2 | `testAdapter` через типизированный вызов замоканной фабрики, не экспорт из мока | TS не видит экспорт из vi.mock-фабрики |
| 3 | `resetAll` сбрасывает и `sync` | Протекало состояние «вошёл» между тестами |
| 4 | `waitFor` для async sendCode в RTL-тесте | fireEvent не дожидается микрозадач |
| 5 | Напоминания: день = настройка `meta.remindDay` (1–28), не константа 20 | Требование пользователя «ничего статичного» |
| 6 | Убраны лишний `migrate` в persist и неиспользуемый параметр | tsc strict |
| 7 | Пути импортов в `src/lib/*` — `./types` | Тесты лежат рядом с типами |
| 8 | merge.ts: `localTs !== undefined` вместо `Boolean(localTs)` | TS-сужение в стрелочной функции |

**Итоги верификации:** `make test` 90/90 · `make build` успешен · e2e 10/10 (Chromium + WebKit).
