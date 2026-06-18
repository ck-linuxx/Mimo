# Exportar Dados (Backup JSON) — Specification

## Problem Statement

O usuário que usa o mimoV2 há algum tempo acumula um histórico valioso: contas, categorias customizadas, metas, transações. Hoje não há forma de fazer backup desses dados nem de migrar para um novo dispositivo. Se o app for desinstalado, o banco de dados SQLite é perdido. Exportar um JSON completo resolve backup, migração e serve de base para um restore futuro.

## Goals

- [ ] Usuário consegue exportar todos os dados do app em um único arquivo JSON compartilhável, com um toque.
- [ ] O arquivo exportado contém categorias, contas, cartões, metas, grupos de transação e transações — tudo necessário para reconstruir o estado financeiro.
- [ ] O formato JSON é estruturado com versão e metadados, compatível com uma futura feature de restore.
- [ ] Anexos são excluídos do conteúdo (apenas metadados como nome e tipo), mantendo o arquivo em tamanho razoável.

## Out of Scope

| Feature | Motivo |
| ------- | ------ |
| Restore/re-importar do JSON | Feature futura (`import-from-backup`) — P1 é apenas export. O formato é desenhado para isso. |
| Incluir conteúdo de anexos (base64) | Tornaria o arquivo muito grande — usuário escolheu excluir |
| Export parcial (filtro por período, conta, etc.) | Complexidade desnecessária para backup — export é sempre completo |
| Export para CSV/OFX | Dados relacionais não cabem bem em CSV; usuário escolheu JSON |
| Exportar configurações de tema/preferências | Trivial de reconfigurar; não envolve dados financeiros |
| Agendamento automático de backup | Fora do escopo v1 |
| Backup em nuvem (iCloud, Google Drive) | Offline-first; Share Sheet permite que o usuário escolha o destino |

---

## User Stories

### P1: Acessar exportação e gerar arquivo ⭐ MVP

**User Story**: Como usuário, quero tocar em "Exportar dados" nas configurações e receber um arquivo JSON com todo o meu histórico financeiro, para fazer backup ou migrar para outro dispositivo.

**Why P1**: Funcionalidade central — sem ela nada existe.

**Acceptance Criteria**:

1. WHEN o usuário abre Configurações THEN o sistema SHALL exibir um item "Exportar dados" na mesma seção de "Importar dados".
2. WHEN o usuário toca em "Exportar dados" THEN o sistema SHALL exibir um `showConfirm` informando o que será exportado ("Categorias, contas, cartões, metas e transações") antes de prosseguir.
3. WHEN o usuário confirma THEN o sistema SHALL exibir um indicador de loading enquanto o JSON é gerado.
4. WHEN o JSON é gerado THEN o sistema SHALL abrir o Share Sheet nativo do dispositivo com o arquivo `mimoV2-backup-YYYY-MM-DD.json`.
5. WHEN o usuário cancela o `showConfirm` THEN o sistema SHALL retornar sem gerar arquivo.
6. WHEN a geração falha THEN o sistema SHALL exibir erro via `showError` e não abrir o Share Sheet.

**Independent Test**: Abrir Configurações → tocar "Exportar dados" → confirmar → ver o Share Sheet abrir com o arquivo JSON.

---

### P1: Conteúdo completo do JSON ⭐ MVP

**User Story**: Como usuário, quero que o arquivo contenha todos os dados necessários para reconstruir meu histórico, para que o backup seja útil.

**Why P1**: O valor do export está nos dados — um JSON incompleto é inútil como backup.

**Acceptance Criteria**:

1. WHEN o JSON é gerado THEN ele SHALL conter um envelope com versão e metadados:
   ```json
   {
     "version": "1.0",
     "app": "mimoV2",
     "exportedAt": 1718582400000,
     "data": { ... }
   }
   ```
