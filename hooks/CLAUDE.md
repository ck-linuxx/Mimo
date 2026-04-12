# hooks/ — Hooks Customizados

Hooks reutilizáveis para alertas e consultas ao banco de dados SQLite local.

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
