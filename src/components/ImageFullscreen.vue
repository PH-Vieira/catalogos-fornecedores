<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      :aria-label="alt"
      @click.self="close"
    >
      <button
        type="button"
        class="absolute top-[max(1rem,env(safe-area-inset-top))] right-3 z-10 btn-touch rounded-full bg-white/15 text-white text-2xl active:bg-white/25"
        aria-label="Fechar"
        @click="close"
      >
        ×
      </button>

      <p
        v-if="images.length > 1"
        class="absolute top-[max(1rem,env(safe-area-inset-top))] left-3 z-10 text-sm text-white/90 bg-black/40 px-3 py-1 rounded-full"
      >
        {{ currentIndex + 1 }} / {{ images.length }}
      </p>

      <div class="relative flex-1 flex items-center justify-center w-full max-w-4xl min-h-0">
        <button
          v-if="images.length > 1"
          type="button"
          class="absolute left-0 z-10 btn-touch min-h-12 min-w-12 rounded-full bg-white/15 text-white text-2xl active:bg-white/25"
          aria-label="Foto anterior"
          @click.stop="prev"
        >
          ‹
        </button>

        <img
          :src="currentSrc"
          :alt="alt"
          class="max-h-[min(80dvh,100%)] max-w-full object-contain"
          @click.stop
        >

        <button
          v-if="images.length > 1"
          type="button"
          class="absolute right-0 z-10 btn-touch min-h-12 min-w-12 rounded-full bg-white/15 text-white text-2xl active:bg-white/25"
          aria-label="Próxima foto"
          @click.stop="next"
        >
          ›
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch, onUnmounted } from 'vue'

const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(
  defineProps<{
    images: string[]
    startIndex?: number
    alt: string
  }>(),
  { startIndex: 0 }
)

const currentIndex = defineModel<number>('index', { default: 0 })

const emit = defineEmits<{ close: [] }>()

const images = computed(() => props.images.filter(Boolean))

const currentSrc = computed(
  () => images.value[currentIndex.value] ?? images.value[0] ?? ''
)

function close() {
  open.value = false
  emit('close')
}

function prev() {
  const n = images.value.length
  if (n < 2) return
  currentIndex.value = (currentIndex.value - 1 + n) % n
}

function next() {
  const n = images.value.length
  if (n < 2) return
  currentIndex.value = (currentIndex.value + 1) % n
}

function onKeydown(e: KeyboardEvent) {
  if (!open.value) return
  if (e.key === 'Escape') close()
  if (e.key === 'ArrowLeft') prev()
  if (e.key === 'ArrowRight') next()
}

watch(
  () => props.startIndex,
  (idx) => {
    if (idx >= 0 && idx < images.value.length) currentIndex.value = idx
  }
)

watch(open, (isOpen) => {
  if (isOpen) {
    const idx = props.startIndex
    if (idx >= 0 && idx < images.value.length) currentIndex.value = idx
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeydown)
  } else {
    document.body.style.overflow = ''
    window.removeEventListener('keydown', onKeydown)
  }
})

onUnmounted(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})
</script>
