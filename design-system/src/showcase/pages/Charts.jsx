import { useCallback, useRef, useState } from 'react'
import { ShowcaseHero, ShowcaseBlock } from '../ShowcaseHero.jsx'
import { ChartCard } from '../../components/ui/ChartCard.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Select } from '../../components/ui/Field.jsx'
import { ChartBar, ChartArea, ChartPie } from '../../components/charts/index.js'
import { seriesColor, prioritySeriesColor } from '../../lib/charts.js'

const CHART_SWATCHES = [
  { token: '--chart-1', label: 'celeste' },
  { token: '--chart-2', label: 'azul' },
  { token: '--chart-3', label: 'pastel' },
  { token: '--chart-4', label: 'índigo soporte' },
  { token: '--chart-5', label: 'verde analítico' },
  { token: '--chart-6', label: 'amarillo analítico' },
  { token: '--chart-7', label: 'rojo analítico' },
  { token: '--chart-8', label: 'rosado analítico' },
]

const RULES_ROWS = [
  ['KPI + tendencia', 'Resumen ejecutivo, métricas diarias', 'Inventar % sin fuente'],
  ['Línea / área', 'Evolución temporal (tickets, reservas)', 'Más de 3 series'],
  ['Barras V/H', 'Comparación por categoría', 'Orden arbitrario sin criterio'],
  ['Apiladas', 'Composición de total (estados OC)', 'Más de 4 segmentos'],
  ['Donut', 'Proporción de 2–4 partes del total', 'Más de 5 categorías → usar barras'],
  ['Tabla + gráfico', 'Detalle + resumen visual', 'Duplicar mismos datos sin valor'],
  ['Timeline', 'Actividad reciente, auditoría', 'Eventos sin timestamp'],
  ['Heatmap', 'Ocupación salas, uso por día/hora', 'Decoración sin escala legible'],
]

const COMPARE_ROWS = [
  [
    'Paleta series',
    'Series muy próximas entre sí',
    'Base institucional + acentos controlados (verde/amarillo/rojo/rosado)',
  ],
  [
    'Relleno área',
    'Soporte visual débil',
    'Soporte claro con mayor separación de la línea principal',
  ],
  [
    'Grid / ejes',
    'Demasiado tenue para lectura rápida',
    'Más definido, sin robar protagonismo a los datos',
  ],
  [
    'Tooltip',
    'Poco contraste en foco de dato',
    'Borde y sombra suficientes para lectura inmediata',
  ],
  [
    'Peso de series',
    'Líneas y barras livianas',
    'Línea principal y barras prioritarias con mayor presencia',
  ],
  [
    'Diferenciación visual',
    'Componentes muy parecidos entre sí',
    'Cada tipo de chart tiene tensión y jerarquía propias',
  ],
]

function HBar({ label, width, value, animate }) {
  return (
    <div className="chart-bars-h__row">
      <span className="chart-bars-h__label">{label}</span>
      <div className="chart-bars-h__track">
        <div
          className="chart-bars-h__fill"
          data-width={animate ? width : undefined}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="chart-bars-h__value">{value}</span>
    </div>
  )
}

function TrendIcon({ direction }) {
  if (direction === 'down') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M7 14l5-5 5 5" />
      </svg>
    )
  }
  if (direction === 'up') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M7 10l5 5 5-5" />
      </svg>
    )
  }
  return null
}

