import { 
  format, 
  parse, 
  differenceInMinutes, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  getDay,
  isValid
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Ponto, Colaborador } from '../types/pontos'

export interface DailyResult {
  date: string;
  diaSemana: string;
  isWorkDay: boolean;
  expectedIntervals: { start: string; end: string }[];
  actualIntervals: { start: string; end: string }[];
  totalWorkedMinutes: number;
  totalExpectedMinutes: number;
  extrasMinutes: number;
  delaysMinutes: number;
  isAbsence: boolean;
  withinTolerance: boolean;
  points: Ponto[];
}

export interface MonthlySummary {
  totalWorkedMinutes: number;
  totalExpectedMinutes: number;
  totalExtrasMinutes: number;
  totalDelaysMinutes: number;
  totalAbsences: number;
  bankBalanceMinutes: number;
  days: DailyResult[];
}

/**
 * Converte string de horários (ex: "08:00 às 12:00, 13:00 às 17:00") em objetos de intervalo
 */
export function parseSchedule(scheduleStr: string | undefined): { start: string; end: string }[] {
  if (!scheduleStr) return [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:00' }]; // Padrão 8h
  
  try {
    // Tenta extrair pares de horários no formato HH:mm
    const times = scheduleStr.match(/\d{2}:\d{2}/g);
    if (!times || times.length < 2) return [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:00' }];
    
    const intervals = [];
    for (let i = 0; i < times.length; i += 2) {
      if (times[i+1]) {
        intervals.push({ start: times[i], end: times[i+1] });
      }
    }
    return intervals;
  } catch (e) {
    return [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:00' }];
  }
}

/**
 * Verifica se um dia específico é dia de trabalho para o colaborador
 */
export function isDiaTrabalho(date: Date, colaborador: Colaborador): boolean {
  const tipo = colaborador.tipo_escala || 'semanal_fixa';
  
  if (tipo === 'livre') return false; // Livre não gera falta nem atraso por padrão

  const diaSemana = getDay(date); // 0 = Domingo

  if (tipo === 'semanal_fixa') {
    const dias = colaborador.dias_trabalho || [1, 2, 3, 4, 5]; // Padrão Seg-Sex
    return dias.includes(diaSemana);
  }

  if (tipo === 'ciclica') {
    const dtInicio = colaborador.escala_data_inicio;
    const diasTrab = colaborador.escala_dias_trabalho;
    const diasFolga = colaborador.escala_dias_folga;
    
    if (!dtInicio || !diasTrab || !diasFolga) return true; // Falta dado -> assume trabalho para segurança

    const inicio = new Date(dtInicio);
    const diffDias = Math.floor((date.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDias < 0) return true; // Ainda não começou o ciclo

    const ciclo = diasTrab + diasFolga;
    const posicaoNoCiclo = diffDias % ciclo;
    return posicaoNoCiclo < diasTrab;
  }

  return true;
}

/**
 * Formata minutos em string HH:mm
 */
export function formatMinutes(minutes: number): string {
  const sign = minutes < 0 ? '-' : '';
  const absMin = Math.abs(minutes);
  const h = Math.floor(absMin / 60);
  const m = absMin % 60;
  return `${sign}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Calcula a folha de um colaborador para um período (mês)
 */
export function calcularFolhaMensal(
  anoMes: string, // YYYY-MM
  pontos: Ponto[],
  colaborador: Colaborador,
  toleranciaDiaria: number = 10
): MonthlySummary {
  const baseDate = parse(anoMes, 'yyyy-MM', new Date());
  if (!isValid(baseDate)) {
    throw new Error('Data base inválida para o cálculo da folha');
  }

  const start = startOfMonth(baseDate);
  const end = endOfMonth(baseDate);
  const dias = eachDayOfInterval({ start, end });

  const summary: MonthlySummary = {
    totalWorkedMinutes: 0,
    totalExpectedMinutes: 0,
    totalExtrasMinutes: 0,
    totalDelaysMinutes: 0,
    totalAbsences: 0,
    bankBalanceMinutes: 0,
    days: []
  };

  const expectedIntervals = parseSchedule(colaborador.horarios_pactuados);

  for (const dia of dias) {
    const diaStr = format(dia, 'yyyy-MM-dd');
    const isWorkDay = isDiaTrabalho(dia, colaborador);
    
    // Filtrar pontos do dia (ordenados por horário)
    const pontosDia = pontos
      .filter(p => p.created_at.startsWith(diaStr))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));

    let dailyWorkedMinutes = 0;
    const actualPairs: { start: string; end: string }[] = [];
    
    // Pareamento Simples: 1ª batida com 2ª, 3ª com 4ª...
    for (let i = 0; i < pontosDia.length; i += 2) {
      if (pontosDia[i+1]) {
        const t1 = new Date(pontosDia[i].created_at);
        const t2 = new Date(pontosDia[i+1].created_at);
        const diff = differenceInMinutes(t2, t1);
        if (diff > 0) {
          dailyWorkedMinutes += diff;
          actualPairs.push({
            start: format(t1, 'HH:mm'),
            end: format(t2, 'HH:mm')
          });
        }
      }
    }

    let dailyExpectedMinutes = 0;
    if (isWorkDay) {
      expectedIntervals.forEach(curr => {
        const [h1, m1] = curr.start.split(':').map(Number);
        const [h2, m2] = curr.end.split(':').map(Number);
        dailyExpectedMinutes += (h2 * 60 + m2) - (h1 * 60 + m1);
      });
    }

    // --- Lógica de Tolerância CLT ---
    let extras = 0;
    let delays = 0;
    let totalVariation = 0;

    if (isWorkDay) {
      if (pontosDia.length === 0) {
        // Falta integral
        delays = dailyExpectedMinutes;
        summary.totalAbsences++;
      } else {
        // Calcular variações em relação ao pactuado
        // Entrada 1
        const expIn1 = expectedIntervals[0]?.start;
        const actIn1 = actualPairs[0]?.start;
        if (expIn1 && actIn1) {
          const varIn1 = timeToMin(actIn1) - timeToMin(expIn1);
          totalVariation += Math.abs(varIn1);
        }

        // Saída 1 (Almoço ou Final)
        const expOut1 = expectedIntervals[0]?.end;
        const actOut1 = actualPairs[0]?.end;
        if (expOut1 && actOut1) {
          const varOut1 = timeToMin(expOut1) - timeToMin(actOut1); // Positivo = saiu antes (atraso/early exit), Negativo = saiu depois (extra)
          totalVariation += Math.abs(varOut1);
        }

        // Se houver segundo turno (ex: pós almoço)
        if (expectedIntervals.length > 1 && actualPairs.length > 1) {
          const expIn2 = expectedIntervals[1].start;
          const actIn2 = actualPairs[1].start;
          if (expIn2 && actIn2) {
            const varIn2 = timeToMin(actIn2) - timeToMin(expIn2);
            totalVariation += Math.abs(varIn2);
          }

          const expOut2 = expectedIntervals[1].end;
          const actOut2 = actualPairs[1].end;
          if (expOut2 && actOut2) {
            const varOut2 = timeToMin(expOut2) - timeToMin(actOut2);
            totalVariation += Math.abs(varOut2);
          }
        }

        // Se a variação total passar da tolerância (ex: 10 min), apuramos real
        if (totalVariation > toleranciaDiaria) {
          // Diferença bruta entre trabalhado e esperado
          const saldo = dailyWorkedMinutes - dailyExpectedMinutes;
          if (saldo > 0) extras = saldo;
          else if (saldo < 0) delays = Math.abs(saldo);
        }
      }
    } else {
      // Dia de Folga: Tudo que trabalhar é extra
      extras = dailyWorkedMinutes;
    }

    const withinTolerance = isWorkDay && totalVariation <= toleranciaDiaria && pontosDia.length > 0;

    summary.days.push({
      date: diaStr,
      diaSemana: format(dia, 'EEEE', { locale: ptBR }),
      isWorkDay,
      expectedIntervals,
      actualIntervals: actualPairs,
      totalWorkedMinutes: dailyWorkedMinutes,
      totalExpectedMinutes: dailyExpectedMinutes,
      extrasMinutes: extras,
      delaysMinutes: delays,
      isAbsence: isWorkDay && pontosDia.length === 0,
      withinTolerance,
      points: pontosDia
    });

    summary.totalWorkedMinutes += dailyWorkedMinutes;
    summary.totalExpectedMinutes += dailyExpectedMinutes;
    summary.totalExtrasMinutes += extras;
    summary.totalDelaysMinutes += delays;
  }

  summary.bankBalanceMinutes = summary.totalExtrasMinutes - summary.totalDelaysMinutes;

  return summary;
}

/** Helper: Converte HH:mm em minutos totais do dia */
function timeToMin(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}
