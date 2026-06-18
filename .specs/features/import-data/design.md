# Importar Dados — Design

**Spec**: `.specs/features/import-data/spec.md`
**Context**: `.specs/features/import-data/context.md`
**Status**: Draft

---

## Architecture Overview

A feature se organiza em uma **tela stack** (`importData.tsx`) que gerencia um estado linear de importação, delegando parsing a utilitários puros e UI a componentes isolados.

### Fluxo de estados

```
●────────────────────●
│                    │
●────────────────────●
           │
      tela aberta
           │
           ▼
╭────────────────────╮
│                    │
│        Idle        │     ◄─dismissar───┐
│                    │                   │
╰──────────┬─────────╯                   │
           ▲                             │
  selecionar arquivo                     │
           │                             │
       cancelou                          │
           ▼                             │
╭──────────┴─────────╮                   │
│                    │                   │
│    FilePicking     │                   │
│                    │                   │
╰──────────┬─────────╯                   │
           │                             │
    arquivo válido                       │
           │                             │
           ▼                             │
╭────────────────────╮                   │
│                    │                   │
│     Confirming     │    cancelou───────┤
│                    │                   │
╰──────────┬─────────╯                   │
           │                             │
       confirmou                         │
           ▼                             │
╭────────────────────╮                   │
│                    │─── falha ──────►  ParseError ──┘
│      Parsing       │
│                    │
╰──────────┬─────────╯
           │  parsing OK
           ▼
╭────────────────────╮
│                    │ ◄── edita / exclui item
│     Reviewing      │
│                    │
╰──────────┬─────────╯
           │  footer Avançar
           ▼
╭────────────────────╮
│                    │
│    BankConfirm     │ ──volta──► Reviewing
│                    │
╰──────────┬─────────╯
           │  confirma banco
           ▼
╭────────────────────╮
│                    │ ◄── retry ──── SaveError
│   AccountSelect    │
│                    │
╰──────────┬─────────╯
           │  conta definida
           ▼
╭────────────────────╮
│                    │── falha atômica ──► SaveError
│       Saving       │
│                    │── showSuccess + pop ──► [*]
╰────────────────────╯
```

### Arquitetura de componentes

```
  ┌─────────────────────────┐
  │       settings.tsx      │
  └────────────┬────────────┘
               │  router.push /importData
               ▼
  ┌─────────────────────────┐
  │      importData.tsx     ├──────────────────────────────────────────────┐
  │    app/(stack)/         │                                              │
  └────────────┬────────────┘                                              │
               │                                                           │
    ┌──────────┼──────────────────────────────────────┐                   │
    │          │          │           │                │                   │
    ▼          ▼          ▼           ▼                ▼                   ▼
filePicker ProgressDialog ReviewList BankConfirm  AccountSelect    useImportSave  ← hook
    │                       │         Modal           Modal          (hooks/)
    ├── parseOFX.ts         ├── ReviewListItem
    └── parseCSV.ts         └── EditItemModal
         │
         ▼
  ImportedTransaction[]
```

> **Convenção:** toda operação de escrita no banco de dados **deve** ser encapsulada em um hook (`hooks/`). Funções utilitárias em `utils/` são exclusivamente puras (parsing, formatação, cálculos) — nunca tocam o `db` diretamente.

---

## Code Reuse Analysis

### Componentes existentes a reutilizar

