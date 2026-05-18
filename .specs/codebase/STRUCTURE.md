# Project Structure

**Root:** `/home/clark/Projetos/mimoV2`

## Directory Tree

```
mimoV2/
├── app/                        # Screens (expo-router)
│   ├── _layout.tsx             # Root layout: DB init, migrations, BiometricGate, ThemeProvider
│   ├── (tabs)/                 # Tab navigator (5 screens)
│   │   ├── _layout.tsx         # Tab bar config + icons
│   │   ├── index.tsx           # Home: balance, monthly summary, pending transactions
│   │   ├── transactions.tsx    # Transaction list with month filter
│   │   ├── addTransaction.tsx  # Create transaction (single/installment/recurring)
│   │   ├── reports.tsx         # Reports: expense by category, trends
│   │   └── settings.tsx        # App settings (theme, biometrics, accounts, cards, goals, categories)
│   └── (stack)/                # Stack navigator (18 push screens)
│       ├── _layout.tsx         # Stack config (slide_from_right animation)
│       ├── editTransaction.tsx # Edit existing transaction (scoped: single/group)
│       ├── accountCreate.tsx   # Create account
│       ├── accountDetail.tsx   # Account detail
│       ├── accountSelect.tsx   # Select account (callback via selectionStore)
│       ├── accountsManage.tsx  # Manage accounts list
│       ├── cardBillingDetail.tsx # Card billing cycle detail
│       ├── cardCreate.tsx      # Create card
│       ├── cardDetail.tsx      # Card detail + transactions
│       ├── cardsManage.tsx     # Manage cards list
│       ├── categoriesManage.tsx # Manage categories
│       ├── categoryCreate.tsx  # Create category
│       ├── categorySelect.tsx  # Select category (callback via selectionStore)
│       ├── goalCreate.tsx      # Create financial goal
│       ├── goalDetail.tsx      # Goal detail + progress
│       ├── goalEdit.tsx        # Edit financial goal
│       ├── goalSelect.tsx      # Select goal (callback, only from addTransaction)
│       ├── goalsManage.tsx     # Manage goals list (active/completed tabs)
│       └── paymentMethodSelect.tsx # Select account or card for payment
├── components/                 # Reusable UI components
│   ├── charts/                 # Apache ECharts-based chart components
│   └── reports/                # Report card composites (chart + list + pagination)
├── db/
│   ├── schema.ts               # Drizzle table definitions + inferred types
│   └── CLAUDE.md
├── drizzle/
│   ├── 0000_*.sql … 0008_*.sql # Migration SQL files
│   └── migrations.js           # Bundled migrations for runtime (expo-sqlite)
├── hooks/                      # Custom data-access hooks
│   ├── transactions/           # Transaction-specific hooks (paginated, reports, status)
│   └── attachments/            # Attachment hooks (group-scoped)
├── themes/
│   ├── colors.ts               # darkColors / lightColors palette
│   ├── ThemeContext.tsx        # ThemeProvider + useTheme hook
│   └── index.ts                # Re-exports
├── types/                      # TypeScript enums + Drizzle-inferred types per entity
├── utils/                      # Pure utility functions + singleton stores
├── assets/                     # Static assets (fonts, images)
├── android/                    # Android native project
├── ios/                        # iOS native project
├── .specs/                     # TLC Spec-Driven docs
│   ├── project/PROJECT.md
│   └── codebase/               # This folder
├── tailwind.config.ts          # NativeWind token mapping (darkColors → dark-* classes)
├── babel.config.js
├── metro.config.js
├── drizzle.config.ts
├── tsconfig.json
└── package.json
```

## Module Organization

### `app/(tabs)/`

**Purpose:** The five main tab screens the user navigates between daily.  
**Location:** `app/(tabs)/`  
**Key files:** `index.tsx` (home), `addTransaction.tsx` (creation form), `reports.tsx` (analytics), `transactions.tsx` (history), `settings.tsx` (config hub)

