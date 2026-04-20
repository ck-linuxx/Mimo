import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { ScreenWrapper, TAB_BAR_HEIGHT } from 'components/ScreenWrapper';
import { ActionButton } from 'components/ActionButton';
import { AppButton } from 'components/AppButton';
import { DatePicker } from 'components/DatePicker';
import { AttachmentPicker } from 'components/AttachmentPicker';
import { CustomAlert } from 'components/CustomAlert';
import { useEditTransaction } from 'hooks/useEditTransaction';
import { useAttachments } from 'hooks/useAttachments';
import { useCustomAlert } from 'hooks/useCustomAlert';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { TransactionStatusEnum, TransactionTypeEnum, GroupTypeEnum } from 'types';
import type { EditScope, AttachmentLocal } from 'types';
import { FREQUENCY_OPTIONS } from 'utils/transactionLabels';
import { buildFormPatch } from 'utils/buildFormPatch';

// ─── Form ─────────────────────────────────────────────────────────────────────

interface EditFormValues {
  amount: number;
  description: string;
  date: Date;
  status: TransactionStatusEnum;
}

const formSchema = z.object({
  amount: z.number().min(0.01, 'Informe o valor'),
  description: z.string().min(1, 'Informe o nome da transação'),
  date: z.date(),
  status: z.enum(TransactionStatusEnum),
});

// ─── Tela ─────────────────────────────────────────────────────────────────────

