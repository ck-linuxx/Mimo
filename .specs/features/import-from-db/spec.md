# Importar Backup .db (Merge/Upsert) — Specification

## Problem Statement

O "Importar dados" aceita OFX, CSV e JSON. Com a mudança de `export-data` para formato `.db`, o usuário agora exporta um SQLite binário completo (com imagens). O fluxo de importação precisa suportar esse arquivo e fazer um merge inteligente: sobrescrever registros existentes com o mesmo ID e inserir registros novos — sem destruir dados locais que não estão no backup.

## Goals

- [ ] O picker de "Importar dados" aceita arquivos `.db`.
- [ ] Ao importar um `.db`, o sistema faz **upsert** em todas as tabelas: INSERT OR REPLACE por PK.
- [ ] Registros locais que **não existem** no backup são **preservados** (não é restore destrutivo).
- [ ] Imagens de comprovantes (`attachments.data`) são restauradas junto com os demais dados.
- [ ] O usuário vê confirmação clara diferenciando "merge" de "substituição total".

## Out of Scope

| Feature | Motivo |
|---------|--------|
| Restore destrutivo de `.db` (delete-all + insert) | Já existe via JSON; `.db` é sempre merge |
| Merge seletivo por tabela ou período | Complexidade desnecessária para v1 |
| Detecção de conflito com exibição de diff | Upsert silencioso é suficiente — o backup exportado pelo próprio app é fonte confiável |
| Suporte a `.db` de versões incompatíveis de schema | Out of scope — detectar e abortar com erro |

---

## User Stories

### P1: Picker aceita arquivos `.db` ⭐ MVP

**User Story**: Como usuário, quero selecionar um arquivo `.db` no "Importar dados" e ter o sistema reconhecendo-o como backup do mimoV2.

**Acceptance Criteria**:

1. WHEN o usuário toca "Selecionar arquivo" THEN o Document Picker SHALL aceitar qualquer tipo (`*/*`) como hoje.
2. WHEN o arquivo selecionado termina em `.db` THEN o sistema SHALL retornar `format: 'db'` e o `uri` do arquivo (sem ler o conteúdo como string — é binário).
3. WHEN o arquivo não é `.ofx`, `.csv`, `.json` ou `.db` THEN o sistema SHALL lançar erro "Formato inválido: use .ofx, .csv, .json ou .db".

---

### P1: Merge/upsert do banco ⭐ MVP

**User Story**: Como usuário, quero importar um `.db` exportado pelo mimoV2 para mesclar os dados do backup com os meus dados locais.

**Why P1**: Caso de uso principal — restaurar após reinstalação parcial ou sincronizar dados entre dispositivos sem perder o que já existe localmente.

**Acceptance Criteria**:

1. WHEN o arquivo é detectado como `.db` THEN o sistema SHALL exibir `showConfirm`: "Mesclar backup? Os registros do backup serão adicionados ou atualizarão os existentes. Seus dados locais que não estão no backup serão mantidos."
2. WHEN o usuário confirma THEN o sistema SHALL:
   a. Copiar o `.db` do cache para `documentDirectory/SQLite/mimo-import-temp.db`
   b. Abrir uma segunda conexão SQLite nesse arquivo temporário
   c. Ler todas as tabelas na ordem FK: `categories` → `accounts` → `cards` → `financial_goals` → `transaction_groups` → `transactions` → `attachments`
   d. Para cada tabela, executar `INSERT OR REPLACE` em lotes de 100 no banco principal
   e. Fechar e deletar o arquivo temporário ao finalizar
3. WHEN o merge conclui THEN o sistema SHALL exibir `showSuccess` com a contagem de registros mesclados por tabela principal (transações, contas, categorias).
4. WHEN qualquer etapa falha THEN o sistema SHALL abortar, deletar o arquivo temporário (se existir) e exibir `showError` com a mensagem de erro.
5. WHEN o merge conclui com sucesso THEN o sistema SHALL navegar para `/` (Home).

