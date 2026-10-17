import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Platform, Pressable, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
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
import { Loading } from 'components/Loading';
import { InboxFilters } from 'components/pluggy/InboxFilters';
import { InboxItem } from 'components/pluggy/InboxItem';
import { ImportEditModal, type ImportEditDetails } from 'components/pluggy/ImportEditModal';
import { MatchCandidatesModal } from 'components/pluggy/MatchCandidatesModal';
import { formatCurrency } from 'utils/formatCurrency';
import type { StagingImportOverrides } from 'utils/pluggy/mappersPluggy';

function ActionToolbarButton({
  label,
  icon,
  bgColor,
  textColor,
  borderColor,
  onPress,
  disabled,
}: {
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  bgColor: string;
  textColor: string;
  borderColor?: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[{ flex: 1 }, animStyle]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => {
          scale.value = withSpring(0.95, { damping: 15, stiffness: 500 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 400, mass: 0.5 });
        }}
        style={{
          height: 40,
          paddingHorizontal: 12,
          borderRadius: 12,
          backgroundColor: bgColor,
          borderWidth: borderColor ? 1 : 0,
          borderColor: borderColor,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          opacity: disabled ? 0.6 : 1,
        }}>
        <Feather name={icon} size={15} color={textColor} />
        <Text style={{ color: textColor, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function PluggyInboxScreen() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const router = useRouter();
  const { formMaxWidth, contentMaxWidth, isNotebookMode } = useBreakpoint();

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
  const [importing, setImporting] = useState(false);
  const [importingMessage, setImportingMessage] = useState('Importando transações...');
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(
    null
  );

  const executeWithLoading = useCallback(
    (
      message: string,
      action: (onProgress: (current: number, total: number) => void) => Promise<void> | void
    ) => {
      setImportingMessage(message);
      setImportProgress(null);
      setImporting(true);
      setTimeout(async () => {
        try {
          await action((current, total) => {
            setImportProgress({ current, total });
          });
        } finally {
          setImporting(false);
          setImportProgress(null);
        }
      }, 150);
    },
    []
  );

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

  const pendingItems = useMemo(
    () => items.filter((it) => it.staging.reviewStatus === 'pending'),
    [items]
  );

  const conflictCount = useMemo(() => {
    return pendingItems.filter(
      (it) => !it.hasMappedTarget || it.isInvoicePayment || it.candidatesCount > 0
    ).length;
  }, [pendingItems]);

  const conflictFreeCount = pendingItems.length - conflictCount;

  const handleDirectImport = useCallback(
    (item: EnrichedStagingItem) => {
      if (!item.hasMappedTarget) {
        // Sem conta mapeada: abre o modal de edição para o usuário escolher a conta/cartão
        setEditingItem(item);
        return;
      }

      const targetName = item.localTargetName ?? 'Sem conta definida';
      const dateStr = new Date(item.staging.date).toLocaleDateString('pt-BR');
      const formattedAmount = formatCurrency(item.staging.amount);

      showConfirm(
        'Importar transação?',
        `Deseja importar a transação "${item.staging.description}" na conta "${targetName}" com data ${dateStr} no valor de ${formattedAmount}?`,
        () => {
          executeWithLoading('Importando transação...', () => {
            try {
              review.importItem(item.staging.id);
              showSuccess('Transação importada', 'A transação foi adicionada com sucesso.');
            } catch (e) {
              showError('Erro ao importar', e instanceof Error ? e.message : 'Erro inesperado.');
            }
          });
        }
      );
    },
    [executeWithLoading, review, showConfirm, showError, showSuccess]
  );

  const handleConfirmEditImport = useCallback(
    (
      stagingId: string,
      overrides: StagingImportOverrides,
      details: ImportEditDetails
    ) => {
      setEditingItem(null);
      showConfirm(
        'Importar transação?',
        `Deseja importar a transação "${details.description}" na conta "${details.targetName}" com data ${details.dateStr} no valor de ${formatCurrency(details.amount)}?`,
        () => {
          executeWithLoading('Importando transação...', () => {
            try {
              review.importItem(stagingId, overrides);
              showSuccess('Transação importada', 'A transação foi adicionada com sucesso.');
            } catch (e) {
              showError('Erro ao importar', e instanceof Error ? e.message : 'Erro inesperado.');
            }
          });
        }
      );
    },
    [executeWithLoading, review, showConfirm, showError, showSuccess]
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
    if (selectedIds.length === 0) return;
    showConfirm(
      'Importar transações selecionadas?',
      `Deseja importar as ${selectedIds.length} transação(ões) selecionada(s)?`,
      () => {
        executeWithLoading(
          `Importando ${selectedIds.length} transações...`,
          async (onProgress) => {
            const count = await review.importSelected(selectedIds, onProgress);
            clearSelection();
            showSuccess('Importação concluída', `${count} transação(ões) importada(s).`);
          }
        );
      }
    );
  }, [clearSelection, executeWithLoading, review, selectedIds, showConfirm, showSuccess]);

  const handleBulkIgnoreSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    showConfirm(
      'Ocultar transações selecionadas?',
      `Deseja ocultar as ${selectedIds.length} transação(ões) selecionada(s)? Elas serão movidas para a aba "Ignoradas".`,
      () => {
        executeWithLoading(
          `Ocultando ${selectedIds.length} transações...`,
          async (onProgress) => {
            const count = await review.ignoreSelected(selectedIds, onProgress);
            clearSelection();
            showSuccess('Itens ocultados', `${count} transação(ões) marcada(s) como ignorada(s).`);
          }
        );
      }
    );
  }, [clearSelection, executeWithLoading, review, selectedIds, showConfirm, showSuccess]);

  const handleIgnoreItem = useCallback(
    (item: EnrichedStagingItem) => {
      showConfirm(
        'Ocultar transação?',
        `Deseja ocultar a transação "${item.staging.description}" no valor de ${formatCurrency(item.staging.amount)}? Ela será movida para a aba "Ignoradas" e não entrará nos seus lançamentos.`,
        () => {
          try {
            review.ignoreItem(item.staging.id);
            showSuccess('Transação ocultada', 'A transação foi marcada como ignorada.');
          } catch (e) {
            showError('Erro ao ocultar', e instanceof Error ? e.message : 'Erro inesperado.');
          }
        }
      );
    },
    [review, showConfirm, showError, showSuccess]
  );

  const handleUndoItem = useCallback(
    (item: EnrichedStagingItem) => {
      const isIgnored = item.staging.reviewStatus === 'ignored';
      showConfirm(
        'Desfazer ação?',
        isIgnored
          ? `Deseja reativar a transação "${item.staging.description}" e movê-la de volta para a lista de pendentes?`
          : `Deseja desfazer a importação de "${item.staging.description}"? O lançamento será desvinculado dos seus lançamentos e voltará para a Caixa de entrada.`,
        () => {
          try {
            review.undoItem(item.staging.id);
            showSuccess('Ação desfeita', 'A transação retornou para a lista de pendentes.');
          } catch (e) {
            showError('Erro ao desfazer', e instanceof Error ? e.message : 'Erro inesperado.');
          }
        }
      );
    },
    [review, showConfirm, showError, showSuccess]
  );

  const handleApplyBankUpdate = useCallback(
    (item: EnrichedStagingItem) => {
      showConfirm(
        'Aplicar alteração do banco?',
        `O banco atualizou esta transação para ${formatCurrency(item.staging.amount)} (${item.staging.externalStatus === 'PENDING' ? 'Pendente' : 'Paga'}). Deseja aplicar essa atualização no seu lançamento vinculado?`,
        () => {
          try {
            review.applyBankUpdate(item.staging.id);
            showSuccess('Transação atualizada', 'Os dados do banco foram sincronizados com sucesso.');
          } catch (e) {
            showError('Erro ao atualizar', e instanceof Error ? e.message : 'Erro inesperado.');
          }
        }
      );
    },
    [review, showConfirm, showError, showSuccess]
  );

  const handleBulkAction = useCallback(() => {
    if (conflictCount === 0) {
      showConfirm(
        'Importar transações?',
        `Deseja importar todas as ${pendingItems.length} transações pendentes?`,
        () => {
          executeWithLoading(
            `Importando ${pendingItems.length} transações...`,
            async (onProgress) => {
              const res = await review.importConflictFree(onProgress);
              showSuccess('Importação concluída', `${res.imported} transação(ões) importada(s).`);
            }
          );
        }
      );
    } else if (conflictFreeCount > 0) {
      showConfirm(
        'Importar sem conflitos?',
        `${conflictCount} ${conflictCount === 1 ? 'transação possui conflito' : 'transações possuem conflitos'} (sem conta mapeada, fatura ou sugestão de vínculo) e ${conflictCount === 1 ? 'será mantida' : 'serão mantidas'} para revisão manual.\n\nDeseja importar as demais ${conflictFreeCount} transação(ões) sem conflito?`,
        () => {
          executeWithLoading(
            `Importando ${conflictFreeCount} transações...`,
            async (onProgress) => {
              const res = await review.importConflictFree(onProgress);
              showSuccess(
                'Importação em lote',
                `${res.imported} importada(s). ${res.skipped} mantida(s) para revisão manual.`
              );
            }
          );
        }
      );
    } else {
      showConfirm(
        'Transações com conflitos',
        `Todas as ${conflictCount} transações pendentes possuem conflitos (sem conta mapeada, pagamento de fatura ou sugestão de vínculo).\n\nDeseja filtrar a lista para revisar apenas as transações com conflito?`,
        () => {
          setFilters((prev) => ({ ...prev, conflictFilter: 'with_conflict' }));
        }
      );
    }
  }, [conflictCount, conflictFreeCount, executeWithLoading, pendingItems.length, review, setFilters, showConfirm, showSuccess]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const keyExtractor = useCallback((it: EnrichedStagingItem) => it.staging.id, []);

  const renderItem = useCallback(
    ({ item }: { item: EnrichedStagingItem }) => (
      <InboxItem
        item={item}
        selectionMode={selectionMode}
        selected={selectedIdSet.has(item.staging.id)}
        gridItem={isNotebookMode}
        onToggleSelect={toggleSelect}
        onImport={handleDirectImport}
        onEditAndImport={setEditingItem}
        onLink={setLinkingItem}
        onIgnore={handleIgnoreItem}
        onUndo={handleUndoItem}
        onApplyBankUpdate={handleApplyBankUpdate}
      />
    ),
    [
      selectionMode,
      selectedIdSet,
      isNotebookMode,
      toggleSelect,
      handleDirectImport,
      setEditingItem,
      setLinkingItem,
      handleIgnoreItem,
      handleUndoItem,
      handleApplyBankUpdate,
    ]
  );

  return (
    <ScreenWrapper
      style={{ backgroundColor: colors.background }}
      maxWidth={isNotebookMode ? (contentMaxWidth ?? 1200) : (formMaxWidth ?? 720)}>
      {/* Header */}
      <View
        className="flex-row items-center justify-between pb-4 pt-2"
        style={{ paddingHorizontal: isNotebookMode ? 24 : 20 }}>
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

      {/* Barra de Ações: Recarregar | Importar / Conflitos */}
      <View
        className="mb-3 flex-row items-center"
        style={{ marginHorizontal: isNotebookMode ? 24 : 20, gap: 10 }}>
        <ActionToolbarButton
          label={syncing ? 'Buscando...' : 'Recarregar'}
          icon="refresh-cw"
          bgColor={colors.cardBackground}
          textColor={colors.textPrimary}
          borderColor={colors.borderColor}
          onPress={handleRefresh}
          disabled={syncing}
        />

        {filters.status === 'pending' && counts.pending > 0 && !selectionMode && (
          <ActionToolbarButton
            label={
              conflictCount === 0
                ? 'Importar'
                : `${conflictCount} ${conflictCount === 1 ? 'conflito' : 'conflitos'}`
            }
            icon={conflictCount === 0 ? 'download' : 'alert-triangle'}
            bgColor={conflictCount === 0 ? colors.primaryGold : colors.expenseColor + '20'}
            textColor={conflictCount === 0 ? colors.primaryGoldContrast : colors.expenseColor}
            borderColor={conflictCount === 0 ? undefined : colors.expenseColor}
            onPress={handleBulkAction}
          />
        )}
      </View>

      {/* Barra de seleção múltipla */}
      {selectionMode && (
        <View
          className="mb-3 flex-row items-center justify-between rounded-2xl px-4 py-2.5"
          style={{
            marginHorizontal: isNotebookMode ? 24 : 20,
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.primaryGold,
          }}>
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
        key={isNotebookMode ? 'inbox-grid-2' : 'inbox-list-1'}
        data={items}
        numColumns={isNotebookMode ? 2 : 1}
        columnWrapperStyle={isNotebookMode ? { gap: 12 } : undefined}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingHorizontal: isNotebookMode ? 24 : 20,
          paddingBottom: 40,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl
            refreshing={syncing}
            onRefresh={handleRefresh}
            tintColor={colors.primaryGold}
            colors={[colors.primaryGold]}
          />
        }
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS !== 'web'}
        updateCellsBatchingPeriod={50}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-6 py-16">
            <View
              className="mb-4 h-16 w-16 items-center justify-center rounded-3xl"
              style={{ backgroundColor: colors.primaryGold + '20' }}>
              <Feather name="inbox" size={28} color={colors.primaryGold} />
            </View>
            <Text className="mb-1 text-center text-base font-bold text-light-text-primary dark:text-dark-text-primary">
              {filters.status === 'pending'
                ? filters.conflictFilter === 'with_conflict'
                  ? 'Nenhuma transação com conflito'
                  : filters.conflictFilter === 'without_conflict'
                    ? 'Nenhuma transação pronta sem conflito'
                    : 'Nenhuma transação pendente de revisão'
                : 'Nenhum lançamento encontrado neste filtro'}
            </Text>
            <Text className="text-center text-xs leading-5 text-light-text-secondary dark:text-dark-text-secondary">
              {filters.status === 'pending' && filters.conflictFilter === 'with_conflict'
                ? 'Todas as suas transações pendentes estão prontas para importação sem conflitos!'
                : filters.status === 'pending' && filters.conflictFilter === 'without_conflict'
                  ? 'Todas as transações pendentes necessitam de revisão ou mapeamento.'
                  : 'Puxe a lista para baixo para sincronizar com a Pluggy ou ajuste os filtros acima.'}
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

      <Modal visible={importing} transparent animationType="fade" onRequestClose={() => {}}>
        <View className="flex-1 items-center justify-center bg-black/60 px-6">
          <View style={{ maxWidth: 360, width: '100%' }}>
            <Loading message={importingMessage} progress={importProgress} size="medium" />
          </View>
        </View>
      </Modal>

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

