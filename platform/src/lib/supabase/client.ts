import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Anon key публичный по дизайну (защита данных — на RLS), поэтому можно вшивать как fallback.
const url =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? 'https://dyczemxbjfxgvlkqduoj.supabase.co'
const anonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3plbXhiamZ4Z3Zsa3FkdW9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MTk1MzQsImV4cCI6MjEwMjE5NTUzNH0.h-n2RPjfVRYgu4o9fPBqlPFw3SgJ3Lpf1RBV69lGWyU'

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
