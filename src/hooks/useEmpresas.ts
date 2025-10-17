import { useState, useEffect, useCallback } from 'react'
import { EmpresaService } from '../services/empresaService'
import { Empresa } from '../types/pontos'

interface UseEmpresasReturn {
  empresas: Empresa[]
  loading: boolean
  error: string | null
  loadEmpresas: () => Promise<void>
  obterEmpresa: (id: string) => Promise<Empresa | null>
  buscarPorCnpj: (cnpj: string) => Promise<Empresa | null>
  refresh: () => Promise<void>
}

export function useEmpresas(): UseEmpresasReturn {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Carregar empresas
  const loadEmpresas = useCallback(async () => {
    if (loading) return

    setLoading(true)
    setError(null)

    try {
      const data = await EmpresaService.listar()
      setEmpresas(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      console.error('Erro ao carregar empresas:', err)
    } finally {
      setLoading(false)
    }
  }, [loading])

  // Obter empresa por ID
  const obterEmpresa = useCallback(async (id: string): Promise<Empresa | null> => {
    try {
      return await EmpresaService.obterPorId(id)
    } catch (err) {
      console.error('Erro ao obter empresa:', err)
      return null
    }
  }, [])

  // Buscar empresa por CNPJ
  const buscarPorCnpj = useCallback(async (cnpj: string): Promise<Empresa | null> => {
    try {
      return await EmpresaService.buscarPorCnpj(cnpj)
    } catch (err) {
      console.error('Erro ao buscar empresa por CNPJ:', err)
      return null
    }
  }, [])

  // Refresh
  const refresh = useCallback(async () => {
    await loadEmpresas()
  }, [loadEmpresas])

  // Carregar dados iniciais
  useEffect(() => {
    loadEmpresas()
  }, [loadEmpresas])

  return {
    empresas,
    loading,
    error,
    loadEmpresas,
    obterEmpresa,
    buscarPorCnpj,
    refresh
  }
}
