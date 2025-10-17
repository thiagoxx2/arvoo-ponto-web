import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabaseClient } from '@/lib/supabaseClient'
import { type Colaborador, type Empresa, type PontoWithDetails } from '@/types/pontos'
import { Users, Building2, Clock, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalColaboradores: 0,
    totalEmpresas: 0,
    registrosHoje: 0,
    colaboradoresAtivos: 0
  })
  const [loading, setLoading] = useState(true)
  const [registrosPorDia, setRegistrosPorDia] = useState([])
  const [registrosPorTipo, setRegistrosPorTipo] = useState([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Carregar estatísticas básicas
      const [colaboradoresResult, empresasResult, registrosResult] = await Promise.all([
        supabase.from('colaboradores').select('*'),
        supabase.from('empresas').select('*'),
        supabase.from('pontos').select('*')
      ])

      const colaboradores = colaboradoresResult.data || []
      const empresas = empresasResult.data || []
      const registros = registrosResult.data || []

      // Calcular estatísticas
      const hoje = new Date().toISOString().split('T')[0]
      const registrosHoje = registros.filter(r => r.data === hoje).length
      const colaboradoresAtivos = colaboradores.filter(c => c.ativo).length

      setStats({
        totalColaboradores: colaboradores.length,
        totalEmpresas: empresas.length,
        registrosHoje,
        colaboradoresAtivos
      })

      // Carregar dados para gráficos
      loadChartData(registros)

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadChartData = (registros: RegistroPonto[]) => {
    // Gráfico de registros por dia (últimos 7 dias)
    const ultimos7Dias = Array.from({ length: 7 }, (_, i) => {
      const data = new Date()
      data.setDate(data.getDate() - i)
      return data.toISOString().split('T')[0]
    }).reverse()

    const registrosPorDiaData = ultimos7Dias.map(data => {
      const registrosDoDia = registros.filter(r => r.data === data)
      return {
        data: new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        registros: registrosDoDia.length
      }
    })

    setRegistrosPorDia(registrosPorDiaData)

    // Gráfico de registros por tipo
    const entrada = registros.filter(r => r.tipo === 'entrada').length
    const saida = registros.filter(r => r.tipo === 'saida').length

    setRegistrosPorTipo([
      { name: 'Entrada', value: entrada },
      { name: 'Saída', value: saida }
    ])
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
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do sistema Arvoo Ponto
        </p>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Colaboradores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalColaboradores}</div>
            <p className="text-xs text-muted-foreground">
              {stats.colaboradoresAtivos} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmpresas}</div>
            <p className="text-xs text-muted-foreground">
              Cadastradas no sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registros Hoje</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.registrosHoje}</div>
            <p className="text-xs text-muted-foreground">
              Pontos registrados hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Atividade</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalColaboradores > 0 
                ? Math.round((stats.colaboradoresAtivos / stats.totalColaboradores) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Colaboradores ativos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Registros por Dia</CardTitle>
            <CardDescription>Últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={registrosPorDia}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="registros" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registros por Tipo</CardTitle>
            <CardDescription>Entrada vs Saída</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={registrosPorTipo}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {registrosPorTipo.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
