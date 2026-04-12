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
