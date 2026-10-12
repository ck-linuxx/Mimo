import React, { ReactNode, useState } from 'react';
import { TouchableOpacity, View, Text, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { SPRING_BOUNCE, SPRING_MODAL } from 'constants/animations';

const SPRING_ACCORDION = { ...SPRING_MODAL, overshootClamping: true } as const;

interface AccordionProps {
  title: string;
  subtitle?: string;
  accentColor?: string;
  icon?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function Accordion({
  title,
  subtitle,
  accentColor,
  icon,
  children,
  defaultOpen = false,
}: AccordionProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const [open, setOpen] = useState(defaultOpen);

  // altura real do conteudo, medida uma vez via onLayout (conteudo fica sempre montado)
  const contentHeight = useSharedValue(0);
  // progresso 0 -> 1 (fechado -> aberto), anima no UI thread
  const progress = useSharedValue(defaultOpen ? 1 : 0);
  const chevronRotation = useSharedValue(defaultOpen ? 1 : 0);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    progress.value = withSpring(next ? 1 : 0, SPRING_ACCORDION);
    chevronRotation.value = withSpring(next ? 1 : 0, SPRING_BOUNCE);
  };

  const onContentLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && h !== contentHeight.value) {
      contentHeight.value = h;
    }
  };

  // reposicionar automaticamente tudo o que vem depois do Accordion
  const animatedBodyStyle = useAnimatedStyle(() => ({
    height: contentHeight.value * progress.value,
    opacity: progress.value,
  }));

  const animatedChevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value * 180}deg` }],
  }));

  return (
    <View
      style={{
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.borderColor,
        overflow: 'hidden',
      }}
    >
      <TouchableOpacity
        onPress={handleToggle}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 14,
          gap: 12,
        }}
      >
        {icon && (
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: (accentColor ?? colors.primaryGold) + '20',
            }}
          >
            <Feather name={icon as any} size={18} color={accentColor ?? colors.primaryGold} />
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text
            className="font-semibold text-base text-light-text-primary dark:text-dark-text-primary"
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              className="text-sm text-light-text-secondary dark:text-dark-text-secondary"
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>

        <Animated.View style={animatedChevronStyle}>
          <Feather name="chevron-down" size={20} color={colors.textSecondary} />
        </Animated.View>
      </TouchableOpacity>

      {/*
       * Body permanece SEMPRE montado (mesmo fechado). Isso permite medir
       * a altura real via onLayout, e o height animado (contentHeight * progress)
       * gera uma transicao continua no thread de UI — inclusive no fechamento.
       */}
      <Animated.View style={[{ overflow: 'hidden' }, animatedBodyStyle]}>
        <View onLayout={onContentLayout} style={{ position: 'absolute', width: '100%' }}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}