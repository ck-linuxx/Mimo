# Restaurar Backup JSON — Specification

**Relacionado a**: `.specs/features/export-data/` (requisitos EXP-11 a EXP-14 promovidos para spec própria)

## Problem Statement

O usuário exportou um backup completo do mimoV2 (JSON gerado pela feature `export-data`). Hoje não há como re-importar esse arquivo — se o app for desinstalado ou o dispositivo trocado, os dados exportados ficam inacessíveis. O restore completa o ciclo backup→restore e torna o backup genuinamente útil.

## Goals

- [ ] Usuário consegue restaurar todos os seus dados a partir de um arquivo `.json` exportado pelo mimoV2, com um único fluxo.
- [ ] O restore é atômico: ou restaura tudo ou falha sem corromper o estado atual.
- [ ] O fluxo parte da tela "Importar dados" existente — o app detecta automaticamente que o arquivo é um backup mimoV2 e muda de fluxo.

## Out of Scope

| Feature | Motivo |
|---------|--------|
| Merge (mesclar com dados existentes) | Complexidade de conflito de IDs; v1 é replace completo |
| Suporte a `version` futura (ex: `"2.0"`) | Definir apenas quando o schema mudar |
| Restore parcial (apenas categorias, apenas transações) | Complexidade desnecessária; o backup é sempre completo |
| Barra de progresso durante restore | Operação síncrona local, muito rápida |
| Backup de anexos (campo `data` base64) | Anexos são excluídos do backup desde o export |

---

## User Stories

### P1: Detectar e restaurar backup mimoV2 ⭐ MVP

**User Story**: Como usuário, quero abrir "Importar dados", selecionar meu arquivo `.json` de backup e restaurar todo o meu histórico financeiro, para recuperar meus dados após reinstalar o app ou trocar de dispositivo.

**Why P1**: Sem isso, o backup exportado é inútil — o ciclo backup→restore nunca fecha.

**Acceptance Criteria**:

1. WHEN o usuário seleciona um arquivo `.json` no seletor de "Importar dados" THEN o sistema SHALL tentar parsear como `BackupJSON` e verificar o campo `app`.
2. WHEN o arquivo é um backup mimoV2 válido (`app === "mimoV2"` + `version === "1.0"`) THEN o sistema SHALL exibir um `showConfirm` destrutivo: "Restaurar Backup — Todos os dados atuais serão substituídos pelos dados do backup. Esta ação não pode ser desfeita."
3. WHEN o usuário confirma THEN o sistema SHALL executar o restore dentro de um `db.transaction()` atômico:
   - Apagar registros em ordem reversa de FK: `attachments → transactions → transactionGroups → financialGoals → cards → accounts → categories`
   - Reinserir na ordem de FK: `categories → accounts → cards → financialGoals → transactionGroups → transactions → attachments`
4. WHEN o restore conclui com sucesso THEN o sistema SHALL exibir `showSuccess` com os contadores do backup e navegar para a tab Home (`router.replace('/')`).
5. WHEN o restore falha THEN a transação SHALL ser revertida completamente (estado do banco inalterado) e o sistema SHALL exibir `showError` com a mensagem de erro.
6. WHEN o usuário cancela o `showConfirm` THEN o sistema SHALL retornar para a tela de "Importar dados" sem nenhuma alteração.

**Independent Test**: Exportar dados → desinstalar + reinstalar app → abrir "Importar dados" → selecionar o `.json` → confirmar → verificar que contas, categorias e transações estão restauradas na Home.

---

### P1: Validação de versão e formato ⭐ MVP

**User Story**: Como usuário, quero receber uma mensagem clara se tentar importar um arquivo incompatível, para entender o que deu errado.

**Why P1**: Sem validação, um JSON genérico ou de outra versão pode causar insert inválido ou erro críptico.

**Acceptance Criteria**:

