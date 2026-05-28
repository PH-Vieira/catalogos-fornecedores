import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { supabaseConfigured, supplierSlug } from '@/config'
import type { Supplier } from '@/types'

export function useSupplier() {
  const supplier = ref<Supplier | null>(null)
  const loading = ref(true)
  const error = ref('')

  async function load() {
    loading.value = true
    error.value = ''
    supplier.value = null

    try {
      if (!supabaseConfigured) {
        error.value =
          'Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env e reinicie o servidor.'
        return
      }

      if (!supplierSlug) {
        error.value =
          'Configure VITE_SUPPLIER_SLUG no .env com o slug deste fornecedor (ex: acme-pecas).'
        return
      }

      const { data, error: err } = await supabase
        .from('suppliers')
        .select('*')
        .eq('slug', supplierSlug)
        .maybeSingle()

      if (err) {
        error.value = err.message
        return
      }

      if (!data) {
        error.value = `Fornecedor "${supplierSlug}" não encontrado no banco.`
        return
      }

      supplier.value = data as Supplier
      document.title = data.name
    } catch (e) {
      error.value =
        e instanceof Error ? e.message : 'Erro ao carregar dados do fornecedor.'
    } finally {
      loading.value = false
    }
  }

  return { supplier, loading, error, load }
}
