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

/**
 * Verifica se o bucket de fotos é privado (requer signed URLs)
 * Lê de VITE_FOTOS_BUCKET_PRIVATE (true = privado, false/ausente = público)
 */
export function isFotosBucketPrivate(): boolean {
  return import.meta.env.VITE_FOTOS_BUCKET_PRIVATE === 'true'
}

/**
 * Obtém TTL para signed URLs em segundos
 * Lê de VITE_FOTOS_TTL_SECONDS, fallback para 900 (15 minutos)
 */
function getFotosTTL(): number {
  const ttl = import.meta.env.VITE_FOTOS_TTL_SECONDS
  const parsed = ttl ? parseInt(ttl, 10) : 900
  return isNaN(parsed) ? 900 : parsed
}

/**
 * Gera URL para foto no Supabase Storage (pública ou assinada)
 * 
 * Decide automaticamente entre URL pública ou signed URL baseado em VITE_FOTOS_BUCKET_PRIVATE
 * 
 * @param supabase - Cliente Supabase
 * @param path - Caminho do arquivo no storage (ex: 'empresa-id/foto.jpg')
 * @returns Promise com URL da foto (pública ou assinada)
 * @throws Error se falhar ao gerar signed URL
 */
export async function getPhotoUrl(
  supabase: SupabaseClient,
  path: string
): Promise<string> {
  const isDiagnostics = import.meta.env.VITE_DIAGNOSTICS === '1'
  const bucket = getFotosBucket()
  const isPrivate = isFotosBucketPrivate()
  
  // Se o path já é uma URL completa, retornar como está
  if (path.startsWith('http://') || path.startsWith('https://')) {
    if (isDiagnostics) {
      console.debug('[photoUrl] Path já é URL completa:', path.substring(0, 50) + '...')
    }
    return path
  }
  
  // Bucket público: usar URL pública (síncrona, mais rápida)
  if (!isPrivate) {
    const publicUrl = getPublicPhotoUrl(supabase, bucket, path)
    
    if (isDiagnostics) {
      const urlPrefix = new URL(publicUrl).origin + new URL(publicUrl).pathname.substring(0, 40)
      console.debug('[photoUrl]', {
        mode: 'public',
        bucket,
        path: path.substring(0, 50),
        urlPrefix: urlPrefix + '...'
      })
    }
    
    return publicUrl
  }
  
  // Bucket privado: gerar signed URL
  const ttl = getFotosTTL()
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, ttl)
  
  if (error || !data?.signedUrl) {
    console.error('[photoUrl] Erro ao gerar signed URL:', error?.message || 'URL não retornada')
    throw new Error(`Falha ao gerar URL assinada: ${error?.message || 'URL não disponível'}`)
  }
  
  if (isDiagnostics) {
    const url = new URL(data.signedUrl)
    const urlPrefix = url.origin + url.pathname.substring(0, 40)
    console.debug('[photoUrl]', {
      mode: 'signed',
      bucket,
      path: path.substring(0, 50),
      ttl,
      urlPrefix: urlPrefix + '...'
    })
  }
  
  return data.signedUrl
}

