<template>
  <div class="space-y-4">
    <div v-if="!compact">
      <h2 class="font-bold text-zinc-900">
        Entrar
      </h2>
      <p class="text-sm text-zinc-600 mt-1">
        Acesso restrito a <strong>{{ supplier.name }}</strong>.
      </p>
    </div>
    <p v-else class="text-sm text-zinc-600">
      Entre para gerenciar os produtos de <strong>{{ supplier.name }}</strong>.
    </p>

    <p
      v-if="lockMessage"
      class="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
    >
      {{ lockMessage }}
    </p>
    <p
      v-else-if="message"
      class="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2"
    >
      {{ message }}
    </p>

    <form class="space-y-3" @submit.prevent="submitPassword">
      <div v-if="!compact" class="space-y-1">
        <label class="text-sm font-medium text-zinc-700">E-mail</label>
        <input
          v-model="email"
          type="email"
          required
          autocomplete="email"
          maxlength="254"
          :class="inputClass"
          @input="updateLockMessage"
        >
      </div>
      <input
        v-else
        v-model="email"
        type="email"
        required
        autocomplete="email"
        placeholder="E-mail"
        maxlength="254"
        :class="inputClass"
        @input="updateLockMessage"
      >

      <div v-if="!compact" class="space-y-1">
        <label class="text-sm font-medium text-zinc-700">Senha</label>
        <input
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          maxlength="128"
          :class="inputClass"
        >
      </div>
      <input
        v-else
        v-model="password"
        type="password"
        required
        autocomplete="current-password"
        placeholder="Senha"
        maxlength="128"
        :class="inputClass"
      >

      <label class="flex items-center gap-2.5 min-h-11 cursor-pointer select-none">
        <input
          v-model="rememberMe"
          type="checkbox"
          class="h-5 w-5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
          @change="onRememberChange"
        >
        <span class="text-sm text-zinc-700">Lembrar login neste aparelho</span>
      </label>

      <button
        type="submit"
        class="w-full min-h-12 py-3 text-base font-bold text-white bg-zinc-900 rounded-xl active:bg-zinc-700 disabled:opacity-50"
        :disabled="loading || !!lockMessage"
      >
        Entrar com senha
      </button>
    </form>

    <template v-if="passkeyAvailable">
      <div class="flex items-center gap-3 text-xs text-zinc-400">
        <span class="flex-1 h-px bg-zinc-200" />
        ou
        <span class="flex-1 h-px bg-zinc-200" />
      </div>

      <button
        type="button"
        class="w-full min-h-12 py-3 text-base font-semibold text-zinc-900 bg-white border-2 border-zinc-900 rounded-xl active:bg-zinc-50 disabled:opacity-50 flex items-center justify-center gap-2"
        :disabled="loading"
        @click="submitPasskey"
      >
        <Fingerprint :size="22" aria-hidden="true" />
        Entrar com rosto ou digital
      </button>
      <p class="text-xs text-zinc-500 text-center leading-snug">
        Na primeira vez, entre com e-mail e senha. Depois você pode cadastrar o celular para entrar mais rápido.
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { Fingerprint } from '@lucide/vue'
import { secureSignIn } from '@/composables/useSecureSignIn'
import {
  signInWithPasskeyAuth,
  supportsPasskeys,
} from '@/composables/usePasskeyAuth'
import { applyRememberPreference, getRememberLogin } from '@/utils/authStorage'
import { getLoginLockMessage } from '@/utils/security/loginRateLimit'
import type { Supplier } from '@/types'

const props = defineProps<{
  supplier: Supplier
  compact?: boolean
}>()

const emit = defineEmits<{
  success: [session: Session]
}>()

const inputClass =
  'input-touch w-full px-4 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900'

const email = ref('')
const password = ref('')
const rememberMe = ref(true)
const loading = ref(false)
const message = ref('')
const lockMessage = ref<string | null>(null)
const passkeyAvailable = supportsPasskeys()

onMounted(() => {
  rememberMe.value = getRememberLogin()
})

function onRememberChange() {
  applyRememberPreference(rememberMe.value)
}

function updateLockMessage() {
  lockMessage.value = email.value ? getLoginLockMessage(email.value) : null
}

async function submitPassword() {
  loading.value = true
  message.value = ''
  updateLockMessage()
  if (lockMessage.value) {
    loading.value = false
    return
  }

  const { session, error } = await secureSignIn(
    email.value,
    password.value,
    rememberMe.value
  )
  loading.value = false

  if (error || !session) {
    message.value = error ?? 'E-mail ou senha inválidos.'
    updateLockMessage()
    return
  }

  emit('success', session)
}

async function submitPasskey() {
  loading.value = true
  message.value = ''
  const { session, error } = await signInWithPasskeyAuth(rememberMe.value)
  loading.value = false

  if (error || !session) {
    message.value = error ?? 'Não foi possível entrar. Tente de novo ou use e-mail e senha.'
    return
  }

  emit('success', session)
}
</script>
