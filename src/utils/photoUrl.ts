import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Gera URL pública para foto no Supabase Storage
 * 
 * @param supabase - Cliente Supabase
 * @param bucket - Nome do bucket (ex: 'fotos-pontos', 'fotos')
 * @param path - Caminho do arquivo no storage (ex: 'empresa-id/foto.jpg')
 * @returns URL pública da foto
 */
export function getPublicPhotoUrl(
  supabase: SupabaseClient,
  bucket: string,
  path: string
): string {
  const isDiagnostics = import.meta.env.VITE_DIAGNOSTICS === '1'
  
  // Se o path já é uma URL completa, retornar como está
  if (path.startsWith('http://') || path.startsWith('https://')) {
    if (isDiagnostics) {
      console.debug('[photoUrl/public] Path já é URL completa:', path)
    }
    return path
  }
  
  // Gerar URL pública do bucket
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  const publicUrl = data.publicUrl
  
  if (isDiagnostics) {
    console.debug('[photoUrl/public]', {
      bucket,
      path,
      url: publicUrl
    })
  }
  
  return publicUrl
}

/**
 * Obtém o nome do bucket configurado via variável de ambiente
 * Fallback para 'fotos-pontos' se não estiver definido
 */
export function getFotosBucket(): string {
  return import.meta.env.VITE_FOTOS_BUCKET || 'fotos-pontos'
}

