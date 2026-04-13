import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors } from 'themes/colors';
import { CATEGORY_ICONS } from 'utils/categoryConstants';
import { ActionButton } from 'components/ActionButton';

// ─── Constantes de layout ──────────────────────────────────────────────────────

const ICONS_PER_PAGE = 20;
const ICON_COLS = 5;
const ICON_ROW_GAP = 10;

/**
 * Padding horizontal total padrão externo ao componente (em px).
 * Corresponde a: scroll horizontal (24 × 2) + padding interno do card (16 × 2) = 80.
 * Ajuste via prop `containerPadding` quando o contexto de uso tiver padding diferente.
 */
const DEFAULT_CONTAINER_PADDING = 80;

// ─── Sub-componentes (colocalizados, não exportados) ──────────────────────────

interface AnimatedPageDotProps {
  isActive: boolean;
  color: string;
}

function AnimatedPageDot({ isActive, color }: AnimatedPageDotProps) {
  const dotWidth = useSharedValue(isActive ? 20 : 6);

  useEffect(() => {
    dotWidth.value = withSpring(isActive ? 20 : 6, { damping: 14, stiffness: 400 });
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

interface AnimatedIconItemProps {
  iconName: string;
  isSelected: boolean;
  selectedColor: string;
  colors: typeof darkColors | typeof lightColors;
  size: number;
  onPress: () => void;
}

function AnimatedIconItem({
  iconName,
  isSelected,
  selectedColor,
  colors,
  size,
  onPress,
}: AnimatedIconItemProps) {
  const scale = useSharedValue(isSelected ? 1.15 : 1);

  useEffect(() => {
    scale.value = withSpring(isSelected ? 1.15 : 1, { damping: 8, stiffness: 400, mass: 0.6 });
  }, [isSelected, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.27),
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isSelected ? selectedColor + '25' : colors.iconBackground,
            borderWidth: isSelected ? 2 : 1,
            borderColor: isSelected ? selectedColor : colors.borderColor,
          },
          animStyle,
        ]}
      >
        <Feather
          name={iconName as React.ComponentProps<typeof Feather>['name']}
          size={22}
          color={isSelected ? selectedColor : colors.textSecondary}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────

export interface IconPickerGridProps {
  /** Ícone atualmente selecionado (nome Feather). */
  selectedIcon: string;
  /** Chamado ao selecionar ou trocar um ícone. */
  onSelectIcon: (icon: string) => void;
  /** Cor de destaque usada no ícone selecionado e nos dots de paginação. */
  selectedColor: string;
  /** Paleta de cores do tema atual (dark ou light). */
  colors: typeof darkColors | typeof lightColors;
  /**
   * Soma dos paddings horizontais externos ao componente (em px).
   * Usado para calcular o tamanho correto de cada célula da grade.
   * Padrão: `80` (scroll: 24 × 2 + card: 16 × 2).
   */
  containerPadding?: number;
}

/**
 * `IconPickerGrid`
 *
 * Grade paginada de ícones Feather com animação de slide/fade entre páginas
 * e feedback bounce ao selecionar um ícone.
 *
 * - Ícones: fixos em `CATEGORY_ICONS` de `utils/categoryConstants`
 * - Layout: 5 colunas × 4 linhas = 20 ícones por página
 * - Tamanho das células: calculado via `useWindowDimensions` menos `containerPadding`
 * - Navegação: setas (`ActionButton`) com dots de paginação animados
 *
 * @example
 * ```tsx
 * <IconPickerGrid
 *   selectedIcon={selectedIcon}
 *   onSelectIcon={setSelectedIcon}
 *   selectedColor={selectedColor}
 *   colors={colors}
 * />
 * ```
 *
 * Para contextos com padding diferente do padrão (ex: tela sem ScrollView com padding 24):
 * ```tsx
 * <IconPickerGrid
 *   selectedIcon={selectedIcon}
 *   onSelectIcon={setSelectedIcon}
 *   selectedColor={selectedColor}
 *   colors={colors}
 *   containerPadding={64}
 * />
 * ```
 */
export function IconPickerGrid({
  selectedIcon,
  onSelectIcon,
  selectedColor,
  colors,
  containerPadding = DEFAULT_CONTAINER_PADDING,
}: IconPickerGridProps) {
  const [currentIconPage, setCurrentIconPage] = useState(0);
  const iconPageSlide = useSharedValue(0);
  const iconPageOpacity = useSharedValue(1);
  const prevPageRef = useRef(currentIconPage);
  const animatingRef = useRef(false);

  const { width: screenWidth } = useWindowDimensions();

  const iconPages = useMemo(() => {
    const all = Array.from(CATEGORY_ICONS);
    const pages: string[][] = [];
    for (let i = 0; i < all.length; i += ICONS_PER_PAGE) {
      pages.push(all.slice(i, i + ICONS_PER_PAGE));
    }
    return pages;
  }, []);

  const currentPageIcons = useMemo(
    () => iconPages[currentIconPage] ?? [],
    [iconPages, currentIconPage],
  );

  const iconSize = Math.floor(
    (screenWidth - containerPadding - ICON_ROW_GAP * (ICON_COLS - 1)) / ICON_COLS,
  );

  const iconRows = useMemo(() => {
    const rows: string[][] = [];
    for (let i = 0; i < currentPageIcons.length; i += ICON_COLS) {
      rows.push(currentPageIcons.slice(i, i + ICON_COLS));
    }
    return rows;
  }, [currentPageIcons]);

  const iconPageAnimStyle = useAnimatedStyle(() => ({
    opacity: iconPageOpacity.value,
    transform: [{ translateX: iconPageSlide.value }],
  }));

  // Anima entrada após React re-renderizar com o novo conteúdo — sem flicker
  useEffect(() => {
    if (prevPageRef.current === currentIconPage) return;
    const direction = currentIconPage > prevPageRef.current ? 1 : -1;
    prevPageRef.current = currentIconPage;
    iconPageSlide.value = direction * 24;
    iconPageOpacity.value = withTiming(1, { duration: 130 });
    iconPageSlide.value = withTiming(0, { duration: 130 });
    animatingRef.current = false;
  }, [currentIconPage, iconPageOpacity, iconPageSlide]);

  const goToPage = useCallback(
    (nextPage: number) => {
      if (animatingRef.current) return;
      animatingRef.current = true;
      const direction = nextPage > currentIconPage ? 1 : -1;
      iconPageOpacity.value = withTiming(0, { duration: 100 });
      iconPageSlide.value = withTiming(
        direction * -24,
        { duration: 100 },
        (finished) => {
          if (finished) {
            runOnJS(setCurrentIconPage)(nextPage);
          }
        },
      );
    },
    [currentIconPage, iconPageOpacity, iconPageSlide],
  );

  return (
    <View
      className="rounded-2xl"
      style={{ backgroundColor: colors.cardBackground, overflow: 'hidden' }}
    >
      {/* Grade animada — linhas fixas de ICON_COLS colunas */}
      <Animated.View style={[{ padding: 16 }, iconPageAnimStyle]}>
        {iconRows.map((row, rowIdx) => (
          <View
            key={rowIdx}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: rowIdx < iconRows.length - 1 ? ICON_ROW_GAP : 0,
            }}
          >
            {row.map((iconName) => (
              <AnimatedIconItem
                key={`${currentIconPage}-${iconName}`}
                iconName={iconName}
                isSelected={selectedIcon === iconName}
                selectedColor={selectedColor}
                colors={colors}
                size={iconSize}
                onPress={() => onSelectIcon(iconName)}
              />
            ))}
          </View>
        ))}
      </Animated.View>

      {/* Controles de paginação */}
      <View className="flex-row items-center justify-between px-4 pb-4 pt-2">
        <ActionButton
          icon="chevron-left"
          iconSize={20}
          disabled={currentIconPage === 0}
          onPress={() => goToPage(currentIconPage - 1)}
        />

        <View className="flex-row items-center" style={{ gap: 6 }}>
          {iconPages.map((_, idx) => (
            <AnimatedPageDot
              key={idx}
              isActive={currentIconPage === idx}
              color={selectedColor}
            />
          ))}
        </View>

        <ActionButton
          icon="chevron-right"
          iconSize={20}
          disabled={currentIconPage === iconPages.length - 1}
          onPress={() => goToPage(currentIconPage + 1)}
        />
      </View>
    </View>
  );
}