**Independent Test**: App com 5 transações → exportar `.db` → criar mais 3 transações → importar o `.db` → ver as 8 transações (5 do backup atualizadas/mantidas + 3 locais preservadas).

---

### P1: Compatibilidade de schema ⭐ MVP

**User Story**: Como usuário, quero que o sistema rejeite um `.db` corrompido ou de versão incompatível antes de tentar o merge.

**Acceptance Criteria**:

1. WHEN o arquivo `.db` é aberto THEN o sistema SHALL verificar que as tabelas esperadas existem (`categories`, `accounts`, `cards`, `financial_goals`, `transaction_groups`, `transactions`, `attachments`) via `PRAGMA table_info`.
2. WHEN qualquer tabela obrigatória está ausente THEN o sistema SHALL abortar com `showError`: "Arquivo inválido ou incompatível com esta versão do app."
3. WHEN o arquivo está corrompido e não pode ser aberto como SQLite THEN o sistema SHALL capturar o erro e exibir `showError` com a mesma mensagem.

---

## Edge Cases

- WHEN o arquivo temporário já existe em `SQLite/mimo-import-temp.db` (falha anterior) THEN o sistema SHALL sobrescrevê-lo antes de copiar.
- WHEN `attachments.data` no backup é string vazia (backup JSON antigo convertido) THEN o upsert SHALL prosseguir normalmente — o campo fica vazio como estava.
- WHEN o banco de backup tem 0 registros em uma tabela THEN o sistema SHALL pular a tabela silenciosamente (sem erro).
- WHEN o dispositivo não tem espaço suficiente para copiar o `.db` THEN `FileSystem.copyAsync` vai lançar erro — capturar e exibir `showError`.

---

## Architecture Notes

### Por que segunda conexão SQLite e não leitura binária direta?

`expo-sqlite` só abre bancos pelo nome dentro de `documentDirectory/SQLite/`. Não há API para abrir um `.db` de path arbitrário. Por isso, o fluxo é:
1. `FileSystem.copyAsync` copia o `.db` do cache para `SQLite/mimo-import-temp.db`
2. `SQLite.openDatabaseSync('mimo-import-temp.db')` abre a segunda conexão
3. Queries normais leem os dados
4. `FileSystem.deleteAsync` limpa o arquivo temporário

### INSERT OR REPLACE semântica

SQLite `INSERT OR REPLACE` (alias de `INSERT OR REPLACE INTO`) substitui a linha inteira quando há conflito de PK. Comportamento:
- Mesmo ID → sobrescreve todos os campos com os valores do backup
- ID novo → insere normalmente
- IDs locais não presentes no backup → não são tocados

Drizzle ORM: usar `.insert(table).values(rows).onConflictDoUpdate({ target: table.id, set: buildConflictUpdateSet(table, rows) })` ou SQL raw `INSERT OR REPLACE INTO ...`.

---

## Requirement Traceability

| Requirement ID | Story | Status |
|---------------|-------|--------|
| IDB-01 | P1: filePicker retorna `format: 'db'` + `uri` para arquivos `.db` | ✅ Done |
| IDB-02 | P1: showConfirm com texto de merge (não destrutivo) | ✅ Done |
| IDB-03 | P1: Copiar `.db` para `SQLite/mimo-import-temp.db` | ✅ Done |
| IDB-04 | P1: Abrir segunda conexão SQLite no arquivo temporário | ✅ Done |
| IDB-05 | P1: Ler todas as 7 tabelas do backup em ordem FK | ✅ Done |
| IDB-06 | P1: INSERT OR REPLACE em lotes de 100 por tabela no banco principal | ✅ Done |
| IDB-07 | P1: Fechar + deletar arquivo temporário ao finalizar (sucesso ou erro) | ✅ Done |
| IDB-08 | P1: showSuccess com contagem de registros mesclados | ✅ Done |
| IDB-09 | P1: Verificar tabelas via PRAGMA antes de iniciar merge | ✅ Done |
| IDB-10 | P1: Navegar para `/` após merge bem-sucedido | ✅ Done |

**Coverage:** 10 total, 10 mapeados em `tasks.md` ✅
