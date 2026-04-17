import React, { useCallback, useEffect } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';

const INFO_COLOR = '#3b82f6';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface CustomAlertProps {
  visible: boolean;
  type?: AlertType;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  onClose?: () => void;
  autoClose?: number;
}

export function CustomAlert({
  visible,
  type = 'info',
  title,
  message,
  buttons,
  onClose,
  autoClose,
}: CustomAlertProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const safeType: AlertType =
    type && ['success', 'error', 'warning', 'info'].includes(type) ? type : 'info';

  const typeConfig: Record<AlertType, { icon: React.ComponentProps<typeof Feather>['name']; color: string }> = {
    success: { icon: 'check-circle',   color: colors.incomeColor },
    error:   { icon: 'x-circle',       color: colors.expenseColor },
    warning: { icon: 'alert-triangle', color: colors.primaryGold },
    info:    { icon: 'info',           color: INFO_COLOR },
  };

  const scale   = useSharedValue(0);
  const opacity = useSharedValue(0);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle    = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleClose = useCallback(() => {
    scale.value   = withSpring(0, { damping: 20, stiffness: 300, mass: 0.8 });
    opacity.value = withTiming(0, { duration: 150 }, (finished) => {
      if (finished && onClose) runOnJS(onClose)();
    });
  }, [scale, opacity, onClose]);

  useEffect(() => {
    if (!visible) {
      scale.value   = 0;
      opacity.value = 0;
      return;
    }
    scale.value   = withSpring(1, { damping: 22, stiffness: 280, mass: 0.8 });
    opacity.value = withTiming(1, { duration: 200 });
    if (!autoClose) return;
    const timer = setTimeout(handleClose, autoClose);
    return () => clearTimeout(timer);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const defaultButtons: AlertButton[] = [{ text: 'OK', style: 'default' }];
  const alertButtons = buttons ?? defaultButtons;
  const { icon, color } = typeConfig[safeType];

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View
        style={[
          {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
            backgroundColor: 'rgba(0,0,0,0.7)',
          },
          overlayStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              backgroundColor: colors.cardBackground,
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 360,
              borderWidth: 1,
              borderColor: color,
            },
            cardStyle,
          ]}
        >
          {/* Ícone + Título */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: color + '20',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Feather name={icon} size={28} color={color} />
            </View>
            <Text
              style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 20, textAlign: 'center' }}
            >
              {title}
            </Text>
          </View>

          {/* Mensagem */}
          {message && (
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 15,
                lineHeight: 22,
                marginBottom: 24,
                textAlign: 'center',
              }}
            >
              {message}
            </Text>
          )}

          {/* Botões */}
          <View style={{ flexDirection: alertButtons.length === 2 ? 'row' : 'column', gap: 10 }}>
            {alertButtons.map((button, index) => {
              let bg        = colors.primaryGold;
              let textColor = colors.primaryGoldContrast;
              let borderW   = 0;
              let borderC   = 'transparent';
              if (button.style === 'cancel') {
                bg = colors.iconBackground; textColor = colors.textSecondary; borderW = 1; borderC = colors.borderColor;
              } else if (button.style === 'destructive') {
                bg = colors.expenseColor + '20'; textColor = colors.expenseColor; borderW = 1; borderC = colors.expenseColor;
              }
              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.8}
                  style={{
                    flex: alertButtons.length === 2 ? 1 : undefined,
                    backgroundColor: bg,
                    borderRadius: 12,
                    paddingVertical: 14,
                    paddingHorizontal: 24,
                    alignItems: 'center',
                    borderWidth: borderW,
                    borderColor: borderC,
                  }}
                  onPress={() => { button.onPress ? button.onPress() : handleClose(); }}
                >
                  <Text style={{ color: textColor, fontWeight: '600', fontSize: 15 }}>
                    {button.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
