/**
 * Calcula a data de vencimento da fatura de cartão de crédito a partir da
 * data da compra e do dia de fechamento do cartão.
 *
 * Regras:
 * - `purchaseDate.getDate() < closingDay` → dueDate = closingDay do mesmo mês
 * - `purchaseDate.getDate() >= closingDay` → dueDate = closingDay do mês seguinte
 * - Overflow de dias (ex: closingDay=31 em fevereiro) → usa o último dia do mês alvo
 * - `closingDay` null/undefined → dueDate = purchaseDate.getTime() (sem cartão)
 *
 * @param purchaseDate - Data real da compra
 * @param closingDay - Dia de fechamento da fatura (1–31), ou null/undefined
 * @returns Timestamp em milissegundos do início do dia de vencimento
 */
export function computeCardDueDate(
  purchaseDate: Date,
  closingDay: number | null | undefined,
): number {
  if (closingDay == null) {
    return purchaseDate.getTime();
  }

  const purchaseDay = purchaseDate.getDate();

  let targetYear = purchaseDate.getFullYear();
  let targetMonth = purchaseDate.getMonth(); // 0-indexed

  if (purchaseDay >= closingDay) {
    // Compra no dia do fechamento ou depois → próxima fatura (mês seguinte)
    targetMonth += 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
  }
  // else: compra antes do fechamento → fatura do mesmo mês

  // Tratar overflow: ex closingDay=31 em fevereiro (28 dias)
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const effectiveDay = Math.min(closingDay, daysInTargetMonth);

  return new Date(targetYear, targetMonth, effectiveDay, 0, 0, 0, 0).getTime();
}
