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
    },
  },
  plugins: [],
} satisfies Config;
