import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { applyRememberPreference } from '@/utils/authStorage'
import { validateEmail } from '@/utils/security/validate'
import {
  assertLoginAllowed,
  clearLoginAttempts,
  recordFailedLogin,
} from '@/utils/security/loginRateLimit'

const GENERIC_AUTH_ERROR = 'E-mail ou senha inválidos.'

export async function secureSignIn(
  email: string,
  password: string,
  rememberMe = true
): Promise<{ session: Session | null; error: string | null }> {
  const emailError = validateEmail(email)
  if (emailError) return { session: null, error: emailError }

  if (!password || password.length > 128) {
    return { session: null, error: GENERIC_AUTH_ERROR }
  }

  try {
    assertLoginAllowed(email)
  } catch (e) {
    return {
      session: null,
      error: e instanceof Error ? e.message : GENERIC_AUTH_ERROR,
    }
  }

  applyRememberPreference(rememberMe)

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (error) {
    recordFailedLogin(email)
    return { session: null, error: GENERIC_AUTH_ERROR }
  }

  clearLoginAttempts(email)
  applyRememberPreference(rememberMe)
  return { session: data.session, error: null }
}
