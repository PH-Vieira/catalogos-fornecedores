import type { CartItem } from '@/types'
import { formatPrice, parseQuantity, parseUnitPrice } from '@/utils/format'

interface OrderLine {
  description: string
  code: string
  quantity: number
  unitPrice: number
  subtotal: number
}

function normalizeOrderLines(items: CartItem[]): OrderLine[] | null {
  if (items.length === 0) return null

  const lines: OrderLine[] = []

  for (const item of items) {
    const unitPrice = parseUnitPrice(item.product.price)
    const quantity = parseQuantity(item.quantity)
    if (unitPrice === null || quantity === null) return null

    lines.push({
      description: item.product.description,
      code: item.product.code,
      quantity,
      unitPrice,
      subtotal: unitPrice * quantity,
    })
  }

  return lines
}

export function isValidCartForCheckout(items: CartItem[]): boolean {
  return normalizeOrderLines(items) !== null
}

export function buildOrderMessage(items: CartItem[]): string | null {
  const lines = normalizeOrderLines(items)
  if (!lines) return null

  const itemBlocks = lines.map(
    (line) =>
      `• ${line.description} (Cód. ${line.code})\n` +
      `Quantidade: ${line.quantity} un.\n` +
      `Valor unitário: ${formatPrice(line.unitPrice)}\n` +
      `Subtotal: ${formatPrice(line.subtotal)}`
  )

  const total = lines.reduce((sum, line) => sum + line.subtotal, 0)

  return (
    `Olá!\n\n` +
    `*Itens do pedido*\n\n` +
    `${itemBlocks.join('\n\n')}\n\n` +
    `*Total: ${formatPrice(total)}*\n\n` +
    `Pode confirmar este pedido, por favor?`
  )
}

export function buildWhatsAppUrl(whatsapp: string, message: string): string | null {
  const phone = whatsapp.replace(/\D/g, '')
  const text = message.trim()
  if (!phone || !text) return null
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}

/** Mensagem inicial ao tocar em “WhatsApp” no catálogo (sem carrinho). */
export function buildWhatsAppGreetingMessage(storeName?: string | null): string {
  const name = storeName?.trim()
  if (name) {
    return `Olá! Vi o catálogo da ${name} e gostaria de mais informações.`
  }
  return 'Olá! Vi o catálogo e gostaria de mais informações.'
}

export function buildWhatsAppGreetingUrl(
  whatsapp: string | null | undefined,
  storeName?: string | null
): string | null {
  if (!whatsapp?.trim()) return null
  return buildWhatsAppUrl(whatsapp, buildWhatsAppGreetingMessage(storeName))
}

/** Monta o link de checkout só quando carrinho, preços e WhatsApp são válidos. */
export function buildWhatsAppCheckoutUrl(
  whatsapp: string | null | undefined,
  items: CartItem[]
): string | null {
  if (!whatsapp?.trim()) return null
  const message = buildOrderMessage(items)
  if (!message) return null
  return buildWhatsAppUrl(whatsapp, message)
}
