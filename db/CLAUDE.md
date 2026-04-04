# db/schema.ts — Documentação do Schema

Stack: Drizzle ORM + expo-sqlite (SQLite local, offline).
Valores monetários armazenados em **centavos** (integer) para evitar erros de ponto flutuante.
IDs são TEXT (uuid/cuid gerado na camada de aplicação).
Timestamps são INTEGER em milissegundos (Date.now()).

---

## Tabelas

### `categories`
Categorias para classificar transações (ex: Alimentação, Salário, Lazer).
- `type`: define se a categoria é de receita (`income`), despesa (`expense`), ou ambos (`both`).

### `accounts`
Contas financeiras do usuário (corrente, poupança, dinheiro, investimento).
- `balance`: saldo atual em centavos. Editável diretamente pelo usuário.
  - Incrementado (`+amount`) quando uma **receita** vinculada à conta é marcada como paga.
  - Decrementado (`-amount`) quando uma **despesa** paga via conta (sem cartão) é registrada.
  - Revertido se a transação for cancelada ou excluída.
- Despesas pagas via cartão de crédito **não afetam** o balance da conta.

### `cards`
Cartões de crédito do usuário. Todo cartão cadastrado é implicitamente de crédito.
- Compras no débito não usam cartão — debitam diretamente da conta via `accountId`.
- `closingDay` / `dueDay`: dia de fechamento e vencimento da fatura (1–31).
- `creditLimit`: limite do cartão em centavos (nullable).
- Vinculado a uma `account` para fins de organização.

### `financial_goals`
Metas financeiras (ex: "Viagem para o Japão", "Reserva de emergência").
- `targetAmount`: valor alvo em centavos.
- `currentAmount`: progresso atual em centavos. Incrementado quando uma transação vinculada
  (`goalId`) é marcada como paga.
- `deadline`: data limite opcional (timestamp ms).
- `status`: `active` | `completed` | `cancelled`.

### `transaction_groups`
Template/agrupador para transações **parceladas** e **recorrentes**.
- `type`: `installment` (parcelado) ou `recurring` (recorrente sem limite).
- `totalInstallments`: total de parcelas (nullable, apenas para `installment`).
- `frequency`: periodicidade (`daily` | `weekly` | `monthly` | `yearly`), apenas para `recurring`.
- `isActive`: quando `false`, para a geração de novas ocorrências recorrentes.
- Recorrentes são geradas sob demanda (~6 meses à frente); mais são criadas conforme o tempo passa.

### `transactions`
Ocorrências individuais de movimentações financeiras.
- `type`: `income` (receita) ou `expense` (despesa).
- `status`: `pending` | `paid` | `cancelled`.
- `paidAt`: timestamp de quando foi efetivamente pago (null enquanto pendente).
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
- **Todas**: deleta todos os registros do grupo + o registro do `transaction_groups`.