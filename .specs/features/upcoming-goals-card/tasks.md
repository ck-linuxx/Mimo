# Upcoming Goals Card — Tasks

**Spec**: `.specs/features/upcoming-goals-card/spec.md`
**Status**: Complete

---

## Execution Plan

### Phase 1 — Foundation (Parallel)

T1 e T2 não têm dependências entre si — rodam simultaneamente.

```
T1 [P] — useUpcomingGoals
T2 [P] — GaugeChart
```

### Phase 2 — Componente do card (Sequential)

Depende de T1 + T2 concluídos.

```
T1 + T2 ──→ T3 — UpcomingGoalsCard
```

### Phase 3 — Integração na home (Sequential)

Depende de T3 concluído.

```
T3 ──→ T4 — Wire index.tsx
```

---

## Task Breakdown

### T1: Hook `useUpcomingGoals` [P]

**What**: Criar hook que consulta as 2 metas ativas com `finishAt` mais próximo.
**Where**: `hooks/useUpcomingGoals.ts` (arquivo novo)
**Depends on**: None
**Reuses**: Padrão de `hooks/useGoals.ts` — mesma estrutura de `useEffect` + `useState` + `.all()`
**Requirement**: UCG-09, UCG-10

**Done when**:

- [x] Exporta `useUpcomingGoals(): { data: FinancialGoal[], loading: boolean, error: string | null, refetch: () => void }`
- [x] Query filtra `status = 'active'` via `eq(financialGoals.status, GoalStatusEnum.Active)`
- [x] Query filtra `finishAt IS NOT NULL` via `isNotNull(financialGoals.finishAt)`
- [x] Query ordena por `finishAt ASC` via `asc(financialGoals.finishAt)`
- [x] Query limita a 2 resultados via `.limit(2)`
- [x] Estado inicial: `loading: true`, `data: []`, `error: null`
- [x] `refetch` força re-execução via `refreshKey`
- [x] Gate: `bun run lint` sem erros

**Tests**: none (sem infraestrutura de testes no projeto)
**Gate**: quick → `bun run lint`

**Commit**: `feat(hooks): add useUpcomingGoals — active goals sorted by finishAt`

---

### T2: Componente `GaugeChart` [P]

**What**: Criar componente de gauge ECharts customizável via props.
**Where**: `components/charts/GaugeChart.tsx` (arquivo novo)
**Depends on**: None
**Reuses**: Padrão de inicialização de `components/charts/DonutChart.tsx` — `chartRef`, `onLayout`, `echarts.init`, `chart.dispose()`
**Requirement**: UCG-06, UCG-07, UCG-08

**Interface de props**:
```ts
interface GaugeChartProps {
  value: number;           // 0–100
  size?: number;           // default: 100
  arcColor?: string;       // default: colors.primaryGold
  trackColor?: string;     // default: colors.disabled
  arcWidth?: number;       // espessura do arco em % (default: 18)
  startAngle?: number;     // graus (default: 225)
  endAngle?: number;       // graus (default: -45)
  showLabel?: boolean;     // exibe % no centro (default: true)
  labelColor?: string;     // default: colors.textPrimary
  labelFontSize?: number;  // default: 14
  borderRadius?: number;   // pontas do arco (default: 4)
  isLoading?: boolean;     // exibe Skeleton (default: false)
}
```

**Configuração ECharts obrigatória**:
- Registrar no nível do módulo (fora do componente): `echarts.use([SVGRenderer, GaugeChart])` (importar `GaugeChart` de `echarts/charts`)
- `echarts.init(ref, 'light', { renderer: 'svg', width: size, height: size })`
- Series: `type: 'gauge'`, `startAngle`, `endAngle`, `min: 0`, `max: 100`
- Arco de progresso: `itemStyle.color = arcColor`, `roundCap: true`, `borderRadius`
- Arco de fundo (track): segundo `data` com `itemStyle.color = trackColor` e `z: 0`
- Label central: `detail` com `formatter: '{value}%'`, `color: labelColor`, `fontSize: labelFontSize`; oculto quando `showLabel = false`
- Pointer: desabilitado (`pointer.show: false`)
- Título do gauge: desabilitado (`title.show: false`)
- Tema reage: `theme` como dependência do `useCallback` que constrói a option; re-inicializa quando muda

