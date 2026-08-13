import type { Theme } from './types'

export function resolveTheme(theme: Theme, systemDark: boolean): 'dark' | 'light' {
  if (theme === 'system') return systemDark ? 'dark' : 'light'
  return theme
}
