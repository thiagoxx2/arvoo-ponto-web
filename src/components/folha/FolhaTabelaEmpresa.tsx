import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { minutesToHHMM, formatDate } from '../../utils/time';

interface ColaboradorTotal {
  colaborador_id: string;
  colaborador_nome: string;
  total_minutos: number;
  dias_trabalhados: number;
  anomalias: number;
}

interface DiaDetalhe {
  dia: string;
  minutos_liquidos: number;
  status_dia: string;
}

interface FolhaTabelaEmpresaProps {
  modo: 'todos' | 'colaborador';
  colaboradorId?: string;
  colaboradorNome?: string;
  dados: ColaboradorTotal[] | DiaDetalhe[];
  loading?: boolean;
  onVerFolha?: (colaboradorId: string) => void;
  onVerDetalhes?: (dia: string) => void;
  onVerFotos?: (dia: string) => void;
}

export function FolhaTabelaEmpresa({
  modo,
  colaboradorNome,
  dados,
  loading = false,
  onVerFolha,
  onVerDetalhes,
  onVerFotos
}: FolhaTabelaEmpresaProps) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </Card>
    );
  }

  if (modo === 'todos') {
    const colaboradores = dados as ColaboradorTotal[];
    
    return (
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-semibold">Colaborador</th>
                <th className="text-left p-3 font-semibold">Dias Trabalhados</th>
                <th className="text-left p-3 font-semibold">Total (hh:mm)</th>
                <th className="text-left p-3 font-semibold">Anomalias</th>
                <th className="text-left p-3 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {colaboradores.map((colab) => (
                <tr key={colab.colaborador_id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{colab.colaborador_nome}</td>
                  <td className="p-3">{colab.dias_trabalhados}</td>
                  <td className="p-3 font-mono">{minutesToHHMM(colab.total_minutos)}</td>
                  <td className="p-3">
                    {colab.anomalias > 0 ? (
                      <span className="text-red-600 font-semibold">{colab.anomalias}</span>
                    ) : (
                      <span className="text-green-600">0</span>
                    )}
                  </td>
                  <td className="p-3">
                    <Button
                      size="sm"
                      onClick={() => onVerFolha?.(colab.colaborador_id)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Abrir Folha
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }

  // Modo colaborador único
  const dias = dados as DiaDetalhe[];
  
  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Folha de Ponto - {colaboradorNome}</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3 font-semibold">Dia</th>
              <th className="text-left p-3 font-semibold">Horas (hh:mm)</th>
              <th className="text-left p-3 font-semibold">Status</th>
              <th className="text-left p-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {dias.map((dia) => (
              <tr key={dia.dia} className="border-b hover:bg-gray-50">
                <td className="p-3">{formatDate(dia.dia)}</td>
                <td className="p-3 font-mono">{minutesToHHMM(dia.minutos_liquidos)}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-sm ${
                    dia.status_dia === 'OK' ? 'bg-green-100 text-green-800' :
                    dia.status_dia === 'PAR_INCOMPLETO' ? 'bg-yellow-100 text-yellow-800' :
                    dia.status_dia === 'SEM_REGISTRO' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {dia.status_dia === 'OK' ? 'OK' :
                     dia.status_dia === 'PAR_INCOMPLETO' ? 'Par Incompleto' :
                     dia.status_dia === 'SEM_REGISTRO' ? 'Sem Registro' :
                     dia.status_dia}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onVerDetalhes?.(dia.dia)}
                    >
                      Detalhes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onVerFotos?.(dia.dia)}
                    >
                      Fotos
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
