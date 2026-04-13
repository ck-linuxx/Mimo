# mimoV2 — Índice de Documentação

## Instruções para agentes IA

> **Gerenciador de pacotes:** Sempre use **bun** para instalar dependências ou executar scripts (`bun add`, `bun remove`, `bun run`, etc.). Nunca use npm, yarn ou pnpm.

> **Carregamento on-demand:** Antes de iniciar qualquer tarefa, identifique o domínio relevante na tabela abaixo e leia **apenas** o `CLAUDE.md` correspondente. Ignore os demais para economizar contexto.

> **Manutenção:** Após implementar qualquer nova funcionalidade em uma pasta nova, crie o `CLAUDE.md` dentro dela documentando o módulo e adicione uma linha na tabela abaixo com o caminho e uma descrição de uma linha.

> **Animações obrigatórias:** Todo componente interativo deve ter animação. Usar `react-native-reanimated` (`withSpring` / `withTiming`) — nunca `Animated` do React Native core. Seleção de itens usa bounce (`damping: 6–8, stiffness: 400, mass: 0.6`); indicadores deslizantes usam spring rápido (`damping: 18–20, stiffness: 400–500`); modais usam scale + opacity combinados. Ver regras completas em [components/CLAUDE.md](components/CLAUDE.md).

## Convenção

Toda pasta de funcionalidade **deve** conter um `CLAUDE.md` próprio descrevendo:
- O que o módulo faz
- Principais arquivos e responsabilidades
- Convenções e decisões de design relevantes

---

## Mapa de Módulos

| Módulo | Documentação | Descrição |
|--------|-------------|-----------|
| `db/` | [db/CLAUDE.md](db/CLAUDE.md) | Schema financeiro — Drizzle ORM + SQLite local (contas, cartões, transações, metas) |
| `themes/` | [themes/CLAUDE.md](themes/CLAUDE.md) | Paleta de cores dark/light + hook `useTheme` com persistência via SQLite (tabela `settings`) |
| `types/` | [types/index.ts](types/index.ts) | Enums TypeScript e re-exportação dos tipos inferidos do Drizzle — um arquivo por tabela |
| `utils/` | [utils/CLAUDE.md](utils/CLAUDE.md) | Hooks utilitários reutilizáveis (`useCurrencyInput`) |
| `hooks/` | [hooks/CLAUDE.md](hooks/CLAUDE.md) | Hooks de query SQLite dedicados por entidade + `useCustomAlert` |
| `components/` | [components/CLAUDE.md](components/CLAUDE.md) | Componentes React Native com regras de theming via `themes/colors.ts` |