1. WHEN o arquivo `.json` é inválido (não parseia como JSON) THEN o sistema SHALL exibir `showError`: "Arquivo inválido: não é um JSON válido."
2. WHEN o arquivo JSON não tem o campo `app: "mimoV2"` THEN o sistema SHALL exibir `showError`: "Arquivo não reconhecido: este JSON não é um backup do mimoV2."
3. WHEN o arquivo JSON tem `app: "mimoV2"` mas `version` diferente de `"1.0"` THEN o sistema SHALL exibir `showError`: "Versão de backup não suportada. Este app suporta apenas backups v1.0."
4. WHEN o arquivo passa todas as validações THEN o fluxo de confirmação destrutiva SHALL prosseguir (AC da story anterior).

**Independent Test**: Selecionar um `.json` aleatório → ver o erro "não é um backup do mimoV2". Selecionar o backup correto → ver a confirmação destrutiva.

---

## Edge Cases

- WHEN o backup tem arrays vazios (app zerado no momento da exportação) THEN o restore SHALL concluir sem erros e o banco ficará vazio novamente.
- WHEN uma FK em `transactions` aponta para uma entidade que não existe no backup (dado corrompido) THEN o Drizzle lançará erro de constraint e a transação SHALL reverter — `showError` informará o usuário.
- WHEN o arquivo `.json` tem conteúdo parcial (campos faltando em `data`) THEN a validação SHALL falhar antes do insert com mensagem de erro.
- WHEN o usuário seleciona um `.json` grande (ex: 5000 transações) THEN o restore SHALL ocorrer dentro do `db.transaction()` síncrono sem travar a UI (operação local, não precisa de `InteractionManager`).

---

## Mudanças no código existente

### `utils/importData/filePicker.ts` — modificar

Atualmente lança `Error` para `.json`. Deve passar a retornar `format: 'json'` para arquivos `.json`:

```ts
// antes — lança erro
throw new Error('Formato inválido: use arquivos .ofx ou .csv');

// depois — aceita .json e retorna format: 'json'
if (lowerName.endsWith('.json')) return { uri: asset.uri, name, content, format: 'json' };
throw new Error('Formato inválido: use arquivos .ofx, .csv ou .json');
```

### `app/(stack)/importData.tsx` — modificar

Após `pickImportFile()` retornar `format: 'json'`, desviar para a lógica de restore:

```ts
if (picked.format === 'json') {
  handleRestoreFlow(picked.content, picked.name);
  return;
}
// fluxo OFX/CSV existente continua
```

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|----------------|-------|-------|--------|
| RES-01 | P1: Detectar `.json` no seletor (`pickImportFile` retorna `format: 'json'`) | Design | Pending |
| RES-02 | P1: Branching em `importData.tsx` quando `format === 'json'` | Design | Pending |
| RES-03 | P1: Validar `app === "mimoV2"` | Design | Pending |
| RES-04 | P1: Validar `version === "1.0"` | Design | Pending |
| RES-05 | P1: `showConfirm` destrutivo antes do restore | Design | Pending |
| RES-06 | P1: Hook `useRestoreBackup` com `db.transaction()` atômico | Design | Pending |
| RES-07 | P1: Delete em ordem reversa de FK + insert em ordem direta de FK | Design | Pending |
| RES-08 | P1: `showSuccess` com contadores + `router.replace('/')` | Design | Pending |
| RES-09 | P1: Validação de JSON inválido com `showError` | Design | Pending |
| RES-10 | P1: Rollback automático em caso de falha no `db.transaction()` | Design | Pending |

**ID format:** `RES-[NUMBER]`
**Status values:** Pending → In Design → In Tasks → Implementing → Verified
**Coverage:** 10 total, 0 mapeados a tasks (Design pendente)

---

## Success Criteria

- [ ] Selecionar o arquivo `.json` gerado pelo export → confirmar → app exibe dados restaurados na Home em ≤ 5 segundos.
- [ ] Selecionar um `.json` aleatório → app exibe erro "não é um backup do mimoV2" sem modificar nenhum dado.
- [ ] Cancelar o `showConfirm` destrutivo → app permanece na tela de "Importar dados" com todos os dados intactos.
- [ ] Se o restore falhar (ex: FK violada), o banco retorna ao estado anterior ao restore — nenhum dado é perdido.
