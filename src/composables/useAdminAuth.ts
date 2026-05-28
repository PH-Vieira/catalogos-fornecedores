import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { fetchMustChangePassword } from '@/utils/password'
import type { Supplier } from '@/types'

/** Sessão admin persistente — evita “logout” ao voltar de / para /admin. */
export function useAdminAuth(supplier: () => Supplier | null) {
  const session = ref<Session | null>(null)
  const mustChangePassword = ref(false)
  const authReady = ref(false)

  const isOwner = computed(() => {
    const s = supplier()
    return !!session.value && !!s && session.value.user.id === s.user_id
  })

  let authUnsubscribe: (() => void) | null = null

  async function syncPasswordRequirement() {
    const s = supplier()
    if (!s || !isOwner.value) {
      mustChangePassword.value = false
      return
    }
    try {
      mustChangePassword.value = await fetchMustChangePassword(s.id)
    } catch {
      mustChangePassword.value = s.must_change_password === true
    }
  }

  async function refreshAuth() {
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    await syncPasswordRequirement()
  }

  onMounted(async () => {
    await refreshAuth()
    authReady.value = true

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (event === 'SIGNED_OUT') {
        session.value = null
        mustChangePassword.value = false
        return
      }
      if (s && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
        session.value = s
        await syncPasswordRequirement()
      }
    })
    authUnsubscribe = () => sub.subscription.unsubscribe()
  })

  onUnmounted(() => authUnsubscribe?.())

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
  }

  return {
    session,
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
