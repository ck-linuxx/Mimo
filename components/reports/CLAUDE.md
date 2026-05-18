# components/reports/ — Cards Compostos de Relatórios

Submódulo de componentes voltado para seções compactas de relatórios, unificando gráfico + filtro/seleção + listagem paginada no mesmo card.

## Objetivo

Fornecer componentes de layout e interação para reduzir duplicação na tela de relatórios, mantendo consistência visual e de navegação entre seções.

## Arquivos principais

- `ChartListCard.tsx`
  - Container compacto de seção de relatório
  - Exibe um gráfico (recebido por prop), seletor horizontal de itens e lista paginada de transações
  - Inclui footer de paginação e seletor de tamanho de página

## Convenções

- Seguir theming via `useTheme()` com `darkColors/lightColors`
- Para interações (chips, troca de página), usar `react-native-reanimated`
- Não usar `PaginatedList` diretamente no `reports.tsx` quando a intenção for card compacto com chart integrado; usar `ChartListCard`
- Manter paginação DB-level nos hooks de origem dos dados (sem `slice` no front)
