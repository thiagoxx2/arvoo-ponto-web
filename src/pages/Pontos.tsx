import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { supabase, type RegistroPontoWithDetails } from '@/lib/supabase'
import { Search, Eye, Calendar, Clock, User, Building2, Download } from 'lucide-react'
import { formatDate, formatDateTime, formatTime } from '@/lib/utils'

export default function Pontos() {
  const [registros, setRegistros] = useState<RegistroPontoWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false)

  useEffect(() => {
    loadRegistros()
  }, [])

  const loadRegistros = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('registros_ponto')
        .select(`
          *,
          colaborador:colaboradores(*),
          empresa:empresas(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setRegistros(data || [])
    } catch (error) {
      console.error('Erro ao carregar registros:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl)
    setIsImageDialogOpen(true)
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

  const filteredRegistros = registros.filter(registro => {
    const matchesSearch = 
      registro.colaborador.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registro.empresa.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registro.tipo.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesDate = selectedDate === '' || registro.data === selectedDate
    
    return matchesSearch && matchesDate
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                {filteredRegistros.length} registro(s) encontrado(s)
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
                {filteredRegistros.map((registro) => (
                  <TableRow key={registro.id}>
                    <TableCell>{formatDate(registro.data)}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                        {formatTime(registro.hora)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        registro.tipo === 'entrada'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {registro.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <User className="mr-2 h-4 w-4 text-muted-foreground" />
                        {registro.colaborador.nome}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                        {registro.empresa.nome}
                      </div>
                    </TableCell>
                    <TableCell>
                      {registro.foto_url ? (
                        <div className="flex items-center space-x-2">
                          <img
                            src={registro.foto_url}
                            alt="Foto do ponto"
                            className="h-10 w-10 rounded object-cover cursor-pointer hover:opacity-80"
                            onClick={() => handleImageClick(registro.foto_url!)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleImageClick(registro.foto_url!)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Sem foto</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {registro.foto_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => downloadImage(
                            registro.foto_url!, 
                            `ponto_${registro.colaborador.nome}_${registro.data}_${registro.hora}.jpg`
                          )}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
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
