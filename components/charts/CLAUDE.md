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
