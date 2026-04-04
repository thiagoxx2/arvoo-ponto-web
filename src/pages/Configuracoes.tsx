import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { supabaseClient as supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Upload, Image, Settings, Palette, Database, Info, Clock, Save, AlertCircle } from 'lucide-react'

export default function Configuracoes() {
  const { session } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [logo, setLogo] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [savingTolerancia, setSavingTolerancia] = useState(false)
  const [empresa, setEmpresa] = useState<any>(null)
  const [tolerancia, setTolerancia] = useState(10)
  const [config, setConfig] = useState({
    nomeSistema: 'Arvoo Ponto',
    descricao: 'Sistema de controle de ponto eletrônico',
    emailContato: '',
    telefoneContato: ''
  })

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      // Carregar configurações do localStorage
      const savedConfig = localStorage.getItem('sistema-config')
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig))
      }

      // Carregar dados da empresa se logado
      if (session?.user) {
        const empresaId = (session.user as any)?.app_metadata?.empresa_id || 
                          (session.user as any)?.user_metadata?.empresa_id

        if (empresaId) {
          const { data, error } = await supabase
            .from('empresas')
            .select('*')
            .eq('id', empresaId)
            .single()

          if (!error && data) {
            setEmpresa(data)
            setTolerancia(data.tolerancia_diaria_min ?? 10)
          }
        }
      }

      // Carregar logo do Supabase Storage
      const { data } = supabase.storage
        .from('configuracoes')
        .getPublicUrl('logo.png')

      if (data?.publicUrl) {
        setLogo(data.publicUrl)
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('Arquivo muito grande. Tamanho máximo: 5MB')
      return
    }

    if (!file.type.startsWith('image/')) {
      alert('Apenas arquivos de imagem são permitidos')
      return
    }

    try {
      setUploading(true)

      // Upload para Supabase Storage
      const { error } = await supabase.storage
        .from('configuracoes')
        .upload('logo.png', file, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) throw error

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('configuracoes')
        .getPublicUrl('logo.png')

      setLogo(urlData.publicUrl)
    } catch (error) {
      console.error('Erro ao fazer upload do logo:', error)
      alert('Erro ao fazer upload do logo')
    } finally {
      setUploading(false)
    }
  }

  const handleConfigChange = (field: string, value: string) => {
    const newConfig = { ...config, [field]: value }
    setConfig(newConfig)
    localStorage.setItem('sistema-config', JSON.stringify(newConfig))
  }

  const handleSaveConfig = () => {
    localStorage.setItem('sistema-config', JSON.stringify(config))
    alert('Configurações salvas com sucesso!')
  }

  const handleSaveTolerancia = async () => {
    if (!empresa?.id) {
      alert('Erro: Empresa não identificada.')
      return
    }

    try {
      setSavingTolerancia(true)
      const { error } = await supabase
        .from('empresas')
        .update({ 
          tolerancia_diaria_min: tolerancia,
          inscricao_especifica: empresa.inscricao_especifica,
          updated_at: new Date().toISOString()
        })
        .eq('id', empresa.id)

      if (error) throw error
      alert('Configuração de tolerância salva com sucesso!')
    } catch (error: any) {
      console.error('Erro ao salvar tolerância:', error)
      alert('Erro ao salvar tolerância: ' + error.message)
    } finally {
      setSavingTolerancia(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Configure as opções do sistema
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Configurações do Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Configurações do Sistema
            </CardTitle>
            <CardDescription>
              Configure as informações básicas do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nomeSistema">Nome do Sistema</Label>
              <Input
                id="nomeSistema"
                value={config.nomeSistema}
                onChange={(e) => handleConfigChange('nomeSistema', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                value={config.descricao}
                onChange={(e) => handleConfigChange('descricao', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailContato">Email de Contato</Label>
              <Input
                id="emailContato"
                type="email"
                value={config.emailContato}
                onChange={(e) => handleConfigChange('emailContato', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefoneContato">Telefone de Contato</Label>
              <Input
                id="telefoneContato"
                value={config.telefoneContato}
                onChange={(e) => handleConfigChange('telefoneContato', e.target.value)}
              />
            </div>
            <Button onClick={handleSaveConfig}>
              Salvar Configurações
            </Button>
          </CardContent>
        </Card>

        {/* Logo do Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Image className="mr-2 h-5 w-5" />
              Logo do Sistema
            </CardTitle>
            <CardDescription>
              Faça upload do logo da empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {logo && (
              <div className="flex justify-center">
                <img
                  src={logo}
                  alt="Logo do sistema"
                  className="h-32 w-32 object-contain rounded-lg border"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="logo">Upload do Logo</Label>
              <Input
                id="logo"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploading}
              />
              <p className="text-sm text-muted-foreground">
                Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 5MB
              </p>
            </div>
            {uploading && (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="ml-2">Fazendo upload...</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Aparência */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Palette className="mr-2 h-5 w-5" />
              Aparência
            </CardTitle>
            <CardDescription>
              Configure o tema e aparência do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="tema">Tema Escuro</Label>
                <p className="text-sm text-muted-foreground">
                  Ative o tema escuro para o sistema
                </p>
              </div>
              <Switch
                id="tema"
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
              />
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Tema Atual: {theme === 'dark' ? 'Escuro' : 'Claro'}</h4>
              <p className="text-sm text-muted-foreground">
                O tema será aplicado imediatamente e salvo automaticamente.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Informações do Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Info className="mr-2 h-5 w-5" />
              Informações do Sistema
            </CardTitle>
            <CardDescription>
              Detalhes sobre a versão e configuração
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Versão:</span>
                <span className="text-sm text-muted-foreground">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Empresa:</span>
                <span className="text-sm text-muted-foreground">{empresa?.nome_fantasia || empresa?.nome || 'Carregando...'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Framework:</span>
                <span className="text-sm text-muted-foreground">React + Vite</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Backend:</span>
                <span className="text-sm text-muted-foreground">Supabase</span>
              </div>
            </div>
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Conexão com Supabase</h4>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-muted-foreground">Conectado</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Regras de Jornada e Ponto */}
        <Card className="md:col-span-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center text-primary">
              <Clock className="mr-2 h-5 w-5" />
              Regras de Jornada e Ponto
            </CardTitle>
            <CardDescription>
              Defina as tolerâncias e regras de cálculo para a folha de ponto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 items-end">
              <div className="space-y-3">
                <Label htmlFor="inscricao_especifica" className="text-base">Inscrição Específica (CEI/CAEPF/CNO)</Label>
                <Input
                  id="inscricao_especifica"
                  value={empresa?.inscricao_especifica || ''}
                  onChange={(e) => setEmpresa({ ...empresa, inscricao_especifica: e.target.value })}
                  placeholder="Número caso exista"
                  className="text-lg h-12"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="tolerancia" className="text-base">Tolerância Diária (minutos)</Label>
                <div className="flex items-center space-x-4">
                  <Input
                    id="tolerancia"
                    type="number"
                    min="0"
                    max="60"
                    value={tolerancia}
                    onChange={(e) => setTolerancia(parseInt(e.target.value) || 0)}
                    className="max-w-[120px] text-lg h-12"
                  />
                  <div className="text-sm text-muted-foreground bg-background p-3 rounded-md border border-dashed flex-1">
                    <p className="font-semibold text-primary mb-1 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" /> Aviso Legal (CLT)
                    </p>
                    <p>O estipulado por lei (Art. 58) é de 10 minutos totais por dia para variações de entrada, saída e horas extras.</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button 
                  onClick={handleSaveTolerancia} 
                  disabled={savingTolerancia}
                  size="lg"
                  className="w-full md:w-auto"
                >
                  {savingTolerancia ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Salvar Regras de Ponto
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup e Exportação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="mr-2 h-5 w-5" />
            Backup e Exportação
          </CardTitle>
          <CardDescription>
            Gerencie backups e exportações do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-medium">Exportar Dados</h4>
              <p className="text-sm text-muted-foreground">
                Exporte todos os dados do sistema
              </p>
              <Button variant="outline" className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Importar Dados</h4>
              <p className="text-sm text-muted-foreground">
                Importe dados de outro sistema
              </p>
              <Button variant="outline" className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                Importar
              </Button>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Limpar Dados</h4>
              <p className="text-sm text-muted-foreground">
                Remover todos os dados (cuidado!)
              </p>
              <Button variant="destructive" className="w-full">
                <Database className="mr-2 h-4 w-4" />
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
