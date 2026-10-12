import React, { useCallback, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { ScreenWrapper, TAB_BAR_HEIGHT } from 'components/ScreenWrapper';
import { useBreakpoint } from 'hooks/useBreakpoint';
import { ActionButton } from 'components/ActionButton';
import { AppButton } from 'components/AppButton';
import { AttachmentViewer } from 'components/AttachmentViewer';
import { DatePicker } from 'components/DatePicker';
import { AttachmentPicker } from 'components/AttachmentPicker';
import { CustomAlert } from 'components/CustomAlert';
import { useEditTransaction } from 'hooks/useEditTransaction';
import { useAttachments } from 'hooks/useAttachments';
import { useCustomAlert } from 'hooks/useCustomAlert';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { TransactionStatusEnum, TransactionTypeEnum, GroupTypeEnum } from 'types';
import type { Attachment, EditScope, AttachmentLocal } from 'types';
import { FREQUENCY_OPTIONS } from 'utils/transactionLabels';
import { buildFormPatch } from 'utils/buildFormPatch';

// ─── Animation constants ──────────────────────────────────────────────────────
const SPRING_MODAL = { damping: 55, stiffness: 700 } as const;

const getFieldError = (error: unknown): string => {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message);
  return '';
};

// ─── Form ─────────────────────────────────────────────────────────────────────

interface EditFormValues {
  amount: number;
  description: string;
  date: Date;
  status: TransactionStatusEnum;
  isSubscription: boolean;
}

