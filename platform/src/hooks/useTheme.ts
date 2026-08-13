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
