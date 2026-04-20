import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { TransactionStatusEnum, TransactionTypeEnum, GroupTypeEnum } from 'types';
import { AttachmentViewer } from 'components/AttachmentViewer';
import { useAttachments } from 'hooks/useAttachments';
import { useGroupPaidCount } from 'hooks/transactions/useGroupPaidCount';
import { useGroupAttachments } from 'hooks/attachments/useGroupAttachments';
import type { TransactionWithCategory, Attachment } from 'types';

interface TransactionDetailsModalProps {
  visible: boolean;
  transaction: TransactionWithCategory;
  onClose: () => void;
  onEdit: () => void;
}

function InfoRow({
  icon,
  label,
  value,
  valueColor,
  iconColor,
  iconBg,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  value: string;
  valueColor?: string;
  iconColor?: string;
  iconBg?: string;
}) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
          backgroundColor: iconBg ?? colors.iconBackground,
        }}
      >
        <Feather name={icon} size={18} color={iconColor ?? colors.textSecondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {label}
        </Text>
        <Text style={{ color: valueColor ?? colors.textPrimary, fontSize: 15, fontWeight: '600', marginTop: 2 }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const MONTH_NAMES = [
  'janeiro','fevereiro','março','abril','maio','junho',
  'julho','agosto','setembro','outubro','novembro','dezembro',
];

function formatFullDate(timestamp: number): string {
  const d = new Date(timestamp);
  const weekdays = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
  return `${weekdays[d.getDay()]}, ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]} de ${d.getFullYear()}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function TransactionDetailsModal({
  visible,
  transaction,
  onClose,
  onEdit,
}: TransactionDetailsModalProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);

  const { data: allAttachments, loading: loadingAttachments } = useAttachments(
    visible ? transaction.id : undefined,
  );

  const isPaid     = transaction.status === TransactionStatusEnum.Paid;
  const isIncome   = transaction.type === TransactionTypeEnum.Income;
  const typeColor  = isIncome ? colors.incomeColor : colors.expenseColor;
  const hasGroup   = !!transaction.transactionGroupId;
  const isInstallment = transaction.group?.type === GroupTypeEnum.Installment;

  const { paidCount } = useGroupPaidCount(
    visible && hasGroup ? transaction.transactionGroupId : null,
  );

  const groupAttachments = useGroupAttachments(
    visible && hasGroup ? transaction.transactionGroupId : null,
  );

  const receipt    = allAttachments.find((a) => a.isReceipt) ?? null;
  const annexes    = hasGroup ? groupAttachments.data : allAttachments.filter((a) => !a.isReceipt);
  const loadingAnnexes = hasGroup ? groupAttachments.loading : loadingAttachments;

  const paymentLabel = (() => {
    if (!hasGroup) return 'Pagamento único';
    if (isInstallment) {
      return `Parcelada ${transaction.installmentNumber ?? '-'}/${transaction.group?.totalInstallments ?? '-'}`;
    }
    return 'Recorrente';
  })();

  const paymentIcon: React.ComponentProps<typeof Feather>['name'] = !hasGroup
    ? 'check-circle'
    : isInstallment
    ? 'credit-card'
    : 'repeat';

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View
            style={{
              flex: 1,
              marginTop: 48,
              backgroundColor: colors.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              overflow: 'hidden',
              gap: 8,
            }}
          >
            {/* Hero header */}
            <View
              style={{
                backgroundColor: typeColor + '15',
                paddingHorizontal: 16,
                paddingTop: 16,
                paddingBottom: 32,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 24,
                }}
              >
                <TouchableOpacity
                  onPress={() => { onClose(); onEdit(); }}
                  activeOpacity={0.7}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.primaryGold + '30',
                  }}
                >
                  <Feather name="edit-2" size={18} color={colors.primaryGold} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.7}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.iconBackground,
                  }}
                >
                  <Feather name="x" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={{ alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                      backgroundColor: (transaction.category?.color ?? colors.primaryGold) + '30',
                    }}
                  >
                    <Feather
                      name={(transaction.category?.icon ?? 'tag') as any}
                      size={22}
                      color={transaction.category?.color ?? colors.primaryGold}
                    />
                  </View>
                  <View>
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                      {transaction.category?.name ?? 'Sem categoria'}
                    </Text>
                    <Text
                      style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 16 }}
                      numberOfLines={1}
                    >
                      {transaction.description}
                    </Text>
                  </View>
                </View>

                <Text style={{ color: typeColor, fontWeight: '700', fontSize: 36, marginTop: 8 }}>
                  {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
                </Text>

                <View
                  style={{
                    marginTop: 16,
                    paddingHorizontal: 20,
                    paddingVertical: 8,
                    borderRadius: 999,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: isPaid ? colors.incomeColor + '20' : colors.expenseColor + '20',
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: isPaid ? colors.incomeColor : colors.expenseColor,
                    }}
                  />
                  <Text
                    style={{
                      fontWeight: '600',
                      fontSize: 13,
                      color: isPaid ? colors.incomeColor : colors.expenseColor,
                    }}
                  >
                    {isPaid ? 'Pago' : 'Pendente'}
                  </Text>
                </View>
              </View>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
            >
              {/* Informações */}
              <View
                style={{
                  backgroundColor: colors.cardBackground,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontWeight: '700',
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    marginBottom: 8,
                  }}
                >
                  Informações
                </Text>
                <View style={{ borderTopWidth: 1, borderTopColor: colors.iconBackground, paddingTop: 8 }}>
                  <InfoRow icon="calendar" label="Data" value={formatFullDate(transaction.date)} />
                  <View style={{ height: 1, backgroundColor: colors.iconBackground }} />
                  <InfoRow icon={paymentIcon} label="Tipo de pagamento" value={paymentLabel} />

                  {isInstallment && transaction.group && (
                    <>
                      <View style={{ height: 1, backgroundColor: colors.iconBackground }} />
                      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12,
                            backgroundColor: colors.iconBackground,
                          }}
                        >
                          <Feather name="layers" size={18} color={colors.textSecondary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              color: colors.textSecondary,
                              fontSize: 11,
                              textTransform: 'uppercase',
                              letterSpacing: 0.8,
                            }}
                          >
                            Progresso
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                            <View
                              style={{
                                flex: 1,
                                height: 6,
                                backgroundColor: colors.iconBackground,
                                borderRadius: 3,
                                marginRight: 12,
                              }}
                            >
                              <View
                                style={{
                                  height: 6,
                                  borderRadius: 3,
                                  backgroundColor: colors.primaryGold,
                                  width: `${(paidCount / (transaction.group.totalInstallments ?? 1)) * 100}%`,
                                }}
                              />
                            </View>
                            <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
                              {paidCount}/{transaction.group.totalInstallments}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={{ height: 1, backgroundColor: colors.iconBackground }} />
                      <InfoRow
                        icon="hash"
                        label="Parcela"
                        value={`${transaction.installmentNumber ?? '-'} de ${transaction.group.totalInstallments ?? '-'}`}
                      />
                    </>
                  )}
                </View>
              </View>

              {/* Comprovante */}
              {isPaid && (
                <View
                  style={{
                    backgroundColor: colors.cardBackground,
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.textPrimary,
                        fontWeight: '700',
                        fontSize: 12,
                        textTransform: 'uppercase',
                        letterSpacing: 0.8,
                      }}
                    >
                      Comprovante
                    </Text>
                    {receipt && (
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 8,
                          backgroundColor: colors.incomeColor + '20',
                        }}
                      >
                        <Text style={{ color: colors.incomeColor, fontSize: 11, fontWeight: '600' }}>
                          Anexado
                        </Text>
                      </View>
                    )}
                  </View>

                  {loadingAttachments ? (
                    <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color={colors.primaryGold} />
                    </View>
                  ) : receipt ? (
                    <TouchableOpacity
                      onPress={() => setSelectedAttachment(receipt)}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: colors.iconBackground,
                        borderRadius: 12,
                        padding: 12,
                      }}
                    >
                      {receipt.fileType.startsWith('image/') ? (
                        <Image
                          source={{ uri: `data:${receipt.fileType};base64,${receipt.data}` }}
                          style={{ width: 56, height: 56, borderRadius: 10 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 10,
                            backgroundColor: colors.expenseColor + '20',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Feather name="file-text" size={24} color={colors.expenseColor} />
                        </View>
                      )}
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
                          {receipt.title}
                        </Text>
                        <Text style={{ color: colors.primaryGold, fontSize: 12, marginTop: 4 }}>
                          Toque para visualizar
                        </Text>
                      </View>
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 999,
                          backgroundColor: colors.primaryGold + '20',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Feather name="eye" size={14} color={colors.primaryGold} />
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: colors.iconBackground,
                        borderRadius: 12,
                        padding: 12,
                        opacity: 0.6,
                      }}
                    >
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 10,
                          backgroundColor: colors.iconBackground,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Feather name="file-text" size={22} color={colors.textSecondary} />
                      </View>
                      <Text style={{ color: colors.textSecondary, marginLeft: 12 }}>
                        Nenhum comprovante
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Anexos */}
              <View
                style={{
                  backgroundColor: colors.cardBackground,
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontWeight: '700',
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                    }}
                  >
                    Anexos
                  </Text>
                  {annexes.length > 0 && (
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 8,
                        backgroundColor: colors.primaryGold + '20',
                      }}
                    >
                      <Text style={{ color: colors.primaryGold, fontSize: 11, fontWeight: '600' }}>
                        {annexes.length} {annexes.length === 1 ? 'arquivo' : 'arquivos'}
                      </Text>
                    </View>
                  )}
                </View>

                {loadingAnnexes ? (
                  <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={colors.primaryGold} />
                  </View>
                ) : annexes.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      {annexes.map((attachment) => (
                        <TouchableOpacity
                          key={attachment.id}
                          onPress={() => setSelectedAttachment(attachment)}
                          activeOpacity={0.7}
                          style={{
                            width: 90,
                            backgroundColor: colors.iconBackground,
                            borderRadius: 12,
                            overflow: 'hidden',
                          }}
                        >
                          <View
                            style={{ width: '100%', height: 72, alignItems: 'center', justifyContent: 'center' }}
                          >
                            {attachment.fileType.startsWith('image/') ? (
                              <Image
                                source={{ uri: `data:${attachment.fileType};base64,${attachment.data}` }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover"
                              />
                            ) : (
                              <Feather name="file-text" size={28} color={colors.primaryGold} />
                            )}
                          </View>
                          <View style={{ padding: 8 }}>
                            <Text
                              style={{ color: colors.textPrimary, fontSize: 11, fontWeight: '500' }}
                              numberOfLines={1}
                            >
                              {attachment.title}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                ) : (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: colors.iconBackground,
                      borderRadius: 12,
                      padding: 12,
                      opacity: 0.6,
                    }}
                  >
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        backgroundColor: colors.iconBackground,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Feather name="paperclip" size={22} color={colors.textSecondary} />
                    </View>
                    <Text style={{ color: colors.textSecondary, marginLeft: 12 }}>
                      Nenhum anexo
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {selectedAttachment && (
        <AttachmentViewer
          attachment={selectedAttachment}
          visible
          onClose={() => setSelectedAttachment(null)}
        />
      )}
    </>
  );
}
