# Upcoming Goals Card — Specification

## Problem Statement

A tela inicial (home) mostra saldo, receitas/despesas e transações pendentes, mas não dá
visibilidade imediata sobre as metas financeiras ativas. O usuário não sabe quanto precisa
poupar por mês para atingir cada meta sem entrar na tela dedicada de metas.

## Goals

- [ ] Exibir na home um card "Próximas Metas" com as metas ativas ordenadas por data de
      finalização mais próxima (`finishAt ASC`), mostrando gauge de progresso, valor mensal
      necessário e data final.
- [ ] Criar componente `GaugeChart` genérico e reutilizável para uso futuro em outras telas.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Metas sem `finishAt` definido | Valor mensal não calculável; excluídas da listagem (card ainda aparece) |
| Edição inline de metas | Fora do escopo da home |
| Paginação do card | Máximo 2 metas exibidas — sem necessidade de paginação |

---

## User Stories

### P1: Card "Próximas Metas" na home ⭐ MVP

**User Story**: Como usuário, quero ver na home minhas metas com prazo mais próximo e o
quanto preciso poupar por mês para atingi-las, para tomar decisões financeiras sem precisar
navegar para outra tela.

**Why P1**: É o núcleo da feature — sem este card não há nada entregável.

**Acceptance Criteria**:

1. WHEN a home é exibida com pelo menos uma meta ativa com `finishAt` definido THEN o
   sistema SHALL exibir a seção "Próximas Metas" abaixo de "Despesas por Categoria".
2. WHEN a seção é renderizada THEN o sistema SHALL listar as metas ativas ordenadas por
   `finishAt ASC` (prazo mais próximo primeiro), limitado às metas onde `finishAt IS NOT NULL`.
3. WHEN uma meta é exibida no card THEN o sistema SHALL mostrar, lado a lado:
   - **Esquerda**: `GaugeChart` mostrando `(currentAmount / targetAmount) * 100` como percentual.
   - **Direita — linha 1 (título)**: valor mensal necessário `=max(0, targetAmount - currentAmount) / remainingMonths`, formatado com `formatCurrency`, sufixo `/mês`.
   - **Direita — linha 2 (pequeno)**: data de finalização formatada em português (ex: `15 dez 2026`).
   - **Direita — linha 3 (pequeno)**: valor acumulado em cor de destaque (`primaryGold`) + objetivo em `textSecondary` (ex: `R$ 1.200,00 / R$ 5.000,00`).
4. WHEN `remainingMonths <= 0` (prazo vencido ou este mês) THEN o sistema SHALL usar `remainingMonths = 1` para o cálculo (evitar divisão por zero e mostrar valor de urgência).
5. WHEN `currentAmount >= targetAmount` THEN o sistema SHALL mostrar gauge em 100%, valor
   mensal `R$ 0,00/mês` e label "Meta atingida" no lugar da data.

**Cálculo de `remainingMonths`**:
```
const now = new Date()
const end = new Date(goal.finishAt)
const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth())
const remainingMonths = Math.max(1, months)
```

**Independent Test**: Com uma meta de R$ 5.000 / acumulado R$ 1.200 / prazo em 8 meses → gauge
mostra 24%, valor mensal exibe `R$ 475,00/mês`, data final formatada visível.

---

### P1: Componente `GaugeChart` ⭐ MVP

**User Story**: Como desenvolvedor, quero um componente `GaugeChart` altamente customizável
via props, para usar no card de metas e em futuras telas.

**Why P1**: O card de metas depende diretamente deste componente.

**Acceptance Criteria**:

1. WHEN `GaugeChart` é renderizado THEN o sistema SHALL exibir um arco de gauge usando
   ECharts `type: 'gauge'` (via `@wuba/react-native-echarts/svgChart`), respeitando as
   regras de padrão de import e inicialização em `components/charts/CLAUDE.md`.
2. WHEN a prop `value` é alterada THEN o sistema SHALL atualizar o arco sem re-inicializar
   o chart (usar `chart.setOption` com `notMerge: false`).
3. WHEN o tema muda THEN o sistema SHALL re-inicializar o chart (mesmo padrão do `DonutChart`).
4. WHEN `GaugeChart` é renderizado THEN o sistema SHALL aceitar e aplicar todas as props de
   customização definidas na interface `GaugeChartProps` (ver abaixo).

**Interface de props (`GaugeChartProps`)**:
```ts
interface GaugeChartProps {
  value: number;              // 0–100 (percentual)
  size?: number;              // largura e altura do chart (default: 100)
  arcColor?: string;          // cor do arco preenchido (default: primaryGold)
  trackColor?: string;        // cor do arco de fundo (default: disabled)
  arcWidth?: number;          // espessura do arco em % (default: 18)
  startAngle?: number;        // ângulo de início em graus (default: 225)
  endAngle?: number;          // ângulo de fim em graus (default: -45)
  showLabel?: boolean;        // exibe % no centro (default: true)
  labelColor?: string;        // cor do texto central (default: textPrimary)
  labelFontSize?: number;     // tamanho da fonte do % (default: 14)
  isLoading?: boolean;        // exibe Skeleton se true (default: false)
  borderRadius?: number;      // arredondamento das pontas do arco (default: 4)
}
```