function InteractiveLineChart() {
  const wrapRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)

  const onEnter = useCallback((e, label, value) => {
    const wrap = wrapRef.current
    if (!wrap) return
    const rect = wrap.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top - 12
    setTooltip({ label, value, x, y, activeCx: Number(e.currentTarget.getAttribute('cx')) })
  }, [])

  const onMove = useCallback((e) => {
    const wrap = wrapRef.current
    if (!wrap) return
    setTooltip((prev) => {
      if (!prev) return prev
      const rect = wrap.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top - 12
      return { ...prev, x, y }
    })
  }, [])

  const onLeave = useCallback(() => setTooltip(null), [])

  return (
    <div ref={wrapRef} data-chart-interactive style={{ position: 'relative' }}>
      <svg
        className="chart-svg"
        viewBox="0 0 400 160"
        role="img"
        aria-label="Gráfico de línea: solicitudes por semana"
      >
        <g className="chart-svg__grid">
          <line x1="40" y1="20" x2="380" y2="20" />
          <line x1="40" y1="60" x2="380" y2="60" />
          <line x1="40" y1="100" x2="380" y2="100" />
          <line x1="40" y1="140" x2="380" y2="140" />
        </g>
        <path
          className="chart-svg__area"
          d="M40,120 L90,100 L140,110 L190,70 L240,85 L290,50 L340,65 L380,40 L380,140 L40,140 Z"
        />
        <polyline
          className="chart-svg__line"
          points="40,120 90,100 140,110 190,70 240,85 290,50 340,65 380,40"
        />
        <circle
          className={`chart-svg__dot${tooltip?.activeCx === 190 ? ' is-active' : ''}`}
          cx="190"
          cy="70"
          r="4"
          data-chart-point
          data-label="Sem 4"
          data-value="42 solicitudes"
          onMouseEnter={(e) => onEnter(e, 'Sem 4', '42 solicitudes')}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
        />
        <circle
          className={`chart-svg__dot${tooltip?.activeCx === 290 ? ' is-active' : ''}`}
          cx="290"
          cy="50"
          r="4"
          data-chart-point
          data-label="Sem 6"
          data-value="58 solicitudes"
          onMouseEnter={(e) => onEnter(e, 'Sem 6', '58 solicitudes')}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
        />
        <g className="chart-svg__axis">
          <text x="40" y="155">
            S1
          </text>
          <text x="140" y="155">
            S3
          </text>
          <text x="240" y="155">
            S5
          </text>
          <text x="340" y="155">
            S7
          </text>
        </g>
      </svg>
      <div
        className={`chart-tooltip${tooltip ? ' is-visible' : ''}`}
        role="tooltip"
        style={
          tooltip
            ? {
                left: Math.min(Math.max(tooltip.x, 8), 320),
                top: Math.max(tooltip.y - 48, 8),
              }
            : undefined
        }
      >
        {tooltip ? (
          <>
            <div className="chart-tooltip__label">{tooltip.label}</div>
            <div className="chart-tooltip__value">{tooltip.value}</div>
          </>
        ) : null}
      </div>
      <div className="chart-legend" style={{ marginTop: 'var(--space-3)' }}>
        <span className="chart-legend__item">
          <span
            className="chart-legend__swatch chart-legend__swatch--line"
            style={{ background: 'var(--chart-1)' }}
          />
          Solicitudes
        </span>
      </div>
    </div>
  )
}

