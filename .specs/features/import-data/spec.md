# Importar Dados (OFX/CSV) Specification

## Problem Statement

Hoje o usuário precisa cadastrar manualmente cada transação no mimoV2. Quem já tem um histórico financeiro no banco enfrenta uma barreira enorme de entrada: digitar centenas de lançamentos. Os bancos brasileiros exportam extratos em **OFX** (Open Financial Exchange) e **CSV**. Permitir importar esses arquivos elimina a fricção inicial e popula o app com dados reais de forma offline, sem expor dados a terceiros.

## Goals

- [ ] Usuário consegue importar um extrato bancário (OFX ou CSV) e ter suas transações registradas em uma conta, com detecção automática do formato do arquivo.
- [ ] Usuário consegue revisar e corrigir os dados antes de salvar (editar campos, excluir lançamentos), evitando importar lixo.
- [ ] Importação de ~1000+ transações conclui sem travar a UI, com feedback de progresso visível.
- [ ] Reimportar o mesmo arquivo não cria transações duplicadas.

## Out of Scope

| Feature | Motivo |
| ------- | ------ |
| Importação de cartões de crédito / faturas | v1 cobre apenas contas (checking/savings/investment); fatura tem ciclo próprio — feature futura |
| Importação automática via Open Banking / API de banco | Fora do escopo do produto (offline-first, sem backend) — ver PROJECT.md |
| Formatos além de OFX e CSV (PDF, XLSX, QIF) | OFX/CSV cobrem os exportadores dos principais bancos BR |
| Importação de parcelamentos/recorrências como grupos | Extrato não traz essa semântica; todo lançamento entra como transação única |
| Mapeamento de transferências entre contas (Aplicação/Resgate, Estorno) como transferências reais | v1 trata por sinal (receita/despesa); transferência inter-contas é feature futura |
| Exportar dados | Feature separada (este spec é só importação) |

---

## User Stories

### P1: Acessar importação e selecionar arquivo ⭐ MVP

**User Story**: Como usuário, quero acessar "Importar dados" nas configurações e selecionar um arquivo OFX ou CSV, para iniciar a importação do meu extrato.

**Why P1**: Ponto de entrada — sem ele nada funciona.

**Acceptance Criteria**:

1. WHEN o usuário abre a tela de Configurações THEN o sistema SHALL exibir um item "Importar dados" que navega para uma nova tela em stack (`importData`).
2. WHEN o usuário toca em "Selecionar arquivo" THEN o sistema SHALL abrir o seletor de documentos filtrando arquivos `.ofx` e `.csv`.
3. WHEN um arquivo é selecionado THEN o sistema SHALL detectar automaticamente o formato (OFX vs CSV) pelo conteúdo/extensão, sem o usuário precisar informar.
4. WHEN o usuário cancela o seletor THEN o sistema SHALL retornar à tela sem alterações.
5. WHEN o arquivo selecionado não é um OFX/CSV reconhecível THEN o sistema SHALL exibir erro via `showError` e permitir tentar outro arquivo.

**Independent Test**: Abrir Configurações → tocar "Importar dados" → selecionar o arquivo de exemplo → confirmar que o formato foi detectado.

---

### P1: Confirmar importação ⭐ MVP

**User Story**: Como usuário, quero confirmar antes que o sistema processe o arquivo, para não disparar uma importação por engano.

**Why P1**: Comportamento explicitamente pedido (passo 1) e evita ação acidental.

**Acceptance Criteria**:

1. WHEN um arquivo válido é selecionado THEN o sistema SHALL exibir um `showConfirm` ("Deseja importar este arquivo?") com o nome do arquivo na mensagem.
2. WHEN o usuário confirma THEN o sistema SHALL iniciar o parsing.
3. WHEN o usuário cancela THEN o sistema SHALL descartar o arquivo selecionado e voltar ao estado inicial.

**Independent Test**: Selecionar arquivo → ver o alerta de confirmação → cancelar e confirmar que nada foi processado.

---

### P1: Dialog de progresso do parsing ⭐ MVP

**User Story**: Como usuário, quero ver o progresso enquanto o arquivo é processado, para saber que o app não travou.

**Why P1**: Pedido explícito (passo 2); ~1000 linhas justificam feedback.

**Acceptance Criteria**:

