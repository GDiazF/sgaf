import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Legend,
} from 'recharts'
import { cn } from '../../lib/cn.js'
import {
  seriesColor,
  chartAxisTick,
  chartGridProps,
} from '../../lib/charts.js'
import { ChartTooltip } from './ChartTooltip.jsx'

/**
 * Barras Recharts temáticas (verticales u horizontales).
 *
 * layout="vertical" → barras horizontales (ranking / demanda)
 * layout="horizontal" → barras verticales (estados / promedios)
 */
export function ChartBar({
  data = [],
  dataKey = 'value',
  categoryKey = 'label',
  layout = 'horizontal',
  height = '100%',
  minHeight = 220,
  barSize = 16,
  radius,
  showGrid = true,
  showLegend = false,
  colorBy,
  seriesName = 'Cantidad',
  className,
  margin,
  yAxisWidth,
  valueFormatter,
  children,
}) {
  const isHorizontalBars = layout === 'vertical'
  const resolvedRadius =
    radius ??
    (isHorizontalBars
      ? [0, 3, 3, 0]
      : [3, 3, 0, 0])

  const defaultMargin = isHorizontalBars
    ? { top: 8, right: 12, left: 4, bottom: 4 }
    : { top: 8, right: 8, left: 0, bottom: 4 }

  return (
    <div
      className={cn('chart-recharts', className)}
      style={{ minHeight, height: typeof height === 'number' ? height : undefined }}
      data-component="ChartBar"
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout={layout} margin={margin ?? defaultMargin}>
          {showGrid ? (
            <CartesianGrid
              {...chartGridProps}
              vertical={!isHorizontalBars}
              horizontal
            />
          ) : null}

          {isHorizontalBars ? (
            <>
              <XAxis type="number" hide tick={chartAxisTick} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey={categoryKey}
                width={yAxisWidth ?? 120}
                tick={chartAxisTick}
                axisLine={false}
                tickLine={false}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey={categoryKey}
                tick={chartAxisTick}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} />
            </>
          )}

          <Tooltip
            cursor={{ fill: 'color-mix(in oklch, var(--chart-1) 6%, transparent)' }}
            content={<ChartTooltip valueFormatter={valueFormatter} />}
          />
          {showLegend ? <Legend wrapperStyle={{ fontSize: 11 }} /> : null}

          <Bar
            dataKey={dataKey}
            name={seriesName}
            fill={seriesColor(0)}
            radius={resolvedRadius}
            barSize={barSize}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry[categoryKey] ?? index}
                fill={
                  typeof colorBy === 'function'
                    ? colorBy(entry, index)
                    : seriesColor(index)
                }
              />
            ))}
          </Bar>
          {children}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