export function ChartsPage() {
  const [state, setState] = useState('data')

  return (
    <>
      <ShowcaseHero
        title="Batería de gráficos"
        description="Paleta institucional jerarquizada: base azul/celeste + acentos controlados (verde, ámbar, rojo y rosado) para contraste analítico real. Más carácter visual sin perder sobriedad operativa."
      />

      <ShowcaseBlock
        id="chart-rules"
        title="Reglas del sistema de gráficos"
        rule="--chart-1…8 derivados del sistema institucional · series protagonistas + soporte + acentos analíticos · success/warning/error reservados a semántica operacional"
      >
        <table className="ds-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Cuándo usar</th>
              <th>Evitar</th>
            </tr>
          </thead>
          <tbody>
            {RULES_ROWS.map(([tipo, cuando, evitar]) => (
              <tr key={tipo}>
                <td>{tipo}</td>
                <td>{cuando}</td>
                <td>{evitar}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ds-row" style={{ marginTop: 'var(--space-4)' }}>
          {CHART_SWATCHES.map((s) => (
            <div key={s.token}>
              <div className="ds-swatch" style={{ background: `var(${s.token})` }} />
              <div className="ds-token">
                {s.token} {s.label}
              </div>
            </div>
          ))}
          <div>
            <div
              className="ds-swatch"
              style={{ background: 'var(--chart-1-soft)', border: '1px solid var(--border)' }}
            />
            <div className="ds-token">--chart-1-soft</div>
          </div>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="chart-compare"
        title="Antes vs. ahora — dirección visual"
        rule="Izquierda: versión demasiado uniforme · Derecha: versión v6.3 con jerarquía y acentos institucionales"
      >
        <div className="chart-compare">
          <div className="chart-compare__col chart-legacy">
            <div className="chart-compare__label">Antes — suave/plano</div>
            <ChartCard title="Solicitudes de soporte">
              <svg className="chart-svg" viewBox="0 0 280 100" aria-hidden>
                <g className="chart-svg__grid">
                  <line x1="20" y1="20" x2="260" y2="20" />
                  <line x1="20" y1="50" x2="260" y2="50" />
                  <line x1="20" y1="80" x2="260" y2="80" />
                </g>
                <path
                  className="chart-svg__area"
                  d="M20,70 L70,55 L120,60 L170,35 L220,45 L260,25 L260,80 L20,80 Z"
                />
                <polyline className="chart-svg__line" points="20,70 70,55 120,60 170,35 220,45 260,25" />
              </svg>
            </ChartCard>
          </div>
          <div className="chart-compare__col">
            <div className="chart-compare__label chart-compare__label--new">
              Ahora — institucional con contraste
            </div>
            <ChartCard title="Solicitudes de soporte">
              <svg className="chart-svg" viewBox="0 0 280 100" aria-hidden>
                <g className="chart-svg__grid">
                  <line x1="20" y1="20" x2="260" y2="20" />
                  <line x1="20" y1="50" x2="260" y2="50" />
                  <line x1="20" y1="80" x2="260" y2="80" />
                </g>
                <path
                  className="chart-svg__area"
                  d="M20,70 L70,55 L120,60 L170,35 L220,45 L260,25 L260,80 L20,80 Z"
                />
                <polyline className="chart-svg__line" points="20,70 70,55 120,60 170,35 220,45 260,25" />
              </svg>
            </ChartCard>
          </div>
        </div>
        <table className="ds-table" style={{ marginTop: 'var(--space-4)' }}>
          <thead>
            <tr>
              <th>Aspecto</th>
              <th>Antes</th>
              <th>Corregida v6.3</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map(([aspecto, antes, ahora]) => (
              <tr key={aspecto}>
                <td>{aspecto}</td>
                <td>{antes}</td>
                <td>{ahora}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="chart-kpi"
        title="KPI con tendencia"
        rule=".chart-kpi · valor + trend badge + sparkline opcional"
      >
        <div className="grid-3">
          <div className="chart-card">
            <div className="chart-kpi">
              <div className="chart-kpi__label">Tickets abiertos</div>
              <div className="chart-kpi__row">
                <span className="chart-kpi__value">24</span>
                <span className="chart-kpi__trend chart-kpi__trend--down">
                  <TrendIcon direction="down" />
                  −12%
                </span>
              </div>
              <div className="chart-kpi__hint">vs. semana anterior</div>
              <svg
                className="chart-kpi__spark chart-svg"
                viewBox="0 0 120 28"
                preserveAspectRatio="none"
                aria-hidden
              >
                <polyline
                  className="chart-svg__line"
                  points="0,22 20,18 40,20 60,12 80,14 100,8 120,10"
                  fill="none"
                />
              </svg>
            </div>
          </div>
          <div className="chart-card">
            <div className="chart-kpi">
              <div className="chart-kpi__label">Reservas hoy</div>
              <div className="chart-kpi__row">
                <span className="chart-kpi__value">—</span>
                <span className="chart-kpi__trend chart-kpi__trend--flat">Sin dato</span>
              </div>
              <div className="chart-kpi__hint">Conectar módulo reservas</div>
            </div>
          </div>
          <div className="chart-card">
            <div className="chart-kpi">
              <div className="chart-kpi__label">OC pendientes</div>
              <div className="chart-kpi__row">
                <span className="chart-kpi__value">8</span>
                <span className="chart-kpi__trend chart-kpi__trend--up">
                  <TrendIcon direction="up" />
                  +2
                </span>
              </div>
              <div className="chart-kpi__hint">Requieren aprobación</div>
            </div>
          </div>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="chart-line"
        title="Línea y área"
        rule=".chart-card · hover en puntos · tooltip contextual"
      >
        <ChartCard title="Solicitudes de soporte" subtitle="Últimas 8 semanas" range="Ene – Mar 2026">
          <InteractiveLineChart />
        </ChartCard>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="chart-recharts"
        title="Recharts (batería reusable)"
        rule="ChartBar · ChartArea · ChartPie · tokens --chart-1…8 · ChartCard"
      >
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', marginBottom: 'var(--space-4)' }}>
          Wrappers de Recharts para dashboards con datos dinámicos (Indicadores, Vehículos, etc.).
          Importar desde <code>@slep/ui</code>: <code>ChartBar</code>, <code>ChartArea</code>, <code>ChartPie</code>,{' '}
          <code>seriesColor</code>, <code>prioritySeriesColor</code>.
        </p>
        <div className="grid-2" style={{ marginBottom: 'var(--space-4)' }}>
          <ChartCard title="Ranking horizontal" subtitle="ChartBar layout=vertical">
            <div style={{ height: 220 }}>
              <ChartBar
                data={[
                  { label: 'Subdirección A', value: 42 },
                  { label: 'Subdirección B', value: 31 },
                  { label: 'Subdirección C', value: 18 },
                  { label: 'Subdirección D', value: 12 },
                ]}
                layout="vertical"
                yAxisWidth={110}
                colorBy={(_, i) => seriesColor(i)}
              />
            </div>
          </ChartCard>
          <ChartCard title="Tendencia" subtitle="ChartArea">
            <div style={{ height: 220 }}>
              <ChartArea
                data={[
                  { day: 'Lun', value: 12 },
                  { day: 'Mar', value: 18 },
                  { day: 'Mié', value: 15 },
                  { day: 'Jue', value: 22 },
                  { day: 'Vie', value: 19 },
                ]}
                seriesName="Solicitudes"
              />
            </div>
          </ChartCard>
        </div>
        <div className="grid-2">
          <ChartCard title="Distribución" subtitle="ChartPie donut">
            <div style={{ height: 220 }}>
              <ChartPie
                data={[
                  { label: 'Hardware', value: 28 },
                  { label: 'Software', value: 22 },
                  { label: 'Redes', value: 16 },
                  { label: 'Otros', value: 9 },
                ]}
                donut
                showLabel
              />
            </div>
          </ChartCard>
          <ChartCard title="Prioridad" subtitle="prioritySeriesColor">
            <div style={{ height: 220 }}>
              <ChartPie
                data={[
                  { label: 'CRITICA', value: 4 },
                  { label: 'ALTA', value: 11 },
                  { label: 'MEDIA', value: 24 },
                  { label: 'BAJA', value: 18 },
                ]}
                colorBy={(e) => prioritySeriesColor(e.label)}
              />
            </div>
          </ChartCard>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="chart-bars"
        title="Barras verticales, horizontales y apiladas"
        rule="Comparación por rubro / estado · máx. 6 categorías visibles"
      >
        <div className="grid-2">
          <ChartCard title="Proveedores por rubro">
            <svg className="chart-svg" viewBox="0 0 280 140" role="img" aria-label="Barras verticales por rubro">
              <g className="chart-svg__grid">
                <line x1="30" y1="110" x2="260" y2="110" />
              </g>
              <rect className="chart-svg__bar" x="45" y="50" width="28" height="60" rx="2" />
              <rect className="chart-svg__bar chart-svg__bar--2" x="85" y="30" width="28" height="80" rx="2" />
              <rect className="chart-svg__bar chart-svg__bar--muted" x="125" y="70" width="28" height="40" rx="2" />
              <rect className="chart-svg__bar" x="165" y="45" width="28" height="65" rx="2" />
              <rect className="chart-svg__bar chart-svg__bar--3" x="205" y="85" width="28" height="25" rx="2" />
              <g className="chart-svg__axis">
                <text x="48" y="125">
                  Tec
                </text>
                <text x="88" y="125">
                  Serv
                </text>
                <text x="128" y="125">
                  Sumin
                </text>
                <text x="168" y="125">
                  Const
                </text>
                <text x="208" y="125">
                  Otros
                </text>
              </g>
            </svg>
          </ChartCard>
          <ChartCard title="Top establecimientos — reservas">
            <div className="chart-bars-h">
              <HBar label="Liceo A-1" width={82} value={41} animate />
              <HBar label="Escuela B-3" width={65} value={32} animate />
              <HBar label="CFT Regional" width={48} value={24} animate />
            </div>
          </ChartCard>
        </div>
        <ChartCard
          title="Órdenes de compra por estado (apiladas)"
          style={{ marginTop: 'var(--space-4)' }}
        >
          <svg className="chart-svg" viewBox="0 0 360 100" role="img" aria-label="Barras apiladas por mes">
            <rect x="40" y="30" width="40" height="50" fill="var(--chart-1)" rx="3" opacity="0.88" />
            <rect x="40" y="55" width="40" height="25" fill="var(--chart-3)" rx="3" opacity="0.88" />
            <rect x="100" y="20" width="40" height="60" fill="var(--chart-1)" rx="3" opacity="0.88" />
            <rect x="100" y="50" width="40" height="30" fill="var(--chart-4)" rx="3" opacity="0.88" />
            <rect x="160" y="40" width="40" height="40" fill="var(--chart-5)" rx="3" opacity="0.9" />
            <rect x="160" y="60" width="40" height="20" fill="var(--chart-6)" rx="3" opacity="0.88" />
            <g className="chart-svg__axis">
              <text x="48" y="92">
                Ene
              </text>
              <text x="108" y="92">
                Feb
              </text>
              <text x="168" y="92">
                Mar
              </text>
            </g>
          </svg>
          <div className="chart-legend" style={{ marginTop: 'var(--space-3)' }}>
            <span className="chart-legend__item">
              <span className="chart-legend__swatch" style={{ background: 'var(--chart-1)' }} />
              Aprobadas
            </span>
            <span className="chart-legend__item">
              <span className="chart-legend__swatch" style={{ background: 'var(--chart-5)' }} />
              En curso
            </span>
            <span className="chart-legend__item">
              <span className="chart-legend__swatch" style={{ background: 'var(--chart-6)' }} />
              Pendientes
            </span>
            <span className="chart-legend__item">
              <span className="chart-legend__swatch" style={{ background: 'var(--chart-7)' }} />
              Rechazadas
            </span>
          </div>
        </ChartCard>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="chart-donut"
        title="Donut — solo proporciones simples"
        rule="Máx. 4 segmentos · si hay más categorías → barras horizontales"
      >
        <ChartCard>
          <div className="chart-donut">
            <div className="chart-donut__ring">
              <svg viewBox="0 0 120 120" aria-hidden>
                <circle cx="60" cy="60" r="48" fill="none" stroke="var(--surface-inset)" strokeWidth="14" />
                <circle
                  className="chart-donut__segment"
                  cx="60"
                  cy="60"
                  r="48"
                  stroke="var(--chart-1)"
                  strokeDasharray="120 181"
                  strokeDashoffset="0"
                />
                <circle
                  className="chart-donut__segment"
                  cx="60"
                  cy="60"
                  r="48"
                  stroke="var(--chart-3)"
                  strokeDasharray="75 226"
                  strokeDashoffset="-120"
                />
                <circle
                  className="chart-donut__segment"
                  cx="60"
                  cy="60"
                  r="48"
                  stroke="var(--chart-4)"
                  strokeDasharray="45 256"
                  strokeDashoffset="-195"
                />
                <circle
                  className="chart-donut__segment"
                  cx="60"
                  cy="60"
                  r="48"
                  stroke="var(--chart-8)"
                  strokeDasharray="61 240"
                  strokeDashoffset="-240"
                />
              </svg>
              <div className="chart-donut__center">
                <div className="chart-donut__center-value">156</div>
                <div className="chart-donut__center-label">Total OC</div>
              </div>
            </div>
            <div className="chart-legend" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <span className="chart-legend__item">
                <span className="chart-legend__swatch" style={{ background: 'var(--chart-1)' }} />
                Aprobadas (38%)
              </span>
              <span className="chart-legend__item">
                <span className="chart-legend__swatch" style={{ background: 'var(--chart-3)' }} />
                En curso (24%)
              </span>
              <span className="chart-legend__item">
                <span className="chart-legend__swatch" style={{ background: 'var(--chart-4)' }} />
                Pendientes (14%)
              </span>
              <span className="chart-legend__item">
                <span className="chart-legend__swatch" style={{ background: 'var(--chart-8)' }} />
                Otros (24%)
              </span>
            </div>
          </div>
        </ChartCard>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="chart-timeline"
        title="Timeline y heatmap"
        rule="Actividad reciente · ocupación de salas"
      >
        <div className="grid-2">
          <ChartCard title="Actividad reciente">
            <ul className="chart-timeline">
              <li className="chart-timeline__item">
                <span className="chart-timeline__dot" />
                <div>
                  <div className="chart-timeline__time">09:42</div>
                  <div className="chart-timeline__title">Reserva confirmada — Sala B</div>
                  <div className="chart-timeline__desc">Módulo SSGG · usuario gdiaz</div>
                </div>
              </li>
              <li className="chart-timeline__item">
                <span className="chart-timeline__dot chart-timeline__dot--warning" />
                <div>
                  <div className="chart-timeline__time">Ayer 16:20</div>
                  <div className="chart-timeline__title">OC pendiente de firma</div>
                  <div className="chart-timeline__desc">Compras · requiere aprobación</div>
                </div>
              </li>
              <li className="chart-timeline__item">
                <span className="chart-timeline__dot chart-timeline__dot--success" />
                <div>
                  <div className="chart-timeline__time">Lun 11:05</div>
                  <div className="chart-timeline__title">Proveedor actualizado</div>
                  <div className="chart-timeline__desc">Distribuidora Norte SpA</div>
                </div>
              </li>
            </ul>
          </ChartCard>
          <ChartCard title="Ocupación salas — semana">
            <div
              className="chart-heatmap chart-heatmap--week"
              style={{ gridTemplateColumns: 'auto repeat(5,1fr)' }}
            >
              <span className="chart-heatmap__label" />
              <span className="chart-heatmap__label">Lun</span>
              <span className="chart-heatmap__label">Mar</span>
              <span className="chart-heatmap__label">Mié</span>
              <span className="chart-heatmap__label">Jue</span>
              <span className="chart-heatmap__label">Vie</span>
              <span className="chart-heatmap__label">AM</span>
              <span className="chart-heatmap__cell" data-level="2" title="2 reservas" />
              <span className="chart-heatmap__cell" data-level="4" title="8 reservas" />
              <span className="chart-heatmap__cell" data-level="1" />
              <span className="chart-heatmap__cell" data-level="3" />
              <span className="chart-heatmap__cell" data-level="2" />
              <span className="chart-heatmap__label">PM</span>
              <span className="chart-heatmap__cell" data-level="3" />
              <span className="chart-heatmap__cell" data-level="2" />
              <span className="chart-heatmap__cell" data-level="4" />
              <span className="chart-heatmap__cell" data-level="1" />
              <span className="chart-heatmap__cell" data-level="3" />
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginTop: 'var(--space-3)' }}>
              Escala 0–4 por franja horaria. Hover para detalle.
            </p>
          </ChartCard>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="chart-combo"
        title="Tabla + gráfico combinado"
        rule=".chart-combo · detalle tabular + resumen visual"
      >
        <ChartCard>
          <div className="chart-combo">
            <div className="chart-combo__table">
              <table>
                <thead>
                  <tr>
                    <th>Rubro</th>
                    <th>Activos</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Tecnología</td>
                    <td className="mono">12</td>
                  </tr>
                  <tr>
                    <td>Servicios</td>
                    <td className="mono">18</td>
                  </tr>
                  <tr>
                    <td>Suministros</td>
                    <td className="mono">7</td>
                  </tr>
                  <tr>
                    <td>Construcción</td>
                    <td className="mono">9</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="chart-bars-h">
              <HBar label="Tecnología" width={40} value={12} />
              <HBar label="Servicios" width={60} value={18} />
              <HBar label="Suministros" width={23} value={7} />
              <HBar label="Construcción" width={30} value={9} />
            </div>
          </div>
        </ChartCard>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="chart-states"
        title="Estados: datos · vacío · carga · error"
        rule=".chart-state--* · mismo contenedor .chart-card"
      >
        <div className="showcase-demo-controls" style={{ marginBottom: 'var(--space-4)' }}>
          {[
            ['data', 'Con datos'],
            ['empty', 'Vacío'],
            ['loading', 'Cargando'],
            ['error', 'Error'],
          ].map(([id, label]) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={state === id ? 'primary' : 'secondary'}
              onClick={() => setState(id)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="chart-card">
          <div className="chart-card__header">
            <div className="chart-card__title">Reservas por semana</div>
          </div>
          {state === 'data' ? (
            <div className="chart-card__body">
              <svg className="chart-svg" viewBox="0 0 300 100">
                <polyline className="chart-svg__line" points="20,80 80,60 140,70 200,40 260,55" />
              </svg>
            </div>
          ) : null}
          {state === 'empty' ? (
            <div className="chart-state">
              <svg
                className="chart-state__icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden
              >
                <path d="M3 3v18h18" />
                <path d="M7 16l4-8 4 5 5-9" />
              </svg>
              <div className="chart-state__title">Sin datos en el período</div>
              <div className="chart-state__desc">
                Ajuste el rango de fechas o conecte el módulo de reservas.
              </div>
            </div>
          ) : null}
          {state === 'loading' ? (
            <div className="chart-state chart-state--loading">
              <svg
                className="chart-state__icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden
              >
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              <div className="chart-state__title">Cargando datos…</div>
            </div>
          ) : null}
          {state === 'error' ? (
            <div className="chart-state">
              <svg
                className="chart-state__icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <div className="chart-state__title">No se pudo cargar el gráfico</div>
              <div className="chart-state__desc">Revise la conexión o intente nuevamente.</div>
              <Button variant="secondary" size="sm" style={{ marginTop: 'var(--space-3)' }}>
                Reintentar
              </Button>
            </div>
          ) : null}
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="dashboard-composition"
        title="Composición de dashboard analítico"
        rule=".dashboard-analytics · KPI + principal + breakdown + actividad"
      >
        <div className="dashboard-analytics">
          <div className="dashboard-analytics__kpis motion-stagger">
            <div className="chart-card">
              <div className="chart-kpi">
                <div className="chart-kpi__label">Tickets</div>
                <div className="chart-kpi__value">24</div>
              </div>
            </div>
            <div className="chart-card">
              <div className="chart-kpi">
                <div className="chart-kpi__label">Reservas</div>
                <div className="chart-kpi__value">—</div>
              </div>
            </div>
            <div className="chart-card">
              <div className="chart-kpi">
                <div className="chart-kpi__label">OC</div>
                <div className="chart-kpi__value">8</div>
              </div>
            </div>
            <div className="chart-card">
              <div className="chart-kpi">
                <div className="chart-kpi__label">Proveedores</div>
                <div className="chart-kpi__value">46</div>
              </div>
            </div>
          </div>
          <div className="dashboard-analytics__main">
            <div className="chart-card">
              <div className="chart-card__header">
                <div className="chart-card__title">Evolución operativa</div>
                <Select style={{ width: 'auto' }} defaultValue="30">
                  <option value="30">Últimos 30 días</option>
                </Select>
              </div>
              <div className="chart-card__body">
                <svg className="chart-svg" viewBox="0 0 400 120">
                  <path
                    className="chart-svg__area"
                    d="M20,90 L100,70 L180,75 L260,45 L340,55 L380,35 L380,110 L20,110 Z"
                  />
                  <polyline
                    className="chart-svg__line"
                    points="20,90 100,70 180,75 260,45 340,55 380,35"
                  />
                </svg>
              </div>
            </div>
            <div className="chart-card">
              <div className="chart-card__header">
                <div className="chart-card__title">Actividad</div>
              </div>
              <div className="chart-card__body" style={{ paddingTop: 'var(--space-2)' }}>
                <ul className="chart-timeline">
                  <li className="chart-timeline__item">
                    <span className="chart-timeline__dot" />
                    <div>
                      <div className="chart-timeline__time">Hoy</div>
                      <div className="chart-timeline__title">3 reservas nuevas</div>
                    </div>
                  </li>
                  <li className="chart-timeline__item">
                    <span className="chart-timeline__dot chart-timeline__dot--warning" />
                    <div>
                      <div className="chart-timeline__time">Ayer</div>
                      <div className="chart-timeline__title">2 OC pendientes</div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </ShowcaseBlock>
    </>
  )
}
