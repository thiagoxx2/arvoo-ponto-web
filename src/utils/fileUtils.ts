/**
 * Remove acentos, caracteres inválidos e normaliza espaços em nomes de arquivo
 */
export function sanitizeFilename(filename: string): string {
  // Remover acentos (normalização NFD + remoção de diacríticos)
  const normalized = filename
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  
  // Remover caracteres inválidos para sistemas de arquivo
  const sanitized = normalized
    .replace(/[\/\\:?*"<>|]+/g, '')
    .replace(/\s+/g, '_') // Substituir espaços por underscore
    .trim()
  
  return sanitized || 'arquivo' // Fallback se ficar vazio
}

/**
 * Formata data para uso em nome de arquivo: YYYY-MM-DD_HH-mm-ss
 */
export function fmtDateForFilename(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`
}

/**
 * Detecta extensão de arquivo baseada no MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp'
  }
  
  return mimeMap[mimeType.toLowerCase()] || 'img'
}

