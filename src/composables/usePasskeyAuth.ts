import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export function supportsPasskeys(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined'
  )
}

function mapPasskeyError(error: { message: string; name?: string }): string {
  const msg = error.message.toLowerCase()
  const name = error.name?.toLowerCase() ?? ''

  if (
    name === 'notallowederror' ||
    msg.includes('timed out') ||
    msg.includes('not allowed') ||
    msg.includes('privacy-considerations')
  ) {
    return (
      'Não deu para entrar. Confirme com rosto ou digital na tela do celular e tente de novo. ' +
      'Se preferir, use e-mail e senha.'
    )
  }

  if (msg.includes('abort') || msg.includes('cancel') || name === 'aborterror') {
    return 'Entrada cancelada.'
  }

  if (
    msg.includes('invalid rp') ||
    msg.includes('rp id') ||
    msg.includes('invalid domain') ||
    name === 'securityerror'
  ) {
    return 'Não foi possível usar o reconhecimento do celular aqui. Use e-mail e senha.'
  }

  if (msg.includes('previously registered') || name === 'invalidstateerror') {
    return 'Este celular já está cadastrado.'
  }

  if (msg.includes('experimental') || msg.includes('disabled')) {
    return 'Entrada pelo celular não está disponível agora. Use e-mail e senha.'
  }

  if (msg.includes('not found') || msg.includes('no passkey')) {
    return (
      'Este celular ainda não está cadastrado. Entre com e-mail e senha e, depois, ' +
      'toque em cadastrar neste celular.'
    )
  }

  if (msg.includes('not supported') || name === 'notsupportederror') {
    return 'Seu celular não permite entrar assim. Use e-mail e senha.'
  }

  return 'Não foi possível entrar. Tente de novo ou use e-mail e senha.'
}

export async function signInWithPasskeyAuth(): Promise<{
  session: Session | null
  error: string | null
}> {
  if (!supportsPasskeys()) {
    return {
      session: null,
      error: 'Neste aparelho, use e-mail e senha para entrar.',
    }
  }

  const { data, error } = await supabase.auth.signInWithPasskey()

  if (error) {
    return { session: null, error: mapPasskeyError(error) }
  }

  return { session: data.session, error: null }
}

export async function registerPasskeyAuth(): Promise<{
  ok: boolean
  error: string | null
}> {
  if (!supportsPasskeys()) {
    return {
      ok: false,
      error: 'Neste aparelho, use e-mail e senha para entrar.',
    }
  }

  const { error } = await supabase.auth.registerPasskey()

  if (error) {
    return { ok: false, error: mapPasskeyError(error) }
  }

  return { ok: true, error: null }
}
