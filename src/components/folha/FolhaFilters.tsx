import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface FolhaFiltersProps {
  ano: number;
  mes: number;
  colaboradorId: string | null;
  colaboradores: Array<{ id: string; nome: string }>;
  onAnoChange: (ano: number) => void;
  onMesChange: (mes: number) => void;
  onColaboradorChange: (colaboradorId: string | null) => void;
  onAtualizar: () => void;
  onExportar: () => void;
  loading?: boolean;
}

export function FolhaFilters({
  ano,
  mes,
  colaboradorId,
  colaboradores,
  onAnoChange,
  onMesChange,
  onColaboradorChange,
  onAtualizar,
  onExportar,
  loading = false
}: FolhaFiltersProps) {
  const meses = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  return (
    <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex flex-col gap-2">
        <Label htmlFor="ano">Ano</Label>
        <Input
          id="ano"
          type="number"
          value={ano}
          onChange={(e) => onAnoChange(parseInt(e.target.value) || new Date().getFullYear())}
          min="2020"
          max="2030"
          className="w-20"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="mes">Mês</Label>
        <select
          id="mes"
          value={mes}
          onChange={(e) => onMesChange(parseInt(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {meses.map(m => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="colaborador">Colaborador</Label>
        <select
          id="colaborador"
          value={colaboradorId || ''}
          onChange={(e) => onColaboradorChange(e.target.value || null)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-48"
        >
          <option value="">Todos os colaboradores</option>
          {colaboradores.map(colab => (
            <option key={colab.id} value={colab.id}>
              {colab.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end gap-2">
        <Button
          onClick={onAtualizar}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? 'Carregando...' : 'Atualizar'}
        </Button>
        
        <Button
          onClick={onExportar}
          variant="outline"
          disabled={loading}
        >
          Exportar CSV
        </Button>
      </div>
    </div>
  );
}