const formSchema = z.object({
  amount: z.number().min(0, 'Informe o valor'),
  description: z.string().min(1, 'Informe o nome da transação'),
  date: z.date(),
  status: z.enum(TransactionStatusEnum),
  isSubscription: z.boolean(),
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
    currentExpenseClassification: string;
    currentIsSubscription: string;
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
      isSubscription: params.currentIsSubscription === 'true',
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
          isSubscription: value.isSubscription,
        });
        return;
      }

      // Bulk scope: montar patch apenas com campos alterados
      const fieldMeta = form.store.state.fieldMeta as Record<string, { isDefaultValue: boolean }>;
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
      if ('isSubscription' in patch) data.isSubscription = value.isSubscription;

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

  // ─── Viewer & action sheet ────────────────────────────────────────────────────
  const [viewerAttachment, setViewerAttachment] = useState<Attachment | null>(null);
  const [actionSheetAttachment, setActionSheetAttachment] = useState<Attachment | null>(null);

  const sheetTranslateY = useSharedValue(300);
  const overlayOpacity = useSharedValue(0);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const openActionSheet = (att: Attachment) => {
    setActionSheetAttachment(att);
    sheetTranslateY.value = withSpring(0, SPRING_MODAL);
    overlayOpacity.value = withTiming(1, { duration: 180 });
  };

  const closeActionSheet = () => {
    sheetTranslateY.value = withTiming(300, { duration: 150 });
    overlayOpacity.value = withTiming(0, { duration: 150 }, (finished) => {
      if (finished) runOnJS(setActionSheetAttachment)(null);
    });
  };

  const getAttachmentTempUri = async (att: Attachment): Promise<string> => {
    const isImg = att.fileType.startsWith('image/');
    const ext = isImg ? (att.fileType.split('/')[1] ?? 'jpg') : 'pdf';
    const fileUri = `${FileSystem.cacheDirectory}anexo_${Date.now()}.${ext}`;
    await FileSystem.writeAsStringAsync(fileUri, att.data, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return fileUri;
  };

  const handleActionView = () => {
    const att = actionSheetAttachment;
    closeActionSheet();
    if (att) setTimeout(() => setViewerAttachment(att), 160);
  };

  const handleActionDownload = async () => {
    const att = actionSheetAttachment;
    if (!att) return;
    closeActionSheet();
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        showError('Permissão negada', 'Permissão de armazenamento necessária para baixar.');
        return;
      }
      const fileUri = await getAttachmentTempUri(att);
      if (att.fileType.startsWith('image/')) {
        await MediaLibrary.saveToLibraryAsync(fileUri);
        showSuccess('Download concluído', 'Imagem salva na galeria!', 2500);
      } else {
        const destUri = `${FileSystem.documentDirectory}${att.originalName}`;
        await FileSystem.copyAsync({ from: fileUri, to: destUri });
        showSuccess('Download concluído', 'PDF salvo no dispositivo!', 2500);
      }
    } catch {
      showError('Erro ao baixar', 'Não foi possível salvar o arquivo.');
    }
  };

  const handleActionShare = async () => {
    const att = actionSheetAttachment;
    if (!att) return;
    closeActionSheet();
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        showError('Indisponível', 'Compartilhamento não disponível neste dispositivo.');
        return;
      }
      const fileUri = await getAttachmentTempUri(att);
      await Sharing.shareAsync(fileUri, {
        mimeType: att.fileType,
        dialogTitle: 'Compartilhar Anexo',
      });
    } catch {
      showError('Erro ao compartilhar', 'Não foi possível compartilhar o arquivo.');
    }
  };

  const { formMaxWidth } = useBreakpoint();

  return (
    <ScreenWrapper style={{ backgroundColor: colors.background }} maxWidth={formMaxWidth ?? 640}>
      {/* Header */}
      <View className="relative flex-row items-center justify-between px-4 py-4">
        <ActionButton icon="arrow-left" onPress={() => router.back()} />
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            alignItems: 'center',
            pointerEvents: 'none',
          }}>
          <Text className="text-xl font-bold" style={{ color: colors.textPrimary }}>
            Editar Transação
          </Text>
        </View>
        <View
          className="rounded-full px-3 py-1.5"
          style={{
            backgroundColor: isIncome ? colors.incomeColor + '20' : colors.expenseColor + '20',
          }}>
          <Text
            className="text-sm font-semibold"
            style={{ color: isIncome ? colors.incomeColor : colors.expenseColor }}>
            {isIncome ? 'Receita' : 'Despesa'}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: TAB_BAR_HEIGHT, gap: 20 }}>
        {/* Scope — only when hasGroup */}
        {hasGroup && (
          <View>
            <Text
              style={{
                color: colors.textPrimary,
                fontWeight: '600',
                fontSize: 15,
                marginBottom: 12,
              }}>
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
                    }}>
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
                      }}>
                      {selected && (
                        <Feather name="check" size={12} color={colors.primaryGoldContrast} />
                      )}
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
              <Text className="mb-3 text-base font-semibold" style={{ color: colors.textPrimary }}>
                Valor
              </Text>
              <View
                className="flex-row items-center rounded-2xl px-4"
                style={{
                  backgroundColor: colors.cardBackground,
                  borderWidth: 1,
                  borderColor:
                    field.state.meta.errors.length > 0 ? colors.expenseColor : colors.borderColor,
                  height: 52,
                }}>
                <Text className="mr-2 text-base" style={{ color: colors.textSecondary }}>
                  R$
                </Text>
                <TextInput
                  className="flex-1 text-2xl font-bold"
                  style={{ color: colors.textPrimary }}
                  placeholder="0,00"
                  placeholderTextColor={colors.textSecondary}
                  value={amountDisplay}
                  onChangeText={(t) => handleAmountChange(t, field.handleChange)}
                  keyboardType="numeric"
                />
              </View>
              {field.state.meta.errors[0] && (
                <Text className="mt-1 text-xs" style={{ color: colors.expenseColor }}>
                  {getFieldError(field.state.meta.errors[0])}
                </Text>
              )}
            </View>
          )}
        </form.Field>

        {/* Nome */}
        <form.Field name="description">
          {(field) => (
            <View>
              <Text className="mb-3 text-base font-semibold" style={{ color: colors.textPrimary }}>
                Nome
              </Text>
              <View
                className="rounded-2xl px-4"
                style={{
                  backgroundColor: colors.cardBackground,
                  borderWidth: 1,
                  borderColor:
                    field.state.meta.errors.length > 0 ? colors.expenseColor : colors.borderColor,
                  height: 52,
                  justifyContent: 'center',
                }}>
                <TextInput
                  className="text-base"
                  style={{ color: colors.textPrimary }}
                  placeholder="Nome da transação"
                  placeholderTextColor={colors.textSecondary}
                  value={field.state.value}
                  onChangeText={field.handleChange}
                />
              </View>
              {field.state.meta.errors[0] && (
                <Text className="mt-1 text-xs" style={{ color: colors.expenseColor }}>
                  {getFieldError(field.state.meta.errors[0])}
                </Text>
              )}
            </View>
          )}
        </form.Field>

        {/* Data */}
        <form.Field name="date">
          {(field) => (
            <View>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontWeight: '600',
                  fontSize: 15,
                }}>
              </Text>
              <DatePicker data={field.state.value} onChangeData={field.handleChange} />
            </View>
          )}
        </form.Field>

        {/* Status */}
        <form.Field name="status">
          {(field) => (
            <View>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontWeight: '600',
                  fontSize: 15,
                  marginBottom: 8,
                }}>
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
                }}>
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
                  activeOpacity={0.7}>
                  <Text
                    style={{
                      fontWeight: '600',
                      color:
                        field.state.value === TransactionStatusEnum.Pending
                          ? '#fff'
                          : colors.textSecondary,
                    }}>
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
                  activeOpacity={0.7}>
                  <Text
                    style={{
                      fontWeight: '600',
                      color:
                        field.state.value === TransactionStatusEnum.Paid
                          ? '#fff'
                          : colors.textSecondary,
                    }}>
                    Pago
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </form.Field>

        {/* Assinatura */}
        {params.paymentType === 'recurring' && (
          <form.Field name="isSubscription">
            {(field) => (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => field.handleChange(!field.state.value)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderRadius: 12,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: field.state.value ? colors.primaryGold : colors.borderColor,
                  backgroundColor: colors.cardBackground,
                }}>
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    marginRight: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: field.state.value ? colors.primaryGold : 'transparent',
                    borderWidth: 2,
                    borderColor: field.state.value ? colors.primaryGold : colors.borderColor,
                  }}>
                  {field.state.value && (
                    <Feather name="check" size={12} color={colors.primaryGoldContrast} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 14 }}>
                    É uma assinatura
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    Netflix, Spotify, planos mensais...
                  </Text>
                </View>
                <Feather
                  name="repeat"
                  size={16}
                  color={field.state.value ? colors.primaryGold : colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </form.Field>
        )}

        {/* Informações somente-leitura */}
        <View
          style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            padding: 16,
            gap: 12,
            borderWidth: 1,
            borderColor: colors.borderColor,
          }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 12,
              fontWeight: '600',
              letterSpacing: 0.5,
            }}>
            INFORMAÇÕES FIXAS
          </Text>

          {/* Categoria */}
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: (params.categoryColor || colors.primaryGold) + '20',
                }}>
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
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
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
            <Text className="text-light-text-primary dark:text-dark-text-primary font-semibold text-[15px] mb-2">
              Anexos existentes
            </Text>
            <View className="gap-2">
              {existingAttachments
                .filter((a) => !a.isReceipt)
                .map((att) => (
                  <TouchableOpacity
                    key={att.id}
                    onPress={() => openActionSheet(att)}
                    activeOpacity={0.7}
                    className="flex-row items-center bg-light-card-background dark:bg-dark-card-background rounded-xl p-3 border border-light-border-color dark:border-dark-border-color gap-3">
                    {/* Miniatura */}
                    <View className="w-14 h-14 rounded-[10px] overflow-hidden bg-light-icon-background dark:bg-dark-icon-background items-center justify-center">
                      {att.fileType.startsWith('image/') ? (
                        <Image
                          source={{ uri: `data:${att.fileType};base64,${att.data}` }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Feather name="file-text" size={24} color={colors.primaryGold} />
                      )}
                    </View>
                    {/* Info */}
                    <View className="flex-1">
                      <Text
                        className="text-light-text-primary dark:text-dark-text-primary font-medium text-sm"
                        numberOfLines={1}>
                        {att.title}
                      </Text>
                      <Text className="text-light-text-secondary dark:text-dark-text-secondary text-xs mt-0.5">
                        {(att.fileSize / 1024).toFixed(0)} KB
                      </Text>
                    </View>
                    {/* Botões: menu + excluir */}
                    <View className="flex-row items-center gap-2">
                      <TouchableOpacity
                        onPress={() => deleteAttachment(att.id)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        className="w-8 h-8 rounded-lg items-center justify-center bg-light-expense-color/20 dark:bg-dark-expense-color/20">
                        <Feather name="trash-2" size={14} color={colors.expenseColor} />
                      </TouchableOpacity>
                      <View className="w-8 h-8 rounded-full items-center justify-center bg-light-primary-gold/20 dark:bg-dark-primary-gold/20">
                        <Feather name="more-vertical" size={14} color={colors.primaryGold} />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
            </View>
          </View>
        )}

        {/* Novos anexos */}
        <Text className="text-base font-semibold" style={{ color: colors.textPrimary }}>
          Adicionar Anexos
        </Text>
        <View
          className="rounded-2xl p-4"
          style={{
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.borderColor,
          }}>
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

      {/* Visualizador de anexo */}
      {viewerAttachment && (
        <AttachmentViewer
          attachment={viewerAttachment}
          visible
          onClose={() => setViewerAttachment(null)}
        />
      )}

      {/* Action sheet de anexo */}
      <Modal
        visible={actionSheetAttachment !== null}
        transparent
        animationType="none"
        onRequestClose={closeActionSheet}
        statusBarTranslucent>
        <View className="flex-1 justify-end">
          <Animated.View
            className="absolute inset-0"
            style={[{ backgroundColor: 'rgba(0,0,0,0.5)' }, overlayStyle]}>
            <TouchableOpacity className="flex-1" activeOpacity={1} onPress={closeActionSheet} />
          </Animated.View>
          <Animated.View
            className="bg-light-card-background dark:bg-dark-card-background rounded-t-3xl p-6 pb-10"
            style={sheetStyle}>
            {/* Cabeçalho: info do arquivo */}
            <View className="flex-row items-center gap-3 mb-5">
              <View className="w-12 h-12 rounded-[10px] overflow-hidden bg-light-icon-background dark:bg-dark-icon-background items-center justify-center">
                {actionSheetAttachment?.fileType.startsWith('image/') ? (
                  <Image
                    source={{
                      uri: `data:${actionSheetAttachment.fileType};base64,${actionSheetAttachment.data}`,
                    }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                ) : (
                  <Feather name="file-text" size={22} color={colors.primaryGold} />
                )}
              </View>
              <View className="flex-1">
                <Text
                  className="text-light-text-primary dark:text-dark-text-primary font-semibold text-[15px]"
                  numberOfLines={1}>
                  {actionSheetAttachment?.title}
                </Text>
                <Text className="text-light-text-secondary dark:text-dark-text-secondary text-xs mt-0.5">
                  {actionSheetAttachment
                    ? `${(actionSheetAttachment.fileSize / 1024).toFixed(0)} KB`
                    : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={closeActionSheet}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {/* Ações */}
            <View className="gap-2">
              {/* Visualizar */}
              <TouchableOpacity
                onPress={handleActionView}
                activeOpacity={0.7}
                className="flex-row items-center gap-3.5 p-4 rounded-xl bg-light-icon-background dark:bg-dark-icon-background">
                <View className="w-10 h-10 rounded-[10px] items-center justify-center bg-light-primary-gold/20 dark:bg-dark-primary-gold/20">
                  <Feather name="eye" size={18} color={colors.primaryGold} />
                </View>
                <Text className="text-light-text-primary dark:text-dark-text-primary font-semibold text-[15px]">
                  Visualizar
                </Text>
              </TouchableOpacity>
              {/* Baixar */}
              <TouchableOpacity
                onPress={handleActionDownload}
                activeOpacity={0.7}
                className="flex-row items-center gap-3.5 p-4 rounded-xl bg-light-icon-background dark:bg-dark-icon-background">
                <View className="w-10 h-10 rounded-[10px] items-center justify-center bg-light-income-color/20 dark:bg-dark-income-color/20">
                  <Feather name="download" size={18} color={colors.incomeColor} />
                </View>
                <Text className="text-light-text-primary dark:text-dark-text-primary font-semibold text-[15px]">
                  Baixar
                </Text>
              </TouchableOpacity>
              {/* Compartilhar */}
              <TouchableOpacity
                onPress={handleActionShare}
                activeOpacity={0.7}
                className="flex-row items-center gap-3.5 p-4 rounded-xl bg-light-icon-background dark:bg-dark-icon-background">
                <View className="w-10 h-10 rounded-[10px] items-center justify-center bg-light-primary-gold/20 dark:bg-dark-primary-gold/20">
                  <Feather name="share-2" size={18} color={colors.primaryGold} />
                </View>
                <Text className="text-light-text-primary dark:text-dark-text-primary font-semibold text-[15px]">
                  Compartilhar
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}
