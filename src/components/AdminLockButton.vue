<template>
  <button
    type="button"
    class="fixed z-40 h-14 w-14 rounded-full bg-zinc-900 text-white shadow-lg flex items-center justify-center active:bg-zinc-700 right-3 sm:right-4 bottom-[max(1rem,env(safe-area-inset-bottom))]"
    aria-label="Área administrativa"
    title="Área administrativa"
    @click="openModal"
  >
    <Lock :size="24" aria-hidden="true" />
  </button>

  <div
    v-if="open"
    class="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center bg-black/50 p-0 sm:p-4"
    @click.self="closeModal"
  >
    <div
      class="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-xl p-5 pb-safe space-y-4 max-h-[92dvh] overflow-y-auto"
      role="dialog"
      aria-labelledby="admin-login-title"
    >
      <div class="flex items-center justify-between gap-2">
        <h2 id="admin-login-title" class="text-lg font-bold text-zinc-900 flex items-center gap-2">
          <Lock :size="20" aria-hidden="true" />
          {{ step === 'password' ? 'Nova senha' : 'Administração' }}
        </h2>
        <button
          v-if="step === 'login'"
          type="button"
          class="btn-touch text-2xl text-zinc-500 active:text-zinc-900"
          aria-label="Fechar"
          @click="closeModal"
        >
          ×
        </button>
      </div>

      <ForcePasswordChange
        v-if="step === 'password'"
        :supplier-id="supplier.id"
        @done="onPasswordChanged"
      />

      <template v-else>
        <p v-if="message" class="text-sm text-red-600">{{ message }}</p>
        <AdminLoginForm
          compact
          :supplier="supplier"
          @success="onLoginSuccess"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { useRouter } from 'vue-router'
import { Lock } from '@lucide/vue'
import { supabase } from '@/lib/supabase'
import { fetchMustChangePassword } from '@/utils/password'
import AdminLoginForm from '@/components/AdminLoginForm.vue'
import ForcePasswordChange from '@/components/ForcePasswordChange.vue'
import type { Supplier } from '@/types'

const props = defineProps<{
  supplier: Supplier
}>()

const router = useRouter()
const open = ref(false)
const step = ref<'login' | 'password'>('login')
const message = ref('')

function openModal() {
  step.value = 'login'
  message.value = ''
  open.value = true
}

function closeModal() {
  open.value = false
  step.value = 'login'
  message.value = ''
}

async function onLoginSuccess(session: Session) {
  if (session.user.id !== props.supplier.user_id) {
    await supabase.auth.signOut()
    message.value = 'Esta conta não administra esta loja.'
    return
  }

  try {
    const mustChange = await fetchMustChangePassword(props.supplier.id)
    if (mustChange) {
      step.value = 'password'
      return
    }
  } catch (e) {
    message.value = e instanceof Error ? e.message : 'Erro ao verificar conta.'
    return
  }

  closeModal()
  await router.push('/admin')
}

async function onPasswordChanged() {
  closeModal()
  await router.push('/admin')
}
</script>