2. WHEN o JSON é gerado THEN `data` SHALL conter as chaves: `categories`, `accounts`, `cards`, `financialGoals`, `transactionGroups`, `transactions`, `attachmentsMeta`.
3. WHEN uma tabela está vazia THEN o campo correspondente SHALL ser um array vazio `[]` (não omitido).
4. WHEN `transactions` é exportado THEN cada registro SHALL incluir todos os campos da tabela, incluindo `accountId`, `cardId`, `goalId`, `transactionGroupId`, `categoryId` (as FKs são necessárias para reconstrução relacional).
5. WHEN `attachmentsMeta` é exportado THEN SHALL incluir `id`, `transactionId`, `title`, `originalName`, `fileType`, `fileSize`, `isReceipt`, `createdAt` — sem o campo `data` (base64).
6. WHEN o JSON é gerado THEN os IDs originais de todas as entidades SHALL ser preservados (necessário para manter referências relacionais intactas).

**Independent Test**: Abrir o JSON exportado e verificar que as 7 chaves estão presentes, que `transactions` contém os registros esperados e que nenhuma entrada de `attachmentsMeta` possui o campo `data`.

---

### P1: Feedback de conclusão ⭐ MVP

**User Story**: Como usuário, quero saber quantos registros foram exportados, para ter confiança de que o backup está completo.

**Why P1**: Sem feedback quantitativo, o usuário não tem como validar se o backup incluiu tudo.

**Acceptance Criteria**:

1. WHEN o Share Sheet é fechado (ou o arquivo compartilhado) THEN o sistema SHALL exibir `showSuccess` com a contagem: "X transações, Y contas, Z categorias exportadas".
2. WHEN não há dados (app zerado) THEN o sistema SHALL ainda gerar o JSON (com arrays vazios) e informar "Nenhum dado encontrado — arquivo gerado vazio".

**Independent Test**: Exportar e fechar o Share Sheet → ver o toast/alert com os contadores corretos.

---

### P2: Re-importar do JSON de backup (restore)

**User Story**: Como usuário, quero selecionar um arquivo `.json` exportado pelo mimoV2 e restaurar todos os dados, para recuperar meu histórico em um novo dispositivo ou após reinstalação.

**Why P2**: Completa o ciclo backup→restore. Requer design cuidadoso de merge/replace para não duplicar dados existentes, e a feature de export P1 deve ser validada antes de construir o restore.

**Acceptance Criteria**:

1. WHEN o usuário seleciona um arquivo `.json` no importador THEN o sistema SHALL detectar que é um backup mimoV2 pelo campo `app: "mimoV2"` no envelope.
2. WHEN um backup mimoV2 é detectado THEN o sistema SHALL perguntar: "Restaurar backup? Isso irá sobrescrever todos os dados atuais." com aviso de ação destrutiva.
3. WHEN o usuário confirma THEN o sistema SHALL apagar todas as tabelas e re-inserir os dados do JSON na ordem correta (categories → accounts → cards → financialGoals → transactionGroups → transactions → attachmentsMeta), usando `db.transaction()`.
4. WHEN o restore conclui THEN o sistema SHALL exibir `showSuccess` com a contagem e navegar para Home.
5. WHEN o restore falha THEN o sistema SHALL reverter completamente (transação atômica) e exibir `showError`.
6. WHEN a versão do backup é incompatível (`version` diferente de `"1.0"`) THEN o sistema SHALL informar e abortar.

**Independent Test**: Exportar dados, reinstalar app, importar o JSON → verificar que todas as transações, contas, metas e categorias estão restauradas.

---

## Edge Cases

- WHEN o dispositivo não suporta compartilhamento (simulador sem Share Sheet) THEN o sistema SHALL salvar o arquivo na pasta de documentos e exibir o caminho.
- WHEN o banco tem milhares de transações (ex: 5000+) THEN a geração do JSON SHALL ocorrer off-thread (via `InteractionManager.runAfterInteractions`) para não travar a UI.
- WHEN um campo FK em `transactions` aponta para uma entidade que não existe mais (dado corrompido) THEN o campo SHALL ser exportado como está (null-safe) sem abortar a exportação.
- WHEN o nome do arquivo gerado colide com um arquivo existente no diretório de cache THEN o sistema SHALL sobrescrever (o cache é temporário).
- WHEN o JSON gerado ultrapassa 50 MB (cenário extremo com muitos registros) THEN a geração SHALL completar normalmente — o limite de tamanho é responsabilidade do Share Sheet do OS.

