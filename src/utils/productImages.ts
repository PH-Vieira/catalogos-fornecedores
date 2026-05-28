import type { Product } from '@/types'

export const MAX_PRODUCT_IMAGES = 10

type ProductRow = Product & { image_url?: string | null }

export function normalizeProduct(row: ProductRow): Product {
  let image_urls: string[] = []
  if (Array.isArray(row.image_urls) && row.image_urls.length > 0) {
    image_urls = row.image_urls.filter((u) => typeof u === 'string' && u.trim() !== '')
  } else if (row.image_url?.trim()) {
    image_urls = [row.image_url.trim()]
  }
  const { image_url: _removed, ...rest } = row
  return { ...rest, image_urls }
}

export function productImageUrls(product: Product): string[] {
  return product.image_urls ?? []
}

export function primaryProductImage(product: Product): string | null {
  return productImageUrls(product)[0] ?? null
}
