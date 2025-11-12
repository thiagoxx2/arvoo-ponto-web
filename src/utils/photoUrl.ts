import type { SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// Cache de signed URLs com expiração e coalescência de requests
// ============================================================================

type CacheEntry = {
  url: string
  exp: number // Epoch timestamp em segundos
}

// Cache persistente durante vida da página
const signedCache = new Map<string, CacheEntry>()

// Requests em andamento (para coalescer chamadas simultâneas)
const inflight = new Map<string, Promise<string>>()

// Helper: tempo atual em segundos
const nowSec = () => Math.floor(Date.now() / 1000)

// Flag de diagnóstico
const DIAG = import.meta.env.VITE_DIAGNOSTICS === '1'

// ============================================================================
// Funções públicas de utilidade
// ============================================================================

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

// ============================================================================
// Cache com expiração e coalescência
// ============================================================================

/**
 * Gera signed URL com cache e coalescência de requisições
 * @internal
 */
async function signWithCache(supabase: SupabaseClient, path: string): Promise<string> {
  const bucket = getFotosBucket()
  const ttl = getFotosTTL()
  const now = nowSec()
  const MARGIN = 10 // Margem de segurança em segundos
  
  // 1. Verificar cache (com margem de 10s antes de expirar)
  const cached = signedCache.get(path)
  if (cached && cached.exp > now + MARGIN) {
    if (DIAG) {
      console.debug('[photoUrl/cache hit]', {
        path: path.substring(0, 50),
        remaining: cached.exp - now,
        urlPrefix: cached.url.substring(0, 60) + '...'
      })
    }
    return cached.url
  }
  
  // 2. Verificar se já há requisição em andamento (coalescência)
  const pending = inflight.get(path)
  if (pending) {
    if (DIAG) {
      console.debug('[photoUrl/inflight join]', { path: path.substring(0, 50) })
    }
    return await pending
  }
  
  // 3. Criar nova requisição de assinatura
  const signPromise = (async () => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, ttl)
      
      if (error || !data?.signedUrl) {
        throw new Error(`Falha ao gerar URL assinada: ${error?.message || 'URL não disponível'}`)
      }
      
      const url = data.signedUrl
      const exp = now + ttl
      
      // Atualizar cache
      signedCache.set(path, { url, exp })
      
      if (DIAG) {
        const urlPrefix = new URL(url).origin + new URL(url).pathname.substring(0, 40)
        console.debug('[photoUrl/cache set]', {
          path: path.substring(0, 50),
          ttl,
          exp,
          urlPrefix: urlPrefix + '...'
        })
      }
      
      return url
    } finally {
      // Sempre remover de inflight ao terminar (sucesso ou erro)
      inflight.delete(path)
    }
  })()
  
  // Salvar promise em inflight antes de await
  inflight.set(path, signPromise)
  
  return await signPromise
}

/**
 * Gera URL para foto no Supabase Storage (pública ou assinada)
 * 
 * Decide automaticamente entre URL pública ou signed URL baseado em VITE_FOTOS_BUCKET_PRIVATE
 * Para signed URLs, usa cache inteligente com expiração e coalescência
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
  const bucket = getFotosBucket()
  const isPrivate = isFotosBucketPrivate()
  
  // Se o path já é uma URL completa, retornar como está
  if (path.startsWith('http://') || path.startsWith('https://')) {
    if (DIAG) {
      console.debug('[photoUrl] Path já é URL completa:', path.substring(0, 50) + '...')
    }
    return path
  }
  
  // Bucket público: usar URL pública (síncrona, mais rápida)
  if (!isPrivate) {
    const publicUrl = getPublicPhotoUrl(supabase, bucket, path)
    
    if (DIAG) {
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
  
  // Bucket privado: usar cache com signed URL
  return await signWithCache(supabase, path)
}

/**
 * Força refresh de URL assinada (ignora cache atual)
 * Útil quando URL expirou e precisa regenerar
 * 
 * @param supabase - Cliente Supabase
 * @param path - Caminho do arquivo no storage
 * @returns Promise com nova URL assinada
 */
export async function refreshPhotoUrl(
  supabase: SupabaseClient,
  path: string
): Promise<string> {
  if (DIAG) {
    console.debug('[photoUrl/refresh]', { path: path.substring(0, 50) })
  }
  
  // Remover do cache para forçar nova assinatura
  signedCache.delete(path)
  
  // Regenerar usando getPhotoUrl (que vai usar signWithCache)
  return await getPhotoUrl(supabase, path)
}

/**
 * Verifica se uma URL em cache está próxima de expirar
 * 
 * @param path - Caminho do arquivo
 * @param marginSec - Margem de segurança em segundos (padrão: 10)
 * @returns true se expirou ou está próximo de expirar
 */
export function isPhotoUrlExpired(path: string, marginSec: number = 10): boolean {
  const cached = signedCache.get(path)
  if (!cached) return true
  
  return cached.exp <= nowSec() + marginSec
}

