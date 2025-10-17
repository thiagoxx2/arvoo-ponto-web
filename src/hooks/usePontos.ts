import { useState, useEffect, useCallback, useRef } from 'react'
import { PontoService } from '../services/pontoService'
import { PontoWithDetails, FiltrosPontos, PaginationResult, RealtimeStatus } from '../types/pontos'

interface UsePontosReturn {
  pontos: PontoWithDetails[]
  loading: boolean
  error: string | null
  hasMore: boolean
  realtimeStatus: RealtimeStatus | null
  loadPontos: (filtros?: FiltrosPontos, reset?: boolean) => Promise<void>
  loadMore: () => Promise<void>
  subscribe: () => void
  unsubscribe: () => void
  refresh: () => Promise<void>
}

export function usePontos(initialFiltros: FiltrosPontos = {}): UsePontosReturn {
  const [pontos, setPontos] = useState<PontoWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus | null>(null)
  const [nextCursor, setNextCursor] = useState<string | undefined>()
  const [currentFiltros, setCurrentFiltros] = useState<FiltrosPontos>(initialFiltros)
  
  const channelRef = useRef<any>(null)
  const isLoadingMore = useRef(false)

  // Carregar pontos
  const loadPontos = useCallback(async (filtros: FiltrosPontos = {}, reset: boolean = true) => {
    if (loading) return

    setLoading(true)
    setError(null)

    try {
      const result: PaginationResult<PontoWithDetails> = await PontoService.listar({
        ...filtros,
        limit: 20
      })

      if (reset) {
        setPontos(result.data)
        setNextCursor(result.nextCursor)
      } else {
        setPontos(prev => [...prev, ...result.data])
        setNextCursor(result.nextCursor)
      }
      
      setHasMore(result.hasMore)
      setCurrentFiltros(filtros)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      console.error('Erro ao carregar pontos:', err)
    } finally {
      setLoading(false)
    }
  }, [loading])

  // Carregar mais pontos (paginação)
  const loadMore = useCallback(async () => {
    if (!hasMore || loading || isLoadingMore.current) return

    isLoadingMore.current = true
    setLoading(true)

    try {
      const result: PaginationResult<PontoWithDetails> = await PontoService.listar({
        ...currentFiltros,
        cursor: nextCursor,
        limit: 20
      })

      setPontos(prev => [...prev, ...result.data])
      setNextCursor(result.nextCursor)
      setHasMore(result.hasMore)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar mais pontos'
      setError(errorMessage)
      console.error('Erro ao carregar mais pontos:', err)
    } finally {
      setLoading(false)
      isLoadingMore.current = false
    }
  }, [hasMore, loading, currentFiltros, nextCursor])

  // Assinar Realtime
  const subscribe = useCallback(() => {
    if (channelRef.current) return

    console.log('📡 Iniciando assinatura Realtime...')
    
    channelRef.current = PontoService.assinarRealtime(
      (status: RealtimeStatus) => {
        console.log('📡 Status Realtime:', status.status)
        setRealtimeStatus(status)
      },
      (payload) => {
        console.log('📡 Dados Realtime recebidos:', payload.eventType)
        // Recarregar lista quando houver mudanças
        loadPontos(currentFiltros, true)
      }
    )
  }, [loadPontos, currentFiltros])

  // Desassinar Realtime
  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      console.log('📡 Desassinando Realtime...')
      PontoService.desassinarRealtime(channelRef.current)
      channelRef.current = null
      setRealtimeStatus(null)
    }
  }, [])

  // Refresh manual
  const refresh = useCallback(async () => {
    await loadPontos(currentFiltros, true)
  }, [loadPontos, currentFiltros])

  // Carregar dados iniciais
  useEffect(() => {
    loadPontos(initialFiltros, true)
  }, [])

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      unsubscribe()
    }
  }, [unsubscribe])

  return {
    pontos,
    loading,
    error,
    hasMore,
    realtimeStatus,
    loadPontos,
    loadMore,
    subscribe,
    unsubscribe,
    refresh
  }
}
