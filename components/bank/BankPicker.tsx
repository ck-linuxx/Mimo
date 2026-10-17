import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors } from 'themes/colors';
import { SPRING_BOUNCE } from 'constants/animations';
import { BANKS, type Bank } from './banks';
import { ActionButton } from 'components/ActionButton';
import { BankLogo } from './BankLogo';

type Colors = typeof darkColors | typeof lightColors;

const COLUMNS = 4;
const ROWS_PER_PAGE = 3;
const BANKS_PER_PAGE = COLUMNS * ROWS_PER_PAGE;

type BankPickerProps = {
  selectedCode: number | null;
  onSelect: (bank: Bank) => void;
  colors: Colors;
  /** Cor de destaque do banco selecionado. */
  accentColor?: string;
};

function normalize(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const INDEXED_BANKS = BANKS.map((bank) => ({
  bank,
  nameNorm: normalize(bank.name),
  fullNameNorm: normalize(bank.fullName),
  codeStr: String(bank.code).padStart(3, '0'),
}));

function PageDot({ isActive, color }: { isActive: boolean; color: string }) {
  const dotWidth = useSharedValue(isActive ? 20 : 6);

  useEffect(() => {
    dotWidth.value = withSpring(isActive ? 20 : 6, SPRING_BOUNCE);
  }, [isActive, dotWidth]);

  const animStyle = useAnimatedStyle(() => ({ width: dotWidth.value }));

  return (
    <Animated.View
      style={[
        { height: 6, borderRadius: 3, backgroundColor: isActive ? color : color + '50' },
        animStyle,
      ]}
    />
  );
}

type BankTileProps = {
  bank: Bank;
  isSelected: boolean;
  accentColor: string;
  colors: Colors;
  onPress: () => void;
};

function BankTile({ bank, isSelected, accentColor, colors, onPress }: BankTileProps) {
  const scale = useSharedValue(isSelected ? 1.08 : 1);

  useEffect(() => {
    scale.value = withSpring(isSelected ? 1.08 : 1, SPRING_BOUNCE);
  }, [isSelected, scale]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={{ width: `${100 / COLUMNS}%`, alignItems: 'center', paddingVertical: 6 }}>
      <Animated.View
        style={[
          {
            width: 56,
            height: 56,
            borderRadius: 15,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isSelected ? accentColor + '25' : colors.iconBackground,
            borderWidth: isSelected ? 2 : 1,
            borderColor: isSelected ? accentColor : colors.borderColor,
          },
          animStyle,
        ]}>
        <BankLogo code={bank.code} size={32} fallbackColor={colors.textSecondary} />
      </Animated.View>
      <Text
        numberOfLines={2}
        className="mt-1.5 px-1 text-center text-[11px] font-medium"
        style={{ color: isSelected ? accentColor : colors.textSecondary }}>
        {bank.name}
      </Text>
    </TouchableOpacity>
  );
}

/** Grade paginada e pesquisável de bancos: logo (em tile) e `name` abaixo. */
export function BankPicker({ selectedCode, onSelect, colors, accentColor }: BankPickerProps) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const accent = accentColor ?? colors.primaryGold;

  const slide = useSharedValue(0);
  const opacity = useSharedValue(1);
  const prevPageRef = useRef(page);
  const animatingRef = useRef(false);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return BANKS;
    return INDEXED_BANKS.filter(
      (item) =>
        item.nameNorm.includes(q) ||
        item.fullNameNorm.includes(q) ||
        item.codeStr.includes(q),
    ).map((item) => item.bank);
  }, [query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / BANKS_PER_PAGE));
  const safePage = Math.min(page, pageCount - 1);

  const pageItems = useMemo(
    () => filtered.slice(safePage * BANKS_PER_PAGE, (safePage + 1) * BANKS_PER_PAGE),
    [filtered, safePage],
  );

  const rows = useMemo(() => {
    const r: Bank[][] = [];
    for (let i = 0; i < pageItems.length; i += COLUMNS) r.push(pageItems.slice(i, i + COLUMNS));
    return r;
  }, [pageItems]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: slide.value }],
  }));

  useEffect(() => {
    if (prevPageRef.current === safePage) return;
    const direction = safePage > prevPageRef.current ? 1 : -1;
    prevPageRef.current = safePage;
    slide.value = direction * 24;
    opacity.value = withTiming(1, { duration: 130 });
    slide.value = withTiming(0, { duration: 130 });
    animatingRef.current = false;
  }, [safePage, opacity, slide]);

  const goToPage = useCallback(
    (next: number) => {
      if (animatingRef.current) return;
      animatingRef.current = true;
      const direction = next > safePage ? 1 : -1;
      opacity.value = withTiming(0, { duration: 100 });
      slide.value = withTiming(direction * -24, { duration: 100 }, (finished) => {
        if (finished) runOnJS(setPage)(next);
      });
    },
    [safePage, opacity, slide],
  );

  const handleQuery = useCallback((text: string) => {
    setQuery(text);
    setPage(0);
    prevPageRef.current = 0;
  }, []);

  return (
    <View>
      <View
        className="mb-3 flex-row items-center rounded-2xl px-4"
        style={{
          backgroundColor: colors.cardBackground,
          borderWidth: 1,
          borderColor: colors.borderColor,
          height: 48,
        }}>
        <Feather name="search" size={16} color={colors.textSecondary} />
        <TextInput
          className="ml-2 flex-1 text-base"
          style={{ color: colors.textPrimary }}
          placeholder="Buscar banco"
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={handleQuery}
          autoCorrect={false}
        />
      </View>

      <View
        className="rounded-2xl"
        style={{ backgroundColor: colors.cardBackground, overflow: 'hidden' }}>
        <Animated.View style={[{ padding: 8, minHeight: 124 * ROWS_PER_PAGE }, animStyle]}>
          {rows.length === 0 ? (
            <Text className="p-4 text-center text-sm" style={{ color: colors.textSecondary }}>
              Nenhum banco encontrado
            </Text>
          ) : (
            rows.map((row, idx) => (
              <View key={idx} style={{ flexDirection: 'row' }}>
                {row.map((bank) => (
                  <BankTile
                    key={`${safePage}-${bank.code}`}
                    bank={bank}
                    isSelected={bank.code === selectedCode}
                    accentColor={accent}
                    colors={colors}
                    onPress={() => onSelect(bank)}
                  />
                ))}
              </View>
            ))
          )}
        </Animated.View>

        <View className="flex-row items-center justify-between px-4 pb-4 pt-2">
          <ActionButton
            icon="chevron-left"
            iconSize={20}
            disabled={safePage === 0}
            onPress={() => goToPage(safePage - 1)}
          />
          <View className="flex-row items-center" style={{ gap: 6 }}>
            {Array.from({ length: pageCount }, (_, i) => (
              <PageDot key={i} isActive={safePage === i} color={accent} />
            ))}
          </View>
          <ActionButton
            icon="chevron-right"
            iconSize={20}
            disabled={safePage >= pageCount - 1}
            onPress={() => goToPage(safePage + 1)}
          />
        </View>
      </View>
    </View>
  );
}
