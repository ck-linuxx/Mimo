import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors, useTheme } from 'themes';
import { formatCurrency } from 'utils/formatCurrency';
import {
  findMatchCandidates,
  searchManualLinkTargets,
  type MatchCandidate,
} from 'services/pluggy/matching';
import type { EnrichedStagingItem } from 'hooks/pluggy/usePluggyInbox';

interface MatchCandidatesModalProps {
  visible: boolean;
  item: EnrichedStagingItem | null;
  onSelectTarget: (stagingId: string, targetTransactionId: string) => void;
  onClose: () => void;
}

export function MatchCandidatesModal({
  visible,
  item,
  onSelectTarget,
  onClose,
}: MatchCandidatesModalProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const [query, setQuery] = useState('');

  const suggested = useMemo(() => {
    if (!item) return [];
    return findMatchCandidates(item.staging, item.bankAccount);
  }, [item]);

  const manualResults = useMemo(() => {
    if (!item) return [];
    if (!query.trim() && suggested.length > 0) return [];
    const suggestedIds = new Set(suggested.map((s) => s.transaction.id));
    return searchManualLinkTargets(item.staging, query).filter(
      (c) => !suggestedIds.has(c.transaction.id)
    );
  }, [item, query, suggested]);

  const renderCandidate = (c: MatchCandidate, highlight: boolean) => {
    const tx = c.transaction;
    const isIncome = tx.type === 'income';
    const dateStr = new Date(tx.date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    return (
      <TouchableOpacity
        key={tx.id}
        onPress={() => {
          if (!item) return;
          onSelectTarget(item.staging.id, tx.id);
          onClose();
        }}
        activeOpacity={0.75}
        className="mb-2.5 flex-row items-center justify-between rounded-2xl p-3.5"
        style={{
          backgroundColor: highlight ? colors.primaryGold + '18' : colors.iconBackground,
          borderWidth: 1,
          borderColor: highlight ? colors.primaryGold : colors.borderColor,
        }}>
        <View className="mr-3 flex-1">
          <Text
            className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary"
            numberOfLines={1}>
            {tx.description}
          </Text>
          <Text className="mt-0.5 text-xs text-light-text-secondary dark:text-dark-text-secondary">
            {dateStr}
            {c.categoryName ? ` · ${c.categoryName}` : ''}
            {c.dayDiff === 0
              ? ' · Mesma data'
              : ` · ${c.dayDiff} dia(s) de diferença`}
          </Text>
        </View>
        <View className="items-end">
          <Text
            className="text-sm font-bold"
            style={{ color: isIncome ? colors.incomeColor : colors.expenseColor }}>
            {isIncome ? '+' : '-'}
            {formatCurrency(tx.amount)}
          </Text>
          <Text className="mt-0.5 text-[11px] font-semibold" style={{ color: colors.primaryGold }}>
            Vincular
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />
        <View
          className="max-h-[82%] rounded-t-3xl p-5"
          style={{ backgroundColor: colors.cardBackground }}>
          <View className="mb-3 flex-row items-center justify-between">
            <View className="mr-3 flex-1">
              <Text className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">
                Vincular a transação existente
              </Text>
              {item && (
                <Text
                  className="text-xs text-light-text-secondary dark:text-dark-text-secondary"
                  numberOfLines={1}>
                  Banco: {item.staging.description} ({formatCurrency(item.staging.amount)})
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: colors.iconBackground }}>
              <Feather name="x" size={16} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text className="mb-3 text-xs leading-4 text-light-text-secondary dark:text-dark-text-secondary">
            O vínculo preserva a categoria, notas, descrição e comprovantes que você já cadastrou na
            transação principal.
          </Text>

          {/* Busca manual */}
          <View
            className="mb-3 flex-row items-center rounded-xl px-3 py-2"
            style={{
              backgroundColor: colors.iconBackground,
              borderWidth: 1,
              borderColor: colors.borderColor,
              gap: 8,
            }}>
            <Feather name="search" size={15} color={colors.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar outra transação por descrição ou valor..."
              placeholderTextColor={colors.textSecondary}
              style={{ flex: 1, color: colors.textPrimary, fontSize: 14, paddingVertical: 2 }}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Feather name="x" size={15} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {suggested.length > 0 && (
              <>
                <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">
                  Sugestões compatíveis (mesmo valor e data próxima)
                </Text>
                {suggested.map((c) => renderCandidate(c, true))}
              </>
            )}

            {manualResults.length > 0 && (
              <>
                <Text className="mb-2 mt-2 text-xs font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">
                  Outras transações disponíveis
                </Text>
                {manualResults.map((c) => renderCandidate(c, false))}
              </>
            )}

            {suggested.length === 0 && manualResults.length === 0 && (
              <View className="items-center py-8">
                <Text className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  Nenhuma transação sem vínculo encontrada.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

