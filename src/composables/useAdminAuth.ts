import { ref, computed, watch, type Ref } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { fetchMustChangePassword } from '@/utils/password'
import type { Supplier } from '@/types'

/** Estado global — mesma sessão em / e /admin. */
const session = ref<Session | null>(null)
const mustChangePassword = ref(false)
const authReady = ref(false)

let bootstrapPromise: Promise<void> | null = null
let listenerAttached = false
let resolveSupplier: () => Supplier | null = () => null

async function syncPasswordRequirement() {
  const supplier = resolveSupplier()
  if (!supplier || !session.value || session.value.user.id !== supplier.user_id) {
    mustChangePassword.value = false
    return
  }
  try {
    mustChangePassword.value = await fetchMustChangePassword(supplier.id)
  } catch {
    mustChangePassword.value = supplier.must_change_password === true
  }
}

function attachAuthListener() {
  if (listenerAttached) return
  listenerAttached = true

  supabase.auth.onAuthStateChange(async (event, s) => {
    if (event === 'SIGNED_OUT') {
      session.value = null
      mustChangePassword.value = false
      return
    }
    if (
      s &&
      (event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'INITIAL_SESSION')
    ) {
      session.value = s
      await syncPasswordRequirement()
    }
  })
}

export async function ensureAuthReady(): Promise<void> {
  attachAuthListener()
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const { data } = await supabase.auth.getSession()
      session.value = data.session
      authReady.value = true
      await syncPasswordRequirement()
    })()
  }
  await bootstrapPromise
}

/** Sessão admin persistente entre catálogo e painel. */
export function useAdminAuth(supplier: () => Supplier | null) {
  resolveSupplier = supplier
  attachAuthListener()

  void ensureAuthReady()

  watch(
    () => [supplier()?.id, session.value?.user.id] as const,
    () => {
      void syncPasswordRequirement()
    }
  )

  const isOwner = computed(() => {
    const s = supplier()
    return !!session.value && !!s && session.value.user.id === s.user_id
  })

  async function refreshAuth() {
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    authReady.value = true
    await syncPasswordRequirement()
  }

  function setSession(s: Session | null) {
    session.value = s
  }

  function onPasswordChanged() {
    mustChangePassword.value = false
    const s = supplier()
    if (s) s.must_change_password = false
  }

  async function signOut() {
    await supabase.auth.signOut()
    session.value = null
    mustChangePassword.value = false
    // Mantém authReady true: verificação concluída (usuário deslogado), senão a tela fica em "Carregando…"
    authReady.value = true
    bootstrapPromise = Promise.resolve()
  }

  return {
    session: session as Ref<Session | null>,
    mustChangePassword,
    authReady,
    isOwner,
    refreshAuth,
    setSession,
    syncPasswordRequirement,
    onPasswordChanged,
    signOut,
  }
}