| Componente / Padrão | Localização | Como usar |
| --- | --- | --- |
| `useCustomAlert` | `hooks/useCustomAlert.ts` | `showConfirm`, `showError`, `showSuccess` em todos os passos do fluxo |
| `Loading` component | `components/Loading.tsx` | Base para o `ProgressDialog` — wrapping em Modal |
| `DocumentPicker.getDocumentAsync` | `components/AttachmentPicker.tsx` | Mesmo padrão para picker de `.ofx`/`.csv` |
| `FileSystem.readAsStringAsync` | `components/AttachmentPicker.tsx` | Leitura do arquivo para string (UTF-8) |
| `EditScopeModal` pattern | `components/EditScopeModal.tsx` | Padrão Modal + reanimated scale/opacity para `EditItemModal`, `BankConfirmModal`, `AccountSelectModal` |
| `MenuItem` component | `app/(tabs)/settings.tsx` | Adicionar item "Importar dados" ao array `menuItems` existente |
| Insert de conta | `app/(stack)/accountCreate.tsx` (lógica) | Replicar lógica de insert dentro do `useImportSave` hook |
| `SPRING_MODAL`, `SPRING_BOUNCE` | `components/CLAUDE.md` | Constantes de animação obrigatórias |
| `formatCurrency` | `utils/formatCurrency.ts` | Exibir valores monetários na lista de revisão |
| `useAccounts` | `hooks/useAccounts.ts` | Listar contas ativas em `AccountSelectModal` |
| `useCategories` | `hooks/useCategories.ts` | Picker de categoria em `EditItemModal` |
| `generateId` | `db/schema.ts` | Gerar IDs para as transações no batch insert |

### Pontos de integração

| Sistema | Integração |
| --- | --- |
| Stack navigation | Adicionar `<Stack.Screen name="importData" />` em `app/(stack)/_layout.tsx` |
| Settings | Novo item no array `menuItems` em `app/(tabs)/settings.tsx` com `router.push('/importData')` |
| Drizzle schema | Adicionar `externalId: text('external_id')` em `db/schema.ts` + migração via `bunx drizzle-kit generate` (P2) |
| `useAccountBalance` | Saldo calculado automaticamente após insert — nenhuma alteração necessária |

---

## Data Models

### `ImportedTransaction` (tipo interno — não persiste)

```typescript
interface ImportedTransaction {
  _localId: string;            // gerado localmente para key de lista (não persiste)
  externalId: string | null;   // FITID do OFX; null para CSV
  description: string;
  amount: number;              // sempre positivo (abs do arquivo)
  type: TransactionTypeEnum;   // income | expense (derivado do sinal)
  date: number;                // timestamp ms
  status: TransactionStatusEnum; // default: Paid; editável na revisão
  categoryId: string | null;   // sugerido automaticamente (P2) ou null
  // campos editáveis pelo usuário na revisão:
  _edited?: Partial<Pick<ImportedTransaction,
    'description' | 'amount' | 'type' | 'date' | 'categoryId' | 'status'>>;
}
```

### `ParsedFile` (saída dos parsers)

```typescript
interface ParsedFile {
  format: 'ofx' | 'csv';
  bankName: string | null;      // <ORG> do OFX; null para CSV
  accountType: AccountTypeEnum; // derivado de <ACCTTYPE>; padrão 'checking'
  currency: string;             // 'BRL' esperado
  transactions: ImportedTransaction[];
}
```

### `ImportState` (estado da tela)

```typescript
type ImportPhase =
  | 'idle'
  | 'picking'
  | 'confirming'
  | 'parsing'
  | 'reviewing'
  | 'bank-confirm'
  | 'account-select'
  | 'saving';

interface ImportState {
  phase: ImportPhase;
  fileName: string | null;
  fileUri: string | null;
  parseProgress: number;        // 0–100
  parsedFile: ParsedFile | null;
  reviewItems: ImportedTransaction[];  // cópia mutável para edição/exclusão
  bankName: string;
  accountType: AccountTypeEnum;
  selectedAccountId: string | null;   // null = criar nova conta
}
```

### Schema migration (P2 — IMP-13/14)

Adicionar em `db/schema.ts` na tabela `transactions`:

```typescript
externalId: text('external_id'),  // nullable, sem constraint unique global
                                   // dedupe é por (externalId, accountId)
```

Gerar migração: `bunx drizzle-kit generate`

---

## Components

### `importData.tsx`

