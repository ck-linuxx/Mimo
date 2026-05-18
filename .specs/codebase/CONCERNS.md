# Codebase Concerns

**Analysis Date:** 2026-05-17

## Tech Debt

**Multiple DB connection instances per module:**

- Issue: Every hook and some screens call `SQLite.openDatabaseSync('db.db')` + `drizzle(expo)` independently, creating a new connection object per module load. The `db` exported from `app/_layout.tsx` is never imported by hooks.
- Files: `hooks/useTransactions.ts`, `hooks/useGoals.ts`, `hooks/useAccounts.ts`, `hooks/useSettings.ts`, `themes/ThemeContext.tsx`, `app/(tabs)/addTransaction.tsx` (and all other hooks)
- Why: Copy-paste pattern established early in development; no central DB singleton was created
- Impact: Potential for connection contention on devices with strict SQLite concurrency limits; harder to introduce connection-level features (e.g., WAL mode, busy timeout) consistently
- Fix approach: Create `db/client.ts` exporting a single `drizzle(expo)` instance and import it everywhere. Remove per-module `openDatabaseSync` calls.

**Theming inconsistency — stack screens bypass NativeWind:**

- Issue: All `app/(stack)/` screens apply background and border colors via `style={{ backgroundColor: colors.xxx }}` rather than NativeWind tokens, which is the mandated approach in `components/CLAUDE.md`
- Files: `app/(stack)/editTransaction.tsx`, `app/(stack)/goalCreate.tsx`, `app/(stack)/goalEdit.tsx`, and all other stack screens
- Why: Stack screens were built (or not updated) before the NativeWind theming convention was fully enforced
- Impact: Inconsistent code style; stack screens won't automatically get theme tokens if the palette is refactored in `colors.ts`
- Fix approach: Migrate `style={{ backgroundColor: colors.xxx }}` uses in stack screens to equivalent NativeWind `className` tokens when modifying those screens

**No atomic transactions for multi-table writes:**

- Issue: Creating installment/recurring transactions writes to `transactionGroups` and then multiple rows to `transactions` without a SQLite transaction. A crash mid-write leaves orphaned `transactionGroups` rows with no child transactions.
- Files: `app/(tabs)/addTransaction.tsx` (form `onSubmit`)
- Why: Drizzle synchronous API makes it easy to miss wrapping in `db.transaction()`
- Impact: Data integrity risk on low-memory devices or if the app is force-killed during a save
- Fix approach: Wrap multi-table inserts in `db.transaction((tx) => { ... })` using Drizzle's transaction API

**`expenseClassification` ghost field:**

- Issue: The `expense_classification` column was dropped in migration `0007`, but `expenseClassification` is still referenced in `app/(tabs)/addTransaction.tsx` (FormValues interface, insert payload) and `hooks/transactions/useReportsExpenseComposition.ts` (SQL query)
- Files: `app/(tabs)/addTransaction.tsx` lines 61, 175, 221, 259; `hooks/transactions/useReportsExpenseComposition.ts` lines 57, 72
- Why: Column removed via migration but dependent code not cleaned up
- Impact: The `ExpenseClassificationEnum` type referenced in `addTransaction.tsx` is not imported — this is likely a silent TypeScript error or the value is always passed as `null`. `useReportsExpenseComposition.ts` queries a non-existent column, which SQLite may silently return NULL for, giving misleading report data.
- Fix approach: Remove all references to `expenseClassification` from `addTransaction.tsx` and `useReportsExpenseComposition.ts`. Delete any `ExpenseClassificationEnum` type if it still exists.

## Known Bugs

**`ExpenseClassificationEnum` used without import in `addTransaction.tsx`:**

- Symptoms: TypeScript may not catch this if the type was erased; at runtime the form field always receives `undefined`/`null`
- Trigger: Any transaction creation attempt
- Files: `app/(tabs)/addTransaction.tsx` line 61
- Workaround: The insert passes `expenseClassification: null` which SQLite accepts silently since the column no longer exists in the schema
- Root cause: Column removed from DB schema without cleaning up the TypeScript code

**Recurring transaction generation is one-shot and never extended:**

- Symptoms: Users creating recurring transactions will stop seeing new future occurrences after the initial ~6-month window
- Trigger: Any recurring transaction created more than ~6 months ago
- Files: `app/(tabs)/addTransaction.tsx` (recurring generation logic)
- Workaround: None in the current codebase
- Root cause: No background job or on-demand generation trigger beyond the initial insert batch

## Security Considerations

**Attachments stored as base64 in SQLite:**

