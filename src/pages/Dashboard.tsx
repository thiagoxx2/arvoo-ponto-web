import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabaseClient } from '@/lib/supabaseClient'
import { Users, Building2, Clock, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { HorasMesCard } from '../components/dashboard/HorasMesCard'
import { useNavigate } from 'react-router-dom'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

// Helper function to get timezone-aware dates for America/Sao_Paulo
const getTimezoneDates = () => {
  const now = new Date()
  
  // Get today's start (00:00) in America/Sao_Paulo
  const hoje = new Date(now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }))
  const inicioHoje = new Date(hoje.getTime() - hoje.getTimezoneOffset() * 60000)
  
  // Get tomorrow's start (00:00) in America/Sao_Paulo
  const amanha = new Date(hoje)
  amanha.setDate(amanha.getDate() + 1)
  const inicioAmanha = new Date(amanha.getTime() - amanha.getTimezoneOffset() * 60000)
  
  // Get 7 days ago start (00:00) in America/Sao_Paulo
  const inicioJanela = new Date(hoje)
  inicioJanela.setDate(inicioJanela.getDate() - 6)
  const inicioJanelaTz = new Date(inicioJanela.getTime() - inicioJanela.getTimezoneOffset() * 60000)
  
  return {
    inicioHojeISO: inicioHoje.toISOString(),
    inicioAmanhaISO: inicioAmanha.toISOString(),
    inicioJanelaISO: inicioJanelaTz.toISOString(),
    fimJanelaISO: inicioAmanha.toISOString()
  }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalColaboradores: 0,
    totalEmpresas: 0,
    registrosHoje: 0,
    colaboradoresAtivos: 0
  })
  const [loading, setLoading] = useState(true)
  const [registrosPorDia, setRegistrosPorDia] = useState<{ data: string; registros: number }[]>([])
  const [registrosPorTipo, setRegistrosPorTipo] = useState<{ name: string; value: number }[]>([])
  const [colaboradorSelecionado] = useState<{ id: string; nome: string } | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      const { inicioHojeISO, inicioAmanhaISO, inicioJanelaISO, fimJanelaISO } = getTimezoneDates()
      
      // Execute all queries in parallel for better performance
      const [
        colaboradoresResult,
        empresasResult,
        registrosHojeResult,
        registros7DiasResult,
        entradaResult,
        saidaResult
      ] = await Promise.all([
        // Total Colaboradores
        supabaseClient.from('colaboradores').select('*', { head: true, count: 'exact' }),
        
        // Total Empresas
        supabaseClient.from('empresas').select('*', { head: true, count: 'exact' }),
        
        // Registros Hoje
        supabaseClient.from('pontos')
          .select('*', { head: true, count: 'exact' })
          .gte('created_at', inicioHojeISO)
          .lt('created_at', inicioAmanhaISO),
        
        // Registros dos últimos 7 dias (limit to 5000 for performance)
        supabaseClient.from('pontos')
          .select('id, created_at')
          .gte('created_at', inicioJanelaISO)
          .lt('created_at', fimJanelaISO)
          .limit(5000),
        
        // Registros por tipo - Entrada
        supabaseClient.from('pontos')
          .select('*', { head: true, count: 'exact' })
          .eq('tipo', 'entrada'),
        
        // Registros por tipo - Saída
        supabaseClient.from('pontos')
          .select('*', { head: true, count: 'exact' })
          .eq('tipo', 'saida')
      ])

      // Extract counts with fallback to 0
      const totalColaboradores = colaboradoresResult.count || 0
      const totalEmpresas = empresasResult.count || 0
      const registrosHoje = registrosHojeResult.count || 0
      const entrada = entradaResult.count || 0
      const saida = saidaResult.count || 0

      // Calculate active collaborators (assuming 'ativo' field exists)
      // For now, we'll use total as active since we don't have the ativo field in the count query
      const colaboradoresAtivos = totalColaboradores

      setStats({
        totalColaboradores,
        totalEmpresas,
        registrosHoje,
        colaboradoresAtivos
      })

      // Process 7-day data
      const registros7Dias = registros7DiasResult.data || []
      loadChartData(registros7Dias, entrada, saida)

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
      // Set fallback values on error
      setStats({
        totalColaboradores: 0,
        totalEmpresas: 0,
        registrosHoje: 0,
        colaboradoresAtivos: 0
      })
      setRegistrosPorDia([])
      setRegistrosPorTipo([])
    } finally {
      setLoading(false)
    }
  }

  const loadChartData = (registros: any[], entrada: number, saida: number) => {
    // Create a map to aggregate registros by date
    const registrosPorData = new Map<string, number>()
    
    // Initialize all 7 days with 0
    const hoje = new Date()
    for (let i = 6; i >= 0; i--) {
      const data = new Date(hoje)
      data.setDate(data.getDate() - i)
      const dataStr = data.toISOString().split('T')[0]
      registrosPorData.set(dataStr, 0)
    }
    
    // Aggregate registros by date
    registros.forEach(registro => {
      const dataStr = registro.created_at.split('T')[0]
      if (registrosPorData.has(dataStr)) {
        registrosPorData.set(dataStr, (registrosPorData.get(dataStr) || 0) + 1)
      }
    })
    
    // Convert to array for chart
    const registrosPorDiaData = Array.from(registrosPorData.entries()).map(([data, count]) => ({
      data: new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      registros: count
    }))

    setRegistrosPorDia(registrosPorDiaData)

    // Set registros por tipo
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

      {/* Card de Horas Trabalhadas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <HorasMesCard
          colaboradorId={colaboradorSelecionado?.id || null}
          colaboradorNome={colaboradorSelecionado?.nome}
          onVerFolha={() => navigate('/folha')}
        />
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
                  {registrosPorTipo.map((_, index) => (
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