- **Purpose**: Tela raiz — gerencia `ImportState`, orquestra o fluxo via `phase`.
- **Location**: `app/(stack)/importData.tsx`
- **Interfaces**:
  - Nenhum parâmetro de rota (`router.push('/importData')` sem params)
  - Retorna ao stack anterior após sucesso (`router.back()` + `showSuccess`)
- **Dependencies**: `useCustomAlert`, `useAccounts`, `DocumentPicker`, `FileSystem`, todos os componentes `components/import/`, todos os utils `utils/importData/`
- **Reuses**: `ScreenWrapper`, `useTheme`, pattern de footer button do `addTransaction.tsx`

### `utils/importData/filePicker.ts`

- **Purpose**: Abre o DocumentPicker filtrando `.ofx`/`.csv`, lê o arquivo como string e detecta o formato.
- **Location**: `utils/importData/filePicker.ts`
- **Interfaces**:
  ```typescript
  pickImportFile(): Promise<{ uri: string; name: string; content: string; format: 'ofx' | 'csv' } | null>
  ```
- **Dependencies**: `expo-document-picker`, `expo-file-system`
- **Reuses**: padrão de `AttachmentPicker.tsx` (`getDocumentAsync` + `readAsStringAsync`)
- **Detecção**: verificar extensão (`.ofx`/`.csv`) + presença de `OFXHEADER` ou `<OFX>` no conteúdo para OFX

### `utils/importData/parseOFX.ts`

- **Purpose**: Parser de OFX SGML → `ParsedFile`.
- **Location**: `utils/importData/parseOFX.ts`
- **Interfaces**:
  ```typescript
  parseOFX(content: string): ParsedFile
  ```
- **Notas de implementação**:
  - OFX usa SGML: tags como `<TRNAMT>-26.83` sem tag de fechamento — usar regex ou extrator de valor por tag name
  - `<DTPOSTED>20260613` → `new Date(2026, 5, 13).getTime()`
  - `<TRNAMT>` negativo → `expense`, positivo → `income`; `amount = Math.abs()`
  - `<ORG>` dentro de `<FI>` → `bankName`
  - `<ACCTTYPE>` → mapear CHECKING/SAVINGS/INVESTMENT para `AccountTypeEnum`
  - `<MEMO>` ou `<NAME>` → `description` (preferir MEMO se não vazio)
  - Charset 1252: `readAsStringAsync` com `encoding: 'utf8'` — testar com o arquivo real; se houver problema de encoding, usar `base64` e decodificar manualmente

### `utils/importData/parseCSV.ts`

- **Purpose**: Parser do formato CSV exportado pelo Banco Inter → `ParsedFile`.
- **Location**: `utils/importData/parseCSV.ts`
- **Interfaces**:
  ```typescript
  parseCSV(content: string): ParsedFile
  ```
- **Notas de implementação**:
  - Separador: `;` (ponto e vírgula)
  - Localizar linha de header: buscar linha que começa com `Data Lançamento`
  - Ignorar linhas antes do header (metadados: Conta, Período, Saldo, linha em branco)
  - Colunas: `Data Lançamento | Histórico | Descrição | Valor | Saldo`
  - `Data Lançamento` formato `dd/MM/yyyy` → `new Date(year, month-1, day).getTime()`
  - `Valor` formato BR `"-1.234,56"`: remover `.`, trocar `,` por `.`, `parseFloat`, verificar sinal
  - Linha malformada (< 4 colunas): pular e contabilizar em `skippedCount`
  - `bankName = null` (CSV não tem banco)
  - `accountType = AccountTypeEnum.Checking` (padrão)

### `hooks/useImportSave.ts`  ← **hook de mutação**

