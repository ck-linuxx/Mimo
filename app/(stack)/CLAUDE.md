# app/(stack)/ — Telas de Navegação em Stack

Telas empilhadas (push/back) da aplicação. Todas usam `animation: 'slide_from_right'` configurado no `_layout.tsx`.

## Fluxo de Metas — dois contextos separados

### Gerenciamento (entrada via Settings)

| Tela | Arquivo | Responsabilidade |
|------|---------|-----------------|
| Lista de metas | `goalsManage.tsx` | FlatList com tabs `Em andamento` / `Concluídas`, ações de editar e cancelar |
| Detalhe da meta | `goalDetail.tsx` | Dados completos, barra de progresso, ações de concluir/cancelar/editar |
| Edição da meta | `goalEdit.tsx` | Formulário com todos os campos editáveis, atualização via Drizzle |
| Criação de meta | `goalCreate.tsx` | Formulário de criação; acessível via `goalsManage` e via `goalSelect` |

**Navegação:**
```
settings.tsx → /goalsManage
goalsManage  → /goalDetail?id=<id>
goalsManage  → /goalEdit?id=<id>
goalsManage  → /goalCreate
goalDetail   → /goalEdit?id=<id>
goalDetail   → back (após cancelar/concluir)
goalEdit     → back (após salvar)
```

### Seleção em Transações (entrada via addTransaction)

| Tela | Arquivo | Responsabilidade |
|------|---------|-----------------|
| Seleção de meta | `goalSelect.tsx` | EntitySelector com `selectionStore` callback — exclusivo para vincular meta a transação |
| Criação de meta | `goalCreate.tsx` | Criação contextual dentro do fluxo de seleção; `router.dismiss(2)` retorna a `addTransaction` |

**Navegação:**
```
addTransaction → /goalSelect (com setSelectionCallback)
goalSelect     → /goalCreate (se nenhuma meta atende)
goalCreate     → dismiss(2) → addTransaction (com callback disparado)
```

> **NUNCA** usar `goalSelect` como ponto de entrada de gerenciamento — ela assume que um `selectionStore` callback foi registrado. Use `goalsManage` para gerenciamento.

## Tabs de Status em `goalsManage`

```
Em andamento  →  GoalStatusEnum.Active
Concluídas    →  GoalStatusEnum.Completed
```

Metas com `status = cancelled` **não aparecem** em nenhuma das duas tabs.

## Cancelamento vs Conclusão

| Ação | Status resultante | Reversível |
|------|-------------------|-----------|
| Cancelar meta | `cancelled` | Não |
| Concluir meta | `completed` | Não (via UI atual) |
| Editar meta com currentAmount ≥ targetAmount | `completed` automático | — |

## Convenções

- Spring constants definidas no topo de cada arquivo: `SPRING_BOUNCE` e `SPRING_MODAL`
- Nunca passar literais `{ damping, stiffness }` diretamente em `withSpring()`
- Alertas sempre via `useCustomAlert` + `<CustomAlert />` — nunca `Alert` do RN
- Cancelamento lógico (`status = cancelled`) — nunca `DELETE` físico em metas
- Theming via classes NativeWind; `style={{}}` apenas para cores dinâmicas (cor da meta, ícones)

---

## Fluxo Pluggy (Open Finance)

| Tela | Arquivo | Responsabilidade |
|------|---------|------------------|
| Configurações Pluggy | `pluggySettings.tsx` | Credenciais (`CLIENT_ID`, `CLIENT_SECRET`, `Item IDs` no `SecureStore`), janela de importação (`30`/`60`/`90` dias), toggle de sync automático, mapeamento de contas/cartões locais, sincronização manual e desconexão preservando staging |
| Caixa de entrada (Banco) | `pluggyInbox.tsx` | Controle e curadoria das transações em staging (`pluggy_transactions`): importar direto, editar antes de importar, vincular a transação manual existente, ignorar, desfazer e ações em lote |

