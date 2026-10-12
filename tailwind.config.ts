import type { Config } from 'tailwindcss';
import { darkColors, lightColors } from './themes/colors';

type ColorTokens = typeof darkColors;

function toTailwindTokens(colors: ColorTokens): Record<string, string> {
  return Object.fromEntries(
    Object.entries(colors).map(([key, value]) => [
      key.replace(/([A-Z])/g, '-$1').toLowerCase(),
      value,
    ])
  );
}

export default {
  content: [
    './App.{js,ts,tsx}',
    './app/**/*.{js,ts,tsx}',
    './components/**/*.{js,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        dark: toTailwindTokens(darkColors),
        light: toTailwindTokens(lightColors),
      },
      fontFamily: {
        sans: ['Inter_400Regular', 'Inter', 'sans-serif'],
        inter: ['Inter_400Regular', 'Inter', 'sans-serif'],
        'inter-light': ['Inter_300Light', 'Inter', 'sans-serif'],
        'inter-regular': ['Inter_400Regular', 'Inter', 'sans-serif'],
        'inter-medium': ['Inter_500Medium', 'Inter', 'sans-serif'],
        'inter-semibold': ['Inter_600SemiBold', 'Inter', 'sans-serif'],
        'inter-bold': ['Inter_700Bold', 'Inter', 'sans-serif'],
        'inter-extrabold': ['Inter_800ExtraBold', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
