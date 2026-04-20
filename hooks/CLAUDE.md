# hooks/ — Hooks Customizados

Hooks reutilizáveis para alertas e consultas ao banco de dados SQLite local.

## Estrutura de Pastas

Novos hooks são criados em pastas pelo nome da tabela:

```
hooks/
  useCustomAlert.ts          ← raiz (utilitário, não é tabela)
  useAccounts.ts             ← existente, migrar quando alterar
  ...
  transactions/
    useGroupPaidCount.ts     ← count() de pagas por grupo
  attachments/
    useGroupAttachments.ts   ← anexos compartilhados do grupo
```

**Regra:** Hooks existentes migram para a pasta de tabela quando forem modificados. Hooks utilitários (ex: `useCustomAlert`) permanecem na raiz.

---

## Regra TanStack Form — Detecção de Mudanças para PATCH

Ao construir payload de edição em bulk (ex: edição de grupos de transações), usar `!isDefaultValue` do `fieldMeta` para detectar campos alterados — não `isDirty`.

- `isDirty` é persistente (não reseta ao voltar ao valor original)
- `isDefaultValue === false` reflete o estado real: valor atual difere do `defaultValues`

**Utilitário:** `buildFormPatch(fieldMeta, value)` em `utils/buildFormPatch.ts` — genérico, importável em qualquer form.

```ts
import { buildFormPatch } from 'utils/buildFormPatch';
const patch = buildFormPatch(form.store.state.fieldMeta, value);
// patch contém apenas os campos onde isDefaultValue === false
```

**Validação de form:** Usar `validatorAdapter: zodValidator()` + `validators: { onChange: schema }` no `useForm` — sem `safeParse` manual no `onSubmit`.

---

## Padrão de Retorno (hooks de query)

Todos os hooks de consulta ao banco retornam:
```ts
{ data: T[], loading: boolean, error: string | null }
```

O estado inicial é `loading: true`, `data: []`, `error: null`. Após a consulta síncrona, `loading` passa para `false`.

## Padrão de Conexão

Cada hook abre sua própria conexão ao SQLite usando o mesmo nome de banco (`db.db`), seguindo o padrão existente em `themes/useTheme.ts`:

```ts
const expo = SQLite.openDatabaseSync('db.db');
const db = drizzle(expo);
```

## Enums

Sempre importar enums de `types/` — nunca usar strings literais nas queries.

---

## Arquivos

### `useCustomAlert.ts`
Gerencia o estado de alertas modais. Tipagem explícita, sem `any`.

### `useCategories.ts`
Consulta `categories` filtrada por tipo de transação.
- Recebe `transactionType: TransactionTypeEnum`
- Retorna categorias cujo `type` é igual ao tipo da transação ou `CategoryTypeEnum.Both`

### `useAccounts.ts`
Consulta `accounts` onde `isActive = true`.

### `useCards.ts`
Consulta `cards` onde `isActive = true`.

### `useGoals.ts`
Consulta `financial_goals` onde `status = GoalStatusEnum.Active`.

---

### `useTransactions.ts`
Query de transações por ano/mês com LEFT JOIN em categorias e grupos.

**Assinatura:** `useTransactions(year: number, month: number)`

**Retorno:** `{ data: TransactionWithCategory[], loading, error, refetch }`

- Filtra por intervalo de timestamp no campo `date` (início/fim do mês)
- Ordena por `desc(transactions.date)`
- Inclui `category` (nullable) e `group` (nullable) via LEFT JOIN

---

### `useUpdateTransactionStatus.ts`
Muta o status de uma transação individual (pago ↔ pendente).

**Assinatura:** `useUpdateTransactionStatus()`

**Retorno:** `{ mutate(transactionId, status, onSuccess?, onError?), loading, error }`

- Define `paidAt = Date.now()` ao marcar como pago
- Define `paidAt = null` ao desmarcar

---

### `useAttachments.ts`
Hook unificado para query + CRUD de anexos.

**Assinatura:** `useAttachments(transactionId?: string)`

**Retorno:**
```ts
{
  data: Attachment[],
  loading, error, refetch,
  createAttachment(local: AttachmentLocal, onSuccess?, onError?): void,
  createReceipt(local: AttachmentLocal, onSuccess?, onError?): void,
  deleteAttachment(id: string, onSuccess?, onError?): void,
  getReceipt(): Attachment | null,
}
```

**Regras:** máximo 5 anexos por transação; máximo 1 comprovante (`isReceipt=true`). `createReceipt` auto-define `isReceipt: true` e rejeita se já existir um.

---

### `useEditTransaction.ts`
Edita uma transação com escopo configurável para grupos.

**Assinatura:** `useEditTransaction()`

**Retorno:** `{ mutate(params: EditTransactionParams, onSuccess?, onError?), loading, error }`

**Escopos:**
| `EditScope` | Comportamento |
|-------------|---------------|
| `'only_this'` | Atualiza apenas a linha com `id = transactionId` |
| `'all_related'` | Atualiza todas as linhas com o mesmo `transactionGroupId` |
| `'from_this_forward'` | Atualiza linhas do grupo onde `date >= currentDate` |

---

## Pastas de tabela

### `transactions/useGroupPaidCount.ts`
Conta transações pagas em um grupo usando Drizzle `count()`.

**Assinatura:** `useGroupPaidCount(transactionGroupId?: string | null)`

**Retorno:** `{ paidCount: number, loading, error }`

- Se `transactionGroupId` for null/undefined → retorna `paidCount: 0` sem query
- Usado em `TransactionDetailsModal` para a barra de progresso de parcelas

---

### `attachments/useGroupAttachments.ts`
Busca todos os anexos (`isReceipt=false`) de todas as transações de um grupo via Drizzle `inArray` com subquery.

**Assinatura:** `useGroupAttachments(transactionGroupId?: string | null)`

**Retorno:** `{ data: Attachment[], loading, error, refetch }`

- Se `transactionGroupId` for null/undefined → retorna `data: []` sem query
- Comprovantes (`isReceipt=true`) permanecem individuais — usar `useAttachments()` para isso
- Usado em `TransactionDetailsModal` na seção "Anexos" quando a transação tem grupo
