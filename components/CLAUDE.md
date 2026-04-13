# components/ — Componentes

Componentes React Native reutilizáveis na interface da aplicação.

## Regras de Theming

### Classes Tailwind (NativeWind)
Sempre usar os tokens definidos em `themes/colors.ts` via classes Tailwind:

```tsx
// Correto
<View className="bg-cardBackground" />
<Text className="text-textPrimary" />

// Proibido — nunca hardcode hex no className
<View className="bg-[#1A1A1A]" />
```

### Cores em `style={{}}`
Para propriedades que não suportam classe Tailwind (ex: `borderColor`, `backgroundColor` dinâmico), importar `darkColors` ou `lightColors` de `themes/colors.ts`:

```tsx
import { darkColors } from 'themes/colors';

<View style={{ borderColor: darkColors.primaryGold }} />
<View style={{ backgroundColor: darkColors.primaryGold + '20' }} /> // 20 = 12% opacidade
```

> **Contraste sobre `primaryGold`**: Quando `backgroundColor` for `colors.primaryGold`, usar `colors.primaryGoldContrast` para `color` de textos/ícones e `borderColor` de contornos — nunca `'#000'` direto.

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

### Seleção / Toggle (bounce)

Quando o usuário seleciona um item (cor, ícone, opção de toggle, chip), aplicar spring com bounce:

```tsx
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useEffect } from 'react';

function AnimatedSelectableItem({ isSelected, ... }) {
  const scale = useSharedValue(isSelected ? 1.15 : 1);

  useEffect(() => {
    scale.value = withSpring(isSelected ? 1.15 : 1, {
      damping: 8,    // baixo = mais bounce
      stiffness: 400,
      mass: 0.6,
    });
  }, [isSelected, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[styles, animStyle]}>...</Animated.View>;
}
```

**Parâmetros de referência rápida:**

| Caso | damping | stiffness | mass | Efeito |
|------|---------|-----------|------|--------|
| Bounce forte (cor/ícone selecionado) | 6–8 | 400 | 0.6 | Ultrapassa e volta |
| Slide / indicador deslizante | 18–20 | 400–500 | — | Rápido, sem oscilação |
| Desfoco / deselect | 12–14 | 400 | — | Retorno suave |
| Modal / entrada de tela | 10–14 | 300 | — | Expansão natural |

### Entrada de modais e bottom sheets

Modais devem entrar com `scale` + `opacity` combinados:

```tsx
const scaleAnim = useSharedValue(0.85);
const opacityAnim = useSharedValue(0);

// ao abrir:
scaleAnim.value = withSpring(1, { damping: 14, stiffness: 300 });
opacityAnim.value = withTiming(1, { duration: 150 });

// ao fechar:
scaleAnim.value = withSpring(0.85, { damping: 14, stiffness: 300 });
opacityAnim.value = withTiming(0, { duration: 120 });
```

### Transição de telas (stack)

Todas as `Stack.Screen` devem usar `animation: 'slide_from_right'` (já configurado no `(stack)/_layout.tsx`). Não sobrescrever com `none` sem justificativa.

### Proibições

- Nunca usar `Animated` do `react-native` — usar `react-native-reanimated`
- Nunca usar `transform: [{ scale: ... }]` estático em `style={{}}` como substituto de animação
- Nunca usar `LayoutAnimation` do React Native core

---

## Regras de Código

- **Sem emojis** — usar exclusivamente ícones `Feather` de `@expo/vector-icons`
- **Sem `any`** no TypeScript — todas as props e retornos devem ser explicitamente tipados
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
