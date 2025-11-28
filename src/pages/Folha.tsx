import { useState, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import FolhaPontoPdfDocument, { type FolhaPontoPdfData } from '../components/folha/FolhaPontoPdfDocument';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { useEmpresas } from '../hooks/useEmpresas';
import { useColaboradores } from '../hooks/useColaboradores';
import { supabase } from '../lib/supabaseClient';

// Helper para formatar batidas (mesmo do PDF)
const fmtBatidas = (b: string[]) => (b?.length ? b.join(" / ") : "-");

// Helper para formatar data ISO para dd/mm/yyyy
const fmtDateBR = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export default function Folha() {
  // Hooks para empresas e colaboradores
  const { empresas, loading: loadingEmpresas, error: errorEmpresas } = useEmpresas();
  const [empresaId, setEmpresaId] = useState<string | undefined>();
  const { colaboradores, loadColaboradores, loading: loadingColaboradores, error: errorColaboradores } = useColaboradores(empresaId);
  const [colaboradorId, setColaboradorId] = useState<string | undefined>();

  // Debug: Log quando empresas são carregadas
  useEffect(() => {
    console.log('🔍 [Folha] Estado de empresas:', {
      count: empresas.length,
      loading: loadingEmpresas,
      error: errorEmpresas,
      empresas: empresas.map(e => ({ id: e.id, nome: e.nome }))
    });
  }, [empresas, loadingEmpresas, errorEmpresas]);

  // Debug: Log quando colaboradores são carregados
  useEffect(() => {
    if (empresaId) {
      console.log('🔍 [Folha] Estado de colaboradores:', {
        empresaId,
        count: colaboradores.length,
        loading: loadingColaboradores,
        error: errorColaboradores,
        colaboradores: colaboradores.map(c => ({ id: c.id, nome: c.nome }))
      });
    }
  }, [empresaId, colaboradores, loadingColaboradores, errorColaboradores]);

  // Estados de filtros
  const [mes, setMes] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  
  // Estado principal da folha
  const [folhaData, setFolhaData] = useState<FolhaPontoPdfData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar colaboradores quando empresa mudar
  useEffect(() => {
    if (empresaId) {
      loadColaboradores(empresaId);
      // Limpar colaborador selecionado quando mudar empresa
      setColaboradorId(undefined);
      setFolhaData(null);
    } else {
      setColaboradorId(undefined);
      setFolhaData(null);
    }
  }, [empresaId, loadColaboradores]);

  // Limpar folha quando colaborador mudar
  useEffect(() => {
    setFolhaData(null);
  }, [colaboradorId]);

  // Handler para carregar folha
  const handleCarregarFolha = async () => {
    // Validações
    if (!empresaId || !colaboradorId || !mes || !ano) {
      setError("Selecione empresa, colaborador e mês para visualizar a folha.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Montar p_mes_referencia no formato YYYY-MM-01
      const mesNum = mes;
      const anoNum = ano;
      const p_mes_referencia = `${anoNum}-${String(mesNum).padStart(2, "0")}-01`;

      // Chamar RPC
      const { data, error: rpcError } = await supabase.rpc("get_folha_ponto_pdf", {
        p_empresa_id: empresaId,
        p_colaborador_id: colaboradorId,
        p_mes_referencia,
      });

      if (rpcError) {
        console.error("Erro ao carregar folha:", rpcError);
        setError("Não foi possível carregar a folha de ponto.");
        setFolhaData(null);
        return;
      }

      if (!data) {
        setError("Nenhuma folha encontrada para o período selecionado.");
        setFolhaData(null);
        return;
      }

      // Tipar e setar os dados
      setFolhaData(data as FolhaPontoPdfData);
    } catch (err) {
      console.error("Erro inesperado ao carregar folha:", err);
      setError("Erro inesperado ao carregar a folha de ponto.");
      setFolhaData(null);
    } finally {
      setLoading(false);
    }
  };

  // Verificar se pode carregar folha
  const podeCarregar = empresaId && colaboradorId && mes && ano && !loading;

  return (
    <div className="space-y-6">
      {/* (A) Cabeçalho da página */}
      <div>
        <h1 className="text-2xl font-bold">Folha de Ponto</h1>
        <p className="text-gray-600 mt-1">
          Consulte e exporte a folha de ponto mensal dos colaboradores.
        </p>
      </div>

      {/* (B) Bloco de filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Selecione empresa, colaborador e mês para visualizar a folha de ponto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="empresa">Empresa</Label>
              <select
                id="empresa"
                value={empresaId || ""}
                onChange={(e) => {
                  const newEmpresaId = e.target.value || undefined;
                  console.log('🔍 [Folha] Empresa selecionada:', newEmpresaId);
                  setEmpresaId(newEmpresaId);
                }}
                disabled={loadingEmpresas}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-48 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {loadingEmpresas ? "Carregando empresas..." : "Selecione uma empresa"}
                </option>
                {empresas.length === 0 && !loadingEmpresas && (
                  <option value="" disabled>Nenhuma empresa encontrada</option>
                )}
                {empresas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nome}
                  </option>
                ))}
              </select>
              {loadingEmpresas && (
                <p className="text-xs text-gray-500">Carregando empresas do Supabase...</p>
              )}
              {!loadingEmpresas && empresas.length === 0 && !errorEmpresas && (
                <p className="text-xs text-gray-500">Nenhuma empresa disponível</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="colaborador">Colaborador</Label>
              <select
                id="colaborador"
                value={colaboradorId || ""}
                onChange={(e) => setColaboradorId(e.target.value || undefined)}
                disabled={!empresaId || loadingColaboradores}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-48 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!empresaId ? "Selecione uma empresa primeiro" : loadingColaboradores ? "Carregando..." : "Selecione um colaborador"}
                </option>
                {colaboradores.map((colaborador) => (
                  <option key={colaborador.id} value={colaborador.id}>
                    {colaborador.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="mes">Mês</Label>
              <select
                id="mes"
                value={mes}
                onChange={(e) => setMes(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>Janeiro</option>
                <option value={2}>Fevereiro</option>
                <option value={3}>Março</option>
                <option value={4}>Abril</option>
                <option value={5}>Maio</option>
                <option value={6}>Junho</option>
                <option value={7}>Julho</option>
                <option value={8}>Agosto</option>
                <option value={9}>Setembro</option>
                <option value={10}>Outubro</option>
                <option value={11}>Novembro</option>
                <option value={12}>Dezembro</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ano">Ano</Label>
              <Input
                id="ano"
                type="number"
                value={ano}
                onChange={(e) => setAno(parseInt(e.target.value) || new Date().getFullYear())}
                min="2020"
                max="2030"
                className="w-24"
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleCarregarFolha}
                disabled={!podeCarregar || loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Carregando..." : "Carregar folha"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mensagens de erro */}
      {errorEmpresas && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <p className="text-center text-red-600">
              Erro ao carregar empresas: {errorEmpresas}
            </p>
          </CardContent>
        </Card>
      )}
      {errorColaboradores && empresaId && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <p className="text-center text-red-600">
              Erro ao carregar colaboradores: {errorColaboradores}
            </p>
          </CardContent>
        </Card>
      )}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <p className="text-center text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* (C) Estado de vazio / carregamento */}
      {!folhaData && !loading && !error && (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-gray-500">
              Selecione empresa, colaborador e mês para visualizar a folha.
            </p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-gray-500">
              Carregando folha de ponto...
            </p>
          </CardContent>
        </Card>
      )}

      {/* (D) Bloco "Dados do colaborador e período" */}
      {folhaData && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Dados do Colaborador</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="font-semibold">Nome: </span>
                <span>{folhaData.colaborador.nome}</span>
              </div>
              {folhaData.colaborador.cargo && (
                <div>
                  <span className="font-semibold">Cargo: </span>
                  <span>{folhaData.colaborador.cargo}</span>
                </div>
              )}
              {folhaData.colaborador.regime_contratacao && (
                <div>
                  <span className="font-semibold">Regime de Contratação: </span>
                  <span>{folhaData.colaborador.regime_contratacao}</span>
                </div>
              )}
              {folhaData.colaborador.jornada_contratual && (
                <div>
                  <span className="font-semibold">Jornada Contratual: </span>
                  <span>{folhaData.colaborador.jornada_contratual}</span>
                </div>
              )}
              <div className="pt-2 border-t">
                <div>
                  <span className="font-semibold">Empresa: </span>
                  <span>{folhaData.empresa.nome}</span>
                </div>
                <div>
                  <span className="font-semibold">CNPJ: </span>
                  <span>{folhaData.empresa.cnpj}</span>
                </div>
              </div>
              <div className="pt-2 border-t">
                <span className="font-semibold">Período: </span>
                <span>{folhaData.periodo.descricao}</span>
              </div>
            </CardContent>
          </Card>

          {/* (E) Bloco "Resumo mensal" */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-600 mb-1">Total Trabalhado</div>
                <div className="text-2xl font-bold">{folhaData.mensal.total_horas_trabalhadas}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-600 mb-1">Horas Extras</div>
                <div className="text-2xl font-bold">{folhaData.mensal.total_horas_extras}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-600 mb-1">Atrasos</div>
                <div className="text-2xl font-bold">{folhaData.mensal.total_atrasos}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-600 mb-1">Faltas</div>
                <div className="text-2xl font-bold">{folhaData.mensal.total_faltas}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-600 mb-1">Banco de Horas Final</div>
                <div className="text-2xl font-bold">{folhaData.mensal.banco_horas_final}</div>
              </CardContent>
            </Card>
          </div>

          {/* (F) Tabela diária (espelho web) */}
          <Card>
            <CardHeader>
              <CardTitle>Espelho de Ponto Diário</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dia</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Entradas / Saídas</TableHead>
                    <TableHead>Total Trabalhado</TableHead>
                    <TableHead>Extras</TableHead>
                    <TableHead>Atrasos</TableHead>
                    <TableHead>Faltas</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {folhaData.diario.map((dia) => {
                    const batidasTexto = fmtBatidas(dia.batidas);
                    const batidasComObs = dia.observacao
                      ? `${batidasTexto} (${dia.observacao})`
                      : batidasTexto;
                    
                    return (
                      <TableRow key={dia.data}>
                        <TableCell className="font-medium">
                          {String(dia.dia).padStart(2, "0")}
                        </TableCell>
                        <TableCell>{fmtDateBR(dia.data)}</TableCell>
                        <TableCell>{batidasComObs}</TableCell>
                        <TableCell>{dia.total_trabalhado}</TableCell>
                        <TableCell>{dia.horas_extras}</TableCell>
                        <TableCell>{dia.atrasos}</TableCell>
                        <TableCell>{dia.faltas}</TableCell>
                        <TableCell>{dia.banco_horas_dia}</TableCell>
                        <TableCell>
                          {dia.observacao && (
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                dia.observacao === "PAR_INCOMPLETO"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {dia.observacao}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* (G) Bloco "Exportação / PDF" */}
          <Card>
            <CardHeader>
              <CardTitle>Exportações</CardTitle>
              <CardDescription>
                Gere o espelho em PDF para conferência e assinatura.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {folhaData && (
                <PDFDownloadLink
                  document={<FolhaPontoPdfDocument folha={folhaData} />}
                  fileName={`folha-${folhaData.periodo.mes}-${folhaData.colaborador.nome}.pdf`}
                >
                  {({ loading: pdfLoading }) => (
                    <Button
                      variant="outline"
                      disabled={pdfLoading}
                      className="bg-white hover:bg-gray-50"
                    >
                      {pdfLoading ? "Gerando PDF..." : "Gerar PDF"}
                    </Button>
                  )}
                </PDFDownloadLink>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
