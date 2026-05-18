import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { db } from 'db/client';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { transactions, transactionGroups } from 'db/schema';
import { TransactionStatusEnum, TransactionTypeEnum, FrequencyEnum, GroupTypeEnum } from 'types';



export interface NetWorthPoint {
  label: string;      // "Jan/25"
  income: number;
  expense: number;
  balance: number;    // income - expense acumulado
}

export interface ForecastPoint {
  label: string;
  projected: number;
}

export interface NetWorthData {
  history: NetWorthPoint[];
  forecast: ForecastPoint[];
}

/**
 * Retorna histórico de patrimônio líquido (últimos N meses) e projeção
 * para o mês seguinte baseada nos gastos fixos ainda pendentes.
 *
 * Regra de fixo: transação recorrente mensal OU isSubscription=true.
 *
 * @param months - Quantos meses de histórico retornar
 * @param refYear - Ano de referência (default: ano atual)
 * @param refMonth - Mês de referência 0-based (default: mês atual)
 */
export function useReportsNetWorth(months: number, refYear?: number, refMonth?: number) {
  const [data, setData] = useState<NetWorthData>({ history: [], forecast: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const taskRef = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    setError(null);
    taskRef.current?.cancel();

    taskRef.current = InteractionManager.runAfterInteractions(() => {
      try {
        const now = new Date();
        const baseYear = refYear ?? now.getFullYear();
        const baseMonth = refMonth ?? now.getMonth();

        // Range completo do histórico (months meses até baseMonth)
        const histStart = new Date(baseYear, baseMonth - (months - 1), 1, 0, 0, 0, 0).getTime();
        const histEnd = new Date(baseYear, baseMonth + 1, 0, 23, 59, 59, 999).getTime();

        // 1 query para todo o histórico, agrupada por mês+tipo
        const histRows = db
          .select({
            monthKey: sql<string>`strftime('%Y-%m', ${transactions.date} / 1000, 'unixepoch', 'localtime')`,
            type: transactions.type,
            total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
          })
          .from(transactions)
          .where(
            and(
              gte(transactions.date, histStart),
              lte(transactions.date, histEnd),
              eq(transactions.status, TransactionStatusEnum.Paid),
            ),
          )
          .groupBy(
            sql`strftime('%Y-%m', ${transactions.date} / 1000, 'unixepoch', 'localtime')`,
            transactions.type,
          )
          .all();

        // Montar mapa monthKey → { income, expense }
        const histMap = new Map<string, { income: number; expense: number }>();
        for (const row of histRows) {
          const entry = histMap.get(row.monthKey) ?? { income: 0, expense: 0 };
          if (row.type === TransactionTypeEnum.Income) entry.income = row.total;
          else if (row.type === TransactionTypeEnum.Expense) entry.expense = row.total;
          histMap.set(row.monthKey, entry);
        }

        // Montar histórico na ordem cronológica, acumulando balance
        const history: NetWorthPoint[] = [];
        for (let i = months - 1; i >= 0; i--) {
          const d = new Date(baseYear, baseMonth - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
          const entry = histMap.get(key) ?? { income: 0, expense: 0 };
          const prev = history.length > 0 ? history[history.length - 1].balance : 0;
          history.push({ label, income: entry.income, expense: entry.expense, balance: prev + entry.income - entry.expense });
        }

        // Projeção: gastos fixos pendentes no mês seguinte (1 query)
        const nextMonth = baseMonth + 1;
        const nextYear = nextMonth > 11 ? baseYear + 1 : baseYear;
        const nextMonthNorm = nextMonth > 11 ? 0 : nextMonth;
        const curStart = new Date(nextYear, nextMonthNorm, 1, 0, 0, 0, 0).getTime();
        const curEnd = new Date(nextYear, nextMonthNorm + 1, 0, 23, 59, 59, 999).getTime();

        const fixedRows = db
          .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
          .from(transactions)
          .leftJoin(transactionGroups, eq(transactions.transactionGroupId, transactionGroups.id))
          .where(
            and(
              gte(transactions.date, curStart),
              lte(transactions.date, curEnd),
              eq(transactions.status, TransactionStatusEnum.Pending),
              eq(transactions.type, TransactionTypeEnum.Expense),
              sql`(
                ${transactions.isSubscription} = 1
                OR (
                  ${transactionGroups.type} = ${GroupTypeEnum.Recurring}
                  AND ${transactionGroups.frequency} = ${FrequencyEnum.Monthly}
                )
              )`,
            ),
          )
          .get();

        const projectedFixed = fixedRows?.total ?? 0;
        const lastBalance = history.length > 0 ? history[history.length - 1].balance : 0;
        const nextDate = new Date(nextYear, nextMonthNorm, 1);
        const curLabel = nextDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

        const forecast: ForecastPoint[] = [
          { label: curLabel, projected: lastBalance - projectedFixed },
        ];

        setData({ history, forecast });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao calcular patrimônio líquido');
      } finally {
        setLoading(false);
      }
    });
  }, [months, refYear, refMonth]);

  useEffect(() => {
    fetch();
    return () => taskRef.current?.cancel();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
