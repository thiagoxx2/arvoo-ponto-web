import { PontoWithDetails } from '../types/pontos'

export interface PontoDisplay {
  id: string
  data: string // YYYY-MM-DD
  hora: string // HH:MM
  tipo: 'entrada' | 'saida'
  colaboradorNome: string
  empresaNome: string
  empresaCnpj?: string
  fotoUrl?: string
  auditHash?: string
}

export class PontoAdapters {
  /**
   * Adaptar ponto para exibição na interface
   */
  static adaptarParaExibicao(ponto: PontoWithDetails): PontoDisplay {
    const data = new Date(ponto.created_at)
    const dataFormatada = data.toISOString().split('T')[0] // YYYY-MM-DD
    const horaFormatada = data.toTimeString().split(' ')[0].substring(0, 5) // HH:MM

    return {
      id: ponto.id,
      data: dataFormatada,
      hora: horaFormatada,
      tipo: ponto.tipo,
      colaboradorNome: ponto.colaborador.nome,
      empresaNome: ponto.empresa.nome,
      empresaCnpj: ponto.empresa.cnpj,
      fotoUrl: ponto.foto?.storage_path, // Será processado pelo fotoAdapter
      auditHash: ponto.audit_hash
    }
  }

  /**
   * Adaptar lista de pontos para exibição
   */
  static adaptarListaParaExibicao(pontos: PontoWithDetails[]): PontoDisplay[] {
    return pontos.map(ponto => this.adaptarParaExibicao(ponto))
  }

  /**
   * Formatar data para exibição brasileira
   */
  static formatarDataBrasileira(data: string): string {
    const [ano, mes, dia] = data.split('-')
    return `${dia}/${mes}/${ano}`
  }

  /**
   * Formatar hora para exibição brasileira
   */
  static formatarHoraBrasileira(hora: string): string {
    return hora
  }

  /**
   * Obter label do tipo de ponto
   */
  static obterLabelTipo(tipo: 'entrada' | 'saida'): string {
    return tipo === 'entrada' ? 'Entrada' : 'Saída'
  }

  /**
   * Obter cor do tipo de ponto
   */
  static obterCorTipo(tipo: 'entrada' | 'saida'): string {
    return tipo === 'entrada' ? 'text-green-600' : 'text-red-600'
  }

  /**
   * Obter ícone do tipo de ponto
   */
  static obterIconeTipo(tipo: 'entrada' | 'saida'): string {
    return tipo === 'entrada' ? '↗️' : '↘️'
  }
}
