# components/ — Componentes

Componentes React Native reutilizáveis na interface da aplicação.

## Regras de Theming

### Classes Tailwind (NativeWind) — padrão preferido

Sempre usar `className` com os tokens do `tailwind.config.ts`. Os tokens seguem o padrão `light-<kebab>` / `dark-<kebab>` (camelCase → kebab-case com namespace de tema):

```tsx
// ✅ Correto — backgrounds, bordas e textos via className
<View className="bg-light-card-background dark:bg-dark-card-background" />
<View className="border border-light-border-color dark:border-dark-border-color" />
<Text className="text-light-text-primary dark:text-dark-text-primary" />
<Text className="text-light-text-secondary dark:text-dark-text-secondary" />
<Text className="text-light-disabled dark:text-dark-disabled" />

// ✅ Opacidade com /XX diretamente no token
<View className="bg-light-primary-gold/20 dark:bg-dark-primary-gold/20" />

// ❌ Proibido — nunca hardcode hex ou rgba
<View className="bg-[#1A1A1A]" />
<View style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
```

**Referência de tokens** (camelCase → className):

| Token em `colors.ts` | Classe de exemplo |
|----------------------|-------------------|
| `background` | `bg-light-background dark:bg-dark-background` |
| `cardBackground` | `bg-light-card-background dark:bg-dark-card-background` |
| `borderColor` | `border-light-border-color dark:border-dark-border-color` |
| `iconBackground` | `bg-light-icon-background dark:bg-dark-icon-background` |
| `textPrimary` | `text-light-text-primary dark:text-dark-text-primary` |
| `textSecondary` | `text-light-text-secondary dark:text-dark-text-secondary` |
| `disabled` | `text-light-disabled dark:text-dark-disabled` |
| `primaryGold` | `bg-light-primary-gold dark:bg-dark-primary-gold` |
| `primaryGold/20` | `bg-light-primary-gold/20 dark:bg-dark-primary-gold/20` |
| `incomeColor` | `bg-light-income-color dark:bg-dark-income-color` |
| `expenseColor` | `bg-light-expense-color dark:bg-dark-expense-color` |

### Cores em `style={{}}` — somente quando necessário

Usar `style` apenas para propriedades que `className` não suporta:
- Cor de ícones `Feather` (a prop `color` não aceita classe)
- Valores computados dinâmicos (ex: cor vinda de dado do banco)
- Propriedades numéricas de layout sem equivalente Tailwind (ex: `maxWidth: 400`)

```tsx
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';

const { theme } = useTheme();
const colors = theme === 'dark' ? darkColors : lightColors;

// ✅ style apenas onde className não alcança
<Feather name="star" size={20} color={colors.primaryGold} />
<View style={{ maxWidth: 400 }} className="bg-light-card-background dark:bg-dark-card-background" />
```

> **Contraste sobre `primaryGold`**: Quando `backgroundColor` for `primaryGold`, usar `colors.primaryGoldContrast` para `color` de textos/ícones — nunca `'#000'` direto.

**Não importar de `constants/Colors`** — esse módulo não existe neste projeto.

## Alertas

**Nunca usar `Alert` do React Native diretamente.** Sempre usar o hook `useCustomAlert` de `hooks/useCustomAlert.ts`, pois ele exibe alertas com o layout visual da aplicação.

```tsx
// Proibido
import { Alert } from 'react-native';
Alert.alert('Erro', 'mensagem');

// Correto
import { useCustomAlert } from 'hooks/useCustomAlert';
const { showError, showSuccess, showWarning, showInfo } = useCustomAlert();
showError('Erro ao salvar', 'mensagem detalhada');
```

O hook também precisa renderizar o componente `CustomAlert` na árvore, quando ele estiver disponível no projeto.

## Regras de Animação

A aplicação deve ser fluida. **Todo componente interativo deve ter animação.** Usar exclusivamente `react-native-reanimated` (já instalado) — nunca `Animated` do React Native core.

### Constantes de spring — fonte única de verdade

Defina as constantes no topo do arquivo e reutilize em todos os `withSpring`. Isso garante que todos os elementos animados tenham o mesmo "peso" visual.

```ts
// Botões e controles interativos: bounce rápido e fluido
const SPRING_BOUNCE = { damping: 5, stiffness: 550, mass: 0.35 } as const;

// Entrada / saída de modal ou bottom sheet: bounce leve
const SPRING_MODAL  = { damping: 55, stiffness: 700 } as const;
```

