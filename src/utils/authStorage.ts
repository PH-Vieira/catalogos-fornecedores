const REMEMBER_KEY = 'catalog_auth_remember'

/** Preferência persistida: manter login entre fechamentos do navegador. */
export function getRememberLogin(): boolean {
  return localStorage.getItem(REMEMBER_KEY) !== 'false'
}

export function setRememberLogin(remember: boolean): void {
  localStorage.setItem(REMEMBER_KEY, remember ? 'true' : 'false')
}

function activeStorage(): Storage {
  return getRememberLogin() ? localStorage : sessionStorage
}

/** Storage do Supabase Auth: localStorage se “lembrar”, senão sessionStorage. */
export const authStorage = {
  getItem(key: string): string | null {
    return (
      activeStorage().getItem(key) ??
      localStorage.getItem(key) ??
      sessionStorage.getItem(key)
    )
  },
  setItem(key: string, value: string): void {
    if (getRememberLogin()) {
      sessionStorage.removeItem(key)
      localStorage.setItem(key, value)
    } else {
      localStorage.removeItem(key)
      sessionStorage.setItem(key, value)
    }
  },
  removeItem(key: string): void {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  },
}
