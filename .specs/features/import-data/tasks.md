# Importar Dados — Tasks

**Design**: `.specs/features/import-data/design.md`
**Status**: Draft

---

## Execution Plan

```
Phase 1 (Sequential — fundação):
  T1

Phase 2 (Parallel — após T1, todos independentes entre si):
  T1 ──┬── T2  [P]  utils/categoryConstants.ts
       ├── T3  [P]  filePicker.ts
       ├── T4  [P]  parseOFX.ts
       ├── T5  [P]  parseCSV.ts
       ├── T6  [P]  useImportSave.ts
       ├── T7  [P]  ProgressDialog.tsx
       ├── T8  [P]  ReviewListItem.tsx
       ├── T9  [P]  EditItemModal.tsx
       ├── T10 [P]  BankConfirmModal.tsx
       └── T11 [P]  AccountSelectModal.tsx

Phase 3 (Sequential — depende de T8):
  T8 ──→ T12  ReviewList.tsx

Phase 4 (Sequential — depende de tudo de Phase 2 + T12):
  T3,T4,T5,T6,T7,T9,T10,T11,T12 ──→ T13  importData.tsx

Phase 5 (Sequential — depende de T13):
  T13 ──→ T14  settings.tsx + _layout.tsx (entry points)

── P2 (deferred — não bloqueiam P1) ───────────────────────────
  T6,T2 ──→ T15  categorySuggester.ts + atualização de useImportSave
  T16  db/schema.ts externalId + migração drizzle-kit
```

---

## Task Breakdown

### T1: Definir tipos internos da feature

**What**: Criar `utils/importData/types.ts` com `ImportedTransaction`, `ParsedFile`, `ImportPhase`, `ImportState` e re-exportar de `types/index.ts` se necessário.
**Where**: `utils/importData/types.ts` (novo arquivo)
**Depends on**: None
**Reuses**: `types/transaction.ts` (TransactionTypeEnum, TransactionStatusEnum), `types/account.ts` (AccountTypeEnum)
**Requirement**: IMP-02, IMP-05, IMP-11, IMP-12

**Done when**:

- [ ] `ImportedTransaction` definida com todos os campos: `_localId`, `externalId`, `description`, `amount`, `type`, `date`, `status`, `categoryId`, `_edited` (Partial overlay)
- [ ] `ParsedFile` definida: `format`, `bankName`, `accountType`, `currency`, `transactions`, `skippedCount`
- [ ] `ImportPhase` union type definida com todos os 8 estados
- [ ] `ImportState` interface definida com todos os campos
- [ ] Gate: `bun run lint` sem erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `feat(types): add import data types for OFX/CSV import flow`

---

### T2: Adicionar ícones bancários ao CATEGORY_ICONS [P]

**What**: Adicionar página 5 com 14 ícones Feather bancários ao array `CATEGORY_ICONS` em `utils/categoryConstants.ts`.
**Where**: `utils/categoryConstants.ts` (modificar)
**Depends on**: None
**Reuses**: padrão das páginas 1–4 existentes no mesmo arquivo
**Requirement**: IMP-15 (P2 suporte)

**Ícones a adicionar** (nova página 5 — Banking & Transfers):
`rotate-ccw`, `rotate-cw`, `repeat`, `arrow-up-circle`, `arrow-down-circle`,
`check-circle`, `x-circle`, `minus-circle`, `plus-circle`,
`log-in`, `log-out`, `link-2`, `copy`, `corner-up-left`

**Done when**:

- [ ] Página 5 adicionada ao array `CATEGORY_ICONS` com os 14 ícones listados acima
- [ ] Tipo `CategoryIcon` continua correto (inferido automaticamente do `as const`)
- [ ] Gate: `bun run lint` sem erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `feat(utils): add banking Feather icons to CATEGORY_ICONS page 5`

---

### T3: Implementar `filePicker.ts` [P]

