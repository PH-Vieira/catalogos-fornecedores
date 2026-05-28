import { createClient } from '@supabase/supabase-js'
import { authStorage } from '@/utils/authStorage'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.warn(
    'Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env'
  )
}

export const supabase = createClient(url ?? '', key ?? '', {
  auth: {
    storage: authStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    experimental: {
      passkey: true,
    },
  },
})