- **Purpose**: Hook que salva atomicamente no SQLite: cria conta (se nova) + batch insert de transações. Único ponto de escrita da feature — segue a convenção de que toda mutação no banco passa por um hook.
- **Location**: `hooks/useImportSave.ts`
- **Interfaces**:
  ```typescript
  interface UseImportSaveResult {
    mutate(params: {
      items: ImportedTransaction[];
      accountId: string | null;   // null = criar nova conta
      bankName: string;
      accountType: AccountTypeEnum;
    }, onSuccess?: (result: { importedCount: number; accountId: string }) => void,
       onError?: (error: Error) => void): void;
    loading: boolean;
    error: string | null;
  }

  function useImportSave(): UseImportSaveResult
  ```
- **Dependências**: `db` (drizzle client), `accounts`, `transactions` de `db/schema`
- **Implementação do `mutate`**:
  ```typescript
  db.transaction((dbTx) => {
    // 1. Criar conta se nova
    const finalAccountId = accountId ?? (() => {
      const newId = generateId();
      dbTx.insert(accounts).values({ id: newId, name: bankName, type: accountType,
        balance: 0, color: DEFAULT_COLOR, icon: DEFAULT_ICON,
        isActive: true, createdAt: now, updatedAt: now }).run();
      return newId;
    })();

    // 2. Batch insert transações em lotes de 100
    // (limite SQLite: 999 variáveis por statement)
    const rows = items.map(item => {
      const status = item._edited?.status ?? item.status;
      const date   = item._edited?.date   ?? item.date;
      return {
        id: generateId(),
        externalId: item.externalId ?? null,  // P2
        description: item._edited?.description ?? item.description,
        amount:      item._edited?.amount      ?? item.amount,
        type:        item._edited?.type        ?? item.type,
        date,
        paidAt: status === TransactionStatusEnum.Paid ? date : null,
        status,
        categoryId:  item._edited?.categoryId  ?? item.categoryId ?? null,
        accountId: finalAccountId,
        isSubscription: false,
        createdAt: now, updatedAt: now,
      };
    });
    for (let i = 0; i < rows.length; i += 100) {
      dbTx.insert(transactions).values(rows.slice(i, i + 100)).run();
    }
    return { importedCount: rows.length, accountId: finalAccountId };
  });
  ```
- **Padrão de retorno**: `{ mutate, loading, error }` — idêntico a `useUpdateTransactionStatus` e `useEditTransaction`

### `components/import/ProgressDialog.tsx`

- **Purpose**: Modal com progresso de parsing (0–100).
- **Location**: `components/import/ProgressDialog.tsx`
- **Interfaces**:
  ```typescript
  interface ProgressDialogProps {
    visible: boolean;
    progress: number;      // 0–100
    message?: string;      // ex: "Processando 312 de 1031..."
  }
  ```
- **Reuses**: Modal nativo RN + `Loading` component + barra de progresso animada via `withTiming` (reanimated)
- **Animação**: largura da barra via `useSharedValue(0)` + `withTiming(progress/100 * maxWidth, { duration: 150 })`; usar `SPRING_MODAL` para entrada/saída do modal

### `components/import/ReviewList.tsx`

- **Purpose**: Lista scrollável dos lançamentos a importar + resumo fixo no topo + banner informativo.
- **Location**: `components/import/ReviewList.tsx`
- **Interfaces**:
  ```typescript
  interface ReviewListProps {
    items: ImportedTransaction[];
    onEdit: (localId: string, updates: Partial<ImportedTransaction>) => void;
    onDelete: (localId: string) => void;
  }
  ```
- **Reuses**: `FlatList` (performance para ~1000 itens), `formatCurrency`
- **Banner informativo** (exibido uma vez, descartável via estado local): "Todas as transações foram importadas como pagas. Você pode alterar o status individualmente."
- **Resumo fixo**: header com `totalItems`, `totalIncome` (pagas), `totalExpense` (pagas), `pendingCount` calculados via `useMemo`
- **Animação de exclusão**: `withTiming` na opacidade/altura do item antes de remover do array

### `components/import/ReviewListItem.tsx`

