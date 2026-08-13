# FIRE Tracker — Фаза 3 (Badges, аватар, темы) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Hall of Badges (полученные/следующие ачивки с прогрессом), загрузка фото-аватара, светлая/system тема, финальная полировка.

**Architecture:** чистая функция `resolveTheme` + хук `useTheme` (класс `.dark` на `<html>`), canvas-resize аватара до 128px (data URL в profile), Dialog с прогресс-барами по `buildMilestones` + `selectCurrentBalance`. Без изменений схемы данных и синка.

**Спецификация:** `docs/specs/2026-08-13-fire-tracker-design.md`, раздел 11 Фаза 3.

---

## Task 1: Темы (light/system) — TDD

**Files:** Create `src/lib/theme.ts`, `src/hooks/useTheme.ts`; Modify `src/components/settings/SettingsSheet.tsx`, `src/App.tsx`, `src/lib/theme.test.ts`

- [ ] Step 1: падающий тест `theme.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { resolveTheme } from './theme'

describe('resolveTheme', () => {
  it('returns explicit theme regardless of system', () => {
    expect(resolveTheme('dark', true)).toBe('dark')
    expect(resolveTheme('light', false)).toBe('light')
  })
  it('follows system preference for system theme', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })
})
```
- [ ] Step 2: RED → реализация `theme.ts`:
```ts
import type { Theme } from './types'

export function resolveTheme(theme: Theme, systemDark: boolean): 'dark' | 'light' {
  if (theme === 'system') return systemDark ? 'dark' : 'light'
  return theme
}
```
- [ ] Step 3: `useTheme.ts`:
```ts
import { useEffect } from 'react'
import { useFireStore } from '@/store/useFireStore'
import { resolveTheme } from '@/lib/theme'

function apply(theme: 'dark' | 'light') {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  const meta = document.querySelector('meta[name="theme-color"]')
  meta?.setAttribute('content', theme === 'dark' ? '#09090b' : '#ffffff')
}

export function useTheme() {
  const theme = useFireStore((s) => s.profile.theme)
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply(resolveTheme(useFireStore.getState().profile.theme, media.matches))
    media.addEventListener('change', onChange)
    onChange()
    return () => media.removeEventListener('change', onChange)
  }, [theme])
}
```
- [ ] Step 4: SettingsSheet — заменить абзац «Тема» на сегменты Тёмная/Светлая/Системная (`setProfile({ theme })`).
- [ ] Step 5: App.tsx — `useTheme()`.
- [ ] Step 6: GREEN (theme.test + существующие) → build → commit `feat: light and system themes`.

## Task 2: Фото-аватар

**Files:** Create `src/lib/avatar.ts`; Modify `SettingsSheet.tsx`, `components/header/ProfileBanner.tsx`; Test `src/components/settings/avatar.test.tsx`

- [ ] Step 1: тест: при клике «Загрузить фото» рендерится скрытый file input; ProfileBanner рендерит `<img>` при `avatar.type === 'image'` (задать через store).
- [ ] Step 2: `avatar.ts` — `resizeImage(file: File, size = 128): Promise<string>` (FileReader → Image → canvas 128×128 cover → `toDataURL('image/jpeg', 0.85)`).
- [ ] Step 3: SettingsSheet — кнопка «Загрузить фото» + input[type=file accept=image/*] + обработчик resize → `setProfile({ avatar: { type: 'image', value } })`; превью текущего аватара.
- [ ] Step 4: ProfileBanner — `<img>` для image-аватара.
- [ ] Step 5: GREEN → build → commit `feat: photo avatar upload with resize`.

## Task 3: Hall of Badges

**Files:** Create `src/components/milestones/BadgesDialog.tsx`; Modify `src/App.tsx`; Test `src/components/milestones/badges.test.tsx`

- [ ] Step 1: тест: диалог показывает все ачивки (5), разблокированная (m500k в meta) помечена, прогресс-бар имеет `aria-valuenow` = процент прогресса.
- [ ] Step 2: `BadgesDialog.tsx` — Dialog: список `buildMilestones(selectTargetCapital(profile))`; для каждой: emoji, title, text, `formatMoney(threshold)`, прогресс `min(1, currentBalance/threshold)`, бейдж «Получено» для unlocked; кнопка открытия — `Trophy` в футере App.
- [ ] Step 3: GREEN → build → commit `feat: hall of badges dialog with progress`.

## Task 4: Полировка и верификация

- [ ] e2e: тема переключается (класс html), Badges-диалог открывается; полный прогон `make test && make build && make e2e`.
- [ ] DOM-проверка на preview: светлая тема меняет фон, badges видны.
- [ ] Session Log + push. Финальный отчёт.

## Self-review

1. Spec: Фаза 3 покрыта (badges, аватар, темы, полировка). 2. Без placeholder-ов. 3. Типы: `Profile.theme` уже есть, `avatar.type: 'image'` уже в типах; новых схем нет.
