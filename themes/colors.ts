export const darkColors = {
  background: '#0D0D0D',
  cardBackground: '#1A1A1A',
  primaryGold: '#D4AF37',
  secondaryGold: '#b99727',
  primaryGoldContrast: '#0D0D0D',
  accentGold: '#F5C242',
  textPrimary: '#FFFFFF',
  textSecondary: '#A6A6A6',
  borderColor: '#2D2D2D',
  incomeColor: '#22C55E',
  expenseColor: '#EF4444',
  disabled: '#4B4B4B',
  iconBackground: '#252525',
} as const;

export const lightColors = {
  background: '#F7F7F5',
  cardBackground: '#FFFFFF',
  primaryGold: '#dcb32e',
  secondaryGold: '#D4AF37',
  primaryGoldContrast: '#0D0D0D',
  accentGold: '#D4A017',
  textPrimary: '#0D0D0D',
  textSecondary: '#595959',
  borderColor: '#E2E2E2',
  incomeColor: '#16A34A',
  expenseColor: '#DC2626',
  disabled: '#BDBDBD',
  iconBackground: '#EFEFED',
} as const;

export type AppColors = typeof darkColors;
