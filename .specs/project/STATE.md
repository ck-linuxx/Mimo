# mimoV2 — Project State

## Active Features

| Feature | Status | Spec |
|---------|--------|------|
| `upcoming-goals-card` | ✅ Complete | `.specs/features/upcoming-goals-card/` |
| `goal-progress-sync` | 🔧 In Progress | `.specs/features/goal-progress-sync/` |
| `goal-date-period` | 🕳️ Empty (spec pendente) | `.specs/features/goal-date-period/` |
| `import-data` | ✅ Complete (P1) | `.specs/features/import-data/` |
| `export-data` | ✅ Complete (P1) | `.specs/features/export-data/` |
| `import-from-backup` | ✅ Complete | `.specs/features/import-from-backup/` |
| `transfers-screen` | 🕳️ Ideia (spec pendente) | — |

---

## Decisions

### 2026-06-16 — Import data: decisões de design travadas

Importação de extratos OFX/CSV (`import-data`). Decididos via discuss: (1) **dedupe** — adicionar coluna `externalId` em `transactions`, pular duplicatas (FITID no OFX, heurística data+valor+descrição no CSV); (2) **categorias** — auto por palavra-chave + editável, sem match = null; (3) **saldo** — importar como `paid`, conta nova com `balance=0` (saldo é calculado via `useAccountBalance`, não armazenado); (4) **revisão** — edição completa por item (descrição/valor/tipo/categoria/data) + excluir. Escopo: só contas (não cartões); lançamentos tratados por sinal (transferências reais out of scope).

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
- **transfers-screen**: Tela em stack acessível via Configurações que lista movimentações do tipo transferência (Pix enviado/recebido, Aplicação, Resgate, Estorno) — tanto de importações quanto criadas manualmente. Filtra transações pela categoria ou pela presença de `externalId`.

---

## Preferences

- Evitar resumos de "o que foi feito" ao final de respostas — o usuário prefere direto ao ponto
