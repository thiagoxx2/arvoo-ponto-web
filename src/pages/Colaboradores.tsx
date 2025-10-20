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
import { Plus, Search, Edit, Trash2, Building2, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import { formatDate } from '@/lib/utils'

// Tipo para colaborador com empresa
type ColaboradorWithEmpresa = Colaborador & {
  empresa: Empresa
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
  const [realtimeStatus, setRealtimeStatus] = useState<'CONNECTING' | 'SUBSCRIBED' | 'CLOSED' | 'ERROR'>('CONNECTING')
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    pin: '', // TODO: migrar para pin_hash via Edge Function (hash server-side)
    ativo: true,
    empresa_id: ''
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

        // Carregar apenas a empresa do JWT para o formulário
        const { data: empresasData, error: empresasError } = await supabaseClient
          .from('empresas')
          .select('*')
          .eq('id', jwtEmpresaId)

        if (empresasError) throw empresasError

        setColaboradores(colaboradoresData || [])
        setEmpresas(empresasData || [])
        
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
        setRealtimeStatus(status === 'SUBSCRIBED' ? 'SUBSCRIBED' : status === 'CLOSED' ? 'CLOSED' : 'ERROR')
        
        if (status === 'CHANNEL_ERROR') {
          console.warn('⚠️ Realtime desabilitado no projeto ou bloqueado pela rede')
        }
      })

    return () => {
      console.log('📡 Desconectando Realtime...')
      supabaseClient.removeChannel(channel)
    }
  }, [session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Descobrir empresa_id do JWT (sempre usar do JWT, não do form)
      const jwtEmpresaId = 
        (session?.user as any)?.app_metadata?.empresa_id ??
        (session?.user as any)?.user_metadata?.empresa_id ?? ''
      
      const safeEmpresaId = jwtEmpresaId || formData.empresa_id // preferir JWT
      
      if (!jwtEmpresaId) {
        console.error('[RLS A] JWT missing empresa_id')
        setError('JWT sem empresa_id - operação bloqueada')
        return
      }

      if (editingColaborador) {
        // Atualizar colaborador
        const { error } = await supabaseClient
          .from('colaboradores')
          .update({
            nome: formData.nome,
            pin_hash: formData.pin, // TODO: hash server-side
            ativo: formData.ativo,
            empresa_id: safeEmpresaId, // usar do JWT
            updated_at: new Date().toISOString()
          })
          .eq('id', editingColaborador.id)

        if (error) {
          console.error('[RLS A] Insert/Update blocked by policy')
          throw error
        }
      } else {
        // Criar novo colaborador
        const { error } = await supabaseClient
          .from('colaboradores')
          .insert({
            nome: formData.nome,
            pin_hash: formData.pin, // TODO: hash server-side
            ativo: formData.ativo,
            empresa_id: safeEmpresaId // usar do JWT
          })

        if (error) {
          console.error('[RLS A] Insert/Update blocked by policy')
          throw error
        }
      }

      setIsDialogOpen(false)
      resetForm()
      // Realtime vai recarregar automaticamente
    } catch (error: any) {
      console.error('Erro ao salvar colaborador:', error)
      setError(error.message || 'Erro ao salvar colaborador')
    }
  }

  const handleEdit = (colaborador: Colaborador) => {
    setEditingColaborador(colaborador)
    setFormData({
      nome: colaborador.nome,
      pin: colaborador.pin_hash, // TODO: não deveria expor hash
      ativo: colaborador.ativo,
      empresa_id: colaborador.empresa_id
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
      pin: '',
      ativo: true,
      empresa_id: ''
    })
    setEditingColaborador(null)
  }

  const filteredColaboradores = colaboradores.filter(colaborador =>
    colaborador.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    colaborador.pin_hash.includes(searchTerm) ||
    colaborador.empresa.nome.toLowerCase().includes(searchTerm.toLowerCase())
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
        <div className="flex items-center space-x-2">
          {/* Status do Realtime */}
          <div className="flex items-center space-x-2 text-sm">
            {realtimeStatus === 'SUBSCRIBED' ? (
              <div className="flex items-center space-x-1 text-green-600">
                <Wifi className="h-4 w-4" />
                <span>Conectado</span>
              </div>
            ) : realtimeStatus === 'ERROR' ? (
              <div className="flex items-center space-x-1 text-red-600">
                <WifiOff className="h-4 w-4" />
                <span>Realtime desabilitado</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-yellow-600">
                <WifiOff className="h-4 w-4" />
                <span>Conectando...</span>
              </div>
            )}
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Colaborador
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingColaborador ? 'Editar Colaborador' : 'Novo Colaborador'}
              </DialogTitle>
              <DialogDescription>
                {editingColaborador 
                  ? 'Atualize as informações do colaborador.'
                  : 'Adicione um novo colaborador ao sistema.'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin">PIN</Label>
                <Input
                  id="pin"
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="empresa">Empresa</Label>
                <select
                  id="empresa"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.empresa_id}
                  onChange={(e) => setFormData({ ...formData, empresa_id: e.target.value })}
                  required
                >
                  <option value="">Selecione uma empresa</option>
                  {empresas.map(empresa => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                />
                <Label htmlFor="ativo">Ativo</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingColaborador ? 'Atualizar' : 'Criar'}
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
                  <TableHead>PIN</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredColaboradores.map((colaborador) => (
                  <TableRow key={colaborador.id}>
                    <TableCell className="font-medium">{colaborador.nome}</TableCell>
                    <TableCell>{colaborador.pin_hash}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                        {colaborador.empresa.nome}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        colaborador.ativo 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {colaborador.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(colaborador.created_at)}</TableCell>
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
