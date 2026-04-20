import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';

interface LoadingProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
}

const SIZE_MAP = {
  small:  { icon: 28, text: 14, iconPad: 12, containerPad: 16 },
  medium: { icon: 40, text: 16, iconPad: 16, containerPad: 24 },
  large:  { icon: 56, text: 18, iconPad: 20, containerPad: 32 },
};

export function Loading({
  message = 'Carregando...',
  size = 'medium',
  showIcon = true,
}: LoadingProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const s = SIZE_MAP[size];

  const rotation = useSharedValue(0);
  const pulse    = useSharedValue(1);
  const dot0     = useSharedValue(0.3);
  const dot1     = useSharedValue(0.3);
  const dot2     = useSharedValue(0.3);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.bezier(0.65, 0, 0.35, 1) }),
      -1,
      false,
    );

    pulse.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
        withTiming(1,   { duration: 1000, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
      ),
      -1,
    );

    // Pontos sequenciais: ciclo de 1200ms, cada um com offset de 200ms
    dot0.value = withRepeat(
      withSequence(
        withTiming(1,   { duration: 400 }),
        withTiming(0.3, { duration: 400 }),
        withDelay(400,  withTiming(0.3, { duration: 0 })),
      ),
      -1,
    );
    dot1.value = withRepeat(
      withSequence(
        withDelay(200,  withTiming(1,   { duration: 400 })),
        withTiming(0.3, { duration: 400 }),
        withDelay(200,  withTiming(0.3, { duration: 0 })),
      ),
      -1,
    );
    dot2.value = withRepeat(
      withSequence(
        withDelay(400,  withTiming(1,   { duration: 400 })),
        withTiming(0.3, { duration: 400 }),
      ),
      -1,
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(rotation.value, [0, 1], [0, 360])}deg` }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const dotStyles = [
    useAnimatedStyle(() => ({ opacity: dot0.value })),
    useAnimatedStyle(() => ({ opacity: dot1.value })),
    useAnimatedStyle(() => ({ opacity: dot2.value })),
  ];

  return (
    <View
      style={{
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        padding: s.containerPad,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.borderColor,
      }}
    >
      {showIcon && (
        <View style={{ marginBottom: 20 }}>
          <Animated.View style={rotateStyle}>
            <View
              style={{
                borderRadius: 999,
                padding: s.iconPad,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.primaryGold + '15',
                borderWidth: 2,
                borderColor: colors.primaryGold + '30',
              }}
            >
              <Animated.View style={pulseStyle}>
                <View
                  style={{
                    width: s.icon,
                    height: s.icon,
                    borderRadius: 999,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.primaryGold + '20',
                  }}
                >
                  <Feather name="loader" size={s.icon * 0.6} color={colors.primaryGold} />
                </View>
              </Animated.View>
            </View>
          </Animated.View>
        </View>
      )}

      <Text
        style={{
          color: colors.textPrimary,
          fontWeight: '600',
          fontSize: s.text,
          textAlign: 'center',
          marginBottom: 4,
        }}
      >
        {message}
      </Text>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        {dotStyles.map((style, i) => (
          <Animated.View
            key={i}
            style={[
              { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primaryGold },
              style,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export function LoadingScreen({ message }: { message?: string }) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Loading message={message} size="large" />
    </View>
  );
}
