export const supabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
)

export const supplierSlug = (import.meta.env.VITE_SUPPLIER_SLUG ?? '').trim()
