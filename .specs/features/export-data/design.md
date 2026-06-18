# Export Data — Design

**Spec**: `.specs/features/export-data/spec.md`
**Status**: Draft

---

## Architecture Overview

Sem tela nova. O export é uma ação inline disparada diretamente do `MenuItem` em `settings.tsx`:

```
settings.tsx
  MenuItem "Exportar dados" (onPress)
    └─ showConfirm → confirma
         └─ useExportData.mutate(onSuccess, onError)
               ├─ InteractionManager.runAfterInteractions
               │    ├─ buildBackup()          ← queries all tables, returns BackupJSON
               │    ├─ JSON.stringify(result)
               │    └─ FileSystem.writeAsStringAsync(cacheDirectory + filename)
               ├─ Sharing.isAvailableAsync() → shareAsync(fileUri)
               └─ onSuccess(counts) → showSuccess
                  onError(err)   → showError
```

O estado de loading é gerenciado dentro de `settings.tsx` com um `useState<boolean>`, passado ao `MenuItem` como prop opcional `loading` — mostra `ActivityIndicator` no lugar do `chevron-right` e desabilita o press.

---

## Code Reuse Analysis

### Existing Patterns to Leverage

| Origem | Onde | Como reutilizar |
|--------|------|-----------------|
| `expo-file-system/legacy` | `AttachmentViewer.tsx:41–43` | `writeAsStringAsync(cacheDirectory + filename, content)` — mesmo padrão exato |
| `expo-sharing` | `AttachmentViewer.tsx:73–88` | `isAvailableAsync()` + `shareAsync(uri, { mimeType, dialogTitle })` — mesma estrutura |
| `useCustomAlert` | `hooks/useCustomAlert.ts` | `showConfirm`, `showSuccess`, `showError` — já em uso em `settings.tsx` |
| `MenuItem` component | `app/(tabs)/settings.tsx` | Adicionar prop `loading?: boolean` → exibe `ActivityIndicator` no lugar do `chevron-right` |
| `InteractionManager` | `app/(stack)/importData.tsx` | Mesmo padrão: `runAfterInteractions(() => { ... })` para não bloquear UI |
| Pattern hook mutate | `hooks/useImportSave.ts` | `{ mutate, loading, error }` — mesmo contrato de retorno |
| Drizzle `.select().all()` | Todos os hooks em `hooks/` | Query síncrona, sem filtros — apenas `db.select().from(table).all()` |

### Integration Points

| Sistema | Integração |
|---------|------------|
| `db/schema.ts` | Importa todas as tabelas: `categories`, `accounts`, `cards`, `financialGoals`, `transactionGroups`, `transactions`, `attachments` |
| `expo-file-system/legacy` | `cacheDirectory` + `writeAsStringAsync` para gravar JSON |
| `expo-sharing` | `shareAsync` para abrir o Share Sheet nativo |

---

## Components

### `utils/exportData/types.ts` (novo)

- **Purpose**: Tipos TypeScript do envelope de backup.
- **Location**: `utils/exportData/types.ts`
- **Interfaces**:
  ```ts
  interface BackupMeta {
    version: '1.0';
    app: 'mimoV2';
    exportedAt: number; // timestamp ms
  }

  interface BackupData {
    categories: Category[];
    accounts: Account[];
    cards: Card[];
    financialGoals: FinancialGoal[];
    transactionGroups: TransactionGroup[];
    transactions: Transaction[];
    attachmentsMeta: AttachmentMeta[]; // sem campo 'data'
  }

  interface BackupJSON {
    version: '1.0';
    app: 'mimoV2';
    exportedAt: number;
    data: BackupData;
  }

  // Attachment sem o campo 'data' (base64)
  type AttachmentMeta = Omit<Attachment, 'data'>;

  interface BackupCounts {
    transactions: number;
    accounts: number;
    categories: number;
    cards: number;
    financialGoals: number;
    transactionGroups: number;
    attachmentsMeta: number;
  }
  ```
- **Dependencies**: Tipos de `db/schema.ts` (Attachment, Category, Account, Card, FinancialGoal, TransactionGroup, Transaction)
- **Reuses**: Tipos inferidos do Drizzle via `db/schema.ts`

---

### `utils/exportData/buildBackup.ts` (novo)

- **Purpose**: Função pura que lê todas as tabelas do SQLite e retorna `{ backup: BackupJSON, counts: BackupCounts }`.
- **Location**: `utils/exportData/buildBackup.ts`
- **Interfaces**:
  ```ts
  function buildBackup(): { backup: BackupJSON; counts: BackupCounts }
  ```
- **Implementação**:
  - Executa `db.select().from(table).all()` para cada tabela (7 queries síncronas)
  - Para `attachments`: mapeia para `AttachmentMeta` omitindo `data` com desestruturação `const { data: _data, ...meta } = att`
  - Monta envelope `BackupJSON` com `exportedAt: Date.now()`
  - Retorna `backup` + `counts` (lengths de cada array)
- **Dependencies**: `db/client.ts` (db), todas as tabelas de `db/schema.ts`
- **Reuses**: Padrão síncrono `db.select().from(table).all()` de todos os hooks existentes

---

### `hooks/useExportData.ts` (novo)

- **Purpose**: Hook de mutação que orquestra buildBackup → write → share.
- **Location**: `hooks/useExportData.ts`
- **Interfaces**:
  ```ts
  interface UseExportDataResult {
    mutate(onSuccess?: (counts: BackupCounts) => void, onError?: (err: Error) => void): void;
    loading: boolean;
    error: string | null;
  }

  function useExportData(): UseExportDataResult
  ```
