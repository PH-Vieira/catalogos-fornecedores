import { sanitizeText } from './sanitize'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PRODUCT_CODE_RE = /^[A-Za-z0-9._\-/]+$/
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function validateEmail(email: string): string | null {
  const value = email.trim().toLowerCase().slice(0, 254)
  if (!value || !EMAIL_RE.test(value)) return 'E-mail inválido.'
  return null
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) return 'A senha deve ter pelo menos 6 caracteres.'
  if (password.length > 128) return 'Senha muito longa.'
  return null
}

export function validateSearchQuery(query: string): string {
  return sanitizeText(query, 100)
}

export interface ProductInput {
  code: string
  description: string
  stock: number
  price: number
}

export function validateProductInput(input: ProductInput): {
  ok: true
  data: ProductInput
} | { ok: false; error: string } {
  const code = sanitizeText(input.code, 50)
  const description = sanitizeText(input.description, 500)

  if (!code) return { ok: false, error: 'Informe o código do produto.' }
  if (!PRODUCT_CODE_RE.test(code)) {
    return {
      ok: false,
      error: 'Código inválido. Use apenas letras, números e . _ - /',
    }
  }

  if (!description) return { ok: false, error: 'Informe a descrição.' }

  if (!Number.isFinite(input.stock) || input.stock < 0 || input.stock > 999_999) {
    return { ok: false, error: 'Estoque inválido.' }
  }

  if (!Number.isFinite(input.price) || input.price < 0 || input.price > 99_999_999) {
    return { ok: false, error: 'Preço inválido.' }
  }

  return {
    ok: true,
    data: {
      code,
      description,
      stock: Math.floor(input.stock),
      price: Math.round(input.price * 100) / 100,
    },
  }
}

export function isValidUuid(id: string): boolean {
  return UUID_RE.test(id)
}
