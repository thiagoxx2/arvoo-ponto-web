import { useState, useEffect, useCallback } from 'react'
import { ColaboradorService } from '../services/colaboradorService'
import { Colaborador } from '../types/pontos'

interface UseColaboradoresReturn {
  colaboradores: Colaborador[]
  loading: boolean
  error: string | null
  loadColaboradores: (empresaId: string) => Promise<void>
  obterColaborador: (id: string) => Promise<Colaborador | null>
  buscarPorPin: (pinHash: string, empresaId: string) => Promise<Colaborador | null>
  refresh: () => Promise<void>
}

export function useColaboradores(empresaId?: string): UseColaboradoresReturn {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentEmpresaId, setCurrentEmpresaId] = useState<string | undefined>(empresaId)

  // Carregar colaboradores
  const loadColaboradores = useCallback(async (empresaId: string) => {
    if (loading) return

    setLoading(true)
    setError(null)

    try {
      const data = await ColaboradorService.listarAtivos(empresaId)
      setColaboradores(data)
      setCurrentEmpresaId(empresaId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      console.error('Erro ao carregar colaboradores:', err)
    } finally {
      setLoading(false)
    }
  }, [loading])

  // Obter colaborador por ID
  const obterColaborador = useCallback(async (id: string): Promise<Colaborador | null> => {
    try {
      return await ColaboradorService.obterPorId(id)
    } catch (err) {
      console.error('Erro ao obter colaborador:', err)
      return null
    }
  }, [])

  // Buscar colaborador por PIN
  const buscarPorPin = useCallback(async (pinHash: string, empresaId: string): Promise<Colaborador | null> => {
    try {
      return await ColaboradorService.buscarPorPin(pinHash, empresaId)
    } catch (err) {
      console.error('Erro ao buscar colaborador por PIN:', err)
      return null
    }
  }, [])

  // Refresh
  const refresh = useCallback(async () => {
    if (currentEmpresaId) {
      await loadColaboradores(currentEmpresaId)
    }
  }, [loadColaboradores, currentEmpresaId])

  // Carregar dados iniciais se empresaId foi fornecido
  useEffect(() => {
    if (empresaId) {
      loadColaboradores(empresaId)
    }
  }, [empresaId, loadColaboradores])

  return {
    colaboradores,
    loading,
    error,
    loadColaboradores,
    obterColaborador,
    buscarPorPin,
    refresh
  }
}
