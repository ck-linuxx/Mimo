# Import From Backup — Tasks

**Spec**: `.specs/features/import-from-backup/spec.md`
**Status**: Draft

---

## Execution Plan

```
Phase 1 (Parallel — fundação independente):
  T1 [P]  T2 [P]  T3 [P]

Phase 2 (Sequential — integração):
  T1, T2, T3 ──→ T4
```

T1, T2 e T3 não compartilham estado mutável nem arquivos — podem correr em paralelo.
T4 consome os três outputs.

---

## Task Breakdown

### T1: Aceitar `.json` no `pickImportFile` [P]

**What**: Modificar `pickImportFile` para aceitar arquivos `.json` e retornar `format: 'json'`, alargando o tipo de retorno de `'ofx' | 'csv'` para `'ofx' | 'csv' | 'json'`.
**Where**: `utils/importData/filePicker.ts` (modificar)
**Depends on**: None
**Reuses**: Padrão existente de detecção por extensão (`lowerName.endsWith(...)`)
**Requirement**: RES-01

**Done when**:

- [ ] Tipo de retorno alterado para `format: 'ofx' | 'csv' | 'json'`
- [ ] Bloco de detecção: `if (lowerName.endsWith('.json')) return { uri, name, content, format: 'json' }`  — inserido antes do `throw`
- [ ] Mensagem de erro atualizada: `'Formato inválido: use arquivos .ofx, .csv ou .json'`
- [ ] Gate: `bun run lint` sem novos erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `feat(filePicker): accept .json format for backup restore`

---

### T2: Criar `parseBackupJSON.ts` [P]

**What**: Função pura que parseia uma string, valida que é um backup mimoV2 v1.0 e retorna o objeto tipado `BackupJSON`. Lança erros tipados para cada caso de falha (JSON inválido, app errado, versão incompatível).
**Where**: `utils/importData/parseBackupJSON.ts` (novo arquivo)
**Depends on**: None
**Reuses**: Tipo `BackupJSON` de `utils/exportData/types.ts` (já existente)
**Requirement**: RES-03, RES-04, RES-09

**Done when**:

- [ ] `parseBackupJSON(content: string): BackupJSON` exportada
- [ ] `JSON.parse(content)` envolto em `try/catch` — lança `new Error('Arquivo inválido: não é um JSON válido.')` se falhar
- [ ] Verifica `parsed.app !== 'mimoV2'` — lança `new Error('Arquivo não reconhecido: este JSON não é um backup do mimoV2.')`
- [ ] Verifica `parsed.version !== '1.0'` — lança `` new Error(`Versão de backup não suportada. Este app suporta apenas backups v1.0.`) ``
- [ ] Retorna `parsed as BackupJSON` após todas as validações passarem
- [ ] Gate: `bun run lint` sem novos erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `feat(utils): add parseBackupJSON with app/version validation`

---

### T3: Criar `useRestoreBackup.ts` [P]

**What**: Hook de mutação que recebe um `BackupJSON` e executa o restore completo em `db.transaction()` atômico — apaga todas as tabelas em ordem reversa de FK, reinsere na ordem direta de FK.
**Where**: `hooks/useRestoreBackup.ts` (novo arquivo)
**Depends on**: None
**Reuses**: Padrão `{ mutate, loading, error }` de `hooks/useImportSave.ts`; padrão `db.transaction((dbTx) => { ... })` de `hooks/useImportSave.ts`; `BATCH_SIZE = 100` de `useImportSave.ts` (para insert de transações e attachments)
**Requirement**: RES-06, RES-07, RES-10

**Done when**:

- [ ] `useRestoreBackup()` retorna `{ mutate, loading, error }`
- [ ] Assinatura: `mutate(backup: BackupJSON, onSuccess?: (counts: BackupCounts) => void, onError?: (err: string) => void): void`
- [ ] `loading` vai para `true` no início, volta para `false` no fim (sucesso ou erro)
- [ ] Todo o trabalho dentro de `db.transaction((dbTx) => { ... })`
- [ ] **Delete em ordem reversa de FK** (dentro do transaction):
  1. `dbTx.delete(attachments).run()`
  2. `dbTx.delete(transactions).run()`
  3. `dbTx.delete(transactionGroups).run()`
  4. `dbTx.delete(financialGoals).run()`
  5. `dbTx.delete(cards).run()`
  6. `dbTx.delete(accounts).run()`
  7. `dbTx.delete(categories).run()`
- [ ] **Insert em ordem direta de FK** com `if (rows.length > 0)` e `BATCH_SIZE = 100` (cada tabela):
  1. `categories`, `accounts`, `cards`, `financialGoals`, `transactionGroups`, `transactions`
  2. Para `attachmentsMeta`: mapear para `{ ...meta, data: '' }` antes de inserir na tabela `attachments` (campo `data` é `notNull`, conteúdo do arquivo não está no backup)
