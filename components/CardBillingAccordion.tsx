import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Accordion } from 'components/Accordion';
import { TransactionItem } from 'components/TransactionItem';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { formatCurrency } from 'utils/formatCurrency';
import type { CardBillingGroup } from 'hooks/useTransactions';
import type { TransactionWithCategory } from 'types/transactionView';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTH_NAMES_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const MONTH_NAMES_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface DayGroup {
  key: string;
  dateFormatted: string;
  transactions: TransactionWithCategory[];
}

function groupByDay(txs: TransactionWithCategory[]): DayGroup[] {
  const map = new Map<string, TransactionWithCategory[]>();
  for (const tx of txs) {
    const d = new Date(tx.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(tx);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, items]) => {
      const d = new Date(items[0].date);
      const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      return {
        key,
        dateFormatted: `${weekdays[d.getDay()]}, ${d.getDate()} de ${MONTH_NAMES_FULL[d.getMonth()]}`,
        transactions: items,
      };
    });
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface CardBillingAccordionProps {
  group: CardBillingGroup;
  currentMonth: number;  // 0-indexed
  currentYear: number;
  onStatusChanged: () => void;
  askForReceipt: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CardBillingAccordion({
  group,
  currentMonth,
  currentYear,
  onStatusChanged,
  askForReceipt,
}: CardBillingAccordionProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  // Subtítulo: "Fatura Set/26"
  const subtitleYear = String(currentYear).slice(2);
  const subtitle = `Fatura ${MONTH_NAMES_SHORT[currentMonth]}/${subtitleYear}`;

  // Mês seguinte para o aviso informativo
  const nextMonthIdx = currentMonth === 11 ? 0 : currentMonth + 1;
  const nextMonthName = MONTH_NAMES_FULL[nextMonthIdx];

  const dayGroups = groupByDay(group.transactions);

  return (
    <Accordion
      title={group.cardName}
      subtitle={subtitle}
      accentColor={group.cardColor ?? undefined}
      icon="credit-card"
    >
      {/* Aviso: mês de débito */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderTopWidth: 1,
          borderTopColor: colors.borderColor,
        }}
      >
        <Feather name="info" size={13} color={colors.textSecondary} />
        <Text
          className="text-xs text-light-text-secondary dark:text-dark-text-secondary"
          style={{ flex: 1 }}
        >
          Compras realizadas em meses anteriores — débito em {nextMonthName}
        </Text>
      </View>

      {/* Transações agrupadas por data de compra */}
      {dayGroups.map((dayGroup) => (
        <View key={dayGroup.key}>
          {/* Sub-header do dia */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: colors.background + 'cc',
              borderTopWidth: 1,
              borderTopColor: colors.borderColor,
            }}
          >
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 12,
                fontWeight: '600',
              }}
            >
              {dayGroup.dateFormatted}
            </Text>
          </View>

          {dayGroup.transactions.map((tx) => (
            <TransactionItem
              key={tx.id}
              transaction={tx}
              variant="simple"
              askForReceipt={askForReceipt}
              onStatusChanged={onStatusChanged}
            />
          ))}
        </View>
      ))}

      {/* Rodapé: total da fatura */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderTopWidth: 1,
          borderTopColor: colors.borderColor,
        }}
      >
        <Text
          style={{
            color: colors.textPrimary,
            fontWeight: '600',
            fontSize: 14,
          }}
        >
          Total da fatura
        </Text>
        <Text
          style={{
            color: colors.expenseColor,
            fontWeight: '700',
            fontSize: 16,
          }}
        >
          -{formatCurrency(group.total)}
        </Text>
      </View>
    </Accordion>
  );
}
