import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { darkColors, lightColors, useTheme } from 'themes';
import { useBreakpoint } from 'hooks/useBreakpoint';
import { useCustomAlert } from 'hooks/useCustomAlert';
import { usePluggyInbox, type EnrichedStagingItem } from 'hooks/pluggy/usePluggyInbox';
import { usePluggyReview } from 'hooks/pluggy/usePluggyReview';
import { usePluggySync } from 'hooks/pluggy/usePluggySync';
import { ScreenWrapper } from 'components/ScreenWrapper';
import { ActionButton } from 'components/ActionButton';
import { CustomAlert } from 'components/CustomAlert';
import { InboxFilters } from 'components/pluggy/InboxFilters';
import { InboxItem } from 'components/pluggy/InboxItem';
import { ImportEditModal } from 'components/pluggy/ImportEditModal';
import { MatchCandidatesModal } from 'components/pluggy/MatchCandidatesModal';
import type { StagingImportOverrides } from 'services/pluggy/mappers';

export default function PluggyInboxScreen() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const router = useRouter();
  const { formMaxWidth } = useBreakpoint();

  const {
    alertConfig,
    visible: alertVisible,
    hideAlert,
    showConfirm,
    showError,
    showSuccess,
  } = useCustomAlert();

  const { items, counts, bankAccounts, filters, setFilters, refetch } = usePluggyInbox('pending');
  const review = usePluggyReview(refetch);
  const { syncing, syncNow } = usePluggySync();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<EnrichedStagingItem | null>(null);
  const [linkingItem, setLinkingItem] = useState<EnrichedStagingItem | null>(null);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const selectionMode = selectedIds.length > 0;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const handleRefresh = useCallback(async () => {
    try {
      await syncNow({ force: true, suppressNotification: true });
      refetch();
    } catch (e) {
      showError('Falha ao sincronizar', e instanceof Error ? e.message : 'Erro inesperado.');
    }
  }, [refetch, showError, syncNow]);

  const handleDirectImport = useCallback(
    (item: EnrichedStagingItem) => {
      if (!item.hasMappedTarget) {
        // Sem conta mapeada: abre o modal de edição para o usuário escolher a conta/cartão
        setEditingItem(item);
        return;
      }
      try {
        review.importItem(item.staging.id);
      } catch (e) {
        showError('Erro ao importar', e instanceof Error ? e.message : 'Erro inesperado.');
      }
    },
    [review, showError]
  );

  const handleConfirmEditImport = useCallback(
    (stagingId: string, overrides: StagingImportOverrides) => {
      try {
        review.importItem(stagingId, overrides);
      } catch (e) {
        showError('Erro ao importar', e instanceof Error ? e.message : 'Erro inesperado.');
      }
    },
    [review, showError]
  );

  const handleConfirmLink = useCallback(
    (stagingId: string, targetTransactionId: string) => {
      try {
        review.linkItem(stagingId, targetTransactionId);
        showSuccess('Transação vinculada', 'O lançamento foi vinculado preservando seus dados.');
      } catch (e) {
        showError('Erro ao vincular', e instanceof Error ? e.message : 'Erro inesperado.');
      }
    },
    [review, showError, showSuccess]
  );

  const handleBulkImportSelected = useCallback(() => {
    const count = review.importSelected(selectedIds);
    clearSelection();
    showSuccess('Importação concluída', `${count} transação(ões) importada(s).`);
  }, [clearSelection, review, selectedIds, showSuccess]);

  const handleBulkIgnoreSelected = useCallback(() => {
    const count = review.ignoreSelected(selectedIds);
    clearSelection();
    showSuccess('Itens ignorados', `${count} transação(ões) marcada(s) como ignorada(s).`);
  }, [clearSelection, review, selectedIds, showSuccess]);

  const handleBulkConflictFree = useCallback(() => {
    showConfirm(
      'Importar sem conflito?',
      'Importa todas as pendentes cuja conta já está mapeada, que não sejam pagamento de fatura e que não tenham sugestão de vínculo com transações existentes.',
      () => {
        const res = review.importConflictFree();
        showSuccess(
          'Importação em lote',
          `${res.imported} importada(s). ${res.skipped} mantida(s) para revisão manual.`
        );
      }
    );
  }, [review, showConfirm, showSuccess]);

  return (
    <ScreenWrapper style={{ backgroundColor: colors.background }} maxWidth={formMaxWidth ?? 720}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pb-4 pt-2">
        <View className="flex-1 flex-row items-center" style={{ gap: 12 }}>
          <ActionButton icon="chevron-left" onPress={() => router.back()} />
          <View className="flex-1">
            <Text
              className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary"
              numberOfLines={1}>
              Caixa de entrada
            </Text>
            <Text className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
              Revise, edite ou vincule antes de importar
            </Text>
          </View>
        </View>

        <View className="flex-row items-center" style={{ gap: 8 }}>
          {filters.status === 'pending' && counts.pending > 0 && !selectionMode && (
            <TouchableOpacity
              onPress={handleBulkConflictFree}
              className="flex-row items-center rounded-xl px-3 py-2"
              style={{ backgroundColor: colors.primaryGold + '22', gap: 5 }}>
              <Feather name="zap" size={14} color={colors.primaryGold} />
              <Text className="text-xs font-bold" style={{ color: colors.primaryGold }}>
                Sem conflito
              </Text>
            </TouchableOpacity>
          )}
          <ActionButton
            icon="settings"
            onPress={() => router.push('/pluggySettings')}
          />
        </View>
      </View>

      <InboxFilters
        filters={filters}
        counts={counts}
        bankAccounts={bankAccounts}
        onChange={(next) => {
          clearSelection();
          setFilters(next);
        }}
      />

      {/* Barra de seleção múltipla */}
      {selectionMode && (
        <View
          className="mx-5 mb-3 flex-row items-center justify-between rounded-2xl px-4 py-2.5"
          style={{ backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.primaryGold }}>
          <Text className="text-xs font-bold text-light-text-primary dark:text-dark-text-primary">
            {selectedIds.length} selecionada(s)
          </Text>
          <View className="flex-row items-center" style={{ gap: 10 }}>
            {filters.status === 'pending' && (
              <>
                <TouchableOpacity onPress={handleBulkImportSelected}>
                  <Text className="text-xs font-bold" style={{ color: colors.primaryGold }}>
                    Importar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleBulkIgnoreSelected}>
                  <Text className="text-xs font-bold" style={{ color: colors.expenseColor }}>
                    Ignorar
                  </Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity onPress={clearSelection}>
              <Text className="text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(it) => it.staging.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={syncing}
            onRefresh={handleRefresh}
            tintColor={colors.primaryGold}
            colors={[colors.primaryGold]}
          />
        }
        renderItem={({ item }) => (
          <InboxItem
            item={item}
            selectionMode={selectionMode}
            selected={selectedIds.includes(item.staging.id)}
            onToggleSelect={toggleSelect}
            onImport={handleDirectImport}
            onEditAndImport={(it) => setEditingItem(it)}
            onLink={(it) => setLinkingItem(it)}
            onIgnore={(it) => review.ignoreItem(it.staging.id)}
            onUndo={(it) => review.undoItem(it.staging.id)}
            onApplyBankUpdate={(it) => review.applyBankUpdate(it.staging.id)}
          />
        )}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-6 py-16">
            <View
              className="mb-4 h-16 w-16 items-center justify-center rounded-3xl"
              style={{ backgroundColor: colors.primaryGold + '20' }}>
              <Feather name="inbox" size={28} color={colors.primaryGold} />
            </View>
            <Text className="mb-1 text-center text-base font-bold text-light-text-primary dark:text-dark-text-primary">
              {filters.status === 'pending'
                ? 'Nenhuma transação pendente de revisão'
                : 'Nenhum lançamento encontrado neste filtro'}
            </Text>
            <Text className="text-center text-xs leading-5 text-light-text-secondary dark:text-dark-text-secondary">
              Puxe a lista para baixo para sincronizar com a Pluggy ou ajuste os filtros acima.
            </Text>
          </View>
        }
      />

      <ImportEditModal
        visible={editingItem !== null}
        item={editingItem}
        onConfirm={handleConfirmEditImport}
        onClose={() => setEditingItem(null)}
      />

      <MatchCandidatesModal
        visible={linkingItem !== null}
        item={linkingItem}
        onSelectTarget={handleConfirmLink}
        onClose={() => setLinkingItem(null)}
      />

      {alertConfig && (
        <CustomAlert
          visible={alertVisible}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={hideAlert}
          autoClose={alertConfig.autoClose}
        />
      )}
    </ScreenWrapper>
  );
}

