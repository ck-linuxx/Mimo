import { Stack } from 'expo-router';

export default function StackGroupLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="categorySelect" />
      <Stack.Screen name="categoryCreate" />
      <Stack.Screen name="goalSelect" />
      <Stack.Screen name="goalCreate" />
      <Stack.Screen name="editTransaction" />
      <Stack.Screen name="paymentMethodSelect" />
      <Stack.Screen name="accountCreate" />
      <Stack.Screen name="cardCreate" />
    </Stack>
  );
}
