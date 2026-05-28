const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])
const MAX_BYTES = 5 * 1024 * 1024

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return 'Use apenas imagens JPG, PNG, WebP ou GIF.'
  }
  if (file.size > MAX_BYTES) {
    return 'Imagem muito grande (máx. 5 MB).'
  }
  const name = file.name.toLowerCase()
  if (!/\.(jpe?g|png|webp|gif)$/.test(name)) {
    return 'Extensão de arquivo não permitida.'
  }
  return null
}

export function safeImageExtension(file: File): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  return map[file.type] ?? 'jpg'
}
