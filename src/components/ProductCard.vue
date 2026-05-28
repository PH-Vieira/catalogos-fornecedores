<template>
  <article class="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col h-full">
    <div class="relative aspect-[4/5] sm:aspect-square bg-zinc-50 overflow-hidden">
      <button
        type="button"
        class="absolute inset-0 z-0 flex items-center justify-center p-2 w-full active:bg-zinc-100/80"
        :aria-label="`Ampliar foto: ${product.description}`"
        @click="openPreview"
      >
        <Transition :name="transitionName" mode="out-in">
          <img
            :key="imageIndex"
            :src="currentImage"
            :alt="product.description"
            class="max-h-full max-w-full object-contain pointer-events-none"
            loading="lazy"
          >
        </Transition>
      </button>

      <template v-if="images.length > 1">
        <button
          type="button"
          class="gallery-nav gallery-nav--prev"
          aria-label="Foto anterior"
          @click.stop="prevImage"
        >
          <ChevronLeft :size="22" stroke-width="2.25" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="gallery-nav gallery-nav--next"
          aria-label="Próxima foto"
          @click.stop="nextImage"
        >
          <ChevronRight :size="22" stroke-width="2.25" aria-hidden="true" />
        </button>

        <div
          class="absolute bottom-2 inset-x-0 z-10 flex justify-center gap-1.5 pointer-events-none px-2"
          aria-hidden="true"
        >
          <span
            v-for="(_, i) in images"
            :key="i"
            class="h-1.5 rounded-full transition-all duration-300 ease-out shadow-sm"
            :class="
              i === imageIndex
                ? 'w-5 bg-white'
                : 'w-1.5 bg-white/45'
            "
          />
        </div>
      </template>
    </div>
    <div class="p-2.5 sm:p-3 flex flex-col gap-1 flex-1 min-h-0">
      <p class="text-[11px] sm:text-xs text-zinc-500 font-medium truncate">
        Cód. {{ product.code }}
      </p>
      <h2 class="text-sm text-zinc-900 line-clamp-2 leading-snug min-h-[2.5rem]">
        {{ product.description }}
      </h2>
      <span
        class="inline-block self-start text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full"
        :class="product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-zinc-100 text-zinc-600'"
      >
        {{ product.stock > 0 ? `${product.stock} em estoque` : 'Sem estoque' }}
      </span>
      <p class="text-base sm:text-lg font-bold text-zinc-900 mt-auto pt-1">
        {{ formatPrice(Number(product.price)) }}
      </p>
      <button
        type="button"
        class="mt-2 w-full min-h-11 py-2.5 text-sm font-bold rounded-xl active:scale-[0.98] transition-transform"
        :class="
          canAdd
            ? 'bg-zinc-900 text-white active:bg-zinc-700'
            : 'bg-zinc-200 text-zinc-500 cursor-not-allowed'
        "
        :disabled="!canAdd"
        @click="onAdd"
      >
        {{ addedFeedback ? '✓ No carrinho' : 'Adicionar' }}
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import type { Product } from '@/types'
import { formatPrice } from '@/utils/format'
import { useCart } from '@/composables/useCart'
import { productImageUrls } from '@/utils/productImages'

const props = defineProps<{ product: Product }>()

const emit = defineEmits<{
  'preview-images': [images: string[], index: number, alt: string]
}>()

const { add, items } = useCart()
const addedFeedback = ref(false)
const imageIndex = ref(0)
const slideDir = ref(1)

const placeholder =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" fill="#d4d4d8"><rect width="200" height="200"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#71717a" font-family="sans-serif" font-size="14">Sem foto</text></svg>'
  )

const images = computed(() => productImageUrls(props.product))

const currentImage = computed(
  () => images.value[imageIndex.value] ?? images.value[0] ?? placeholder
)

const transitionName = computed(() =>
  slideDir.value > 0 ? 'gallery-slide-next' : 'gallery-slide-prev'
)

const canAdd = computed(() => {
  if (props.product.stock <= 0) return false
  const inCart = items.value.find((i) => i.product.id === props.product.id)
  return !inCart || inCart.quantity < props.product.stock
})

function go(delta: number) {
  const n = images.value.length
  if (n < 2) return
  slideDir.value = delta
  imageIndex.value = (imageIndex.value + delta + n) % n
}

function prevImage() {
  go(-1)
}

function nextImage() {
  go(1)
}

function openPreview() {
  const list = images.value.length ? images.value : [placeholder]
  emit('preview-images', list, imageIndex.value, props.product.description)
}

function onAdd() {
  if (!add(props.product, 1)) return
  addedFeedback.value = true
  setTimeout(() => {
    addedFeedback.value = false
  }, 1500)
}
</script>

<style scoped>
.gallery-nav {
  position: absolute;
  top: 50%;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  margin-top: -1.125rem;
  border-radius: 9999px;
  color: #27272a;
  background: rgb(255 255 255 / 0.92);
  border: 1px solid rgb(228 228 231 / 0.9);
  box-shadow:
    0 1px 2px rgb(0 0 0 / 0.06),
    0 4px 12px rgb(0 0 0 / 0.08);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.gallery-nav--prev {
  left: 0.5rem;
}

.gallery-nav--next {
  right: 0.5rem;
}

.gallery-nav:active {
  transform: scale(0.92);
  background: rgb(255 255 255 / 1);
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.1);
}

@media (min-width: 640px) {
  .gallery-nav {
    width: 2.5rem;
    height: 2.5rem;
    margin-top: -1.25rem;
  }

  .gallery-nav--prev {
    left: 0.625rem;
  }

  .gallery-nav--next {
    right: 0.625rem;
  }
}

.gallery-slide-next-enter-active,
.gallery-slide-next-leave-active,
.gallery-slide-prev-enter-active,
.gallery-slide-prev-leave-active {
  transition:
    opacity 0.28s ease,
    transform 0.28s ease;
}

.gallery-slide-next-enter-from {
  opacity: 0;
  transform: translateX(14px);
}

.gallery-slide-next-leave-to {
  opacity: 0;
  transform: translateX(-14px);
}

.gallery-slide-prev-enter-from {
  opacity: 0;
  transform: translateX(-14px);
}

.gallery-slide-prev-leave-to {
  opacity: 0;
  transform: translateX(14px);
}

@media (prefers-reduced-motion: reduce) {
  .gallery-nav {
    transition: background-color 0.15s ease;
  }

  .gallery-slide-next-enter-active,
  .gallery-slide-next-leave-active,
  .gallery-slide-prev-enter-active,
  .gallery-slide-prev-leave-active {
    transition: opacity 0.15s ease;
  }

  .gallery-slide-next-enter-from,
  .gallery-slide-next-leave-to,
  .gallery-slide-prev-enter-from,
  .gallery-slide-prev-leave-to {
    transform: none;
  }
}
</style>
