export const darkColors = {
  background: '#0D0D0D',
  cardBackground: '#1A1A1A',
  primaryGold: '#D4AF37',
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
  background: '#F5F5F5',
  cardBackground: '#FFFFFF',
  primaryGold: '#B8960C',
  accentGold: '#D4AF37',
  textPrimary: '#0D0D0D',
  textSecondary: '#6B6B6B',
  borderColor: '#E0E0E0',
  incomeColor: '#22C55E',
  expenseColor: '#EF4444',
  disabled: '#C4C4C4',
  iconBackground: '#EFEFEF',
} as const;

export type AppColors = typeof darkColors;