---

## JSON Schema de Referência

```json
{
  "version": "1.0",
  "app": "mimoV2",
  "exportedAt": 1718582400000,
  "data": {
    "categories": [
      { "id": "...", "name": "Alimentação", "type": "expense", "icon": "shopping-cart", "color": "#FF5733", "createdAt": 1700000000000 }
    ],
    "accounts": [
      { "id": "...", "name": "Nubank", "type": "checking", "balance": 1500.00, "color": "#8B00FF", "icon": "credit-card", "isActive": true, "createdAt": 1700000000000 }
    ],
    "cards": [
      { "id": "...", "name": "Nubank Gold", "accountId": "...", "closingDay": 3, "dueDay": 10, "creditLimit": 5000.00, "color": "#8B00FF", "icon": "credit-card", "createdAt": 1700000000000 }
    ],
    "financialGoals": [
      { "id": "...", "name": "Viagem Japão", "targetAmount": 15000.00, "currentAmount": 3200.00, "deadline": 1800000000000, "status": "active", "color": "#FFD700", "icon": "flag", "createdAt": 1700000000000 }
    ],
    "transactionGroups": [
      { "id": "...", "type": "installment", "amount": 250.00, "totalInstallments": 12, "frequency": null, "isActive": true, "createdAt": 1700000000000 }
    ],
    "transactions": [
      { "id": "...", "type": "expense", "amount": 99.90, "description": "Mercado", "date": 1718000000000, "status": "paid", "paidAt": 1718000000000, "accountId": "...", "cardId": null, "categoryId": "...", "goalId": null, "transactionGroupId": null, "installmentNumber": null, "createdAt": 1718000000000, "updatedAt": 1718000000000 }
    ],
    "attachmentsMeta": [
      { "id": "...", "transactionId": "...", "title": "Recibo", "originalName": "foto.jpg", "fileType": "image/jpeg", "fileSize": 204800, "isReceipt": true, "createdAt": 1718000000000 }
    ]
  }
}
```

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ------ | ------ |
| EXP-01 | P1: Acessar export (item em Configurações) | Design | Pending |
| EXP-02 | P1: showConfirm antes de gerar | Design | Pending |
| EXP-03 | P1: Loading enquanto gera JSON | Design | Pending |
| EXP-04 | P1: Share Sheet com arquivo `mimoV2-backup-YYYY-MM-DD.json` | Design | Pending |
| EXP-05 | P1: Envelope JSON com version + app + exportedAt | Design | Pending |
| EXP-06 | P1: 7 chaves em `data` (categories, accounts, cards, financialGoals, transactionGroups, transactions, attachmentsMeta) | Design | Pending |
| EXP-07 | P1: attachmentsMeta sem campo `data` (sem base64) | Design | Pending |
| EXP-08 | P1: IDs originais preservados | Design | Pending |
| EXP-09 | P1: showSuccess com contadores | Design | Pending |
| EXP-10 | P1: Geração off-thread (InteractionManager) | Design | Pending |
| EXP-11 | P2: Detect backup mimoV2 no importador via `app` field | - | Pending |
| EXP-12 | P2: Confirmação destrutiva antes do restore | - | Pending |
| EXP-13 | P2: Restore atômico na ordem de FK (categories → … → transactions) | - | Pending |
| EXP-14 | P2: Versão incompatível → abortar com aviso | - | Pending |

**ID format:** `EXP-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 14 total, 0 mapeados a tasks (Design pendente)

---

## Success Criteria

- [ ] Tocar "Exportar dados" gera um arquivo JSON e abre o Share Sheet em ≤ 3 segundos para um banco com ~1000 transações.
- [ ] O arquivo JSON pode ser aberto em qualquer editor de texto e é legível (sem encoding corrompido).
- [ ] Todas as 7 chaves estão presentes no JSON, incluindo arrays vazios quando sem dados.
- [ ] Nenhuma entrada em `attachmentsMeta` contém o campo `data`.
- [ ] Os IDs relacionais (`accountId`, `categoryId`, etc.) em `transactions` coincidem com os IDs em `accounts` e `categories`.
