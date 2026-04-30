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
  let endY: number, endM: number;

  if (d < closingDay) {
    // Antes do fechamento deste mês → ciclo veio do mês anterior
    if (m === 0) { startY = y - 1; startM = 11; }
    else { startY = y; startM = m - 1; }
    endY = y; endM = m;
  } else {
    // Já passamos do fechamento → novo ciclo começou neste mês
    startY = y; startM = m;
    if (m === 11) { endY = y + 1; endM = 0; }
    else { endY = y; endM = m + 1; }
  }

  // Trata overflow do dia (ex: dia 31 em fevereiro)
  const effectiveStartDay = Math.min(
    closingDay,
    new Date(startY, startM + 1, 0).getDate(),
  );
  const effectiveEndDay = Math.min(
    closingDay,
    new Date(endY, endM + 1, 0).getDate(),
  );

  const startTs = new Date(startY, startM, effectiveStartDay, 0, 0, 0, 0).getTime();
  const endTs   = new Date(endY, endM, effectiveEndDay, 23, 59, 59, 999).getTime();
  const isClosed = now.getTime() > endTs;

  const label = `${effectiveStartDay} ${MONTH_SHORT[startM]} – ${effectiveEndDay} ${MONTH_SHORT[endM]}`;

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
