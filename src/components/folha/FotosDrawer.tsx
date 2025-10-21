import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { formatDateTime } from '../../utils/time';

interface Foto {
  id: string;
  url: string;
  created_at: string;
  colaborador_id: string;
}

interface FotosDrawerProps {
  open: boolean;
  onClose: () => void;
  colaboradorId: string | null;
  diaISO: string;
}

export function FotosDrawer({
  open,
  onClose,
  colaboradorId,
  diaISO
}: FotosDrawerProps) {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !colaboradorId || !diaISO) {
      setFotos([]);
      return;
    }

    const fetchFotos = async () => {
      setLoading(true);
      setError(null);

      try {
        // Converter diaISO para range de timestamps
        const inicioDia = new Date(diaISO + 'T00:00:00-03:00'); // UTC-3 (São Paulo)
        const fimDia = new Date(diaISO + 'T23:59:59-03:00');

        const { data, error } = await supabase
          .from('fotos')
          .select('*')
          .eq('colaborador_id', colaboradorId)
          .gte('created_at', inicioDia.toISOString())
          .lte('created_at', fimDia.toISOString())
          .order('created_at', { ascending: true });

        if (error) {
          throw error;
        }

        setFotos(data || []);
      } catch (err) {
        console.error('Erro ao buscar fotos:', err);
        setError('Erro ao carregar fotos');
        setFotos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFotos();
  }, [open, colaboradorId, diaISO]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Fotos do Dia</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Carregando fotos...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-8">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {!loading && !error && fotos.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-600">Nenhuma foto encontrada para este dia.</p>
              </div>
            )}

            {!loading && !error && fotos.length > 0 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  {fotos.length} foto(s) encontrada(s)
                </p>
                
                <div className="grid grid-cols-1 gap-4">
                  {fotos.map((foto) => (
                    <div key={foto.id} className="border rounded-lg overflow-hidden">
                      <img
                        src={foto.url}
                        alt={`Foto ${formatDateTime(foto.created_at)}`}
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzZiNzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVycm8gY2FycmVnYW5kbyBpbWFnZW08L3RleHQ+PC9zdmc+';
                        }}
                      />
                      <div className="p-3 bg-gray-50">
                        <p className="text-sm text-gray-600">
                          {formatDateTime(foto.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-4">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
