import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { DatePickerModal } from './DatePickerModal';

interface DatePickerProps {
  data: Date;
  onChangeData: (data: Date) => void;
  label?: string;
}

export function DatePicker({ data, onChangeData, label = 'Data' }: DatePickerProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const [modalVisible, setModalVisible] = useState(false);

  const openModal = useCallback(() => setModalVisible(true), []);
  const closeModal = useCallback(() => setModalVisible(false), []);

  const handleSelectDate = useCallback(
    (novaData: Date) => {
      onChangeData(novaData);
      closeModal();
    },
    [onChangeData, closeModal],
  );

  const formatarData = (d: Date) =>
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const formatarDataCompleta = (d: Date) =>
    d.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  return (
    <View>
      <Text
        className="font-semibold text-base mb-3"
        style={{ color: colors.textPrimary }}
      >
        {label}
      </Text>

      <TouchableOpacity
        className="rounded-2xl p-4 flex-row items-center justify-between"
        style={{ backgroundColor: colors.cardBackground }}
        activeOpacity={0.7}
        onPress={openModal}
      >
        <View className="flex-row items-center gap-3">
          <View
            className="w-10 h-10 rounded-lg items-center justify-center"
            style={{ backgroundColor: colors.iconBackground }}
          >
            <Feather name="calendar" size={20} color={colors.primaryGold} />
          </View>
          <View>
            <Text
              className="font-medium text-base"
              style={{ color: colors.textPrimary }}
            >
              {formatarData(data)}
            </Text>
            <Text className="text-sm capitalize" style={{ color: colors.textSecondary }}>
              {formatarDataCompleta(data)}
            </Text>
          </View>
        </View>

        <Feather name="chevron-right" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      <DatePickerModal
        visible={modalVisible}
        data={data}
        onSelectDate={handleSelectDate}
        onClose={closeModal}
      />
    </View>
  );
}
