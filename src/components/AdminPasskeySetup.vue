<template>
  <div class="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm space-y-3">
    <div class="flex items-start gap-3">
      <div
        class="shrink-0 h-11 w-11 rounded-xl bg-zinc-100 flex items-center justify-center"
      >
        <Fingerprint :size="24" class="text-zinc-700" aria-hidden="true" />
      </div>
      <div class="min-w-0 flex-1">
        <h3 class="font-bold text-zinc-900 text-sm">
          Entrar mais rápido neste celular
        </h3>
        <p class="text-xs text-zinc-600 mt-1 leading-relaxed">
          Cadastre o rosto ou a digital do celular para não precisar digitar a senha toda vez.
        </p>
      </div>
      <button
        type="button"
        class="shrink-0 min-h-9 px-3 text-sm font-semibold text-zinc-600 border border-zinc-300 rounded-lg active:bg-zinc-50"
        aria-label="Fechar"
        @click="emit('close')"
      >
        Fechar
      </button>
    </div>

    <p v-if="message" class="text-sm text-red-600">{{ message }}</p>
    <p v-else-if="success" class="text-sm text-green-700 font-medium">
      Pronto! Da próxima vez você pode entrar com rosto ou digital.
    </p>

    <button
      type="button"
      class="w-full min-h-11 py-2.5 text-sm font-semibold border-2 border-zinc-900 rounded-xl bg-white active:bg-zinc-50 disabled:opacity-50"
      :disabled="loading || success"
      @click="register"
    >
      {{ loading ? 'Aguarde…' : 'Cadastrar neste celular' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Fingerprint } from '@lucide/vue'
import { registerPasskeyAuth } from '@/composables/usePasskeyAuth'

const emit = defineEmits<{
  close: []
}>()

const loading = ref(false)
const message = ref('')
const success = ref(false)

async function register() {
  loading.value = true
  message.value = ''
  success.value = false

  const result = await registerPasskeyAuth()
  loading.value = false

  if (result.error) {
    message.value = result.error
    return
  }

  success.value = true
}
</script>
