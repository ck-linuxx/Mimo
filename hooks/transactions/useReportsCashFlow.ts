import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { db } from 'db/client';
import { and, eq, gte, isNotNull, isNull, lte, ne, or, sql } from 'drizzle-orm';
import { categories, transactions } from 'db/schema';
import { TransactionStatusEnum, TransactionTypeEnum } from 'types';



export interface SankeyNode {
  name: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface CashFlowData {
  nodes: SankeyNode[];
  links: SankeyLink[];
  totalIncome: number;
  totalExpense: number;
}

/**
 * Agrega fluxo de caixa para o Sankey Chart:
 * Nós: "Receitas" → categorias de despesa (top 8 + "Outros").
 * Inclui apenas transações com status=paid no período informado.
 */
export function useReportsCashFlow(year: number, month: number) {
  const [data, setData] = useState<CashFlowData>({ nodes: [], links: [], totalIncome: 0, totalExpense: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const taskRef = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    setError(null);
    taskRef.current?.cancel();

    taskRef.current = InteractionManager.runAfterInteractions(() => {
      try {
      const start = new Date(year, month, 1, 0, 0, 0, 0).getTime();
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
      const baseWhere = and(
        ne(transactions.status, TransactionStatusEnum.Cancelled),
        or(
          and(isNull(transactions.cardId), gte(transactions.date, start), lte(transactions.date, end)),
          and(isNotNull(transactions.cardId), gte(transactions.dueDate, start), lte(transactions.dueDate, end)),
        ),
      );

      // Total de receitas
      const incomeRow = db
        .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
        .from(transactions)
        .where(and(baseWhere, eq(transactions.type, TransactionTypeEnum.Income)))
        .get();
      const totalIncome = incomeRow?.total ?? 0;

      // Despesas agrupadas por categoria (top 8)
      const expenseRows = db
        .select({
          categoryName: sql<string>`COALESCE(${categories.name}, 'Sem categoria')`,
          total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(and(baseWhere, eq(transactions.type, TransactionTypeEnum.Expense)))
        .groupBy(transactions.categoryId)
        .orderBy(sql`SUM(${transactions.amount}) DESC`)
        .limit(8)
        .all();

      const totalExpense = expenseRows.reduce((acc, r) => acc + r.total, 0);

      // Receita não alocada (diferença positiva) — fluxo para "Saldo"
      const saldoValue = Math.max(0, totalIncome - totalExpense);

      const nodes: SankeyNode[] = [{ name: 'Receitas' }];
      const links: SankeyLink[] = [];

      for (const row of expenseRows) {
        nodes.push({ name: row.categoryName });
        links.push({ source: 'Receitas', target: row.categoryName, value: row.total });
      }

      if (saldoValue > 0) {
        nodes.push({ name: 'Saldo' });
        links.push({ source: 'Receitas', target: 'Saldo', value: saldoValue });
      }

      setData({ nodes, links, totalIncome, totalExpense });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao buscar fluxo de caixa');
      } finally {
        setLoading(false);
      }
    });
  }, [year, month]);

  useEffect(() => {
    fetch();
    return () => taskRef.current?.cancel();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
