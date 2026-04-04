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
  status: string // 'ativo', 'afastado', 'desligado', 'inativo'
  ativo: boolean // legado, manter por compatibilidade
  
  // Documentação e Identificação
  cpf?: string
  matricula?: string
  data_nascimento?: string
  data_admissao?: string
  
  // Contato
  email?: string
  telefone?: string
  
  // Estrutura
  cargo?: string
  unidade?: string
  setor?: string
  gestor_responsavel?: string
  tipo_vinculo?: string
  
  // Ponto e Acesso
  horarios_pactuados?: string
  jornada_contratual?: string
  possui_acesso_app?: boolean
  senha_hash?: string
  pin?: string // PIN para quiosque, opcional na exibição
  
  // Escala de Trabalho
  tipo_escala?: string        // 'semanal_fixa' | 'ciclica' | 'livre'
  dias_trabalho?: number[]    // [0-6] → 0=Dom, 1=Seg, ..., 6=Sab
  escala_dias_trabalho?: number
  escala_dias_folga?: number
  escala_data_inicio?: string
  
  // Diversos
  foto_url?: string
  observacoes?: string
  created_at: string
}

// Tabela: empresas
export interface Empresa {
  id: string
  nome: string // Nome original para compatibilidade
  razao_social?: string
  nome_fantasia?: string
  cnpj: string
  cnpj_norm?: string
  inscricao_estadual?: string
  inscricao_municipal?: string
  email_principal?: string
  telefone_principal?: string
  status: string // 'ativa' | 'inativa'
  
  // Endereço
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  
  // Responsável
  responsavel_nome?: string
  responsavel_email?: string
  
  // Contrato
  plano_contratado?: string
  data_inicio_contrato?: string
  observacoes_internas?: string
  tolerancia_diaria_min?: number
  inscricao_especifica?: string
  
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
