# Как заменить Supabase на свой бэкенд (PostgreSQL или любой другой)

> Для будущих разработчиков FIRE Tracker. Цель документа: показать, что замена облака —
> локальная операция, приложение переписывать не нужно. Все точки интеграции изолированы.

---

## 1. Как устроен синк (зачем такая архитектура)

```
UI (DataSheet, стора-мутации) 
    │
    ▼
useFireStore (Zustand) — sync-машина: status, loginWithPassword, syncNow
    │  getAdapter()                      ▲ scheduleAutoSync() (дебаунс 2с, только при status='synced')
    ▼                                    │
lib/sync/supabaseAdapter.ts  ── единственная точка, знающая про Supabase
lib/sync/merge.ts            ── чистая LWW-логика (не зависит от бэкенда)
lib/supabase/client.ts       ── создание клиента
```

**Принцип:** вся специфика бэкенда сконцентрирована в одном адаптере. Merge-логика,
стор, UI, e2e и формулы к бэкенду не привязаны. Замена бэкенда = написать новый адаптер
с тем же интерфейсом + поменять одну строку в `getAdapter()`.

**Формат данных** — единый JSON `FireData { profile, months, meta }` (см. `src/lib/types.ts`).
Он не зависит от СУБД: это просто сериализованные объекты, хранящиеся в jsonb-колонках.

---

## 2. Интерфейс адаптера (контракт)

Из `src/lib/sync/supabaseAdapter.ts`:

```ts
export interface SupabaseAdapter {  // фактически: ReturnType<typeof createSupabaseAdapter>
  client: unknown
  signUp(email: string, password: string): Promise<{ error: { code?: string; message: string } | null }>
  signIn(email: string, password: string): Promise<{ error: { code?: string; message: string } | null }>
  signOut(): Promise<{ error: unknown }>
  getSession(): Promise<{ user?: { email?: string | null } | null } | null>
  onAuthStateChange(cb: (session: unknown) => void): { data: { subscription: { unsubscribe(): void } } }
  pullRows(): Promise<{ profile: RemoteRow | null; months: RemoteRow[] }>
  pushRows(profile?: Profile, months?: MonthEntry[]): Promise<void>
}
// RemoteRow = { id: string | null; data: unknown; updatedAt: string }
```

Стор вызывает только эти методы. Если новый адаптер реализует их 1-в-1 —
`loginWithPassword`, `syncNow`, автосинк и восстановление сессии работают без правок.

---

## 3. Пошаговая замена на свой PostgreSQL

### Шаг 1. База и таблицы

Поднимите PostgreSQL где угодно (VPS, Neon, RDS, docker). RLS больше не нужен —
авторизация живёт в вашем API, а не в БД:

```sql
create table if not exists profiles (
  user_id uuid primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists months (
  user_id uuid not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- users (если auth свой):
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null
);
```

### Шаг 2. Минимальный API (пример: Node.js + Fastify + pg)

Эндпоинты, которые заменяют Supabase REST + Auth:

```ts
// server.ts (сокращённо)
import Fastify from 'fastify'
import pg from 'pg'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const app = Fastify()
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const JWT_SECRET = process.env.JWT_SECRET!

// Auth: email + пароль (та же семантика, что в приложении: первый вход = регистрация)
app.post('/auth/login', async (req, reply) => {
  const { email, password } = req.body as { email: string; password: string }
  let user = (await db.query('select * from users where email = $1', [email])).rows[0]
  if (!user) {
    const hash = await bcrypt.hash(password, 10)
    user = (await db.query('insert into users (email, password_hash) values ($1, $2) returning *', [email, hash])).rows[0]
  } else if (!(await bcrypt.compare(password, user.password_hash))) {
    return reply.code(401).send({ code: 'wrong_password', message: 'Неверный пароль' })
  }
  return { token: jwt.sign({ sub: user.id, email }, JWT_SECRET, { expiresIn: '30d' }) }
})

function userId(req: { headers: Record<string, string | undefined> }): string {
  const token = (req.headers.authorization ?? '').replace('Bearer ', '')
  return (jwt.verify(token, JWT_SECRET) as { sub: string }).sub
}

// Тот же контракт, что у Supabase-таблиц: { profile: RemoteRow|null, months: RemoteRow[] }
app.get('/sync', async (req) => {
  const uid = userId(req)
  const p = (await db.query('select data, updated_at from profiles where user_id = $1', [uid])).rows[0]
  const m = await db.query('select id, data, updated_at from months where user_id = $1 order by id', [uid])
  return {
    profile: p ? { id: null, data: p.data, updatedAt: p.updated_at.toISOString() } : null,
    months: m.rows.map((r) => ({ id: r.id, data: r.data, updatedAt: r.updated_at.toISOString() })),
  }
})

app.post('/sync', async (req, reply) => {
  const uid = userId(req)
  const { profile, months } = req.body as { profile?: unknown; months?: { id: string; data: unknown }[] }
  if (profile) {
    await db.query(
      'insert into profiles (user_id, data, updated_at) values ($1, $2, now()) on conflict (user_id) do update set data = $2, updated_at = now()',
      [uid, profile],
    )
  }
  for (const m of months ?? []) {
    await db.query(
      'insert into months (user_id, id, data, updated_at) values ($1, $2, $3, now()) on conflict (user_id, id) do update set data = $3, updated_at = now()',
      [uid, m.id, m.data],
    )
  }
  return { ok: true }
})

app.listen({ port: 8080 })
```

