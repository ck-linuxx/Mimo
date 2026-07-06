# Subscription Annual Projection — Specification

**Scope**: Pequeno — 1 arquivo, sem migração, sem novo hook.

---

## Current State (já implementado — não alterar)

| Item | Estado |
|------|--------|
| Coluna `isSubscription` em `transactions` | ✅ Pronto |
| Toggle "É uma assinatura" em `addTransaction` / `editTransaction` (somente recorrentes) | ✅ Pronto — mantido |
| Seção "Assinaturas" em `reports.tsx` com DonutChart + lista paginada | ✅ Pronto |
| `useReportsSubscriptionCategoryTotals` + `useReportsSubscriptionTransactionsPaginated` | ✅ Pronto |

---

## Problem Statement

O usuário já consegue marcar transações recorrentes como assinatura e ver a distribuição mensal por categoria nos Relatórios. Porém, não há uma visão de impacto anual — o usuário não sabe quanto gastará no total ao longo do ano com assinaturas.

## Goals

- [ ] Abaixo da seção "Assinaturas" em Relatórios, exibir a projeção de gasto anual com assinaturas no formato: `total_do_mês × 12`.

## Out of Scope

| Feature | Motivo |
|---------|--------|
| Expandir toggle para despesas avulsas/parceladas | Decisão do usuário: manter somente em recorrentes |
| Projeção baseada em lançamentos futuros reais | Complexidade desnecessária; multiplicação × 12 é suficiente |
| Histórico de projeções por mês | Fora do escopo desta feature |

---

## User Story

### P1: Projeção anual na seção de Assinaturas ⭐ MVP

**User Story**: Como usuário, quero ver logo abaixo do gráfico de assinaturas o valor estimado que gastarei no ano inteiro com assinaturas, para ter consciência do impacto financeiro anual.

**Why P1**: Única entrega desta feature — sem ela não há valor gerado.

**Acceptance Criteria**:

1. WHEN há pelo menos uma assinatura (não cancelada) no mês selecionado THEN o sistema SHALL exibir um bloco de projeção abaixo do `ChartListCard` de Assinaturas com o texto: `"Projeção anual: R$ X.XX"` calculado como `soma de subscriptionCategoryTotals × 12`.
2. WHEN não há assinaturas no mês THEN o sistema SHALL NOT exibir o bloco de projeção.
3. WHEN o usuário navega para outro mês THEN a projeção SHALL atualizar automaticamente (derivada do mesmo estado já reativo).
4. WHEN a tela está no primeiro carregamento (skeleton) THEN o bloco de projeção SHALL NOT aparecer enquanto `isSubscriptionFirstLoad` for `true`.

**Independent Test**: Criar 2 transações recorrentes com `isSubscription=true` e valores R$ 29,90 e R$ 19,90 no mês atual → abrir Relatórios → rolar até a seção "Assinaturas" → verificar texto "Projeção anual: R$ 597,60".

---

## Design

### Cálculo

```ts
// Derivado de subscriptionCategoryTotals — sem novo hook
const monthlySubscriptionTotal = useMemo(
  () => subscriptionCategoryTotals.reduce((sum, item) => sum + item.value, 0),
  [subscriptionCategoryTotals],
);
const annualProjection = monthlySubscriptionTotal * 12;
```

### UI

Bloco simples abaixo do `ChartListCard` de Assinaturas, visível apenas quando `monthlySubscriptionTotal > 0` e `!isSubscriptionFirstLoad`:

```tsx
{!isSubscriptionFirstLoad && monthlySubscriptionTotal > 0 && (
  <View style={{ /* card simples */ }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Feather name="calendar" size={14} color={colors.textSecondary} />
      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
        Projeção anual
      </Text>
    </View>
    <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>
      {formatCurrency(annualProjection)}
    </Text>
    <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
      Estimativa baseada no total de assinaturas de {MONTHS_PT[selectedMonth]}
    </Text>
  </View>
)}
```

**Estilo do bloco**: mesma `cardBackground + borderColor + borderRadius: 14 + padding: 14` dos outros cards da tela.

---

## Requirement Traceability

| Req ID | Story | Arquivo | Status |
|--------|-------|---------|--------|
| SAP-01 | P1: Cálculo `monthlySubscriptionTotal` e `annualProjection` | `app/(tabs)/reports.tsx` | ✅ Done |
| SAP-02 | P1: Renderização condicional do bloco de projeção | `app/(tabs)/reports.tsx` | ✅ Done |

**Coverage:** 2 total, 2 implementados ✅

---

## Success Criteria

- [x] Projeção aparece abaixo da seção "Assinaturas" quando `monthlySubscriptionTotal > 0`.
- [x] Projeção não aparece quando não há assinaturas no mês.
- [x] Troca de mês atualiza a projeção sem nenhuma ação adicional.
- [x] `bunx tsc --noEmit` passa sem erros.
