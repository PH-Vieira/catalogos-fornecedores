<template>
  <Teleport to="body">
    <Transition name="modal-overlay">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex flex-col justify-end sm:flex-row sm:justify-end bg-black/50"
        @click.self="open = false"
      >
        <aside
          class="drawer-panel bg-white w-full sm:max-w-md flex flex-col shadow-2xl rounded-t-2xl sm:rounded-none h-[min(92dvh,100%)] sm:h-full max-h-[100dvh]"
          role="dialog"
          aria-labelledby="cart-title"
          @click.stop
        >
        <div
          class="flex items-center justify-between border-b border-zinc-200 px-4 py-3 shrink-0 pt-3"
        >
          <div class="w-10 sm:hidden flex justify-center absolute left-1/2 -translate-x-1/2 top-2">
            <span class="w-10 h-1 rounded-full bg-zinc-300" aria-hidden="true" />
          </div>
          <h2 id="cart-title" class="text-lg font-bold text-zinc-900 pt-2 sm:pt-0">
            Carrinho
            <span v-if="itemCount" class="text-zinc-500 font-normal">
              ({{ itemCount }})
            </span>
          </h2>
          <button
            type="button"
            class="btn-touch text-2xl text-zinc-500 active:text-zinc-900 -mr-2"
            aria-label="Fechar carrinho"
            @click="open = false"
          >
            ×
          </button>
        </div>

        <div
          v-if="items.length === 0"
          class="flex-1 flex items-center justify-center p-8"
        >
          <p class="text-zinc-500 text-center text-base">
            Seu carrinho está vazio.<br>Adicione produtos do catálogo.
          </p>
        </div>

        <ul
          v-else
          class="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-4 py-3 space-y-3"
        >
          <li
            v-for="item in items"
            :key="item.product.id"
            class="border border-zinc-200 rounded-xl p-3 bg-zinc-50/50"
          >
            <div class="flex gap-3">
              <div
                class="w-[4.5rem] h-[4.5rem] shrink-0 rounded-lg bg-white border border-zinc-200 flex items-center justify-center overflow-hidden"
              >
                <img
                  v-if="cartThumb(item.product)"
                  :src="cartThumb(item.product)!"
                  :alt="item.product.description"
                  class="w-full h-full object-contain"
                >
                <span v-else class="text-[10px] text-zinc-400 px-1 text-center">Sem foto</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs text-zinc-500">
                  {{ item.product.code }}
                </p>
                <p class="text-sm font-medium text-zinc-900 line-clamp-2 leading-snug">
                  {{ item.product.description }}
                </p>
                <p class="text-base font-bold text-zinc-900 mt-1">
                  {{ formatPrice(Number(item.product.price)) }}
                </p>
              </div>
            </div>

            <div class="mt-3 flex flex-wrap items-center gap-2">
              <span class="text-xs text-zinc-500 w-full sm:w-auto">Quantidade</span>
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  class="btn-touch w-11 rounded-xl border border-zinc-300 bg-white text-lg font-bold active:bg-zinc-100"
                  aria-label="Diminuir"
                  @click="setQuantity(item.product.id, item.quantity - 1)"
                >
                  −
                </button>
                <input
                  type="number"
                  :value="item.quantity"
                  min="1"
                  :max="item.product.stock"
                  class="input-touch w-14 text-center border border-zinc-300 rounded-xl font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  aria-label="Quantidade"
                  @change="onQuantityInput(item.product.id, item.product.stock, $event)"
                >
                <button
                  type="button"
                  class="btn-touch w-11 rounded-xl border border-zinc-300 bg-white text-lg font-bold active:bg-zinc-100 disabled:opacity-40"
                  :disabled="item.quantity >= item.product.stock"
                  aria-label="Aumentar"
                  @click="setQuantity(item.product.id, item.quantity + 1)"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                class="ml-auto min-h-11 px-3 text-sm font-semibold text-red-700 active:bg-red-50 rounded-lg"
                @click="remove(item.product.id)"
              >
                Remover
              </button>
            </div>
          </li>
        </ul>

        <div
          v-if="items.length"
          class="shrink-0 border-t border-zinc-200 px-4 pt-4 pb-safe space-y-3 bg-white"
        >
          <div class="flex justify-between text-lg font-bold text-zinc-900">
            <span>Total</span>
            <span>{{ formatPrice(total) }}</span>
          </div>

          <a
            v-if="whatsappUrl"
            :href="whatsappUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center justify-center gap-2 w-full min-h-14 text-base font-bold text-white bg-green-600 active:bg-green-700 rounded-xl no-underline"
            @click="onWhatsAppCheckout"
          >
            <PhWhatsappLogo :size="24" aria-hidden="true" />
            Comprar no WhatsApp
          </a>
          <p v-else class="text-sm text-amber-800 text-center bg-amber-50 rounded-lg p-3">
            WhatsApp do fornecedor não configurado.
          </p>

          <button
            type="button"
            class="w-full min-h-11 text-sm text-zinc-600 active:text-zinc-900"
            @click="clear(); open = false"
          >
            Limpar carrinho
          </button>
        </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { PhWhatsappLogo } from '@phosphor-icons/vue'
import { useCart } from '@/composables/useCart'
import { formatPrice } from '@/utils/format'
import { buildWhatsAppCheckoutUrl } from '@/utils/whatsapp'
import { primaryProductImage } from '@/utils/productImages'
import type { Product } from '@/types'

function cartThumb(product: Product): string | null {
  return primaryProductImage(product)
}

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  whatsapp: string | null
}>()

const { items, itemCount, total, setQuantity, remove, clear } = useCart()

watch(open, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

function onQuantityInput(
  productId: string,
  maxStock: number,
  event: Event
) {
  const input = event.target as HTMLInputElement
  const parsed = parseInt(input.value, 10)
  if (!Number.isFinite(parsed) || parsed < 1) {
    setQuantity(productId, 1)
    input.value = '1'
    return
  }
  const qty = Math.min(parsed, maxStock)
  setQuantity(productId, qty)
  input.value = String(qty)
}

const whatsappUrl = computed(() =>
  buildWhatsAppCheckoutUrl(props.whatsapp, items.value)
)

function onWhatsAppCheckout() {
  open.value = false
  clear()
}
</script>
