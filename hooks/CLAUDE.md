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

Hooks paginados retornam também `totalCount: number`:
```ts
{ data: T[], totalCount: number, loading: boolean, error: string | null, refetch: () => void }
```

O estado inicial é `loading: true`, `data: []`, `error: null`. Após a consulta síncrona, `loading` passa para `false`.

---

## Regra de Paginação — obrigatório DB-level

**Proibido** realizar paginação em memória no front (`.slice(page * pageSize, ...)`).

Toda lista de dados transacionais que exibir paginação **deve** usar `limit/offset` no Drizzle:

```ts
// ✅ Correto — paginação real no banco
const rows = db
  .select()
  .from(transactions)
  .where(baseWhere)
  .orderBy(desc(transactions.date))
  .limit(pageSize)
  .offset(page * pageSize)
  .all();

// ❌ Proibido — paginação em memória
const all = db.select().from(transactions).where(baseWhere).all();
const page = all.slice(page * pageSize, (page + 1) * pageSize); // NUNCA
```

### Query de `totalCount`

Deve executar **somente** `COUNT(*)` com a mesma cláusula `where` — sem `JOIN`, sem `ORDER BY`, sem seleção de campos adicionais:

```ts
// ✅ Correto
const countRow = db
  .select({ count: sql<number>`COUNT(*)` })
  .from(transactions)
  .where(baseWhere)
  .get();
setTotalCount(countRow?.count ?? 0);

// ❌ Proibido — joins desnecessários na contagem
const countRow = db
  .select({ count: sql<number>`COUNT(*)` })
  .from(transactions)
  .leftJoin(categories, eq(transactions.categoryId, categories.id)) // nunca
  .where(baseWhere)
  .get();
```

### Dependências de array no `useEffect`

Quando o hook recebe um array como parâmetro (ex: `linkedCardIds: string[]`), serializar para string na dependência para evitar re-execuções desnecessárias por mudança de referência:

```ts
const idsKey = linkedCardIds.join(',');
useEffect(() => {
  // usa linkedCardIds normalmente no corpo
}, [idsKey, ...outrasDeps]);
```

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

---

## Pasta `transactions/`

### `useCardBillingSummary.ts`
Resumo financeiro de um ciclo de fatura específico.

**Assinatura:** `useCardBillingSummary(cardId, cycleStartTs?, cycleEndTs?)`

**Retorno:** `{ data: { totalSpent: number, transactionCount: number }, loading, error, refetch }`

- Soma `amount` onde `cardId + type=expense + status!=cancelled + date in cycle`
- Retorna zeros quando os timestamps são `undefined`

---

### `useCardBillingTransactions.ts`
Listagem paginada de transações de um ciclo de fatura.

**Assinatura:** `useCardBillingTransactions(cardId, cycleStartTs?, cycleEndTs?, page, pageSize)`

**Retorno:** `{ data: TransactionWithCategory[], totalCount: number, loading, error, refetch }`

- Paginação real via `limit/offset` Drizzle
- COUNT separado sem JOIN para `totalCount`
- LEFT JOIN em `categories` e `transactionGroups`
- Exclui `status=cancelled`, ordena por `date DESC`

---

### `useAccountTransactionsPaginated.ts`
Listagem paginada de transações de uma conta + cartões vinculados para um mês.

**Assinatura:** `useAccountTransactionsPaginated(accountId, linkedCardIds, year, month, page, pageSize)`

**Retorno:** `{ data: TransactionWithCategory[], totalCount: number, loading, error, refetch }`

- Filtro: `accountId = id OR cardId IN (linkedCardIds)` — lida com array vazio
- COUNT separado sem JOIN para `totalCount`
- Exclui `status=cancelled`, filtra pelo mês (timestamp), ordena por `date DESC`
- `linkedCardIds` serializado como `join(',')` na dependência do `useEffect`

---

### `useCardTransactionsPaginated.ts`
Paginação real de transações de um cartão (via `limit/offset`).