**Done when**:

- [x] Componente exportado como `GaugeChart` de `components/charts/GaugeChart.tsx`
- [x] Props `value`, `size`, `arcColor`, `trackColor`, `arcWidth`, `startAngle`, `endAngle`, `showLabel`, `labelColor`, `labelFontSize`, `borderRadius`, `isLoading` implementadas com defaults
- [x] Arco preenchido proporcionalmente ao `value` (0–100)
- [x] `isLoading=true` exibe `<Skeleton width={size} height={size} borderRadius={size/2} />`
- [x] Re-inicializa ao mudar de tema (dark ↔ light)
- [x] `chart.dispose()` chamado no cleanup do `useEffect`
- [x] Sem import de `echarts` via path não-svgChart (sempre `@wuba/react-native-echarts/svgChart`)
- [x] Gate: `bun run lint` sem erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `feat(charts): add GaugeChart component with customizable arc props`

---

### T3: Componente `UpcomingGoalsCard`

**What**: Criar componente card "Próximas Metas" com lista de itens, empty state, skeleton e navegação.
**Where**: `components/UpcomingGoalsCard.tsx` (arquivo novo)
**Depends on**: T1 (useUpcomingGoals), T2 (GaugeChart)
**Reuses**:
- `components/InfoCard` — container do card
- `components/Skeleton` — estado de loading
- `GaugeChart` (T2) — gauge de progresso
- `useUpcomingGoals` (T1) — dados
- `formatCurrency` de `utils/formatCurrency`
- `useRouter` de `expo-router` — navegação
- Padrão de animação press: `useSharedValue` + `useAnimatedStyle` + `withSpring(SPRING_BOUNCE)` de `react-native-reanimated`
**Requirement**: UCG-01, UCG-02, UCG-03, UCG-04, UCG-05, UCG-11, UCG-12, UCG-13

**Layout de cada item de meta**:
```
┌──────────────────────────────────────────────┐
│  [Gauge 80px]  │  R$ 475,00/mês   ← text-lg bold    │
│                │  15 dez 2026     ← text-xs secondary│
│                │                                    │
│                │  R$ 1.200,00 / R$ 5.000,00          │
│                │  ^^^^^^^^^^^                        │
│                │  (primaryGold)   (textSecondary)    │
└──────────────────────────────────────────────┘
```

**Cálculo de valor mensal** (puro, inline no componente):
```ts
const now = new Date();
const end = new Date(goal.finishAt!);
const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
const remainingMonths = Math.max(1, months);
const monthlyNeeded = Math.max(0, goal.targetAmount - goal.currentAmount) / remainingMonths;
```

**Formatação de data** (pt-BR, sem biblioteca extra):
```ts
// ex: "15 dez 2026"
const d = new Date(goal.finishAt!);
const day = d.getDate();
const month = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][d.getMonth()];
const year = d.getFullYear();
const dateLabel = `${day} ${month} ${year}`;
```

**Animação de press**:
```ts
const SPRING_BOUNCE = { damping: 5, stiffness: 550, mass: 0.35 } as const;
const scale = useSharedValue(1);
// pressIn: scale.value = withSpring(0.96, SPRING_BOUNCE)
// pressOut: scale.value = withSpring(1, SPRING_BOUNCE)
```

**Props do componente** (sem props externas — auto-suficiente):
```ts
// Sem props — usa useUpcomingGoals internamente
export function UpcomingGoalsCard(): JSX.Element
```

**Empty state** (quando `data.length === 0` e não loading):
- Ícone Feather `target` centralizado, tamanho 32, cor `colors.disabled`
- Texto "Nenhuma meta com prazo" em `textSecondary`
- Subtexto "Cadastre uma meta com data de finalização" em `disabled`, `text-xs`
- Altura mínima do container: 80dp

**Done when**:

- [x] Componente exportado como `UpcomingGoalsCard`
- [x] Loading: exibe `<Skeleton height={100} borderRadius={16} />` quando `loading = true`
- [x] Empty state: ícone `target` + textos quando `data.length === 0`
- [x] Lista: renderiza até 2 itens com gauge (80dp) + valor mensal + data + acumulado/objetivo
- [x] `currentAmount >= targetAmount` → gauge em 100%, mensal `R$ 0,00/mês`, label "Meta atingida" (cor `incomeColor`)
- [x] Cada item é um `Pressable` animado (scale spring) que navega para `/(stack)/goalDetail?id=${goal.id}`
- [x] Separador entre itens quando há 2 metas (linha com `borderColor` 1dp)
- [x] Gate: `bun run lint` sem erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `feat(components): add UpcomingGoalsCard with gauge, monthly value and navigation`

---

### T4: Integrar `UpcomingGoalsCard` na home

**What**: Adicionar seção "Próximas Metas" na home e incluir refetch no `useFocusEffect`.
**Where**: `app/(tabs)/index.tsx` (modificar)
**Depends on**: T3
**Reuses**: Padrão existente de seção na home — `<View className="mb-4">` + `<Text>` de título + componente
**Requirement**: UCG-01

**Mudanças exatas**:
1. Importar `UpcomingGoalsCard` de `components/UpcomingGoalsCard`
2. Adicionar bloco após o bloco "Donut: Despesas por Categoria" e antes de "Transações Pendentes":
```tsx
{/* ── Próximas Metas ───────────────────────────────────────── */}
<View className="mb-4">
  <Text className="text-light-text-secondary dark:text-dark-text-secondary text-base font-semibold mb-3">
    Próximas Metas
  </Text>
  <UpcomingGoalsCard />
</View>
```
3. `UpcomingGoalsCard` gerencia seu próprio refetch internamente via `useUpcomingGoals` — **não** adicionar refetch externo no `useFocusEffect` da home (o componente é auto-suficiente)

**Done when**:

- [x] Seção "Próximas Metas" aparece na home entre "Despesas por Categoria" e "Transações Pendentes"
- [x] Título "Próximas Metas" usa mesma classe de texto dos outros títulos de seção
- [x] `UpcomingGoalsCard` importado e renderizado corretamente
- [x] Sem quebra de layout das seções existentes (Saldo, Receitas/Despesas, Donut, Transações)
- [x] Gate: `bun run lint` sem erros

**Tests**: none
**Gate**: quick → `bun run lint`

**Commit**: `feat(home): add Próximas Metas section with UpcomingGoalsCard`

---

## Parallel Execution Map

```
Phase 1 (Parallel):
  ├── T1 [P] — useUpcomingGoals hook
  └── T2 [P] — GaugeChart component

Phase 2 (Sequential, aguarda T1 + T2):
  └── T3 — UpcomingGoalsCard

Phase 3 (Sequential, aguarda T3):
  └── T4 — Wire index.tsx
```

---

## Task Granularity Check

| Task | Scope | Status |
|------|-------|--------|
| T1: useUpcomingGoals | 1 hook, 1 arquivo | ✅ Granular |
| T2: GaugeChart | 1 componente, 1 arquivo | ✅ Granular |
| T3: UpcomingGoalsCard | 1 componente, 1 arquivo | ✅ Granular |
| T4: Wire index.tsx | 1 tela, 1 import + 1 bloco JSX | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Mostra | Status |
|------|-------------------|----------------|--------|
| T1 | None | Início Phase 1 | ✅ Match |
| T2 | None | Início Phase 1 | ✅ Match |
| T3 | T1, T2 | T1 + T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |

---

## Test Co-location Validation

| Task | Camada criada | Matrix exige | Task diz | Status |
|------|---------------|--------------|----------|--------|
| T1: useUpcomingGoals | hook SQLite | none (sem infra) | none | ✅ OK |
| T2: GaugeChart | componente UI | none (sem infra) | none | ✅ OK |
| T3: UpcomingGoalsCard | componente UI | none (sem infra) | none | ✅ OK |
| T4: index.tsx | tela (modificação) | none (sem infra) | none | ✅ OK |
