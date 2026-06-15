# Goal Progress Sync — Tasks

**Spec**: `.specs/features/goal-progress-sync/spec.md`
**Status**: Complete

---

## Execution Plan

T1, T2 e T3 são independentes entre si — podem rodar em paralelo.

```
T1 [P] — useUpdateTransactionStatus (swipe pago/pendente)
T2 [P] — addTransaction (criação já paga)
T3 [P] — useEditTransaction (edição only_this com mudança de status)
```

---

## Task Breakdown

### T1: Fix `useUpdateTransactionStatus` [P]

**What**: Ao atualizar status de `pending→paid` ou `paid→pending`, sincronizar `financialGoals.currentAmount` se `transaction.goalId` for não-nulo.
**Where**: `hooks/useUpdateTransactionStatus.ts`
**Depends on**: None
**Requirement**: GPS-01

**Lógica exata**:
```ts
// Antes do update:
const tx = db.select().from(transactions).where(eq(transactions.id, transactionId)).get();

// Dentro de db.transaction():
db.transaction((dbTx) => {
  const paidAt = status === TransactionStatusEnum.Paid ? Date.now() : null;
  dbTx.update(transactions).set({ status, paidAt, updatedAt: Date.now() }).where(eq(transactions.id, transactionId)).run();

  if (tx?.goalId) {
    const goal = dbTx.select({ currentAmount: financialGoals.currentAmount })
      .from(financialGoals).where(eq(financialGoals.id, tx.goalId)).get();
    if (goal) {
      const delta = status === TransactionStatusEnum.Paid ? tx.amount : -tx.amount;
      const newAmount = Math.max(0, goal.currentAmount + delta);
      dbTx.update(financialGoals)
        .set({ currentAmount: newAmount, updatedAt: Date.now() })
        .where(eq(financialGoals.id, tx.goalId))
        .run();
    }
  }
});
```

**Done when**:
- [x] Busca a transação antes de atualizar para obter `goalId`, `amount` e `status` atual
- [x] Usa `db.transaction()` para atomicidade
- [x] `pending → paid` + `goalId` presente → incrementa `currentAmount` por `tx.amount`
- [x] `paid → pending` + `goalId` presente → decrementa `currentAmount` (mínimo 0)
- [x] Sem `goalId` → apenas atualiza status (comportamento atual preservado)
- [x] Importa `financialGoals` de `db/schema`
- [x] Gate: `bun run lint` sem erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `fix(hooks): sync goal currentAmount when toggling transaction paid status`

---

### T2: Fix `addTransaction` para criação já paga [P]

**What**: Ao criar transação com `status=paid` e `goalId` definido, incrementar `financialGoals.currentAmount`.
**Where**: `app/(tabs)/addTransaction.tsx`
**Depends on**: None
**Requirement**: GPS-02

**Casos a tratar** (apenas quando `value.status === Paid` e `value.goalId` não-vazio):

1. **Single**: dentro do bloco `single`, após o insert, adicionar update ao goal
2. **Installment**: a 1ª parcela pode ser `paid` — incrementar `installmentAmount` (não o total)
3. **Recurring**: a 1ª ocorrência pode ser `paid` — incrementar `value.amount`

**Padrão de update** (igual para os 3 casos, com `amount` correto):
```ts
if (value.status === TransactionStatusEnum.Paid && value.goalId) {
  const goal = db.select({ currentAmount: financialGoals.currentAmount })
    .from(financialGoals).where(eq(financialGoals.id, value.goalId)).get();
  if (goal) {
    db.update(financialGoals)
      .set({ currentAmount: goal.currentAmount + <amount>, updatedAt: now })
      .where(eq(financialGoals.id, value.goalId))
      .run();
  }
}
```

Para parcelas: `<amount> = installmentAmount`
Para single e recorrente: `<amount> = value.amount`

**Nota**: os blocos de `installment` e `recurring` já usam `db.transaction()` — adicionar o update do goal dentro da mesma transaction.

**Done when**:
- [x] Bloco `single`: goal atualizado quando `status=paid + goalId` presente
- [x] Bloco `installment`: goal atualizado por `installmentAmount` quando `status=paid + goalId` presente
- [x] Bloco `recurring`: goal atualizado quando `status=paid + goalId` presente
- [x] Todos os updates de goal estão dentro de `db.transaction()` (ou após insert atômico)
- [x] Importa `financialGoals` de `db/schema` (já importado)
- [x] Gate: `bun run lint` sem erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `fix(addTransaction): sync goal currentAmount when creating paid transaction`

---

### T3: Fix `useEditTransaction` para scope `only_this` [P]

**What**: Quando `data.status` está presente no payload de edição e scope é `only_this`, sincronizar `financialGoals.currentAmount` se a transação tiver `goalId`.
**Where**: `hooks/useEditTransaction.ts`
**Depends on**: None
**Requirement**: GPS-03

**Lógica**:
```ts
// No início do mutate, quando scope === 'only_this' e data.status está presente:
const existing = db.select({ goalId: transactions.goalId, amount: transactions.amount, status: transactions.status })
  .from(transactions).where(eq(transactions.id, transactionId)).get();

// Após o update da transação (dentro de db.transaction()):
if (existing?.goalId && data.status && existing.status !== data.status) {
  const goal = dbTx.select({ currentAmount: financialGoals.currentAmount })
    .from(financialGoals).where(eq(financialGoals.id, existing.goalId)).get();
  if (goal) {
    let newAmount = goal.currentAmount;
    if (data.status === TransactionStatusEnum.Paid) {
      newAmount = goal.currentAmount + existing.amount;
    } else if (existing.status === TransactionStatusEnum.Paid) {
      newAmount = Math.max(0, goal.currentAmount - existing.amount);
    }
    dbTx.update(financialGoals)
      .set({ currentAmount: newAmount, updatedAt: Date.now() })
      .where(eq(financialGoals.id, existing.goalId))
      .run();
  }
}
```

**Scopes bulk (`all_related`, `from_this_forward`)**: manter comportamento atual — sem update de goal (deferred GPS-05).

**Done when**:
- [x] Busca `goalId`, `amount`, `status` anterior da transação antes do update
- [x] Usa `db.transaction()` para atomicidade
- [x] `pending → paid` → incrementa `currentAmount`
- [x] `paid → pending` → decrementa `currentAmount` (mínimo 0)
- [x] `paid → paid` ou `pending → pending` → sem mudança no goal
- [x] Scopes bulk preservam comportamento atual (sem regressão)
- [x] Importa `financialGoals` de `db/schema`
- [x] Gate: `bun run lint` sem erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `fix(hooks): sync goal currentAmount on single-transaction status edit`

---

## Parallel Execution Map

```
Phase 1 (Parallel — sem dependências entre si):
  ├── T1 [P] — useUpdateTransactionStatus
  ├── T2 [P] — addTransaction
  └── T3 [P] — useEditTransaction
```

---

## Task Granularity Check

| Task | Scope | Status |
|------|-------|--------|
| T1: useUpdateTransactionStatus | 1 hook, 1 arquivo | ✅ Granular |
| T2: addTransaction | 1 tela, 3 blocos de insert | ✅ Granular |
| T3: useEditTransaction | 1 hook, 1 arquivo | ✅ Granular |
