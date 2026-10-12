import React, { useCallback, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { darkColors, lightColors, useTheme } from 'themes';
import { useBreakpoint } from 'hooks/useBreakpoint';
import { ActionButton } from 'components/ActionButton';

// ─── Custom Floating Sidebar Component for Notebook / Tablet Landscape ──────────

interface TabletFloatingSidebarProps extends BottomTabBarProps {
  colors: typeof darkColors;
}

function TabletFloatingSidebar({
  state,
  descriptors,
  navigation,
  colors,
}: TabletFloatingSidebarProps) {
  const insets = useSafeAreaInsets();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const progress = useSharedValue(1);

  const handleToggleCollapse = useCallback(() => {
    const nextCollapsed = !isCollapsed;
    setIsCollapsed(nextCollapsed);
    progress.value = withTiming(nextCollapsed ? 0 : 1, {
      duration: 180,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [isCollapsed, progress]);

  const sidebarAnimStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [68, 196]),
  }));

  const labelAnimStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  return (
    <Animated.View
      style={[
        {
          marginTop: insets.top + 16,
          marginBottom: 16,
          marginLeft: 16,
          marginRight: 8,
          backgroundColor: colors.cardBackground,
          borderRadius: 20,
          paddingVertical: 14,
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: colors.borderColor,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          justifyContent: 'space-between',
          alignItems: 'center',
          overflow: 'hidden',
        },
        sidebarAnimStyle,
      ]}
    >
      {/* Top: Compact / Expand button using system ActionButton */}
      <View style={{ width: '100%', alignItems: 'center', marginBottom: 12 }}>
        <ActionButton
          icon={isCollapsed ? 'chevron-right' : 'chevron-left'}
          onPress={handleToggleCollapse}
          iconSize={18}
        />
      </View>

      {/* Tabs list: Centered vertically */}
      <View
        style={{
          flex: 1,
          justifyContent: 'space-around',
          width: '100%',
          alignItems: 'center',
          paddingVertical: 8,
        }}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const color = isFocused ? colors.primaryGold : colors.textSecondary;
          const title =
            options.title !== undefined
              ? options.title
              : route.name;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={{
                width: '100%',
                height: 44,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: 12,
                    backgroundColor: `${colors.primaryGold}22`,
                    opacity: isFocused ? 1 : 0,
                  }}
                />

                {options.tabBarIcon ? (
                  options.tabBarIcon({
                    focused: isFocused,
                    color,
                    size: 24,
                  })
                ) : (
                  <Feather name="circle" size={24} color={color} />
                )}
              </View>

              <Animated.View
                style={[
                  {
                    width: 120,
                    marginLeft: 8,
                    justifyContent: 'center',
                  },
                  labelAnimStyle,
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 13,
                    fontWeight: isFocused ? '700' : '500',
                    color,
                  }}
                >
                  {title}
                </Text>
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bottom subtle spacer / indicator */}
      <View style={{ height: 16, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.borderColor,
          }}
        />
      </View>
    </Animated.View>
  );
}

// ─── Main TabLayout Component ────────────────────────────────────────────────────

export default function TabLayout() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const { isTablet, isNotebookMode, width } = useBreakpoint();

  const tabletTabBarWidth = Math.min(width - 48, 600);
  const horizontalMargin = isTablet ? Math.max(16, (width - tabletTabBarWidth) / 2) : 16;

  const renderTabletTabBar = useCallback(
    (props: BottomTabBarProps) => <TabletFloatingSidebar {...props} colors={colors} />,
    [colors]
  );

  return (
    <Tabs
      tabBar={isNotebookMode ? renderTabletTabBar : undefined}
      screenOptions={{
        tabBarPosition: isNotebookMode ? 'left' : 'bottom',
        tabBarActiveTintColor: colors.primaryGold,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: false,
        animation: 'fade',
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: colors.cardBackground,
          borderTopWidth: 0,
          height: 70,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingVertical: 5,
          marginHorizontal: horizontalMargin,
          marginBottom: 16,
          borderRadius: 24,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          borderWidth: 1,
          borderColor: colors.borderColor,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 6,
          gap: 4,
        },
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transações',
          tabBarIcon: ({ color, size }) => (
            <Feather name="list" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="addTransaction"
        options={{
          title: 'Adicionar',
          tabBarIcon: ({ color }) => (
            <Feather name="plus-circle" color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Relatórios',
          tabBarIcon: ({ color, size }) => (
            <Feather name="bar-chart-2" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Configurações',
          tabBarIcon: ({ color, size }) => (
            <Feather name="settings" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
