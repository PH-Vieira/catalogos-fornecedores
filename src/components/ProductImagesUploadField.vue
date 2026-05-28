<template>
  <div class="space-y-2">
    <label class="block text-sm font-medium text-zinc-700">
      Fotos do produto
      <span class="font-normal text-zinc-500">(opcional, até {{ maxImages }})</span>
    </label>

    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      multiple
      class="sr-only"
      @change="onSelect"
    >

    <ul v-if="totalCount > 0" class="grid grid-cols-3 gap-2">
      <li
        v-for="item in galleryItems"
        :key="item.key"
        class="relative aspect-square rounded-lg border border-zinc-200 overflow-hidden bg-zinc-50"
      >
        <img
          :src="item.url"
          alt=""
          class="w-full h-full object-contain"
        >
        <button
          type="button"
          class="absolute top-1 right-1 min-h-8 min-w-8 rounded-full bg-black/60 text-white text-sm font-bold active:bg-black/80"
          aria-label="Remover foto"
          @click="removeItem(item)"
        >
          ×
        </button>
        <span
          v-if="item.pending"
          class="absolute bottom-0 inset-x-0 bg-amber-600/90 text-white text-[10px] text-center py-0.5"
        >
          Nova
        </span>
      </li>
    </ul>

    <button
      v-if="canAddMore"
      type="button"
      class="w-full flex flex-col items-center justify-center gap-2 min-h-[7rem] py-5 px-4 border-2 border-dashed border-zinc-300 rounded-xl bg-zinc-50 active:bg-zinc-100 active:border-zinc-400"
      @click="fileInput?.click()"
    >
      <ImagePlus :size="28" class="text-zinc-500" aria-hidden="true" />
      <span class="text-sm font-semibold text-zinc-800">
        {{ totalCount === 0 ? 'Toque para adicionar fotos' : 'Adicionar mais fotos' }}
      </span>
      <span class="text-xs text-zinc-500">
        JPG, PNG, WebP ou GIF · até 5 MB cada
      </span>
    </button>

    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { ImagePlus } from '@lucide/vue'
import { validateImageFile } from '@/utils/security/upload'
import { MAX_PRODUCT_IMAGES } from '@/utils/productImages'

const maxImages = MAX_PRODUCT_IMAGES

const existingUrls = defineModel<string[]>('existingUrls', { default: () => [] })
const files = defineModel<File[]>('files', { default: () => [] })

const fileInput = ref<HTMLInputElement | null>(null)
const error = ref('')
const previewUrls = ref<Map<File, string>>(new Map())

type GalleryItem = {
  key: string
  url: string
  pending: boolean
  existingIndex?: number
  file?: File
}

const galleryItems = computed((): GalleryItem[] => {
  const items: GalleryItem[] = existingUrls.value.map((url, i) => ({
    key: `existing-${i}-${url}`,
    url,
    pending: false,
    existingIndex: i,
  }))
  for (const file of files.value) {
    const url = previewUrls.value.get(file)
    if (url) {
      items.push({
        key: `pending-${file.name}-${file.size}-${file.lastModified}`,
        url,
        pending: true,
        file,
      })
    }
  }
  return items
})

const totalCount = computed(() => existingUrls.value.length + files.value.length)
const canAddMore = computed(() => totalCount.value < maxImages)

function revokeAllPreviews() {
  for (const url of previewUrls.value.values()) {
    URL.revokeObjectURL(url)
  }
  previewUrls.value = new Map()
}

function removeItem(item: GalleryItem) {
  error.value = ''
  if (item.existingIndex !== undefined) {
    existingUrls.value = existingUrls.value.filter((_, i) => i !== item.existingIndex)
    return
  }
  if (item.file) {
    const url = previewUrls.value.get(item.file)
    if (url) URL.revokeObjectURL(url)
    previewUrls.value.delete(item.file)
    files.value = files.value.filter((f) => f !== item.file)
  }
}

function onSelect(e: Event) {
  error.value = ''
  const input = e.target as HTMLInputElement
  const selected = Array.from(input.files ?? [])
  input.value = ''
  if (!selected.length) return

  const slotsLeft = maxImages - totalCount.value
  if (slotsLeft <= 0) {
    error.value = `Máximo de ${maxImages} fotos por produto.`
    return
  }

  const toAdd = selected.slice(0, slotsLeft)
  if (selected.length > slotsLeft) {
    error.value = `Só couberam mais ${slotsLeft} foto(s). Limite: ${maxImages}.`
  }

  const nextFiles = [...files.value]
  for (const file of toAdd) {
    const validationError = validateImageFile(file)
    if (validationError) {
      error.value = validationError
      continue
    }
    const duplicate = nextFiles.some(
      (f) =>
        f.name === file.name &&
        f.size === file.size &&
        f.lastModified === file.lastModified
    )
    if (duplicate) continue

    nextFiles.push(file)
    previewUrls.value.set(file, URL.createObjectURL(file))
  }
  files.value = nextFiles
}

function clear() {
  revokeAllPreviews()
  files.value = []
  existingUrls.value = []
  error.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

onUnmounted(revokeAllPreviews)

defineExpose({ clear })
</script>