> **Regra:** nunca passar literais `{ damping: X, stiffness: Y }` diretamente em `withSpring()`. Use sempre uma das constantes acima (ou adicione uma nova nesta lista se nenhuma se encaixar).

### Botões / controles interativos (bounce)

Botões de ação (ex: FAB, chips de filtro, toggles) devem aplicar spring com bounce ao receber pressão:

```tsx
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useEffect } from 'react';

function AnimatedButton({ isActive, ... }) {
  const scale = useSharedValue(isActive ? 1.15 : 1);

  useEffect(() => {
    scale.value = withSpring(isActive ? 1.15 : 1, SPRING_BOUNCE);
    //                                             ^^^^^^^^^^^^^ usar a constante, nunca literal
  }, [isActive, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[styles, animStyle]}>...</Animated.View>;
}
```

### Destaques de seleção (fade)

Destaques visuais de seleção em grades (ex: dia de calendário, cor, ícone) devem usar **fade de opacidade** — sem escala, sem bounce:

```tsx
function SelectableCell({ isSelected, ... }) {
  const selectOpacity = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    selectOpacity.value = withTiming(isSelected ? 1 : 0, { duration: 180 });
  }, [isSelected, selectOpacity]);

  const highlightStyle = useAnimatedStyle(() => ({ opacity: selectOpacity.value }));

  return (
    <View style={cellStyle}>
      {/* overlay colorido que faz fade in/out */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.primaryGold }, highlightStyle]} />
      <Text>{label}</Text>
    </View>
  );
}
```

**Tabela de referência rápida (valores das constantes):**

| Constante | damping | stiffness | mass | Efeito |
|-----------|---------|-----------|------|--------|
| `SPRING_BOUNCE` | 5 | 550 | 0.35 | Bounce ultrarrápido, fluido |
| `SPRING_MODAL` | 55 | 700 | — | Entrada de modal rápida, sem oscilação |

### Entrada de modais e bottom sheets

Modais devem entrar com `scale` + `opacity` combinados, usando `SPRING_MODAL`:

```tsx
const scaleAnim   = useSharedValue(0.85);
const opacityAnim = useSharedValue(0);

// ao abrir:
scaleAnim.value   = withSpring(1, SPRING_MODAL);
opacityAnim.value = withTiming(1, { duration: 180 });

// ao fechar:
scaleAnim.value   = withTiming(0.85, { duration: 150 });
opacityAnim.value = withTiming(0, { duration: 150 });
```

### Transições internas (fade)

Transições entre telas dentro de um modal (ex: opções → calendário) e trocas de conteúdo (ex: grade de mês) devem usar **fade puro** — sem translateX, sem spring:

```tsx
opacity.value = withTiming(0, { duration: 120 }, (finished) => {
  if (!finished) return;
  runOnJS(setView)('next');
  opacity.value = withTiming(1, { duration: 150 });
});
```

### Transição de telas (stack)

Todas as `Stack.Screen` devem usar `animation: 'slide_from_right'` (já configurado no `(stack)/_layout.tsx`). Não sobrescrever com `none` sem justificativa.

### Proibições

- Nunca usar `Animated` do `react-native` — usar `react-native-reanimated`
- Nunca passar literais `{ damping: X, stiffness: Y }` diretamente em `withSpring()` — usar as constantes `SPRING_*`
- Nunca usar `transform: [{ scale: ... }]` estático em `style={{}}` como substituto de animação
- Nunca usar `LayoutAnimation` do React Native core

---

## Regras de Código

- **Sem emojis** — usar exclusivamente ícones `Feather` de `@expo/vector-icons`

---

## Componentes utilitários

### `Skeleton`

Componente de placeholder animado para estados de carregamento. Substitui blocos inteiros de conteúdo durante loading — nunca apenas o campo de texto isolado.

**Importação:**
```tsx
import { Skeleton } from 'components/Skeleton';
```

**Props:**

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|----------|
| `width` | `number \| string` | `'100%'` | Largura do bloco |
| `height` | `number` | `16` | Altura do bloco |
| `borderRadius` | `number` | `8` | Arredondamento |
| `rows` | `SkeletonRowConfig[]` | — | Quando fornecido, renderiza múltiplas linhas |
| `gap` | `number` | `8` | Espaçamento entre linhas no modo `rows` |
| `style` | `ViewStyle` | — | Estilo adicional no container |

**Exemplos:**

