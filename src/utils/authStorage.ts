const REMEMBER_KEY = 'catalog_auth_remember'

/** Preferência: manter login após fechar o navegador. */
export function getRememberLogin(): boolean {
  return localStorage.getItem(REMEMBER_KEY) !== 'false'
}

export function setRememberLogin(remember: boolean): void {
  localStorage.setItem(REMEMBER_KEY, remember ? 'true' : 'false')
}

function activeStorage(): Storage {
  return getRememberLogin() ? localStorage : sessionStorage
}

function inactiveStorage(): Storage {
  return getRememberLogin() ? sessionStorage : localStorage
}

/** Chaves de sessão do Supabase Auth (sb-…-auth-token, -user, -code-verifier, etc.). */
export function collectSupabaseAuthKeys(storage: Storage): string[] {
  const keys: string[] = []
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (key?.startsWith('sb-')) keys.push(key)
  }
  return keys
}

function migrateSupabaseAuthKeys(from: Storage, to: Storage): void {
  for (const key of collectSupabaseAuthKeys(from)) {
    const value = from.getItem(key)
    if (value !== null) {
      to.setItem(key, value)
    }
    from.removeItem(key)
  }
}

function clearSupabaseAuthKeys(storage: Storage): void {
  for (const key of collectSupabaseAuthKeys(storage)) {
    storage.removeItem(key)
  }
}

/**
 * Aplica “lembrar login” e move a sessão para o storage correto.
 * Usar ao mudar o checkbox (antes de um novo login).
 */
export function applyRememberPreference(remember: boolean): void {
  setRememberLogin(remember)
  const target = remember ? localStorage : sessionStorage
  const other = remember ? sessionStorage : localStorage

  migrateSupabaseAuthKeys(other, target)

  if (!remember) {
    clearSupabaseAuthKeys(localStorage)
  }
}

/**
 * Garante que a sessão recém-logada fique no storage certo (local = lembrar).
 * Chamar só depois de signIn bem-sucedido.
 */
export function finalizeAuthPersistence(remember: boolean): void {
  setRememberLogin(remember)
  const target = remember ? localStorage : sessionStorage
  const other = remember ? sessionStorage : localStorage

  const keys = new Set([
    ...collectSupabaseAuthKeys(localStorage),
    ...collectSupabaseAuthKeys(sessionStorage),
  ])

  for (const key of keys) {
    const value = localStorage.getItem(key) ?? sessionStorage.getItem(key)
    if (value !== null) {
      target.setItem(key, value)
    }
    other.removeItem(key)
    if (!remember) {
      localStorage.removeItem(key)
    }
  }
}

function reconcileOnStartup(): void {
  if (typeof window === 'undefined') return

  if (getRememberLogin()) {
    migrateSupabaseAuthKeys(sessionStorage, localStorage)
  } else {
    migrateSupabaseAuthKeys(localStorage, sessionStorage)
    clearSupabaseAuthKeys(localStorage)
  }
}

/** Storage customizado do Supabase Auth. */
export const authStorage = {
  getItem(key: string): string | null {
    return activeStorage().getItem(key)
  },
  setItem(key: string, value: string): void {
    const target = activeStorage()
    inactiveStorage().removeItem(key)
    target.setItem(key, value)
  },
  removeItem(key: string): void {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  },
}

reconcileOnStartup()