- **Implementação**:
  1. `setLoading(true)`
  2. `InteractionManager.runAfterInteractions(async () => { ... })`
  3. `const { backup, counts } = buildBackup()`
  4. Gera filename: `mimoV2-backup-${new Date().toISOString().slice(0, 10)}.json`
  5. `const fileUri = FileSystem.cacheDirectory + filename`
  6. `await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(backup))`
  7. `const available = await Sharing.isAvailableAsync()`
  8. Se disponível: `await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Exportar backup mimoV2', UTI: 'public.json' })`
  9. Se não disponível (simulador/edge): salva em `FileSystem.documentDirectory` + informa o caminho no `onSuccess`
  10. `onSuccess(counts)` → `setLoading(false)`
  11. Em caso de erro: `onError(err)` → `setLoading(false)` → `setError(err.message)`
- **Dependencies**: `buildBackup`, `expo-file-system/legacy`, `expo-sharing`, `react` (useState, useCallback)
- **Reuses**: Padrão `{ mutate, loading, error }` de `hooks/useImportSave.ts`; `FileSystem`+`Sharing` de `AttachmentViewer.tsx`

---

### `app/(tabs)/settings.tsx` (modificar)

- **Purpose**: Adicionar item "Exportar dados" e lógica de loading/confirm/success/error.
- **Location**: `app/(tabs)/settings.tsx`
- **Modificações**:
  1. **`MenuItem`** — adicionar prop `loading?: boolean`:
     - Quando `loading=true`: exibir `ActivityIndicator` no lugar do `<Feather name="chevron-right" />`; desabilitar `onPress` do `TouchableOpacity`
  2. **Novo `useState`**: `const [isExporting, setIsExporting] = useState(false)`
  3. **Import**: `useExportData` hook
  4. **Handler** `handleExportData`:
     ```ts
     const handleExportData = useCallback(() => {
       showConfirm(
         'Exportar Dados',
         'Categorias, contas, cartões, metas e transações serão exportados em formato JSON.',
         () => {
           setIsExporting(true);
           exportData.mutate(
             (counts) => {
               setIsExporting(false);
               showSuccess('Backup Gerado', `${counts.transactions} transações, ${counts.accounts} contas, ${counts.categories} categorias exportadas.`);
             },
             (err) => {
               setIsExporting(false);
               showError('Erro ao Exportar', err.message);
             }
           );
         }
       );
     }, [exportData, showConfirm, showSuccess, showError]);
     ```
  5. **`menuItems`** — adicionar logo após "Importar dados":
     ```ts
     {
       icon: 'upload' as const,
       title: 'Exportar dados',
       subtitle: 'Fazer backup completo em JSON',
       accentColor: colors.incomeColor,
       onPress: handleExportData,
       loading: isExporting,
     }
     ```
- **Reuses**: `useCustomAlert` (showConfirm, showSuccess, showError) já importado; `MenuItem` já definido no arquivo; padrão `useState` + `useCallback` existentes

---

## Data Models

### `BackupJSON` (envelope)

```typescript
interface BackupJSON {
  version: '1.0';        // para validação de compatibilidade no restore futuro
  app: 'mimoV2';         // identificador para detectar que é backup deste app
  exportedAt: number;    // Date.now() no momento do export
  data: BackupData;
}
```

**Ordem de inserção para restore futuro** (respeita dependências de FK):
```
categories → accounts → cards → financialGoals → transactionGroups → transactions → attachmentsMeta
```
*(cards referencia accounts; transactionGroups referencia categories/accounts/cards/financialGoals; transactions referencia todos os anteriores)*

---

## Error Handling Strategy

| Cenário | Tratamento | O que o usuário vê |
|---------|------------|---------------------|
| Banco vazio (arrays vazios) | Export continua normalmente | "0 transações, 0 contas, 0 categorias exportadas" |
| `Sharing.isAvailableAsync()` = false | Salva em `documentDirectory`, informa o caminho | showSuccess com mensagem alternativa |
| `writeAsStringAsync` falha (sem espaço) | `onError` chamado | showError "Não foi possível gravar o arquivo" |
| `shareAsync` rejeitado (usuário cancelou Share Sheet) | Share Sheet cancela silenciosamente — não é erro | Nenhuma mensagem (comportamento do OS) |
| Exceção inesperada em `buildBackup` | `catch` no `InteractionManager` callback | showError com `err.message` |

---

## Tech Decisions

| Decisão | Escolha | Rationale |
|---------|---------|-----------|
| Sem tela nova | Ação inline em settings | Export é single-tap, não tem estado para gerenciar em tela própria |
| `InteractionManager.runAfterInteractions` | Off-thread deferral | Mesmo padrão já validado no import (~1000 registros); evita jank durante a animação de pressão do botão |
| `FileSystem.cacheDirectory` | Cache temporário | O arquivo só precisa existir durante o share; o OS limpa o cache quando necessário |
| `expo-file-system/legacy` | Import legado | Todo o codebase usa `expo-file-system/legacy` — consistência |
| `Omit<Attachment, 'data'>` | AttachmentMeta via Omit | Tipagem segura sem duplicar a interface; garante que `data` nunca vaza no export |
| Loading no MenuItem | `ActivityIndicator` + disable | Feedback imediato no mesmo card; sem modal extra; padrão leve para ação de alguns segundos |

---

## Footprint Total

| Arquivo | Ação | Tamanho estimado |
|---------|------|-----------------|
| `utils/exportData/types.ts` | Novo | ~40 linhas |
| `utils/exportData/buildBackup.ts` | Novo | ~60 linhas |
| `hooks/useExportData.ts` | Novo | ~70 linhas |
| `app/(tabs)/settings.tsx` | Modificar | +~25 linhas |

**4 arquivos, ~195 linhas total.**