```tsx
// Card full-width — Skeleton substitui o InfoCard inteiro
{loadingBalance ? (
  <Skeleton height={80} borderRadius={16} style={{ marginBottom: 16 }} />
) : (
  <InfoCard className="mb-4">
    {/* conteúdo real */}
  </InfoCard>
)}

// Dois cards lado a lado — Skeleton com flex: 1 mantendo o layout de colunas
<View className="flex-row gap-3 mb-4">
  {loadingMonthly ? (
    <Skeleton height={88} borderRadius={16} style={{ flex: 1 }} />
  ) : (
    <InfoCard columns={2}>{/* conteúdo real */}</InfoCard>
  )}
  {loadingMonthly ? (
    <Skeleton height={88} borderRadius={16} style={{ flex: 1 }} />
  ) : (
    <InfoCard columns={2}>{/* conteúdo real */}</InfoCard>
  )}
</View>
```

**Regra de uso:** o `Skeleton` **substitui o componente container inteiro** (ex: `InfoCard`) durante o loading — nunca renderize o container vazio com skeleton interno. Use `borderRadius={16}` para cards (equivalente a `rounded-2xl`). Para cards com `flex: 1`, passe `style={{ flex: 1 }}` no Skeleton para manter o layout de colunas.

**Animação:** pulso de opacidade (`1.0 → 0.3 → 1.0`) com `withRepeat(withTiming(...))` — 750 ms por ciclo. Background usa `colors.disabled` (responde ao tema dark/light automaticamente).

---

### `InfoCard`

Container de card genérico com suporte a layout de colunas.

**Importação:**
```tsx
import { InfoCard } from 'components/InfoCard';
```

**Props:**

| Prop | Tipo | Descrição |
|------|------|-----------|
| `columns` | `number` | Quando fornecido, aplica `flex: 1` — use dentro de `View className="flex-row"` |
| `className` | `string` | Classes adicionais |
| `style` | `ViewStyle` | Estilos adicionais |
| `children` | `ReactNode` | Conteúdo do card |

**Exemplo:**
```tsx
// Card full-width
<InfoCard className="mb-4">
  <Text>Conteúdo</Text>
</InfoCard>

// Dois cards lado a lado
<View className="flex-row gap-3">
  <InfoCard columns={2}><Text>Receitas</Text></InfoCard>
  <InfoCard columns={2}><Text>Despesas</Text></InfoCard>
</View>
```

---

### `PaginatedList<T>`

Lista paginada genérica com seletor de linhas por página e controles de navegação.

**Importação:**
```tsx
import { PaginatedList } from 'components/PaginatedList';
```

**Props principais:**

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|----------|
| `data` | `T[]` | — | Dados da página atual |
| `totalCount` | `number` | — | Total de registros (para calcular páginas) |
| `page` | `number` | — | Página atual (0-indexed) |
| `pageSize` | `number` | — | Tamanho da página |
| `onPageChange` | `(page: number) => void` | — | Callback de mudança de página |
| `onPageSizeChange` | `(size: number) => void` | — | Callback de mudança de tamanho |
| `renderItem` | `(item: T, index: number) => ReactNode` | — | Renderizador de item |
| `enableRowsCount` | `boolean` | `true` | Exibe dropdown de linhas por página |
| `enablePagination` | `boolean` | `true` | Exibe controles de paginação |
| `pageSizeOptions` | `number[]` | `[3, 5, 10]` | Opções do dropdown |
| `estimatedItemHeight` | `number` | `77` | Altura estimada por item (para minHeight) |
| `emptyIcon` | `string` | — | Ícone Feather para estado vazio |
| `emptyText` | `string` | — | Texto principal do estado vazio |
| `emptySubtext` | `string` | — | Subtexto do estado vazio |
| `ListHeaderComponent` | `ReactNode` | — | Header renderizado dentro do card |

**Regras visuais:**
- Items usam `variant="flat"` de `TransactionItem` — o card de `PaginatedList` gerencia separadores e cantos arredondados.
- Dropdown de linhas abre **para cima** (`bottom: 44`, `zIndex: 300`, `elevation: 12`).
- Indicador de página: template string `\`${currentDisplay} – ${totalPages}\`` — nunca `<Text>` aninhado.
- **Sem `any`** no TypeScript — todas as props e retornos devem ser explicitamente tipados

---

### `InfoCard.tsx`
Card container genérico com suporte a layout de colunas flexível.

**Props:**
- `children: ReactNode` — conteúdo livre
- `columns?: number` — sem valor = full width; com valor = `flex: 1` (divide espaço igualmente com siblings no mesmo row)
- `style?: StyleProp<ViewStyle>` — estilo extra opcional
- `className?: string` — classes NativeWind extras (não sobrescrevem bg/radius padrão)

