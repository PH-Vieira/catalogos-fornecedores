export function formatPrice(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/** Converte preço vindo do banco/JSON (number ou string) para número finito. */
export function parseUnitPrice(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

/** Quantidade válida para checkout (inteiro positivo). */
export function parseQuantity(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return null
  return n
}
