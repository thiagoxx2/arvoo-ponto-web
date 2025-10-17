import { supabaseClient } from '../lib/supabaseClient'
import { Empresa } from '../types/pontos'

export class EmpresaService {
  /**
   * Listar todas as empresas
   */
  static async listar(): Promise<Empresa[]> {
    const { data, error } = await supabaseClient
      .from('empresas')
      .select('id, nome, cnpj, cnpj_norm')
      .order('nome')

    if (error) {
      console.error('Erro ao listar empresas:', error)
      throw new Error(`Falha ao carregar empresas: ${error.message}`)
    }

    return data || []
  }

  /**
   * Obter empresa por ID
   */
  static async obterPorId(id: string): Promise<Empresa | null> {
    const { data, error } = await supabaseClient
      .from('empresas')
      .select('id, nome, cnpj, cnpj_norm')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Erro ao obter empresa:', error)
      throw new Error(`Falha ao carregar empresa: ${error.message}`)
    }

    return data
  }

  /**
   * Buscar empresa por CNPJ
   */
  static async buscarPorCnpj(cnpj: string): Promise<Empresa | null> {
    const { data, error } = await supabaseClient
      .from('empresas')
      .select('id, nome, cnpj, cnpj_norm')
      .eq('cnpj', cnpj)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Erro ao buscar empresa por CNPJ:', error)
      throw new Error(`Falha ao buscar empresa: ${error.message}`)
    }

    return data
  }
}
