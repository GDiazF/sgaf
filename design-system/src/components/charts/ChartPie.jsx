import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'
import { cn } from '../../lib/cn.js'
import { seriesColor } from '../../lib/charts.js'
import { ChartTooltip } from './ChartTooltip.jsx'

/**
 * Pie / Donut Recharts temático.
 * donut=true → anillo (innerRadius por defecto 50).
 */
export function ChartPie({
  data = [],
  dataKey = 'value',
  nameKey = 'label',
  height = '100%',
  minHeight = 220,
  donut = false,
  innerRadius,
  outerRadius = 80,
  paddingAngle = 2,
  showLegend = false,
  showLabel = false,
  label,
  colorBy,
  className,
  valueFormatter,
  children,
}) {
  const resolvedInner =
    innerRadius ?? (donut ? 50 : 0)

  const defaultLabel =
    typeof label === 'function'
      ? label
      : showLabel
        ? ({ name, percent }) => {
            const n = String(name || '')
            const short = n.length > 10 ? `${n.slice(0, 10)}…` : n
            return `${short} ${(percent * 100).toFixed(0)}%`
          }
        : false

  return (
    <div
      className={cn('chart-recharts', className)}
      style={{ minHeight, height: typeof height === 'number' ? height : undefined }}
      data-component="ChartPie"
    >
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey={dataKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            innerRadius={resolvedInner}
            outerRadius={outerRadius}
            paddingAngle={paddingAngle}
            label={defaultLabel}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry[nameKey] ?? index}
                fill={
                  typeof colorBy === 'function'
                    ? colorBy(entry, index)
                    : seriesColor(index)
                }
              />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} />
          {showLegend ? <Legend wrapperStyle={{ fontSize: 11 }} /> : null}
          {children}
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
