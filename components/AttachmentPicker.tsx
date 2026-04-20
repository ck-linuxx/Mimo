import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { CustomAlert } from 'components/CustomAlert';
import { useCustomAlert } from 'hooks/useCustomAlert';
import type { AttachmentLocal } from 'types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface AttachmentPickerProps {
  attachments: AttachmentLocal[];
  onAttachmentsChange: (attachments: AttachmentLocal[]) => void;
  maxAttachments?: number;
  onError?: (message: string) => void;
  isReceipt?: boolean;
}

export function AttachmentPicker({
  attachments,
  onAttachmentsChange,
  maxAttachments = 5,
  onError,
  isReceipt = false,
}: AttachmentPickerProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const [processing, setProcessing] = useState(false);

  const { alertConfig, visible: alertVisible, hideAlert, showError } = useCustomAlert();

  const isAtLimit = attachments.length >= maxAttachments;

  const handleError = (msg: string) => {
    if (onError) onError(msg);
    else showError('Erro', msg);
  };

  const processFile = async (
    uri: string,
    originalName: string,
    fileType: string,
  ): Promise<AttachmentLocal | null> => {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      handleError('Arquivo não encontrado');
      return null;
    }

    const size = (info as FileSystem.FileInfo & { size?: number }).size ?? 0;
    if (size > MAX_FILE_SIZE) {
      handleError('O arquivo deve ter no máximo 10 MB');
      return null;
    }

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return {
      uri,
      title: isReceipt ? 'Comprovante de pagamento' : originalName,
      originalName,
      fileType,
      fileSize: size,
      base64,
      isReceipt,
    };
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.getCameraPermissionsAsync();
    if (status === 'granted') return true;
    const { status: newStatus } = await ImagePicker.requestCameraPermissionsAsync();
    return newStatus === 'granted';
  };

  const requestGalleryPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (status === 'granted') return true;
    const { status: newStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return newStatus === 'granted';
  };

  const handleCamera = async () => {
    if (isAtLimit) return;
    const granted = await requestCameraPermission();
    if (!granted) {
      handleError('Permissão de câmera negada. Verifique as configurações do dispositivo.');
      return;
    }
    setProcessing(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const local = await processFile(
          asset.uri,
          asset.fileName ?? `foto_${Date.now()}.jpg`,
          asset.mimeType ?? 'image/jpeg',
        );
        if (local) onAttachmentsChange([...attachments, local]);
      }
    } catch {
      handleError('Erro ao acessar câmera');
    } finally {
      setProcessing(false);
    }
  };

  const handleGallery = async () => {
    if (isAtLimit) return;
    const granted = await requestGalleryPermission();
    if (!granted) {
      handleError('Permissão de galeria negada. Verifique as configurações do dispositivo.');
      return;
    }
    setProcessing(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const local = await processFile(
          asset.uri,
          asset.fileName ?? `imagem_${Date.now()}.jpg`,
          asset.mimeType ?? 'image/jpeg',
        );
        if (local) onAttachmentsChange([...attachments, local]);
      }
    } catch {
      handleError('Erro ao acessar galeria');
    } finally {
      setProcessing(false);
    }
  };

  const handlePdf = async () => {
    if (isAtLimit) return;
    setProcessing(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const local = await processFile(
          asset.uri,
          asset.name,
          asset.mimeType ?? 'application/pdf',
        );
        if (local) onAttachmentsChange([...attachments, local]);
      }
    } catch {
      handleError('Erro ao selecionar PDF');
    } finally {
      setProcessing(false);
    }
  };

  const handleRemove = (index: number) => {
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
  };

  return (
    <View>
      {/* Botões de seleção */}
      {!isAtLimit && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <TouchableOpacity
            onPress={handleCamera}
            disabled={processing}
            activeOpacity={0.7}
            style={{ alignItems: 'center', padding: 16 }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
                backgroundColor: colors.primaryGold + '20',
              }}
            >
              <Feather name="camera" size={24} color={colors.primaryGold} />
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Câmera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleGallery}
            disabled={processing}
            activeOpacity={0.7}
            style={{ alignItems: 'center', padding: 16 }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
                backgroundColor: colors.incomeColor + '20',
              }}
            >
              <Feather name="image" size={24} color={colors.incomeColor} />
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Galeria</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handlePdf}
            disabled={processing}
            activeOpacity={0.7}
            style={{ alignItems: 'center', padding: 16 }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
                backgroundColor: colors.expenseColor + '20',
              }}
            >
              <Feather name="file-text" size={24} color={colors.expenseColor} />
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>PDF</Text>
          </TouchableOpacity>
        </View>
      )}

      {processing && (
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <ActivityIndicator size="small" color={colors.primaryGold} />
        </View>
      )}

      {/* Grid de items selecionados */}
      {attachments.length > 0 && (
        <View style={{ marginTop: 8, gap: 8 }}>
          {attachments.map((item, index) => (
            <View
              key={index}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.iconBackground,
                borderRadius: 12,
                padding: 12,
                gap: 12,
              }}
            >
              {item.fileType.startsWith('image/') ? (
                <Image
                  source={{ uri: item.uri }}
                  style={{ width: 48, height: 48, borderRadius: 8 }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    backgroundColor: colors.expenseColor + '20',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name="file-text" size={22} color={colors.expenseColor} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: colors.textPrimary, fontWeight: '500', fontSize: 14 }}
                  numberOfLines={1}
                >
                  {item.originalName}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                  {(item.fileSize / 1024).toFixed(1)} KB
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleRemove(index)}
                style={{ padding: 4 }}
                activeOpacity={0.7}
              >
                <Feather name="trash-2" size={18} color={colors.expenseColor} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {isAtLimit && (
        <Text
          style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 8 }}
        >
          Limite de {maxAttachments} {maxAttachments === 1 ? 'arquivo' : 'arquivos'} atingido
        </Text>
      )}

      {alertConfig && (
        <CustomAlert
          visible={alertVisible}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={hideAlert}
        />
      )}
    </View>
  );
}
