import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabaseClient } from '@/lib/supabaseClient'
import { type Empresa } from '@/types/pontos'
import { Plus, Search, Edit, Trash2, Building2, AlertTriangle } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function Empresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rlsWarning, setRlsWarning] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: ''
  })

  useEffect(() => {
    loadEmpresas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadEmpresas = async () => {
    try {
      setLoading(true)
      setError(null)
      setRlsWarning(false)

      const { data, error } = await supabaseClient
        .from('empresas')
        .select('*')
        .order('nome')

      if (error) throw error

      console.log(`📊 Empresas carregadas: ${data?.length || 0} registros`)
      setEmpresas(data || [])

      // Se voltar vazio sem erro, pode ser RLS
      if (data && data.length === 0) setRlsWarning(true)
    } catch (err) {
      console.error('Erro ao carregar empresas:', err)
      setError('Erro ao carregar empresas. Verifique as permissões.')
    } finally {
      setLoading(false)
    }
  }

  // ---------- Helpers seguros ----------
  const formatCNPJ = (cnpj?: string | null) => {
    const d = (cnpj ?? '').replace(/\D/g, '')
    if (d.length !== 14) return cnpj ?? '-'
    return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  }

  const resetForm = () => {
    setFormData({ nome: '', cnpj: '' })
    setEditingEmpresa(null)
  }

  // ---------- Ações ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSaving(true)
      setError(null)

      const nome = formData.nome.trim()
      const cnpj = formData.cnpj.trim()

      if (editingEmpresa) {
        // Atualizar
        const { error } = await supabaseClient
          .from('empresas')
          .update({ nome, cnpj })
          .eq('id', editingEmpresa.id)
        if (error) throw error
      } else {
        // Criar
        const { error } = await supabaseClient
          .from('empresas')
          .insert({ nome, cnpj })
        if (error) throw error
      }

      setIsDialogOpen(false)
      resetForm()
      loadEmpresas()
    } catch (err: any) {
      console.error('Erro ao salvar empresa:', err)
      setError(err.message || 'Erro ao salvar empresa')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (empresa: Empresa) => {
    setEditingEmpresa(empresa)
    setFormData({
      nome: empresa.nome ?? '',
      cnpj: empresa.cnpj ?? ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta empresa?')) return
    try {
      setError(null)
      const { error } = await supabaseClient.from('empresas').delete().eq('id', id)
      if (error) throw error
      loadEmpresas()
    } catch (err: any) {
      console.error('Erro ao excluir empresa:', err)
      setError(err.message || 'Erro ao excluir empresa')
    }
  }

  // ---------- Filtro seguro ----------
  const filteredEmpresas = empresas.filter((empresa) => {
    const termo = (searchTerm ?? '').toLowerCase()
    if (!termo) return true

    const nomeSafe = (empresa.nome ?? '').toLowerCase()
    const cnpjDigits = (empresa.cnpj ?? '').replace(/\D/g, '')
    const termoDigits = (searchTerm ?? '').replace(/\D/g, '')

    return (
      nomeSafe.includes(termo) ||
      (termoDigits ? cnpjDigits.includes(termoDigits) : false)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Banner de erro */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Banner de RLS */}
      {rlsWarning && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Sem permissão ou sem registros (RLS). Verifique se existe uma policy de SELECT em public.empresas para o papel authenticated.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Empresas</h1>
          <p className="text-muted-foreground">Gerencie as empresas do sistema</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Empresa
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingEmpresa ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
              <DialogDescription>
                {editingEmpresa ? 'Atualize as informações da empresa.' : 'Adicione uma nova empresa ao sistema.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Empresa</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : editingEmpresa ? 'Atualizar' : 'Criar'}
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
              <CardTitle>Lista de Empresas</CardTitle>
              <CardDescription>
                {filteredEmpresas.length} empresa(s) encontrada(s)
              </CardDescription>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar empresas..."
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
                  <TableHead>CNPJ</TableHead>
                  {empresas.some((e: any) => e?.created_at) && <TableHead>Criado em</TableHead>}
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredEmpresas.map((empresa) => (
                  <TableRow key={empresa.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                        {empresa.nome ?? '-'}
                      </div>
                    </TableCell>

                    <TableCell>{formatCNPJ(empresa.cnpj)}</TableCell>

                    {empresas.some((e: any) => e?.created_at) && (
                      <TableCell>{empresa.created_at ? formatDate(empresa.created_at) : '-'}</TableCell>
                    )}

                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(empresa)}>
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(empresa.id)}
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
