# Architecture

**Pattern:** Offline-first mobile app — modular, feature-split screens over a local SQLite database

## High-Level Structure

```
┌─────────────────────────────────────────────────────┐
│                  React Native App                    │
│  ┌─────────────────────────────────────────────────┐│
│  │              expo-router (file-based)            ││
│  │   ┌──────────────┐   ┌───────────────────────┐  ││
│  │   │  (tabs)/     │   │  (stack)/             │  ││
│  │   │  5 tab screens│   │  18 detail/form screens│ ││
│  │   └──────────────┘   └───────────────────────┘  ││
│  └─────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────┐│
│  │              Custom Hooks Layer                  ││
│  │  useTransactions / useGoals / useAccounts / ...  ││
│  │  Each hook: own SQLite connection + Drizzle query││
│  └─────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────┐│
│  │         Drizzle ORM + expo-sqlite (SQLite)       ││
│  │  Schema in db/schema.ts · Migrations in drizzle/ ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

## Identified Patterns

### Custom Hook as Data-Access Object

**Location:** `hooks/`  
**Purpose:** Encapsulate all SQLite reads and writes per entity. Screens do not write Drizzle queries directly (except `addTransaction.tsx`).  
**Implementation:** Each hook opens its own SQLite connection (`SQLite.openDatabaseSync('db.db')` + `drizzle(expo)`), executes synchronous Drizzle queries, and returns `{ data, loading, error, refetch }`.  
**Example:** `hooks/useTransactions.ts`, `hooks/useGoals.ts`

### Inline DB in Screen (mutation-heavy screens)

**Location:** `app/(tabs)/addTransaction.tsx`  
**Purpose:** The "add transaction" screen writes multiple tables (transactions + transactionGroups) in a single flow, making it simpler to do the DB calls inline.  
**Implementation:** Declares its own `const db = drizzle(expo)` at module level, constructs Drizzle inserts inline.  
**Example:** `app/(tabs)/addTransaction.tsx` lines 10–13

### File-Based Navigation (expo-router)

**Location:** `app/`  
**Purpose:** Automatic route registration — no manual RouteConfig. File path = URL.  
**Implementation:** `app/_layout.tsx` is the root Stack, `app/(tabs)/` maps to the floating bottom tab bar, `app/(stack)/` maps to pushed screens.  
**Example:** `app/(tabs)/index.tsx` → home tab; `app/(stack)/editTransaction.tsx` → pushed edit screen

### SelectionStore (cross-screen callback singleton)

**Location:** `utils/selectionStore.ts`  
**Purpose:** Pass selection callbacks between screens without a global state library (avoids prop-drilling through expo-router params for complex objects).  
**Implementation:** Module-level `Map<string, callback>`. Calling screen sets a keyed callback before navigating; destination screen consumes + deletes it on selection.  
**Example:** `addTransaction.tsx` sets callback before navigating to `goalSelect.tsx`

### Theme via Context + NativeWind

**Location:** `themes/ThemeContext.tsx`, `themes/colors.ts`, `tailwind.config.ts`  
**Purpose:** Consistent dark/light theming persisted to SQLite and exposed via React Context + NativeWind class tokens.  
**Implementation:** `ThemeProvider` reads the current theme from the `settings` table synchronously on init, exposes `useTheme()`. `tailwind.config.ts` converts `darkColors`/`lightColors` into Tailwind tokens (`dark-*`/`light-*`). NativeWind then applies them via `className`.  
**Example:** `className="bg-light-card-background dark:bg-dark-card-background"`

### Biometric Gate

**Location:** `app/_layout.tsx` (`BiometricGate` component)  
**Purpose:** Lock the entire app behind biometric/PIN authentication. Checks on app foreground.  
**Implementation:** Wraps `AppNavigator` in `BiometricGate`. Uses `expo-local-authentication`. Re-locks after app moves to background.

## Data Flow

### Transaction Creation

```
addTransaction.tsx
  → form.handleSubmit()
  → if single: db.insert(transactions)
  → if installment: db.insert(transactionGroups) then db.insert(transactions) × N
  → if recurring: db.insert(transactionGroups) then generate ~6 months of transactions
  → router.back()
```

### Transaction Editing (scoped)

```
editTransaction.tsx
  → useEditTransaction.mutate({ scope, data })
  → scope='only_this':       UPDATE WHERE id = transactionId
  → scope='all_related':     UPDATE WHERE transactionGroupId = groupId
  → scope='from_this_forward': UPDATE WHERE groupId AND date >= currentDate
```

### Theme Switching

```
settings.tsx → useTheme().setAppTheme(newTheme)
  → SQLite UPSERT settings row
  → nativewind colorScheme.set(newTheme)
  → React state update → re-render with new colors
```

### Balance Calculation

```
useTotalBalance.ts
  → SELECT SUM(balance) FROM accounts WHERE is_active = 1
Balance is mutated by hooks when transaction status changes to 'paid'
```

## Code Organization

**Approach:** Layer-based at the root, feature-split within `app/(stack)/`

**Structure:**
```
app/        → screens (expo-router)
  (tabs)/   → 5 tab screens (home, transactions, add, reports, settings)
  (stack)/  → 18 push screens (CRUD for all entities)
components/ → reusable UI components (dumb + smart)
hooks/      → data-access hooks (one per entity/query need)
db/         → schema + migration SQL
drizzle/    → generated SQL migrations + migrations.js bundle
themes/     → colors + ThemeContext
types/      → TypeScript enums + Drizzle-inferred types
utils/      → pure functions + singleton stores
```

**Module boundaries:**
- `db/schema.ts` is the single source of truth for all DB types
- `types/` re-exports inferred Drizzle types + adds TypeScript enums
- `hooks/` is the only layer that should query/mutate the DB (exception: `addTransaction.tsx`)
- `components/` must not import from `hooks/` unless the hook is a utility (e.g. `useCustomAlert`)
