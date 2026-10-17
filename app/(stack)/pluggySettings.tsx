import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { useBreakpoint } from 'hooks/useBreakpoint';
import { useCustomAlert } from 'hooks/useCustomAlert';
import { useSettings } from 'hooks/useSettings';
import { useAccounts } from 'hooks/useAccounts';
import { useCards } from 'hooks/useCards';
import { usePluggyCredentials } from 'hooks/pluggy/usePluggyCredentials';
import { usePluggyConnections } from 'hooks/pluggy/usePluggyConnections';
import { usePluggySync } from 'hooks/pluggy/usePluggySync';
import { ScreenWrapper } from 'components/ScreenWrapper';
import { CustomAlert } from 'components/CustomAlert';
import { ActionButton } from 'components/ActionButton';
import { AppButton } from 'components/AppButton';
import { InfoCard } from 'components/InfoCard';
import { TextInput } from 'components/TextInput';
import { BankMappingModal } from 'components/pluggy/BankMappingModal';
import { formatCurrency } from 'utils/formatCurrency';
import {
  clearIntegrationData,
  createLocalTargetFor,
  itemNeedsExternalAction,
  setAccountMapping,
} from 'services/pluggy/connections';
import { ensureNotificationPermission } from 'services/pluggy/notifications';
import { PluggyError } from 'services/pluggy/types';
import { queryClient } from 'services/queryClient';
import { queryKeysPluggy } from 'constants/queryKeysPluggy';
import { pluggyImportWindows } from 'db/schema';
import type { BankAccount, PluggyImportWindow } from 'db/schema';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function errorMessage(e: unknown): string {
  if (e instanceof PluggyError) return e.message;
  return e instanceof Error ? e.message : 'Ocorreu um erro inesperado.';
}

function formatDateTime(ms: number | null | undefined): string {
  if (!ms) return 'Nunca';
  return new Date(ms).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="mb-2 mt-6 px-1 text-xs font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">
      {children}
    </Text>
  );
}

// ─── Tela ─────────────────────────────────────────────────────────────────────

