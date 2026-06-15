import React from 'react';
import { Text, View } from 'react-native';

interface StatCardProps {
  label: string;
  value: string;
  valueColor?: string;
}

export function StatCard({ label, value, valueColor }: StatCardProps) {
  return (
    <View className="flex-1 items-center rounded-xl p-3 bg-light-icon-background dark:bg-dark-icon-background">
      <Text className="mb-1 text-sm text-center text-light-text-secondary dark:text-dark-text-secondary">
        {label}
      </Text>
      <Text
        className="text-base font-bold text-center text-light-text-primary dark:text-dark-text-primary"
        style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </Text>
    </View>
  );
}
