import { useState, useEffect } from 'react';
import { calcPontoDiario, calcPontoMensal, PontoDiario, PontoMensal } from '../services/rpcFolha';

/**
 * Hook para calcular folha mensal de um colaborador
 */
export function useFolhaMensal(
  colaboradorId: string | null,
  ano: number,
  mes: number,
  intervaloAlmocoMin: number = 60
) {
  const [data, setData] = useState<PontoMensal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!colaboradorId) {
      setData([]);
      setError(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await calcPontoMensal(colaboradorId, ano, mes, intervaloAlmocoMin);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [colaboradorId, ano, mes, intervaloAlmocoMin]);

  const totalMinutos = data.reduce((sum, dia) => sum + dia.minutos_liquidos, 0);
  const diasTrabalhados = data.filter(dia => dia.minutos_liquidos > 0).length;

  return {
    data,
    loading,
    error,
    totalMinutos,
    diasTrabalhados,
    refetch: () => {
      if (colaboradorId) {
        setLoading(true);
        setError(null);
        calcPontoMensal(colaboradorId, ano, mes, intervaloAlmocoMin)
          .then(setData)
          .catch(err => setError(err instanceof Error ? err.message : 'Erro desconhecido'))
          .finally(() => setLoading(false));
      }
    }
  };
}

/**
 * Hook para calcular folha diária de um colaborador
 */
export function useFolhaDiaria(
  colaboradorId: string | null,
  diaISO: string,
  intervaloAlmocoMin: number = 60
) {
  const [data, setData] = useState<PontoDiario | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!colaboradorId || !diaISO) {
      setData(null);
      setError(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await calcPontoDiario(colaboradorId, diaISO, intervaloAlmocoMin);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [colaboradorId, diaISO, intervaloAlmocoMin]);

  return {
    data,
    loading,
    error,
    refetch: () => {
      if (colaboradorId && diaISO) {
        setLoading(true);
        setError(null);
        calcPontoDiario(colaboradorId, diaISO, intervaloAlmocoMin)
          .then(setData)
          .catch(err => setError(err instanceof Error ? err.message : 'Erro desconhecido'))
          .finally(() => setLoading(false));
      }
    }
  };
}

/**
 * Hook para calcular total de minutos do mês (usado no Dashboard)
 */
export function useTotalMinutosMes(
  colaboradorId: string | null,
  ano: number,
  mes: number,
  intervaloAlmocoMin: number = 60
) {
  const [totalMinutos, setTotalMinutos] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!colaboradorId) {
      setTotalMinutos(0);
      setError(null);
      return;
    }

    const fetchTotal = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await calcPontoMensal(colaboradorId, ano, mes, intervaloAlmocoMin);
        const total = data.reduce((sum, dia) => sum + dia.minutos_liquidos, 0);
        setTotalMinutos(total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        setTotalMinutos(0);
      } finally {
        setLoading(false);
      }
    };

    fetchTotal();
  }, [colaboradorId, ano, mes, intervaloAlmocoMin]);

  return {
    totalMinutos,
    loading,
    error
  };
}