- **Purpose**: Item individual da lista — exibe campos + botões editar/excluir.
- **Location**: `components/import/ReviewListItem.tsx`
- **Interfaces**:
  ```typescript
  interface ReviewListItemProps {
    item: ImportedTransaction;
    onEdit: () => void;
    onDelete: () => void;
  }
  ```
- **Reuses**: padrão de `TransactionItem.tsx` (layout, theming)
- **Campos exibidos**: data, descrição, valor (formatado), tipo (badge income/expense), categoria (nome ou "Sem categoria")
- **Animação de press**: `withSpring(0.97, SPRING_BOUNCE)` no scale

### `components/import/EditItemModal.tsx`

- **Purpose**: Modal de edição completa de um item (descrição, valor, tipo, categoria, data, **status**).
- **Location**: `components/import/EditItemModal.tsx`
- **Interfaces**:
  ```typescript
  interface EditItemModalProps {
    visible: boolean;
    item: ImportedTransaction | null;
    onSave: (localId: string, updates: Partial<ImportedTransaction>) => void;
    onClose: () => void;
  }
  ```
- **Campo status**: toggle `Pago` / `Pendente` (dois botões tipo segmented control, default `Pago`). Ao marcar `Pendente`, `paidAt` será `null` no save.
- **Reuses**: padrão de `EditScopeModal.tsx` (Modal + scale/opacity reanimated); `useCurrencyInput` para o campo de valor; `useCategories` para o picker de categoria
- **Animação de entrada**: `withSpring(1, SPRING_MODAL)` no scale (0.85 → 1)

### `components/import/BankConfirmModal.tsx`

- **Purpose**: Modal para confirmar/editar o nome do banco.
- **Location**: `components/import/BankConfirmModal.tsx`
- **Interfaces**:
  ```typescript
  interface BankConfirmModalProps {
    visible: boolean;
    initialBankName: string;    // pré-preenchido do OFX ou vazio para CSV
    onConfirm: (bankName: string) => void;
    onBack: () => void;
  }
  ```
- **Reuses**: padrão `EditScopeModal.tsx`; `TextInput` com NativeWind para edição inline
- **Validação**: não permite confirmar com nome vazio

### `components/import/AccountSelectModal.tsx`

- **Purpose**: Modal para escolher conta existente ou criar nova.
- **Location**: `components/import/AccountSelectModal.tsx`
- **Interfaces**:
  ```typescript
  interface AccountSelectModalProps {
    visible: boolean;
    accounts: Account[];        // de useAccounts()
    bankName: string;           // usado como nome da conta nova
    accountType: AccountTypeEnum;
    onSelect: (accountId: string | null) => void;  // null = criar nova
    onBack: () => void;
  }
  ```
- **Reuses**: padrão `EditScopeModal.tsx`; lista de contas com ícone/cor + opção "Criar nova conta"

---

## Error Handling Strategy

| Cenário | Tratamento | O que o usuário vê |
| --- | --- | --- |
| Arquivo não reconhecível | `showError` imediato, volta a `idle` | "Formato inválido. Selecione um arquivo .ofx ou .csv" |
| CSV sem linha de header | `showError`, volta a `idle` | "Nenhuma transação encontrada no arquivo" |
| Arquivo OFX com encoding corrompido | Parser retorna `transactions: []` → trata como "nenhuma transação" | "Nenhuma transação encontrada no arquivo" |
| Linha CSV malformada (< 4 colunas) | Pular linha, acumular `skippedCount` | Mostrado no resumo: "X linhas ignoradas por formato inválido" |
| Falha no `db.transaction()` | Catch → `showError`, `phase = 'account-select'` | "Erro ao salvar. Tente novamente" |
| Nenhum item restante após exclusões | Botão footer desabilitado | Footer cinza/disabled |
| Banco com nome vazio | Validação inline no modal | Campo fica com borda vermelha, botão desabilitado |

---

## Tech Decisions

