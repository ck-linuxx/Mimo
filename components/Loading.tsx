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
      className="w-full items-center justify-center rounded-2xl border border-light-border-color bg-light-card-background dark:border-dark-border-color dark:bg-dark-card-background"
      style={{ padding: s.containerPad }}
    >
      {showIcon && (
        <View className="mb-5">
          <Animated.View style={rotateStyle}>
            <View
              className="items-center justify-center rounded-full border-2"
              style={{
                padding: s.iconPad,
                backgroundColor: colors.primaryGold + '15',
                borderColor: colors.primaryGold + '30',
              }}
            >
              <Animated.View style={pulseStyle}>
                <View
                  className="items-center justify-center rounded-full"
                  style={{
                    width: s.icon,
                    height: s.icon,
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
        className="mb-1 text-center font-semibold text-light-text-primary dark:text-dark-text-primary"
        style={{ fontSize: s.text }}
      >
        {message}
      </Text>

      <View className="mt-4 flex-row gap-2">
        {dotStyles.map((dotStyle, i) => (
          <Animated.View
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-light-primary-gold dark:bg-dark-primary-gold"
            style={dotStyle}
          />
        ))}
      </View>
    </View>
  );
}

export function LoadingScreen({ message }: { message?: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-light-background p-6 dark:bg-dark-background">
      <Loading message={message} size="large" />
    </View>
  );
}
