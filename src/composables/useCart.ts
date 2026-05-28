import { ref, computed, watch } from 'vue'
import type { CartItem, Product } from '@/types'
import { supplierSlug } from '@/config'
import { parseUnitPrice } from '@/utils/format'

const items = ref<CartItem[]>([])

function storageKey(): string {
  return `catalog_cart_${supplierSlug || 'default'}`
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(storageKey())
    items.value = raw ? (JSON.parse(raw) as CartItem[]) : []
  } catch {
    items.value = []
  }
}

function saveToStorage() {
  localStorage.setItem(storageKey(), JSON.stringify(items.value))
}

loadFromStorage()

watch(items, saveToStorage, { deep: true })

export function useCart() {
  const itemCount = computed(() =>
    items.value.reduce((sum, i) => sum + i.quantity, 0)
  )

  const total = computed(() =>
    items.value.reduce((sum, i) => {
      const unitPrice = parseUnitPrice(i.product.price)
      if (unitPrice === null) return sum
      return sum + unitPrice * i.quantity
    }, 0)
  )

  function add(product: Product, quantity = 1) {
    if (product.stock <= 0) return false
    const existing = items.value.find((i) => i.product.id === product.id)
    const nextQty = (existing?.quantity ?? 0) + quantity
    if (nextQty > product.stock) return false

    if (existing) {
      existing.quantity = nextQty
    } else {
      items.value.push({ product, quantity })
    }
    return true
  }

  function setQuantity(productId: string, quantity: number) {
    const entry = items.value.find((i) => i.product.id === productId)
    if (!entry) return
    if (quantity <= 0) {
      remove(productId)
      return
    }
    if (quantity > entry.product.stock) quantity = entry.product.stock
    entry.quantity = quantity
  }

  function remove(productId: string) {
    items.value = items.value.filter((i) => i.product.id !== productId)
  }

  function clear() {
    items.value = []
  }

  return {
    items,
    itemCount,
    total,
    add,
    setQuantity,
    remove,
    clear,
  }
}
