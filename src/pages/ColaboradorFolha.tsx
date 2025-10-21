import { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useColaboradores } from '../hooks/useColaboradores';
import { useFolhaMensal } from '../hooks/useFolha';
import { FolhaFilters } from '../components/folha/FolhaFilters';
import { FolhaTabelaEmpresa } from '../components/folha/FolhaTabelaEmpresa';
import { DiaDetalheModal } from '../components/folha/DiaDetalheModal';
import { FotosDrawer } from '../components/folha/FotosDrawer';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { minutesToHHMM } from '../utils/time';

export default function ColaboradorFolha() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const { colaboradores } = useColaboradores();
  const colaborador = colaboradores.find(c => c.id === id);
  
  const [ano, setAno] = useState(() => {
    const anoParam = searchParams.get('ano');
    return anoParam ? parseInt(anoParam) : new Date().getFullYear();
  });
  const [mes, setMes] = useState(() => {
    const mesParam = searchParams.get('mes');
    return mesParam ? parseInt(mesParam) : new Date().getMonth() + 1;
  });
  
  const [modalDia, setModalDia] = useState<{ open: boolean; dia: string }>({ open: false, dia: '' });
  const [drawerFotos, setDrawerFotos] = useState<{ open: boolean; dia: string }>({ open: false, dia: '' });

  const { data, loading, error, totalMinutos, diasTrabalhados } = useFolhaMensal(
    id || null,
    ano,
    mes
  );

  const handleAtualizar = () => {
    // Dados são recarregados automaticamente pelo hook
  };

  const handleExportar = () => {
    // TODO: implementar exportação CSV
    console.log('Exportar CSV - TODO');
  };

  const handleImprimir = () => {
    window.print();
  };

  const handleVerDetalhes = (dia: string) => {
    setModalDia({ open: true, dia });
  };

  const handleVerFotos = (dia: string) => {
    setDrawerFotos({ open: true, dia });
  };

  if (!colaborador) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-gray-600">Colaborador não encontrado</p>
          <Button onClick={() => navigate('/folha')} className="mt-4">
            Voltar para Folha
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com informações do colaborador */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-600">
                {colaborador.nome.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{colaborador.nome}</h1>
              <p className="text-gray-600">Folha de Ponto Individual</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleImprimir} variant="outline">
              Imprimir
            </Button>
            <Button onClick={handleExportar} variant="outline">
              Exportar CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Resumo do mês */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total de Horas</p>
            <p className="text-2xl font-bold text-blue-600">
              {minutesToHHMM(totalMinutos)}
            </p>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Dias Trabalhados</p>
            <p className="text-2xl font-bold text-green-600">
              {diasTrabalhados}
            </p>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Média Diária</p>
            <p className="text-2xl font-bold text-purple-600">
              {diasTrabalhados > 0 ? minutesToHHMM(Math.round(totalMinutos / diasTrabalhados)) : '00:00'}
            </p>
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <FolhaFilters
        ano={ano}
        mes={mes}
        colaboradorId={id || null}
        colaboradores={[colaborador]}
        onAnoChange={setAno}
        onMesChange={setMes}
        onColaboradorChange={() => {}} // Não permitir mudança de colaborador nesta página
        onAtualizar={handleAtualizar}
        onExportar={handleExportar}
        loading={loading}
      />

      {/* Erro */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Tabela de dias */}
      <FolhaTabelaEmpresa
        modo="colaborador"
        colaboradorId={id}
        colaboradorNome={colaborador.nome}
        dados={data || []}
        loading={loading}
        onVerDetalhes={handleVerDetalhes}
        onVerFotos={handleVerFotos}
      />

      {/* Modal de detalhes do dia */}
      <DiaDetalheModal
        open={modalDia.open}
        onClose={() => setModalDia({ open: false, dia: '' })}
        colaboradorId={id || null}
        diaISO={modalDia.dia}
      />

      {/* Drawer de fotos */}
      <FotosDrawer
        open={drawerFotos.open}
        onClose={() => setDrawerFotos({ open: false, dia: '' })}
        colaboradorId={id || null}
        diaISO={drawerFotos.dia}
      />
    </div>
  );
}
