const STORAGE_PREFIX = 'catalog_login_'
const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000
const WINDOW_MS = 15 * 60 * 1000

interface LoginAttemptState {
  count: number
  windowStart: number
  lockedUntil: number
}

function storageKey(email: string): string {
  const normalized = email.trim().toLowerCase()
  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i)
    hash |= 0
  }
  return `${STORAGE_PREFIX}${Math.abs(hash)}`
}

function readState(email: string): LoginAttemptState {
  try {
    const raw = sessionStorage.getItem(storageKey(email))
    if (!raw) return { count: 0, windowStart: Date.now(), lockedUntil: 0 }
    const parsed = JSON.parse(raw) as LoginAttemptState
    return {
      count: parsed.count ?? 0,
      windowStart: parsed.windowStart ?? Date.now(),
      lockedUntil: parsed.lockedUntil ?? 0,
    }
  } catch {
    return { count: 0, windowStart: Date.now(), lockedUntil: 0 }
  }
}

function writeState(email: string, state: LoginAttemptState): void {
  sessionStorage.setItem(storageKey(email), JSON.stringify(state))
}

export function getLoginLockMessage(email: string): string | null {
  const now = Date.now()
  const state = readState(email)

  if (state.lockedUntil > now) {
    const minutes = Math.ceil((state.lockedUntil - now) / 60_000)
    return `Muitas tentativas. Aguarde ${minutes} minuto(s) e tente novamente.`
  }

  return null
}

export function assertLoginAllowed(email: string): void {
  const message = getLoginLockMessage(email)
  if (message) throw new Error(message)
}

export function recordFailedLogin(email: string): void {
  const now = Date.now()
  let state = readState(email)

  if (state.lockedUntil > now) return

  if (now - state.windowStart > WINDOW_MS) {
    state = { count: 0, windowStart: now, lockedUntil: 0 }
  }

  state.count += 1

  if (state.count >= MAX_ATTEMPTS) {
    state.lockedUntil = now + LOCKOUT_MS
    state.count = 0
    state.windowStart = now
  }

  writeState(email, state)
}

export function clearLoginAttempts(email: string): void {
  sessionStorage.removeItem(storageKey(email))
}