**Regra de theming:** usa apenas NativeWind tokens. Nunca hex hardcoded.

```tsx
// Card de largura total
<InfoCard>...</InfoCard>

// Dois cards em row 50/50
<View className="flex-row gap-3">
  <InfoCard columns={2}>...</InfoCard>
  <InfoCard columns={2}>...</InfoCard>
</View>
```

---

### `PaginatedList.tsx`
Lista paginada genérica com seletor de linhas por página e controles de navegação.

**Genérico:** `PaginatedList<T>` — aceita qualquer tipo via generics.

**Props principais:**
- `data: T[]` — itens da página atual (já paginados via Drizzle limit/offset)
- `totalCount: number` — total de itens para cálculo de páginas
- `page: number` — página atual 0-based (controlado pelo parent)
- `pageSize: number` — linhas por página (controlado pelo parent)
- `onPageChange: (page: number) => void`
- `onPageSizeChange: (size: number) => void`
- `renderItem: (item: T, index: number) => ReactNode`
- `enableRowsCount?: boolean` — exibe seletor de qtd. linhas (default: `true`)
- `enablePagination?: boolean` — exibe controles prev/next + indicador (default: `true`)
- `pageSizeOptions?: number[]` — opções do seletor (default: `[3, 5, 10]`)
- `emptyIcon?`, `emptyText?`, `emptySubtext?` — empty state configurável
- `ListHeaderComponent?: ReactNode` — header acima da lista

**Indicador de página:** formato `1 – 10` (página atual – total de páginas)

**Componente controlled:** o parent gerencia `page` e `pageSize` como state, e os passa ao hook de query com `limit = pageSize` e `offset = page * pageSize`.

**Regra de paginação Drizzle:** ver https://orm.drizzle.team/docs/guides/limit-offset-pagination
- **`memo()`** somente quando houver evidência mensurável de re-render desnecessário (ex: lista com muitos itens)
- **`useCallback`** para handlers passados como props a componentes filhos
- **`useMemo`** para computações caras que dependem de props/estado (ex: listas filtradas, cálculos de calendário)
- Interfaces de props no mesmo arquivo do componente, com nome `<Componente>Props`

## Arquivos

### `ScreenWrapper.tsx`
Wrapper universal para telas. Resolve os dois problemas de sobreposição de layout:
- **Status bar (topo):** aplica `paddingTop: insets.top` via `useSafeAreaInsets` do `react-native-safe-area-context`
- **Tab bar flutuante (fundo):** exporta a constante `TAB_BAR_HEIGHT = 102` para ser usada como `paddingBottom` no `contentContainerStyle` de `ScrollView` / `FlatList`

**Regra:** Toda tela de tab deve usar `ScreenWrapper` como elemento raiz no lugar de `SafeAreaView` ou `View`.

```tsx
import { ScreenWrapper, TAB_BAR_HEIGHT } from 'components/ScreenWrapper';

export default function MinhaTelaTab() {
  return (
    <ScreenWrapper style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT }}>
        {/* conteúdo */}
      </ScrollView>
    </ScreenWrapper>
  );
}
```

**Não usar** `SafeAreaView` do `react-native` (não respeita insets no Android). Usar apenas `ScreenWrapper`.

---

### `DatePicker.tsx`
Botão que exibe a data selecionada e abre o `DatePickerModal` ao pressionar.

**Props:** `data: Date`, `onChangeData: (data: Date) => void`, `label?: string`

### `DatePickerModal.tsx`
Modal de seleção de data com opções rápidas (Hoje, Ontem, Amanhã) e calendário manual.

**Props:** `visible: boolean`, `data: Date`, `onSelectDate: (data: Date) => void`, `onClose: () => void`

Otimizações aplicadas:
- `calendarDays` calculado com `useMemo` (depende de `selectedMonth` / `selectedYear`)
- `opcoesDatas` calculado com `useMemo` (estável entre renders)
- Todos os event handlers com `useCallback`

### `EntitySelector.tsx`
Componente genérico reutilizável para listar e selecionar entidades (categorias, contas, cartões, metas etc.) em uma tela full-screen.

**Props genéricas `<T>`:**
- `title`, `items`, `loading`, `selectedId`
- `keyExtractor`, `renderItem`, `searchFilter` — definem como o item é exibido e filtrado
- `onSelect` — callback ao selecionar um item
- `onAdd?` — handler do botão "+" no header; se omitido, botão não aparece
- `emptyText?`, `searchPlaceholder?`, `headerRight?`

