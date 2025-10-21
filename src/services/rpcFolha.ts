import { supabase } from '../lib/supabaseClient';

export interface PontoDiario {
  dia: string;
  minutos_brutos: number;
  minutos_desconto_almoco: number;
  minutos_liquidos: number;
  almoco_aplicado: boolean;
  status_dia: string;
  pares: {
    entrada: string;
    saida: string;
    minutos: number;
  }[];
}

export interface PontoMensal {
  dia: string;
  minutos_liquidos: number;
  status_dia: string;
}

/**
 * Calcula ponto diário para um colaborador
 * @param colaboradorId ID do colaborador
 * @param diaISO Data no formato YYYY-MM-DD
 * @param intervaloAlmocoMin Intervalo de almoço em minutos (padrão: 60)
 * @returns Dados do ponto diário
 */
export async function calcPontoDiario(
  colaboradorId: string,
  diaISO: string,
  intervaloAlmocoMin: number = 60
): Promise<PontoDiario> {
  try {
    const { data, error } = await supabase.rpc('calc_ponto_diario', {
      p_colaborador_id: colaboradorId,
      p_dia: diaISO,
      p_intervalo_almoco_min: intervaloAlmocoMin
    });

    if (error) {
      throw new Error(`Erro ao calcular ponto diário: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('Nenhum dado retornado para o ponto diário');
    }

    return data[0];
  } catch (error) {
    console.error('Erro em calcPontoDiario:', error);
    throw new Error('Não foi possível calcular a folha. Tente novamente.');
  }
}

/**
 * Calcula ponto mensal para um colaborador
 * @param colaboradorId ID do colaborador
 * @param ano Ano
 * @param mes Mês (1-12)
 * @param intervaloAlmocoMin Intervalo de almoço em minutos (padrão: 60)
 * @returns Array com dados de cada dia do mês
 */
export async function calcPontoMensal(
  colaboradorId: string,
  ano: number,
  mes: number,
  intervaloAlmocoMin: number = 60
): Promise<PontoMensal[]> {
  try {
    const { data, error } = await supabase.rpc('calc_ponto_mensal', {
      p_colaborador_id: colaboradorId,
      p_ano: ano,
      p_mes: mes,
      p_intervalo_almoco_min: intervaloAlmocoMin
    });

    if (error) {
      throw new Error(`Erro ao calcular ponto mensal: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Erro em calcPontoMensal:', error);
    throw new Error('Não foi possível calcular a folha. Tente novamente.');
  }
}

/**
 * Calcula totais mensais para múltiplos colaboradores
 * @param colaboradorIds Array de IDs dos colaboradores
 * @param ano Ano
 * @param mes Mês (1-12)
 * @param intervaloAlmocoMin Intervalo de almoço em minutos (padrão: 60)
 * @returns Array com totais por colaborador
 */
export async function calcPontoMensalMultiplos(
  colaboradorIds: string[],
  ano: number,
  mes: number,
  intervaloAlmocoMin: number = 60
): Promise<Array<{ colaborador_id: string; total_minutos: number; dias_trabalhados: number }>> {
  try {
    const promises = colaboradorIds.map(async (colaboradorId) => {
      const dados = await calcPontoMensal(colaboradorId, ano, mes, intervaloAlmocoMin);
      const totalMinutos = dados.reduce((sum, dia) => sum + dia.minutos_liquidos, 0);
      const diasTrabalhados = dados.filter(dia => dia.minutos_liquidos > 0).length;
      
      return {
        colaborador_id: colaboradorId,
        total_minutos: totalMinutos,
        dias_trabalhados: diasTrabalhados
      };
    });

    return Promise.all(promises);
  } catch (error) {
    console.error('Erro em calcPontoMensalMultiplos:', error);
    throw new Error('Não foi possível calcular a folha. Tente novamente.');
  }
}

/**
 * Calcula total de minutos trabalhados no mês para um colaborador
 * @param colaboradorId ID do colaborador
 * @param ano Ano
 * @param mes Mês (1-12)
 * @param intervaloAlmocoMin Intervalo de almoço em minutos (padrão: 60)
 * @returns Total de minutos trabalhados
 */
export async function getTotalMinutosMes(
  colaboradorId: string,
  ano: number,
  mes: number,
  intervaloAlmocoMin: number = 60
): Promise<number> {
  try {
    const dados = await calcPontoMensal(colaboradorId, ano, mes, intervaloAlmocoMin);
    return dados.reduce((sum, dia) => sum + dia.minutos_liquidos, 0);
  } catch (error) {
    console.error('Erro em getTotalMinutosMes:', error);
    return 0;
  }
}
