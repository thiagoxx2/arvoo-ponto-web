import { supabaseClient as supabase } from './supabaseClient'

/**
 * Gera URL para acessar foto no storage
 * Se o bucket for privado, gera signed URL temporária
 * Se for público, monta URL direta
 */
export async function getPhotoUrl(storagePath: string | null, bucket = 'fotos'): Promise<string | null> {
  if (!storagePath) return null

  try {
    // Primeiro, tenta verificar se o bucket é público
    const { data: bucketData, error: bucketError } = await supabase.storage.getBucket(bucket)
    
    if (bucketError) {
      console.error('Erro ao verificar bucket:', bucketError)
      return null
    }

    // Se o bucket for público, monta URL direta
    if (bucketData?.public) {
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(storagePath)
      return publicUrl
    }

    // Se for privado, gera signed URL com expiração de 10 minutos
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, 600) // 10 minutos

    if (error) {
      console.error('Erro ao gerar signed URL:', error)
      return null
    }

    return data?.signedUrl || null
  } catch (error) {
    console.error('Erro em getPhotoUrl:', error)
    return null
  }
}

/**
 * Adiciona foto_url aos itens que possuem storage_path
 */
export async function attachPhotoUrls<T extends { storage_path?: string | null; foto_url?: string | null }>(
  items: T[]
): Promise<T[]> {
  const itemsWithPhotos = await Promise.all(
    items.map(async (item) => {
      if (item.storage_path && !item.foto_url) {
        const photoUrl = await getPhotoUrl(item.storage_path)
        return { ...item, foto_url: photoUrl }
      }
      return item
    })
  )

  return itemsWithPhotos
}

/**
 * Helper para detectar se um bucket é público ou privado
 */
export async function isBucketPublic(bucketName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage.getBucket(bucketName)
    if (error) {
      console.error('Erro ao verificar bucket:', error)
      return false
    }
    return data?.public || false
  } catch (error) {
    console.error('Erro ao verificar se bucket é público:', error)
    return false
  }
}
