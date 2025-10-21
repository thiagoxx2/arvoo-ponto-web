import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useColaboradores } from '../hooks/useColaboradores';
import { useFolhaMensal } from '../hooks/useFolha';
import { FolhaFilters } from '../components/folha/FolhaFilters';
import { FolhaTabelaEmpresa } from '../components/folha/FolhaTabelaEmpresa';
import { DiaDetalheModal } from '../components/folha/DiaDetalheModal';
import { FotosDrawer } from '../components/folha/FotosDrawer';
import { currentYearMonthLocal } from '../utils/time';
import { calcPontoMensalMultiplos } from '../services/rpcFolha';

interface ColaboradorTotal {
  colaborador_id: string;
  colaborador_nome: string;
  total_minutos: number;
  dias_trabalhados: number;
  anomalias: number;
}

export default function Folha() {
  const navigate = useNavigate();
  const { colaboradores } = useColaboradores();
  
  const [ano, setAno] = useState(() => currentYearMonthLocal().ano);
  const [mes, setMes] = useState(() => currentYearMonthLocal().mes);
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState<string | null>(null);
  
  const [dadosTodos, setDadosTodos] = useState<ColaboradorTotal[]>([]);
  const [loadingTodos, setLoadingTodos] = useState(false);
  const [errorTodos, setErrorTodos] = useState<string | null>(null);
  
  const [modalDia, setModalDia] = useState<{ open: boolean; dia: string }>({ open: false, dia: '' });
  const [drawerFotos, setDrawerFotos] = useState<{ open: boolean; dia: string }>({ open: false, dia: '' });

  // Hook para dados do colaborador selecionado
  const { data: dadosColaborador, loading: loadingColaborador, error: errorColaborador } = useFolhaMensal(
    colaboradorSelecionado,
    ano,
    mes
  );

  // Carregar dados de todos os colaboradores
  const carregarDadosTodos = async () => {
    if (!colaboradores.length) return;

    setLoadingTodos(true);
    setErrorTodos(null);

    try {
      const colaboradorIds = colaboradores.map(c => c.id);
      const totais = await calcPontoMensalMultiplos(colaboradorIds, ano, mes);
      
      const dadosComNomes = totais.map(total => {
        const colaborador = colaboradores.find(c => c.id === total.colaborador_id);
        return {
          colaborador_id: total.colaborador_id,
          colaborador_nome: colaborador?.nome || 'Nome não encontrado',
          total_minutos: total.total_minutos,
          dias_trabalhados: total.dias_trabalhados,
          anomalias: 0 // TODO: implementar cálculo de anomalias
        };
      });

      setDadosTodos(dadosComNomes);
    } catch (error) {
      console.error('Erro ao carregar dados de todos:', error);
      setErrorTodos('Erro ao carregar dados dos colaboradores');
    } finally {
      setLoadingTodos(false);
    }
  };

  // Carregar dados quando mudar ano/mes
  useEffect(() => {
    if (!colaboradorSelecionado) {
      carregarDadosTodos();
    }
  }, [ano, mes, colaboradores]);

  const handleAtualizar = () => {
    if (colaboradorSelecionado) {
      // Dados do colaborador são recarregados automaticamente pelo hook
      return;
    } else {
      carregarDadosTodos();
    }
  };

  const handleExportar = () => {
    // TODO: implementar exportação CSV
    console.log('Exportar CSV - TODO');
  };

  const handleVerFolha = (colaboradorId: string) => {
    navigate(`/colaboradores/${colaboradorId}/folha?ano=${ano}&mes=${mes}`);
  };

  const handleVerDetalhes = (dia: string) => {
    setModalDia({ open: true, dia });
  };

  const handleVerFotos = (dia: string) => {
    setDrawerFotos({ open: true, dia });
  };

  const colaboradorAtual = colaboradores.find(c => c.id === colaboradorSelecionado);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Folha de Ponto</h1>
        <p className="text-gray-600">Visualize e gerencie as horas trabalhadas</p>
      </div>

      <FolhaFilters
        ano={ano}
        mes={mes}
        colaboradorId={colaboradorSelecionado}
        colaboradores={colaboradores}
        onAnoChange={setAno}
        onMesChange={setMes}
        onColaboradorChange={setColaboradorSelecionado}
        onAtualizar={handleAtualizar}
        onExportar={handleExportar}
        loading={loadingTodos || loadingColaborador}
      />

      {errorTodos && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{errorTodos}</p>
        </div>
      )}

      {errorColaborador && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{errorColaborador}</p>
        </div>
      )}

      {!colaboradorSelecionado ? (
        <FolhaTabelaEmpresa
          modo="todos"
          dados={dadosTodos}
          loading={loadingTodos}
          onVerFolha={handleVerFolha}
        />
      ) : (
        <FolhaTabelaEmpresa
          modo="colaborador"
          colaboradorId={colaboradorSelecionado}
          colaboradorNome={colaboradorAtual?.nome}
          dados={dadosColaborador || []}
          loading={loadingColaborador}
          onVerDetalhes={handleVerDetalhes}
          onVerFotos={handleVerFotos}
        />
      )}

      {/* Modal de detalhes do dia */}
      <DiaDetalheModal
        open={modalDia.open}
        onClose={() => setModalDia({ open: false, dia: '' })}
        colaboradorId={colaboradorSelecionado}
        diaISO={modalDia.dia}
      />

      {/* Drawer de fotos */}
      <FotosDrawer
        open={drawerFotos.open}
        onClose={() => setDrawerFotos({ open: false, dia: '' })}
        colaboradorId={colaboradorSelecionado}
        diaISO={drawerFotos.dia}
      />
    </div>
  );
}
