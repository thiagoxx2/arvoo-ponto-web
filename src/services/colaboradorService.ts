import { supabaseClient } from '../lib/supabaseClient'
import { Colaborador } from '../types/pontos'

export class ColaboradorService {
  /**
   * Listar colaboradores ativos por empresa
   */
  static async listarAtivos(empresaId: string): Promise<Colaborador[]> {
    const { data, error } = await supabaseClient
      .from('colaboradores')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('nome')

    if (error) {
      console.error('Erro ao listar colaboradores:', error)
      throw new Error(`Falha ao carregar colaboradores: ${error.message}`)
    }

    return data || []
  }

  /**
   * Obter colaborador por ID
   */
  static async obterPorId(id: string): Promise<Colaborador | null> {
    const { data, error } = await supabaseClient
      .from('colaboradores')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Erro ao obter colaborador:', error)
      throw new Error(`Falha ao carregar colaborador: ${error.message}`)
    }

    return data
  }

  /**
   * Obter colaborador por empresa e ID
   */
  static async obterPorEmpresaEId(empresaId: string, id: string): Promise<Colaborador | null> {
    const { data, error } = await supabaseClient
      .from('colaboradores')
      .select('*')
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Erro ao obter colaborador:', error)
      throw new Error(`Falha ao carregar colaborador: ${error.message}`)
    }

    return data
  }

  /**
   * Buscar colaborador por PIN (hash)
   */
  static async buscarPorPin(pinHash: string, empresaId: string): Promise<Colaborador | null> {
    const { data, error } = await supabaseClient
      .from('colaboradores')
      .select('*')
      .eq('pin_hash', pinHash)
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Erro ao buscar colaborador por PIN:', error)
      throw new Error(`Falha ao buscar colaborador: ${error.message}`)
    }

    return data
  }
}
