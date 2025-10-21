import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { minutesToHHMM, currentYearMonthLocal } from '../../utils/time';
import { useTotalMinutosMes } from '../../hooks/useFolha';

interface HorasMesCardProps {
  colaboradorId: string | null;
  colaboradorNome?: string;
  onVerFolha: () => void;
}

export function HorasMesCard({
  colaboradorId,
  colaboradorNome,
  onVerFolha
}: HorasMesCardProps) {
  const { ano, mes } = currentYearMonthLocal();
  const { totalMinutos, loading, error } = useTotalMinutosMes(colaboradorId, ano, mes);

  if (!colaboradorId) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">⏰</div>
          <h3 className="font-semibold mb-2">Horas Trabalhadas (Mês)</h3>
          <p className="text-sm">Selecione um colaborador para ver as horas trabalhadas</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="text-center">
        <div className="text-4xl mb-2">⏰</div>
        <h3 className="font-semibold mb-2">Horas Trabalhadas (Mês)</h3>
        
        {colaboradorNome && (
          <p className="text-sm text-gray-600 mb-4">{colaboradorNome}</p>
        )}

        {loading && (
          <div className="py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Carregando...</p>
          </div>
        )}

        {error && (
          <div className="py-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="py-4">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {minutesToHHMM(totalMinutos)}
            </div>
            <p className="text-sm text-gray-600">
              Total de horas trabalhadas em {mes.toString().padStart(2, '0')}/{ano}
            </p>
          </div>
        )}

        <Button
          onClick={onVerFolha}
          className="w-full bg-blue-600 hover:bg-blue-700"
          disabled={loading}
        >
          Ver Folha Mensal
        </Button>
      </div>
    </Card>
  );
}
