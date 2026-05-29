<template>
  <section class="bg-white border border-zinc-200 rounded-xl p-5 space-y-4 shadow-sm">
    <div>
      <h2 class="font-bold text-zinc-900">
        Dados da loja
      </h2>
      <p class="text-sm text-zinc-600 mt-1">
        Nome, logo e contatos exibidos no catálogo.
      </p>
    </div>

    <p v-if="storeMessage" class="text-sm rounded-lg px-3 py-2" :class="storeMessageClass">
      {{ storeMessage }}
    </p>

    <form class="space-y-4" @submit.prevent="save">
      <div class="space-y-1">
        <label class="text-sm font-medium text-zinc-700">Nome da loja</label>
        <input
          v-model="profile.name"
          type="text"
          required
          maxlength="120"
          placeholder="Ex: Loja Exemplo"
          :class="inputClass"
          :disabled="saving"
        >
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium text-zinc-700">Logo</label>
        <div
          v-if="profile.logo_url.trim()"
          class="flex items-center gap-3 p-3 border border-zinc-200 rounded-xl bg-zinc-50"
        >
          <img
            :src="profile.logo_url"
            alt="Prévia da logo"
            class="h-14 w-auto max-w-[40%] object-contain"
            @error="onLogoPreviewError"
          >
          <button
            type="button"
            class="text-sm font-semibold text-red-700 underline"
            :disabled="saving"
            @click="profile.logo_url = ''"
          >
            Remover logo
          </button>
        </div>
        <div class="space-y-1">
          <label class="text-xs text-zinc-500">Link da logo (URL)</label>
          <input
            v-model="profile.logo_url"
            type="url"
            inputmode="url"
            maxlength="500"
            placeholder="https://…"
            :class="inputClass"
            :disabled="saving"
          >
        </div>
        <label
          class="flex flex-col items-center justify-center gap-2 min-h-[5rem] py-4 px-4 border-2 border-dashed border-zinc-300 rounded-xl bg-zinc-50 active:bg-zinc-100 cursor-pointer"
          :class="{ 'opacity-50 pointer-events-none': saving }"
        >
          <ImagePlus :size="24" class="text-zinc-500" aria-hidden="true" />
          <span class="text-sm font-semibold text-zinc-800">
            {{ uploadingLogo ? 'Enviando logo…' : 'Enviar logo do celular / computador' }}
          </span>
          <span class="text-xs text-zinc-500">JPG, PNG, WebP ou GIF · até 5 MB</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            class="sr-only"
            :disabled="saving || uploadingLogo"
            @change="onLogoFile"
          >
        </label>
      </div>

      <div class="space-y-1">
        <label class="text-sm font-medium text-zinc-700">Telefone</label>
        <input
          v-model="profile.phone"
          type="tel"
          inputmode="tel"
          maxlength="30"
          placeholder="Ex: (11) 99999-9999"
          :class="inputClass"
          :disabled="saving"
        >
      </div>

      <div class="space-y-1">
        <label class="text-sm font-medium text-zinc-700">WhatsApp</label>
        <input
          v-model="profile.whatsapp"
          type="tel"
          inputmode="tel"
          maxlength="30"
          placeholder="Ex: (11) 99999-9999"
          :class="inputClass"
          :disabled="saving"
        >
        <p class="text-xs text-zinc-500">
          Usado no botão de compra do carrinho.
        </p>
      </div>

      <div class="space-y-1">
        <label class="text-sm font-medium text-zinc-700">Instagram</label>
        <input
          v-model="profile.instagram"
          type="text"
          maxlength="200"
          placeholder="Ex: @sualoja ou https://instagram.com/sualoja"
          :class="inputClass"
          :disabled="saving"
        >
      </div>

      <button
        type="submit"
        class="w-full min-h-12 py-3 text-base font-bold text-white bg-zinc-900 rounded-xl active:bg-zinc-700 disabled:opacity-50"
        :disabled="saving || uploadingLogo"
      >
        {{ saving ? 'Salvando…' : 'Salvar dados da loja' }}
      </button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ImagePlus } from '@lucide/vue'
import { supabase } from '@/lib/supabase'
import { withTimeout } from '@/utils/async'
import { validateImageFile, safeImageExtension } from '@/utils/security/upload'
import { validateSupplierProfile } from '@/utils/security/validateSupplier'
import type { Supplier } from '@/types'

const props = defineProps<{
  supplier: Supplier
}>()

const emit = defineEmits<{
  saved: [supplier: Supplier]
}>()

const inputClass =
  'input-touch w-full px-4 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900'

const DB_TIMEOUT_MS = 30_000
const UPLOAD_TIMEOUT_MS = 60_000

const profile = ref({
  name: '',
  logo_url: '',
  phone: '',
  whatsapp: '',
  instagram: '',
})

const saving = ref(false)
const uploadingLogo = ref(false)
const storeMessage = ref('')
const storeSuccess = ref(false)

const storeMessageClass = computed(() =>
  storeSuccess.value
    ? 'text-emerald-800 bg-emerald-50 border border-emerald-100'
    : 'text-red-600 bg-red-50 border border-red-100'
)

function syncFromSupplier(s: Supplier) {
  profile.value = {
    name: s.name,
    logo_url: s.logo_url ?? '',
    phone: s.phone ?? '',
    whatsapp: s.whatsapp ?? '',
    instagram: s.instagram ?? '',
  }
}

watch(
  () => props.supplier,
  (s) => syncFromSupplier(s),
  { immediate: true }
)

function onLogoPreviewError() {
  storeSuccess.value = false
  storeMessage.value = 'Não foi possível carregar a imagem deste link.'
}

async function uploadLogo(file: File): Promise<string> {
  const fileError = validateImageFile(file)
  if (fileError) throw new Error(fileError)
  const ext = safeImageExtension(file)
  const path = `${props.supplier.id}/logo-${Date.now()}.${ext}`
  const { error } = await withTimeout(
    () =>
      supabase.storage.from('product-images').upload(path, file, {
        upsert: true,
      }),
    UPLOAD_TIMEOUT_MS,
    'Envio da logo demorou demais.'
  )
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data.publicUrl
}

async function onLogoFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  storeMessage.value = ''
  storeSuccess.value = false
  uploadingLogo.value = true
  try {
    profile.value.logo_url = await uploadLogo(file)
    storeSuccess.value = true
    storeMessage.value = 'Logo enviada. Toque em “Salvar dados da loja” para publicar.'
  } catch (err: unknown) {
    storeMessage.value = err instanceof Error ? err.message : 'Erro ao enviar logo.'
  } finally {
    uploadingLogo.value = false
  }
}

async function save() {
  const validated = validateSupplierProfile(profile.value)
  if (!validated.ok) {
    storeSuccess.value = false
    storeMessage.value = validated.error
    return
  }

  saving.value = true
  storeMessage.value = ''
  storeSuccess.value = false

  try {
    const { data, error } = await withTimeout(
      () =>
        supabase
          .from('suppliers')
          .update(validated.data)
          .eq('id', props.supplier.id)
          .select('*')
          .single(),
      DB_TIMEOUT_MS,
      'Salvar demorou demais. Verifique sua conexão.'
    )
    if (error) throw new Error(error.message)

    const updated = data as Supplier
    syncFromSupplier(updated)
    storeSuccess.value = true
    storeMessage.value = 'Dados da loja salvos.'
    emit('saved', updated)
  } catch (err: unknown) {
    storeMessage.value = err instanceof Error ? err.message : 'Erro ao salvar.'
  } finally {
    saving.value = false
  }
}
</script>
