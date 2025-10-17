import { supabaseClient } from '../lib/supabaseClient'
import { Ponto, PontoWithDetails, FiltrosPontos, PaginationResult, RealtimeStatus } from '../types/pontos'

export class PontoService {
  /**
   * Listar pontos com filtros e paginação keyset
   */
  static async listar(filtros: FiltrosPontos = {}): Promise<PaginationResult<PontoWithDetails>> {
    const { empresaId, date, limit = 20, cursor } = filtros
    
    let query = supabaseClient
      .from('pontos')
      .select(`
        *,
        colaborador:colaboradores(*),
        empresa:empresas(*),
        foto:fotos(*)
      `)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit)

    // Filtro por empresa
    if (empresaId) {
      query = query.eq('empresa_id', empresaId)
    }

    // Filtro por data (faixa de 24h)
    if (date) {
      const startDate = new Date(date + 'T00:00:00.000Z')
      const endDate = new Date(date + 'T23:59:59.999Z')
      query = query.gte('created_at', startDate.toISOString())
      query = query.lte('created_at', endDate.toISOString())
    }

    // Paginação keyset
    if (cursor) {
      const [createdAt, id] = cursor.split(',')
      query = query.or(`created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${id})`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao listar pontos:', error)
      throw new Error(`Falha ao carregar pontos: ${error.message}`)
    }

    const pontos = data || []
    const hasMore = pontos.length === limit
    const nextCursor = hasMore && pontos.length > 0 
      ? `${pontos[pontos.length - 1].created_at},${pontos[pontos.length - 1].id}`
      : undefined

    return {
      data: pontos as PontoWithDetails[],
      nextCursor,
      hasMore
    }
  }

  /**
   * Obter ponto por ID
   */
  static async obterPorId(id: string): Promise<PontoWithDetails | null> {
    const { data, error } = await supabaseClient
      .from('pontos')
      .select(`
        *,
        colaborador:colaboradores(*),
        empresa:empresas(*),
        foto:fotos(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Erro ao obter ponto:', error)
      throw new Error(`Falha ao carregar ponto: ${error.message}`)
    }

    return data as PontoWithDetails
  }

  /**
   * Inserir novo ponto
   */
  static async inserir(ponto: Omit<Ponto, 'id' | 'created_at'>): Promise<Ponto> {
    const { data, error } = await supabaseClient
      .from('pontos')
      .insert(ponto)
      .select()
      .single()

    if (error) {
      console.error('Erro ao inserir ponto:', error)
      throw new Error(`Falha ao registrar ponto: ${error.message}`)
    }

    return data
  }

  /**
   * Assinar Realtime para mudanças na tabela pontos
   */
  static assinarRealtime(
    onStatusChange: (status: RealtimeStatus) => void,
    onDataChange: (payload: any) => void
  ) {
    const channel = supabaseClient
      .channel('pontos-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pontos'
        },
        (payload) => {
          console.log('📡 Realtime pontos:', payload.eventType, payload.new || payload.old)
          onDataChange(payload)
        }
      )
      .subscribe((status) => {
        const statusInfo: RealtimeStatus = {
          status: status as 'SUBSCRIBED' | 'CLOSED' | 'ERROR',
          channel: 'pontos-realtime',
          timestamp: new Date().toISOString()
        }
        
        console.log('📡 Canal pontos:', statusInfo.status)
        onStatusChange(statusInfo)
      })

    return channel
  }

  /**
   * Desassinar Realtime
   */
  static desassinarRealtime(channel: any) {
    if (channel) {
      supabaseClient.removeChannel(channel)
    }
  }
}
