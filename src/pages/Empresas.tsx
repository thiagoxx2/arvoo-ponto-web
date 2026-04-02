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
import { Plus, Search, Edit, Trash2, Building2, AlertTriangle, MapPin } from 'lucide-react'

export default function Empresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rlsWarning, setRlsWarning] = useState(false)
  
  // Gestão de Unidades
  const [isUnidadesDialogOpen, setIsUnidadesDialogOpen] = useState(false)
  const [selectedEmpresaForUnidades, setSelectedEmpresaForUnidades] = useState<Empresa | null>(null)
  const [unidades, setUnidades] = useState<any[]>([])
  const [loadingUnidades, setLoadingUnidades] = useState(false)
  const [newUnidade, setNewUnidade] = useState({ nome: '', endereco: '', responsavel: '' })

  const [formData, setFormData] = useState({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    inscricao_estadual: '',
    inscricao_municipal: '',
    status: 'ativa',
    email_principal: '',
    telefone_principal: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    responsavel_nome: '',
    responsavel_email: '',
    plano_contratado: '',
    data_inicio_contrato: '',
    observacoes_internas: ''
  })

  useEffect(() => {
    loadEmpresas()
  }, [])

  const loadEmpresas = async () => {
    try {
      setLoading(true)
      setError(null)
      setRlsWarning(false)
      const { data, error } = await supabaseClient.from('empresas').select('*').order('nome_fantasia')
      if (error) throw error
      setEmpresas(data || [])
      if (data && data.length === 0) setRlsWarning(true)
    } catch (err) {
      setError('Erro ao carregar empresas.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      razao_social: '', nome_fantasia: '', cnpj: '', inscricao_estadual: '', inscricao_municipal: '', status: 'ativa',
      email_principal: '', telefone_principal: '', cep: '', logradouro: '', numero: '', complemento: '',
      bairro: '', cidade: '', estado: '', responsavel_nome: '', responsavel_email: '',
      plano_contratado: '', data_inicio_contrato: '', observacoes_internas: ''
    })
    setEditingEmpresa(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      setError(null)
      const payload = {
        nome: formData.nome_fantasia || formData.razao_social,
        ...formData,
        updated_at: new Date().toISOString()
      }
      if (editingEmpresa) {
        const { error } = await supabaseClient.from('empresas').update(payload).eq('id', editingEmpresa.id)
        if (error) throw error
      } else {
        const { error } = await supabaseClient.from('empresas').insert(payload)
        if (error) throw error
      }
      setIsDialogOpen(false)
      resetForm()
      loadEmpresas()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (empresa: Empresa) => {
    setEditingEmpresa(empresa)
    setFormData({
      razao_social: empresa.razao_social || '',
      nome_fantasia: empresa.nome_fantasia || empresa.nome || '',
      cnpj: empresa.cnpj || '',
      inscricao_estadual: empresa.inscricao_estadual || '',
      inscricao_municipal: empresa.inscricao_municipal || '',
      status: empresa.status || 'ativa',
      email_principal: empresa.email_principal || '',
      telefone_principal: empresa.telefone_principal || '',
      cep: empresa.cep || '',
      logradouro: empresa.logradouro || '',
      numero: empresa.numero || '',
      complemento: empresa.complemento || '',
      bairro: empresa.bairro || '',
      cidade: empresa.cidade || '',
      estado: empresa.estado || '',
      responsavel_nome: empresa.responsavel_nome || '',
      responsavel_email: empresa.responsavel_email || '',
      plano_contratado: empresa.plano_contratado || '',
      data_inicio_contrato: empresa.data_inicio_contrato || '',
      observacoes_internas: empresa.observacoes_internas || ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir empresa?')) return
    try {
      setError(null)
      const { error } = await supabaseClient.from('empresas').delete().eq('id', id)
      if (error) throw error
      loadEmpresas()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const loadUnidades = async (empresaId: string) => {
    setLoadingUnidades(true)
    const { data } = await supabaseClient.from('unidades').select('*').eq('empresa_id', empresaId).order('nome')
    setUnidades(data || [])
    setLoadingUnidades(false)
  }

  const handleOpenUnidades = (empresa: Empresa) => {
    setSelectedEmpresaForUnidades(empresa)
    loadUnidades(empresa.id)
    setIsUnidadesDialogOpen(true)
  }

  const handleAddUnidade = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmpresaForUnidades) return
    try {
      setSaving(true)
      const { error } = await supabaseClient.from('unidades').insert({
        empresa_id: selectedEmpresaForUnidades.id,
        ...newUnidade
      })
      if (error) throw error
      setNewUnidade({ nome: '', endereco: '', responsavel: '' })
      loadUnidades(selectedEmpresaForUnidades.id)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUnidade = async (id: string) => {
    if (!confirm('Excluir unidade?')) return
    await supabaseClient.from('unidades').delete().eq('id', id)
    if (selectedEmpresaForUnidades) loadUnidades(selectedEmpresaForUnidades.id)
  }

  const filteredEmpresas = empresas.filter(e => {
    const termo = searchTerm.toLowerCase()
    return (e.nome_fantasia || e.razao_social || e.nome || '').toLowerCase().includes(termo) ||
           e.cnpj.includes(termo.replace(/\D/g, ''))
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
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {rlsWarning && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Sem permissão ou sem registros. Verifique as policies de RLS no Supabase.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Empresas</h1>
          <p className="text-muted-foreground">Gerencie as empresas e suas unidades</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild><Button onClick={resetForm}><Plus className="mr-2 h-4 w-4" />Nova Empresa</Button></DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEmpresa ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
              <DialogDescription>
                {editingEmpresa ? 'Atualize as informações completas da empresa.' : 'Adicione uma nova empresa com detalhes fiscais e de endereço.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-1">Dados Fiscais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2"><Label>Razão Social</Label><Input value={formData.razao_social} onChange={e => setFormData({...formData, razao_social: e.target.value})} required /></div>
                  <div><Label>Nome Fantasia</Label><Input value={formData.nome_fantasia} onChange={e => setFormData({...formData, nome_fantasia: e.target.value})} /></div>
                  <div><Label>CNPJ</Label><Input value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} required /></div>
                  <div><Label>Status</Label>
                    <select className="flex w-full h-10 border rounded-md px-3 text-sm" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="ativa">Ativa</option><option value="inativa">Inativa</option>
                    </select>
                  </div>
                  <div><Label>Inscrição Estadual</Label><Input value={formData.inscricao_estadual} onChange={e => setFormData({...formData, inscricao_estadual: e.target.value})} /></div>
                  <div><Label>Inscrição Municipal</Label><Input value={formData.inscricao_municipal} onChange={e => setFormData({...formData, inscricao_municipal: e.target.value})} /></div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-1">Endereço</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><Label>CEP</Label><Input value={formData.cep} onChange={e => setFormData({...formData, cep: e.target.value})} /></div>
                  <div className="md:col-span-2"><Label>Logradouro</Label><Input value={formData.logradouro} onChange={e => setFormData({...formData, logradouro: e.target.value})} /></div>
                  <div><Label>Número</Label><Input value={formData.numero} onChange={e => setFormData({...formData, numero: e.target.value})} /></div>
                  <div><Label>Complemento</Label><Input value={formData.complemento} onChange={e => setFormData({...formData, complemento: e.target.value})} /></div>
                  <div><Label>Bairro</Label><Input value={formData.bairro} onChange={e => setFormData({...formData, bairro: e.target.value})} /></div>
                  <div><Label>Cidade</Label><Input value={formData.cidade} onChange={e => setFormData({...formData, cidade: e.target.value})} /></div>
                  <div><Label>UF</Label><Input value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value})} maxLength={2} /></div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-1">Responsável e Contrato</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Responsável Principal</Label><Input value={formData.responsavel_nome} onChange={e => setFormData({...formData, responsavel_nome: e.target.value})} /></div>
                  <div><Label>E-mail do Responsável</Label><Input type="email" value={formData.responsavel_email} onChange={e => setFormData({...formData, responsavel_email: e.target.value})} /></div>
                  <div><Label>E-mail Principal Empresa</Label><Input type="email" value={formData.email_principal} onChange={e => setFormData({...formData, email_principal: e.target.value})} /></div>
                  <div><Label>Telefone Principal Empresa</Label><Input value={formData.telefone_principal} onChange={e => setFormData({...formData, telefone_principal: e.target.value})} /></div>
                  <div><Label>Plano/Modalidade</Label><Input value={formData.plano_contratado} onChange={e => setFormData({...formData, plano_contratado: e.target.value})} /></div>
                  <div><Label>Início do Contrato</Label><Input type="date" value={formData.data_inicio_contrato} onChange={e => setFormData({...formData, data_inicio_contrato: e.target.value})} /></div>
                  <div className="md:col-span-2">
                    <Label>Observações Internas</Label>
                    <textarea 
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" 
                      value={formData.observacoes_internas} 
                      onChange={e => setFormData({...formData, observacoes_internas: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t"><Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Listagem</CardTitle>
              <CardDescription>{filteredEmpresas.length} empresa(s) encontrada(s)</CardDescription>
            </div>
            <div className="relative w-64"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/><Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8"/></div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Empresa</TableHead><TableHead>CNPJ</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredEmpresas.map(e => (
                <TableRow key={e.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-bold">{e.nome_fantasia || e.nome}</div>
                        <div className="text-xs text-muted-foreground">{e.razao_social}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{e.cnpj}</TableCell>
                  <TableCell><span className={`px-2 py-1 rounded-full text-xs font-medium ${e.status === 'ativa' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{e.status?.toUpperCase()}</span></TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenUnidades(e)}><MapPin className="h-4 w-4 mr-1"/> Unidades</Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(e)}><Edit className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)} className="text-destructive"><Trash2 className="h-4 w-4"/></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isUnidadesDialogOpen} onOpenChange={setIsUnidadesDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader><DialogTitle>Unidades / Filiais</DialogTitle><DialogDescription>Gerencie as unidades de {selectedEmpresaForUnidades?.nome_fantasia || selectedEmpresaForUnidades?.nome}</DialogDescription></DialogHeader>
          <form onSubmit={handleAddUnidade} className="space-y-4 border-b pb-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Label>Nome da Unidade</Label><Input value={newUnidade.nome} onChange={v => setNewUnidade({...newUnidade, nome: v.target.value})} required/></div>
              <div className="col-span-2"><Label>Endereço</Label><Input value={newUnidade.endereco} onChange={v => setNewUnidade({...newUnidade, endereco: v.target.value})}/></div>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>Adicionar Unidade</Button>
          </form>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {loadingUnidades ? <div className="text-center py-4 text-xs text-muted-foreground">Carregando...</div> : unidades.length === 0 ? <div className="text-center py-4 text-xs text-muted-foreground italic">Nenhuma unidade.</div> : unidades.map(u => (
              <div key={u.id} className="flex justify-between items-center p-3 border rounded-lg bg-muted/20">
                <div><div className="font-medium text-sm">{u.nome}</div><div className="text-xs text-muted-foreground">{u.endereco}</div></div>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteUnidade(u.id)} className="text-destructive"><Trash2 className="h-4 w-4"/></Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
