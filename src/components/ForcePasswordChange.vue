<template>
  <div class="bg-white border border-zinc-200 rounded-lg p-4 space-y-3">
    <h3 class="font-bold text-zinc-900">
      Defina sua nova senha
    </h3>
    <p class="text-sm text-zinc-600">
      Por segurança, no primeiro acesso você precisa criar uma senha pessoal.
    </p>
    <p v-if="message" class="text-sm text-red-600">{{ message }}</p>
    <form class="space-y-3" @submit.prevent="submit">
      <input
        v-model="newPassword"
        type="password"
        required
        minlength="6"
        autocomplete="new-password"
        placeholder="Nova senha (mín. 6 caracteres)"
        class="input-touch w-full px-4 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900"
      >
      <input
        v-model="confirmPassword"
        type="password"
        required
        minlength="6"
        autocomplete="new-password"
        placeholder="Confirmar nova senha"
        class="input-touch w-full px-4 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900"
      >
      <button
        type="submit"
        class="w-full min-h-12 py-3 text-base font-bold text-white bg-zinc-900 rounded-xl active:bg-zinc-700 disabled:opacity-50"
        :disabled="loading"
      >
        Salvar nova senha
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { setNewPassword } from '@/utils/password'
import { validatePassword } from '@/utils/security/validate'

const props = defineProps<{
  supplierId: string
}>()

const emit = defineEmits<{
  done: []
}>()

const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const message = ref('')

async function submit() {
  message.value = ''
  if (newPassword.value !== confirmPassword.value) {
    message.value = 'As senhas não coincidem.'
    return
  }
  const passwordError = validatePassword(newPassword.value)
  if (passwordError) {
    message.value = passwordError
    return
  }

  loading.value = true
  try {
    await setNewPassword(props.supplierId, newPassword.value)
    newPassword.value = ''
    confirmPassword.value = ''
    emit('done')
  } catch (e) {
    message.value = e instanceof Error ? e.message : 'Erro ao alterar senha.'
  } finally {
    loading.value = false
  }
}
</script>
