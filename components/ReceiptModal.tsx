import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { AttachmentPicker } from 'components/AttachmentPicker';
import { useAttachments } from 'hooks/useAttachments';
import { useBreakpoint } from 'hooks/useBreakpoint';
import { generateId } from 'utils/generateId';
import type { AttachmentLocal } from 'types';

interface ReceiptModalProps {
  visible: boolean;
  transactionId: string;
  onClose: () => void;
  onSuccess: () => void;
  onSkip: () => void;
}

export function ReceiptModal({
  visible,
  transactionId,
  onClose,
  onSuccess,
  onSkip,
}: ReceiptModalProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const { isTablet } = useBreakpoint();
  const [attachments, setAttachments] = useState<AttachmentLocal[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { createReceipt } = useAttachments(transactionId);

  const handleSend = async () => {
    if (attachments.length === 0) return;
    setSaving(true);
    setErrorMsg(null);

    const item = attachments[0];
    const err = createReceipt({
      id: generateId(),
      transactionId,
      title: item.title,
      originalName: item.originalName,
      fileType: item.fileType,
      fileSize: item.fileSize,
      data: item.base64,
      isReceipt: true,
      createdAt: Date.now(),
    });

    setSaving(false);
    if (err) {
      setErrorMsg(err);
    } else {
      setAttachments([]);
      onSuccess();
    }
  };

  const handleSkip = () => {
    setAttachments([]);
    setErrorMsg(null);
    onSkip();
  };

  const handleClose = () => {
    setAttachments([]);
    setErrorMsg(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: isTablet ? 'center' : 'flex-end',
          alignItems: isTablet ? 'center' : undefined,
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: isTablet ? 24 : 0,
        }}
      >
        <View
          style={{
            backgroundColor: colors.cardBackground,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderRadius: isTablet ? 24 : undefined,
            width: isTablet ? '100%' : undefined,
            maxWidth: isTablet ? 520 : undefined,
            padding: 24,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 18 }}>
              Adicionar Comprovante
            </Text>
            <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
              <Feather name="x" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={{ color: colors.textSecondary, fontSize: 15, marginBottom: 20 }}>
            Deseja adicionar um comprovante de pagamento para esta transação?
          </Text>

          <AttachmentPicker
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            maxAttachments={1}
            isReceipt
            onError={(msg) => setErrorMsg(msg)}
          />

          {errorMsg && (
            <Text
              style={{ color: colors.expenseColor, fontSize: 13, marginTop: 8, textAlign: 'center' }}
            >
              {errorMsg}
            </Text>
          )}

          {/* Botões */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
            <TouchableOpacity
              onPress={handleSkip}
              disabled={saving}
              activeOpacity={0.7}
              style={{
                flex: 1,
                paddingVertical: 16,
                borderRadius: 12,
                alignItems: 'center',
                backgroundColor: colors.iconBackground,
              }}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 15 }}>
                Pular
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSend}
              disabled={attachments.length === 0 || saving}
              activeOpacity={0.7}
              style={{
                flex: 1,
                paddingVertical: 16,
                borderRadius: 12,
                alignItems: 'center',
                backgroundColor:
                  attachments.length > 0 ? colors.primaryGold : colors.iconBackground,
                opacity: attachments.length > 0 ? 1 : 0.5,
              }}
            >
              {saving ? (
                <ActivityIndicator
                  size="small"
                  color={attachments.length > 0 ? colors.primaryGoldContrast : colors.textSecondary}
                />
              ) : (
                <Text
                  style={{
                    fontWeight: '600',
                    fontSize: 15,
                    color:
                      attachments.length > 0
                        ? colors.primaryGoldContrast
                        : colors.textSecondary,
                  }}
                >
                  Enviar
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