**Assinatura:** `useCardTransactionsPaginated(cardId, page, pageSize)`

**Retorno:** `{ data: TransactionWithCategory[], totalCount: number, loading, error, refetch }`

- Duas queries: dados paginados + COUNT total
- Exclui `status=cancelled`

---

### `useCardCategoryTotals.ts`
Totais agrupados por categoria para DonutChart.

**Assinatura:** `useCardCategoryTotals(cardId, months)`

**Retorno:** `{ data: DonutChartDataItem[], loading, error, refetch }`

- GROUP BY `categoryId`, SUM `amount` onde `type=expense + status=paid`
- `date >= getMonthsAgoStartTs(months)`

---

### `useCardMonthlyTotals.ts`
Totais mensais para BarChart.

**Assinatura:** `useCardMonthlyTotals(cardId, months)`

**Retorno:** `{ data: MonthlyTotal[], loading, error, refetch }` onde `MonthlyTotal = { label: string, value: number }`

- Itera `getLastNMonths(months)`, executa SUM por mês individualmente
- `type=expense + status=paid`

### `useGoals.ts`
Consulta `financial_goals` onde `status = GoalStatusEnum.Active`.

---

### `useTransactions.ts`
Query de transações por ano/mês. Executa duas queries SQLite por chamada.

**Assinatura:** `useTransactions(year: number, month: number)`

**Retorno:** `{ data: TransactionWithCategory[], cardBillingData: CardBillingGroup[], loading, error, refetch }`

**Query 1 — listagem por `date`:**
- Filtra transações com `date` no mês exibido (comportamento original)
- LEFT JOIN em `categories` e `transactionGroups`
- Ordena por `desc(transactions.date)`

**Query 2 — fatura por `dueDate`:**
- Filtra `cardId IS NOT NULL`, `dueDate >= monthStart`, `dueDate <= monthEnd`
- E `date < monthStart OR date > monthEnd` (compra em outro mês)
- LEFT JOIN em `categories`, `transactionGroups` e `cards` (para `name` e `color`)
- Agrupa o resultado em `CardBillingGroup[]` por `cardId`

**Interface exportada:**
```ts
export interface CardBillingGroup {
  cardId: string;
  cardName: string;
  cardColor: string | null;
  transactions: TransactionWithCategory[];
  total: number; // soma dos amounts do grupo
}
```

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

---

## Pasta `pluggy/`

Hooks da integração Open Finance com a Pluggy:

- `usePluggyCredentials.ts`: lê, salva, testa (`authenticate(true)`) e remove credenciais (`clientId`, `clientSecret`, `itemIds`) do `expo-secure-store`.
- `usePluggyConnections.ts`: lista `bank_connections` e `bank_accounts`, atualiza conexões na API (`refreshFromRemote`), gerencia vínculo com conta/cartão local (`mapAccount`, `createAndMapLocalTarget`) e limpa dados da integração (`purgeAllData`).
- `usePluggySync.ts`: subscreve ao estado global de sincronização (`syncService`) e expõe `syncNow({ force })`.
- `useOnlineSync.ts`: monitora conectividade (`@react-native-community/netinfo`) e retorno ao foreground (`AppState`), disparando `syncAllPluggyData` respeitando `pluggyAutoSync` e throttle de 15 min, além de registrar `PLUGGY_BACKGROUND_SYNC_TASK`.
- `usePluggyInbox.ts`: paginação DB-level (`limit/offset` + `COUNT(*)` separado) de `pluggy_transactions` por aba (`pending`, `linked`, `imported`, `ignored`), filtro de conta, busca textual, candidatos de vínculo e sugestão de categoria. Exporta também `usePluggyPendingBadge()`.
- `usePluggyReview.ts`: ações de revisão da caixa de entrada (`approveAsNew`, `approveWithEdits`, `linkExisting`, `ignore`, `undo`, `applyBankUpdate`, `bulkIgnore`, `bulkImport`, `bulkImportSafe`, `searchManualCandidates`).

