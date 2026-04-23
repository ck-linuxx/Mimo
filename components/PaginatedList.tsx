import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { ActionButton } from 'components/ActionButton';
import { Skeleton } from 'components/Skeleton';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface PaginatedListProps<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  /**
   * Quando true, exibe o seletor de quantidade de linhas por página.
   * @default true
   */
  enableRowsCount?: boolean;
  /**
   * Quando true, exibe os controles de navegação de página (anterior/próximo).
   * @default true
   */
  enablePagination?: boolean;
  /** Opções disponíveis no seletor de linhas. @default [3, 5, 10] */
  pageSizeOptions?: number[];
  /** Nome do ícone Feather para o empty state */
  emptyIcon?: React.ComponentProps<typeof Feather>['name'];
  emptyText?: string;
  emptySubtext?: string;
  ListHeaderComponent?: React.ReactNode;
  /** Quando true, substitui o card inteiro por um skeleton animado. */
  isLoading?: boolean;
  /**
   * Altura estimada de cada item em dp para calcular o minHeight fixo da
   * área de listagem. Evita que o card mude de tamanho entre páginas.
   * @default 77
   */
  estimatedItemHeight?: number;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function PaginatedList<T>({
  data,
  totalCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  renderItem,
  enableRowsCount = true,
  enablePagination = true,
  pageSizeOptions = [3, 5, 10],
  emptyIcon = 'inbox',
  emptyText = 'Nenhum item encontrado',
  emptySubtext,
  ListHeaderComponent,
  isLoading = false,
  estimatedItemHeight = 77,
}: PaginatedListProps<T>) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentDisplay = page + 1; // 1-based para exibição
  const pageIndicator = `${currentDisplay} – ${totalPages}`;
  const listMinHeight = pageSize * estimatedItemHeight;

  // ─── Dropdown de linhas ───────────────────────────────────────────────────

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownOpacity = useSharedValue(0);
  const dropdownScale = useSharedValue(0.92);

  const dropdownAnimStyle = useAnimatedStyle(() => ({
    opacity: dropdownOpacity.value,
    transform: [{ scale: dropdownScale.value }],
  }));

  useEffect(() => {
    dropdownOpacity.value = withTiming(dropdownOpen ? 1 : 0, { duration: 150 });
    dropdownScale.value = withTiming(dropdownOpen ? 1 : 0.92, { duration: 150 });
  }, [dropdownOpen, dropdownOpacity, dropdownScale]);

  const handleSelectPageSize = (size: number) => {
    setDropdownOpen(false);
    if (size !== pageSize) {
      onPageSizeChange(size);
      onPageChange(0); // reseta para primeira página
    }
  };

  // ─── Animação de conteúdo ao trocar página ────────────────────────────────

  const contentOpacity = useSharedValue(1);
  const prevPage = useRef(page);

  useEffect(() => {
    if (prevPage.current !== page) {
      prevPage.current = page;
      contentOpacity.value = withTiming(0, { duration: 100 }, () => {
        contentOpacity.value = withTiming(1, { duration: 180 });
      });
    }
  }, [page, contentOpacity]);

  const contentAnimStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  // ─── Render ───────────────────────────────────────────────────────────────

  const showFooter = enableRowsCount || enablePagination;
  // Altura do footer: py-3 (24dp) + borda (1dp) + conteúdo (~20dp) ≈ 45dp
  const skeletonHeight = listMinHeight + 45;

  if (isLoading) {
    return (
      <View>
        {ListHeaderComponent}
        <Skeleton height={skeletonHeight} borderRadius={16} />
      </View>
    );
  }

  return (
    <View>
      {ListHeaderComponent}

      {/* Card container: engloba itens + footer */}
      <View className="bg-light-card-background dark:bg-dark-card-background rounded-2xl">

        {/* Lista de itens */}
        {data.length === 0 ? (
          <View style={{ minHeight: listMinHeight }} className="items-center justify-center p-6">
            <Feather name={emptyIcon} size={48} color={colors.textSecondary} />
            <Text className="text-light-text-secondary dark:text-dark-text-secondary text-center mt-3 text-base font-medium">
              {emptyText}
            </Text>
            {emptySubtext ? (
              <Text className="text-light-text-secondary dark:text-dark-text-secondary text-center text-sm mt-1 opacity-75">
                {emptySubtext}
              </Text>
            ) : null}
          </View>
        ) : (
          // overflow:'hidden' + borderTopRadius clipam o fundo retangular do
          // primeiro item, garantindo que os cantos do card pai apareçam.
          // Aplicado aqui (e não no card inteiro) para não cortar a ação de swipe.
          <Animated.View
            style={[
              contentAnimStyle,
              {
                minHeight: listMinHeight,
                overflow: 'hidden',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
              },
            ]}
          >
            {data.map((item, index) => (
              <React.Fragment key={index}>
                {renderItem(item, index)}
                {/* Divider entre items — não exibir após o último */}
                {index < data.length - 1 && (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: colors.borderColor,
                      marginHorizontal: 16,
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </Animated.View>
        )}

        {/* Footer: seletor de linhas + paginação — dentro do card */}
        {showFooter && (
          <View
            className="flex-row items-center justify-between px-4 py-3 border-t border-light-border-color dark:border-dark-border-color"
            style={{ zIndex: 10 }}
          >
            {/* Seletor de linhas */}
            {enableRowsCount ? (
              <View style={{ zIndex: 200 }}>
                <View className="flex-row items-center gap-2">
                  <Text className="text-light-text-secondary dark:text-dark-text-secondary text-xs">
                    Qtd. de linhas
                  </Text>
                  <TouchableOpacity
                    onPress={() => setDropdownOpen((v) => !v)}
                    activeOpacity={0.7}
                    className="flex-row items-center gap-1 bg-light-icon-background dark:bg-dark-icon-background rounded-lg px-3 py-1.5"
                  >
                    <Text className="text-light-text-primary dark:text-dark-text-primary text-sm font-semibold">
                      {pageSize}
                    </Text>
                    <Feather
                      name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                {/* Menu dropdown — abre para cima, z-index alto */}
                <Animated.View
                  pointerEvents={dropdownOpen ? 'auto' : 'none'}
                  style={[
                    dropdownAnimStyle,
                    {
                      position: 'absolute',
                      bottom: 44,
                      left: 0,
                      minWidth: 80,
                      zIndex: 300,
                      elevation: 12,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: -2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 8,
                    },
                  ]}
                  className="bg-light-card-background dark:bg-dark-card-background border border-light-border-color dark:border-dark-border-color rounded-xl overflow-hidden"
                >
                  {pageSizeOptions.map((option) => {
                    const isActive = option === pageSize;
                    return (
                      <TouchableOpacity
                        key={option}
                        onPress={() => handleSelectPageSize(option)}
                        activeOpacity={0.7}
                        className={`flex-row items-center justify-between px-4 py-2.5 ${isActive ? 'bg-light-primary-gold/20 dark:bg-dark-primary-gold/20' : ''}`}
                      >
                        <Text
                          className={`text-sm font-medium ${isActive ? 'text-light-primary-gold dark:text-dark-primary-gold' : 'text-light-text-primary dark:text-dark-text-primary'}`}
                        >
                          {option}
                        </Text>
                        {isActive && (
                          <Feather name="check" size={14} color={colors.primaryGold} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </Animated.View>
              </View>
            ) : (
              <View />
            )}

            {/* Controles de paginação */}
            {enablePagination && (
              <View className="flex-row items-center gap-2">
                <ActionButton
                  icon="chevron-left"
                  onPress={() => onPageChange(page - 1)}
                  disabled={page === 0}
                  iconSize={18}
                />
                <View className="px-2">
                  <Text className="text-light-text-secondary dark:text-dark-text-secondary text-sm font-semibold">
                    {pageIndicator}
                  </Text>
                </View>
                <ActionButton
                  icon="chevron-right"
                  onPress={() => onPageChange(page + 1)}
                  disabled={page >= totalPages - 1}
                  iconSize={18}
                />
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