### `app/(stack)/`

**Purpose:** Detail, creation, and editing screens pushed on top of tabs.  
**Location:** `app/(stack)/`  
**Key files:** `editTransaction.tsx`, `accountsManage.tsx`, `goalsManage.tsx`, `categorySelect.tsx`, `paymentMethodSelect.tsx`

### `components/`

**Purpose:** Reusable, themed UI primitives and composites.  
**Location:** `components/`  
**Key files:** `ScreenWrapper.tsx` (safe-area wrapper + TAB_BAR_HEIGHT), `TransactionItem.tsx`, `PaginatedList.tsx`, `CustomAlert.tsx`, `AppButton.tsx`, `ActionButton.tsx`, `DatePicker.tsx`, `AttachmentPicker.tsx`

### `components/charts/`

**Purpose:** Apache ECharts chart components (DonutChart, etc.).  
**Key files:** `DonutChart.tsx`

### `components/reports/`

**Purpose:** Composite report cards combining chart + selector + paginated list.  
**Key files:** `ChartListCard.tsx`

### `hooks/`

**Purpose:** SQLite data-access hooks, one per entity/query purpose.  
**Location:** `hooks/`  
**Key files:** `useTransactions.ts`, `useAccounts.ts`, `useCards.ts`, `useGoals.ts`, `useTotalBalance.ts`, `useSettings.ts`, `useCustomAlert.ts`, `useEditTransaction.ts`

### `hooks/transactions/`

**Purpose:** Transaction-specific sub-hooks (reports, pending list, group counts).  
**Key files:** `usePendingTransactions.ts`, `useReportsExpenseComposition.ts`, `useGroupPaidCount.ts`

### `hooks/attachments/`

**Purpose:** Attachment hooks scoped to a transaction group.  
**Key files:** `useGroupAttachments.ts`

### `db/`

**Purpose:** Schema definition + migration SQL bundle.  
**Key files:** `schema.ts` (all table definitions + enums + `$inferSelect`/`$inferInsert` types)

### `themes/`

**Purpose:** Dark/light color palette + theme persistence + NativeWind integration.  
**Key files:** `colors.ts` (palette), `ThemeContext.tsx` (provider + hook), `index.ts` (re-exports)

### `types/`

**Purpose:** TypeScript enum definitions and Drizzle-inferred type re-exports, one file per entity.  
**Key files:** `index.ts` (barrel), `transaction.ts`, `transactionGroup.ts`, `financialGoal.ts`, `attachment.ts`

### `utils/`

**Purpose:** Pure helper functions and singleton stores.  
**Key files:** `generateId.ts`, `formatCurrency.ts`, `selectionStore.ts`, `buildFormPatch.ts`, `frequency.ts`, `transactionLabels.ts`, `seedCategories.ts`

## Where Things Live

**Transaction CRUD:**

- Create: `app/(tabs)/addTransaction.tsx`
- Read (list): `hooks/useTransactions.ts`, `app/(tabs)/transactions.tsx`
- Read (pending): `hooks/transactions/usePendingTransactions.ts`
- Update: `hooks/useEditTransaction.ts`, `app/(stack)/editTransaction.tsx`
- Delete/Cancel: inline in transaction detail/list screens

**Financial Goals:**

- Schema: `db/schema.ts` (`financialGoals` table)
- Hooks: `hooks/useGoals.ts`
- Manage: `app/(stack)/goalsManage.tsx`, `app/(stack)/goalDetail.tsx`, `app/(stack)/goalEdit.tsx`
- Select (from transaction): `app/(stack)/goalSelect.tsx`

**Settings & Theme:**

- Persistence: `hooks/useSettings.ts` + `themes/ThemeContext.tsx` (both hit `settings` table)
- UI: `app/(tabs)/settings.tsx`

**Migrations:**

- Source SQL: `drizzle/000X_*.sql`
- Bundled JS: `drizzle/migrations.js` (imported in `app/_layout.tsx`)
