import React, { useEffect, useMemo, useState } from 'react'
import { format, eachDayOfInterval, parseISO, isWeekend } from 'date-fns'
import { es } from 'date-fns/locale'
import { Modal, Field, Select, Icon, EmptyState } from '@slep/ui'
import { usePermission } from '../../../hooks/usePermission'
import { useNotify } from '../../../hooks/useNotify'
import api from '../../../api'

function periodoForRuta(ruta, periodName) {
  return ruta.periodos?.find((p) => p.nombre_estandarizado === periodName)
}

function dateInPeriodo(periodo, fStr) {
  if (!periodo?.fecha_inicio || !periodo?.fecha_fin) return false
  const start = String(periodo.fecha_inicio).slice(0, 10)
  const end = String(periodo.fecha_fin).slice(0, 10)
  return fStr >= start && fStr <= end
}

export default function BulkAsistenciaModal({ open, onClose, rutas, onUpdate, rowLabel = 'Rutas' }) {
  const { can } = usePermission()
  const [selectedPeriodName, setSelectedPeriodName] = useState('')
  const [feriados, setFeriados] = useState([])
  const [togglingId, setTogglingId] = useState(null)
  const { notify } = useNotify()

  const availablePeriodNames = useMemo(() => {
    const names = new Set()
    rutas.forEach((r) => {
      r.periodos?.forEach((p) => {
        if (p.nombre_estandarizado) names.add(p.nombre_estandarizado)
      })
    })
    return Array.from(names).sort((a, b) => {
      const months = [
        'ENERO',
        'FEBRERO',
        'MARZO',
        'ABRIL',
        'MAYO',
        'JUNIO',
        'JULIO',
        'AGOSTO',
        'SEPTIEMBRE',
        'OCTUBRE',
        'NOVIEMBRE',
        'DICIEMBRE',
      ]
      const [mA, yA] = (a || '').split(' ')
      const [mB, yB] = (b || '').split(' ')
      if (yA !== yB) return (yB || 0) - (yA || 0)
      return months.indexOf(mB) - months.indexOf(mA)
    })
  }, [rutas])

  useEffect(() => {
    if (!open) {
      setSelectedPeriodName('')
      return undefined
    }
    const fetchFeriados = async () => {
      try {
        const res = await api.get('contratos/feriados/')
        const lista = Array.isArray(res.data) ? res.data : res.data.results || []
        setFeriados(lista.map((f) => f.fecha))
      } catch {
        /* ignore */
      }
    }
    fetchFeriados()
    return undefined
  }, [open])

  useEffect(() => {
    if (!open || selectedPeriodName || availablePeriodNames.length === 0) return
    setSelectedPeriodName(availablePeriodNames[0])
  }, [open, selectedPeriodName, availablePeriodNames])

  const applicableRutas = useMemo(() => {
    if (!selectedPeriodName) return []
    return rutas.filter((r) => periodoForRuta(r, selectedPeriodName))
  }, [selectedPeriodName, rutas])

  const diasGrid = useMemo(() => {
    if (!selectedPeriodName || applicableRutas.length === 0) return []
    let minStart = null
    let maxEnd = null
    applicableRutas.forEach((ruta) => {
      const p = periodoForRuta(ruta, selectedPeriodName)
      if (!p) return
      const start = parseISO(String(p.fecha_inicio).slice(0, 10))
      const end = parseISO(String(p.fecha_fin).slice(0, 10))
      if (!minStart || start < minStart) minStart = start
      if (!maxEnd || end > maxEnd) maxEnd = end
    })
    if (!minStart || !maxEnd) return []
    return eachDayOfInterval({ start: minStart, end: maxEnd })
  }, [selectedPeriodName, applicableRutas])

  const handleToggleCell = async (periodoId, fechaStr) => {
    if (!periodoId) return
    setTogglingId(`${periodoId}-${fechaStr}`)
    try {
      await api.post(`contratos/periodos/${periodoId}/toggle-dia/`, { fecha: fechaStr })
      await onUpdate()
    } catch {
      notify({ variant: 'danger', text: 'No se pudo actualizar el día.' })
    } finally {
      setTogglingId(null)
    }
  }

  const handleToggleColumn = async (fechaDate) => {
    const fStr = format(fechaDate, 'yyyy-MM-dd')
    const isSem = isWeekend(fechaDate)
    const isFer = feriados.includes(fStr)

    const validPeriodoIds = []
    applicableRutas.forEach((r) => {
      const p = periodoForRuta(r, selectedPeriodName)
      if (p && dateInPeriodo(p, fStr)) {
        const incFinSem = p.regla?.incluir_fines_semana ?? r.incluir_fines_semana ?? false
        const excFer = p.regla?.excluir_feriados ?? r.excluir_feriados ?? false
        const isInvalid = (isSem && !incFinSem) || (isFer && excFer)
        if (!isInvalid && p.estado !== 'CERRADO') validPeriodoIds.push(p.id)
      }
    })

    if (validPeriodoIds.length === 0) return

    setTogglingId(`col-${fStr}`)
    try {
      const firstRuta = applicableRutas.find((r) =>
        r.periodos.some((per) => per.nombre_estandarizado === selectedPeriodName),
      )
      const firstP = firstRuta?.periodos.find(
        (per) => per.nombre_estandarizado === selectedPeriodName,
      )
      const isCurrentlyAbsent = firstP?.ausencias?.includes(fStr)
      const newState = isCurrentlyAbsent ? 'presente' : 'ausente'

      await api.post(`contratos/periodos/bulk-toggle-dia/`, {
        periodo_ids: validPeriodoIds,
        fecha: fStr,
        force_state: newState,
      })
      await onUpdate()
    } catch {
      notify({ variant: 'danger', text: 'Error al actualizar la columna.' })
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Planilla de asistencia"
      subheader={`Marca inasistencias en todos los ${rowLabel.toLowerCase()} del periodo · clic en el día = toda la columna`}
      className="rutas-detail-modal--sheet"
      headerActions={
        <div style={{ minWidth: 200 }}>
          <Field label="Periodo" htmlFor="bulk-asist-periodo">
            <Select
              id="bulk-asist-periodo"
              value={selectedPeriodName}
              onChange={(e) => setSelectedPeriodName(e.target.value)}
            >
              <option value="">— Elige un periodo —</option>
              {availablePeriodNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      }
      footer={
        <div className="rutas-detail-matrix-legend" style={{ borderTop: 0, padding: 0, width: '100%' }}>
          <div className="rutas-detail-matrix-legend__item">
            <span className="rutas-detail-matrix-legend__swatch rutas-detail-matrix-legend__swatch--ok" />
            Realizado
          </div>
          <div className="rutas-detail-matrix-legend__item">
            <span className="rutas-detail-matrix-legend__swatch rutas-detail-matrix-legend__swatch--aus" />
            Inasistencia
          </div>
          <div className="rutas-detail-matrix-legend__item">
            <span className="rutas-detail-matrix-legend__swatch rutas-detail-matrix-legend__swatch--weekend" />
            Bloqueo fin de semana
          </div>
          <div className="rutas-detail-matrix-legend__item">
            <span className="rutas-detail-matrix-legend__swatch rutas-detail-matrix-legend__swatch--fer" />
            Bloqueo feriado
          </div>
          <div className="rutas-detail-matrix-legend__item" style={{ marginLeft: 'auto' }}>
            <Icon name="info" size="sm" /> Haz clic en una celda para alternar
          </div>
        </div>
      }
    >
      {!selectedPeriodName ? (
        <div style={{ padding: 'var(--space-8)' }}>
          <EmptyState
            title="Selecciona un periodo"
            description="Para cargar la planilla de asistencia."
          />
        </div>
      ) : (
        <div className="rutas-detail-matrix-wrap">
          <table className="rutas-detail-matrix">
            <thead>
              <tr>
                <th className="rutas-detail-matrix__sticky">
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
                    {rowLabel} ({applicableRutas.length})
                  </span>
                </th>
                {diasGrid.map((fecha) => {
                  const fStr = format(fecha, 'yyyy-MM-dd')
                  const isSem = isWeekend(fecha)
                  const isFer = feriados.includes(fStr)
                  const isTogglingCol = togglingId === `col-${fStr}`

                  return (
                    <th
                      key={fecha.toString()}
                      onClick={() =>
                        can('contratos.change_ausenciaruta') && handleToggleColumn(fecha)
                      }
                      style={isSem ? { background: 'var(--bg)' } : undefined}
                    >
                      <div className="rutas-detail-matrix__dayhead">
                        {isTogglingCol ? (
                          <span>…</span>
                        ) : (
                          <>
                            <span>
                              {format(fecha, 'EEE', { locale: es }).substring(0, 2)}
                            </span>
                            <span style={isFer ? { color: 'var(--warning, #f59e0b)' } : undefined}>
                              {format(fecha, 'd')}
                            </span>
                          </>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {applicableRutas.map((ruta) => {
                const p = periodoForRuta(ruta, selectedPeriodName)
                return (
                  <tr key={ruta.id}>
                    <td className="rutas-detail-matrix__sticky">
                      <strong
                        style={{
                          display: 'block',
                          fontSize: 'var(--text-xs)',
                          color: 'var(--fg)',
                        }}
                      >
                        {ruta.nombre}
                      </strong>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 'var(--text-xs)',
                          color: 'var(--primary)',
                          marginTop: 2,
                        }}
                      >
                        {ruta.proveedor_nombre}
                      </span>
                      {ruta.itinerario ? (
                        <span
                          style={{
                            display: 'block',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--warning-text, #b45309)',
                            marginTop: 2,
                          }}
                          title={ruta.itinerario}
                        >
                          {ruta.itinerario}
                        </span>
                      ) : null}
                    </td>
                    {diasGrid.map((fecha) => {
                      const fStr = format(fecha, 'yyyy-MM-dd')
                      const isSem = isWeekend(fecha)
                      const isFer = feriados.includes(fStr)
                      const isAus = (p?.ausencias || []).includes(fStr)

                      const incFinSem =
                        p?.regla?.incluir_fines_semana ?? ruta.incluir_fines_semana ?? false
                      const excFer = p?.regla?.excluir_feriados ?? ruta.excluir_feriados ?? false

                      const isInvalidSem = isSem && !incFinSem
                      const isInvalidFer = isFer && excFer
                      const outOfRange = !dateInPeriodo(p, fStr)
                      const isInvalid = outOfRange || isInvalidSem || isInvalidFer
                      const isToggling = togglingId === `${p?.id}-${fStr}`

                      return (
                        <td key={fStr}>
                          {isInvalid ? (
                            <div
                              className={`rutas-detail-matrix__blocked${isInvalidFer ? ' is-fer' : ''}`}
                              title={
                                outOfRange
                                  ? 'Fuera del periodo de la línea'
                                  : isInvalidFer
                                    ? 'Feriado'
                                    : 'Fin de semana'
                              }
                            >
                              {outOfRange ? '—' : isInvalidFer ? 'F' : '·'}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleCell(p?.id, fStr)}
                              disabled={
                                isToggling || !p || p.estado === 'CERRADO' || !can('contratos.change_ausenciaruta')
                              }
                              className={`rutas-detail-matrix__cell${isAus ? ' is-aus' : ''}`}
                              title={isAus ? 'Marcar como TRABAJADO' : 'Marcar como AUSENTE'}
                            >
                              {isToggling ? (
                                '…'
                              ) : isAus ? (
                                <Icon name="close" size="sm" />
                              ) : (
                                <Icon name="check" size="sm" />
                              )}
                            </button>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}