**Padrão de uso com navegação e callback store:**

```tsx
// Na tela origem (ex: addTransaction.tsx):
import { setSelectionCallback } from 'utils/selectionStore';
import { useRouter } from 'expo-router';

setSelectionCallback<Category>('category', (cat) => {
  setSelectedCategory(cat);
  form.setFieldValue('categoryId', cat.id);
});
router.push({
  pathname: '/(stack)/category',
  params: { transactionType, selectedId: currentCategoryId },
});

// Na tela de seleção (ex: (stack)/category/index.tsx):
import { consumeSelectionCallback } from 'utils/selectionStore';

const cb = consumeSelectionCallback<Category>('category');
cb?.(category);
router.back();
```

> **Preservação de estado:** as abas do Expo Tabs permanecem montadas quando uma stack é pushed por cima — o formulário fica intacto ao navegar para a tela de seleção e voltar.

### `ActionButton.tsx`

Botão de ícone genérico para ações de interface: voltar, fechar modal, paginação, etc.

**Props:**
- `icon: FeatherIconName` — ícone a exibir
- `onPress: () => void`
- `disabled?: boolean` — reduz opacity para 0.25; default `false`
- `iconSize?: number` — tamanho do ícone; default `22`

**Visual:** Container fixo 40×40, `borderRadius: 12` (`rounded-xl`), fundo `colors.primaryGold`, ícone `colors.primaryGoldContrast`.

**Animação:** `Pressable` + `Animated.View` — `pressIn` encolhe para `scale 0.88` (spring rápido) e `pressOut` volta com bounce (`damping:7, stiffness:400, mass:0.6`).

> **Regra obrigatória:** Sempre usar `ActionButton` para botões de ícone em headers, paginação e fechamento de modais. **Nunca** usar `TouchableOpacity` puro nesses casos — o componente garante animação consistente e visual padronizado em toda a aplicação.

```tsx
import { ActionButton } from 'components/ActionButton';

// Botão voltar no header
<ActionButton icon="chevron-left" onPress={() => router.back()} />

// Fechar modal
<ActionButton icon="x" onPress={onClose} />

// Paginação com disabled
<ActionButton
  icon="chevron-left"
  iconSize={20}
  disabled={currentPage === 0}
  onPress={() => goToPage(currentPage - 1)}
/>
```

### `IconPickerGrid.tsx`

Grade paginada de ícones Feather com animação de slide/fade entre páginas e feedback bounce ao selecionar.

**Props (`IconPickerGridProps`):**
- `selectedIcon: string` — ícone atualmente selecionado (nome Feather)
- `onSelectIcon: (icon: string) => void` — chamado ao selecionar ou trocar um ícone
- `selectedColor: string` — cor de destaque usada no ícone selecionado e nos dots de paginação
- `colors: typeof darkColors | typeof lightColors` — paleta do tema atual
- `containerPadding?: number` — soma dos paddings horizontais externos em px; padrão `80` (scroll 24×2 + card 16×2)

**Comportamento:**
- Ícones fixos: `CATEGORY_ICONS` de `utils/categoryConstants` (importado internamente)
- Layout: 5 colunas × 4 linhas = 20 ícones por página
- Tamanho das células calculado via `useWindowDimensions` menos `containerPadding`
- Navegação por setas (`ActionButton`) com dots de paginação animados
- Animação de troca de página: slide + fade (`withTiming`, 100 ms saída / 130 ms entrada)
- Animação de seleção: bounce spring (`damping: 8, stiffness: 400, mass: 0.6`)

**Uso padrão (padding 80 — ScrollView com paddingHorizontal 24 + card com padding 16):**

```tsx
import { IconPickerGrid } from 'components/IconPickerGrid';

<IconPickerGrid
  selectedIcon={selectedIcon}
  onSelectIcon={setSelectedIcon}
  selectedColor={selectedColor}
  colors={colors}
/>
```

**Contexto com padding diferente:**

```tsx
// Ex: tela sem ScrollView com paddingHorizontal 16 e card com padding 12 → total 56
<IconPickerGrid
  selectedIcon={selectedIcon}
  onSelectIcon={setSelectedIcon}
  selectedColor={selectedColor}
  colors={colors}
  containerPadding={56}
/>
```

