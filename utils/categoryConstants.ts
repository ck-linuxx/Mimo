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

// Categorias padrão inseridas na primeira inicialização do app
export const DEFAULT_CATEGORIES = [
  // ─── Despesas ──────────────────────────────────────────────────────────────
  { name: 'Alimentação',    icon: 'coffee',         color: '#F97316', type: 'expense' as const, createdAt: 0 },
  { name: 'Mercado',        icon: 'shopping-cart',  color: '#22C55E', type: 'expense' as const, createdAt: 0 },
  { name: 'Transporte',     icon: 'truck',          color: '#EF4444', type: 'expense' as const, createdAt: 0 },
  { name: 'Moradia',        icon: 'home',           color: '#F59E0B', type: 'expense' as const, createdAt: 0 },
  { name: 'Saúde',          icon: 'heart',          color: '#EC4899', type: 'expense' as const, createdAt: 0 },
  { name: 'Educação',       icon: 'book',           color: '#3B82F6', type: 'expense' as const, createdAt: 0 },
  { name: 'Lazer',          icon: 'tv',             color: '#8B5CF6', type: 'expense' as const, createdAt: 0 },
  { name: 'Roupas',         icon: 'shopping-bag',   color: '#A855F7', type: 'expense' as const, createdAt: 0 },
  { name: 'Assinaturas',    icon: 'wifi',           color: '#06B6D4', type: 'expense' as const, createdAt: 0 },
  { name: 'Pets',           icon: 'smile',          color: '#F59E0B', type: 'expense' as const, createdAt: 0 },
  { name: 'Viagem',         icon: 'map-pin',        color: '#14B8A6', type: 'expense' as const, createdAt: 0 },
  { name: 'Outros',         icon: 'more-horizontal', color: '#6B7280', type: 'expense' as const, createdAt: 0 },
  // ─── Receitas ──────────────────────────────────────────────────────────────
  { name: 'Salário',        icon: 'briefcase',      color: '#22C55E', type: 'income' as const, createdAt: 0 },
  { name: 'Freelance',      icon: 'edit',           color: '#10B981', type: 'income' as const, createdAt: 0 },
  { name: 'Investimentos',  icon: 'trending-up',    color: '#3B82F6', type: 'income' as const, createdAt: 0 },
  { name: 'Outros Rendimentos', icon: 'plus-square', color: '#6B7280', type: 'income' as const, createdAt: 0 },
  // ─── Ambos ─────────────────────────────────────────────────────────────────
  { name: 'Transferência',  icon: 'send',           color: '#6366F1', type: 'both' as const, createdAt: 0 },
  { name: 'Presentes',      icon: 'gift',           color: '#F43F5E', type: 'both' as const, createdAt: 0 },
];
