import { cn } from '../../lib/cn.js'

/**
 * Tooltip canónico para Recharts — estilos `.chart-tooltip` del DS.
 * Uso: <Tooltip content={<ChartTooltip />} />
 *      <Tooltip content={<ChartTooltip valueFormatter={(v) => `${v} hrs`} />} />
 */
export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
  labelFormatter,
  className,
}) {
  if (!active || !payload?.length) return null

  const title =
    typeof labelFormatter === 'function' ? labelFormatter(label, payload) : label

  return (
    <div className={cn('chart-tooltip', 'is-visible', 'chart-tooltip--recharts', className)}>
      {title != null && title !== '' ? (
        <div className="chart-tooltip__label">{title}</div>
      ) : null}
      {payload.map((entry, i) => {
        const raw = entry.value
        const formatted =
          typeof valueFormatter === 'function'
            ? valueFormatter(raw, entry, i)
            : raw

        // Recharts usa dataKey ("value") como name si no hay seriesName
        const rawName = entry.name ?? entry.dataKey
        const seriesLabel =
          !rawName || rawName === 'value' ? 'Cantidad' : String(rawName)

        return (
          <div key={entry.dataKey ?? i} className="chart-tooltip__row">
            <span className="chart-tooltip__series" style={{ color: entry.color }}>
              {seriesLabel}
            </span>
            <span className="chart-tooltip__value">{formatted}</span>
          </div>
        )
      })}
    </div>
  )
}