> LWW-сравнение таймстемпов делает **клиент** (`lib/sync/merge.ts`): сервер просто отдаёт
> `updated_at` и принимает upsert. Сервер не решает конфликты — это уже готово и протестировано.

### Шаг 3. Новый адаптер в приложении

`src/lib/sync/postgresAdapter.ts` (скелет, дописать под свой API):

```ts
import type { MonthEntry, Profile } from '../types'
import type { RemoteRow } from './merge'

const API_URL = import.meta.env.VITE_API_URL as string

function authFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
}

export function createPostgresAdapter(apiUrl: string) {
  let token: string | null = window.localStorage.getItem('fire-token')

  const saveToken = (t: string | null) => {
    token = t
    if (t) window.localStorage.setItem('fire-token', t)
    else window.localStorage.removeItem('fire-token')
  }

  return {
    async signUp(email: string, password: string) {
      const res = await authFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      if (!res.ok) return { error: { code: 'signup_failed', message: await res.text() } }
      saveToken((await res.json()).token)
      return { error: null }
    },
    async signIn(email: string, password: string) {
      const res = await authFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      if (!res.ok) return { error: { code: 'wrong_password', message: await res.text() } }
      saveToken((await res.json()).token)
      return { error: null }
    },
    async signOut() {
      saveToken(null)
      return { error: null }
    },
    async getSession() {
      return token ? { user: { email: null } } : null
    },
    onAuthStateChange() {
      return { data: { subscription: { unsubscribe: () => {} } } }
    },
    async pullRows(): Promise<{ profile: RemoteRow | null; months: RemoteRow[] }> {
      const res = await authFetch('/sync', { headers: { Authorization: `Bearer ${token}` } })
      return res.json()
    },
    async pushRows(profile?: Profile, months?: MonthEntry[]): Promise<void> {
      await authFetch('/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ profile, months }),
      })
    },
  }
}
```

> Нюансы из текущего кода: `loginWithPassword` в сторе различает коды ошибок
> `user_already_exists` и `email_not_confirmed` — в своём API можно вернуть свои коды
> или упростить логику стора под новую семантику.

### Шаг 4. Подключение

В `src/store/useFireStore.ts` — функция `getAdapter()`:

```ts
// было:
adapterSingleton = url && anonKey ? createSupabaseAdapter(url, anonKey) : null
// стало:
adapterSingleton = import.meta.env.VITE_API_URL
  ? createPostgresAdapter(import.meta.env.VITE_API_URL)
  : null
```

Всё. `syncNow`, автосинк, дебаунс, статусы, UI «Данные» работают как раньше.

### Шаг 5. Конфиг и деплой

- `.env`: заменить `VITE_SUPABASE_*` на `VITE_API_URL=https://api.example.com`
- CORS на API: разрешить origin приложения
- Vercel: обновить env vars, redeploy

---

## 4. Перенос существующих данных

1. **Из приложения:** «Данные» → «Экспорт JSON» — полный дамп в формате `FireData`.
2. **В новую БД:** либо импортировать в приложении («Данные» → «Импорт JSON»), войдя в новый
   аккаунт — данные уедут через автосинк; либо скриптом: разобрать JSON и вставить
   `profile`/`months` в таблицы с `updated_at = now()`.

Примечание: `meta` (разблокированные достижения, настройки напоминаний) остаётся
локальным в обоих вариантах — он входит в экспорт, но не синхронизируется.

---

## 5. Что НЕ нужно трогать при замене бэкенда

| Слой | Почему не трогаем |
|------|-------------------|
| `src/lib/sync/merge.ts` | Чистая LWW-логика, покрыта тестами, не зависит от бэкенда |
| `src/store/useFireStore.ts` (кроме getAdapter) | Sync-машина работает через интерфейс адаптера |
| `src/store/sync.test.ts`, `autosync.test.ts` | Мокают адаптер — после замены импорта тесты проходят |
| Весь UI, движок, PWA, e2e | Не знают о бэкенде вообще |
| `supabase/schema.sql` | Может остаться как образец DDL (таблицы те же) |

**Чек-лист проверки после замены:**
- [ ] `make test` — зелёные (адаптер замокан, тесты не зависят от облака)
- [ ] Вход email+пароль на двух устройствах → данные сходятся
- [ ] Изменение месяца при авторизации → через ~2с уехало на сервер (автосинк)
- [ ] Офлайн-правки → после входа ушли на сервер (pull+push в syncNow)
- [ ] Экспорт/импорт JSON работает как раньше
