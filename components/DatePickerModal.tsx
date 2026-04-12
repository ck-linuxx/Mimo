import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';

interface DatePickerModalProps {
  visible: boolean;
  data: Date;
  onSelectDate: (data: Date) => void;
  onClose: () => void;
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const formatarData = (d: Date) =>
  d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function DatePickerModal({ visible, data, onSelectDate, onClose }: DatePickerModalProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const dataRef = useRef(data);
  dataRef.current = data;

  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(data.getMonth());
  const [selectedYear, setSelectedYear] = useState(data.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 6, tension: 40 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      setShowCalendar(false);
      setSelectedDate(null);
      setSelectedMonth(dataRef.current.getMonth());
      setSelectedYear(dataRef.current.getFullYear());
    }
  // scaleAnim e opacityAnim são Animated.Value estáveis (useRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 0, useNativeDriver: true, friction: 6, tension: 40 }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [onClose, scaleAnim, opacityAnim]);

  const handleSelectDate = useCallback(
    (novaData: Date) => {
      onSelectDate(novaData);
      handleClose();
    },
    [onSelectDate, handleClose],
  );

  const handleDayPress = useCallback(
    (day: number) => setSelectedDate(new Date(selectedYear, selectedMonth, day)),
    [selectedYear, selectedMonth],
  );

  const handleConfirmCustomDate = useCallback(() => {
    if (selectedDate) handleSelectDate(selectedDate);
  }, [selectedDate, handleSelectDate]);

  const changeMonth = useCallback((direction: 'prev' | 'next') => {
    setSelectedMonth((prev) => {
      if (direction === 'prev') {
        if (prev === 0) { setSelectedYear((y) => y - 1); return 11; }
        return prev - 1;
      } else {
        if (prev === 11) { setSelectedYear((y) => y + 1); return 0; }
        return prev + 1;
      }
    });
  }, []);

  const opcoesDatas = [
    { label: 'Hoje', data: new Date(), icon: 'calendar' as const },
    { label: 'Ontem', data: new Date(Date.now() - 86400000), icon: 'arrow-left' as const },
    { label: 'Amanhã', data: new Date(Date.now() + 86400000), icon: 'arrow-right' as const },
  ];

  const calendarDays = useMemo<(number | null)[]>(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
    const days: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [selectedMonth, selectedYear]);

  const isToday = useCallback(
    (day: number) => {
      const today = new Date();
      return (
        day === today.getDate() &&
        selectedMonth === today.getMonth() &&
        selectedYear === today.getFullYear()
      );
    },
    [selectedMonth, selectedYear],
  );

  const isSelected = useCallback(
    (day: number) =>
      !!selectedDate &&
      day === selectedDate.getDate() &&
      selectedMonth === selectedDate.getMonth() &&
      selectedYear === selectedDate.getFullYear(),
    [selectedDate, selectedMonth, selectedYear],
  );

  return (
    <Modal 
      visible={visible} 
      animationType="none" 
      transparent
      statusBarTranslucent
    >
      <Animated.View
        className="flex-1 justify-center items-center px-6"
        style={{ backgroundColor: 'rgba(0,0,0,0.7)', opacity: opacityAnim }}
      >
        <Animated.View
          className="bg-cardBackground rounded-2xl p-6 w-full max-w-sm"
          style={{
            transform: [{ scale: scaleAnim }],
            borderWidth: 1,
            borderColor: colors.primaryGold,
            backgroundColor: colors.background
          }}
        >
          <View className="items-center mb-6">
            <View
              className="w-16 h-16 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: colors.primaryGold + '20' }}
            >
              <Feather name="calendar" size={28} color={colors.primaryGold} />
            </View>
            <Text className="text-textPrimary font-bold text-xl text-center">
              Selecionar Data
            </Text>
            <Text className="text-textSecondary text-sm text-center mt-1">
              Escolha uma opção abaixo
            </Text>
          </View>

          {!showCalendar ? (
            <View className="gap-3">
              {opcoesDatas.map((opcao) => (
                <TouchableOpacity
                  key={opcao.label}
                  onPress={() => handleSelectDate(opcao.data)}
                  className="bg-iconBackground rounded-xl p-4 flex-row items-center justify-between border border-light-secondary-gold dark:border-dark-secondary-gold"
                  activeOpacity={0.8}
                >
                  <View className="flex-row items-center gap-3">
                    <Feather name={opcao.icon} size={20} color={colors.primaryGold} />
                    <Text className="text-textPrimary font-medium text-base">{opcao.label}</Text>
                  </View>
                  <Text className="text-textSecondary text-sm">{formatarData(opcao.data)}</Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                onPress={() => setShowCalendar(true)}
                className="bg-iconBackground rounded-xl p-4 flex-row items-center justify-between border border-light-secondary-gold dark:border-dark-secondary-gold"
                activeOpacity={0.8}
              >
                <View className="flex-row items-center gap-3">
                  <Feather name="edit" size={20} color={colors.primaryGold} />
                  <Text className="text-textPrimary font-medium text-base">Data específica</Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleClose}
                className="mt-3 py-4 px-6 rounded-xl items-center bg-iconBackground border border-light-expense-color dark:border-dark-expense-color"
                activeOpacity={0.8}
              >
                <Text className="font-semibold text-base text-light-expense-color dark:text-dark-expense-color">Cancelar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="gap-4">
                <View className="flex-row items-center justify-between mb-2">
                  <TouchableOpacity
                    onPress={() => changeMonth('prev')}
                    className="w-10 h-10 rounded-xl items-center justify-center bg-iconBackground border border-light-secondary-gold dark:border-dark-secondary-gold"
                    activeOpacity={0.7}
                  >
                    <Feather name="chevron-left" size={20} color={colors.primaryGold} />
                  </TouchableOpacity>

                  <View className="items-center">
                    <Text className="text-textPrimary font-bold text-lg">
                      {MESES[selectedMonth]}
                    </Text>
                    <Text className="text-textSecondary text-sm">{selectedYear}</Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => changeMonth('next')}
                    className="w-10 h-10 rounded-xl items-center justify-center bg-iconBackground border border-light-secondary-gold dark:border-dark-secondary-gold"
                    activeOpacity={0.7}
                  >
                    <Feather name="chevron-right" size={20} color={colors.primaryGold} />
                  </TouchableOpacity>
                </View>

                <View className="flex-row justify-between mb-2 px-1">
                  {DIAS_SEMANA.map((dia) => (
                    <View key={dia} style={{ width: 40 }} className="items-center">
                      <Text className="text-textSecondary text-xs font-semibold">{dia}</Text>
                    </View>
                  ))}
                </View>

                <View className="flex-row flex-wrap justify-start px-1">
                  {calendarDays.map((day, index) => {
                    if (day === null) {
                      return (
                        <View
                          key={`empty-${index}`}
                          style={{ width: 40, height: 40, marginVertical: 4 }}
                        />
                      );
                    }

                    const today = isToday(day);
                    const selected = isSelected(day);

                    return (
                      <TouchableOpacity
                        key={`day-${day}`}
                        onPress={() => handleDayPress(day)}
                        style={{
                          width: 40,
                          height: 40,
                          marginVertical: 4,
                          backgroundColor: selected
                            ? colors.primaryGold
                            : today
                              ? colors.primaryGold + '20'
                              : 'transparent',
                          borderWidth: 1,
                          borderColor:
                            selected || today ? colors.primaryGold : 'transparent',
                        }}
                        className="rounded-xl items-center justify-center"
                        activeOpacity={0.7}
                      >
                        <Text
                          className="font-semibold"
                          style={{
                            color: selected
                              ? colors.background
                              : today
                                ? colors.primaryGold
                                : colors.textPrimary,
                          }}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {selectedDate && (
                  <View className="mt-2 p-3 bg-iconBackground rounded-xl border border-light-secondary-gold dark:border-dark-secondary-gold">
                    <Text className="text-textSecondary text-xs text-center">
                      Data selecionada
                    </Text>
                    <Text className="text-textPrimary font-bold text-center mt-1">
                      {formatarData(selectedDate)}
                    </Text>
                  </View>
                )}

                <View className="flex-row gap-3 mt-2">
                  <TouchableOpacity
                    onPress={() => setShowCalendar(false)}
                    className="flex-1 py-4 px-6 rounded-xl items-center bg-iconBackground border border-light-expense-color dark:border-dark-expense-color"
                    activeOpacity={0.8}
                  >
                    <Text className="font-semibold text-base text-light-expense-color dark:text-dark-expense-color">Voltar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleConfirmCustomDate}
                    className="flex-1 py-4 px-6 rounded-xl items-center"
                    style={{
                      backgroundColor: selectedDate
                        ? colors.primaryGold
                        : colors.iconBackground,
                      opacity: selectedDate ? 1 : 0.5,
                    }}
                    activeOpacity={0.8}
                    disabled={!selectedDate}
                  >
                    <Text
                      className="font-semibold text-base text-light-text-secondary dark:text-dark-text-secondary"
                    >
                      Confirmar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