**What**: Utilitário que abre o `DocumentPicker` para `.ofx`/`.csv`, lê o conteúdo como string e detecta o formato automaticamente.
**Where**: `utils/importData/filePicker.ts` (novo arquivo)
**Depends on**: T1
**Reuses**: padrão de `components/AttachmentPicker.tsx` (`DocumentPicker.getDocumentAsync` + `FileSystem.readAsStringAsync`)
**Requirement**: IMP-02

**Done when**:

- [ ] `pickImportFile()` retorna `{ uri, name, content, format: 'ofx' | 'csv' } | null`
- [ ] Cancelamento retorna `null` (sem lançar erro)
- [ ] Detecção: extensão `.ofx` OU presença de `OFXHEADER`/`<OFX>` no conteúdo → `'ofx'`; caso contrário → `'csv'`
- [ ] Arquivo sem extensão `.ofx` ou `.csv` E sem marcadores OFX → lança `Error('Formato inválido')`
- [ ] Gate: `bun run lint` sem erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `feat(utils): add filePicker for OFX/CSV import`

---

### T4: Implementar `parseOFX.ts` [P]

**What**: Parser de OFX SGML que converte o conteúdo de um arquivo `.ofx` para `ParsedFile` com array de `ImportedTransaction[]`.
**Where**: `utils/importData/parseOFX.ts` (novo arquivo)
**Depends on**: T1
**Reuses**: `utils/importData/types.ts`; tipos de `types/`
**Requirement**: IMP-11

**Done when**:

- [ ] `parseOFX(content: string): ParsedFile` exportada
- [ ] Extrai `<ORG>` → `bankName`; `<ACCTTYPE>` CHECKING/SAVINGS/INVESTMENT → `accountType` (padrão `checking`)
- [ ] Extrai `<CURDEF>` → `currency`
- [ ] Cada `<STMTTRN>` → `ImportedTransaction`: `DTPOSTED` (yyyyMMdd → timestamp ms), `TRNAMT` (sinal → type, abs → amount), `MEMO`/`NAME` → `description`, `FITID` → `externalId`
- [ ] `status` default = `TransactionStatusEnum.Paid`; `_localId` = `generateId()` (importar de `db/schema.ts`)
- [ ] Linhas/blocos malformados são pulados, contados em `skippedCount`
- [ ] Testado manualmente com `/home/clark/Projetos/mimoV2/Extrato-01-01-2025-a-15-06-2026-OFX.ofx`: retorna 1031 transações, `bankName = 'Banco Intermedium S/A'`
- [ ] Gate: `bun run lint` sem erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `feat(utils): add OFX SGML parser`

---

### T5: Implementar `parseCSV.ts` [P]

**What**: Parser do formato CSV extrato Banco Inter (separador `;`) que converte o conteúdo para `ParsedFile`.
**Where**: `utils/importData/parseCSV.ts` (novo arquivo)
**Depends on**: T1
**Reuses**: `utils/importData/types.ts`; padrão de parse de moeda BR de `utils/useCurrencyInput.ts`
**Requirement**: IMP-12

**Done when**:

- [ ] `parseCSV(content: string): ParsedFile` exportada
- [ ] Localiza a linha de header dinamicamente (busca linha com `Data Lançamento`)
- [ ] Ignora linhas de metadados antes do header (Conta, Período, Saldo, vazias)
- [ ] Colunas: `Data Lançamento | Histórico | Descrição | Valor | Saldo`
- [ ] `Data Lançamento` `dd/MM/yyyy` → timestamp ms
- [ ] `Valor` formato BR (`-1.234,56`): remove `.` de milhar, troca `,` por `.`, `parseFloat` → sinal determina `type`, `Math.abs()` → `amount`
- [ ] `status` default = `TransactionStatusEnum.Paid`; `externalId = null`; `categoryId = null`
- [ ] Linha com < 4 colunas → pular + incrementar `skippedCount`
- [ ] `bankName = null`; `accountType = AccountTypeEnum.Checking`
- [ ] Testado manualmente com `/home/clark/Projetos/mimoV2/Extrato-01-01-2025-a-15-06-2026-CSV.csv`: retorna ~1031 transações sem crash
- [ ] Gate: `bun run lint` sem erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `feat(utils): add CSV parser for Banco Inter extrato format`