export default function PluggySettingsScreen() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const router = useRouter();
  const { formMaxWidth, contentMaxWidth, isNotebookMode } = useBreakpoint();

  const {
    alertConfig,
    visible: alertVisible,
    hideAlert,
    showConfirm,
    showDestructive,
    showError,
    showInfo,
    showSuccess,
  } = useCustomAlert();

  const creds = usePluggyCredentials();
  const {
    pluggyAutoSync,
    setPluggyAutoSync,
    pluggyImportWindowDays,
    setPluggyImportWindowDays,
  } = useSettings();
  const { connections, accounts: bankAccounts, pendingCount, refetch } = usePluggyConnections();
  const { syncing, syncNow } = usePluggySync();
  const { data: localAccounts, refetch: refetchAccounts } = useAccounts();
  const { data: localCards, refetch: refetchCards } = useCards();

  const [saving, setSaving] = useState(false);
  const [windowExpanded, setWindowExpanded] = useState(false);
  const [mappingTarget, setMappingTarget] = useState<BankAccount | null>(null);

  const canSave = creds.clientId.trim().length > 0 && creds.clientSecret.trim().length > 0;

  const reloadAll = useCallback(() => {
    refetch();
    refetchAccounts();
    refetchCards();
  }, [refetch, refetchAccounts, refetchCards]);

  useFocusEffect(
    useCallback(() => {
      reloadAll();
    }, [reloadAll])
  );

  const runFullSync = useCallback(
    async (opts?: { forceFullWindow?: boolean; silentWhenOk?: boolean }) => {
      try {
        const summary = await syncNow({
          force: true,
          forceFullWindow: opts?.forceFullWindow ?? false,
        });
        setWindowExpanded(false);
        reloadAll();
        if (summary.connectionsCount === 0) {
          showInfo(
            'Nenhuma conexão encontrada',
            'Se você já conectou um banco no Meu Pluggy, informe o Item ID no campo acima e tente novamente.'
          );
        } else {
          // Quando novas contas/cartões são importados sem mapeamento, abre no formato de modal automaticamente
          const unmapped = bankAccounts.find((b) => !b.localAccountId && !b.localCardId);
          if (unmapped) {
            setMappingTarget(unmapped);
          } else if (!opts?.silentWhenOk) {
            showSuccess(
              'Sincronização concluída',
              `${summary.insertedPending} nova(s) transação(ões) na Caixa de entrada.`
            );
          }
        }
      } catch (e) {
        showError('Não foi possível sincronizar', errorMessage(e));
      }
    },
    [bankAccounts, reloadAll, showError, showInfo, showSuccess, syncNow]
  );

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await creds.saveAndTest();
    } catch (e) {
      setSaving(false);
      showError('Credenciais não salvas', errorMessage(e));
      return;
    }
    setSaving(false);
    ensureNotificationPermission().catch(() => {});
    showSuccess('Credenciais válidas', 'Conexão com a Pluggy confirmada e salva neste aparelho.');
    await runFullSync({ silentWhenOk: true });
  }, [canSave, creds, runFullSync, showError, showSuccess]);

  const handleSelectWindow = useCallback(
    async (days: PluggyImportWindow) => {
      const increased = days > pluggyImportWindowDays && connections.length > 0;
      await setPluggyImportWindowDays(days);
      if (increased) {
        setWindowExpanded(true);
      }
    },
    [connections.length, pluggyImportWindowDays, setPluggyImportWindowDays]
  );

  const handleDisconnect = useCallback(() => {
    showConfirm(
      'Desconectar da Pluggy?',
      'As credenciais serão removidas deste aparelho e a sincronização será interrompida. As transações em revisão e as já importadas serão mantidas até você decidir o que fazer com elas.',
      async () => {
        await creds.disconnect();
        queryClient.invalidateQueries({ queryKey: queryKeysPluggy.all });
        showSuccess('Desconectado', 'Credenciais removidas. Seus dados foram mantidos.');
      }
    );
  }, [creds, showConfirm, showSuccess]);

  const handleClearData = useCallback(() => {
    showDestructive(
      'Apagar dados da integração?',
      'Isso remove as conexões, as contas do banco e TODAS as transações em revisão (incluindo as ignoradas). As transações que você já importou ou vinculou continuam no app.',
      () => {
        clearIntegrationData();
        queryClient.invalidateQueries({ queryKey: queryKeysPluggy.all });
        reloadAll();
        showSuccess('Dados apagados', 'Os dados da integração foram removidos.');
      },
      undefined,
      'Apagar'
    );
  }, [reloadAll, showDestructive, showSuccess]);

  const mappingConnection = useMemo(() => {
    if (!mappingTarget) return null;
    return connections.find((c) => c.id === mappingTarget.connectionId) ?? null;
  }, [mappingTarget, connections]);

  const handleConfirmCreateMapping = useCallback(
    (data: { name: string; color: string; icon: string }) => {
      if (!mappingTarget) return;
      const isCredit = mappingTarget.type === 'CREDIT';
      const labelType = isCredit ? 'o cartão de crédito' : 'a conta / banco';

      showConfirm(
        isCredit ? 'Criar e Vincular Cartão?' : 'Criar e Vincular Banco?',
        `Deseja cadastrar ${labelType} "${data.name}" no mimo e vinculá-lo a esta conta da Pluggy?`,
        () => {
          createLocalTargetFor(mappingTarget.id, {
            name: data.name,
            color: data.color,
            icon: data.icon,
          });
          setMappingTarget(null);
          reloadAll();
          showSuccess(
            isCredit ? 'Cartão criado com sucesso!' : 'Banco criado com sucesso!',
            `"${data.name}" já está pronto para uso e vinculado à integração.`
          );
        }
      );
    },
    [mappingTarget, reloadAll, showConfirm, showSuccess]
  );

  const handleConfirmMapTarget = useCallback(
    (target: { accountId?: string; cardId?: string } | {}) => {
      if (!mappingTarget) return;

      if ('accountId' in target && target.accountId) {
        const acc = localAccounts.find((a) => a.id === target.accountId);
        showConfirm(
          'Vincular Conta?',
          `Deseja vincular este banco à conta "${acc?.name ?? 'selecionada'}"?`,
          () => {
            setAccountMapping(mappingTarget.id, { localAccountId: target.accountId });
            setMappingTarget(null);
            reloadAll();
            showSuccess('Conta vinculada com sucesso!');
          }
        );
      } else if ('cardId' in target && target.cardId) {
        const card = localCards.find((c) => c.id === target.cardId);
        showConfirm(
          'Vincular Cartão?',
          `Deseja vincular este banco ao cartão "${card?.name ?? 'selecionado'}"?`,
          () => {
            setAccountMapping(mappingTarget.id, { localCardId: target.cardId });
            setMappingTarget(null);
            reloadAll();
            showSuccess('Cartão vinculado com sucesso!');
          }
        );
      } else {
        showConfirm(
          'Remover Vínculo?',
          'As transações deste banco não serão mais vinculadas a uma conta/cartão local automaticamente.',
          () => {
            setAccountMapping(mappingTarget.id, {});
            setMappingTarget(null);
            reloadAll();
            showSuccess('Vínculo removido com sucesso!');
          }
        );
      }
    },
    [localAccounts, localCards, mappingTarget, reloadAll, showConfirm, showSuccess]
  );

  const targetLabel = (bank: BankAccount): string | null => {
    if (bank.localAccountId) {
      return localAccounts.find((a) => a.id === bank.localAccountId)?.name ?? 'Conta removida';
    }
    if (bank.localCardId) {
      return localCards.find((c) => c.id === bank.localCardId)?.name ?? 'Cartão removido';
    }
    return null;
  };

  const renderInboxShortcut = () => (
    <TouchableOpacity
      onPress={() => router.push('/pluggyInbox')}
      activeOpacity={0.8}
      className={isNotebookMode ? 'mt-6' : 'mt-2'}>
      <InfoCard>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center" style={{ gap: 12 }}>
            <View
              className="h-11 w-11 items-center justify-center rounded-xl"
              style={{ backgroundColor: colors.primaryGold + '22' }}>
              <Feather name="inbox" size={20} color={colors.primaryGold} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-light-text-primary dark:text-dark-text-primary">
                Caixa de entrada do banco
              </Text>
              <Text className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                {pendingCount > 0
                  ? `${pendingCount} transação(ões) aguardando revisão`
                  : 'Revise, edite ou vincule transações sincronizadas'}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            {pendingCount > 0 && (
              <View
                className="rounded-full px-2.5 py-1"
                style={{ backgroundColor: colors.primaryGold }}>
                <Text
                  className="text-xs font-bold"
                  style={{ color: colors.primaryGoldContrast }}>
                  {pendingCount}
                </Text>
              </View>
            )}
            <Feather name="chevron-right" size={18} color={colors.textSecondary} />
          </View>
        </View>
      </InfoCard>
    </TouchableOpacity>
  );

  const renderCredentialsSection = () => (
    <>
      <SectionTitle>Credenciais</SectionTitle>
      <InfoCard>
        <View className="mb-3 flex-row items-center gap-2">
          <View
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: creds.configured ? colors.incomeColor : colors.disabled }}
          />
          <Text className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">
            {creds.configured ? 'Configurado' : 'Não configurado'}
          </Text>
        </View>

        {creds.loading ? (
          <ActivityIndicator color={colors.primaryGold} />
        ) : (
          <>
            <Text className="mb-1 text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary">
              PLUGGY_CLIENT_ID
            </Text>
            <TextInput
              value={creds.clientId}
              onChangeText={creds.setClientId}
              placeholder="your-client-id"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text className="mb-1 mt-4 text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary">
              PLUGGY_CLIENT_SECRET
            </Text>
            <TextInput
              value={creds.clientSecret}
              onChangeText={creds.setClientSecret}
              placeholder="your-client-secret"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />

            <Text className="mb-1 mt-4 text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary">
              ITEM IDs (opcional)
            </Text>
            <TextInput
              value={creds.itemIdsText}
              onChangeText={creds.setItemIdsText}
              placeholder="Um por linha. Use se as conexões não forem listadas automaticamente"
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              style={{ minHeight: 64, textAlignVertical: 'top' }}
            />

            <Text className="mt-3 text-xs leading-4 text-light-text-secondary dark:text-dark-text-secondary">
              As credenciais ficam protegidas no armazenamento do aparelho e não entram no
              backup. Use somente em uso pessoal.
            </Text>

            <View className="mt-4" style={{ gap: 10 }}>
              <AppButton
                label="Salvar e testar"
                onPress={handleSave}
                disabled={!canSave}
                loading={saving}
                loadingLabel="Validando..."
              />
              {creds.configured && (
                <AppButton
                  label="Desconectar"
                  icon="log-out"
                  variant="ghost"
                  onPress={handleDisconnect}
                />
              )}
            </View>
          </>
        )}
      </InfoCard>
    </>
  );

  const renderSyncSection = () => (
    <>
      <SectionTitle>Sincronização</SectionTitle>
      <InfoCard>
        <Text className="mb-1 text-base font-bold text-light-text-primary dark:text-dark-text-primary">
          Janela de importação
        </Text>
        <Text className="mb-3 text-sm leading-5 text-light-text-secondary dark:text-dark-text-secondary">
          Define quantos dias para trás buscar na primeira sincronização de cada conta.
        </Text>
        <View className="flex-row" style={{ gap: 8 }}>
          {pluggyImportWindows.map((days) => {
            const selected = pluggyImportWindowDays === days;
            return (
              <TouchableOpacity
                key={days}
                onPress={() => handleSelectWindow(days as PluggyImportWindow)}
                activeOpacity={0.8}
                className="flex-1 items-center rounded-xl py-3"
                style={{
                  backgroundColor: selected ? colors.primaryGold : colors.iconBackground,
                }}>
                <Text
                  className="text-sm font-bold"
                  style={{ color: selected ? colors.primaryGoldContrast : colors.textPrimary }}>
                  {days} dias
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {windowExpanded && creds.configured && (
          <TouchableOpacity
            onPress={() => runFullSync({ forceFullWindow: true })}
            disabled={syncing}
            className="mt-3 flex-row items-center justify-center rounded-xl py-2.5"
            style={{ backgroundColor: colors.primaryGold + '22', gap: 6 }}>
            <Feather name="download-cloud" size={15} color={colors.primaryGold} />
            <Text className="text-xs font-bold" style={{ color: colors.primaryGold }}>
              Buscar período adicional ({pluggyImportWindowDays} dias) agora
            </Text>
          </TouchableOpacity>
        )}

        <View className="mt-5 flex-row items-center justify-between">
          <View className="mr-3 flex-1">
            <Text className="text-base font-bold text-light-text-primary dark:text-dark-text-primary">
              Sincronizar automaticamente ao ter internet
            </Text>
            <Text className="text-sm leading-5 text-light-text-secondary dark:text-dark-text-secondary">
              Busca novas transações quando o app abre ou a conexão volta.
            </Text>
          </View>
          <Switch
            value={pluggyAutoSync}
            onValueChange={setPluggyAutoSync}
            trackColor={{ false: colors.iconBackground, true: colors.primaryGold + '60' }}
            thumbColor={pluggyAutoSync ? colors.primaryGold : colors.disabled}
            ios_backgroundColor={colors.iconBackground}
          />
        </View>
      </InfoCard>
    </>
  );

  const renderConnectionsSection = () => (
    <>
      <SectionTitle>Conexões bancárias</SectionTitle>

      {connections.length === 0 ? (
        <InfoCard>
          <Text className="text-sm leading-5 text-light-text-secondary dark:text-dark-text-secondary">
            {creds.configured
              ? 'Nenhuma conexão carregada ainda. Toque em "Sincronizar agora".'
              : 'Salve as credenciais para listar suas conexões do Meu Pluggy.'}
          </Text>
        </InfoCard>
      ) : (
        connections.map((connection) => {
          const needsAction = itemNeedsExternalAction(connection.status);
          const accountsOfConnection = bankAccounts.filter(
            (a) => a.connectionId === connection.id
          );
          return (
            <InfoCard key={connection.id} className="mb-3">
              <View className="flex-row items-center justify-between">
                <View className="mr-3 flex-1">
                  <Text
                    className="text-base font-bold text-light-text-primary dark:text-dark-text-primary"
                    numberOfLines={1}>
                    {connection.connectorName ?? 'Banco'}
                  </Text>
                  <Text className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                    Última sincronização: {formatDateTime(connection.lastSyncAt)}
                  </Text>
                </View>
                <View
                  className="rounded-full px-3 py-1"
                  style={{
                    backgroundColor:
                      (needsAction ? colors.expenseColor : colors.incomeColor) + '25',
                  }}>
                  <Text
                    className="text-xs font-bold"
                    style={{ color: needsAction ? colors.expenseColor : colors.incomeColor }}>
                    {needsAction ? 'Requer ação' : (connection.status ?? '—')}
                  </Text>
                </View>
              </View>

              {connection.lastError && (
                <Text className="mt-2 text-xs leading-4" style={{ color: colors.expenseColor }}>
                  {connection.lastError}
                </Text>
              )}

              {accountsOfConnection.map((bank) => {
                const label = targetLabel(bank);
                return (
                  <TouchableOpacity
                    key={bank.id}
                    onPress={() => setMappingTarget(bank)}
                    activeOpacity={0.7}
                    className="mt-3 flex-row items-center rounded-xl px-3 py-3"
                    style={{ backgroundColor: colors.iconBackground }}>
                    <Feather
                      name={bank.type === 'CREDIT' ? 'credit-card' : 'briefcase'}
                      size={18}
                      color={colors.primaryGold}
                    />
                    <View className="mx-3 flex-1">
                      <Text
                        className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary"
                        numberOfLines={1}>
                        {bank.name}
                        {bank.balance != null ? ` · ${formatCurrency(bank.balance)}` : ''}
                      </Text>
                      <Text
                        className="text-xs"
                        style={{ color: label ? colors.textSecondary : colors.expenseColor }}
                        numberOfLines={1}>
                        {label
                          ? `Destino: ${label}`
                          : bank.type === 'CREDIT'
                            ? 'Escolha o cartão de destino'
                            : 'Escolha a conta de destino'}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                );
              })}
            </InfoCard>
          );
        })
      )}

      <View className="mt-4" style={{ gap: 10 }}>
        <AppButton
          label="Sincronizar agora"
          onPress={() => runFullSync()}
          disabled={!creds.configured}
          loading={syncing}
          loadingLabel="Sincronizando..."
        />
      </View>
    </>
  );

  const renderDataZoneSection = () =>
    connections.length > 0 || pendingCount > 0 ? (
      <>
        <SectionTitle>Dados da integração</SectionTitle>
        <InfoCard>
          <Text className="mb-3 text-sm leading-5 text-light-text-secondary dark:text-dark-text-secondary">
            Remove as conexões e as transações em revisão. As transações que você já importou ou
            vinculou não são apagadas.
          </Text>
          <AppButton
            label="Apagar dados da integração"
            icon="trash-2"
            variant="danger"
            onPress={handleClearData}
          />
        </InfoCard>
      </>
    ) : null;

  return (
    <ScreenWrapper
      style={{ backgroundColor: colors.background }}
      maxWidth={isNotebookMode ? (contentMaxWidth ?? 1120) : (formMaxWidth ?? 720)}>
      {/* Header */}
      <View
        className="flex-row items-center justify-between pb-2 pt-2"
        style={{ paddingHorizontal: isNotebookMode ? 24 : 20 }}>
        <View className="flex-1 flex-row items-center" style={{ gap: 12 }}>
          <ActionButton icon="chevron-left" onPress={() => router.back()} />
          <Text
            className="flex-1 text-xl font-bold text-light-text-primary dark:text-dark-text-primary"
            numberOfLines={1}>
            Integração Pluggy
          </Text>
        </View>
        <ActionButton icon="inbox" onPress={() => router.push('/pluggyInbox')} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: isNotebookMode ? 24 : 20,
          paddingBottom: 40,
        }}>
        <Text className="mb-2 px-1 text-sm leading-5 text-light-text-secondary dark:text-dark-text-secondary">
          Conecte seus bancos no Meu Pluggy e informe aqui apenas as credenciais da API. O mimo só
          lê contas e transações, e guarda tudo no seu aparelho.
        </Text>

        {isNotebookMode ? (
          <View className="flex-row items-start" style={{ gap: 16 }}>
            <View className="flex-1">
              {renderCredentialsSection()}
              {renderSyncSection()}
            </View>
            <View className="flex-1">
              {renderInboxShortcut()}
              {renderConnectionsSection()}
              {renderDataZoneSection()}
            </View>
          </View>
        ) : (
          <>
            {renderInboxShortcut()}
            {renderCredentialsSection()}
            {renderSyncSection()}
            {renderConnectionsSection()}
            {renderDataZoneSection()}
          </>
        )}
      </ScrollView>

      {/* ── Modal: destino da conta / criação de banco com sugestão inteligente ── */}
      <BankMappingModal
        visible={mappingTarget !== null}
        bankAccount={mappingTarget}
        connectorName={mappingConnection?.connectorName}
        localAccounts={localAccounts}
        localCards={localCards}
        onConfirmCreate={handleConfirmCreateMapping}
        onConfirmMap={handleConfirmMapTarget}
        onClose={() => setMappingTarget(null)}
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
