import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { minutesToHHMM, formatDateTime } from '../../utils/time';
import { useFolhaDiaria } from '../../hooks/useFolha';

interface DiaDetalheModalProps {
  open: boolean;
  onClose: () => void;
  colaboradorId: string | null;
  diaISO: string;
}

export function DiaDetalheModal({
  open,
  onClose,
  colaboradorId,
  diaISO
}: DiaDetalheModalProps) {
  const { data, loading, error } = useFolhaDiaria(colaboradorId, diaISO);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Detalhes do Dia - {diaISO}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando detalhes...</p>
          </div>
        )}

        {error && (
          <div className="p-6 text-center">
            <p className="text-red-600">{error}</p>
            <Button onClick={onClose} className="mt-4">
              Fechar
            </Button>
          </div>
        )}

        {data && (
          <div className="space-y-4">
            {/* Resumo */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Resumo do Dia</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Minutos Brutos</p>
                  <p className="font-mono text-lg">{minutesToHHMM(data.minutos_brutos)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Desconto Almoço</p>
                  <p className="font-mono text-lg">{minutesToHHMM(data.minutos_desconto_almoco)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Minutos Líquidos</p>
                  <p className="font-mono text-lg font-semibold">{minutesToHHMM(data.minutos_liquidos)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`px-2 py-1 rounded text-sm ${
                    data.status_dia === 'OK' ? 'bg-green-100 text-green-800' :
                    data.status_dia === 'PAR_INCOMPLETO' ? 'bg-yellow-100 text-yellow-800' :
                    data.status_dia === 'SEM_REGISTRO' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {data.status_dia === 'OK' ? 'OK' :
                     data.status_dia === 'PAR_INCOMPLETO' ? 'Par Incompleto' :
                     data.status_dia === 'SEM_REGISTRO' ? 'Sem Registro' :
                     data.status_dia}
                  </span>
                </div>
              </div>
            </Card>

            {/* Pares de Entrada/Saída */}
            {data.pares && data.pares.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Pares de Entrada/Saída</h3>
                <div className="space-y-3">
                  {data.pares.map((par, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Entrada</p>
                            <p className="font-mono">{formatDateTime(par.entrada)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Saída</p>
                            <p className="font-mono">{formatDateTime(par.saida)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Duração</p>
                        <p className="font-mono font-semibold">{minutesToHHMM(par.minutos)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Sem pares válidos */}
            {(!data.pares || data.pares.length === 0) && (
              <Card className="p-4">
                <div className="text-center text-gray-600">
                  <p>Nenhum par válido de entrada/saída encontrado para este dia.</p>
                  {data.status_dia === 'PAR_INCOMPLETO' && (
                    <p className="mt-2 text-sm">Pode haver registros incompletos ou sem correspondência.</p>
                  )}
                </div>
              </Card>
            )}

            <div className="flex justify-end">
              <Button onClick={onClose}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
