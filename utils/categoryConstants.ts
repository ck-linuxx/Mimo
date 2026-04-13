// Paleta de cores pré-definidas para categorias
export const PRESET_COLORS = [
  '#EF4444', // vermelho
  '#F97316', // laranja
  '#F59E0B', // âmbar
  '#EAB308', // amarelo
  '#84CC16', // verde-limão
  '#22C55E', // verde
  '#10B981', // esmeralda
  '#14B8A6', // teal
  '#06B6D4', // ciano
  '#3B82F6', // azul
  '#6366F1', // índigo
  '#8B5CF6', // violeta
  '#A855F7', // roxo
  '#EC4899', // rosa
  '#F43F5E', // rosa-avermelhado
  '#6B7280', // cinza
] as const;

// Ícones Feather relevantes para categorias financeiras (80 ícones — 4 páginas de 20)
export const CATEGORY_ICONS = [
  // Página 1 — Compras, Casa, Tecnologia, Entretenimento
  'shopping-cart', 'shopping-bag', 'coffee', 'tag', 'scissors',
  'home', 'key', 'lock', 'tool', 'settings',
  'smartphone', 'monitor', 'wifi', 'cpu', 'server',
  'tv', 'film', 'music', 'headphones', 'radio',
  // Página 2 — Transporte, Natureza, Viagem, Saúde
  'truck', 'navigation', 'compass', 'anchor', 'map',
  'sun', 'cloud', 'umbrella', 'wind', 'droplet',
  'map-pin', 'globe', 'flag', 'camera', 'thermometer',
  'heart', 'activity', 'plus-square', 'zap', 'battery-charging',
  // Página 3 — Finanças, Análise, Trabalho, Educação
  'dollar-sign', 'credit-card', 'briefcase', 'percent', 'trending-up',
  'trending-down', 'bar-chart-2', 'pie-chart', 'layers', 'sliders',
  'clipboard', 'file-text', 'pen-tool', 'edit', 'printer',
  'book', 'book-open', 'archive', 'package', 'database',
  // Página 4 — Social, Notificações, Ações, Misc
  'user', 'users', 'smile', 'star', 'award',
  'gift', 'bell', 'clock', 'calendar', 'inbox',
  'send', 'save', 'upload', 'download', 'share-2',
  'grid', 'refresh-cw', 'filter', 'eye', 'more-horizontal',
] as const;

export type PresetColor = (typeof PRESET_COLORS)[number];
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];
