// Tipos baseados no schema real do BD

// Tabela: pontos
export interface Ponto {
  id: string
  empresa_id: string
  colaborador_id: string
  tipo: 'entrada' | 'saida'
  created_at: string
  foto_id?: string
  audit_hash?: string
}

// Tabela: colaboradores
export interface Colaborador {
  id: string
  empresa_id: string
  nome: string
  pin_hash: string
  ativo: boolean
  created_at: string
}

// Tabela: empresas
export interface Empresa {
  id: string
  nome: string
  cnpj: string
  cnpj_norm?: string
  created_at?: string
  updated_at?: string
}

// Tabela: fotos
export interface Foto {
  id: string
  empresa_id: string
  colaborador_id: string
  storage_path: string
  width?: number
  height?: number
  created_at: string
}

// Tipos compostos para exibição
export interface PontoWithDetails extends Ponto {
  colaborador: Colaborador
  empresa: Empresa
  foto?: Foto
}

export interface FiltrosPontos {
  empresaId?: string
  date?: string // YYYY-MM-DD
  limit?: number
  cursor?: string // created_at,id para paginação keyset
}

// Tipos para paginação
export interface PaginationResult<T> {
  data: T[]
  nextCursor?: string
  hasMore: boolean
}

// Tipos para Realtime
export interface RealtimeStatus {
  status: 'SUBSCRIBED' | 'CLOSED' | 'ERROR'
  channel: string
  timestamp: string
}
