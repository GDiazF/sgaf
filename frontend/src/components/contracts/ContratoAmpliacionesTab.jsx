import React, { useEffect, useMemo, useState } from 'react'
import { ChartCard, Button, Icon, EmptyState } from '@slep/ui'

export const ampliacionLabel = (a) => {
  if (a?.nro_resolucion) return `Res. ${a.nro_resolucion}`
  if (a?.fecha_inicio && a?.fecha_termino) {
    return `${a.fecha_inicio} → ${a.fecha_termino}`
  }
  return `Ampliación #${a?.id || ''}`
}

const monthsBetween = (fechaInicio, fechaTermino) => {
  if (!fechaInicio || !fechaTermino) return null
  const start = new Date(fechaInicio)
  const end = new Date(fechaTermino)
  let months =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  if (end.getDate() < start.getDate()) months -= 1
  return Math.max(0, months)
}

/**
 * Misma estructura visual que el tab General, solo con datos de la ampliación.
 */
export default function ContratoAmpliacionesTab({
  ampliaciones = [],
  selectedId: selectedIdProp = null,
  onSelectedIdChange,
  canEdit = false,
  onEdit,
  onPreviewDoc,
  formatCurrency,
  formatDate,
  calcSegmentProgress,
}) {
  const sorted = useMemo(
    () =>
      [...ampliaciones].sort((a, b) => {
        const ta = new Date(b.fecha_termino || 0).getTime()
        const tb = new Date(a.fecha_termino || 0).getTime()
        return ta - tb
      }),
    [ampliaciones],
  )

  const [selectedIdInternal, setSelectedIdInternal] = useState(sorted[0]?.id || null)
  const isControlled = typeof onSelectedIdChange === 'function'
  const selectedId = isControlled ? selectedIdProp : selectedIdInternal

  useEffect(() => {
    if (isControlled) return
    if (!sorted.length) {
      setSelectedIdInternal(null)
      return
    }
    if (!sorted.some((a) => String(a.id) === String(selectedIdInternal))) {
      setSelectedIdInternal(sorted[0].id)
    }
  }, [sorted, selectedIdInternal, isControlled])

  const selected = sorted.find((a) => String(a.id) === String(selectedId)) || sorted[0]

  if (!selected) {
    return (
      <EmptyState
        title="Sin ampliaciones"
        description="Aún no se ha registrado una ampliación de contrato."
      />
    )
  }

  const montoAmp = Number(selected.monto) || 0
  const montoEjecutadoAmp = 0
  const montoRestanteAmp = montoAmp - montoEjecutadoAmp
  const executionPercentage =
    montoAmp > 0
      ? Math.min(Math.round((montoEjecutadoAmp / montoAmp) * 100), 100)
      : 0
  const ampTime = calcSegmentProgress(selected.fecha_inicio, selected.fecha_termino)
  const plazoMeses = monthsBetween(selected.fecha_inicio, selected.fecha_termino)
  const pctInformativo =
    selected.porcentaje != null && selected.porcentaje !== ''
      ? Number(selected.porcentaje)
      : null

  return (
    <div className="contracts-tab contracts-general">
      <div className="contracts-metric-strip">
        <div className="contracts-metric contracts-metric--total">
          <span className="contracts-metric__label">Presupuesto total</span>
          <span className="contracts-metric__value">
            {montoAmp > 0 ? formatCurrency(montoAmp) : '—'}
          </span>
          <span className="contracts-metric__hint">
            {pctInformativo != null
              ? `Monto de la ampliación · ${pctInformativo}% informado`
              : 'Monto de esta ampliación'}
          </span>
        </div>
        <div className="contracts-metric contracts-metric--spent">
          <span className="contracts-metric__label">Ejecutado</span>
          <span className="contracts-metric__value">
            {formatCurrency(montoEjecutadoAmp)}
          </span>
          <div className="contracts-metric__bar" aria-hidden>
            <span style={{ width: `${Math.min(100, executionPercentage)}%` }} />
          </div>
          <span className="contracts-metric__hint">
            {executionPercentage}% del presupuesto de la ampliación
          </span>
        </div>
        <div className="contracts-metric contracts-metric--available">
          <span className="contracts-metric__label">Disponible</span>
          <span className="contracts-metric__value">
            {montoAmp > 0 ? formatCurrency(montoRestanteAmp) : '—'}
          </span>
          <div className="contracts-metric__bar" aria-hidden>
            <span
              style={{
                width: `${Math.min(100, Math.max(0, 100 - executionPercentage))}%`,
              }}
            />
          </div>
          <span className="contracts-metric__hint">
            {Math.max(0, 100 - executionPercentage)}% aún disponible
          </span>
        </div>
        <div className="contracts-metric contracts-metric--time">
          <span className="contracts-metric__label">Plazo restante</span>
          <span className="contracts-metric__value">
            {ampTime.monthsLeft}
            <small> meses</small>
          </span>
          <div className="contracts-metric__bar" aria-hidden>
            <span style={{ width: `${Math.min(100, ampTime.percentage)}%` }} />
          </div>
          <span className="contracts-metric__hint">
            {ampTime.percentage}% del tiempo transcurrido
          </span>
        </div>
      </div>

      <div className="contracts-general__top">
        <ChartCard
          title="Información de la ampliación"
          subtitle="Ficha del tramo ampliado"
          actions={
            canEdit ? (
              <Button variant="outline" size="sm" onClick={() => onEdit?.(selected)}>
                <Icon name="edit" size="sm" /> Editar
              </Button>
            ) : null
          }
        >
          <dl className="contracts-meta">
            <div className="contracts-meta__item">
              <dt>Resolución</dt>
              <dd>{selected.nro_resolucion || '—'}</dd>
            </div>
            <div className="contracts-meta__item">
              <dt>% informado</dt>
              <dd>{pctInformativo != null ? `${pctInformativo}%` : '—'}</dd>
            </div>
            <div className="contracts-meta__item">
              <dt>Monto</dt>
              <dd>{montoAmp > 0 ? formatCurrency(montoAmp) : '—'}</dd>
            </div>
            <div className="contracts-meta__item">
              <dt>Registrado por</dt>
              <dd>{selected.usuario || '—'}</dd>
            </div>
            <div className="contracts-meta__item">
              <dt>Término previo</dt>
              <dd>{formatDate(selected.fecha_termino_anterior)}</dd>
            </div>
            <div className="contracts-meta__item">
              <dt>Inicio ampliación</dt>
              <dd>{formatDate(selected.fecha_inicio)}</dd>
            </div>
            <div className="contracts-meta__item">
              <dt>Término ampliación</dt>
              <dd>{formatDate(selected.fecha_termino)}</dd>
            </div>
            <div className="contracts-meta__item">
              <dt>Plazo del tramo</dt>
              <dd>{plazoMeses != null ? `${plazoMeses} meses` : '—'}</dd>
            </div>
            <div className="contracts-meta__item contracts-meta__item--full">
              <dt>Motivo / glosa</dt>
              <dd>{selected.motivo || '—'}</dd>
            </div>
            <div className="contracts-meta__item">
              <dt>Documento</dt>
              <dd>
                {selected.documento ? (
                  <button
                    type="button"
                    className="contracts-provider-link"
                    onClick={() =>
                      onPreviewDoc?.({
                        nombre: `Ampliación ${formatDate(selected.fecha_inicio)} – ${formatDate(selected.fecha_termino)}`,
                        archivo: selected.documento,
                      })
                    }
                  >
                    Ver documento
                  </button>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div className="contracts-meta__item">
              <dt>Fecha de registro</dt>
              <dd>{formatDate(selected.created_at)}</dd>
            </div>
          </dl>
        </ChartCard>

        <ChartCard title="Ejecución mensual" subtitle="Histórico de gastos del tramo">
          <div className="contracts-chart">
            <EmptyState
              title="Sin ejecución del tramo"
              description="Esta ampliación aún no tiene un histórico mensual propio."
            />
          </div>
        </ChartCard>
      </div>

      <div className="contracts-kpi-grid">
        <ChartCard
          title="Control presupuestario"
          subtitle="Avance del gasto frente al techo"
          range={
            montoAmp > 0
              ? `${formatCurrency(montoRestanteAmp)} disponibles`
              : 'Sin monto'
          }
        >
          <div className="chart-kpi">
            <div className="chart-kpi__label">Presupuesto utilizado</div>
            <div className="chart-kpi__row">
              <span className="chart-kpi__value">{executionPercentage}%</span>
              <span
                className={`chart-kpi__trend ${
                  executionPercentage >= 80
                    ? 'chart-kpi__trend--up'
                    : executionPercentage >= 40
                      ? 'chart-kpi__trend--flat'
                      : 'chart-kpi__trend--down'
                }`}
              >
                {montoAmp > 0 ? `${formatCurrency(montoRestanteAmp)} libre` : '—'}
              </span>
            </div>
            <div className="chart-kpi__hint">
              {formatCurrency(montoEjecutadoAmp)} ejecutados de{' '}
              {montoAmp > 0 ? formatCurrency(montoAmp) : '—'}
              {pctInformativo != null ? <> · {pctInformativo}% informado</> : null}
            </div>
            <div className="contracts-timeline">
              <div className="contracts-timeline__rail contracts-timeline__rail--success">
                <div
                  className="contracts-timeline__elapsed contracts-timeline__elapsed--success"
                  style={{ width: `${Math.min(100, executionPercentage)}%` }}
                />
                <span
                  className="contracts-timeline__marker contracts-timeline__marker--success"
                  style={{ left: `${Math.min(100, executionPercentage)}%` }}
                  aria-hidden
                />
              </div>
              <div className="contracts-timeline__labels">
                <span>$0</span>
                <span>Actual</span>
                <span>Techo</span>
              </div>
            </div>
            <div className="contracts-kpi-split">
              <div>
                <span className="contracts-kpi-split__label">Ejecutado</span>
                <strong>{formatCurrency(montoEjecutadoAmp)}</strong>
              </div>
              <div>
                <span className="contracts-kpi-split__label">Disponible</span>
                <strong>
                  {montoAmp > 0 ? formatCurrency(montoRestanteAmp) : '—'}
                </strong>
              </div>
            </div>
          </div>
        </ChartCard>

        <ChartCard
          title="Control de plazos"
          subtitle="Avance temporal de la ampliación"
          range={`${ampTime.monthsLeft} meses restantes`}
        >
          <div className="chart-kpi">
            <div className="chart-kpi__label">Tiempo transcurrido</div>
            <div className="chart-kpi__row">
              <span className="chart-kpi__value">{ampTime.percentage}%</span>
              <span
                className={`chart-kpi__trend ${
                  ampTime.monthsLeft <= 2
                    ? 'chart-kpi__trend--up'
                    : ampTime.monthsLeft <= 6
                      ? 'chart-kpi__trend--flat'
                      : 'chart-kpi__trend--down'
                }`}
              >
                {ampTime.monthsLeft} mes{ampTime.monthsLeft === 1 ? '' : 'es'}
              </span>
            </div>
            <div className="chart-kpi__hint">
              {formatDate(selected.fecha_inicio)} → {formatDate(selected.fecha_termino)}
            </div>
            <div className="contracts-timeline">
              <div className="contracts-timeline__rail">
                <div
                  className="contracts-timeline__elapsed"
                  style={{ width: `${Math.min(100, ampTime.percentage)}%` }}
                />
                <span
                  className="contracts-timeline__marker"
                  style={{ left: `${Math.min(100, ampTime.percentage)}%` }}
                  aria-hidden
                />
              </div>
              <div className="contracts-timeline__labels">
                <span>Inicio</span>
                <span>Hoy</span>
                <span>Término</span>
              </div>
            </div>
            <div className="contracts-kpi-split">
              <div>
                <span className="contracts-kpi-split__label">Plazo total</span>
                <strong>
                  {plazoMeses != null ? `${plazoMeses} meses` : '—'}
                </strong>
              </div>
              <div>
                <span className="contracts-kpi-split__label">Restante</span>
                <strong>
                  {ampTime.monthsLeft} mes{ampTime.monthsLeft === 1 ? '' : 'es'}
                </strong>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
