import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { TransactionStatusEnum, TransactionTypeEnum, GroupTypeEnum } from 'types';
import { useUpdateTransactionStatus } from 'hooks/useUpdateTransactionStatus';
import { EditScopeModal } from 'components/EditScopeModal';
import { TransactionDetailsModal } from 'components/TransactionDetailsModal';
import { ReceiptModal } from 'components/ReceiptModal';
import type { TransactionWithCategory, EditScope } from 'types';
import { formatCurrency } from 'utils/formatCurrency';

interface TransactionItemProps {
  transaction: TransactionWithCategory;
  onPress?: () => void;
  /**
   * - `card`: card com borderRadius, marginBottom e fundo próprio (uso isolado)
   * - `simple`: fundo plano com borderBottom (uso em lista com separador)
   * - `flat`: fundo plano sem bordas, sem marginBottom — para uso dentro de
   *           PaginatedList onde o container cuida dos separadores
   */
  variant?: 'card' | 'simple' | 'flat';
  showTime?: boolean;
  onStatusChanged?: () => void;
  /** Quando true, exibe o modal de comprovante ao marcar como pago. @default true */
  askForReceipt?: boolean;
}

export function TransactionItem({
  transaction,
  onPress,
  variant = 'card',
  showTime = false,
  onStatusChanged,
  askForReceipt = true,
}: TransactionItemProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const router = useRouter();

  const swipeableRef = useRef<Swipeable>(null);

  const [showScopeModal, setShowScopeModal]     = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const { mutate: updateStatus, loading: updatingStatus } = useUpdateTransactionStatus();

  const isPaid   = transaction.status === TransactionStatusEnum.Paid;
  const isIncome = transaction.type === TransactionTypeEnum.Income;
  const hasGroup = !!transaction.transactionGroupId;
  const isInstallment = transaction.group?.type === GroupTypeEnum.Installment;

  const handleTogglePaid = () => {
    const nextStatus = isPaid ? TransactionStatusEnum.Pending : TransactionStatusEnum.Paid;

    updateStatus(
      transaction.id,
      nextStatus,
      () => {
        swipeableRef.current?.close();
        if (!isPaid && askForReceipt) {
          setShowReceiptModal(true);
        }
        onStatusChanged?.();
      },
    );
  };

  const handleEditPress = () => {
    setShowScopeModal(true);
  };

  const handleScopeSelect = (scope: EditScope) => {
    setShowScopeModal(false);
    router.push({
      pathname: '/(stack)/editTransaction',
      params: {
        transactionId: transaction.id,
        categoryId: transaction.categoryId ?? '',
        categoryName: transaction.category?.name ?? '',
        categoryIcon: transaction.category?.icon ?? '',
        categoryColor: transaction.category?.color ?? '',
        currentAmount: transaction.amount.toString(),
        currentDescription: transaction.description,
        currentType: transaction.type,
        currentDate: transaction.date.toString(),
        paymentType: hasGroup
          ? (transaction.group?.type ?? 'single')
          : 'single',
        totalInstallments: transaction.group?.totalInstallments?.toString() ?? '',
        frequency: transaction.group?.frequency ?? '',
        transactionGroupId: transaction.transactionGroupId ?? '',
        preSelectedScope: scope,
        currentStatus: transaction.status,
        currentIsSubscription: transaction.isSubscription ? 'true' : 'false',
      },
    });
  };

  const handleItemPress = () => {
    if (onPress) {
      onPress();
    } else {
      setShowDetailsModal(true);
    }
  };

  const renderRightAction = () => (
    <TouchableOpacity
      onPress={handleTogglePaid}
      disabled={updatingStatus}
      activeOpacity={0.85}
      style={{
        flex: 1,
        minWidth: 88,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isPaid ? colors.expenseColor : colors.incomeColor,
        borderTopRightRadius: variant === 'card' ? 16 : 0,
        borderBottomRightRadius: variant === 'card' ? 16 : 0,
        marginBottom: variant === 'card' ? 12 : 0,
      }}
    >
      <Feather
        name={isPaid ? 'x-circle' : 'check-circle'}
        size={26}
        color="#fff"
      />
      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', marginTop: 4, textAlign: 'center' }}>
        {isPaid ? 'DESMARCAR' : 'MARCAR'}{'\n'}PAGO
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightAction}
        rightThreshold={70}
        overshootRight={false}>
        <TouchableOpacity
          onPress={handleItemPress}
          activeOpacity={0.7}
          style={
            variant === 'card'
              ? {
                  backgroundColor: colors.cardBackground,
                  borderRadius: 16,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }
              : variant === 'flat'
              ? {
                  backgroundColor: colors.cardBackground,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                }
              : {
                  backgroundColor: colors.cardBackground,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.borderColor,
                }
          }>
          {/* Ícone + Info */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: (transaction.category?.color ?? colors.primaryGold) + '20',
              }}>
              <Feather
                name={(transaction.category?.icon ?? 'tag') as any}
                size={variant === 'card' ? 22 : 20}
                color={transaction.category?.color ?? colors.primaryGold}
              />
            </View>

            <View style={{ flex: 1, marginRight: 8 }}>
              <Text
                style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 15 }}
                numberOfLines={2}>
                {transaction.description}
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 2,
                  flexWrap: 'wrap',
                }}>
                {isInstallment &&
                  transaction.installmentNumber &&
                  transaction.group?.totalInstallments && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Feather name="credit-card" size={11} color={colors.textSecondary} />
                      <Text
                        style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500' }}>
                        {transaction.installmentNumber}/{transaction.group.totalInstallments}x
                      </Text>
                    </View>
                  )}
              </View>

              <Text
                style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}
                numberOfLines={1}>
                {transaction.category?.name ?? 'Sem categoria'}
                {(variant === 'card' || variant === 'flat') &&
                  ` · ${new Date(transaction.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`}
              </Text>
            </View>
          </View>

          {/* Valor + Status + Editar */}

          <View className="flex flex-row gap-2 items-center">
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text
                style={{
                  fontWeight: '700',
                  fontSize: 15,
                  color: isIncome ? colors.incomeColor : colors.expenseColor,
                }}>
                {isIncome ? '+' : '-'}
                {formatCurrency(transaction.amount)}
              </Text>

              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: isPaid ? colors.incomeColor : colors.expenseColor,
                }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#fff' }}>
                  {isPaid ? 'Pago' : 'Pendente'}
                </Text>
              </View>
            </View>

            <View>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleEditPress();
                }}
                activeOpacity={0.7}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.iconBackground,
                }}>
                <Feather
                  name="edit-2"
                  size={variant === 'card' ? 13 : 12}
                  color={colors.primaryGold}
                />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>

      <EditScopeModal
        visible={showScopeModal}
        onClose={() => setShowScopeModal(false)}
        onSelectScope={handleScopeSelect}
        hasGroup={hasGroup}
      />

      <TransactionDetailsModal
        visible={showDetailsModal}
        transaction={transaction}
        onClose={() => setShowDetailsModal(false)}
        onEdit={() => {
          setShowDetailsModal(false);
          handleEditPress();
        }}
      />

      <ReceiptModal
        visible={showReceiptModal}
        transactionId={transaction.id}
        onClose={() => setShowReceiptModal(false)}
        onSuccess={() => {
          setShowReceiptModal(false);
          onStatusChanged?.();
        }}
        onSkip={() => setShowReceiptModal(false)}
      />
    </>
  );
}
