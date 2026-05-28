<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import HeaderComponent from '@/components/HeaderComponent.vue'
import SearchBar from '@/components/SearchBar.vue'
import ProductCard from '@/components/ProductCard.vue'
import AdminLockButton from '@/components/AdminLockButton.vue'
import CartDrawer from '@/components/CartDrawer.vue'
import ImageFullscreen from '@/components/ImageFullscreen.vue'
import { supabase } from '@/lib/supabase'
import { useSupplier } from '@/composables/useSupplier'
import { useCart } from '@/composables/useCart'
import { validateSearchQuery } from '@/utils/security/validate'
import type { Product } from '@/types'
import { normalizeProduct } from '@/utils/productImages'

const { supplier, loading, error, load } = useSupplier()
const { itemCount } = useCart()
const products = ref<Product[]>([])
const searchQuery = ref('')
const cartOpen = ref(false)

const previewOpen = ref(false)
const previewImages = ref<string[]>([])
const previewIndex = ref(0)
const previewAlt = ref('')

const filteredProducts = computed(() => {
  const q = validateSearchQuery(searchQuery.value).toLowerCase()
  if (!q) return products.value
  return products.value.filter(
    (p) =>
      p.code.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
  )
})

function openPreview(images: string[], index: number, alt: string) {
  previewImages.value = images
  previewIndex.value = index
  previewAlt.value = alt
  previewOpen.value = true
}

async function loadProducts() {
  if (!supplier.value) return
  const { data, error: err } = await supabase
    .from('products')
    .select('*')
    .eq('supplier_id', supplier.value.id)
    .order('created_at', { ascending: false })

  if (err) error.value = err.message
  else products.value = (data ?? []).map((row) => normalizeProduct(row as Product))
}

onMounted(async () => {
  await load()
  if (supplier.value) await loadProducts()
})
</script>

<template>
  <div class="min-h-screen min-h-[100dvh] bg-zinc-100 flex flex-col">
    <div
      v-if="loading"
      class="flex-1 flex items-center justify-center px-4 text-zinc-600 text-base"
    >
      Carregando catálogo…
    </div>

    <div
      v-else-if="error"
      class="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center space-y-3"
    >
      <h1 class="text-xl font-bold text-zinc-900">
        Catálogo indisponível
      </h1>
      <p class="text-zinc-700 text-base">{{ error }}</p>
    </div>

    <template v-else-if="supplier">
      <div class="sticky top-0 z-20">
        <HeaderComponent
          :name="supplier.name"
          :logo-url="supplier.logo_url"
          :phone="supplier.phone"
          :whatsapp="supplier.whatsapp"
          :instagram="supplier.instagram"
          :cart-count="itemCount"
          @open-cart="cartOpen = true"
        />
        <SearchBar v-model="searchQuery" />
      </div>

      <main class="flex-1 max-w-5xl w-full mx-auto px-2.5 sm:px-4 pb-28 sm:pb-20 pt-2">
        <p
          v-if="filteredProducts.length === 0"
          class="text-center text-zinc-600 py-10 text-base px-2"
        >
          {{ searchQuery ? 'Nenhum produto encontrado.' : 'Nenhum produto no catálogo ainda.' }}
        </p>
        <div
          v-else
          class="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-3 lg:grid-cols-4"
        >
          <ProductCard
            v-for="product in filteredProducts"
            :key="product.id"
            :product="product"
            @preview-images="openPreview"
          />
        </div>
      </main>

      <CartDrawer
        v-model:open="cartOpen"
        :whatsapp="supplier.whatsapp"
      />

      <ImageFullscreen
        v-model:open="previewOpen"
        v-model:index="previewIndex"
        :images="previewImages"
        :start-index="previewIndex"
        :alt="previewAlt"
      />

      <AdminLockButton :supplier="supplier" />
    </template>
  </div>
</template>
