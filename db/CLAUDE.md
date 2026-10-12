# db/schema.ts — Documentação do Schema

Stack: Drizzle ORM + expo-sqlite (SQLite local, offline).
Valores monetários armazenados como **REAL** (decimal) no SQLite — ex: `120.00`, `1234.56`.
IDs são TEXT (uuid/cuid gerado na camada de aplicação).
Timestamps são INTEGER em milissegundos (Date.now()).

## Regra: pasta `types/`

Ao criar uma nova tabela no schema:
1. Criar `types/<nomeDaTabela>.ts` com os enums TypeScript derivados dos valores do schema e re-exportação dos tipos inferidos (`$inferSelect` / `$inferInsert`).
2. Adicionar as exportações no `types/index.ts`.
3. Adicionar uma linha na tabela de módulos do `CLAUDE.md` raiz para a nova pasta se ela for nova.

---

## Tabelas

### `categories`
Categorias para classificar transações (ex: Alimentação, Salário, Lazer).
- `type`: define se a categoria é de receita (`income`), despesa (`expense`), ou ambos (`both`).

### `accounts`
Contas financeiras do usuário (corrente, poupança, dinheiro, investimento).
- `balance`: saldo atual em reais (decimal, ex: `1500.00`). Editável diretamente pelo usuário.
  - Incrementado (`+amount`) quando uma **receita** vinculada à conta é marcada como paga.
  - Decrementado (`-amount`) quando uma **despesa** paga via conta (sem cartão) é registrada.
  - Revertido se a transação for cancelada ou excluída.
- Despesas pagas via cartão de crédito **não afetam** o balance da conta.

### `cards`
Cartões de crédito do usuário. Todo cartão cadastrado é implicitamente de crédito.
- Compras no débito não usam cartão — debitam diretamente da conta via `accountId`.
- `closingDay` / `dueDay`: dia de fechamento e vencimento da fatura (1–31).
- `creditLimit`: limite do cartão em reais decimais (nullable).
- Vinculado a uma `account` para fins de organização.
- `icon`: `bank:<code>` quando um banco é escolhido (logo em `components/bank`).

### `financial_goals`
Metas financeiras (ex: "Viagem para o Japão", "Reserva de emergência").
- `targetAmount`: valor alvo em reais decimais (ex: `5000.00`).
- `currentAmount`: progresso atual em reais decimais. Incrementado quando uma transação vinculada
  (`goalId`) é marcada como paga.
- `deadline`: data limite opcional (timestamp ms).
- `status`: `active` | `completed` | `cancelled`.

### `transaction_groups`
Template/agrupador para transações **parceladas** e **recorrentes**.
- `type`: `installment` (parcelado) ou `recurring` (recorrente sem limite).
- `amount`: valor em reais decimais (ex: `250.00`).
- `totalInstallments`: total de parcelas (nullable, apenas para `installment`).
- `frequency`: periodicidade (`daily` | `weekly` | `monthly` | `yearly`), apenas para `recurring`.
- `isActive`: quando `false`, para a geração de novas ocorrências recorrentes.
- Recorrentes são geradas sob demanda (~6 meses à frente); mais são criadas conforme o tempo passa.

### `transactions`
Ocorrências individuais de movimentações financeiras.
- `type`: `income` (receita) ou `expense` (despesa).
- `amount`: valor em reais decimais (ex: `99.90`).
- `status`: `pending` | `paid` | `cancelled`.
- `paidAt`: timestamp de quando foi efetivamente pago (null enquanto pendente).
- `date`: timestamp ms da data real da compra/movimentação.
- `dueDate`: **integer** (timestamp ms). Data de vencimento da fatura.
  - Compras com cartão: calculado por `computeCardDueDate(date, card.closingDay)`.
  - Sem cartão: igual a `date`.
  - Garantido não-nulo após a migration `0013_due_date_integer` (`UPDATE WHERE due_date IS NULL`).
  - Usado para contabilizar despesas de cartão no mês correto de cobrança.
- `accountId`: conta vinculada (débito/dinheiro). Obrigatório para receitas.
- `cardId`: cartão de crédito usado (nullable). Quando presente, a despesa não debita da conta.
- `goalId`: meta vinculada (nullable). Ao pagar, incrementa `financial_goals.currentAmount`.
- `transactionGroupId`: referência ao grupo (nullable). Null = transação à vista.
- `installmentNumber`: número da parcela dentro do grupo (ex: 3 de 12). Null para recorrentes.

---

## Comportamento por tipo de transação

| Tipo        | `transactionGroupId` | `installmentNumber` | Criação                          |
|-------------|----------------------|---------------------|----------------------------------|
| À vista     | null                 | null                | 1 registro                       |
| Parcelada   | ref → group          | 1, 2, … N           | N registros criados de uma vez   |
| Recorrente  | ref → group          | null                | ~6 meses gerados sob demanda     |

## Exclusão de parceladas/recorrentes

- **Só esta**: deleta apenas o registro da `transactions`.
- **Esta e próximas**: deleta registros futuros + seta `transaction_groups.isActive = false`.

---

### `attachments`
Anexos e comprovantes vinculados a uma transação.

- `transactionId`: FK para `transactions.id` (NOT NULL).
- `title`: nome amigável exibido na UI (ex: "Recibo da farmácia").
- `originalName`: nome original do arquivo (ex: "foto.jpg").
- `fileType`: MIME type (ex: `'image/jpeg'`, `'application/pdf'`).
- `fileSize`: tamanho em bytes (integer).
- `data`: conteúdo do arquivo em base64 TEXT (sem prefixo `data:...;base64,`).
- `isReceipt`: boolean (0/1). Quando `true`, é o comprovante de pagamento.
- `createdAt`: timestamp ms.

**Limites de negócio (aplicados nos hooks):**
- Máximo **5 anexos** por transação (incluindo comprovante).
- Máximo **1 comprovante** (`isReceipt=true`) por transação.
- Tamanho máximo por arquivo: **10 MB** (validado no `AttachmentPicker`).

**Geração de migration:** `bunx drizzle-kit generate` (atualize `drizzle/migrations.js` via drizzle-kit — ocorre automaticamente).
- **Todas**: deleta todos os registros do grupo + o registro do `transaction_groups`.