---

### T6: Implementar `useImportSave.ts` [P]

**What**: Hook de mutação que salva atomicamente no SQLite: cria conta (se nova) + batch insert de todas as transações revisadas.
**Where**: `hooks/useImportSave.ts` (novo arquivo)
**Depends on**: T1
**Reuses**: padrão de `hooks/useUpdateTransactionStatus.ts` (`{ mutate, loading, error }`); lógica de insert de conta de `app/(stack)/accountCreate.tsx`; `generateId` de `db/schema.ts`
**Requirement**: IMP-09, IMP-10

**Done when**:

- [ ] `useImportSave()` retorna `{ mutate, loading, error }`
- [ ] `mutate(params, onSuccess?, onError?)` — `params`: `{ items, accountId, bankName, accountType }`
- [ ] Usa `db.transaction()` para atomicidade total
- [ ] `accountId === null` → cria conta nova com `name=bankName`, `type=accountType`, `balance=0`, `color='#6B7280'`, `icon='bank'` (ou `briefcase` se `bank` não existir), `isActive=true`
- [ ] Batch insert em lotes de 100 (limite SQLite 999 variáveis)
- [ ] Para cada item: usa `item._edited?.status ?? item.status`; `paidAt = status === Paid ? date : null`
- [ ] `onSuccess({ importedCount, accountId })` chamado após sucesso
- [ ] `onError(error)` chamado em caso de exceção; `loading` volta para `false`
- [ ] Gate: `bun run lint` sem erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `feat(hooks): add useImportSave for atomic batch transaction import`

---

### T7: Implementar `ProgressDialog.tsx` [P]

**What**: Componente modal que exibe progresso do parsing (barra 0–100 + mensagem + spinner).
**Where**: `components/import/ProgressDialog.tsx` (novo arquivo)
**Depends on**: T1
**Reuses**: `components/Loading.tsx` (spinner); padrão de Modal + reanimated de `components/EditScopeModal.tsx`; `SPRING_MODAL` para entrada/saída
**Requirement**: IMP-04

**Done when**:

- [ ] Props: `visible: boolean`, `progress: number` (0–100), `message?: string`
- [ ] Modal transparente com backdrop semitransparente
- [ ] Barra de progresso animada: `useSharedValue` + `withTiming(progress/100 * barWidth, { duration: 150 })`
- [ ] Spinner da `Loading` component exibido acima da barra
- [ ] Texto de mensagem exibido (ex: "Processando 312 de 1031...")
- [ ] Entrada/saída do modal animada com `SPRING_MODAL`
- [ ] Gate: `bun run lint` sem erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `feat(components): add ProgressDialog for import parsing progress`

---

### T8: Implementar `ReviewListItem.tsx` [P]

**What**: Componente de item único na lista de revisão — exibe data, descrição, valor, tipo (badge), categoria e botões editar/excluir.
**Where**: `components/import/ReviewListItem.tsx` (novo arquivo)
**Depends on**: T1
**Reuses**: padrão de layout/theming de `components/TransactionItem.tsx`; `formatCurrency` de `utils/formatCurrency.ts`; `SPRING_BOUNCE` para animação de press; `useTheme`
**Requirement**: IMP-05, IMP-07

**Done when**:

