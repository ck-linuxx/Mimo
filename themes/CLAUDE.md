# themes/ — Documentação do Módulo

## O que este módulo faz

Gerencia o tema visual (dark/light) da aplicação:
- Define a paleta de cores para ambos os temas em TypeScript (`colors.ts`)
- Persiste o tema escolhido na tabela `settings` do SQLite local
- Sincroniza o estado do NativeWind (`colorScheme.set()`) ao carregar e ao trocar de tema
- Expõe o hook `useTheme()` para ser chamado em qualquer componente

## Principais arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `colors.ts` | **Única fonte da verdade das cores.** Exporta `darkColors` e `lightColors` (objetos camelCase tipados com `as const`). Importado tanto pelo código da aplicação quanto pelo `tailwind.config.ts` |
| `useTheme.ts` | Hook que lê/escreve o tema no SQLite e aplica via NativeWind |
| `index.ts` | Re-exporta tudo para importações limpas: `import { useTheme } from 'themes'` |

## Convenções e decisões de design

### `colors.ts` é a fonte de verdade única
> **Nunca adicione cores diretamente no `tailwind.config.ts`.** Todas as cores devem ser definidas em `colors.ts`.

O `tailwind.config.ts` (raiz do projeto) importa `darkColors` e `lightColors` diretamente de `colors.ts` e converte os nomes de `camelCase` para `kebab-case` automaticamente via a função `toTailwindTokens`. Assim, basta editar `colors.ts` e as classes Tailwind são atualizadas automaticamente.

### Nomenclatura
- Em `colors.ts`: **camelCase** — `cardBackground`, `textPrimary`, `incomeColor`
- No Tailwind (classes): **kebab-case** — `card-background`, `text-primary`, `income-color` (conversão automática)

### Persistência
- Tabela `settings` com **linha única** (`id = 1`). Upsert com `onConflictDoUpdate` para updates.
- A row padrão (`id=1, theme='light'`) é criada via `INSERT OR IGNORE` no primeiro uso do hook.

### Tailwind / NativeWind
- Cores registradas em dois namespaces: `dark.*` e `light.*` (kebab-case).
- Uso nos componentes via variante condicional:
  ```tsx
  className={theme === 'dark' ? 'bg-dark-background' : 'bg-light-background'}
  ```
- Ou via variante `dark:` do NativeWind (ativada pelo `colorScheme.set()`):
  ```tsx
  className="bg-light-background dark:bg-dark-background"
  ```

### Hook `useTheme`
- Lê o tema do DB no `useEffect` de mount e aplica `colorScheme.set()`.
- `setAppTheme(theme)`: faz upsert no DB + atualiza NativeWind + state local.
- Não há Context ou Zustand — o `colorScheme` do NativeWind já é global.
- Instancia seu próprio `db` internamente — não recebe o db por parâmetro.

### Como usar em um componente
```tsx
import { useTheme } from 'themes';

const { theme, setAppTheme } = useTheme();

// trocar tema (persiste automaticamente no SQLite)
setAppTheme('dark');
```

## Tokens de cores

| Token (`colors.ts`) | Classe Tailwind | Dark | Light |
|---------------------|-----------------|------|-------|
| `background` | `bg-dark-background` | `#0D0D0D` | `#F5F5F5` |
| `cardBackground` | `bg-dark-card-background` | `#1A1A1A` | `#FFFFFF` |
| `primaryGold` | `text-dark-primary-gold` | `#D4AF37` | `#B8960C` |
| `accentGold` | `text-dark-accent-gold` | `#F5C242` | `#D4AF37` |
| `textPrimary` | `text-dark-text-primary` | `#FFFFFF` | `#0D0D0D` |
| `textSecondary` | `text-dark-text-secondary` | `#A6A6A6` | `#6B6B6B` |
| `borderColor` | `border-dark-border-color` | `#2D2D2D` | `#E0E0E0` |
| `incomeColor` | `text-dark-income-color` | `#22C55E` | `#22C55E` |
| `expenseColor` | `text-dark-expense-color` | `#EF4444` | `#EF4444` |
| `disabled` | `text-dark-disabled` | `#4B4B4B` | `#C4C4C4` |
| `iconBackground` | `bg-dark-icon-background` | `#252525` | `#EFEFEF` |

