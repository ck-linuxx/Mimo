# Importar Dados — Context

**Gathered:** 2026-06-16
**Spec:** `.specs/features/import-data/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Tela em stack (`importData`) acessível a partir das Configurações que importa extratos bancários **OFX** ou **CSV** (formato auto-detectado), apresenta os lançamentos numa lista revisável/editável, confirma o banco e a conta destino, e grava as transações como pagas. Escopo limitado a **contas** (não cartões), tratando todo lançamento como transação única por sinal.

---

## Implementation Decisions

### Detecção de duplicatas
- **Detectar e pular.** Adicionar coluna `externalId` (text, nullable) em `transactions`.
- OFX: dedupe por `FITID` (`externalId`) dentro da mesma conta.
- CSV: dedupe por heurística `date + amount + description` (CSV não tem ID).
- Informar quantos itens foram pulados na mensagem de sucesso.
- Migração de schema é fundacional → fica em P2 (IMP-13/14), isolada do fluxo P1 inicial.

### Atribuição de categoria
- **Auto por palavra-chave + editável** (P2, IMP-15).
- Mapeia via `Histórico`/`Descrição` para categorias existentes **ou cria uma nova categoria** quando não há match.
- Nova categoria criada com ícone Feather adequado (tabela de mapeamento abaixo), cor padrão `#6B7280`, inserida via hook de mutação antes do batch insert.
- Categoria sugerida respeita o tipo (income/expense/both).
- Edição manual na revisão sobrescreve a sugestão.
- `CATEGORY_ICONS` em `utils/categoryConstants.ts` deve ser expandido com uma **página 5** de ícones bancários/financeiros para cobrir as categorias novas.

**Mapeamento keyword → categoria (existente ou nova):**

| Keyword (no Histórico/Descrição) | Categoria | Ícone | Tipo |
|---|---|---|---|
| Salário, salario, portabilidade | Salário *(existente)* | `briefcase` | income |
| Pix enviado | Pix Enviado | `log-out` | expense |
| Pix recebido | Pix Recebido | `log-in` | income |
| Pix enviado devolvido, Pix recebido devolvido | Estorno Pix | `rotate-ccw` | both |
| Compra no débito, Compra no crédito | Compras *(existente → `Mercado`)* | `shopping-cart` | expense |
| Posto, combustível, gasolina | Combustível | `droplet` | expense |
| Uber, taxi, 99, ônibus, metrô | Transporte *(existente)* | `truck` | expense |
| Aplicação, aplicacao | Aplicação | `arrow-up-circle` | expense |
| Resgate | Resgate | `arrow-down-circle` | income |
| Pagamento efetuado, Pagamento Fatura | Pagamento de Fatura | `credit-card` | expense |
| Estorno, estorno | Estorno | `rotate-ccw` | both |
| Recarga | Recarga | `smartphone` | expense |
| B3, bolsa, ações, acoes | Investimentos *(existente)* | `trending-up` | both |
| Transferência recebida | Transferência *(existente)* | `send` | income |
| Convênio, convenio | Convênio | `file-text` | expense |
| *(sem match)* | Outros *(existente)* | `more-horizontal` | both |

**Ícones novos a adicionar na página 5 de `CATEGORY_ICONS`:**
`rotate-ccw`, `rotate-cw`, `repeat`, `arrow-up-circle`, `arrow-down-circle`,
`check-circle`, `x-circle`, `minus-circle`, `plus-circle`,
`log-in`, `log-out`, `link-2`, `copy`, `corner-up-left`

### Saldo da conta
- **Default: importar como pagas, saldo inicial 0.** Todas as transações entram com `status=paid` por padrão, `paidAt=date`.
- Conta nova nasce com `balance = 0`; o saldo exibido é calculado por `useAccountBalance` (inicial + Σ receitas pagas − Σ despesas pagas).
- **Não** alterar `accounts.balance` ao inserir transações (consistente com o resto do app — ver `useAccountBalance.ts`).
- `LEDGERBAL`/`Saldo` do arquivo são ignorados na v1.
- **O usuário pode alterar individualmente** o status de `paid` → `pending` na tela de revisão (ver abaixo).