1. WHEN o parsing inicia THEN o sistema SHALL exibir um dialog (modal) com indicador de progresso.
2. WHEN o parsing está em andamento THEN o dialog SHALL refletir o avanço (percentual ou contagem de linhas processadas).
3. WHEN o parsing termina THEN o dialog SHALL fechar automaticamente e revelar a lista de revisão.
4. WHEN o parsing falha (arquivo corrompido/linha inválida em massa) THEN o sistema SHALL fechar o dialog e exibir erro via `showError`.
5. WHEN o parsing roda THEN a UI principal SHALL permanecer responsiva (parsing assíncrono/em chunks, sem bloquear a thread JS perceptivelmente).

**Independent Test**: Importar o arquivo de exemplo (~1000 linhas) e observar o dialog de progresso até abrir a lista.

---

### P1: Revisar e editar a lista de importação ⭐ MVP

**User Story**: Como usuário, quero revisar os lançamentos extraídos e poder editar campos ou excluir itens, para importar somente dados corretos.

**Why P1**: Pedido explícito (passo 3) e decisão registrada (edição completa).

**Acceptance Criteria**:

1. WHEN o parsing termina THEN o sistema SHALL exibir uma lista de todos os lançamentos extraídos, cada um mostrando descrição, valor, tipo (receita/despesa), data e categoria sugerida.
2. WHEN o usuário toca em um item THEN o sistema SHALL permitir editar **descrição, valor, tipo, categoria e data** daquele item.
3. WHEN o usuário exclui um item THEN o sistema SHALL removê-lo da importação (sem afetar os demais) com animação.
4. WHEN a lista é exibida THEN o sistema SHALL mostrar um resumo (total de itens, soma de receitas, soma de despesas).
5. WHEN todos os itens são excluídos THEN o botão de salvar SHALL ficar desabilitado.
6. WHEN o tipo é derivado THEN valores negativos no arquivo SHALL ser mapeados para `expense` e positivos para `income`, com `amount` sempre armazenado positivo.

**Independent Test**: Após parsing, editar a descrição/valor de um item, excluir outro, e ver o resumo atualizar.

---

### P1: Confirmar o banco ⭐ MVP

**User Story**: Como usuário, quero confirmar (ou corrigir) de qual banco é o extrato antes de salvar, para que minha conta fique identificada corretamente.

**Why P1**: Pedido explícito (passo 4).

**Acceptance Criteria**:

1. WHEN o usuário aciona o botão de salvar (footer) THEN o sistema SHALL perguntar o nome do banco antes de prosseguir.
2. WHEN o arquivo é OFX THEN o sistema SHALL pré-preencher o nome do banco a partir do campo `<ORG>` do OFX e pedir confirmação, com input editável.
3. WHEN o arquivo é CSV (sem identificação de banco) THEN o sistema SHALL apresentar o campo de banco vazio (ou melhor palpite) para preenchimento manual.
4. WHEN o usuário confirma um nome de banco vazio THEN o sistema SHALL exigir um valor não-vazio antes de seguir.

**Independent Test**: Salvar uma importação OFX e ver "Banco Intermedium S/A" pré-preenchido; salvar uma CSV e ver campo vazio editável.

---

### P1: Escolher conta destino (existente ou nova) ⭐ MVP

**User Story**: Como usuário, quero escolher salvar em uma conta existente ou criar uma nova, para vincular as transações ao lugar certo.

**Why P1**: Pedido explícito (passo 5).

**Acceptance Criteria**:

1. WHEN o banco é confirmado THEN o sistema SHALL perguntar se deseja salvar em uma conta existente ou criar uma nova.
2. WHEN o usuário escolhe conta existente THEN o sistema SHALL listar as contas ativas para seleção.
3. WHEN o usuário escolhe criar nova THEN o sistema SHALL criar uma conta nova usando o nome do banco confirmado, tipo derivado do OFX (`ACCTTYPE` → checking/savings/investment; padrão `checking` quando indisponível), saldo inicial 0, com cor/ícone padrão.
4. WHEN a conta é definida THEN o sistema SHALL vincular todas as transações importadas a `accountId`.

**Independent Test**: Importar criando conta nova "Banco Intermedium S/A" e ver as transações vinculadas a ela; repetir escolhendo uma conta existente.

---