- [ ] Props: `item: ImportedTransaction`, `onEdit: () => void`, `onDelete: () => void`
- [ ] Exibe: data (formatada `dd/MM`), descrição, valor formatado (`formatCurrency`), badge tipo (verde=income / vermelho=expense), nome da categoria (ou "Sem categoria")
- [ ] Badge status: pequeno indicador "Pago" / "Pendente"
- [ ] Botão editar (ícone `edit-2`) e botão excluir (ícone `trash-2`)
- [ ] Animação de press no container: `withSpring(0.97, SPRING_BOUNCE)` no scale
- [ ] Segue theming dark/light via `useTheme`
- [ ] Gate: `bun run lint` sem erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `feat(components): add ReviewListItem for import review list`

---

### T9: Implementar `EditItemModal.tsx` [P]

**What**: Modal de edição completa de um item de importação — descrição, valor, tipo, categoria, data e status (pago/pendente).
**Where**: `components/import/EditItemModal.tsx` (novo arquivo)
**Depends on**: T1
**Reuses**: padrão de `components/EditScopeModal.tsx` (Modal + `withSpring(1, SPRING_MODAL)` scale 0.85→1); `useCurrencyInput` de `utils/useCurrencyInput.ts`; `useCategories` de `hooks/useCategories.ts`
**Requirement**: IMP-06

**Done when**:

- [ ] Props: `visible: boolean`, `item: ImportedTransaction | null`, `onSave(localId, updates)`, `onClose()`
- [ ] Campos editáveis: `TextInput` descrição, `useCurrencyInput` valor, selector tipo (income/expense), selector categoria (lista de `useCategories`), date picker ou `TextInput` data
- [ ] Toggle status: dois botões "Pago" / "Pendente" (segmented control), reflete `item.status` ao abrir
- [ ] Botão "Salvar" chama `onSave(item._localId, { ...campos alterados })`
- [ ] Animação de entrada: `withSpring(1, SPRING_MODAL)` no scale
- [ ] Gate: `bun run lint` sem erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `feat(components): add EditItemModal for editing import transactions`

---

### T10: Implementar `BankConfirmModal.tsx` [P]

**What**: Modal para confirmar ou editar o nome do banco antes de salvar.
**Where**: `components/import/BankConfirmModal.tsx` (novo arquivo)
**Depends on**: T1
**Reuses**: padrão de `components/EditScopeModal.tsx`; `TextInput` NativeWind; `SPRING_MODAL`
**Requirement**: IMP-08

**Done when**:

- [ ] Props: `visible: boolean`, `initialBankName: string`, `onConfirm(bankName: string)`, `onBack()`
- [ ] Campo `TextInput` pré-preenchido com `initialBankName`; editável
- [ ] Botão "Confirmar" desabilitado quando campo vazio (borda vermelha no input)
- [ ] Botão "Voltar" chama `onBack()`
- [ ] Animação de entrada com `SPRING_MODAL`
- [ ] Gate: `bun run lint` sem erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `feat(components): add BankConfirmModal for import bank name confirmation`

---

### T11: Implementar `AccountSelectModal.tsx` [P]

**What**: Modal para escolher conta existente ou criar nova conta para vincular as transações importadas.
**Where**: `components/import/AccountSelectModal.tsx` (novo arquivo)
**Depends on**: T1
**Reuses**: padrão de `components/EditScopeModal.tsx`; lista com ícone/cor de conta; `SPRING_MODAL`
**Requirement**: IMP-09

**Done when**:

- [ ] Props: `visible: boolean`, `accounts: Account[]`, `bankName: string`, `accountType: AccountTypeEnum`, `onSelect(accountId: string | null)`, `onBack()`
- [ ] Lista as contas passadas por props com ícone + nome + tipo
- [ ] Opção "Criar nova conta" destacada no topo ou rodapé da lista
- [ ] Toque em conta existente → `onSelect(account.id)`; toque em "Criar nova" → `onSelect(null)`
- [ ] Botão "Voltar" chama `onBack()`
- [ ] Animação de entrada com `SPRING_MODAL`
- [ ] Gate: `bun run lint` sem erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `feat(components): add AccountSelectModal for import account selection`

---

### T12: Implementar `ReviewList.tsx`

