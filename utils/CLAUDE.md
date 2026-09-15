# utils/ — Utilitários

Funções e hooks utilitários reutilizáveis, sem dependência de navegação ou contexto de tela.

## Arquivos de lógica de domínio

### `frequency.ts`
Função pura para cálculo de datas com base em frequências (`FrequencyEnum`).

**Exportações:**
- `addByFrequency(date, frequency, count)` — avança a data `count` períodos. Não muta a data original; retorna uma nova instância de `Date`.

**Uso:**
```ts
import { addByFrequency } from 'utils/frequency';
const proxVencimento = addByFrequency(dataInicio, FrequencyEnum.Monthly, 1);
```

---

### `cardDueDate.ts`
Função pura para calcular a data de vencimento da fatura de cartão de crédito.

**Exportações:**
- `computeCardDueDate(purchaseDate, closingDay)` — calcula o `dueDate` a partir da data da compra e do dia de fechamento do cartão.

**Regras de negócio:**
- `purchaseDate.getDate() < closingDay` → `dueDate` = `closingDay` do mesmo mês da compra.
- `purchaseDate.getDate() >= closingDay` → `dueDate` = `closingDay` do mês seguinte (compra no dia de fechamento vai para a próxima fatura).
- Overflow de dias: `Math.min(closingDay, diasNoMêsAlvo)` — ex: `closingDay=31` em fevereiro usa dia 28.
- `closingDay` null/undefined → `dueDate = purchaseDate.getTime()` (sem cartão, sem ciclo de fatura).

**Retorno:** timestamp em ms do início do dia de vencimento (`new Date(year, month, day, 0,0,0,0).getTime()`).

**Uso:**
```ts
import { computeCardDueDate } from 'utils/cardDueDate';
const dueDate = computeCardDueDate(new Date('2026-08-20'), 6); // → timestamp de 2026-09-06
```

---


### `transactionLabels.ts`
Constantes de labels e opções de seleção para o domínio de transações financeiras.

**Exportações:**
- `PaymentType` — tipo `'single' | GroupTypeEnum`
- `ACCOUNT_TYPE_LABELS` — `Record<AccountTypeEnum, string>` com labels em PT-BR
- `FREQUENCY_OPTIONS` — array `{ key: FrequencyEnum, label: string }[]`
- `PAYMENT_TYPE_OPTIONS` — array `{ key: PaymentType, label: string, icon: string }[]`

**Uso:**
```ts
import { ACCOUNT_TYPE_LABELS, FREQUENCY_OPTIONS, type PaymentType } from 'utils/transactionLabels';
```

---

---

### `buildFormPatch.ts`
Utilitário genérico para extrair apenas campos alterados de um TanStack Form, usando `fieldMeta.isDefaultValue`.

**Uso:**
```ts
import { buildFormPatch } from 'utils/buildFormPatch';

const fieldMeta = form.store.state.fieldMeta;
const patch = buildFormPatch(fieldMeta, value);
// patch conterá apenas os campos onde isDefaultValue === false
```

---

### `formatCurrency.ts`
Função pura para formatar valores monetários em Real brasileiro (BRL).

**Exportações:**
- `formatCurrency(value: number): string` — formata `value` como `R$ X.XXX,XX` usando `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.

**Uso:**
```ts
import { formatCurrency } from 'utils/formatCurrency';
formatCurrency(1234.5); // → 'R$ 1.234,50'
```

> **Regra:** nunca duplicar essa função em outros arquivos. Esta é a fonte única de verdade para formatação de moeda no projeto.

**Quando usar:** Ao construir payload PATCH para operações em bulk (ex: edição de grupos de transações), para evitar sobrescrever campos não alterados em todas as linhas do grupo.

**Regra TanStack Form:** Usar `!isDefaultValue` (não `isDirty`) para PATCH — reflete o estado real do valor vs `defaultValues` no momento do submit.

---

## Arquivos

### `useCurrencyInput.ts`
Hook para entrada de valores monetários no formato BRL.

**Uso:**
```ts
const { displayValue, numericValue, onChange } = useCurrencyInput(initialValue);
```

- `initialValue`: número decimal opcional (ex: `120.00`). Padrão: `0`.
- `displayValue`: string formatada para exibição no input (ex: `"1.234,56"`).
- `numericValue`: número decimal pronto para inserção no banco (ex: `1234.56`). Sem conversão adicional necessária.
- `onChange`: handler para passar ao `onChangeText` do `TextInput`. Aceita texto bruto do teclado numérico.

**Comportamento:**
- Strip de não-dígitos → divide por 100 → formata com `toLocaleString('pt-BR')`.
- Campo vazio retorna `numericValue = 0` e `displayValue = ''`.
- Nunca requer `Math.round()` — o valor já é decimal correto para o DB.
