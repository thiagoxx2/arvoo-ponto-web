import { useState, useCallback } from 'react'
import { FotoService } from '../services/fotoService'
import { Foto } from '../types/pontos'

interface UseFotosReturn {
  loading: boolean
  error: string | null
  obterFoto: (id: string) => Promise<Foto | null>
  obterStoragePath: (fotoId: string) => Promise<string | null>
  gerarUrl: (foto: Foto, isPrivate?: boolean) => Promise<string | null>
  isBucketPrivate: () => boolean
}

export function useFotos(): UseFotosReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Obter foto por ID
  const obterFoto = useCallback(async (id: string): Promise<Foto | null> => {
    setLoading(true)
    setError(null)

    try {
      const foto = await FotoService.obterPorId(id)
      return foto
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar foto'
      setError(errorMessage)
      console.error('Erro ao obter foto:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // Obter storage path
  const obterStoragePath = useCallback(async (fotoId: string): Promise<string | null> => {
    try {
      return await FotoService.obterStoragePath(fotoId)
    } catch (err) {
      console.error('Erro ao obter storage path:', err)
      return null
    }
  }, [])

  // Gerar URL da foto
  const gerarUrl = useCallback(async (foto: Foto, isPrivate?: boolean): Promise<string | null> => {
    try {
      return await FotoService.gerarUrl(foto, isPrivate)
    } catch (err) {
      console.error('Erro ao gerar URL da foto:', err)
      return null
    }
  }, [])

  // Verificar se bucket é privado
  const isBucketPrivate = useCallback(() => {
    return FotoService.isBucketPrivate()
  }, [])

  return {
    loading,
    error,
    obterFoto,
    obterStoragePath,
    gerarUrl,
    isBucketPrivate
  }
}