**What**: Componente de lista de revisão completa — banner informativo, resumo no topo, `FlatList` virtualizada de `ReviewListItem` com animação de exclusão.
**Where**: `components/import/ReviewList.tsx` (novo arquivo)
**Depends on**: T8
**Reuses**: `FlatList` RN; `ReviewListItem` (T8); `formatCurrency`; `useTheme`
**Requirement**: IMP-05, IMP-07

**Done when**:

- [ ] Props: `items: ImportedTransaction[]`, `onEdit(localId, updates)`, `onDelete(localId)`
- [ ] Banner informativo (descartável via `useState`): "Todas as transações foram importadas como pagas. Você pode alterar o status individualmente."
- [ ] Resumo fixo (header do FlatList via `useMemo`): total de itens, soma receitas (status=paid), soma despesas (status=paid), contagem pendentes
- [ ] `FlatList` com `keyExtractor={item => item._localId}` e `renderItem` → `ReviewListItem`
- [ ] Exclusão: animar opacidade → 0 via `withTiming(0, { duration: 200 })` antes de chamar `onDelete`
- [ ] Gate: `bun run lint` sem erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `feat(components): add ReviewList with summary, banner and animated delete`

---

### T13: Implementar `importData.tsx` (tela principal)

**What**: Tela stack que orquestra todo o fluxo de importação via `ImportState` + `ImportPhase`, conectando todos os utils, hooks e componentes.
**Where**: `app/(stack)/importData.tsx` (novo arquivo)
**Depends on**: T3, T4, T5, T6, T7, T9, T10, T11, T12
**Reuses**: `ScreenWrapper`; `useTheme`; `useCustomAlert` (showConfirm, showError, showSuccess); `useAccounts`; footer button pattern de `app/(tabs)/addTransaction.tsx`; `InteractionManager` para parsing assíncrono
**Requirement**: IMP-01, IMP-02, IMP-03, IMP-04, IMP-05, IMP-06, IMP-07, IMP-08, IMP-09, IMP-10

**Done when**:

- [ ] Estado gerenciado via `useState<ImportState>` com `phase` inicial `'idle'`
- [ ] Botão "Selecionar arquivo" (fase idle) → chama `pickImportFile()` → `showConfirm` → inicia parsing
- [ ] Parsing assíncrono: `InteractionManager.runAfterInteractions` + chunks de 100 linhas via `setTimeout(0)`, atualizando `parseProgress` a cada chunk → `ProgressDialog` visível
- [ ] Parsing OK → `phase = 'reviewing'`, `reviewItems` populados com cópia mutável
- [ ] Parsing falha → `showError`, `phase = 'idle'`
- [ ] Lista de revisão exibida via `ReviewList`; `onEdit` e `onDelete` atualizam `reviewItems`
- [ ] Footer "Avançar" (disabled se `reviewItems.length === 0`) → `phase = 'bank-confirm'`
- [ ] `BankConfirmModal` exibido com `bankName` pré-preenchido do parser; `onConfirm` → `phase = 'account-select'`; `onBack` → `phase = 'reviewing'`
- [ ] `AccountSelectModal` exibido com contas de `useAccounts()`; `onSelect` → `phase = 'saving'`; `onBack` → `phase = 'bank-confirm'`
- [ ] `useImportSave().mutate(...)` chamado; `onSuccess` → `showSuccess` + `router.back()`; `onError` → `showError`, `phase = 'account-select'`
- [ ] Gate: `bun run lint` sem erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `feat(stack): add importData screen with full OFX/CSV import flow`

---

### T14: Registrar tela e adicionar entrada nas Configurações

**What**: Adicionar `<Stack.Screen name="importData" />` no layout stack e novo `MenuItem` "Importar dados" na tela de configurações.
**Where**: `app/(stack)/_layout.tsx` (modificar) + `app/(tabs)/settings.tsx` (modificar)
**Depends on**: T13
**Reuses**: padrão dos outros `Stack.Screen` em `_layout.tsx`; padrão `MenuItem` existente em `settings.tsx`
**Requirement**: IMP-01

