import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabaseClient as supabase } from '@/lib/supabaseClient'
import { type PontoWithDetails, type Colaborador } from '@/types/pontos'
import { Download, Calendar, FileText, BarChart3, Users, Building2 } from 'lucide-react'
import { formatDate, formatDateTime, exportToCSV } from '@/lib/utils'

/** Tipo local para enriquecer o Ponto com campos derivados para a UI */
type PontoWithDetailsUI = PontoWithDetails & {
  data: string; // YYYY-MM-DD derivado de created_at
  hora: string; // HH:MM:SS  derivado de created_at
}

/** Tipo local para garantir que 'empresa' exista em Colaborador (vindo do SELECT com alias empresa:empresas(*)) */
type EmpresaRef = { id: string; nome: string; cnpj: string; created_at?: string }
type ColaboradorComEmpresa = Colaborador & { empresa: EmpresaRef }

export default function Relatorios() {
  const [registros, setRegistros] = useState<PontoWithDetailsUI[]>([])
  const [colaboradores, setColaboradores] = useState<ColaboradorComEmpresa[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    dataInicio: '',
    dataFim: '',
    colaboradorId: '',
    empresaId: ''
  })

  useEffect(() => {
    loadColaboradores()
  }, [])

  const loadColaboradores = async () => {
    try {
      const { data, error } = await supabase
        .from('colaboradores')
        .select(`
          *,
          empresa:empresas(*)
        `)
        .order('nome')

      if (error) throw error
      setColaboradores((data as ColaboradorComEmpresa[]) || [])
    } catch (error) {
      console.error('Erro ao carregar colaboradores:', error)
    }
  }

  const loadRegistros = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('pontos')
        .select(`
          *,
          colaborador:colaboradores(*),
          empresa:empresas(*)
        `)

      if (filters.dataInicio) {
        const startDate = new Date(filters.dataInicio + 'T00:00:00.000Z')
        query = query.gte('created_at', startDate.toISOString())
      }
      if (filters.dataFim) {
        const endDate = new Date(filters.dataFim + 'T23:59:59.999Z')
        query = query.lte('created_at', endDate.toISOString())
      }
      if (filters.colaboradorId) {
        query = query.eq('colaborador_id', filters.colaboradorId)
      }
      if (filters.empresaId) {
        query = query.eq('empresa_id', filters.empresaId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      
      // Processar dados para adicionar campos data e hora derivados do created_at
      const registrosProcessados: PontoWithDetailsUI[] = (data as PontoWithDetails[] || []).map((registro) => {
        const createdDate = new Date(registro.created_at as unknown as string)
        const dataStr = createdDate.toISOString().split('T')[0] // YYYY-MM-DD
        const horaStr = createdDate.toTimeString().split(' ')[0] // HH:MM:SS
        
        return {
          ...registro,
          data: dataStr,
          hora: horaStr
        }
      })
      
      setRegistros(registrosProcessados)
    } catch (error) {
      console.error('Erro ao carregar registros:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const handleGenerateReport = () => {
    loadRegistros()
  }

  const exportRegistrosCSV = () => {
    const csvData = registros.map((registro) => ({
      'Data': formatDate(registro.data),
      'Hora': registro.hora,
      'Tipo': registro.tipo === 'entrada' ? 'Entrada' : 'Saída',
      'Colaborador': (registro as any).colaborador?.nome ?? '',
      'PIN': (registro as any).colaborador?.pin ?? '',
      'Empresa': (registro as any).empresa?.nome ?? '',
      'CNPJ': (registro as any).empresa?.cnpj ?? '',
      'Registrado em': formatDateTime(registro.created_at as unknown as string)
    }))

    exportToCSV(csvData, `relatorio_pontos_${filters.dataInicio || 'inicio'}_${filters.dataFim || 'fim'}`)
  }

  const exportColaboradoresCSV = () => {
    const csvData = colaboradores.map((colaborador) => ({
      'Nome': colaborador.nome,
      'PIN': (colaborador as any).pin ?? '',
      'Status': colaborador.ativo ? 'Ativo' : 'Inativo',
      'Empresa': colaborador.empresa?.nome ?? '',
      'CNPJ': colaborador.empresa?.cnpj ?? '',
      'Criado em': formatDate(colaborador.created_at as unknown as string)
    }))

    exportToCSV(csvData, 'relatorio_colaboradores')
  }

  const exportEmpresasCSV = () => {
    const empresas: EmpresaRef[] = colaboradores.reduce<EmpresaRef[]>((acc, colaborador) => {
      const empresa = colaborador.empresa
      if (!empresa) return acc
      if (!acc.find(e => e.id === empresa.id)) {
        acc.push(empresa)
      }
      return acc
    }, [])

    const csvData = empresas.map((empresa) => ({
      'Nome': empresa.nome,
      'CNPJ': empresa.cnpj,
      'Criado em': formatDate(empresa.created_at ?? '')
    }))

    exportToCSV(csvData, 'relatorio_empresas')
  }

  const getReportStats = () => {
    const totalRegistros = registros.length
    const entradas = registros.filter(r => r.tipo === 'entrada').length
    const saidas = registros.filter(r => r.tipo === 'saida').length
    const colaboradoresUnicos = new Set(registros.map(r => (r as any).colaborador_id)).size
    const empresasUnicas = new Set(registros.map(r => (r as any).empresa_id)).size

    return {
      totalRegistros,
      entradas,
      saidas,
      colaboradoresUnicos,
      empresasUnicas
    }
  }

  const stats = getReportStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground">
          Gere e exporte relatórios do sistema
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros do Relatório</CardTitle>
          <CardDescription>
            Configure os filtros para gerar o relatório desejado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataInicio">Data Início</Label>
              <Input
                id="dataInicio"
                type="date"
                value={filters.dataInicio}
                onChange={(e) => handleFilterChange('dataInicio', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataFim">Data Fim</Label>
              <Input
                id="dataFim"
                type="date"
                value={filters.dataFim}
                onChange={(e) => handleFilterChange('dataFim', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="colaborador">Colaborador</Label>
              <select
                id="colaborador"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={filters.colaboradorId}
                onChange={(e) => handleFilterChange('colaboradorId', e.target.value)}
              >
                <option value="">Todos os colaboradores</option>
                {colaboradores.map((colaborador) => (
                  <option key={colaborador.id} value={colaborador.id}>
                    {colaborador.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="empresa">Empresa</Label>
              <select
                id="empresa"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={filters.empresaId}
                onChange={(e) => handleFilterChange('empresaId', e.target.value)}
              >
                <option value="">Todas as empresas</option>
                {Array.from(new Set(colaboradores.map(c => c.empresa?.id).filter(Boolean))).map((empresaId) => {
                  const empresa = colaboradores.find(c => c.empresa?.id === empresaId)?.empresa
                  return (
                    <option key={empresaId as string} value={empresaId as string}>
                      {empresa?.nome}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleGenerateReport} disabled={loading}>
              {loading ? 'Carregando...' : 'Gerar Relatório'}
            </Button>
            <Button variant="outline" onClick={() => setFilters({
              dataInicio: '',
              dataFim: '',
              colaboradorId: '',
              empresaId: ''
            })}>
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      {registros.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Registros</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRegistros}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entradas</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.entradas}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saídas</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.saidas}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Colaboradores</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.colaboradoresUnicos}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Empresas</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.empresasUnicas}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Exportações */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Relatório de Pontos
            </CardTitle>
            <CardDescription>
              Exporte os registros de ponto filtrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={exportRegistrosCSV} 
              disabled={registros.length === 0}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Relatório de Colaboradores
            </CardTitle>
            <CardDescription>
              Exporte a lista de colaboradores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={exportColaboradoresCSV}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="mr-2 h-5 w-5" />
              Relatório de Empresas
            </CardTitle>
            <CardDescription>
              Exporte a lista de empresas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={exportEmpresasCSV}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de resultados */}
      {registros.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Registros Encontrados</CardTitle>
            <CardDescription>
              {registros.length} registro(s) encontrado(s) com os filtros aplicados
            </CardDescription>
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
                    <TableHead>Registrado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registros.slice(0, 10).map((registro) => (
                    <TableRow key={registro.id as unknown as string}>
                      <TableCell>{formatDate(registro.data)}</TableCell>
                      <TableCell>{registro.hora}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          registro.tipo === 'entrada'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {registro.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </span>
                      </TableCell>
                      <TableCell>{(registro as any).colaborador?.nome ?? ''}</TableCell>
                      <TableCell>{(registro as any).empresa?.nome ?? ''}</TableCell>
                      <TableCell>{formatDateTime(registro.created_at as unknown as string)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {registros.length > 10 && (
                <div className="text-center py-4 text-muted-foreground">
                  Mostrando 10 de {registros.length} registros. Use a exportação para ver todos.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
