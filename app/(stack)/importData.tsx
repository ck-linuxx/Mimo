import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, InteractionManager } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { useCustomAlert } from 'hooks/useCustomAlert';
import { useAccounts } from 'hooks/useAccounts';
import { useImportSave } from 'hooks/useImportSave';
import { useRestoreBackup } from 'hooks/useRestoreBackup';
import { ScreenWrapper } from 'components/ScreenWrapper';
import { CustomAlert } from 'components/CustomAlert';
import { ActionButton } from 'components/ActionButton';
import { ReviewList } from 'components/import/ReviewList';
import { ProgressDialog } from 'components/import/ProgressDialog';
import { BankConfirmModal } from 'components/import/BankConfirmModal';
import { AccountSelectModal } from 'components/import/AccountSelectModal';
import { pickImportFile } from 'utils/importData/filePicker';
import { parseOFX } from 'utils/importData/parseOFX';
import { parseCSV } from 'utils/importData/parseCSV';
import { parseBackupJSON } from 'utils/importData/parseBackupJSON';
import { AccountTypeEnum } from 'types';
import type { ImportPhase, ImportedTransaction, ParsedFile } from 'utils/importData/types';

export default function ImportDataScreen() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const router = useRouter();

  const {
    alertConfig,
    visible: alertVisible,
    hideAlert,
    showConfirm,
    showError,
    showSuccess,
  } = useCustomAlert();
  const { data: accountsData } = useAccounts();
  const { mutate: saveMutate } = useImportSave();
  const { mutate: restoreMutate } = useRestoreBackup();

  const [phase, setPhase] = useState<ImportPhase>('idle');
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [reviewItems, setReviewItems] = useState<ImportedTransaction[]>([]);
  const [parseProgress, setParseProgress] = useState(0);
  const [parseMessage, setParseMessage] = useState('');
  const [confirmedBankName, setConfirmedBankName] = useState('');

  const startParsing = async (picked: { content: string; format: 'ofx' | 'csv'; name: string }) => {
    setPhase('parsing');
    setParseProgress(0);
    setParseMessage('Iniciando processamento...');

    await new Promise<void>((resolve) => {
      InteractionManager.runAfterInteractions(() => resolve());
    });

    try {
      setParseProgress(20);
      setParseMessage('Lendo arquivo...');

      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      const result = picked.format === 'ofx' ? parseOFX(picked.content) : parseCSV(picked.content);

      setParseProgress(100);
      setParseMessage(`${result.transactions.length} lançamentos encontrados`);
      setParsedFile(result);
      setReviewItems([...result.transactions]);

      await new Promise<void>((resolve) => setTimeout(resolve, 500));
      setPhase('reviewing');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao processar arquivo';
      showError('Erro de processamento', msg);
      setPhase('idle');
    }
  };

  const handleRestoreFlow = useCallback(
    (content: string) => {
      let backup;
      try {
        backup = parseBackupJSON(content);
      } catch (e) {
        showError('Arquivo inválido', e instanceof Error ? e.message : 'Erro ao ler arquivo');
        return;
      }
      showConfirm(
        'Restaurar Backup',
        'Todos os dados atuais serão substituídos pelos dados do backup. Esta ação não pode ser desfeita.',
        () => {
          setPhase('saving');
          restoreMutate(
            backup,
            (counts) => {
              showSuccess(
                'Backup Restaurado',
                `${counts.transactions} transações, ${counts.accounts} contas, ${counts.categories} categorias restauradas.`,
                4000
              );
              router.replace('/');
            },
            (msg) => {
              showError('Erro ao Restaurar', msg);
              setPhase('idle');
            }
          );
        }
      );
    },
    [showConfirm, showError, showSuccess, restoreMutate, router]
  );

  const handleSelectFile = async () => {
    try {
      const picked = await pickImportFile();
      if (!picked) return;
      if (picked.format === 'json') {
        handleRestoreFlow(picked.content);
        return;
      }
      showConfirm('Importar extrato', `Deseja importar "${picked.name}"?`, () =>
        startParsing(picked)
      );
    } catch (e) {
      showError('Erro', e instanceof Error ? e.message : 'Não foi possível abrir o arquivo');
    }
  };

  const handleEditItem = (
    localId: string,
    updates: NonNullable<ImportedTransaction['_edited']>
  ) => {
    setReviewItems((prev) =>
      prev.map((item) =>
        item._localId === localId ? { ...item, _edited: { ...item._edited, ...updates } } : item
      )
    );
  };

  const handleDeleteItem = (localId: string) => {
    setReviewItems((prev) => prev.filter((item) => item._localId !== localId));
  };

  const handleAdvance = () => {
    setConfirmedBankName(parsedFile?.bankName ?? '');
    setPhase('bank-confirm');
  };

  const handleBankConfirm = (bankName: string) => {
    setConfirmedBankName(bankName);
    setPhase('account-select');
  };

  const handleAccountSelect = (accountId: string | null) => {
    setPhase('saving');
    saveMutate(
      {
        items: reviewItems,
        accountId,
        bankName: confirmedBankName,
        accountType: parsedFile?.accountType ?? AccountTypeEnum.Checking,
      },
      (result) => {
        showSuccess(
          'Importação concluída',
          `${result.importedCount} lançamentos importados com sucesso.`,
          2000
        );
        setTimeout(() => router.back(), 2200);
      },
      (err) => {
        showError('Erro ao salvar', err);
        setPhase('account-select');
      }
    );
  };

  const isReviewing =
    phase === 'reviewing' ||
    phase === 'bank-confirm' ||
    phase === 'account-select' ||
    phase === 'saving';

  const footerDisabled = reviewItems.length === 0 || phase === 'saving';

  return (
    <ScreenWrapper style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 pb-4 pt-2">
        <ActionButton icon="chevron-left" onPress={() => router.back()} />
        <Text
          className="flex-1 text-xl font-bold text-light-text-primary dark:text-dark-text-primary"
          numberOfLines={1}>
          Importar dados
        </Text>
      </View>

      {!isReviewing ? (
        /* Idle state */
        <View className="flex-1 items-center justify-center px-8">
          <View className="mb-6 h-20 w-20 items-center justify-center rounded-3xl bg-light-primary-gold/20 dark:bg-dark-primary-gold/20">
            <Feather name="download" size={36} color={colors.primaryGold} />
          </View>
          <Text className="mb-3 text-center text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
            Importar extrato bancário
          </Text>
          <Text className="mb-8 text-center text-sm leading-6 text-light-text-secondary dark:text-dark-text-secondary">
            Selecione um arquivo de extrato no formato OFX ou CSV para importar seus lançamentos
            bancários.
          </Text>
          <TouchableOpacity
            onPress={handleSelectFile}
            className="w-full items-center rounded-2xl py-4 bg-light-primary-gold dark:bg-dark-primary-gold"
            activeOpacity={0.85}>
            <Text className="text-base font-bold text-light-primary-gold-contrast dark:text-dark-primary-gold-contrast">
              Selecionar arquivo
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Review state */
        <View className="flex-1">
          <View className="flex-1 px-4">
            <ReviewList items={reviewItems} onEdit={handleEditItem} onDelete={handleDeleteItem} />
          </View>

          {/* Footer button */}
          <View className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-light-background dark:bg-dark-background">
            <TouchableOpacity
              onPress={handleAdvance}
              disabled={footerDisabled}
              className="items-center rounded-2xl py-4"
              style={{
                backgroundColor: footerDisabled ? colors.disabled : colors.primaryGold,
              }}
              activeOpacity={0.85}>
              <Text className="text-lg font-bold text-light-primary-gold-contrast dark:text-dark-primary-gold-contrast">
                {phase === 'saving'
                  ? 'Salvando...'
                  : `Avançar${reviewItems.length > 0 ? ` (${reviewItems.length})` : ''}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modals */}
      <ProgressDialog
        visible={phase === 'parsing'}
        progress={parseProgress}
        message={parseMessage}
      />

      <BankConfirmModal
        visible={phase === 'bank-confirm'}
        initialBankName={confirmedBankName}
        onConfirm={handleBankConfirm}
        onBack={() => setPhase('reviewing')}
      />

      <AccountSelectModal
        visible={phase === 'account-select'}
        accounts={accountsData}
        bankName={confirmedBankName}
        accountType={parsedFile?.accountType ?? AccountTypeEnum.Checking}
        onSelect={handleAccountSelect}
        onBack={() => setPhase('bank-confirm')}
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
