import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { supabaseClient } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { type Colaborador, type Empresa } from '@/types/pontos'
import { Plus, Search, Edit, Trash2, Building2, AlertCircle } from 'lucide-react'
import { maskCPF, maskPhone, maskPIN } from '@/utils/masks'

/** Label com asterisco vermelho para campos obrigatórios */
function RequiredLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <Label htmlFor={htmlFor}>
      {children} <span className="text-red-500">*</span>
    </Label>
  )
}

// Tipo para colaborador com empresa
type ColaboradorWithEmpresa = Colaborador & {
  empresa?: Empresa | null
}

export default function Colaboradores() {
  const { session, loading: authLoading } = useAuth()
  const [colaboradores, setColaboradores] = useState<ColaboradorWithEmpresa[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingColaborador, setEditingColaborador] = useState<Colaborador | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [unidades, setUnidades] = useState<any[]>([])
  const [loadingUnidades, setLoadingUnidades] = useState(false)
  const [formData, setFormData] = useState({
    // Dados Pessoais
    nome: '',
    cpf: '',
    data_nascimento: '',
    email: '',
    telefone: '',
    
    // Dados Corporativos
    matricula: '',
    cargo: '',
    empresa_id: '',
    unidade: '',
    setor: '',
    gestor_responsavel: '',
    data_admissao: '',
    tipo_vinculo: '',
    
    // Ponto e Acesso
    pin: '', // PIN para quiosque
    senha_inicial: '', // Senha de acesso inicial (opcional)
    possui_acesso_app: false,
    horarios_pactuados: '',
    status: 'ativo',
    
    // Outros
    observacoes: '',
    foto_url: ''
  })

  // Carregar dados uma vez ao acessar a página (apenas se autenticado)
  useEffect(() => {
    async function loadInitialData() {
      // Verificar se está autenticado
      if (!session) { 
        setError('É necessário fazer login para acessar os dados')
        setLoading(false)
        return
      }

    // Evitar múltiplas chamadas simultâneas
      if (isLoadingData) return

      setLoading(true)
      setError(null)
      
      try {
        console.log('🔐 Sessão presente?', !!session)
        console.log('👤 Usuário:', session.user?.email)
        
        // Descobrir empresa_id do JWT
        const jwtEmpresaId = 
          (session?.user as any)?.app_metadata?.empresa_id ??
          (session?.user as any)?.user_metadata?.empresa_id ?? ''
        
        console.log('🏢 JWT empresa_id:', jwtEmpresaId)
        
        // Carregar colaboradores com empresas (RLS Opção A)
        const { data: colaboradoresData, error: colaboradoresError } = await supabaseClient
          .from('colaboradores')
          .select(`
            *,
            empresa:empresas(*)
          `)
          .order('nome', { ascending: true })

        if (colaboradoresError) throw colaboradoresError

        // Carregar todas as empresas permitidas pela RLS (ordenadas por nome)
        const { data: empresasData, error: empresasError } = await supabaseClient
          .from('empresas')
          .select('*')
          .order('nome', { ascending: true })

        if (empresasError) throw empresasError

        setColaboradores(colaboradoresData || [])
        setEmpresas(empresasData || [])
        
        // Pré-seleção quando há exatamente 1 empresa e formData.empresa_id está vazio
        if ((empresasData?.length ?? 0) === 1 && !formData.empresa_id) {
          setFormData(prev => ({ ...prev, empresa_id: empresasData![0].id }))
        }
        
        // Verificar se retornou vazio
        if (colaboradoresData && colaboradoresData.length === 0) {
          console.warn('[RLS A] Verifique se o JWT do usuário contém empresa_id. Sem esse claim, as consultas retornarão [].')
        }
        
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar dados')
        console.error('Erro ao carregar dados:', err)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      loadInitialData()
    }
  }, [session, authLoading])

  // Função para recarregar dados (usada pelo Realtime)
  const loadData = async () => {
    if (!session || isLoadingData) return

    setIsLoadingData(true)
    try {
      const { data: colaboradoresData, error: colaboradoresError } = await supabaseClient
        .from('colaboradores')
        .select(`
          *,
          empresa:empresas(*)
        `)
        .order('nome', { ascending: true })

      if (colaboradoresError) throw colaboradoresError
      setColaboradores(colaboradoresData || [])
    } catch (err: any) {
      console.error('Erro ao recarregar dados:', err)
    } finally {
      setIsLoadingData(false)
    }
  }

  // Configurar Realtime
  useEffect(() => {
    if (!session) return

    console.log('📡 Iniciando Realtime colaboradores...')
    
    const channel = supabaseClient
      .channel('rt-colaboradores')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'colaboradores'
        },
        (payload) => {
          console.log('📡 Realtime colaboradores:', payload.eventType, payload.new || payload.old)
          // Recarregar dados quando houver mudanças
          loadData()
        }
      )
      .subscribe((status) => {
        console.log('📡 Status Realtime:', status)
        
        if (status === 'CHANNEL_ERROR') {
          console.warn('⚠️ Realtime desabilitado no projeto ou bloqueado pela rede')
        }
      })

    return () => {
      console.log('📡 Desconectando Realtime...')
      supabaseClient.removeChannel(channel)
    }
  }, [session])

  // Carregar unidades quando a empresa mudar
  useEffect(() => {
    async function loadUnidades() {
      if (!formData.empresa_id) {
        setUnidades([])
        return
      }
      try {
        setLoadingUnidades(true)
        const { data, error } = await supabaseClient
          .from('unidades')
          .select('*')
          .eq('empresa_id', formData.empresa_id)
          .order('nome')
        if (error) throw error
        setUnidades(data || [])
      } catch (err) {
        console.error('Erro ao carregar unidades:', err)
      } finally {
        setLoadingUnidades(false)
      }
    }
    loadUnidades()
  }, [formData.empresa_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      // Descobrir empresa_id do JWT (fallback)
      const jwtEmpresaId = 
        (session?.user as any)?.app_metadata?.empresa_id ??
        (session?.user as any)?.user_metadata?.empresa_id ?? ''
      
      // Priorizar formData.empresa_id sobre jwtEmpresaId
      const safeEmpresaId = formData.empresa_id || jwtEmpresaId
      
      if (!safeEmpresaId) {
        const msg = 'Selecione uma empresa para o colaborador.'
        setError(msg)
        setIsSubmitting(false)
        return
      }

      if (editingColaborador) {
        // UPDATE direto na tabela
        const payload: any = {
          nome: formData.nome,
          status: formData.status,
          empresa_id: safeEmpresaId,
          cpf: formData.cpf || null,
          data_nascimento: formData.data_nascimento || null,
          email: formData.email || null,
          telefone: formData.telefone || null,
          matricula: formData.matricula || null,
          cargo: formData.cargo || null,
          unidade: formData.unidade || null,
          setor: formData.setor || null,
          gestor_responsavel: formData.gestor_responsavel || null,
          data_admissao: formData.data_admissao || null,
          tipo_vinculo: formData.tipo_vinculo || null,
          horarios_pactuados: formData.horarios_pactuados || null,
          possui_acesso_app: formData.possui_acesso_app,
          observacoes: formData.observacoes || null,
          updated_at: new Date().toISOString()
        }

        // Se informou nova senha ou PIN, deveríamos ter funções de hash.
        // No momento, se não temos biblioteca de hash no front, poderíamos enviar via Edge Function
        // ou salvar como texto se o projeto ainda estiver em desenvolvimento (NÃO RECOMENDADO para prod).
        // COMO ASSUMIMOS SIMPLICIDADE, vamos atualizar os campos se informados.
        if (formData.pin.trim()) {
           if (!/^\d{4,6}$/.test(formData.pin)) throw new Error('PIN deve ter 4 a 6 dígitos.')
           // Para compatibilidade com a estrutura atual que usa pin_hash, idealmente teríamos hash.
           // Se a RPC 'colaborador_update_pin' ainda servir, usamos ela para o PIN.
           const { error: pinError } = await supabaseClient.rpc('colaborador_update_pin', {
            p_colaborador_id: editingColaborador.id,
            p_new_pin: formData.pin
          })
          if (pinError) throw pinError
        }

        const { error: updateError } = await supabaseClient
          .from('colaboradores')
          .update(payload)
          .eq('id', editingColaborador.id)

        if (updateError) throw updateError
      } else {
        // Criar colaborador via RPC (hash do PIN e senha feito no servidor)
        const { data: newId, error: rpcError } = await supabaseClient.rpc('colaborador_create', {
          p_nome: formData.nome,
          p_pin: formData.pin,
          p_ativo: formData.status === 'ativo',
          p_empresa_id: safeEmpresaId,
          p_cpf: formData.cpf || null,
          p_data_nascimento: formData.data_nascimento || null,
          p_horarios_pactuados: formData.horarios_pactuados || null,
          p_matricula: formData.matricula || null,
          p_email: formData.email || null,
          p_telefone: formData.telefone || null,
          p_cargo: formData.cargo || null,
          p_setor: formData.setor || null,
          p_unidade: formData.unidade || null,
          p_jornada_contratual: formData.horarios_pactuados || null,
          p_gestor_responsavel: formData.gestor_responsavel || null,
          p_data_admissao: formData.data_admissao || null,
          p_status: formData.status || 'ativo',
          p_tipo_vinculo: formData.tipo_vinculo || null,
          p_senha_hash: formData.senha_inicial || null,
          p_possui_acesso_app: formData.possui_acesso_app,
          p_observacoes: formData.observacoes || null
        })

        if (rpcError) throw rpcError
        console.log('✅ Colaborador criado com ID:', newId)
      }

      console.log('✅ Colaborador salvo com sucesso.')
      
      // Fechar modal
      setIsDialogOpen(false)
      resetForm()
      setEditingColaborador(null)
      
      // Realtime vai recarregar automaticamente
    } catch (err: any) {
      const msg = err?.message ?? 'Falha ao salvar colaborador.'
      setError(msg)
      console.error('❌ Erro ao salvar colaborador:', msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (colaborador: Colaborador) => {
    setEditingColaborador(colaborador)
    setFormData({
      nome: colaborador.nome,
      cpf: colaborador.cpf || '',
      data_nascimento: colaborador.data_nascimento || '',
      email: colaborador.email || '',
      telefone: colaborador.telefone || '',
      matricula: colaborador.matricula || '',
      cargo: colaborador.cargo || '',
      empresa_id: colaborador.empresa_id,
      unidade: colaborador.unidade || '',
      setor: colaborador.setor || '',
      gestor_responsavel: colaborador.gestor_responsavel || '',
      data_admissao: colaborador.data_admissao || '',
      tipo_vinculo: colaborador.tipo_vinculo || '',
      pin: '',
      senha_inicial: '',
      possui_acesso_app: colaborador.possui_acesso_app || false,
      horarios_pactuados: colaborador.horarios_pactuados || '',
      status: colaborador.status || 'ativo',
      observacoes: colaborador.observacoes || '',
      foto_url: colaborador.foto_url || ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este colaborador?')) return

    try {
      const { error } = await supabaseClient
        .from('colaboradores')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('[RLS A] Delete blocked by policy')
        throw error
      }

      // Realtime vai recarregar automaticamente
    } catch (error: any) {
      console.error('Erro ao excluir colaborador:', error)
      setError(error.message || 'Erro ao excluir colaborador')
    }
  }

  const resetForm = () => {
    setFormData({
      nome: '',
      cpf: '',
      data_nascimento: '',
      email: '',
      telefone: '',
      matricula: '',
      cargo: '',
      empresa_id: '',
      unidade: '',
      setor: '',
      gestor_responsavel: '',
      data_admissao: '',
      tipo_vinculo: '',
      pin: '',
      senha_inicial: '',
      possui_acesso_app: false,
      horarios_pactuados: '',
      status: 'ativo',
      observacoes: '',
      foto_url: ''
    })
    setEditingColaborador(null)
  }

  const normalizedSearch = searchTerm.toLowerCase()
  const filteredColaboradores = colaboradores.filter((c) =>
    c.nome?.toLowerCase().includes(normalizedSearch) ||
    (c.empresa?.nome?.toLowerCase() ?? '').includes(normalizedSearch)
  )

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <div className="text-red-600 text-lg font-medium mb-2">Acesso Negado</div>
          <div className="text-gray-600">É necessário fazer login para acessar os dados</div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium mb-2">Erro ao carregar dados</div>
          <div className="text-gray-600">{error}</div>
          {colaboradores.length === 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="text-yellow-800 font-medium">Sem registros ou sem permissão (RLS)</div>
              <div className="text-yellow-700 text-sm">Verifique login/perfis/policies</div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Colaboradores</h1>
          <p className="text-muted-foreground">
            Gerencie os colaboradores do sistema
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Colaborador
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingColaborador ? 'Editar Colaborador' : 'Novo Colaborador'}
              </DialogTitle>
              <DialogDescription>
                {editingColaborador 
                  ? 'Atualize as informações completas do colaborador.'
                  : 'Adicione um novo colaborador com todos os dados necessários.'
                }
              </DialogDescription>
              <p className="text-xs text-muted-foreground mt-1">
                Campos marcados com <span className="text-red-500">*</span> são obrigatórios.
              </p>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Seção 1: Dados Pessoais */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-1">Dados Pessoais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <RequiredLabel htmlFor="nome">Nome Completo</RequiredLabel>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Nome completo do colaborador"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF (Único)</Label>
                    <Input
                      id="cpf"
                      placeholder="000.000.000-00"
                      value={formData.cpf}
                      onChange={(e) => setFormData({ ...formData, cpf: maskCPF(e.target.value) })}
                      maxLength={14}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                    <Input
                      id="data_nascimento"
                      type="date"
                      value={formData.data_nascimento}
                      onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="exemplo@empresa.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      placeholder="(00) 0 0000-0000"
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: maskPhone(e.target.value) })}
                      maxLength={16}
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Dados Corporativos */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-1">Dados Corporativos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <RequiredLabel htmlFor="empresa">Empresa Vinculada</RequiredLabel>
                    <select
                      id="empresa"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={formData.empresa_id ?? ''}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, empresa_id: e.target.value }))
                      }
                      required
                    >
                      <option value="" disabled>Selecione uma empresa</option>
                      {empresas.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="matricula">Matrícula (Única na empresa)</Label>
                    <Input
                      id="matricula"
                      value={formData.matricula}
                      onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                    />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="unidade">Unidade</Label>
                    <select
                      id="unidade"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={formData.unidade}
                      onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                      disabled={loadingUnidades || !formData.empresa_id}
                    >
                      <option value="">Selecione...</option>
                      {unidades.map((u) => (
                        <option key={u.id} value={u.nome}>
                          {u.nome}
                        </option>
                      ))}
                      {!loadingUnidades && unidades.length === 0 && formData.empresa_id && (
                        <option value="" disabled>Nenhuma unidade cadastrada</option>
                      )}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="setor">Setor</Label>
                    <Input
                      id="setor"
                      value={formData.setor}
                      onChange={(e) => setFormData({ ...formData, setor: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cargo">Cargo</Label>
                    <Input
                      id="cargo"
                      value={formData.cargo}
                      onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gestor">Gestor Responsável</Label>
                    <Input
                      id="gestor"
                      value={formData.gestor_responsavel}
                      onChange={(e) => setFormData({ ...formData, gestor_responsavel: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="data_admissao">Data de Admissão</Label>
                    <Input
                      id="data_admissao"
                      type="date"
                      value={formData.data_admissao}
                      onChange={(e) => setFormData({ ...formData, data_admissao: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vinculo">Tipo de Vínculo</Label>
                    <select
                      id="vinculo"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={formData.tipo_vinculo}
                      onChange={(e) => setFormData({ ...formData, tipo_vinculo: e.target.value })}
                    >
                      <option value="">Selecione...</option>
                      <option value="CLT">CLT</option>
                      <option value="PJ">PJ</option>
                      <option value="Estagiário">Estagiário</option>
                      <option value="Temporário">Temporário</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Seção 3: Ponto e Acesso */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-1">Ponto e Acesso</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <RequiredLabel htmlFor="status">Status</RequiredLabel>
                    <select
                      id="status"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="ativo">Ativo</option>
                      <option value="afastado">Afastado</option>
                      <option value="desligado">Desligado</option>
                      <option value="inativo">Inativo</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="horarios">Horários Pactuados</Label>
                    <Input
                      id="horarios"
                      placeholder="Ex: 08:00 às 18:00"
                      value={formData.horarios_pactuados}
                      onChange={(e) => setFormData({ ...formData, horarios_pactuados: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    {!editingColaborador ? (
                      <RequiredLabel htmlFor="pin">PIN de Identificação (Quiosque)</RequiredLabel>
                    ) : (
                      <Label htmlFor="pin">PIN de Identificação (Quiosque)</Label>
                    )}
                    <Input
                      id="pin"
                      type="password"
                      placeholder={editingColaborador ? "Vazio mantém o atual" : "4 a 6 dígitos"}
                      value={formData.pin}
                      onChange={(e) => setFormData({ ...formData, pin: maskPIN(e.target.value) })}
                      maxLength={6}
                      required={!editingColaborador}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="acesso_app" className="flex items-center space-x-2 pb-2">
                      <span>Possui acesso ao App?</span>
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="acesso_app"
                        checked={formData.possui_acesso_app}
                        onCheckedChange={(checked) => setFormData({ ...formData, possui_acesso_app: checked })}
                      />
                      <span className="text-sm text-muted-foreground">
                        {formData.possui_acesso_app ? 'Sim' : 'Não'}
                      </span>
                    </div>
                  </div>
                  {formData.possui_acesso_app && (
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="senha_inicial">
                        {editingColaborador ? 'Alterar Senha do App' : 'Senha de Acesso Inicial'}
                      </Label>
                      <Input
                        id="senha_inicial"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={formData.senha_inicial}
                        onChange={(e) => setFormData({ ...formData, senha_inicial: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Seção 4: Outros */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-1">Observações</h3>
                <textarea
                  id="observacoes"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Informações adicionais sobre o colaborador..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || !formData.empresa_id}>
                  {isSubmitting ? 'Salvando...' : editingColaborador ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Colaboradores</CardTitle>
              <CardDescription>
                {filteredColaboradores.length} colaborador(es) encontrado(s)
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar colaboradores..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Cargo/Setor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredColaboradores.map((colaborador) => (
                  <TableRow key={colaborador.id}>
                    <TableCell className="font-medium">
                      <div>{colaborador.nome}</div>
                      <div className="text-xs text-muted-foreground">Mat: {colaborador.matricula || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                        {colaborador.empresa?.nome ?? '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{colaborador.cargo || '-'}</div>
                      <div className="text-xs text-muted-foreground">{colaborador.setor || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        colaborador.status?.toLowerCase() === 'ativo' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : colaborador.status?.toLowerCase() === 'afastado'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {colaborador.status?.toUpperCase() || (colaborador.ativo ? 'ATIVO' : 'INATIVO')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(colaborador)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(colaborador.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