**Done when**:

- [ ] `<Stack.Screen name="importData" />` adicionado em `app/(stack)/_layout.tsx`
- [ ] Novo item no array `menuItems` de `settings.tsx`: `icon: 'download'`, `title: 'Importar dados'`, `subtitle: 'Importar extrato bancário OFX ou CSV'`, `accentColor: colors.primaryGold`, `onPress: () => router.push('/importData')`
- [ ] Navegação funciona: Settings → Importar dados → tela importData abre
- [ ] Gate: `bun run lint` sem erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `feat(settings): add import data entry point and stack screen registration`

---

## P2 Tasks (deferred — não bloqueiam lançamento P1)

### T15: Implementar `categorySuggester.ts` e integrar em `useImportSave` [P2]

**What**: Helper de mapeamento keyword→categoria que sugere uma categoria existente OU cria uma nova (com ícone Feather da página 5) para cada lançamento importado; integrado ao `useImportSave` antes do batch insert.
**Where**: `utils/importData/categorySuggester.ts` (novo) + `hooks/useImportSave.ts` (modificar)
**Depends on**: T2, T6
**Reuses**: tabela de mapeamento em `context.md`; `categories` schema; `generateId`; novos ícones de T2
**Requirement**: IMP-15

**Done when**:

- [ ] `suggestAndEnsureCategory(dbTx, historico, description, type, existingCategories)` retorna `categoryId | null`
- [ ] Mapeamento implementado conforme tabela em `context.md` (15 entradas keyword → categoria/ícone/tipo)
- [ ] Match em categoria existente → retorna `category.id`; match em nova → `dbTx.insert(categories)` + retorna novo id; sem match → retorna `null`
- [ ] Cache in-memory por sessão: evita `INSERT` duplicado para mesma categoria nova em lote grande
- [ ] `useImportSave` atualizado: antes do batch insert, percorre `items` chamando `suggestAndEnsureCategory` para itens com `categoryId === null`
- [ ] Gate: `bun run lint` sem erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `feat(utils): add categorySuggester with keyword mapping and auto-category creation`

---

### T16: Migração schema — coluna `externalId` [P2]

**What**: Adicionar coluna `externalId text nullable` na tabela `transactions` (schema Drizzle + migração gerada).
**Where**: `db/schema.ts` (modificar) + `drizzle/` (gerado automaticamente)
**Depends on**: None (independente de todos os outros)
**Reuses**: padrão de colunas nullable existentes no schema (ex: `notes`, `cardId`)
**Requirement**: IMP-13, IMP-14

**Done when**:

- [ ] `externalId: text('external_id')` adicionado à tabela `transactions` em `db/schema.ts` (sem `.notNull()`, sem `.unique()`)
- [ ] `bunx drizzle-kit generate` executado com sucesso, gerando novo arquivo em `drizzle/`
- [ ] Novo arquivo de migração importado em `drizzle/migrations.js`
- [ ] App não quebra ao iniciar (migração roda automaticamente via `db/client.ts`)
- [ ] Gate: `bun run lint` sem erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `feat(db): add externalId column to transactions for import deduplication`

---

## Parallel Execution Map

