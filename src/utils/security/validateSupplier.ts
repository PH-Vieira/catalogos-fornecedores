import { sanitizeText } from './sanitize'

export interface SupplierProfileInput {
  name: string
  logo_url: string
  phone: string
  whatsapp: string
  instagram: string
}

export interface SupplierProfileData {
  name: string
  logo_url: string | null
  phone: string | null
  whatsapp: string | null
  instagram: string | null
}

const URL_RE = /^https?:\/\/.+/i
const PHONE_RE = /^[\d\s+().-]+$/

function normalizeOptionalUrl(value: string, maxLength: number): string | null {
  let t = sanitizeText(value, maxLength)
  if (!t) return null
  if (!/^https?:\/\//i.test(t)) {
    t = `https://${t}`
  }
  if (!URL_RE.test(t)) return null
  return t
}

function normalizePhone(value: string): string | null {
  const t = sanitizeText(value, 30)
  if (!t) return null
  if (!PHONE_RE.test(t)) return null
  const digits = t.replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) return null
  return t
}

function normalizeInstagram(value: string): string | null {
  let t = sanitizeText(value, 200)
  if (!t) return null
  if (t.startsWith('@')) t = t.slice(1)
  if (/^https?:\/\//i.test(t)) {
    return URL_RE.test(t) ? t : null
  }
  const handle = t.replace(/^instagram\.com\/?/i, '').replace(/\//g, '')
  if (!handle || handle.length > 80) return null
  return `https://instagram.com/${handle}`
}

export function validateSupplierProfile(input: SupplierProfileInput): {
  ok: true
  data: SupplierProfileData
} | { ok: false; error: string } {
  const name = sanitizeText(input.name, 120)
  if (!name) return { ok: false, error: 'Informe o nome da loja.' }

  let logo_url: string | null = null
  if (input.logo_url.trim()) {
    logo_url = normalizeOptionalUrl(input.logo_url, 500)
    if (!logo_url) {
      return { ok: false, error: 'Link da logo inválido. Use uma URL começando com http:// ou https://' }
    }
  }

  let phone: string | null = null
  if (input.phone.trim()) {
    phone = normalizePhone(input.phone)
    if (!phone) return { ok: false, error: 'Telefone inválido.' }
  }

  let whatsapp: string | null = null
  if (input.whatsapp.trim()) {
    whatsapp = normalizePhone(input.whatsapp)
    if (!whatsapp) return { ok: false, error: 'WhatsApp inválido.' }
  }

  let instagram: string | null = null
  if (input.instagram.trim()) {
    instagram = normalizeInstagram(input.instagram)
    if (!instagram) return { ok: false, error: 'Instagram inválido. Use o @usuario ou o link completo.' }
  }

  return {
    ok: true,
    data: { name, logo_url, phone, whatsapp, instagram },
  }
}
