import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { cn } from '../../lib/cn.js'
import {
  chartAxisTick,
  chartGridProps,
} from '../../lib/charts.js'
import { ChartTooltip } from './ChartTooltip.jsx'

let gradientUid = 0

/**
 * Área / tendencia Recharts con tokens institucionales.
 */
export function ChartArea({
  data = [],
  dataKey = 'value',
  categoryKey = 'day',
  height = '100%',
  minHeight = 220,
  showGrid = true,
  showLegend = false,
  seriesName,
  stroke = 'var(--chart-1)',
  fill = 'gradient',
  className,
  margin = { top: 8, right: 12, left: 0, bottom: 4 },
  valueFormatter,
  children,
}) {
  const gradientId = `chart-area-fill-${++gradientUid}`

  return (
    <div
      className={cn('chart-recharts', className)}
      style={{ minHeight, height: typeof height === 'number' ? height : undefined }}
      data-component="ChartArea"
    >
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={margin}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={stroke} stopOpacity={0.22} />
              <stop offset="95%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          {showGrid ? (
            <CartesianGrid {...chartGridProps} vertical={false} />
          ) : null}
          <XAxis
            dataKey={categoryKey}
            tick={chartAxisTick}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} />
          {showLegend ? <Legend wrapperStyle={{ fontSize: 11 }} /> : null}
          <Area
            type="monotone"
            dataKey={dataKey}
            name={seriesName}
            stroke={stroke}
            strokeWidth={2.4}
            fillOpacity={1}
            fill={fill === 'gradient' ? `url(#${gradientId})` : fill}
          />
          {children}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
