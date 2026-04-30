# components/charts/ — Componentes de Gráficos

Componentes de visualização de dados baseados em [Apache ECharts](https://echarts.apache.org/) via `@wuba/react-native-echarts`.

## Dependências

| Pacote | Versão | Função |
|--------|--------|--------|
| `@wuba/react-native-echarts` | `^3.x` | Adapter RN para ECharts |
| `echarts` | `^6.x` | Motor de gráficos (Apache ECharts) |
| `react-native-svg` | `^15.x` | Renderer SVG (necessita rebuild nativo) |

## Padrão de import

Usar sempre o subpath `/svgChart` para tree-shaking correto:

```tsx
import SvgChart, { SVGRenderer } from '@wuba/react-native-echarts/svgChart';
import * as echarts from 'echarts/core';
import { PieChart } from 'echarts/charts';
import { LegendComponent, TooltipComponent } from 'echarts/components';

// Registrar UMA VEZ no nível do módulo (fora do componente)
echarts.use([SVGRenderer, PieChart, LegendComponent, TooltipComponent]);
```

## Regras de Theming

Todo componente de gráfico **deve** reagir ao tema dark/light:

1. **Container exterior** → NativeWind tokens: `bg-light-card-background dark:bg-dark-card-background`
2. **Internamente** → usar `useTheme()` + `darkColors`/`lightColors` para configurar as propriedades do ECharts que não são acessíveis via className:
   - `tooltip.backgroundColor` → `colors.cardBackground`
   - `tooltip.borderColor` → `colors.borderColor`
   - `tooltip.textStyle.color` → `colors.textPrimary`
   - `legend.textStyle.color` → `colors.textSecondary`
   - `series[].itemStyle.borderColor` → `colors.background`
3. **`theme`** deve ser dependência do `useCallback`/`useEffect` que constrói a option — quando o tema muda, o gráfico é re-inicializado automaticamente
4. **Empty state / loading** → NativeWind tokens para textos, `useTheme()` + `colors` para ícones Feather

## Padrão de inicialização

```tsx
const chartRef = useRef<any>(null);
const [containerWidth, setContainerWidth] = useState(0);

// Usa onLayout para obter a largura real do container
// → inicializa o chart com dimensões precisas

useEffect(() => {
  if (!chartRef.current || containerWidth === 0) return;

  const chart = echarts.init(chartRef.current, 'light', {
    renderer: 'svg',
    width: containerWidth,
    height,
  });
  chart.setOption(buildOption());

  return () => chart.dispose(); // sempre limpar no unmount
}, [buildOption, containerWidth, height]);

return (
  <View
    style={{ height }}
    onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
  >
    <SvgChart ref={chartRef} />
  </View>
);
```

> **Atenção**: Passar `'light'` como segundo argumento do `echarts.init()` — confiar apenas no tema nativo ECharts geraria conflito com o sistema de temas do app. As cores customizadas via `option` sempre sobrepõem o tema do ECharts.

## Componentes disponíveis

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `DonutChart` | `DonutChart.tsx` | Gráfico de rosca (donut) para distribuição proporcional de categorias |
| `SmoothLineChart` | `SmoothLineChart.tsx` | Gráfico de linhas suaves com múltiplas séries (1-N) e legenda obrigatória |
| `BarChart` | `BarChart.tsx` | Gráfico de barras agrupadas (gastos mensais) com tick-align e paleta interna |

### `BarChart` — Detalhes de uso

**Props:**
```ts
interface BarChartProps {
  series: BarChartSeries[];   // [{ name, data: number[], color? }]
  xAxisLabels: string[];       // ex: ['Jan', 'Fev', ...]
  height?: number;             // default 260
  isLoading?: boolean;
  emptyText?: string;
}
```

**Convenções:**
- Registra módulos no nível do módulo: `echarts.use([SVGRenderer, EBarChart, GridComponent, TooltipComponent])`
- Usa `chartInstanceRef` para evitar dispose em mudança de tema (padrão DonutChart)
- `barMaxWidth: 28`, `borderRadius: [4,4,0,0]`, `axisTick: { alignWithLabel: true }`
- Paleta interna `SERIES_PALETTE` usada como fallback quando `color` não é informado
- Tooltip formata valores com `formatCurrency`
- Empty state: ícone Feather `bar-chart-2` + emptyText

### `DonutChart` — Props

| Prop | Tipo | Default | Descrição |
|------|------|---------|-----------|
| `data` | `DonutChartDataItem[]` | — | Array de items `{ name, value, color? }` |
| `height` | `number` | `280` | Altura em dp do gráfico |
| `innerRadius` | `string` | `'40%'` | Raio interno (furo da rosca) |
| `outerRadius` | `string` | `'70%'` | Raio externo |
| `showLegend` | `boolean` | `true` | Exibe legenda inferior |
| `isLoading` | `boolean` | `false` | Mostra Loading enquanto true |
| `emptyText` | `string` | `'Nenhum dado disponível'` | Texto do empty state |

### Geração de cores dinâmica

Quando `item.color` é `null` ou `undefined`, o componente atribui automaticamente uma cor da paleta `GENERATED_COLORS` (10 cores distintas predefinidas). Esta paleta está definida em `DonutChart.tsx` e pode ser estendida se necessário.

---

### `SmoothLineChart` — Props

| Prop | Tipo | Default | Descrição |
|------|------|---------|-----------|
| `series` | `SmoothLineChartSeries[]` | — | Array de séries `{ name, data, color? }` — suporta 1 a N séries |
| `xAxisLabels` | `string[]` | — | Labels do eixo X (ex: `['1','2',...,'31']`) |
| `height` | `number` | `240` | Altura em dp |
| `isLoading` | `boolean` | `false` | Exibe skeleton enquanto true |
| `emptyText` | `string` | `'Nenhum dado disponível'` | Texto do empty state |

**Regras do `SmoothLineChart`:**
- A legenda é **sempre exibida** — obrigatória conforme design do app.
- `series[].color` é opcional; cores são atribuídas automaticamente da paleta `SERIES_PALETTE` quando omitidas.
- Linhas são smooth (bezier) com área preenchida semi-transparente abaixo.
- Tooltip mostra todos os valores formatados com `formatCurrency` ao tocar um ponto do eixo X.
- Registrar `LineChart` junto com os demais módulos ECharts no nível do arquivo (fora do componente).
