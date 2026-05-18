# Code Conventions

## Naming Conventions

**Files:**
- Screens: camelCase (`addTransaction.tsx`, `editTransaction.tsx`, `goalDetail.tsx`)
- Components: PascalCase (`ActionButton.tsx`, `TransactionItem.tsx`, `DonutChart.tsx`)
- Hooks: camelCase prefixed with `use` (`useTransactions.ts`, `useCustomAlert.ts`)
- Utils: camelCase (`formatCurrency.ts`, `generateId.ts`, `selectionStore.ts`)
- Types: camelCase matching the entity (`transaction.ts`, `financialGoal.ts`)

**Functions/Methods:**
- Components: PascalCase — `export default function EditTransactionScreen()`
- Hooks: camelCase prefixed with `use` — `export function useTransactions()`
- Utilities: camelCase — `export function formatCurrency()`, `export function generateId()`
- Event handlers: `handle` prefix — `handleAmountChange`, `handleSubmit`

**Variables:**
- camelCase — `amountDisplay`, `selectedScope`, `monthlyTransactions`
- Boolean state: descriptive — `loading`, `saving`, `isLocked`, `isSubscription`
- Color objects: `colors` (from `theme === 'dark' ? darkColors : lightColors`)

**Constants:**
- SCREAMING_SNAKE_CASE for module-level constants — `SPRING_BOUNCE`, `SPRING_MODAL`, `TAB_BAR_HEIGHT`
- Spring config constants defined per file, never passed as literals

**TypeScript Enums:**
- PascalCase enum name + `Enum` suffix — `TransactionStatusEnum`, `GroupTypeEnum`, `FrequencyEnum`
- Values match the SQLite string values — `TransactionStatusEnum.Paid = 'paid'`

## Code Organization

**Import ordering (observed pattern):**
```tsx
// 1. React + RN core
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
// 2. Third-party libraries
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useForm } from '@tanstack/react-form';
// 3. Internal: db
import { transactions } from 'db/schema';
// 4. Internal: components
import { ScreenWrapper } from 'components/ScreenWrapper';
// 5. Internal: hooks
import { useCustomAlert } from 'hooks/useCustomAlert';
// 6. Internal: themes/types/utils
import { darkColors, lightColors } from 'themes/colors';
import { useTheme } from 'themes';
import { TransactionStatusEnum } from 'types';
```

**File structure (screens):**
```tsx
// ─── Imports ──────────────────────────────────────────────────────────────
// ─── Constants / Config ───────────────────────────────────────────────────
// ─── Form schema (zod) ────────────────────────────────────────────────────
// ─── Component ────────────────────────────────────────────────────────────
export default function SomeScreen() { ... }
```
Section separators use `// ─── Label ──...` style (ASCII box-drawing dash).

## Theming

**Preferred approach — NativeWind class tokens:**
```tsx
<View className="bg-light-card-background dark:bg-dark-card-background" />
<Text className="text-light-text-primary dark:text-dark-text-primary" />
```

**`style={{}}` only for:**
- Feather icon `color` prop (doesn't accept className)
- Dynamic values from DB (e.g., category color)
- Numeric layout props without Tailwind equivalent

```tsx
const { theme } = useTheme();
const colors = theme === 'dark' ? darkColors : lightColors;
<Feather name="star" color={colors.primaryGold} />
```

**Over `primaryGold` backgrounds:** always use `colors.primaryGoldContrast` for text/icon color.

**Contrast rule observed in stack screens:** many existing stack screens (e.g., `editTransaction.tsx`) apply theming directly via `style={{ backgroundColor: colors.xxx }}` rather than NativeWind tokens. This is an acknowledged inconsistency (see `CONCERNS.md`).

## Animations

- **Library:** react-native-reanimated only (`withSpring`, `withTiming`) — never `Animated` from RN core
- **Spring constants:** defined at top of each file using named constants, never inline literals:
  ```tsx
  const SPRING_BOUNCE = { damping: 15, stiffness: 300 };
  const SPRING_MODAL  = { damping: 20, stiffness: 200 };
  withSpring(1, SPRING_BOUNCE); // ✅
  withSpring(1, { damping: 15, stiffness: 300 }); // ❌
  ```

## Alerts

Never use `Alert` from React Native. Always:
```tsx
const { showError, showSuccess, showInfo, showConfirm } = useCustomAlert();
showError('Título', 'Mensagem');
```
Render `<CustomAlert />` at the bottom of the screen JSX with `alertConfig` and `visible` from the hook.

## Forms

- `@tanstack/react-form` with `validators: { onChange: zodSchema }` — no manual `safeParse` in `onSubmit`
- Amount input: custom masked handler (`handleAmountChange`) that strips non-digits and divides by 100 to produce the `number` value, while displaying a pt-BR formatted string
- Change detection for bulk edits: use `buildFormPatch(fieldMeta, value)` from `utils/buildFormPatch.ts` — relies on `!isDefaultValue`, not `isDirty`

## Data Access

- Hooks return: `{ data: T[], loading: boolean, error: string | null, refetch: () => void }`
- Paginated hooks return additionally: `totalCount: number`
- Initial state: `loading: true`, `data: []`, `error: null`
- Queries are synchronous (`.all()` / `.get()`) — no async/await in hooks
- Paginación: always DB-level via `.limit(n).offset(m)` — never in-memory `.slice()`

## Refetch on Focus

Screens with mutable data lists **must** call `refetch()` via `useFocusEffect` + `useCallback`:
```tsx
useFocusEffect(
  useCallback(() => {
    refetchA();
    refetchB();
  }, [refetchA, refetchB]),
);
```

## IDs and Timestamps

- IDs: `text` PK, generated via `generateId()` (UUID v4, `crypto.getRandomValues`)
- Timestamps: `integer` in milliseconds (`Date.now()`)
- Monetary values: `real` (decimal) in SQLite — not integers/cents

## Alerts and User Feedback

- Success alerts include `autoClose: 2000` ms, then `setTimeout(() => router.back(), 2200)` for navigation after save
- Error alerts from form submission: `showError('Title', errorString)`

## Language

- All UI strings are in Brazilian Portuguese
- Variable/function names are in English
- Code comments mix English and Portuguese depending on context