- [ ] `onSuccess(counts)` chamado com `BackupCounts` calculado do backup
- [ ] `onError(err.message)` chamado em qualquer exceção; transação reverte automaticamente
- [ ] Gate: `bun run lint` sem novos erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `feat(hooks): add useRestoreBackup with atomic delete+insert inside db.transaction`

---

### T4: Integrar restore em `importData.tsx`

**What**: Adicionar `handleRestoreFlow` em `importData.tsx` que valida o JSON (T2), exibe confirmação destrutiva e chama o restore (T3). Branching em `handleSelectFile` quando `picked.format === 'json'`.
**Where**: `app/(stack)/importData.tsx` (modificar)
**Depends on**: T1 (filePicker retorna `'json'`), T2 (`parseBackupJSON`), T3 (`useRestoreBackup`)
**Reuses**: `showConfirm`, `showError`, `showSuccess`, `showInfo` já instanciados na tela; `setPhase('saving')` já usado para mostrar o spinner; `router.replace('/')` para navegar ao Home
**Requirement**: RES-02, RES-05, RES-08

**Done when**:

- [ ] `useRestoreBackup` importado e instanciado: `const { mutate: restoreMutate } = useRestoreBackup()`
- [ ] `parseBackupJSON` importado de `utils/importData/parseBackupJSON`
- [ ] `handleRestoreFlow(content: string, filename: string)` criado com `useCallback`:
  - Tenta `parseBackupJSON(content)` — se lançar, chama `showError('Arquivo inválido', err.message)` e retorna
  - Se válido, chama `showConfirm('Restaurar Backup', 'Todos os dados atuais serão substituídos pelos dados do backup. Esta ação não pode ser desfeita.', onConfirm)`
  - `onConfirm`: `setPhase('saving')` → `restoreMutate(backup, onSuccess, onError)`
  - `onSuccess(counts)`: `showSuccess('Backup Restaurado', \`${counts.transactions} transações, ${counts.accounts} contas, ${counts.categories} categorias restauradas.\`, 4000)` → `router.replace('/')`
  - `onError(msg)`: `showError('Erro ao Restaurar', msg)` → `setPhase('idle')`
- [ ] Em `handleSelectFile`, após `if (!picked) return`:
  ```ts
  if (picked.format === 'json') {
    handleRestoreFlow(picked.content, picked.name);
    return;
  }
  ```
  — inserido antes do `showConfirm` do fluxo OFX/CSV
- [ ] Sem alteração no fluxo OFX/CSV existente
- [ ] Gate: `bun run lint` sem novos erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `feat(importData): add restore flow with JSON backup detection and confirmation`

---

## Parallel Execution Map

```
Phase 1 (Parallel):
  T1 [P]  utils/importData/filePicker.ts   (modifica 1 arquivo)
  T2 [P]  utils/importData/parseBackupJSON.ts  (cria 1 arquivo)
  T3 [P]  hooks/useRestoreBackup.ts            (cria 1 arquivo)

Phase 2 (Sequential — após T1 + T2 + T3):
  T4  app/(stack)/importData.tsx           (modifica 1 arquivo)
```

Sem conflito de arquivos na fase 1. T4 depende dos três outputs.

---

## Task Granularity Check

| Task | Escopo | Status |
|------|--------|--------|
| T1: `filePicker.ts` | 1 arquivo, 3 linhas de mudança | ✅ Granular |
| T2: `parseBackupJSON.ts` | 1 arquivo, 1 função pura | ✅ Granular |
| T3: `useRestoreBackup.ts` | 1 hook, 1 arquivo | ✅ Granular |
| T4: `importData.tsx` | 1 arquivo — 1 hook + 1 handler + 1 guard (mesma entrega coesa) | ✅ OK |

---

## Diagram-Definition Cross-Check

| Task | Depends on (task body) | Diagrama mostra | Status |
|------|------------------------|-----------------|--------|
| T1 | None | Início fase 1 | ✅ |
| T2 | None | Início fase 1 | ✅ |
| T3 | None | Início fase 1 | ✅ |
| T4 | T1, T2, T3 | T1+T2+T3 → T4 | ✅ |

---

## Test Co-location Validation

Não há framework de testes instalado. Gate único: `bun run lint`.

| Task | Camada criada/modificada | TESTING.md diz | Task diz | Status |
|------|--------------------------|----------------|----------|--------|
| T1: `filePicker.ts` | `utils/` | none | Tests: none | ✅ |
| T2: `parseBackupJSON.ts` | `utils/` | none | Tests: none | ✅ |
| T3: `useRestoreBackup.ts` | `hooks/` | none | Tests: none | ✅ |
| T4: `importData.tsx` | screen | none | Tests: none | ✅ |