```
Phase 1 (Sequential):
  T1 ──────────────────────────────────────────────────────────────────┐

Phase 2 (Parallel — todos após T1):                                     │
  ┌── T2  [P]  utils/categoryConstants.ts (icons)                       │
  ├── T3  [P]  utils/importData/filePicker.ts                           │
  ├── T4  [P]  utils/importData/parseOFX.ts                         ◄───┘
  ├── T5  [P]  utils/importData/parseCSV.ts
  ├── T6  [P]  hooks/useImportSave.ts
  ├── T7  [P]  components/import/ProgressDialog.tsx
  ├── T8  [P]  components/import/ReviewListItem.tsx
  ├── T9  [P]  components/import/EditItemModal.tsx
  ├── T10 [P]  components/import/BankConfirmModal.tsx
  └── T11 [P]  components/import/AccountSelectModal.tsx

Phase 3 (Sequential — após T8):
  T8 ──→ T12  components/import/ReviewList.tsx

Phase 4 (Sequential — após T3,T4,T5,T6,T7,T9,T10,T11,T12):
  → T13  app/(stack)/importData.tsx

Phase 5 (Sequential — após T13):
  T13 ──→ T14  settings.tsx + _layout.tsx

── P2 Deferred ──────────────────────────────────────────────────────────
  T2,T6 ──→ T15  categorySuggester.ts + useImportSave update
  T16  db/schema.ts externalId migration  (independente, qualquer momento)
```

---

## Task Granularity Check

| Task | Escopo | Status |
|---|---|---|
| T1: types/importData.ts | 1 arquivo, 4 interfaces | ✅ Granular |
| T2: categoryConstants.ts icons | 1 arquivo, 14 linhas | ✅ Granular |
| T3: filePicker.ts | 1 arquivo, 1 função | ✅ Granular |
| T4: parseOFX.ts | 1 arquivo, 1 função | ✅ Granular |
| T5: parseCSV.ts | 1 arquivo, 1 função | ✅ Granular |
| T6: useImportSave.ts | 1 hook, 1 arquivo | ✅ Granular |
| T7: ProgressDialog.tsx | 1 componente | ✅ Granular |
| T8: ReviewListItem.tsx | 1 componente | ✅ Granular |
| T9: EditItemModal.tsx | 1 componente | ✅ Granular |
| T10: BankConfirmModal.tsx | 1 componente | ✅ Granular |
| T11: AccountSelectModal.tsx | 1 componente | ✅ Granular |
| T12: ReviewList.tsx | 1 componente (usa T8) | ✅ Granular |
| T13: importData.tsx | 1 tela (orquestra todos) | ✅ Granular — integração é 1 entrega coesa |
| T14: settings + _layout | 2 arquivos, 2 linhas cada | ✅ OK — modificações de 1 linha, coesas |
| T15: categorySuggester + useImportSave | 1 novo + 1 modificação coesa | ✅ Granular |
| T16: schema + migração | 1 schema + 1 arquivo gerado | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends on (task body) | Diagrama mostra | Status |
|---|---|---|---|
| T1 | None | Início da fase 1 | ✅ |
| T2 | None | Após T1, paralelo | ✅ |
| T3 | T1 | Após T1, paralelo | ✅ |
| T4 | T1 | Após T1, paralelo | ✅ |
| T5 | T1 | Após T1, paralelo | ✅ |
| T6 | T1 | Após T1, paralelo | ✅ |
| T7 | T1 | Após T1, paralelo | ✅ |
| T8 | T1 | Após T1, paralelo | ✅ |
| T9 | T1 | Após T1, paralelo | ✅ |
| T10 | T1 | Após T1, paralelo | ✅ |
| T11 | T1 | Após T1, paralelo | ✅ |
| T12 | T8 | Após T8, sequencial | ✅ |
| T13 | T3,T4,T5,T6,T7,T9,T10,T11,T12 | Após todos da fase 2 + T12 | ✅ |
| T14 | T13 | Após T13 | ✅ |
| T15 | T2, T6 | P2 deferred | ✅ |
| T16 | None | P2 deferred | ✅ |

---

## Test Co-location Validation

Não há framework de testes instalado (ver `TESTING.md`). O único gate disponível é `bun run lint`.

| Task | Camada criada | TESTING.md diz | Task diz | Status |
|---|---|---|---|---|
| T1–T16 | utils / hooks / components / screens | "none — not established" | Tests: none | ✅ OK |

Gate único para todas as tasks: `bun run lint`
