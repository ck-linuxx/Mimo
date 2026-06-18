# Export Data — Tasks

**Design**: `.specs/features/export-data/design.md`
**Status**: Draft

---

## Execution Plan

```
Phase 1 (Sequential — fundação de tipos):
  T1

Phase 2 (Sequential — lógica de dados):
  T1 ──→ T2

Phase 3 (Sequential — hook de orquestração):
  T2 ──→ T3

Phase 4 (Sequential — ponto de entrada):
  T3 ──→ T4
```

Sem paralelismo disponível: cada task consome o output direto da anterior.

---

## Task Breakdown

### T1: Definir tipos do backup

**What**: Criar `utils/exportData/types.ts` com as interfaces `BackupJSON`, `BackupData`, `BackupCounts` e o tipo `AttachmentMeta`.
**Where**: `utils/exportData/types.ts` (novo arquivo)
**Depends on**: None
**Reuses**: Tipos inferidos de `db/schema.ts` (`Category`, `Account`, `Card`, `FinancialGoal`, `TransactionGroup`, `Transaction`, `Attachment`)
**Requirement**: EXP-05, EXP-06, EXP-07, EXP-08

**Done when**:

- [ ] `AttachmentMeta` definido como `Omit<Attachment, 'data'>` — garante que base64 nunca vaza
- [ ] `BackupData` definida com 7 chaves tipadas: `categories`, `accounts`, `cards`, `financialGoals`, `transactionGroups`, `transactions`, `attachmentsMeta`
- [ ] `BackupJSON` definida com `version: '1.0'`, `app: 'mimoV2'`, `exportedAt: number`, `data: BackupData`
- [ ] `BackupCounts` definida com os 7 campos numéricos correspondentes às chaves de `BackupData`
- [ ] Gate: `bun run lint` sem erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `feat(types): add export data backup types (BackupJSON, BackupCounts, AttachmentMeta)`

---

### T2: Implementar `buildBackup.ts`

**What**: Função pura que executa 7 queries síncronas no SQLite e retorna o envelope `BackupJSON` completo + `BackupCounts`.
**Where**: `utils/exportData/buildBackup.ts` (novo arquivo)
**Depends on**: T1
**Reuses**: Padrão `db.select().from(table).all()` de todos os hooks em `hooks/`; `db` de `db/client.ts`; todas as tabelas de `db/schema.ts`
**Requirement**: EXP-05, EXP-06, EXP-07, EXP-08

**Done when**:

- [ ] `buildBackup(): { backup: BackupJSON; counts: BackupCounts }` exportada
- [ ] 7 queries síncronas sem filtros: `categories`, `accounts`, `cards`, `financialGoals`, `transactionGroups`, `transactions`, `attachments`
- [ ] `attachmentsMeta` mapeado com desestruturação `const { data: _data, ...meta } = att` — campo `data` (base64) não presente no resultado
- [ ] `backup.exportedAt` = `Date.now()` no momento da chamada
- [ ] `counts` reflete os `length` de cada array resultante
- [ ] Arrays vazios quando a tabela não tem dados (nunca `undefined`)
- [ ] Gate: `bun run lint` sem erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `feat(utils): add buildBackup to query all tables and build JSON backup envelope`

---

### T3: Implementar `useExportData.ts`

**What**: Hook de mutação que chama `buildBackup`, grava o JSON no cache do sistema de arquivos e abre o Share Sheet nativo.
**Where**: `hooks/useExportData.ts` (novo arquivo)
**Depends on**: T1 (BackupCounts), T2 (buildBackup)
**Reuses**: Padrão `{ mutate, loading, error }` de `hooks/useImportSave.ts`; `FileSystem.cacheDirectory` + `writeAsStringAsync` de `components/AttachmentViewer.tsx:41–43`; `Sharing.isAvailableAsync()` + `shareAsync` de `components/AttachmentViewer.tsx:73–88`; `InteractionManager.runAfterInteractions` de `app/(stack)/importData.tsx`
**Requirement**: EXP-03, EXP-04, EXP-09, EXP-10

**Done when**:

- [ ] `useExportData()` retorna `{ mutate, loading, error }`
- [ ] `mutate(onSuccess?, onError?)` — assinatura limpa, sem parâmetros extras
- [ ] Import: `import * as FileSystem from 'expo-file-system/legacy'` (padrão do codebase)
- [ ] Import: `import * as Sharing from 'expo-sharing'`
- [ ] Filename gerado: `` `mimoV2-backup-${new Date().toISOString().slice(0, 10)}.json` `` (ex: `mimoV2-backup-2026-06-17.json`)
- [ ] `fileUri = FileSystem.cacheDirectory + filename`
- [ ] `FileSystem.writeAsStringAsync(fileUri, JSON.stringify(backup))` — sem formatação extra (tamanho menor)
- [ ] `Sharing.isAvailableAsync()` verificado antes de chamar `shareAsync`
- [ ] Quando sharing disponível: `Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Exportar backup mimoV2', UTI: 'public.json' })`
- [ ] Quando sharing indisponível: `onSuccess(counts)` é ainda chamado (usuário pode localizar o arquivo no cache)
- [ ] `loading` inicia `false`, vai para `true` no início do mutate, volta para `false` no fim (sucesso ou erro)
- [ ] `onSuccess(counts: BackupCounts)` chamado após `shareAsync` completo
- [ ] `onError(err: Error)` chamado em qualquer exceção; `error` atualizado com `err.message`
- [ ] Todo o trabalho executado dentro de `InteractionManager.runAfterInteractions` para não bloquear a UI
- [ ] Gate: `bun run lint` sem erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `feat(hooks): add useExportData for JSON backup generation and sharing`