> **Label do campo:** O componente renderiza apenas a grid (card com a grade + paginação). O `<Text>` do label "Ícone" fica a cargo da tela consumidora, como nos demais campos do formulário.

---

### `Loading.tsx`

Indicador de carregamento com três animações simultâneas em reanimated.

**Exports:** `Loading` + `LoadingScreen` (wrapper tela cheia).

**Props (`LoadingProps`):**
- `message?: string` — padrão `'Carregando...'`
- `size?: 'small' | 'medium' | 'large'` — padrão `'medium'`
- `showIcon?: boolean` — padrão `true`

**Animações:**
- Ícone rotaciona continuamente (1500ms, bezier 0.65/0/0.35/1)
- Container do ícone pulsa escala 1→1.1→1 (2000ms loop)
- 3 dots piscam em sequência com offset de 200ms (ciclo 1200ms)

```tsx
import { Loading, LoadingScreen } from 'components/Loading';

// Inline dentro de um container
<Loading message="Carregando transações..." size="medium" />

// Tela cheia
<LoadingScreen message="Aguarde..." />
```

---

### `EscopoEdicaoModal.tsx`

Modal com três opções de escopo de edição para transações de grupo.

**Props:**
- `visible: boolean`
- `onClose: () => void`
- `onSelectEscopo: (escopo: EditScope) => void`
- `hasGroup: boolean` — desabilita as opções `all_related` e `from_this_forward` quando false

**Opções:**
| Valor | Label | Disponível |
|-------|-------|------------|
| `only_this` | Apenas esta | Sempre |
| `from_this_forward` | Esta e futuras | Apenas com grupo |
| `all_related` | Todas do grupo | Apenas com grupo |

**Animação:** `scale 0.85→1` + `opacity 0→1` via `withSpring` / `withTiming`.

---

### `AttachmentPicker.tsx`

Seletor de arquivos (câmera, galeria, PDF) que retorna lista de `AttachmentLocal[]` com base64.

**Props:**
- `attachments: AttachmentLocal[]`
- `onAttachmentsChange: (list: AttachmentLocal[]) => void`
- `maxAttachments?: number` — padrão `5`
- `onError?: (msg: string) => void`
- `isReceipt?: boolean` — padrão `false`; marca `isReceipt: true` nos itens

**Regras:**
- Limite de 10 MB por arquivo
- Esconde os botões de seleção ao atingir `maxAttachments`
- Usa `expo-image-picker`, `expo-document-picker`, `expo-file-system`

---

### `AttachmentViewer.tsx`

Modal fullscreen para visualização de imagens ou PDFs já salvos no banco.

**Props:**
- `attachment: Attachment`
- `visible: boolean`
- `onClose: () => void`

**Ações disponíveis:**
- Imagens: salvar na galeria via `expo-media-library`
- PDFs: copiar para `documentDirectory` e compartilhar via `expo-sharing`
- Compartilhar qualquer tipo via `expo-sharing`

---

### `ReceiptModal.tsx`

Bottom sheet para adicionar comprovante ao marcar uma transação como paga.

**Props:**
- `visible: boolean`
- `transactionId: string`
- `onClose: () => void`
- `onSuccess: () => void`
- `onSkip: () => void`

**Comportamento:** usa `AttachmentPicker` com `maxAttachments=1, isReceipt=true`. Chama `useAttachments(transactionId).createReceipt()` ao enviar.

---

### `TransacaoDetalhesModal.tsx`

Modal slide-up com detalhes completos de uma transação.

**Props:**
- `visible: boolean`
- `transaction: TransactionWithCategory`
- `onClose: () => void`
- `onEdit: () => void`

**Seções:** hero (valor, badge de status), informações (data, tipo de pagamento, parcelas), comprovante (se pago), lista de anexos. Usa `AttachmentViewer` para abrir um anexo.

---

### `TransactionItem.tsx`

Item de transação com swipe para marcar pago/pendente.

**Props:**
- `transaction: TransactionWithCategory`
- `onPress?: () => void` — se omitido, abre `TransacaoDetalhesModal`
- `variant?: 'card' | 'simple'` — padrão `'card'`; `simple` remove bordas e padding de card
- `showTime?: boolean`
- `onStatusChanged?: () => void` — chamado após toggle de status (ex: refetch da lista)

**Swipe direito:** botão pago/pendente. Ao marcar como pago, abre `ReceiptModal` automaticamente.

**Editar:** botão de lápis → `EscopoEdicaoModal` → navega para `/(stack)/editTransaction` com todos os parâmetros da transação.