- Risk: SQLite database file grows large as attachment data accumulates; no size enforcement at the DB level (only a 5-attachment UI limit per transaction)
- Files: `db/schema.ts` (`attachments.data` column), `hooks/useAttachments.ts`
- Current mitigation: 5-attachment cap per transaction enforced in `useAttachments.createAttachment()`; a 10 MB `MAX_FILE_SIZE` check in `components/AttachmentPicker.tsx` (line 19) is component-level only — bypassed by any direct hook call
- Recommendations: Move file size validation into `useAttachments.createAttachment()` so the limit is enforced at the data layer regardless of how the hook is called; consider storing attachments as files on the device filesystem with only the path in SQLite

**Biometric gate bypass on first launch:**

- Risk: On first launch with biometrics disabled, the app opens without any authentication
- Files: `app/_layout.tsx` (`BiometricGate`)
- Current mitigation: Gate only activates when `biometricsEnabled = true` in settings
- Recommendations: No action needed — this is by design; document clearly in user-facing settings

## Performance Bottlenecks

**No indexes on `transactions.date` and foreign keys:**

- Problem: All monthly queries filter by `transactions.date` (range query) and join on `categoryId`, `transactionGroupId`. Without indexes these are full table scans.
- Files: `db/schema.ts`, `hooks/useTransactions.ts`
- Measurement: Not measured; will degrade as the transactions table grows (1000s of rows for active users)
- Cause: Drizzle schema defines no explicit indexes; migration `0005_card_indexes.sql` added card indexes but not transaction date index
- Improvement path: Add `index('transactions_date_idx').on(transactions.date)` and `index('transactions_category_idx').on(transactions.categoryId)` to the schema; generate and apply a new migration

**`useReportsExpenseComposition.ts` queries a dropped column:**

- Problem: The hook still references `transactions.expenseClassification` which no longer exists. SQLite returns NULL for all rows, making grouping by this column a no-op; the entire report computation is incorrect.
- Files: `hooks/transactions/useReportsExpenseComposition.ts`
- Cause: Column dropped in migration 0007 without updating the hook
- Improvement path: Remove `expenseClassification` references and redesign the grouping logic

## Fragile Areas

**`selectionStore` singleton:**

- Files: `utils/selectionStore.ts`
- Why fragile: Module-level `Map` has no TTL or cleanup. If a screen sets a callback and navigation fails before the destination consumes it, stale callbacks accumulate. If two screens simultaneously set a callback for the same key (e.g., `'category'`), the second overwrites the first.
- Common failures: Stale callback from a previous navigation being consumed by a new selection flow
- Safe modification: Always call `consumeSelectionCallback` (which deletes the entry) — never read without consuming. Do not reuse the same key for different selection contexts in parallel flows.
- Test coverage: None

**Drizzle migrations applied at app startup:**

- Files: `app/_layout.tsx` (`useMigrations`)
- Why fragile: If a migration fails at startup, the app renders an error state. There is no rollback path; users would be stuck until an app update is released.
- Common failures: Schema drift if `drizzle/migrations.js` bundle gets out of sync with actual SQL files
- Safe modification: Always regenerate `migrations.js` after adding migration SQL files (`bun drizzle-kit generate` then rebuild); test migrations on a clean install before release

## Scaling Limits

**SQLite attachment storage:**

- Resource: SQLite database file size
- Current design stores raw base64 attachment data in the `attachments.data` column
- At 5 attachments × ~500KB each per transaction, a user with 200 receipted transactions accumulates ~500MB in a single SQLite file
- Limit: Practically constrained by device storage; no programmatic limit or eviction policy
- Path forward: Migrate to filesystem storage with path references in SQLite

## Convention Violations

**`app/(tabs)/transactions.tsx` missing `useFocusEffect` refetch:**

- Issue: The tab screen displays a paginated transaction list via `useTransactions(year, month)` — which exposes a `refetch` function — but never calls it when the screen receives focus. Users who create or edit a transaction and navigate back see stale data until they manually change the month filter.
- Files: `app/(tabs)/transactions.tsx` line 69
- Why: The `useFocusEffect` pattern was added to `index.tsx`, `reports.tsx`, and `settings.tsx` but missed on `transactions.tsx`
- Impact: Stale transaction list after any mutation (create, edit, delete); violates the mandatory `useFocusEffect` refetch rule in `CLAUDE.md`
- Fix approach: Add `useFocusEffect(useCallback(() => { refetch(); }, [refetch]))` (same pattern as `index.tsx`)

## Missing Features / Gaps

**No test infrastructure:**

- Impact: Any refactor or new feature ships without a safety net. Regressions in core flows (transaction creation, balance updates, goal progress) are only caught by manual testing.
- Recommendation: Add at minimum unit tests for `utils/` (pure functions) and integration tests for critical hooks using an in-memory SQLite approach.

**No error boundaries:**

- Impact: An unhandled JS exception in any screen propagates to the root and crashes the app with the default RN red screen in dev / blank crash in production
- Files: `app/_layout.tsx` (no `<ErrorBoundary>` wrapping `AppNavigator`)
- Recommendation: Add a React `ErrorBoundary` around `AppNavigator` with a user-friendly fallback UI
