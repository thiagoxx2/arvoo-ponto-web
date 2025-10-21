import { createClient } from '@supabase/supabase-js'

// Validação das variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

// Validar URL sem / no final
const cleanUrl = supabaseUrl.endsWith('/') ? supabaseUrl.slice(0, -1) : supabaseUrl

// Criar cliente Supabase com configurações otimizadas
export const supabaseClient = createClient(cleanUrl, supabaseAnonKey, {
  auth: {
    // Persistir sessão no localStorage
    persistSession: true,
    // Detectar mudanças de sessão automaticamente
    detectSessionInUrl: true
  },
  realtime: {
    // Configurações padrão para Realtime
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'web-ponto@1.0.0'
    }
  }
})

// Exportar também como 'supabase' para compatibilidade
export const supabase = supabaseClient

// Função para testar conexão
export const testConnection = async () => {
  try {
    const { error } = await supabaseClient.from('empresas').select('count').limit(1)
    if (error) throw error
    console.log('✅ Supabase connection successful')
    return true
  } catch (error) {
    console.error('❌ Supabase connection failed:', error)
    return false
  }
}

// Log único no boot da aplicação
export const logBootStatus = () => {
  const url = import.meta.env.VITE_SUPABASE_URL
  const hasKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY
  
  console.log('🚀 Supabase client: OK')
  console.log(`📍 URL: ${url}`)
  console.log(`🔑 StorageKey único: ${hasKey ? 'OK' : 'MISSING'}`)
  console.log('📡 Realtime: Configurado')
}

// Verificar se as variáveis de ambiente estão presentes
export const validateEnvironment = () => {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    console.error('❌ Missing Supabase environment variables')
    console.error('Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
    return false
  }
  
  if (url.endsWith('/')) {
    console.warn('⚠️ VITE_SUPABASE_URL should not end with /')
  }
  
  return true
}