**Independent Test**: Renderizar `<GaugeChart value={75} arcColor="#FFD700" size={80} />`
→ arco dourado aparece preenchido a ~75% do semicírculo.

---

### P1: Hook `useUpcomingGoals` ⭐ MVP

**User Story**: Como desenvolvedor, quero um hook dedicado que retorne metas ativas com
`finishAt` definido, ordenadas por `finishAt ASC`, para alimentar o card da home.

**Why P1**: Separar a query específica do `useGoals` genérico mantém responsabilidades
claras e permite otimizações futuras (ex: limitar a 5 metas).

**Acceptance Criteria**:

1. WHEN o hook é chamado THEN o sistema SHALL consultar `financial_goals` onde
   `status = 'active' AND finishAt IS NOT NULL`, ordenado por `finishAt ASC`, limitado a 2.
2. WHEN o hook é chamado THEN o sistema SHALL retornar `{ data: FinancialGoal[], loading: boolean, error: string | null, refetch: () => void }`.
3. WHEN não há metas ativas com prazo THEN o sistema SHALL retornar `data: []`.

**Arquivo**: `hooks/useUpcomingGoals.ts`

**Independent Test**: Com 3 metas ativas (duas com `finishAt`, uma sem) → hook retorna
apenas as 2 com prazo, na ordem crescente de `finishAt`.

---

### P1: Empty state da seção ⭐ MVP

**User Story**: Como usuário sem metas com prazo cadastradas, quero ver o card "Próximas
Metas" sempre presente na home, com um empty state que usa o ícone de metas, para saber que
a funcionalidade existe e que preciso cadastrar uma meta com prazo.

**Why P1**: O card deve estar sempre visível — sumir da tela causaria confusão sobre onde
está a seção de metas.

**Acceptance Criteria**:

1. WHEN `useUpcomingGoals` retorna `data: []` THEN o sistema SHALL renderizar o `InfoCard`
   "Próximas Metas" com empty state: ícone Feather `target` centralizado + texto "Nenhuma
   meta com prazo" + subtexto "Cadastre uma meta com data de finalização".
2. WHEN `loading = true` THEN o sistema SHALL exibir um `Skeleton` com altura equivalente
   ao card (seguindo padrão dos outros cards na home).

---

### P1: Navegação ao tocar na meta ⭐ MVP

**User Story**: Como usuário, quero tocar em uma meta do card e navegar para o detalhe dela.

**Why P1**: O card exibe dados resumidos — o toque é o caminho natural para ver o histórico
e gerenciar a meta.

**Acceptance Criteria**:

1. WHEN o usuário toca no item de uma meta THEN o sistema SHALL navegar para
   `/(stack)/goalDetail` com o `id` da meta como parâmetro.
2. WHEN o item é pressionado THEN o sistema SHALL aplicar animação de feedback (scale spring
   usando `SPRING_BOUNCE`) antes de navegar.

---

## Edge Cases

- WHEN `finishAt` é um timestamp Unix em milissegundos negativos ou inválido THEN o sistema SHALL tratar `remainingMonths = 1` e não crashar.
- WHEN `targetAmount = 0` THEN o sistema SHALL exibir gauge em 100% e `R$ 0,00/mês`.
- WHEN o device muda de tema enquanto o card está visível THEN o sistema SHALL re-renderizar o `GaugeChart` com as novas cores (via dependência de `theme` no effect de inicialização).
- WHEN `refetch` é chamado ao focar a home THEN o sistema SHALL incluir `refetchGoals` no `useFocusEffect` da home screen.
- WHEN a meta não tem `icon` ou `color` definidos THEN o sistema SHALL usar valores fallback (ícone `target`, cor `primaryGold`).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|----------------|-------|-------|--------|
| UCG-01 | P1: Card home — renderizar seção | Design | Pending |
| UCG-02 | P1: Card home — listar metas ordenadas | Design | Pending |
| UCG-03 | P1: Card home — layout gauge + info | Design | Pending |
| UCG-04 | P1: Card home — cálculo valor mensal | Design | Pending |
| UCG-05 | P1: Card home — edge meta atingida | Design | Pending |
| UCG-06 | P1: GaugeChart — renderização ECharts | Design | Pending |
| UCG-07 | P1: GaugeChart — props de customização | Design | Pending |
| UCG-08 | P1: GaugeChart — re-render no tema | Design | Pending |
| UCG-09 | P1: Hook useUpcomingGoals — query | Design | Pending |
| UCG-10 | P1: Hook useUpcomingGoals — retorno | Design | Pending |
| UCG-11 | P1: Empty state — card sempre visível com ícone `target` | Design | Pending |
| UCG-12 | P1: Loading skeleton | Design | Pending |
| UCG-13 | P1: Navegação + animação ao tocar | Design | Pending |

**Coverage:** 13 total, 0 mapeados em tasks, 13 unmapped ⚠️

---

## Success Criteria

- [ ] Usuário vê na home suas próximas metas com prazo sem precisar navegar para a tela de metas.
- [ ] `GaugeChart` é reutilizável: pode ser instanciado com cores, tamanhos e ângulos diferentes via props.
- [ ] A seção não aparece quando não há metas com prazo (home limpa).
- [ ] Sem crashes ao entrar na home com metas em estados-limite (meta atingida, prazo vencido, sem ícone/cor).
