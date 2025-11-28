import { useState, useEffect, useCallback, useRef } from 'react'
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
  const isLoadingRef = useRef(false)

  // Carregar empresas
  const loadEmpresas = useCallback(async () => {
    if (isLoadingRef.current) {
      console.log('⏸️ [useEmpresas] Já está carregando, ignorando chamada');
      return;
    }

    console.log('🔄 [useEmpresas] Iniciando carregamento de empresas...');
    isLoadingRef.current = true;
    setLoading(true)
    setError(null)

    try {
      console.log('📡 [useEmpresas] Chamando EmpresaService.listar()...');
      const data = await EmpresaService.listar()
      console.log('✅ [useEmpresas] Empresas carregadas:', data.length, data);
      setEmpresas(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('❌ [useEmpresas] Erro ao carregar empresas:', err)
      setError(errorMessage)
    } finally {
      console.log('🏁 [useEmpresas] Finalizando carregamento');
      isLoadingRef.current = false;
      setLoading(false)
    }
  }, [])

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

  // Carregar dados iniciais (apenas uma vez)
  useEffect(() => {
    loadEmpresas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