---

### T4: Registrar item "Exportar dados" em `settings.tsx`

**What**: Adicionar prop `loading` ao componente `MenuItem`, criar o handler `handleExportData` com confirm/success/error, e inserir o item "Exportar dados" no array `menuItems`.
**Where**: `app/(tabs)/settings.tsx` (modificar)
**Depends on**: T3
**Reuses**: `MenuItem` já definido no arquivo; `useCustomAlert` (`showConfirm`, `showSuccess`, `showError`) já importado; `useExportData` (T3); `useState` + `useCallback` já em uso no arquivo
**Requirement**: EXP-01, EXP-02, EXP-03, EXP-09

**Done when**:

- [ ] `MenuItem` recebe prop `loading?: boolean`:
  - Quando `loading=true`: exibe `<ActivityIndicator size="small" color={accentColor} />` no lugar do `<Feather name="chevron-right" />`
  - Quando `loading=true`: `TouchableOpacity` tem `disabled={true}` (sem efeito de press)
- [ ] `ActivityIndicator` importado de `react-native` (já usado no arquivo — sem novo import)
- [ ] `useExportData` importado e instanciado: `const exportData = useExportData()`
- [ ] `useState`: `const [isExporting, setIsExporting] = useState(false)`
- [ ] Handler `handleExportData` criado com `useCallback`:
  - Chama `showConfirm('Exportar Dados', 'Categorias, contas, cartões, metas e transações serão exportados em formato JSON.', callback)`
  - No callback: `setIsExporting(true)` → `exportData.mutate(onSuccess, onError)`
  - `onSuccess`: `setIsExporting(false)` + `showSuccess('Backup Gerado', \`${counts.transactions} transações, ${counts.accounts} contas, ${counts.categories} categorias exportadas.\`)`
  - `onError`: `setIsExporting(false)` + `showError('Erro ao Exportar', err.message)`
- [ ] Item adicionado ao array `menuItems` logo após "Importar dados":
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
- [ ] `MenuItem` renderiza com `{...item}` — a prop `loading` flui sem modificar os outros itens existentes
- [ ] Gate: `bun run lint` sem erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `feat(settings): add export data entry point with confirm, loading state and success feedback`

---

## Parallel Execution Map

```
Phase 1 (Sequential):
  T1  utils/exportData/types.ts

Phase 2 (Sequential — após T1):
  T1 ──→ T2  utils/exportData/buildBackup.ts

Phase 3 (Sequential — após T2):
  T2 ──→ T3  hooks/useExportData.ts

Phase 4 (Sequential — após T3):
  T3 ──→ T4  app/(tabs)/settings.tsx
```

Sem paralelismo: cadeia linear de 4 tasks, cada uma consumindo o output direto da anterior.

---

## Task Granularity Check

| Task | Escopo | Status |
|------|--------|--------|
| T1: `types.ts` | 1 arquivo, 4 interfaces | ✅ Granular |
| T2: `buildBackup.ts` | 1 arquivo, 1 função pura | ✅ Granular |
| T3: `useExportData.ts` | 1 hook, 1 arquivo | ✅ Granular |
| T4: `settings.tsx` | 1 arquivo — modificação coesa (prop + handler + item) | ✅ OK — 3 mudanças no mesmo arquivo, mesma entrega |

---

## Diagram-Definition Cross-Check

| Task | Depends on (task body) | Diagrama mostra | Status |
|------|------------------------|-----------------|--------|
| T1 | None | Início da cadeia | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T1, T2 | T2 → T3 | ✅ (T1 implícito via T2) |
| T4 | T3 | T3 → T4 | ✅ |

---

## Test Co-location Validation

Não há framework de testes instalado (ver `TESTING.md`). Gate único: `bun run lint`.

| Task | Camada criada | TESTING.md diz | Task diz | Status |
|------|--------------|----------------|----------|--------|
| T1: types.ts | `utils/` | none — not established | Tests: none | ✅ |
| T2: buildBackup.ts | `utils/` | none — not established | Tests: none | ✅ |
| T3: useExportData.ts | `hooks/` | none — not established | Tests: none | ✅ |
| T4: settings.tsx | screen | none — not established | Tests: none | ✅ |
