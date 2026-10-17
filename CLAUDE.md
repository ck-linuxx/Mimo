# mimoV2 — Índice de Documentação

## Instruções para agentes IA

> **Gerenciador de pacotes:** Sempre use **bun** para instalar dependências ou executar scripts (`bun add`, `bun remove`, `bun run`, etc.). Nunca use npm, yarn ou pnpm.

> **Carregamento on-demand:** Antes de iniciar qualquer tarefa, identifique o domínio relevante na tabela abaixo e leia **apenas** o `CLAUDE.md` correspondente. Ignore os demais para economizar contexto.

> **Manutenção:** Após implementar qualquer nova funcionalidade em uma pasta nova, crie o `CLAUDE.md` dentro dela documentando o módulo e adicione uma linha na tabela abaixo com o caminho e uma descrição de uma linha.

> **Animações obrigatórias:** Todo componente interativo deve ter animação. Usar `react-native-reanimated` (`withSpring` / `withTiming`) — nunca `Animated` do React Native core. Usar sempre as constantes de spring definidas no arquivo (`SPRING_BOUNCE`, `SPRING_SLIDE`, `SPRING_MODAL`) — nunca passar literais `{ damping, stiffness }` diretamente em `withSpring()`. Ver valores, exemplos e proibições em [components/CLAUDE.md](components/CLAUDE.md).

> **Refetch obrigatório ao retornar para telas com dados dinâmicos:** Toda tela de tab ou listagem que exibe dados mutáveis (contas, cartões, metas, relatórios, transações) **deve** chamar `refetch()` de todos os seus hooks de query no momento em que a tela recebe foco, usando `useFocusEffect` + `useCallback` de `@react-navigation/native`. Isso evita dados stale quando o usuário retorna de telas de criação/edição. Exceção: telas exclusivamente estáticas ou onde nenhuma mutação de dados é possível nos fluxos de navegação que levam a elas.
>
> ```tsx
> import { useFocusEffect } from '@react-navigation/native';
>
> useFocusEffect(
>   useCallback(() => {
>     refetchA();
>     refetchB();
>   }, [refetchA, refetchB]),
> );
> ```

> **Confirmação obrigatória em botões de ação:** Cada botão de ação sobre transações (ex.: Importar, Ocultar/Ignorar, Desfazer, Vincular, Aplicar atualização do banco e Ações em lote) **deve** possuir um modal de confirmação explícito usando `useCustomAlert.showConfirm()`, descrevendo a ação e apresentando os dados chave da transação (descrição, conta/cartão, data e valor) antes de persistir qualquer alteração.

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
| `utils/` | [utils/CLAUDE.md](utils/CLAUDE.md) | Funções utilitárias puras (`formatCurrency`, `useCurrencyInput`, labels, frequências) |
| `hooks/` | [hooks/CLAUDE.md](hooks/CLAUDE.md) | Hooks de query SQLite dedicados por entidade + `useCustomAlert` |
| `components/` | [components/CLAUDE.md](components/CLAUDE.md) | Componentes React Native com regras de theming via `themes/colors.ts` |
| `components/bank/` | [components/bank/CLAUDE.md](components/bank/CLAUDE.md) | Lista de bancos (BrasilAPI), logos embutidas e seletor usado em contas e cartões |
| `components/pluggy/` | [components/pluggy/CLAUDE.md](components/pluggy/CLAUDE.md) | Modais e componentes da integração Pluggy (BankMappingModal, ImportEditModal, InboxFilters, InboxItem) |
| `components/charts/` | [components/charts/CLAUDE.md](components/charts/CLAUDE.md) | Gráficos interativos via @wuba/react-native-echarts + react-native-svg (DonutChart) |
| `components/reports/` | [components/reports/CLAUDE.md](components/reports/CLAUDE.md) | Cards compactos de relatório que agregam chart + seleção + listagem paginada |
| `services/pluggy/` | [services/pluggy/CLAUDE.md](services/pluggy/CLAUDE.md) | Integração Open Finance com a Pluggy (auth, cursor sync `/v2/transactions`, staging inbox, matching, notificações) |
| `app/(stack)/` | [app/(stack)/CLAUDE.md](app/(stack)/CLAUDE.md) | Telas em stack — fluxo dedicado de metas (`goalsManage`/`goalDetail`/`goalEdit`) e integração Pluggy (`pluggySettings`/`pluggyInbox`) |

