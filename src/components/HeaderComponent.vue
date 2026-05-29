<template>
  <header class="bg-white border-b border-zinc-300 pt-safe shadow-sm">
    <div class="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 space-y-2.5 sm:space-y-3">
      <div class="flex items-center justify-between gap-2 min-h-12">
        <img
          v-if="logoUrl"
          :src="logoUrl"
          :alt="`Logo ${name}`"
          class="h-11 sm:h-14 w-auto max-w-[58%] object-contain"
        >
        <h1
          v-else
          class="text-lg sm:text-2xl font-bold text-zinc-900 leading-tight line-clamp-2 max-w-[58%]"
        >
          {{ name }}
        </h1>

        <button
          type="button"
          class="btn-touch relative shrink-0 flex items-center justify-center rounded-xl border-2 border-zinc-900 bg-white active:bg-zinc-100"
          aria-label="Abrir carrinho"
          @click="$emit('open-cart')"
        >
          <ShoppingCart :size="26" aria-hidden="true" />
          <span
            v-if="cartCount > 0"
            class="absolute -top-1 -right-1 min-w-[1.35rem] h-[1.35rem] px-1 flex items-center justify-center text-[11px] font-bold text-white bg-green-600 rounded-full"
          >
            {{ cartCount > 99 ? '99+' : cartCount }}
          </span>
        </button>
      </div>

      <nav
        v-if="phone || whatsapp || instagram"
        class="grid gap-2"
        :class="contactCols"
        aria-label="Formas de contato"
      >
        <a v-if="phone" :href="`tel:${phone}`" :class="contactBtnClass">
          <PhoneCall :size="20" class="shrink-0" aria-hidden="true" />
          <span>Ligar</span>
        </a>
        <a
          v-if="whatsappUrl"
          :href="whatsappUrl"
          :class="contactBtnClass"
          target="_blank"
          rel="noopener"
        >
          <PhWhatsappLogo :size="20" class="shrink-0" aria-hidden="true" />
          <span>WhatsApp</span>
        </a>
        <a
          v-if="instagram"
          :href="instagram"
          :class="contactBtnClass"
          target="_blank"
          rel="noopener"
        >
          <PhInstagramLogo :size="20" class="shrink-0" aria-hidden="true" />
          <span>Instagram</span>
        </a>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ShoppingCart, PhoneCall } from '@lucide/vue'
import { PhWhatsappLogo, PhInstagramLogo } from '@phosphor-icons/vue'
import { buildWhatsAppGreetingUrl } from '@/utils/whatsapp'

const props = defineProps<{
  name: string
  logoUrl?: string | null
  phone?: string | null
  whatsapp?: string | null
  instagram?: string | null
  cartCount: number
}>()

defineEmits<{ 'open-cart': [] }>()

const whatsappUrl = computed(() =>
  buildWhatsAppGreetingUrl(props.whatsapp, props.name)
)

const contactCount = computed(() =>
  [props.phone, props.whatsapp, props.instagram].filter(Boolean).length
)

const contactCols = computed(() => {
  if (contactCount.value <= 1) return 'grid-cols-1'
  if (contactCount.value === 2) return 'grid-cols-2'
  return 'grid-cols-3'
})

const contactBtnClass =
  'flex items-center justify-center gap-1.5 min-h-12 px-2 text-sm sm:text-base font-bold text-zinc-900 bg-white border-2 border-zinc-900 rounded-xl no-underline active:bg-zinc-50'
</script>
