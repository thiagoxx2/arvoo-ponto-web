import { supabaseClient } from '../lib/supabaseClient'
import { Foto } from '../types/pontos'

export class FotoService {
  /**
   * Obter foto por ID
   */
  static async obterPorId(id: string): Promise<Foto | null> {
    const { data, error } = await supabaseClient
      .from('fotos')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Erro ao obter foto:', error)
      throw new Error(`Falha ao carregar foto: ${error.message}`)
    }

    return data
  }

  /**
   * Obter storage path da foto
   */
  static async obterStoragePath(fotoId: string): Promise<string | null> {
    const foto = await this.obterPorId(fotoId)
    return foto?.storage_path || null
  }

  /**
   * Gerar URL da foto (pública ou signed)
   */
  static async gerarUrl(foto: Foto, isPrivate: boolean = false): Promise<string | null> {
    if (!foto.storage_path) return null

    try {
      if (isPrivate) {
        // Para bucket privado, usar signed URL
        const { data, error } = await supabaseClient.storage
          .from('fotos')
          .createSignedUrl(foto.storage_path, 3600) // 1 hora

        if (error) {
          console.error('Erro ao gerar signed URL:', error)
          return null
        }

        return data.signedUrl
      } else {
        // Para bucket público, montar URL direta
        const { data } = supabaseClient.storage
          .from('fotos')
          .getPublicUrl(foto.storage_path)

        return data.publicUrl
      }
    } catch (error) {
      console.error('Erro ao gerar URL da foto:', error)
      return null
    }
  }

  /**
   * Verificar se bucket é privado (baseado na configuração)
   */
  static isBucketPrivate(): boolean {
    // Por padrão, assumir que é privado para segurança
    // Pode ser configurado via env var se necessário
    return import.meta.env.VITE_FOTOS_BUCKET_PRIVATE !== 'false'
  }
}