export default function EditTransactionScreen() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const router = useRouter();
  const { alertConfig, visible, hideAlert, showSuccess, showError, showInfo, showConfirm } = useCustomAlert();

  const params = useLocalSearchParams<{
    transactionId: string;
    categoryId: string;
    categoryName: string;
    categoryIcon: string;
    categoryColor: string;
    currentAmount: string;
    currentDescription: string;
    currentType: string;
    currentDate: string;
    paymentType: string;
    totalInstallments: string;
    frequency: string;
    transactionGroupId: string;
    preSelectedScope: string;
    currentStatus: string;
  }>();

  const transactionId  = params.transactionId ?? '';
  const hasGroup       = !!params.transactionGroupId;
  const isInstallment  = params.paymentType === GroupTypeEnum.Installment;
  const isRecurring    = params.paymentType === GroupTypeEnum.Recurring;

  // Scope selector
  const scopeOptions: { value: EditScope; label: string; description: string }[] = [
    { value: 'only_this',        label: 'Apenas esta',     description: 'Edita somente a transação atual' },
    { value: 'from_this_forward', label: 'Esta e futuras', description: 'Edita esta e as próximas do grupo' },
    { value: 'all_related',      label: 'Todas do grupo',  description: 'Edita todas as transações do grupo' },
  ];

  const [selectedScope, setSelectedScope] = useState<EditScope>(
    (params.preSelectedScope as EditScope | undefined) ?? 'only_this',
  );

  // New attachments to add
  const [newAttachments, setNewAttachments] = useState<AttachmentLocal[]>([]);

  const { mutate: editTransaction, loading: saving } = useEditTransaction();
  const {
    data: existingAttachments,
    deleteAttachment,
    createAttachment,
  } = useAttachments(transactionId);

  const initialAmount = parseFloat(params.currentAmount ?? '0') || 0;

  const [amountDisplay, setAmountDisplay] = useState(() => {
    if (!params.currentAmount) return '';
    const n = parseFloat(params.currentAmount);
    if (!n) return '';
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  });

  const form = useForm({
    defaultValues: {
      amount:      initialAmount,
      description: params.currentDescription ?? '',
      date:        params.currentDate ? new Date(parseInt(params.currentDate, 10)) : new Date(),
      status:      (params.currentStatus as TransactionStatusEnum) ?? TransactionStatusEnum.Pending,
    } as EditFormValues,
    validators: {
      onChange: formSchema,
    },
    onSubmit: async ({ value }) => {
      const saveAttachmentsAndNavigate = async () => {
        for (const att of newAttachments) {
          const error = createAttachment({
            transactionId,
            title: att.title,
            originalName: att.originalName,
            fileType: att.fileType,
            fileSize: att.fileSize,
            data: att.base64,
            isReceipt: false,
            createdAt: Date.now(),
          });
          if (error) { showError('Erro ao salvar anexo', error); }
        }
        showSuccess('Transação atualizada!', undefined, 2000);
        setTimeout(() => router.back(), 2200);
      };

      const performEdit = (data: Parameters<typeof editTransaction>[0]['data']) => {
        editTransaction(
          {
            transactionId,
            transactionGroupId: hasGroup ? params.transactionGroupId : null,
            currentDate: params.currentDate ? parseInt(params.currentDate, 10) : Date.now(),
            scope: selectedScope,
            data,
          },
          saveAttachmentsAndNavigate,
          (err) => { showError('Erro ao salvar', err); },
        );
      };

      if (selectedScope === 'only_this') {
        performEdit({
          amount:      value.amount,
          description: value.description,
          date:        value.date.getTime(),
          status:      value.status,
          paidAt:      value.status === TransactionStatusEnum.Paid ? Date.now() : null,
        });
        return;
      }

      // Bulk scope: montar patch apenas com campos alterados
      const fieldMeta = form.store.state.fieldMeta;
      const patch = buildFormPatch(fieldMeta, value as unknown as Record<string, unknown>);

      if (Object.keys(patch).length === 0) {
        showInfo('Nenhuma alteração detectada', 'Altere ao menos um campo para salvar.');
        return;
      }

      const warnings: string[] = [];
      if ('description' in patch) warnings.push('o nome');
      if ('date' in patch) warnings.push('a data');

      const data: Parameters<typeof editTransaction>[0]['data'] = {};
      if ('amount' in patch) data.amount = value.amount;
      if ('description' in patch) data.description = value.description;
      if ('date' in patch) data.date = value.date.getTime();
      if ('status' in patch) {
        data.status = value.status;
        data.paidAt = value.status === TransactionStatusEnum.Paid ? Date.now() : null;
      }

      if (warnings.length > 0) {
        const fieldList = warnings.join(' e ');
        const scopeLabel = selectedScope === 'all_related' ? 'todas as transações do grupo' : 'esta e as futuras transações do grupo';
        showConfirm(
          'Atenção',
          `${fieldList.charAt(0).toUpperCase() + fieldList.slice(1)} ${warnings.length > 1 ? 'serão alterados' : 'será alterado'} em ${scopeLabel}. Deseja continuar?`,
          () => performEdit(data),
        );
        return;
      }

      performEdit(data);
    },
  });

  const handleAmountChange = useCallback(
    (text: string, handleChange: (v: number) => void) => {
      const digits = text.replace(/\D/g, '');
      if (!digits) { setAmountDisplay(''); handleChange(0); return; }
      const numeric = parseFloat(digits) / 100;
      setAmountDisplay(
        numeric.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      );
      handleChange(numeric);
    },
    [],
  );

  const isIncome = params.currentType === TransactionTypeEnum.Income;

  return (
    <ScreenWrapper style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 16,
          gap: 12,
        }}
      >
        <ActionButton icon="arrow-left" onPress={() => router.back()} />
        <Text style={{ flex: 1, color: colors.textPrimary, fontWeight: '700', fontSize: 20 }}>
          Editar Transação
        </Text>
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: isIncome ? colors.incomeColor + '20' : colors.expenseColor + '20',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: isIncome ? colors.incomeColor : colors.expenseColor }}>
            {isIncome ? 'Receita' : 'Despesa'}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: TAB_BAR_HEIGHT, gap: 20 }}
      >
        {/* Scope — only when hasGroup */}
        {hasGroup && (
          <View
            style={{
              backgroundColor: colors.cardBackground,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.borderColor,
            }}
          >
            <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 15, marginBottom: 12 }}>
              O que deseja editar?
            </Text>
            <View style={{ gap: 8 }}>
              {scopeOptions.map((option) => {
                const selected = selectedScope === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setSelectedScope(option.value)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      padding: 14,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: selected ? colors.primaryGold : colors.borderColor,
                      backgroundColor: selected ? colors.primaryGold + '15' : colors.iconBackground,
                    }}
                  >
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 2,
                        borderColor: selected ? colors.primaryGold : colors.borderColor,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: selected ? colors.primaryGold : 'transparent',
                      }}
                    >
                      {selected && <Feather name="check" size={12} color={colors.primaryGoldContrast} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 14 }}>
                        {option.label}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                        {option.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Valor */}
        <form.Field name="amount">
          {(field) => (
            <View>
              <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 15, marginBottom: 8 }}>
                Valor
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.cardBackground,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderWidth: 1,
                  borderColor: field.state.meta.errors.length > 0 ? colors.expenseColor : colors.borderColor,
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 18, marginRight: 8 }}>R$</Text>
                <TextInput
                  style={{ flex: 1, color: colors.textPrimary, fontSize: 24, fontWeight: '700' }}
                  placeholder="0,00"
                  placeholderTextColor={colors.textSecondary}
                  value={amountDisplay}
                  onChangeText={(t) => handleAmountChange(t, field.handleChange)}
                  keyboardType="numeric"
                />
              </View>
              {field.state.meta.errors[0] && (
                <Text style={{ color: colors.expenseColor, fontSize: 12, marginTop: 4 }}>
                  {String(field.state.meta.errors[0])}
                </Text>
              )}
            </View>
          )}
        </form.Field>

        {/* Nome */}
        <form.Field name="description">
          {(field) => (
            <View>
              <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 15, marginBottom: 8 }}>
                Nome
              </Text>
              <View
                style={{
                  backgroundColor: colors.cardBackground,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderWidth: 1,
                  borderColor: field.state.meta.errors.length > 0 ? colors.expenseColor : colors.borderColor,
                }}
              >
                <TextInput
                  style={{ color: colors.textPrimary, fontSize: 15 }}
                  placeholder="Nome da transação"
                  placeholderTextColor={colors.textSecondary}
                  value={field.state.value}
                  onChangeText={field.handleChange}
                />
              </View>
              {field.state.meta.errors[0] && (
                <Text style={{ color: colors.expenseColor, fontSize: 12, marginTop: 4 }}>
                  {String(field.state.meta.errors[0])}
                </Text>
              )}
            </View>
          )}
        </form.Field>

        {/* Data */}
        <form.Field name="date">
          {(field) => (
            <View>
              <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 15, marginBottom: 8 }}>
                Data
              </Text>
              <DatePicker
                data={field.state.value}
                onChangeData={field.handleChange}
              />
            </View>
          )}
        </form.Field>

        {/* Status */}
        <form.Field name="status">
          {(field) => (
            <View>
              <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 15, marginBottom: 8 }}>
                Status
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  backgroundColor: colors.cardBackground,
                  borderRadius: 12,
                  padding: 4,
                  borderWidth: 1,
                  borderColor: colors.borderColor,
                }}
              >
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    alignItems: 'center',
                    backgroundColor:
                      field.state.value === TransactionStatusEnum.Pending
                        ? colors.expenseColor
                        : 'transparent',
                  }}
                  onPress={() => field.handleChange(TransactionStatusEnum.Pending)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      fontWeight: '600',
                      color:
                        field.state.value === TransactionStatusEnum.Pending
                          ? '#fff'
                          : colors.textSecondary,
                    }}
                  >
                    Pendente
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    alignItems: 'center',
                    backgroundColor:
                      field.state.value === TransactionStatusEnum.Paid
                        ? colors.incomeColor
                        : 'transparent',
                  }}
                  onPress={() => field.handleChange(TransactionStatusEnum.Paid)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      fontWeight: '600',
                      color:
                        field.state.value === TransactionStatusEnum.Paid
                          ? '#fff'
                          : colors.textSecondary,
                    }}
                  >
                    Pago
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </form.Field>

        {/* Informações somente-leitura */}
        <View
          style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            padding: 16,
            gap: 12,
            borderWidth: 1,
            borderColor: colors.borderColor,
          }}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 }}>
            INFORMAÇÕES FIXAS
          </Text>

          {/* Categoria */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: (params.categoryColor || colors.primaryGold) + '20',
                }}
              >
                <Feather
                  name={(params.categoryIcon || 'tag') as any}
                  size={16}
                  color={params.categoryColor || colors.primaryGold}
                />
              </View>
              <Text style={{ color: colors.textPrimary, fontWeight: '500' }}>
                {params.categoryName || 'Sem categoria'}
              </Text>
            </View>
            <Feather name="lock" size={14} color={colors.textSecondary} />
          </View>

          {/* Tipo de pagamento */}
          {(isInstallment || isRecurring) && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather
                  name={isInstallment ? 'credit-card' : 'repeat'}
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={{ color: colors.textPrimary, fontWeight: '500' }}>
                  {isInstallment
                    ? `Parcelado (${params.totalInstallments}x)`
                    : `Recorrente · ${FREQUENCY_OPTIONS.find((f) => f.key === params.frequency)?.label ?? params.frequency}`}
                </Text>
              </View>
              <Feather name="lock" size={14} color={colors.textSecondary} />
            </View>
          )}
        </View>

        {/* Anexos existentes */}
        {existingAttachments.filter((a) => !a.isReceipt).length > 0 && (
          <View>
            <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 15, marginBottom: 8 }}>
              Anexos existentes
            </Text>
            <View style={{ gap: 8 }}>
              {existingAttachments
                .filter((a) => !a.isReceipt)
                .map((att) => (
                  <View
                    key={att.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: colors.cardBackground,
                      borderRadius: 12,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: colors.borderColor,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <Feather
                        name={att.fileType.startsWith('image/') ? 'image' : 'file-text'}
                        size={18}
                        color={colors.primaryGold}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.textPrimary, fontWeight: '500', fontSize: 14 }} numberOfLines={1}>
                          {att.title}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                          {(att.fileSize / 1024).toFixed(0)} KB
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => deleteAttachment(att.id)}
                      activeOpacity={0.7}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: colors.expenseColor + '20',
                      }}
                    >
                      <Feather name="trash-2" size={14} color={colors.expenseColor} />
                    </TouchableOpacity>
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* Novos anexos */}
        <View>
          <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 15, marginBottom: 8 }}>
            Adicionar Anexos
          </Text>
          <AttachmentPicker
            attachments={newAttachments}
            onAttachmentsChange={setNewAttachments}
            maxAttachments={5 - existingAttachments.filter((a) => !a.isReceipt).length}
            onError={(msg) => showError('Erro no anexo', msg)}
          />
        </View>

        {/* Salvar */}
        <AppButton
          label={saving ? 'Salvando...' : 'Salvar Alterações'}
          onPress={() => form.handleSubmit()}
          disabled={saving}
          variant="primary"
          size="full"
        />
      </ScrollView>

      {alertConfig && (
        <CustomAlert
          visible={visible}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          onClose={hideAlert}
          buttons={alertConfig.buttons}
          autoClose={alertConfig.autoClose}
        />
      )}
    </ScreenWrapper>
  );
}
