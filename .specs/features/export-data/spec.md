# Exportar Dados (Backup .db) — Specification

> **v2 — 2026-06-29**: Formato alterado de JSON para SQLite binário (`.db`), incluindo imagens de comprovantes.

## Problem Statement

O usuário do mimoV2 acumula histórico financeiro valioso — incluindo imagens de comprovantes armazenadas no banco. O export em JSON excluía essas imagens, tornando o backup incompleto. Exportar o arquivo `.db` do SQLite resolve o backup completo (dados + imagens) com mínima complexidade, usando o mesmo formato já adotado pelo `google-drive-sync`.

## Goals

- [ ] Usuário consegue exportar o banco de dados completo (`.db`) com um toque, incluindo todas as imagens de comprovantes.
- [ ] O arquivo exportado é o SQLite binário — restaurável diretamente via `import-from-backup`.
- [ ] O fluxo UX permanece o mesmo: confirmar → loading → Share Sheet.

## Out of Scope

| Feature | Motivo |
|---------|--------|
| Export em JSON | Substituído pelo `.db` — JSON não inclui imagens |
| Export em `.sql` (dump texto) | `.db` binário é mais simples, confiável e compatível com o restore existente |
| Export parcial (filtro por período, conta) | Complexidade desnecessária para backup completo |
| Backup em nuvem | Coberto pelo `google-drive-sync` |
| Export de configurações de tema | Trivial de reconfigurar; não são dados financeiros |

---

## User Stories

### P1: Exportar banco completo como `.db` ⭐ MVP

**User Story**: Como usuário, quero tocar em "Exportar dados" nas configurações e receber o arquivo `.db` completo do banco — com todas as transações e imagens de comprovantes — para fazer backup ou migrar para outro dispositivo.

**Why P1**: Sem imagens o backup é incompleto. O `.db` resolve com mínima complexidade.

**Acceptance Criteria**:

1. WHEN o usuário toca em "Exportar dados" THEN o sistema SHALL exibir `showConfirm` informando: "Isso irá exportar todo o banco de dados, incluindo imagens de comprovantes." com opções "Exportar" e "Cancelar".
2. WHEN o usuário confirma THEN o sistema SHALL exibir indicador de loading enquanto copia o arquivo.
3. WHEN a cópia concluir THEN o sistema SHALL abrir o Share Sheet nativo com o arquivo `mimoV2-backup-YYYY-MM-DD.db` (MIME type `application/octet-stream`).
4. WHEN o Share Sheet é fechado THEN o sistema SHALL exibir `showSuccess`: "Backup exportado com sucesso — inclui todas as imagens."
5. WHEN o usuário cancela o `showConfirm` THEN o sistema SHALL retornar sem gerar arquivo.
6. WHEN a cópia falha THEN o sistema SHALL exibir erro via `showError` e não abrir o Share Sheet.

**Independent Test**: Configurações → "Exportar dados" → confirmar → Share Sheet abre com arquivo `.db` → importar via "Importar backup" em outro dispositivo → dados e imagens restaurados.

---

### P1: Compatibilidade com import-from-backup ⭐ MVP

**User Story**: Como usuário, quero que o arquivo `.db` exportado seja restaurável via "Importar backup" existente, para completar o ciclo backup→restore.

**Why P1**: Sem restore o export não tem valor prático.

**Acceptance Criteria**:

1. WHEN o arquivo `.db` exportado é selecionado no fluxo "Importar backup" THEN o sistema SHALL aceitar o arquivo e executar o restore normalmente (fluxo existente em `useRestoreBackup`).
2. WHEN o restore conclui THEN todas as transações, contas, metas, categorias E imagens de comprovantes SHALL estar presentes.

**Independent Test**: Exportar `.db` → desinstalar app → reinstalar → importar o `.db` via "Importar backup" → verificar dados e imagens restaurados.

---

## Edge Cases

- WHEN o banco de dados local está aberto por outras queries THEN o arquivo `.db` SHALL ser copiado normalmente — SQLite em WAL mode permite cópia consistente enquanto open.
- WHEN `expo-file-system` não encontra o arquivo em `documentDirectory/SQLite/db.db` THEN o sistema SHALL exibir `showError` informando que o arquivo não foi encontrado.
- WHEN o arquivo `.db` copiado ultrapassa 100 MB (ex: muitas imagens) THEN o Share Sheet SHALL abrir normalmente — limite de tamanho é responsabilidade do OS.
- WHEN o dispositivo não suporta Share Sheet (simulador) THEN o sistema SHALL salvar em `documentDirectory` e exibir o caminho.

---

## Requirement Traceability

| Requirement ID | Story | Status |
|---------------|-------|--------|
| EXP-01 | P1: Item "Exportar dados" em Configurações | ✅ Verified |
| EXP-02 | P1: showConfirm com descrição do `.db` | ✅ Verified |
| EXP-03 | P1: Loading enquanto copia arquivo | ✅ Verified |
| EXP-04 | P1: Share Sheet com `mimoV2-backup-YYYY-MM-DD.db` (MIME octet-stream) | ✅ Verified |
| EXP-05 | P1: showSuccess após share | ✅ Verified |
| EXP-06 | P1: Copiar de `documentDirectory/SQLite/db.db` para cache | ✅ Verified |
| EXP-07 | P1: Arquivo `.db` exportado é restaurável via import-from-backup | Pending (depende de google-drive-sync restore) |

**ID format:** `EXP-[NUMBER]`

---

## Success Criteria

- [ ] "Exportar dados" abre Share Sheet com arquivo `.db` em ≤ 3 segundos.
- [ ] O arquivo `.db` exportado é restaurável via "Importar backup" com todos os dados + imagens.
- [ ] O subtitle na UI de Configurações reflete o novo formato (`.db`).
- [ ] Nenhuma regressão no fluxo de importação JSON existente.
