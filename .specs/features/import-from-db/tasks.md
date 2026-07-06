# Import from .db — Tasks

**Spec**: `.specs/features/import-from-db/spec.md`
**Status**: ✅ Complete

> Sem TESTING.md no projeto — Tests: none em todas as tasks. Gate: `bunx tsc --noEmit`.

---

## Execution Plan

```
T1 [P] → T3 → T4
T2 [P] ↗
```

T1 e T2 são independentes e podem rodar em paralelo.
T3 depende de T2 (usa os tipos e a função de leitura).
T4 depende de T1 e T3 (integra picker + hook na tela).

---

## Task Breakdown

---

### T1: Atualizar `filePicker.ts` para suportar `.db` [P]

**What**: Adicionar branch para arquivos `.db` no retorno de `pickImportFile`. Arquivos `.db` são binários — não ler `content` como string; retornar apenas `uri` e `name`. Atualizar o tipo de retorno para incluir `format: 'db'`.

**Where**: `utils/importData/filePicker.ts`

**Depends on**: None

**Reuses**: Estrutura existente de `pickImportFile`

**Done when**:
- Arquivo `.db` selecionado → retorna `{ uri, name, format: 'db' }` (sem campo `content`)
- Erro "Formato inválido: use .ofx, .csv, .json ou .db" para outros formatos
- Tipo de retorno atualizado: `format: 'ofx' | 'csv' | 'json' | 'db'`; `content` opcional (`content?: string`)

**Tests**: None

**Gate**: `bunx tsc --noEmit`

**Requirements**: IDB-01

---

### T2: Criar `utils/importData/readDbBackup.ts` [P]

**What**: Função `readDbBackup(uri: string)` que:
1. Copia o `.db` do `uri` (cache) para `documentDirectory + 'SQLite/mimo-import-temp.db'` via `FileSystem.copyAsync` (sobrescreve se existir)
2. Abre segunda conexão: `SQLite.openDatabaseSync('mimo-import-temp.db')`
3. Valida schema: `PRAGMA table_info` nas 7 tabelas obrigatórias (`categories`, `accounts`, `cards`, `financial_goals`, `transaction_groups`, `transactions`, `attachments`). Se qualquer uma estiver ausente → throw com mensagem "Arquivo inválido ou incompatível com esta versão do app."
4. Lê todas as linhas de cada tabela com `SELECT *` via `expo-sqlite` (`.getAllSync`)
5. Fecha a conexão e deleta o arquivo temporário (`FileSystem.deleteAsync`)
6. Retorna objeto `DbBackupData` tipado com todos os registros

**Tipos a retornar** (em `utils/importData/readDbBackup.ts`):
```ts
export interface DbBackupData {
  categories: Category[];
  accounts: Account[];
  cards: Card[];
  financialGoals: FinancialGoal[];
  transactionGroups: TransactionGroup[];
  transactions: Transaction[];
  attachments: Attachment[];
}
```

Usar os tipos inferidos do Drizzle de `db/schema.ts`. A segunda conexão lê com `.getAllSync<T>(sql)` do `expo-sqlite` (sem Drizzle — é uma conexão raw para o arquivo temp).

**Cleanup obrigatório**: deletar o arquivo temporário tanto em caso de sucesso quanto de erro (try/finally).

**Where**: `utils/importData/readDbBackup.ts` (novo)

**Depends on**: None

**Done when**:
- `readDbBackup(uri)` retorna `DbBackupData` com arrays de cada tabela
- Valida schema antes de ler — lança erro descritivo se inválido
- Arquivo temporário sempre deletado ao finalizar (sucesso ou erro)
- Tipagem correta: `Category[]`, `Account[]`, etc. dos tipos do Drizzle

**Tests**: None

**Gate**: `bunx tsc --noEmit`

**Requirements**: IDB-03, IDB-04, IDB-05, IDB-09

---

### T3: Criar `hooks/useImportFromDb.ts`

**What**: Hook `useImportFromDb()` que recebe `DbBackupData` e executa upsert em todas as tabelas no banco principal.

Lógica:
- Usar `db.transaction()` para atomicidade
- Para cada tabela, em lotes de 100: `db.insert(table).values(batch).onConflictDoUpdate({ target: table.id, set: row })` — ou SQL raw `INSERT OR REPLACE INTO ...` se o Drizzle não suportar update set dinâmico de forma limpa
- Ordem FK: `categories` → `accounts` → `cards` → `financialGoals` → `transactionGroups` → `transactions` → `attachments`
- Retornar contagens no `onSuccess`: `{ transactions: number, accounts: number, categories: number }`

**Assinatura**:
```ts
export function useImportFromDb(): {
  mutate: (
    data: DbBackupData,
    onSuccess?: (counts: { transactions: number; accounts: number; categories: number }) => void,
    onError?: (err: string) => void
  ) => void;
  loading: boolean;
  error: string | null;
}
```

**Where**: `hooks/useImportFromDb.ts` (novo)

**Depends on**: T2 (usa `DbBackupData` de `readDbBackup.ts`)

**Reuses**: Padrão de hook de mutação existente (`useImportSave`, `useRestoreBackup`)

**Done when**:
- Hook executa upsert em todas as 7 tabelas em ordem FK
- `onSuccess` recebe contagens de transações, contas, categorias
- `onError` recebe mensagem de string
- Dados locais não presentes no backup são preservados (INSERT OR REPLACE só afeta IDs do backup)

**Tests**: None

**Gate**: `bunx tsc --noEmit`

**Requirements**: IDB-06

---

### T4: Atualizar `app/(stack)/importData.tsx`

**What**: Adicionar branch `format: 'db'` no `handleSelectFile` e novo handler `handleDbImportFlow`.

`handleDbImportFlow(uri: string, name: string)`:
1. `showConfirm('Mesclar backup', 'Os registros do backup serão adicionados ou atualizarão os existentes. Seus dados locais que não estão no backup serão mantidos.', ...)`
2. On confirm: `setPhase('saving')`
3. Chamar `readDbBackup(uri)` (async, dentro de `InteractionManager.runAfterInteractions`)
4. On success de leitura: chamar `importFromDb.mutate(data, onSuccess, onError)`
5. On success de mutate: `showSuccess('Backup mesclado', '${counts.transactions} transações, ${counts.accounts} contas, ${counts.categories} categorias mescladas.')` → `router.replace('/')`
6. On error (leitura ou mutate): `showError(...)` → `setPhase('idle')`

Adicionar `useImportFromDb` ao topo da tela. Atualizar subtitle da tela idle de "OFX ou CSV" para "OFX, CSV ou backup .db".

**Where**: `app/(stack)/importData.tsx`

**Depends on**: T1, T3

**Done when**:
- Selecionar `.db` → confirm de merge → upsert → success → navega para Home
- Erros de leitura ou upsert exibem `showError` e voltam para idle
- Texto da tela idle menciona `.db`
- Fluxo OFX/CSV/JSON existente sem regressão

**Tests**: None

**Gate**: `bunx tsc --noEmit`

**Requirements**: IDB-02, IDB-07, IDB-08, IDB-10

---

## Requirement Coverage

| Requirement ID | Task |
|---------------|------|
| IDB-01 | T1 |
| IDB-02 | T4 |
| IDB-03 | T2 |
| IDB-04 | T2 |
| IDB-05 | T2 |
| IDB-06 | T3 |
| IDB-07 | T2 (cleanup), T4 (error path) |
| IDB-08 | T4 |
| IDB-09 | T2 |
| IDB-10 | T4 |

**Coverage**: 10/10 ✅
