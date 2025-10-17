import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabaseClient } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { type PontoWithDetails } from '@/types/pontos'
import { Search, Eye, Calendar, Clock, User, Building2, Download, AlertCircle, Wifi, WifiOff } from 'lucide-react'

export default function Pontos() {
  const { session, loading: authLoading } = useAuth()
  const [pontos, setPontos] = useState<PontoWithDetails[]>([])
  const [empresas, setEmpresas] = useState<Array<{id: string, nome: string}>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false)
  const [realtimeStatus, setRealtimeStatus] = useState<'CONNECTING' | 'SUBSCRIBED' | 'CLOSED' | 'ERROR'>('CONNECTING')
  const [isLoadingData, setIsLoadingData] = useState(false)

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
        
        // Carregar empresas
        const { data: empresasData, error: empresasError } = await supabaseClient
          .from('empresas')
          .select('id, nome')
          .order('nome')

        if (empresasError) throw empresasError
        setEmpresas(empresasData || [])

        // Carregar pontos
        const { data: pontosData, error: pontosError } = await supabaseClient
          .from('pontos')
          .select(`
            *,
            colaborador:colaboradores(*),
            empresa:empresas(*),
            foto:fotos(*)
          `)
          .order('created_at', { ascending: false })

        if (pontosError) throw pontosError
        console.log('📊 Contagem de registros recebidos:', pontosData?.length || 0)
        setPontos(pontosData || [])
        
        // Verificar se retornou vazio
        if (pontosData && pontosData.length === 0) {
          console.warn('⚠️ Retorno vazio - verificar RLS/permissões')
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
      const { data: pontosData, error: pontosError } = await supabaseClient
        .from('pontos')
        .select(`
          *,
          colaborador:colaboradores(*),
          empresa:empresas(*),
          foto:fotos(*)
        `)
        .order('created_at', { ascending: false })

      if (pontosError) throw pontosError
      setPontos(pontosData || [])
    } catch (err: any) {
      console.error('Erro ao recarregar dados:', err)
    } finally {
      setIsLoadingData(false)
    }
  }

  // Configurar Realtime
  useEffect(() => {
    if (!session) return

    console.log('📡 Iniciando Realtime...')
    
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

  // Filtrar registros por termo de busca
  const registrosFiltrados = pontos.filter(ponto => {
    if (!searchTerm) return true
    const termo = searchTerm.toLowerCase()
    return (
      ponto.colaborador.nome.toLowerCase().includes(termo) ||
      ponto.empresa.nome.toLowerCase().includes(termo) ||
      ponto.empresa.cnpj?.toLowerCase().includes(termo)
    )
  })

  // Filtrar por data se selecionada
  const registrosPorData = selectedDate 
    ? registrosFiltrados.filter(ponto => {
        const pontoDate = new Date(ponto.created_at).toISOString().split('T')[0]
        return pontoDate === selectedDate
      })
    : registrosFiltrados

  // Filtrar por empresa se selecionada
  const registrosFinais = selectedEmpresaId
    ? registrosPorData.filter(ponto => ponto.empresa_id === selectedEmpresaId)
    : registrosPorData

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl)
    setIsImageDialogOpen(true)
  }

  // Função para gerar URL da foto (público ou privado)
  const getPhotoUrl = (storagePath: string): string => {
    // Se o storage_path já é uma URL completa, retornar como está
    if (storagePath.startsWith('http')) {
      return storagePath
    }
    
    // Para buckets públicos, usar getPublicUrl
    const { data } = supabaseClient.storage.from('fotos-pontos').getPublicUrl(storagePath)
    return data.publicUrl
  }

  const downloadImage = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Erro ao baixar imagem:', error)
    }
  }


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
          {pontos.length === 0 && (
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
          <h1 className="text-3xl font-bold tracking-tight">Registros de Ponto</h1>
          <p className="text-muted-foreground">
            Visualize todos os registros de ponto do sistema
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
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Registros</CardTitle>
              <CardDescription>
                {registrosFinais.length} registro(s) encontrado(s)
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-8 w-48"
                />
              </div>
              <select
                value={selectedEmpresaId}
                onChange={(e) => setSelectedEmpresaId(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="">Todas as empresas</option>
                {empresas.map(empresa => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nome}
                  </option>
                ))}
              </select>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar registros..."
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
                  <TableHead>Data</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Foto</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrosFinais.map((ponto) => {
                  const data = new Date(ponto.created_at)
                  const dataFormatada = data.toLocaleDateString('pt-BR')
                  const horaFormatada = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  
                  return (
                    <TableRow key={ponto.id}>
                      <TableCell>{dataFormatada}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                          {horaFormatada}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          ponto.tipo === 'entrada'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {ponto.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <User className="mr-2 h-4 w-4 text-muted-foreground" />
                          {ponto.colaborador.nome}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{ponto.empresa.nome}</div>
                            {ponto.empresa.cnpj && (
                              <div className="text-sm text-muted-foreground">{ponto.empresa.cnpj}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {ponto.foto?.storage_path ? (
                          <div className="flex items-center space-x-2">
                            <img
                              src={getPhotoUrl(ponto.foto.storage_path)}
                              alt="Foto do ponto"
                              className="h-10 w-10 rounded object-cover cursor-pointer hover:opacity-80"
                              onClick={() => handleImageClick(getPhotoUrl(ponto.foto!.storage_path))}
                              onError={(e) => {
                                console.error('Erro ao carregar foto:', e)
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleImageClick(getPhotoUrl(ponto.foto!.storage_path))}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Sem foto</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {ponto.foto?.storage_path && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => downloadImage(
                              getPhotoUrl(ponto.foto!.storage_path), 
                              `ponto_${ponto.colaborador.nome}_${dataFormatada}_${horaFormatada}.jpg`
                            )}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para visualizar imagem */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Foto do Registro de Ponto</DialogTitle>
            <DialogDescription>
              Visualize a foto capturada no momento do registro
            </DialogDescription>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={selectedImage}
                  alt="Foto do ponto"
                  className="max-w-full max-h-96 rounded-lg object-contain"
                />
              </div>
              <div className="flex justify-center space-x-2">
                <Button
                  onClick={() => downloadImage(
                    selectedImage, 
                    `ponto_${new Date().toISOString().split('T')[0]}.jpg`
                  )}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Baixar Imagem
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
