import React from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors, useTheme } from 'themes';
import { useBreakpoint } from 'hooks/useBreakpoint';
import type { BankAccount, PluggyReviewStatus } from 'db/schema';
import type { InboxCounts, InboxFiltersState } from 'hooks/pluggy/usePluggyInbox';

interface InboxFiltersProps {
  filters: InboxFiltersState;
  counts: InboxCounts;
  bankAccounts: BankAccount[];
  onChange: (next: InboxFiltersState) => void;
}

const STATUS_TABS: Array<{ key: PluggyReviewStatus; label: string }> = [
  { key: 'pending', label: 'Pendentes' },
  { key: 'imported', label: 'Importadas' },
  { key: 'linked', label: 'Vinculadas' },
  { key: 'ignored', label: 'Ignoradas' },
];

export function InboxFilters({ filters, counts, bankAccounts, onChange }: InboxFiltersProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const { isNotebookMode } = useBreakpoint();

  const renderStatusTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={isNotebookMode ? { flexGrow: 0 } : undefined}
      contentContainerStyle={{ gap: 8, paddingBottom: isNotebookMode ? 0 : 10 }}>
      {STATUS_TABS.map((tab) => {
        const active = filters.status === tab.key;
        const count = counts[tab.key] ?? 0;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onChange({ ...filters, status: tab.key, conflictFilter: 'all' })}
            activeOpacity={0.8}
            className="flex-row items-center rounded-full px-3.5 py-2"
            style={{
              backgroundColor: active ? colors.primaryGold : colors.cardBackground,
              borderWidth: 1,
              borderColor: active ? colors.primaryGold : colors.borderColor,
              gap: 6,
            }}>
            <Text
              className="text-xs font-bold"
              style={{ color: active ? colors.primaryGoldContrast : colors.textPrimary }}>
              {tab.label}
            </Text>
            <View
              className="rounded-full px-1.5 py-0.5"
              style={{
                backgroundColor: active
                  ? 'rgba(0,0,0,0.18)'
                  : colors.iconBackground,
              }}>
              <Text
                className="text-[11px] font-bold"
                style={{ color: active ? colors.primaryGoldContrast : colors.textSecondary }}>
                {count}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderSearchBar = () => (
    <View
      className="flex-row items-center rounded-xl px-3 py-2"
      style={{
        flex: isNotebookMode ? 1 : undefined,
        backgroundColor: colors.cardBackground,
        borderWidth: 1,
        borderColor: colors.borderColor,
        gap: 8,
      }}>
      <Feather name="search" size={16} color={colors.textSecondary} />
      <TextInput
        value={filters.search}
        onChangeText={(text) => onChange({ ...filters, search: text })}
        placeholder="Buscar por descrição, banco ou valor..."
        placeholderTextColor={colors.textSecondary}
        style={{ flex: 1, color: colors.textPrimary, fontSize: 14, paddingVertical: 2 }}
      />
      {filters.search.length > 0 && (
        <TouchableOpacity onPress={() => onChange({ ...filters, search: '' })} hitSlop={8}>
          <Feather name="x" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={{ paddingHorizontal: isNotebookMode ? 24 : 20, paddingBottom: 12 }}>
      {isNotebookMode ? (
        <View className="mb-2.5 flex-row items-center" style={{ gap: 12 }}>
          {renderStatusTabs()}
          {renderSearchBar()}
        </View>
      ) : (
        renderStatusTabs()
      )}

      {/* Subfiltro de Conflitos (somente na aba Pendentes quando houver itens) */}
      {filters.status === 'pending' && counts.pending > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
          <TouchableOpacity
            onPress={() => onChange({ ...filters, conflictFilter: 'all' })}
            activeOpacity={0.8}
            className="flex-row items-center rounded-xl px-3 py-1.5"
            style={{
              backgroundColor:
                filters.conflictFilter === 'all'
                  ? colors.primaryGold + '25'
                  : colors.cardBackground,
              borderWidth: 1,
              borderColor:
                filters.conflictFilter === 'all'
                  ? colors.primaryGold
                  : colors.borderColor,
            }}>
            <Text
              className="text-xs font-semibold"
              style={{
                color:
                  filters.conflictFilter === 'all'
                    ? colors.primaryGold
                    : colors.textSecondary,
              }}>
              Todas ({counts.pending})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onChange({ ...filters, conflictFilter: 'without_conflict' })}
            activeOpacity={0.8}
            className="flex-row items-center rounded-xl px-3 py-1.5"
            style={{
              backgroundColor:
                filters.conflictFilter === 'without_conflict'
                  ? colors.incomeColor + '20'
                  : colors.cardBackground,
              borderWidth: 1,
              borderColor:
                filters.conflictFilter === 'without_conflict'
                  ? colors.incomeColor
                  : colors.borderColor,
              gap: 5,
            }}>
            <Feather
              name="check-circle"
              size={13}
              color={
                filters.conflictFilter === 'without_conflict'
                  ? colors.incomeColor
                  : colors.textSecondary
              }
            />
            <Text
              className="text-xs font-semibold"
              style={{
                color:
                  filters.conflictFilter === 'without_conflict'
                    ? colors.incomeColor
                    : colors.textSecondary,
              }}>
              Sem conflito ({counts.pendingConflictFree ?? 0})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onChange({ ...filters, conflictFilter: 'with_conflict' })}
            activeOpacity={0.8}
            className="flex-row items-center rounded-xl px-3 py-1.5"
            style={{
              backgroundColor:
                filters.conflictFilter === 'with_conflict'
                  ? colors.expenseColor + '20'
                  : colors.cardBackground,
              borderWidth: 1,
              borderColor:
                filters.conflictFilter === 'with_conflict'
                  ? colors.expenseColor
                  : colors.borderColor,
              gap: 5,
            }}>
            <Feather
              name="alert-triangle"
              size={13}
              color={
                filters.conflictFilter === 'with_conflict'
                  ? colors.expenseColor
                  : colors.textSecondary
              }
            />
            <Text
              className="text-xs font-semibold"
              style={{
                color:
                  filters.conflictFilter === 'with_conflict'
                    ? colors.expenseColor
                    : colors.textSecondary,
              }}>
              Com conflito ({counts.pendingConflicts ?? 0})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Filtro por conta bancária (se houver mais de 1) */}
      {bankAccounts.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
          <TouchableOpacity
            onPress={() => onChange({ ...filters, bankAccountId: null })}
            className="rounded-xl px-3 py-1.5"
            style={{
              backgroundColor:
                filters.bankAccountId === null ? colors.primaryGold + '25' : colors.cardBackground,
              borderWidth: 1,
              borderColor:
                filters.bankAccountId === null ? colors.primaryGold : colors.borderColor,
            }}>
            <Text
              className="text-xs font-semibold"
              style={{
                color: filters.bankAccountId === null ? colors.primaryGold : colors.textSecondary,
              }}>
              Todas as contas
            </Text>
          </TouchableOpacity>
          {bankAccounts.map((acc) => {
            const selected = filters.bankAccountId === acc.id;
            return (
              <TouchableOpacity
                key={acc.id}
                onPress={() =>
                  onChange({ ...filters, bankAccountId: selected ? null : acc.id })
                }
                className="rounded-xl px-3 py-1.5"
                style={{
                  backgroundColor: selected ? colors.primaryGold + '25' : colors.cardBackground,
                  borderWidth: 1,
                  borderColor: selected ? colors.primaryGold : colors.borderColor,
                }}>
                <Text
                  className="text-xs font-semibold"
                  style={{ color: selected ? colors.primaryGold : colors.textSecondary }}>
                  {acc.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Busca (em modo retrato/celular) */}
      {!isNotebookMode && renderSearchBar()}
    </View>
  );
}
