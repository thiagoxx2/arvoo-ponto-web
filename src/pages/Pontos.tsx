import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabaseClient } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { type PontoWithDetails } from '@/types/pontos'
import { Search, Eye, Calendar, Clock, User, Building2, Download, AlertCircle } from 'lucide-react'
import { sanitizeFilename, fmtDateForFilename, getExtensionFromMimeType } from '@/utils/fileUtils'
import { getPhotoUrl, refreshPhotoUrl, isPhotoUrlExpired, isFotosBucketPrivate } from '@/utils/photoUrl'


// SVG placeholder para imagens quebradas
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzZiNzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkZvdG8gaW5kaXNwb27DrXZlbDwvdGV4dD48L3N2Zz4='

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
  const [selectedImagePath, setSelectedImagePath] = useState<string | null>(null)
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(false)
  
  // Cache de URLs de fotos para evitar regenerar signed URLs
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map())
  
  // Rastrear tentativas de refresh para evitar loops infinitos
  const [refreshAttempts, setRefreshAttempts] = useState<Map<string, number>>(new Map())

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
        
        if (status === 'CHANNEL_ERROR') {
          console.warn('⚠️ Realtime desabilitado no projeto ou bloqueado pela rede')
        }
      })

    return () => {
      console.log('📡 Desconectando Realtime...')
      supabaseClient.removeChannel(channel)
    }
  }, [session])

  // Pré-carregar URLs de fotos dos registros visíveis
  useEffect(() => {
    async function preloadPhotoUrls() {
      const pontosComFoto = pontos.filter(p => p.foto?.storage_path)
      
      for (const ponto of pontosComFoto) {
        const storagePath = ponto.foto!.storage_path
        
        // Só carregar se não estiver no cache
        if (!photoUrls.has(storagePath)) {
          await resolvePhotoUrl(storagePath)
        }
      }
    }
    
    if (pontos.length > 0) {
      preloadPhotoUrls()
    }
  }, [pontos]) // Recarregar quando pontos mudarem

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

  const handleImageClick = (imageUrl: string, storagePath?: string) => {
    setSelectedImage(imageUrl)
    setSelectedImagePath(storagePath || null)
    setIsImageDialogOpen(true)
  }

  // Função para resolver URL de foto com verificação de expiração
  const resolvePhotoUrl = async (storagePath: string, forceRefresh: boolean = false): Promise<string> => {
    const isPrivate = isFotosBucketPrivate()
    
    // Se bucket público, não precisa verificar expiração
    if (!isPrivate && !forceRefresh && photoUrls.has(storagePath)) {
      return photoUrls.get(storagePath)!
    }
    
    // Para buckets privados, verificar expiração
    if (isPrivate && !forceRefresh && photoUrls.has(storagePath)) {
      // Se URL ainda é válida (não expirou), usar do cache
      if (!isPhotoUrlExpired(storagePath)) {
        return photoUrls.get(storagePath)!
      }
      
      // URL expirou, forçar refresh
      console.debug('[resolvePhotoUrl] URL expirada, fazendo refresh:', storagePath.substring(0, 50))
    }
    
    // Gerar nova URL (pública ou signed, com possível refresh)
    try {
      const url = forceRefresh && isPrivate
        ? await refreshPhotoUrl(supabaseClient, storagePath)
        : await getPhotoUrl(supabaseClient, storagePath)
      
      // Salvar no cache
      setPhotoUrls(prev => new Map(prev).set(storagePath, url))
      
      return url
    } catch (error) {
      console.error('[resolvePhotoUrl] Erro ao gerar URL:', error)
      return PLACEHOLDER_IMAGE
    }
  }

  // Handler para onError de imagens com auto-refresh inteligente
  const handleImageError = async (
    e: React.SyntheticEvent<HTMLImageElement>,
    storagePath: string
  ) => {
    const isPrivate = isFotosBucketPrivate()
    
    // Se bucket público, não tentar refresh (erro real)
    if (!isPrivate) {
      console.error('[Preview] Erro ao carregar foto (público)')
      e.currentTarget.src = PLACEHOLDER_IMAGE
      return
    }
    
    // Verificar tentativas anteriores (evitar loop infinito)
    const attempts = refreshAttempts.get(storagePath) || 0
    if (attempts >= 2) {
      console.error('[Preview] Máximo de tentativas de refresh atingido')
      e.currentTarget.src = PLACEHOLDER_IMAGE
      return
    }
    
    // Incrementar contador de tentativas
    setRefreshAttempts(prev => new Map(prev).set(storagePath, attempts + 1))
    
    try {
      console.debug('[Preview] Tentando refresh da URL expirada/inválida')
      
      // Forçar refresh da URL
      const newUrl = await refreshPhotoUrl(supabaseClient, storagePath)
      
      // Atualizar cache
      setPhotoUrls(prev => new Map(prev).set(storagePath, newUrl))
      
      // Verificar se URL realmente mudou (evitar loop)
      const oldUrl = e.currentTarget.src
      if (newUrl === oldUrl || newUrl === PLACEHOLDER_IMAGE) {
        console.error('[Preview] URL não mudou após refresh, usando placeholder')
        e.currentTarget.src = PLACEHOLDER_IMAGE
        return
      }
      
      // Atualizar src da imagem
      e.currentTarget.src = newUrl
    } catch (error) {
      console.error('[Preview] Erro ao fazer refresh:', error)
      e.currentTarget.src = PLACEHOLDER_IMAGE
    }
  }

  const downloadImage = async (imageUrl: string, rawName: string) => {
    const isDiagnostics = import.meta.env.VITE_DIAGNOSTICS === '1'
    
    try {
      if (isDiagnostics) {
        console.log('📥 [Download] Iniciando:', imageUrl)
      }
      
      const response = await fetch(imageUrl)
      
      // Validar resposta HTTP
      if (!response.ok) {
        const contentType = response.headers.get('content-type') || 'unknown'
        let errorBody = ''
        
        try {
          errorBody = await response.text()
        } catch (e) {
          errorBody = '(não foi possível ler o corpo da resposta)'
        }
        
        console.error(`❌ [Download] Falha HTTP ${response.status} ${response.statusText}`)
        console.error(`Content-Type recebido: ${contentType}`)
        console.error(`Corpo da resposta (primeiros 500 chars):`, errorBody.substring(0, 500))
        
        throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`)
      }

      const blob = await response.blob()
      
      // Validar Content-Type
      if (!blob.type.startsWith('image/')) {
        console.error(`❌ [Download] Content-Type inválido: ${blob.type} (esperado image/*)`)
        console.error(`Blob size: ${blob.size} bytes`)
        
        // Tentar ler conteúdo se for pequeno (pode ser JSON/HTML de erro)
        if (blob.size < 10000) {
          const text = await blob.text()
          console.error(`Conteúdo recebido (primeiros 500 chars):`, text.substring(0, 500))
        }
        
        throw new Error(`Download retornou ${blob.type || 'tipo desconhecido'} em vez de imagem`)
      }

      // Determinar extensão pelo MIME type usando util
      const ext = getExtensionFromMimeType(blob.type)

      // Sanitizar nome do arquivo
      const safeName = sanitizeFilename(rawName)
      const filename = `${safeName}.${ext}`

      if (isDiagnostics) {
        console.log(`✅ [Download] Válido: ${blob.type}, ${blob.size} bytes → ${filename}`)
      }

      // Download seguro
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      
      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      if (!isDiagnostics) {
        console.log(`✅ [Download] Sucesso: ${filename}`)
      }
    } catch (error) {
      console.error('❌ [Download] Erro:', error)
      alert(`Não foi possível baixar a imagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
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
                              src={photoUrls.get(ponto.foto.storage_path) || PLACEHOLDER_IMAGE}
                              alt="Foto do ponto"
                              className="h-10 w-10 rounded object-cover cursor-pointer hover:opacity-80"
                              onClick={async () => {
                                const url = await resolvePhotoUrl(ponto.foto!.storage_path)
                                handleImageClick(url, ponto.foto!.storage_path)
                              }}
                              onError={(e) => handleImageError(e, ponto.foto!.storage_path)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                const url = await resolvePhotoUrl(ponto.foto!.storage_path)
                                handleImageClick(url, ponto.foto!.storage_path)
                              }}
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
                            onClick={async () => {
                              const timestamp = fmtDateForFilename(data)
                              const colaborador = ponto.colaborador.nome
                              const filename = `ponto_${colaborador}_${timestamp}`
                              const url = await resolvePhotoUrl(ponto.foto!.storage_path)
                              downloadImage(url, filename)
                            }}
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
                  onError={(e) => {
                    if (selectedImagePath) {
                      handleImageError(e, selectedImagePath)
                    } else {
                      console.error('[Modal] Erro ao carregar foto')
                      e.currentTarget.src = PLACEHOLDER_IMAGE
                    }
                  }}
                />
              </div>
              <div className="flex justify-center space-x-2">
                <Button
                  onClick={async () => {
                    const timestamp = fmtDateForFilename(new Date())
                    const filename = `ponto_${timestamp}`
                    
                    // Se tem path e bucket é privado, verificar expiração
                    if (selectedImagePath && isFotosBucketPrivate()) {
                      if (isPhotoUrlExpired(selectedImagePath)) {
                        console.debug('[Download] URL expirada, fazendo refresh antes de baixar')
                        const freshUrl = await refreshPhotoUrl(supabaseClient, selectedImagePath)
                        await downloadImage(freshUrl, filename)
                        return
                      }
                    }
                    
                    await downloadImage(selectedImage!, filename)
                  }}
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

