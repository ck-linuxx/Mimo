import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import type { Attachment } from 'types';

interface AttachmentViewerProps {
  attachment: Attachment;
  visible: boolean;
  onClose: () => void;
}

export function AttachmentViewer({ attachment, visible, onClose }: AttachmentViewerProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isImage = attachment.fileType.startsWith('image/');
  const ext = isImage ? (attachment.fileType.split('/')[1] ?? 'jpg') : 'pdf';

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 2500);
  };

  const getTempUri = async (): Promise<string> => {
    const fileName = `anexo_${Date.now()}.${ext}`;
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, attachment.data, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return fileUri;
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        showFeedback('error', 'Permissão de armazenamento negada');
        return;
      }
      const fileUri = await getTempUri();
      if (isImage) {
        await MediaLibrary.saveToLibraryAsync(fileUri);
        showFeedback('success', 'Imagem salva na galeria!');
      } else {
        const destUri = `${FileSystem.documentDirectory}${attachment.originalName}`;
        await FileSystem.copyAsync({ from: fileUri, to: destUri });
        showFeedback('success', 'PDF salvo no dispositivo!');
      }
    } catch {
      showFeedback('error', 'Erro ao baixar arquivo');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        showFeedback('error', 'Compartilhamento não disponível');
        return;
      }
      const fileUri = await getTempUri();
      await Sharing.shareAsync(fileUri, {
        mimeType: attachment.fileType,
        dialogTitle: 'Compartilhar Anexo',
      });
    } catch {
      showFeedback('error', 'Erro ao compartilhar');
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.cardBackground }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingHorizontal: 24,
            paddingTop: 56,
            paddingBottom: 16,
          }}
        >
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

        {/* Conteúdo */}
        <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
          {/* Imagem */}
          {isImage && (
            <View
              style={{
                borderRadius: 20,
                overflow: 'hidden',
                backgroundColor: colors.iconBackground,
                borderWidth: 1,
                borderColor: colors.borderColor,
                marginBottom: 24,
              }}
            >
              <Image
                source={{ uri: `data:${attachment.fileType};base64,${attachment.data}` }}
                style={{ width: '100%', height: 320 }}
                resizeMode="cover"
              />
            </View>
          )}

          {/* PDF */}
          {!isImage && (
            <View
              style={{
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 48,
                backgroundColor: colors.iconBackground,
                borderWidth: 1,
                borderColor: colors.borderColor,
                marginBottom: 24,
              }}
            >
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.primaryGold + '15',
                  marginBottom: 12,
                }}
              >
                <Feather name="file-text" size={48} color={colors.primaryGold} />
              </View>
              <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 16 }}>
                Documento PDF
              </Text>
              <Text
                style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}
                numberOfLines={1}
              >
                {attachment.originalName}
              </Text>
            </View>
          )}

          {/* Ações */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <TouchableOpacity
              onPress={handleDownload}
              disabled={downloading}
              activeOpacity={0.7}
              style={{ flex: 1, alignItems: 'center' }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.incomeColor + '20',
                  marginBottom: 8,
                }}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color={colors.incomeColor} />
                ) : (
                  <Feather name="download" size={24} color={colors.incomeColor} />
                )}
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Baixar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShare}
              disabled={sharing}
              activeOpacity={0.7}
              style={{ flex: 1, alignItems: 'center' }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.primaryGold + '20',
                  marginBottom: 8,
                }}
              >
                {sharing ? (
                  <ActivityIndicator size="small" color={colors.primaryGold} />
                ) : (
                  <Feather name="share-2" size={24} color={colors.primaryGold} />
                )}
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Compartilhar</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.85}
            style={{
              paddingVertical: 16,
              borderRadius: 16,
              alignItems: 'center',
              backgroundColor: colors.primaryGold,
            }}
          >
            <Text style={{ color: colors.primaryGoldContrast, fontWeight: '700', fontSize: 16 }}>
              Fechar
            </Text>
          </TouchableOpacity>
        </View>

        {/* Feedback flutuante */}
        {feedback && (
          <View
            style={{
              position: 'absolute',
              bottom: 80,
              alignSelf: 'center',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 16,
              backgroundColor:
                feedback.type === 'success' ? colors.incomeColor : colors.expenseColor,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>{feedback.message}</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
