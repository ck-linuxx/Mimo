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