| Decisão | Escolha | Motivo |
| --- | --- | --- |
| Parsing assíncrono | `InteractionManager.runAfterInteractions` + chunks de 100 linhas via `setTimeout(0)` | Libera a thread JS entre chunks para não travar a UI; sem biblioteca extra |
| Edição dos itens | Cópia mutável (`reviewItems`) com `_edited` overlay | Preserva o dado original do parser; facilita reset individual |
| Lista de revisão | `FlatList` (não `ScrollView`) | ~1000 itens: virtualização é obrigatória para performance |
| Batch insert | Lotes de 100 no `db.transaction()` | SQLite tem limite de variáveis por statement; lotes de 100 ficam bem abaixo do limite (999) |
| `externalId` como nullable | Nullable, sem `unique` global | Constraint unique seria `(externalId, accountId)` — mais complexo; v1 usa busca manual para dedupe |
| Tipo de arquivo | Detecção por conteúdo + extensão | CSV do Inter não tem MIME type confiável no DocumentPicker |

---

## File Checklist (novos arquivos)

```
── hooks/ ──────────────────────────────────────────────────────
hooks/useImportSave.ts              ← ÚNICO ponto de escrita no banco (mutação)

── utils/importData/ ───────────────────────────────────────────
  (funções puras — zero acesso ao db)
utils/importData/filePicker.ts
utils/importData/parseOFX.ts
utils/importData/parseCSV.ts
utils/importData/categorySuggester.ts   ← P2 (sugere categoria existente OU cria nova)

── components/import/ ──────────────────────────────────────────
components/import/ProgressDialog.tsx
components/import/ReviewList.tsx
components/import/ReviewListItem.tsx
components/import/EditItemModal.tsx
components/import/BankConfirmModal.tsx
components/import/AccountSelectModal.tsx

── app/(stack)/ ────────────────────────────────────────────────
app/(stack)/importData.tsx          ← tela principal (orquestra tudo)
```

**Arquivos existentes a modificar:**

```
app/(tabs)/settings.tsx                     ← adicionar MenuItem "Importar dados"
app/(stack)/_layout.tsx                     ← adicionar <Stack.Screen name="importData" />
utils/categoryConstants.ts                  ← adicionar página 5 de ícones bancários:
                                              rotate-ccw, rotate-cw, repeat,
                                              arrow-up-circle, arrow-down-circle,
                                              check-circle, x-circle,
                                              minus-circle, plus-circle,
                                              log-in, log-out, link-2,
                                              copy, corner-up-left
db/schema.ts                                ← adicionar externalId (P2)
drizzle/ (gerado pelo drizzle-kit)          ← nova migração (P2)
```

### `utils/importData/categorySuggester.ts` — detalhamento (P2)

- **Purpose**: Dado um `ImportedTransaction`, tenta associar uma categoria existente por keyword ou **cria uma nova** categoria no banco se não houver match exato.
- **Location**: `utils/importData/categorySuggester.ts`
- **ATENÇÃO**: Esta função **cria categorias no banco** — portanto deve receber o `db` como parâmetro (injeção) ou ser chamada dentro do `useImportSave` hook (que já tem acesso ao `db`). Não é uma função pura, mas mantida em `utils/` como helper stateless chamado pelo hook.
- **Interfaces**:
  ```typescript
  // Chamada dentro de useImportSave antes do batch insert
  suggestAndEnsureCategory(
    dbTx: DrizzleTransaction,
    historico: string,
    description: string,
    type: TransactionTypeEnum,
    existingCategories: Category[],
  ): string | null  // retorna categoryId (existente ou recém-criado)
  ```
- **Lógica**:
  1. Percorrer a tabela de keyword→categoria (ver `context.md`)
  2. Se match com categoria existente → retornar `category.id`
  3. Se match com nova categoria → verificar se já foi criada nesta sessão (cache local) → criar via `dbTx.insert(categories)` → retornar novo id
  4. Se sem match → retornar `null` (categoria "Outros" existente usada como fallback)
