# mimoV2 — Project State

## Active Features

| Feature | Status | Spec |
|---------|--------|------|
| `upcoming-goals-card` | ✅ Complete | `.specs/features/upcoming-goals-card/` |
| `goal-progress-sync` | 🔧 In Progress | `.specs/features/goal-progress-sync/` |
| `goal-date-period` | 🕳️ Empty (spec pendente) | `.specs/features/goal-date-period/` |

---

## Decisions

### 2026-06-14 — Goal progress sync: only_this scope prioritized

Decidido que o fix de sincronização de `currentAmount` nos scopes bulk (`all_related`, `from_this_forward`) é deferred (GPS-05) por complexidade. O caso principal (toggle individual via swipe + criação + edição `only_this`) cobre ~95% dos usos reais.

---

## Known Bugs / Blockers

- **GPS (goal-progress-sync)**: `financial_goals.currentAmount` não é atualizado ao pagar/desmarcar/criar transações vinculadas a metas. Fix especificado em `.specs/features/goal-progress-sync/`.

---

## Deferred Ideas

- **GPS-05**: Sync de `currentAmount` em edições bulk de grupo (`all_related` / `from_this_forward`) com mudança de status — requer calcular delta entre transações paid/pending no grupo
- **goal-date-period**: Spec ainda não criada para a funcionalidade de período de meta (pasta existe mas vazia)
- **Reconciliation script**: Utilitário para recalcular `currentAmount` de todas as metas com base nas transações pagas existentes (útil para corrigir dados históricos após o fix)

---

## Preferences

- Evitar resumos de "o que foi feito" ao final de respostas — o usuário prefere direto ao ponto
