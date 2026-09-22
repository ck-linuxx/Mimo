// ─── Nomes de meses ───────────────────────────────────────────────────────────

export const MONTH_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
] as const;

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const;

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface BillingCycle {
  /** Timestamp de início do ciclo (inclusive, meia-noite) */
  startTs: number;
  /** Timestamp de fim do ciclo (inclusive, 23:59:59.999) */
  endTs: number;
  /** Rótulo legível: "10 Mar – 10 Abr" */
  label: string;
  /** true quando hoje já ultrapassou o endTs do ciclo */
  isClosed: boolean;
}

// ─── Ciclo atual ──────────────────────────────────────────────────────────────

/**
 * Calcula o ciclo de fatura atual para o dia de fechamento informado.
 *
 * Regra:
 * - `today.date < closingDay`  → ciclo começou no mês anterior
 * - `today.date >= closingDay` → ciclo começou neste mês
 *
 * Retorna `null` quando `closingDay` é null/undefined.
 */
export function getCurrentBillingCycle(
  closingDay: number | null | undefined,
  now: Date = new Date(),
): BillingCycle | null {
  if (!closingDay) return null;

  const d = now.getDate();
  const m = now.getMonth(); // 0-based
  const y = now.getFullYear();

  let startY: number, startM: number;
  let nextCycleY: number, nextCycleM: number;

  if (d < closingDay) {
    // Antes do fechamento deste mês → ciclo começou no mês anterior
    if (m === 0) { startY = y - 1; startM = 11; }
    else { startY = y; startM = m - 1; }
    nextCycleY = y; nextCycleM = m;
  } else {
    // Já passamos do fechamento → novo ciclo começou neste mês
    startY = y; startM = m;
    if (m === 11) { nextCycleY = y + 1; nextCycleM = 0; }
    else { nextCycleY = y; nextCycleM = m + 1; }
  }

  // Trata overflow do dia no início do ciclo (ex: dia 31 em fevereiro)
  const effectiveStartDay = Math.min(
    closingDay,
    new Date(startY, startM + 1, 0).getDate(),
  );

  // Início do ciclo: dia de fechamento às 00:00:00.000
  const startDate = new Date(startY, startM, effectiveStartDay, 0, 0, 0, 0);

  // Início do PRÓXIMO ciclo
  const effectiveNextDay = Math.min(
    closingDay,
    new Date(nextCycleY, nextCycleM + 1, 0).getDate(),
  );
  const nextCycleStartDate = new Date(nextCycleY, nextCycleM, effectiveNextDay, 0, 0, 0, 0);

  // Fim do ciclo atual: 1ms antes do próximo ciclo (ou seja, 23:59:59.999 do dia anterior)
  const endDate = new Date(nextCycleStartDate.getTime() - 1);

  const startTs = startDate.getTime();
  const endTs = endDate.getTime();
  const isClosed = now.getTime() > endTs;

  // Formata o label com a data real de término (ex: "06 Ago – 05 Set")
  const label = `${startDate.getDate()} ${MONTH_SHORT[startDate.getMonth()]} – ${endDate.getDate()} ${MONTH_SHORT[endDate.getMonth()]}`;

  return { startTs, endTs, label, isClosed };
}

// ─── Helpers para charts ──────────────────────────────────────────────────────

/**
 * Gera array de { year, month (0-based), label } para os últimos N meses,
 * do mais antigo para o mais recente.
 */
export function getLastNMonths(
  n: number,
  now: Date = new Date(),
): Array<{ year: number; month: number; label: string }> {
  const result: Array<{ year: number; month: number; label: string }> = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: `${MONTH_SHORT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
    });
  }
  return result;
}

/** Timestamp de início do mês corrente menos N meses (para query de range). */
export function getMonthsAgoStartTs(months: number, now: Date = new Date()): number {
  return new Date(now.getFullYear(), now.getMonth() - months + 1, 1, 0, 0, 0, 0).getTime();
}

/** Timestamp do final do mês corrente. */
export function getCurrentMonthEndTs(now: Date = new Date()): number {
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
}
