import { useEffect } from 'react'
import { shouldRemind } from '@/lib/reminders'
import { useFireData } from './useFireData'

let shownForMonth: string | null = null

/** Локальное напоминание о взносе при открытии приложения (Notification API). */
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
