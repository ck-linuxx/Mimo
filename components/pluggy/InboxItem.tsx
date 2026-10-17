import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors, useTheme } from 'themes';
import { formatCurrency } from 'utils/formatCurrency';
import type { EnrichedStagingItem } from 'hooks/pluggy/usePluggyInbox';

interface InboxItemProps {
  item: EnrichedStagingItem;
  selectionMode: boolean;
  selected: boolean;
  gridItem?: boolean;
  onToggleSelect: (id: string) => void;
  onImport: (item: EnrichedStagingItem) => void;
  onEditAndImport: (item: EnrichedStagingItem) => void;
  onLink: (item: EnrichedStagingItem) => void;
  onIgnore: (item: EnrichedStagingItem) => void;
  onUndo: (item: EnrichedStagingItem) => void;
  onApplyBankUpdate: (item: EnrichedStagingItem) => void;
}

function InboxItemComponent({
  item,
  selectionMode,
  selected,
  gridItem = false,
  onToggleSelect,
  onImport,
  onEditAndImport,
  onLink,
  onIgnore,
  onUndo,
  onApplyBankUpdate,
}: InboxItemProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const {
    staging,
    bankAccount,
    connection,
    localTargetName,
    hasMappedTarget,
    suggestedCategory,
    bestCandidate,
    candidatesCount,
    isInvoicePayment,
    linkedTransaction,
  } = item;

  const isIncome = staging.type === 'income';
  const dateLabel = new Date(staging.date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const bankLabel = [connection?.connectorName, bankAccount?.name].filter(Boolean).join(' · ') || 'Banco';

  return (
    <TouchableOpacity
      activeOpacity={selectionMode ? 0.7 : 1}
      onPress={selectionMode ? () => onToggleSelect(staging.id) : undefined}
      onLongPress={() => onToggleSelect(staging.id)}
      className="mb-3 justify-between rounded-2xl p-4"
      style={{
        flex: gridItem ? 1 : undefined,
        backgroundColor: colors.cardBackground,
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? colors.primaryGold : colors.borderColor,
      }}>
      <View>
      {/* Cabeçalho: checkbox (opcional), descrição e valor */}
      <View className="flex-row items-start justify-between" style={{ gap: 10 }}>
        {selectionMode && (
          <TouchableOpacity
            onPress={() => onToggleSelect(staging.id)}
            className="mt-0.5 h-6 w-6 items-center justify-center rounded-lg"
            style={{
              backgroundColor: selected ? colors.primaryGold : colors.iconBackground,
              borderWidth: 1,
              borderColor: selected ? colors.primaryGold : colors.borderColor,
            }}>
            {selected && <Feather name="check" size={14} color={colors.primaryGoldContrast} />}
          </TouchableOpacity>
        )}

        <View className="flex-1">
          <Text
            className="text-base font-bold text-light-text-primary dark:text-dark-text-primary"
            numberOfLines={2}>
            {staging.description}
          </Text>
          <Text className="mt-0.5 text-xs text-light-text-secondary dark:text-dark-text-secondary">
            {dateLabel} · {bankLabel}
            {staging.installmentNumber && staging.totalInstallments
              ? ` · Parcela ${staging.installmentNumber}/${staging.totalInstallments}`
              : ''}
          </Text>
        </View>

        <View className="items-end">
          <Text
            className="text-base font-bold"
            style={{ color: isIncome ? colors.incomeColor : colors.expenseColor }}>
            {isIncome ? '+' : '-'}
            {formatCurrency(staging.amount)}
          </Text>
          <Text className="mt-0.5 text-[11px] text-light-text-secondary dark:text-dark-text-secondary">
            {staging.externalStatus === 'PENDING' ? 'Pendente no banco' : 'Paga'}
          </Text>
        </View>
      </View>

      {/* Chips de contexto: destino, categoria sugerida */}
      <View className="mt-2.5 flex-row flex-wrap items-center" style={{ gap: 6 }}>
        <View
          className="flex-row items-center rounded-full px-2.5 py-1"
          style={{
            backgroundColor: hasMappedTarget
              ? colors.iconBackground
              : colors.expenseColor + '20',
            gap: 4,
          }}>
          <Feather
            name={bankAccount?.type === 'CREDIT' ? 'credit-card' : 'briefcase'}
            size={11}
            color={hasMappedTarget ? colors.textSecondary : colors.expenseColor}
          />
          <Text
            className="text-[11px] font-semibold"
            style={{ color: hasMappedTarget ? colors.textSecondary : colors.expenseColor }}>
            {localTargetName ?? 'Sem conta/cartão de destino'}
          </Text>
        </View>

        {suggestedCategory && (
          <View
            className="flex-row items-center rounded-full px-2.5 py-1"
            style={{ backgroundColor: (suggestedCategory.color ?? colors.primaryGold) + '20', gap: 4 }}>
            <Feather
              name={(suggestedCategory.icon ?? 'tag') as any}
              size={11}
              color={suggestedCategory.color ?? colors.primaryGold}
            />
            <Text
              className="text-[11px] font-semibold"
              style={{ color: suggestedCategory.color ?? colors.primaryGold }}>
              {suggestedCategory.name}
            </Text>
          </View>
        )}
      </View>

      {/* Alertas: pagamento de fatura / sugestão de vínculo / mudança no banco */}
      {isInvoicePayment && staging.reviewStatus === 'pending' && (
        <View
          className="mt-2.5 flex-row items-center rounded-xl px-3 py-2"
          style={{ backgroundColor: colors.expenseColor + '18', gap: 8 }}>
          <Feather name="alert-triangle" size={14} color={colors.expenseColor} />
          <Text className="flex-1 text-xs" style={{ color: colors.expenseColor }}>
            Pagamento de fatura — provável duplicidade se você já importa as compras do cartão.
            Recomendado ignorar.
          </Text>
        </View>
      )}

      {bestCandidate && staging.reviewStatus === 'pending' && (
        <TouchableOpacity
          onPress={() => onLink(item)}
          activeOpacity={0.8}
          className="mt-2.5 flex-row items-center rounded-xl px-3 py-2"
          style={{ backgroundColor: colors.primaryGold + '22', gap: 8 }}>
          <Feather name="link-2" size={14} color={colors.primaryGold} />
          <Text className="flex-1 text-xs font-semibold text-light-text-primary dark:text-dark-text-primary">
            Parece com: &ldquo;{bestCandidate.transaction.description}&rdquo; (
            {new Date(bestCandidate.transaction.date).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
            })}
            ){candidatesCount > 1 ? ` +${candidatesCount - 1}` : ''}
          </Text>
          <Text className="text-xs font-bold" style={{ color: colors.primaryGold }}>
            Vincular
          </Text>
        </TouchableOpacity>
      )}

      {staging.bankChangedAt != null && (staging.reviewStatus === 'imported' || staging.reviewStatus === 'linked') && (
        <View
          className="mt-2.5 flex-row items-center justify-between rounded-xl px-3 py-2"
          style={{ backgroundColor: colors.primaryGold + '22', gap: 8 }}>
          <View className="flex-1 flex-row items-center" style={{ gap: 6 }}>
            <Feather name="refresh-cw" size={13} color={colors.primaryGold} />
            <Text className="flex-1 text-xs text-light-text-primary dark:text-dark-text-primary">
              Atualizada no banco ({formatCurrency(staging.amount)} ·{' '}
              {staging.externalStatus === 'PENDING' ? 'Pendente' : 'Paga'})
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => onApplyBankUpdate(item)}
            className="rounded-lg px-2.5 py-1"
            style={{ backgroundColor: colors.primaryGold }}>
            <Text
              className="text-xs font-bold"
              style={{ color: colors.primaryGoldContrast }}>
              Aplicar
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {linkedTransaction && (staging.reviewStatus === 'imported' || staging.reviewStatus === 'linked') && (
        <Text className="mt-2 text-xs text-light-text-secondary dark:text-dark-text-secondary">
          {staging.reviewStatus === 'linked' ? 'Vinculada a: ' : 'Importada como: '}
          <Text className="font-semibold text-light-text-primary dark:text-dark-text-primary">
            {linkedTransaction.description}
          </Text>
        </Text>
      )}
      </View>

      {/* Ações */}
      {staging.reviewStatus === 'pending' ? (
        <View className="mt-3 flex-row items-center justify-between" style={{ gap: 8 }}>
          <TouchableOpacity
            onPress={() => onImport(item)}
            activeOpacity={0.8}
            className="flex-1 flex-row items-center justify-center rounded-xl py-2.5"
            style={{ backgroundColor: colors.primaryGold, gap: 6 }}>
            <Feather name="check" size={14} color={colors.primaryGoldContrast} />
            <Text
              className="text-xs font-bold"
              style={{ color: colors.primaryGoldContrast }}>
              Importar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onEditAndImport(item)}
            activeOpacity={0.8}
            className="flex-row items-center justify-center rounded-xl px-3 py-2.5"
            style={{ backgroundColor: colors.iconBackground, gap: 5 }}>
            <Feather name="edit-2" size={13} color={colors.textPrimary} />
            <Text className="text-xs font-semibold text-light-text-primary dark:text-dark-text-primary">
              Editar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onLink(item)}
            activeOpacity={0.8}
            className="flex-row items-center justify-center rounded-xl px-3 py-2.5"
            style={{ backgroundColor: colors.iconBackground, gap: 5 }}>
            <Feather name="link-2" size={13} color={colors.textPrimary} />
            <Text className="text-xs font-semibold text-light-text-primary dark:text-dark-text-primary">
              Vincular
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onIgnore(item)}
            activeOpacity={0.8}
            className="items-center justify-center rounded-xl px-2.5 py-2.5"
            style={{ backgroundColor: colors.iconBackground }}
            accessibilityLabel="Ignorar transação">
            <Feather name="eye-off" size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      ) : (
        <View className="mt-3 flex-row items-center justify-end">
          <TouchableOpacity
            onPress={() => onUndo(item)}
            activeOpacity={0.8}
            className="flex-row items-center rounded-xl px-3 py-2"
            style={{ backgroundColor: colors.iconBackground, gap: 6 }}>
            <Feather name="rotate-ccw" size={13} color={colors.textPrimary} />
            <Text className="text-xs font-semibold text-light-text-primary dark:text-dark-text-primary">
              Desfazer ({staging.reviewStatus === 'ignored' ? 'voltar p/ pendentes' : 'reverter'})
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

export const InboxItem = React.memo(InboxItemComponent);


