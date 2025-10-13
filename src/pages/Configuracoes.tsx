import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'
import { Upload, Image, Settings, Palette, Database, Info } from 'lucide-react'

export default function Configuracoes() {
  const { theme, toggleTheme } = useTheme()
  const [logo, setLogo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
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
      // Carregar configurações do localStorage
      const savedConfig = localStorage.getItem('sistema-config')
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig))
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
      const { data, error } = await supabase.storage
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
                <span className="text-sm font-medium">Framework:</span>
                <span className="text-sm text-muted-foreground">React + Vite</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Backend:</span>
                <span className="text-sm text-muted-foreground">Supabase</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">UI:</span>
                <span className="text-sm text-muted-foreground">TailwindCSS + shadcn/ui</span>
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