### P1: Salvar transações importadas ⭐ MVP

**User Story**: Como usuário, quero que os lançamentos revisados sejam gravados no banco como transações pagas, para que apareçam no app e componham o saldo da conta.

**Why P1**: É o resultado final de todo o fluxo.

**Acceptance Criteria**:

1. WHEN o usuário confirma o salvamento THEN o sistema SHALL inserir cada lançamento como transação com `status=paid` e `paidAt = date` do lançamento.
2. WHEN as transações são salvas THEN o sistema SHALL gravar `accountId`, `description`, `amount` (positivo), `type`, `date`, `categoryId` (sugerido ou null), `createdAt`/`updatedAt`.
3. WHEN salvar em conta nova THEN o saldo inicial SHALL ser 0 (o saldo exibido será calculado pela soma das transações pagas — ver `useAccountBalance`).
4. WHEN o salvamento conclui THEN o sistema SHALL exibir `showSuccess` com a contagem de transações importadas e navegar de volta.
5. WHEN o salvamento ocorre THEN ele SHALL usar `db.transaction()` (atomicidade) e inserção em lote para performance.
6. WHEN o salvamento falha THEN o sistema SHALL reverter (nenhuma transação parcial) e exibir `showError`.

**Independent Test**: Concluir a importação e verificar na tela de transações/conta que os lançamentos aparecem e o saldo bate com a soma.

---

### P2: Detecção de duplicatas (skip)

**User Story**: Como usuário, quero que reimportar o mesmo extrato não duplique transações, para manter os dados limpos.

**Why P2**: Decisão escolhida (detectar e pular), mas exige migração de schema (`externalId`) — fundacional porém isolável do fluxo P1 inicial.

**Acceptance Criteria**:

1. WHEN o schema é migrado THEN a tabela `transactions` SHALL ter uma coluna `externalId` (text, nullable) para o identificador de origem (FITID do OFX).
2. WHEN um OFX é importado THEN cada `STMTTRN.FITID` SHALL ser usado como `externalId`, e lançamentos cujo `externalId` já exista (na mesma conta) SHALL ser pulados.
3. WHEN um CSV é importado THEN duplicatas SHALL ser detectadas por heurística (mesma `date` + `amount` + `description` na mesma conta), pois CSV não tem ID.
4. WHEN itens são pulados por duplicidade THEN o sistema SHALL informar quantos foram ignorados na mensagem de sucesso.

**Independent Test**: Importar o mesmo OFX duas vezes e confirmar que a segunda não adiciona transações.

---

### P2: Auto-categorização por palavra-chave

**User Story**: Como usuário, quero que os lançamentos venham com uma categoria sugerida, para não precisar categorizar tudo manualmente.

**Why P2**: Melhora a experiência; o fluxo funciona sem ela (categoria null editável).

**Acceptance Criteria**:

1. WHEN um lançamento é extraído THEN o sistema SHALL tentar mapear uma categoria a partir de palavras-chave no histórico/descrição (ex.: "Salário"→Salário, "Pix"→Transferências, "Compra no débito"→Compras, "Posto"→Transporte/Combustível).
2. WHEN nenhuma palavra-chave casa THEN o lançamento SHALL ficar sem categoria (`categoryId = null`).
3. WHEN o mapeamento atribui uma categoria THEN ela SHALL respeitar o tipo do lançamento (categoria de income para receita, de expense para despesa, ou `both`).
4. WHEN o usuário edita a categoria na revisão THEN a escolha manual SHALL sobrescrever a sugestão.

**Independent Test**: Importar o arquivo de exemplo e ver "Salário recebido" sugerido como categoria de receita e "Compra no débito" como despesa.

---

## Edge Cases

