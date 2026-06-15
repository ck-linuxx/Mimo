# Goal Progress Sync — Specification

## Problem Statement

Ao marcar uma transação como paga (swipe ou edição), se ela tiver um `goalId` vinculado, o campo
`financial_goals.currentAmount` **não é atualizado**. O progresso da meta fica zerado independente
de quantas transações forem pagas. O inverso também falha: desmarcar uma transação paga não subtrai
o valor da meta.

O mesmo bug existe na criação de transações já marcadas como pagas.

## Root Cause

Três pontos de mutação alteram o `status` de transações sem tocar em `financial_goals`:

| Arquivo | Cenário |
|---------|---------|
| `hooks/useUpdateTransactionStatus.ts` | Swipe "Marcar pago" / "Desmarcar" em `TransactionItem` |
| `app/(tabs)/addTransaction.tsx` | Criar transação já com `status=paid` |
| `hooks/useEditTransaction.ts` | Editar transação e alterar status |

## Goals

- [x] Marcar transação como paga → incrementa `currentAmount` da meta vinculada por `transaction.amount`
- [x] Desmarcar transação paga → decrementa `currentAmount` (mínimo 0, nunca negativo)
- [x] Criar transação com `status=paid` → incrementa `currentAmount` da meta vinculada
- [x] Editar transação e mudar status (scope `only_this`) → sincroniza `currentAmount` da meta
- [x] Todas as mudanças são atômicas — `db.transaction()` garante consistência

## Out of Scope

| Feature | Reason |
|---------|--------|
| Bulk scope (`all_related`, `from_this_forward`) com mudança de status | Caso raro; complexidade alta de calcular delta entre transações do grupo; deferred para GPS-05 |
| Auto-completar meta quando `currentAmount >= targetAmount` | Feature separada — não é parte do bug |
| Recalcular `currentAmount` de todas as metas (reconciliation) | Utility script futuro — fora do v1 |

---

## Requirements

### GPS-01: Toggle de status via `useUpdateTransactionStatus`

**Caso: pending → paid**
- Buscar a transação pelo `id` antes de atualizar
- Se `transaction.goalId` for não-nulo:
  - Dentro de `db.transaction()`: atualizar `transactions.status` + `paidAt` E incrementar `financialGoals.currentAmount` por `transaction.amount`

**Caso: paid → pending**
- Buscar a transação pelo `id` antes de atualizar
- Se `transaction.goalId` for não-nulo E `transaction.status === 'paid'`:
  - Dentro de `db.transaction()`: atualizar `transactions.status` + `paidAt = null` E decrementar `financialGoals.currentAmount` por `transaction.amount` (mínimo 0)

**Invariante:** `currentAmount` nunca fica negativo (usar `Math.max(0, current - amount)`).

---

### GPS-02: Criação com `status=paid` em `addTransaction`

**Transação à vista (`single`):**
- Se `value.status === paid` e `value.goalId` for não-vazio:
  - Dentro do mesmo insert (ou em `db.transaction()`): incrementar `financialGoals.currentAmount` por `value.amount`

**Transação parcelada (`installment`):**
- Apenas a 1ª parcela pode ser criada como `paid` (o form já respeita isso via `i === 1 ? value.status : Pending`)
- Se `value.status === paid` e `value.goalId` for não-vazio:
  - Incrementar `financialGoals.currentAmount` por `installmentAmount` (não pelo total)

**Transação recorrente:**
- A 1ª ocorrência pode ser criada como `paid`
- Se `value.status === paid` e `value.goalId` for não-vazio:
  - Incrementar `financialGoals.currentAmount` por `value.amount`

---

### GPS-03: Edição com mudança de status em `useEditTransaction` (scope `only_this`)

Quando `data.status` estiver presente no payload de edição e o scope for `only_this`:
- Buscar a transação pelo `id` para obter `goalId` e `status` anterior
- Se `goalId` for não-nulo:
  - `prev=pending, novo=paid` → incrementar `currentAmount` por `transaction.amount`
  - `prev=paid, novo=pending` → decrementar `currentAmount` (mínimo 0)
  - `prev=paid, novo=paid` → nenhuma mudança no goal
  - `prev=pending, novo=pending` → nenhuma mudança no goal

**Scopes bulk (`all_related`, `from_this_forward`):**
- Deferred: GPS-05 (fora do escopo desta iteração)
- Comportamento atual mantido (status atualizado sem sync de goal)

---

### GPS-04: Regras gerais de consistência

- Todas as atualizações ao `financialGoals` devem ser feitas dentro de `db.transaction()` junto com a atualização da transação
- Nunca atualizar `currentAmount` diretamente sem `db.transaction()`
- `currentAmount` nunca pode ser negativo: sempre usar `Math.max(0, current - amount)`
- Se `goalId` apontar para uma meta inexistente (FK inválida), o erro deve ser capturado normalmente pelo `try/catch` existente — não adicionar validação extra
- Metas com `status = cancelled` ou `completed` **também atualizam** `currentAmount` — o campo é apenas numérico, não tem lógica de bloqueio

---

## Affected Files

| Arquivo | Mudança |
|---------|---------|
| `hooks/useUpdateTransactionStatus.ts` | GPS-01 |
| `app/(tabs)/addTransaction.tsx` | GPS-02 |
| `hooks/useEditTransaction.ts` | GPS-03 (only_this) |

---

## Verification

- Criar meta com `targetAmount = 1000`, `currentAmount = 0`
- Criar transação de despesa com `amount = 200`, `goalId = <meta>`, `status = pending`
- Marcar como paga → `currentAmount` deve ser `200`
- Desmarcar → `currentAmount` deve voltar a `0`
- Criar transação já paga com `amount = 300`, `goalId = <meta>` → `currentAmount` deve ser `300` imediatamente
- Editar transação pendente e mudar para paga → `currentAmount` deve incrementar
