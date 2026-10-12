/**
 * Constantes globais de animação para react-native-reanimated.
 * Utilizadas em botões, cards, seletores e modais para garantir
 * fluidez consistente e física calibrada (60/120 fps).
 */

export const SPRING_BOUNCE = {
  damping: 16,
  stiffness: 450,
  mass: 0.4,
} as const;

export const SPRING_MODAL = {
  damping: 55,
  stiffness: 700,
} as const;
