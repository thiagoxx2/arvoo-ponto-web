import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export interface Colaborador {
  id: string
  nome: string
  pin: string
  ativo: boolean
  empresa_id: string
  created_at: string
  updated_at: string
}

export interface Empresa {
  id: string
  nome: string
  cnpj: string
  created_at: string
  updated_at: string
}

export interface RegistroPonto {
  id: string
  colaborador_id: string
  empresa_id: string
  data: string
  hora: string
  tipo: 'entrada' | 'saida'
  foto_url?: string
  created_at: string
}

export interface ColaboradorWithEmpresa extends Colaborador {
  empresa: Empresa
}

export interface RegistroPontoWithDetails extends RegistroPonto {
  colaborador: Colaborador
  empresa: Empresa
}
