/**
 * Utilitários para formatação e manipulação de tempo
 */

/**
 * Converte minutos para formato hh:mm
 * @param min Número de minutos (pode ser > 1440 para mais de 24h)
 * @returns String formatada como "hh:mm" (ex: "08:30", "25:45")
 */
export function minutesToHHMM(min: number): string {
  if (min < 0) return "00:00";
  
  const hours = Math.floor(min / 60);
  const minutes = Math.floor(min % 60);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Converte Date para string ISO (YYYY-MM-DD)
 * @param d Data a ser convertida
 * @returns String no formato YYYY-MM-DD
 */
export function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

/**
 * Retorna ano e mês atuais no fuso local
 * @returns Objeto com {ano: number, mes: number}
 */
export function currentYearMonthLocal(): { ano: number; mes: number } {
  const now = new Date();
  return {
    ano: now.getFullYear(),
    mes: now.getMonth() + 1 // getMonth() retorna 0-11, queremos 1-12
  };
}

/**
 * Converte string ISO (YYYY-MM-DD) para Date
 * @param isoDate String no formato YYYY-MM-DD
 * @returns Date object
 */
export function fromISODate(isoDate: string): Date {
  return new Date(isoDate + 'T00:00:00');
}

/**
 * Retorna o primeiro dia do mês
 * @param ano Ano
 * @param mes Mês (1-12)
 * @returns Date do primeiro dia do mês
 */
export function getFirstDayOfMonth(ano: number, mes: number): Date {
  return new Date(ano, mes - 1, 1);
}

/**
 * Retorna o último dia do mês
 * @param ano Ano
 * @param mes Mês (1-12)
 * @returns Date do último dia do mês
 */
export function getLastDayOfMonth(ano: number, mes: number): Date {
  return new Date(ano, mes, 0);
}

/**
 * Retorna array de dias do mês
 * @param ano Ano
 * @param mes Mês (1-12)
 * @returns Array de Date objects para cada dia do mês
 */
export function getDaysOfMonth(ano: number, mes: number): Date[] {
  const days: Date[] = [];
  const firstDay = getFirstDayOfMonth(ano, mes);
  const lastDay = getLastDayOfMonth(ano, mes);
  
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  
  return days;
}

/**
 * Formata data para exibição (DD/MM/YYYY)
 * @param date Data ou string ISO
 * @returns String formatada
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? fromISODate(date) : date;
  return d.toLocaleDateString('pt-BR');
}

/**
 * Formata data e hora para exibição (DD/MM/YYYY HH:mm)
 * @param date Data
 * @returns String formatada
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('pt-BR');
}
