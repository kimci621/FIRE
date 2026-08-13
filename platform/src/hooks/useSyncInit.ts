import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useFireStore } from '@/store/useFireStore'

/** Восстановление сессии Supabase при старте: если вошли — подтянуть облако. */
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