### Edição na lista de revisão
- **Edição completa por item:** descrição, valor, tipo (receita/despesa), categoria, data **e status (pago/pendente)**.
- Campo status: toggle visual `Pago` / `Pendente` no `EditItemModal`, default `Pago`.
- **Aviso ao abrir a tela de revisão**: exibir um banner informativo ("Todas as transações foram importadas como pagas. Você pode alterar o status individualmente.") — uma vez, descartável.
- Transações marcadas como `pending` **não** afetam o saldo calculado (coerente com `useAccountBalance` que filtra só pagas).
- **Excluir** item da importação (com animação reanimated).
- Resumo no topo: total de itens, soma de receitas (pagas), soma de despesas (pagas), contagem de pendentes.
- Excluir todos → botão de salvar desabilitado.

### Fluxo (ordem fixa, pedido pelo usuário)
1. Selecionar arquivo (DocumentPicker, `.ofx`/`.csv`).
2. `showConfirm` "Deseja importar?".
3. Dialog de progresso durante o parsing (assíncrono, não trava UI).
4. Lista revisável/editável.
5. Botão footer (estilo do botão "Criar Transação" do addTransaction) → pergunta o banco (pré-preenche `<ORG>` do OFX; CSV vazio; input editável; não-vazio obrigatório).
6. Pergunta conta: existente (lista de ativas) ou criar nova (nome = banco, tipo do OFX, saldo 0).
7. Salvar atômico em lote (`db.transaction()`), `status=paid`.

### Mapeamento de tipo
- Valor negativo → `expense`; positivo → `income`. `amount` sempre positivo (abs).
- Aplicação/Resgate/Estorno tratados por sinal como receita/despesa normal (transferências reais entre contas são out of scope na v1).

---

## Specific References

- **Botão footer**: replicar o padrão do botão "Criar Transação" em `app/(tabs)/addTransaction.tsx` (full-width, `primaryGold`, estado disabled).
- **Confirmação**: `useCustomAlert().showConfirm(title, message, onConfirm, onCancel?)`.
- **Sucesso/erro**: `showSuccess` / `showError`.
- **File picker**: padrão de `components/AttachmentPicker.tsx` (`DocumentPicker.getDocumentAsync` + `FileSystem.readAsStringAsync`).
- **Parse de moeda BR**: lógica em `utils/useCurrencyInput.ts` (strip não-dígitos, /100, sinal) — extrair util pura para o parser.
- **Modal de edição/seleção**: padrão de `components/EditScopeModal.tsx` (Modal + reanimated scale/opacity, `SPRING_MODAL`).
- **Criação de conta**: padrão de insert em `app/(stack)/accountCreate.tsx`.
- **Registro da tela**: adicionar `<Stack.Screen name="importData" />` em `app/(stack)/_layout.tsx`; navegar com `router.push('/importData')` a partir de `app/(tabs)/settings.tsx`.
- Arquivos de teste reais: `/home/clark/Projetos/mimoV2/Extrato-01-01-2025-a-15-06-2026-OFX.ofx` e `...-CSV.csv` (banco Intermedium, ~1031 lançamentos, conta CHECKING, BRL).

---

## Deferred Ideas

- Importação de faturas de cartão de crédito (ciclo de fatura).
- Mapear Aplicação/Resgate como transferências reais entre conta corrente e investimento (par de transações vinculadas).
- Suporte a formatos QIF/XLSX/PDF.
- Reconciliação de saldo: usar `LEDGERBAL` do OFX para validar/ajustar saldo inicial e alertar divergências.
- Exportar dados (feature inversa).
- Aprender categorização: lembrar a categoria que o usuário escolheu para uma descrição e sugerir nas próximas importações.
- **Tela de Transferências** (feature separada — ver STATE.md): tela em stack acessível via Configurações que lista movimentações do tipo transferência (Pix enviado/recebido, Aplicação, Resgate, Estorno) tanto das importações quanto das transações manuais.