- WHEN o arquivo está vazio ou não contém transações THEN o sistema SHALL exibir mensagem "Nenhuma transação encontrada" e não abrir a lista.
- WHEN uma linha individual do CSV está malformada (colunas faltando) THEN o sistema SHALL pular a linha e contabilizar quantas foram ignoradas, sem abortar a importação inteira.
- WHEN o valor está em formato BR ("-1.234,56") THEN o parser SHALL interpretar corretamente milhar (`.`) e decimal (`,`) e o sinal.
- WHEN a data está em `dd/MM/yyyy` (CSV) ou `yyyyMMdd` (OFX) THEN o parser SHALL convertê-la corretamente para timestamp ms.
- WHEN o CSV tem linhas de cabeçalho/metadados (Conta, Período, Saldo, linha em branco) antes da tabela THEN o parser SHALL localizar a linha de cabeçalho de colunas e ignorar o restante.
- WHEN o OFX usa encoding/charset `1252` THEN a leitura SHALL preservar acentuação corretamente.
- WHEN o usuário sai da tela no meio do fluxo THEN nenhuma transação SHALL ser persistida (só persiste no passo final de salvar).
- WHEN o arquivo é muito grande THEN o parsing/inserção SHALL ocorrer em lotes para não estourar memória nem travar a UI.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| IMP-01 | P1: Acessar e selecionar arquivo (item nas configs + navegação) | Design | Pending |
| IMP-02 | P1: Seletor de documentos OFX/CSV + auto-detecção de formato | Design | Pending |
| IMP-03 | P1: Confirmação via showConfirm | Design | Pending |
| IMP-04 | P1: Dialog de progresso (parsing assíncrono/responsivo) | Design | Pending |
| IMP-05 | P1: Lista de revisão com resumo | Design | Pending |
| IMP-06 | P1: Edição de item (descrição, valor, tipo, categoria, data) | Design | Pending |
| IMP-07 | P1: Exclusão de item da importação | Design | Pending |
| IMP-08 | P1: Confirmar/editar banco (pré-preenche do OFX `<ORG>`) | Design | Pending |
| IMP-09 | P1: Escolher conta existente ou criar nova | Design | Pending |
| IMP-10 | P1: Salvar como paid, atômico, em lote | Design | Pending |
| IMP-11 | P1: Parser OFX (STMTTRN → lançamento) | Design | Pending |
| IMP-12 | P1: Parser CSV (formato extrato BR) | Design | Pending |
| IMP-13 | P2: Coluna `externalId` + dedupe OFX por FITID | - | Pending |
| IMP-14 | P2: Dedupe CSV por heurística (data+valor+descrição) | - | Pending |
| IMP-15 | P2: Auto-categorização por palavra-chave | - | Pending |

**ID format:** `IMP-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 15 total, 0 mapeados a tasks (Design pendente)

---

## Data Mapping (referência para Design)

### OFX (`<STMTTRN>`)
| Campo OFX | Destino |
| --------- | ------- |
| `<ORG>` (SONRS/FI) | sugestão de nome do banco |
| `<ACCTTYPE>` (CHECKING/SAVINGS/...) | `accounts.type` (checking/savings/investment; padrão checking) |
| `<TRNAMT>` | sinal → `type` (neg=expense, pos=income); `amount = abs()` |
| `<DTPOSTED>` (`yyyyMMdd`) | `transactions.date` (timestamp ms) |
| `<NAME>` / `<MEMO>` | `transactions.description` |
| `<FITID>` | `transactions.externalId` (P2, dedupe) |
| `<CURDEF>` | validação (espera BRL) |

### CSV (extrato Banco Inter — `;` separado, header em ~linha 6)
Colunas: `Data Lançamento;Histórico;Descrição;Valor;Saldo`
| Coluna CSV | Destino |
| ---------- | ------- |
| `Data Lançamento` (`dd/MM/yyyy`) | `transactions.date` |
| `Histórico` | palavra-chave para auto-categoria (P2) |
| `Descrição` | `transactions.description` |
| `Valor` (BR, com sinal) | sinal → `type`; `amount = abs()` |
| `Saldo` | ignorado (saldo é calculado) |
| (sem banco) | nome do banco pedido manualmente |

---

## Success Criteria

- [ ] Importar o arquivo OFX de exemplo (~1031 lançamentos) cria as transações corretas vinculadas a uma conta, com saldo coerente.
- [ ] Importar o arquivo CSV de exemplo produz o mesmo resultado (auto-detecção de formato funciona).
- [ ] Reimportar o mesmo arquivo não cria duplicatas (P2).
- [ ] A UI permanece responsiva durante a importação (sem freeze perceptível).
- [ ] O usuário consegue editar e excluir itens antes de salvar.
- [ ] Fluxo completo (selecionar → confirmar → progresso → revisar → banco → conta → salvar) executável em poucos toques.
