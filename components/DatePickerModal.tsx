import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { SPRING_BOUNCE, SPRING_MODAL } from 'constants/animations';

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

interface DayButtonProps {
  day: number;
  isSelected: boolean;
  isToday: boolean;
  onPress: (day: number) => void;
  colors: typeof darkColors | typeof lightColors;
}

function DayButton({ day, isSelected, isToday, onPress, colors }: DayButtonProps) {
  const scale = useSharedValue(isSelected ? 1.15 : 1);

  useEffect(() => {
    scale.value = withSpring(isSelected ? 1.15 : 1, SPRING_BOUNCE);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelected]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity
      onPress={() => onPress(day)}
      style={{ width: 40, height: 40, marginVertical: 4 }}
      activeOpacity={0.7}
    >
      <Animated.View
        style={[
          {
            flex: 1,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isSelected
              ? colors.primaryGold
              : isToday
                ? colors.primaryGold + '20'
                : 'transparent',
            borderWidth: 1,
            borderColor: isSelected || isToday ? colors.primaryGold : 'transparent',
          },
          animStyle,
        ]}
      >
        <Text
          style={{
            fontWeight: '600',
            color: isSelected
              ? colors.background
              : isToday
                ? colors.primaryGold
                : colors.textPrimary,
          }}
        >
          {day}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function DatePickerModal({ visible, data, onSelectDate, onClose }: DatePickerModalProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const scaleAnim      = useSharedValue(0.96);
  const opacityAnim    = useSharedValue(0);
  const contentOpacity = useSharedValue(1);
  const monthOpacity   = useSharedValue(1);

  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(data.getMonth());
  const [selectedYear, setSelectedYear] = useState(data.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacityAnim.value }));
  const cardStyle     = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));
  const monthStyle   = useAnimatedStyle(() => ({ opacity: monthOpacity.value }));

  useEffect(() => {
    if (visible) {
      setSelectedDate(null);
      setShowCalendar(false);
      setSelectedMonth(data.getMonth());
      setSelectedYear(data.getFullYear());
      opacityAnim.value = withTiming(1, { duration: 180 });
      scaleAnim.value   = withSpring(1, SPRING_MODAL);
    } else {
      opacityAnim.value = withTiming(0, { duration: 150 });
      scaleAnim.value   = withTiming(0.96, { duration: 150 });
      setSelectedDate(null);
      contentOpacity.value = 1;
      monthOpacity.value   = 1;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleClose = useCallback(() => {
    opacityAnim.value = withTiming(0, { duration: 150 });
    scaleAnim.value   = withTiming(0.96, { duration: 150 }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  const transitionToCalendar = useCallback(() => {
    contentOpacity.value = withTiming(0, { duration: 120 }, (finished) => {
      if (!finished) return;
      runOnJS(setShowCalendar)(true);
      contentOpacity.value = withTiming(1, { duration: 150 });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const transitionToOptions = useCallback(() => {
    contentOpacity.value = withTiming(0, { duration: 120 }, (finished) => {
      if (!finished) return;
      runOnJS(setShowCalendar)(false);
      contentOpacity.value = withTiming(1, { duration: 150 });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const updateMonth = useCallback((direction: 'prev' | 'next') => {
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

  const changeMonth = useCallback((direction: 'prev' | 'next') => {
    monthOpacity.value = withTiming(0, { duration: 110 }, (finished) => {
      if (!finished) return;
      runOnJS(updateMonth)(direction);
      monthOpacity.value = withTiming(1, { duration: 150 });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateMonth]);

  const opcoesDatas = [
    { label: 'Hoje', data: new Date(), icon: 'calendar' as const },
    { label: 'Ontem', data: new Date(Date.now() - 86400000), icon: 'arrow-left' as const },
    { label: 'Amanhã', data: new Date(Date.now() + 86400000), icon: 'arrow-right' as const },
  ];

  const calendarDays = useMemo<(number | null)[]>(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
    if (!Number.isFinite(firstDay) || !Number.isFinite(daysInMonth)) return [];
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
        style={[{ backgroundColor: 'rgba(0,0,0,0.7)' }, backdropStyle]}
      >
        <Animated.View
          className="w-full rounded-2xl p-6"
          style={[
            {
              maxWidth: 400,
              borderWidth: 1,
              borderColor: colors.primaryGold,
              backgroundColor: colors.background,
            },
            cardStyle,
          ]}
        >
          <View className="items-center mb-6">
            <View
              className="w-16 h-16 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: colors.primaryGold + '20' }}
            >
              <Feather name="calendar" size={28} color={colors.primaryGold} />
            </View>
            <Text className="text-light-text-primary dark:text-dark-text-primary font-bold text-xl text-center">
              Selecionar Data
            </Text>
            <Text className="text-light-text-secondary dark:text-dark-text-secondary text-sm text-center mt-1">
              Escolha uma opção abaixo
            </Text>
          </View>

          <Animated.View style={contentStyle}>
            {!showCalendar ? (
              <View className="gap-3">
                {opcoesDatas.map((opcao) => (
                  <TouchableOpacity
                    key={opcao.label}
                    onPress={() => handleSelectDate(opcao.data)}
                    className="bg-light-icon-background dark:bg-dark-icon-background rounded-xl p-4 flex-row items-center justify-between border border-light-secondary-gold dark:border-dark-secondary-gold"
                    activeOpacity={0.8}
                  >
                    <View className="flex-row items-center gap-3">
                      <Feather name={opcao.icon} size={20} color={colors.primaryGold} />
                      <Text className="text-light-text-primary dark:text-dark-text-primary font-medium text-base">{opcao.label}</Text>
                    </View>
                    <Text className="text-light-text-secondary dark:text-dark-text-secondary text-sm">{formatarData(opcao.data)}</Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  onPress={transitionToCalendar}
                  className="bg-light-icon-background dark:bg-dark-icon-background rounded-xl p-4 flex-row items-center justify-between border border-light-secondary-gold dark:border-dark-secondary-gold"
                  activeOpacity={0.8}
                >
                  <View className="flex-row items-center gap-3">
                    <Feather name="edit" size={20} color={colors.primaryGold} />
                    <Text className="text-light-text-primary dark:text-dark-text-primary font-medium text-base">Data específica</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleClose}
                  className="mt-3 py-4 px-6 rounded-xl items-center bg-light-icon-background dark:bg-dark-icon-background border border-light-expense-color dark:border-dark-expense-color"
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
                      className="w-10 h-10 rounded-xl items-center justify-center bg-light-icon-background dark:bg-dark-icon-background border border-light-secondary-gold dark:border-dark-secondary-gold"
                      activeOpacity={0.7}
                    >
                      <Feather name="chevron-left" size={20} color={colors.primaryGold} />
                    </TouchableOpacity>

                    <View className="items-center">
                      <Text className="text-light-text-primary dark:text-dark-text-primary font-bold text-lg">
                        {MESES[selectedMonth]}
                      </Text>
                      <Text className="text-light-text-secondary dark:text-dark-text-secondary text-sm">{selectedYear}</Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => changeMonth('next')}
                      className="w-10 h-10 rounded-xl items-center justify-center bg-light-icon-background dark:bg-dark-icon-background border border-light-secondary-gold dark:border-dark-secondary-gold"
                      activeOpacity={0.7}
                    >
                      <Feather name="chevron-right" size={20} color={colors.primaryGold} />
                    </TouchableOpacity>
                  </View>

                  <Animated.View style={monthStyle}>
                    <View className="flex-row justify-between mb-2 px-1">
                      {DIAS_SEMANA.map((dia) => (
                        <View key={dia} style={{ width: 40 }} className="items-center">
                          <Text className="text-light-text-secondary dark:text-dark-text-secondary text-xs font-semibold">{dia}</Text>
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
                        return (
                          <DayButton
                            key={`day-${day}`}
                            day={day}
                            isSelected={isSelected(day)}
                            isToday={isToday(day)}
                            onPress={handleDayPress}
                            colors={colors}
                          />
                        );
                      })}
                    </View>
                  </Animated.View>

                  {selectedDate && (
                    <View className="mt-2 p-3 bg-light-icon-background dark:bg-dark-icon-background rounded-xl border border-light-secondary-gold dark:border-dark-secondary-gold">
                      <Text className="text-light-text-secondary dark:text-dark-text-secondary text-xs text-center">
                        Data selecionada
                      </Text>
                      <Text className="text-light-text-primary dark:text-dark-text-primary font-bold text-center mt-1">
                        {formatarData(selectedDate)}
                      </Text>
                    </View>
                  )}

                  <View className="flex-row gap-3 mt-2">
                    <TouchableOpacity
                      onPress={transitionToOptions}
                      className="flex-1 py-4 px-6 rounded-xl items-center bg-light-icon-background dark:bg-dark-icon-background border border-light-expense-color dark:border-dark-expense-color"
                      activeOpacity={0.8}
                    >
                      <Text className="font-semibold text-base text-light-expense-color dark:text-dark-expense-color">Voltar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleConfirmCustomDate}
                      className="flex-1 py-4 px-6 rounded-xl items-center"
                      style={{
                        backgroundColor: selectedDate ? colors.primaryGold : colors.iconBackground,
                        opacity: selectedDate ? 1 : 0.5,
                      }}
                      activeOpacity={0.8}
                      disabled={!selectedDate}
                    >
                      <Text className="font-semibold text-base text-light-text-secondary dark:text-dark-text-secondary">
                        Confirmar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            )}
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
