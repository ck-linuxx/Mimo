import { Stack } from 'expo-router';
import { darkColors, lightColors, useTheme } from 'themes';

export default function StackGroupLayout() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="categorySelect" />
      <Stack.Screen name="categoryCreate" />
      <Stack.Screen name="goalSelect" />
      <Stack.Screen name="goalCreate" />
      <Stack.Screen name="editTransaction" />
      <Stack.Screen name="paymentMethodSelect" />
      <Stack.Screen name="accountCreate" />
      <Stack.Screen name="cardCreate" />
      <Stack.Screen name="accountsManage" />
      <Stack.Screen name="accountDetail" />
      <Stack.Screen name="cardsManage" />
      <Stack.Screen name="cardDetail" />
      <Stack.Screen name="cardBillingDetail" />
      <Stack.Screen name="accountSelect" />
      <Stack.Screen name="categoriesManage" />
    </Stack>
  );
}
