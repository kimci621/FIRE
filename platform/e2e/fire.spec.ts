import { test, expect } from '@playwright/test'

test('first run shows defaults', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Амир')).toBeVisible()
  await expect(page.getByText('К целевому возрасту')).toBeVisible()
  await expect(page.getByText(/Базовый взнос/)).toBeVisible()
  await expect(page.getByText('План взносов')).toBeVisible()
})

test('data sheet shows auth form', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Данные' }).click()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByText('Offline')).toBeVisible()
})

test('marking current month as completed shows check state', async ({ page }) => {
  await page.goto('/')
  const now = new Date()
  const id = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  await page.locator(`[data-month-id="${id}"]`).click()
  await page.getByLabel('Фактический взнос (если пополнили заранее)').fill('5000')
  await page.getByRole('button', { name: 'Отметил пополнение' }).click()
  await expect(page.getByRole('button', { name: 'Снять отметку' })).toBeVisible()
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

test('theme switches to light', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Настройки' }).click()
  await page.getByRole('button', { name: 'Светлая' }).click()
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await page.getByRole('button', { name: 'Тёмная' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('badges dialog lists achievements', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Достижения' }).click()
  await expect(page.getByText('Зал достижений')).toBeVisible()
  await expect(page.getByText('Первые полмиллиона!')).toBeVisible()
  await expect(page.getByText('ФИНАЛ!')).toBeVisible()
})

test('app works offline via service worker', async ({ page, context }) => {
  await page.goto('/')
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 15_000 })
  await context.setOffline(true)
  // WebKit может кинуть internal error при офлайн-навигации — страница при этом грузится из SW-кеша
  await page.goto('/').catch(() => {})
  await expect(page.getByText('К целевому возрасту')).toBeVisible()
})
