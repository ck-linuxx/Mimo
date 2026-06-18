import React, { useEffect } from 'react';
import { Modal, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Loading } from 'components/Loading';

const SPRING_MODAL = { damping: 55, stiffness: 700 } as const;

interface ProgressDialogProps {
  visible: boolean;
  progress: number;
  message?: string;
}

export function ProgressDialog({ visible, progress, message }: ProgressDialogProps) {
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);
  const progressValue = useSharedValue(0);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const barStyle = useAnimatedStyle(() => ({ width: `${progressValue.value}%` as `${number}%` }));

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 180 });
      scale.value = withSpring(1, SPRING_MODAL);
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0.85, { duration: 150 });
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    progressValue.value = withTiming(progress, { duration: 150 });
  }, [progress]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => {}}>
      <Animated.View
        className="flex-1 justify-center items-center px-6 bg-black/60"
        style={backdropStyle}>
        <Animated.View
          className="w-full rounded-3xl bg-light-background p-6 dark:bg-dark-background"
          style={[{ maxWidth: 400 }, cardStyle]}>
          <View className="mb-4 items-center">
            <Loading size="small" message="" showIcon />
          </View>

          {message ? (
            <Text className="mb-4 text-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
              {message}
            </Text>
          ) : null}

          <View className="w-full h-1.5 overflow-hidden rounded-full bg-light-icon-background dark:bg-dark-icon-background">
            <Animated.View
              className="h-1.5 bg-light-primary-gold dark:bg-dark-primary-gold rounded-full"
              style={barStyle}
            />
          </View>

          <Text className="mt-2 text-center text-xs text-light-text-secondary dark:text-dark-text-secondary">
            {Math.round(progress)}%
          </Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
