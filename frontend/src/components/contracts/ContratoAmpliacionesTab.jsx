import React, { useMemo, useState } from 'react'
import {
  Card,
  CardHeader,
  Button,
  Icon,
  Badge,
  EmptyState,
  Modal,
} from '@slep/ui'

export const ampliacionLabel = (a) => {
  if (a?.nro_resolucion) return `Res. ${a.nro_resolucion}`
  if (a?.fecha_inicio && a?.fecha_termino) {
    return `${a.fecha_inicio} → ${a.fecha_termino}`
  }
  return `Ampliación #${a?.id || ''}`
}

/**
 * Lista compacta de ampliaciones para la pestaña General.
 * Detalle en modal; edición vía AmpliacionModal (onEdit).
 */
export default function ContratoAmpliacionesPanel({
  ampliaciones = [],
  canEdit = false,
  onEdit,
  onCreate,
  onPreviewDoc,
  formatCurrency,
  formatDate,
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

  const [detail, setDetail] = useState(null)

  const montosProv = detail?.montos_proveedor || []
  const monto = detail ? Number(detail.monto) || 0 : 0
  const motivo = (detail?.motivo || '').trim()
  const pct =
    detail?.porcentaje != null && detail.porcentaje !== ''
      ? Number(detail.porcentaje)
      : null

  return (
    <>
      <Card id="contract-ampliaciones" className="contracts-amp-panel">
        <CardHeader
          title="Ampliaciones"
          subtitle={
            sorted.length
              ? `${sorted.length} registro${sorted.length === 1 ? '' : 's'} · suman al techo del contrato`
              : 'Ajustes de plazo o presupuesto del convenio'
          }
          actions={
            canEdit && typeof onCreate === 'function' ? (
              <Button variant="secondary" size="sm" onClick={() => onCreate()}>
                <Icon name="plus" size="sm" /> Nueva
              </Button>
            ) : null
          }
        />
        <div className="card__body">
          {!sorted.length ? (
            <EmptyState
              title="Sin ampliaciones"
              description="Si se amplía plazo o monto, regístralo aquí. El techo del contrato se actualiza solo."
              action={
                canEdit && typeof onCreate === 'function' ? (
                  <Button variant="primary" size="sm" onClick={() => onCreate()}>
                    <Icon name="plus" size="sm" /> Registrar ampliación
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="contracts-amp-list">
              {sorted.map((a) => {
                const m = Number(a.monto) || 0
                return (
                  <li key={a.id} className="contracts-amp-list__item">
                    <div className="contracts-amp-list__main">
                      <span className="contracts-amp-list__title">{ampliacionLabel(a)}</span>
                      <span className="contracts-amp-list__meta">
                        {formatDate(a.fecha_inicio)} → {formatDate(a.fecha_termino)}
                        {m > 0 ? ` · ${formatCurrency(m)}` : ''}
                      </span>
                    </div>
                    <div className="contracts-amp-list__actions">
                      <Button variant="ghost" size="sm" onClick={() => setDetail(a)}>
                        Ver
                      </Button>
                      {canEdit ? (
                        <Button variant="outline" size="sm" onClick={() => onEdit?.(a)}>
                          <Icon name="edit" size="sm" /> Editar
                        </Button>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </Card>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        size="sm"
        className="contracts-sheet-modal"
        title={detail ? ampliacionLabel(detail) : 'Ampliación'}
        subheader="Detalle de la ampliación"
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setDetail(null)}>
              Cerrar
            </Button>
            {canEdit && detail ? (
              <Button
                variant="primary"
                type="button"
                onClick={() => {
                  const current = detail
                  setDetail(null)
                  onEdit?.(current)
                }}
              >
                <Icon name="edit" size="sm" /> Editar
              </Button>
            ) : null}
          </>
        }
      >
        {detail ? (
          <div className="contracts-sheet">
            <div className="contracts-sheet__hero">
              <div>
                <p className="contracts-sheet__kicker">Monto de la ampliación</p>
                <p className="contracts-sheet__amount">
                  {monto > 0 ? formatCurrency(monto) : 'Sin monto'}
                </p>
              </div>
              {pct != null ? <Badge variant="neutral">{pct}% informado</Badge> : null}
            </div>

            <dl className="contracts-sheet__facts">
              {detail.nro_resolucion ? (
                <div className="contracts-sheet__fact">
                  <dt>Resolución</dt>
                  <dd>{detail.nro_resolucion}</dd>
                </div>
              ) : null}
              <div className="contracts-sheet__fact">
                <dt>Vigencia</dt>
                <dd>
                  {formatDate(detail.fecha_inicio)} → {formatDate(detail.fecha_termino)}
                </dd>
              </div>
              {detail.fecha_termino_anterior ? (
                <div className="contracts-sheet__fact">
                  <dt>Término anterior</dt>
                  <dd>{formatDate(detail.fecha_termino_anterior)}</dd>
                </div>
              ) : null}
              {motivo ? (
                <div className="contracts-sheet__fact contracts-sheet__fact--stack">
                  <dt>Motivo</dt>
                  <dd>{motivo}</dd>
                </div>
              ) : null}
            </dl>

            {montosProv.length > 0 ? (
              <section className="contracts-sheet__section">
                <h3 className="contracts-sheet__section-title">Por proveedor</h3>
                <ul className="contracts-sheet__rows">
                  {montosProv.map((row) => (
                    <li key={`${row.proveedor}-${row.id || row.monto}`}>
                      <span>{row.proveedor_nombre || `Proveedor #${row.proveedor}`}</span>
                      <strong>{formatCurrency(row.monto)}</strong>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {detail.documento ? (
              <Button
                variant="secondary"
                size="sm"
                type="button"
                className="contracts-sheet__doc"
                onClick={() =>
                  onPreviewDoc?.({
                    archivo: detail.documento,
                    nombre: ampliacionLabel(detail),
                  })
                }
              >
                <Icon name="file" size="sm" /> Documento adjunto
              </Button>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </>
  )
}
