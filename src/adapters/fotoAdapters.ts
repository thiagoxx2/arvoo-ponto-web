import { Foto } from '../types/pontos'
import { FotoService } from '../services/fotoService'

export interface FotoDisplay {
  id: string
  url: string | null
  width?: number
  height?: number
  isPrivate: boolean
  storagePath: string
}

export class FotoAdapters {
  /**
   * Adaptar foto para exibição
   */
  static async adaptarParaExibicao(foto: Foto): Promise<FotoDisplay> {
    const isPrivate = FotoService.isBucketPrivate()
    const url = await FotoService.gerarUrl(foto, isPrivate)

    return {
      id: foto.id,
      url,
      width: foto.width,
      height: foto.height,
      isPrivate,
      storagePath: foto.storage_path
    }
  }

  /**
   * Adaptar lista de fotos para exibição
   */
  static async adaptarListaParaExibicao(fotos: Foto[]): Promise<FotoDisplay[]> {
    const promises = fotos.map(foto => this.adaptarParaExibicao(foto))
    return Promise.all(promises)
  }

  /**
   * Verificar se foto é válida para exibição
   */
  static isFotoValida(foto: FotoDisplay): boolean {
    return !!foto.url && !!foto.storagePath
  }

  /**
   * Obter URL de fallback para foto inválida
   */
  static obterUrlFallback(): string {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAxMkwyOCAyMEwyMCAyOEwxMiAyMEwyMCAxMloiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+'
  }

  /**
   * Formatar dimensões da foto
   */
  static formatarDimensoes(width?: number, height?: number): string {
    if (!width || !height) return 'Dimensões não disponíveis'
    return `${width}x${height}px`
  }

  /**
   * Obter classe CSS para foto baseada no tamanho
   */
  static obterClasseTamanho(width?: number, height?: number): string {
    if (!width || !height) return 'w-10 h-10'
    
    const aspectRatio = width / height
    if (aspectRatio > 1.5) return 'w-16 h-10' // Landscape
    if (aspectRatio < 0.7) return 'w-10 h-16'  // Portrait
    return 'w-12 h-12' // Square
  }
}
