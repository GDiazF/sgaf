/** Chart color tokens for Recharts / SVG consumers */
export const chartColors = {
  series: [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
    'var(--chart-6)',
    'var(--chart-7)',
    'var(--chart-8)',
  ],
  axis: 'var(--chart-axis)',
  grid: 'var(--chart-grid)',
  label: 'var(--chart-label)',
  positive: 'var(--chart-positive)',
  negative: 'var(--chart-negative)',
  neutral: 'var(--chart-neutral)',
  areaFill: 'var(--chart-area-fill)',
  surface: 'var(--chart-surface)',
}

/** Índice de serie → token CSS (`var(--chart-N)`). */
export function seriesColor(index = 0) {
  const list = chartColors.series
  return list[Math.abs(index) % list.length]
}

/**
 * Colores semánticos de prioridad (tickets / alertas).
 * Usa tokens analíticos del sistema, no hex sueltos.
 */
export function prioritySeriesColor(label = '') {
  const key = String(label).toUpperCase()
  if (key === 'CRITICA' || key === 'CRÍTICA') return 'var(--chart-7)'
  if (key === 'ALTA') return 'var(--chart-6)'
  if (key === 'MEDIA') return 'var(--chart-1)'
  if (key === 'BAJA') return 'var(--chart-3)'
  return 'var(--chart-neutral)'
}

export function deriveColorTokens(hex) {
  return {
    color: hex,
    pending: hex,
    onFill: '#ffffff',
    pendingOnFill: '#1a1a1a',
    pendingBorder: hex,
  }
}

/** Props tipográficas / eje compartidas para Recharts */
export const chartAxisTick = {
  fill: 'var(--chart-label)',
  fontSize: 10,
  fontFamily: 'var(--font-body)',
}

export const chartGridProps = {
  stroke: 'var(--chart-grid)',
  strokeDasharray: '3 3',
}
