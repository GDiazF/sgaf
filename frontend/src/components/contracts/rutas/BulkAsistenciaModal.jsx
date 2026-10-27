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

function proveedorKey(ruta) {
  return ruta.proveedor != null && ruta.proveedor !== '' ? String(ruta.proveedor) : 'sin'
}

export default function BulkAsistenciaModal({ open, onClose, rutas, onUpdate, rowLabel = 'Rutas' }) {
  const { can } = usePermission()
  const [selectedPeriodName, setSelectedPeriodName] = useState('')
  const [proveedorFilter, setProveedorFilter] = useState('')
  const [selectedRutaId, setSelectedRutaId] = useState(null)
  const [feriados, setFeriados] = useState([])
  const [togglingId, setTogglingId] = useState(null)
  const [rutaSort, setRutaSort] = useState({ key: 'nombre', direction: 'asc' })
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
      setProveedorFilter('')
      setSelectedRutaId(null)
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

  const proveedorOptions = useMemo(() => {
    const map = new Map()
    applicableRutas.forEach((r) => {
      const key = proveedorKey(r)
      if (!map.has(key)) {
        map.set(key, r.proveedor_nombre || 'Sin proveedor')
      }
    })
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }))
  }, [applicableRutas])

  const filteredRutas = useMemo(() => {
    if (!proveedorFilter) return applicableRutas
    return applicableRutas.filter((r) => proveedorKey(r) === proveedorFilter)
  }, [applicableRutas, proveedorFilter])

  const sortedApplicableRutas = useMemo(() => {
    const items = [...filteredRutas]
    const dir = rutaSort.direction === 'asc' ? 1 : -1
    items.sort((a, b) => {
      const aVal = (rutaSort.key === 'proveedor' ? a.proveedor_nombre : a.nombre) || ''
      const bVal = (rutaSort.key === 'proveedor' ? b.proveedor_nombre : b.nombre) || ''
      return aVal.localeCompare(bVal, 'es', { sensitivity: 'base' }) * dir
    })
    return items
  }, [filteredRutas, rutaSort])

  useEffect(() => {
    if (selectedRutaId == null) return
    if (!sortedApplicableRutas.some((r) => r.id === selectedRutaId)) {
      setSelectedRutaId(null)
    }
  }, [sortedApplicableRutas, selectedRutaId])

  const toggleRutaSort = (key) => {
    setRutaSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )
  }

  const diasGrid = useMemo(() => {
    if (!selectedPeriodName || sortedApplicableRutas.length === 0) return []
    let minStart = null
    let maxEnd = null
    sortedApplicableRutas.forEach((ruta) => {
      const p = periodoForRuta(ruta, selectedPeriodName)
      if (!p) return
      const start = parseISO(String(p.fecha_inicio).slice(0, 10))
      const end = parseISO(String(p.fecha_fin).slice(0, 10))
      if (!minStart || start < minStart) minStart = start
      if (!maxEnd || end > maxEnd) maxEnd = end
    })
    if (!minStart || !maxEnd) return []
    return eachDayOfInterval({ start: minStart, end: maxEnd })
  }, [selectedPeriodName, sortedApplicableRutas])

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
    sortedApplicableRutas.forEach((r) => {
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
      const firstRuta = sortedApplicableRutas.find((r) =>
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

  const handleSelectRow = (rutaId) => {
    setSelectedRutaId((prev) => (prev === rutaId ? null : rutaId))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Planilla de asistencia"
      subheader={`Marca inasistencias en todos los ${rowLabel.toLowerCase()} del periodo · clic en el día = toda la columna`}
      className="rutas-detail-modal--sheet"
      afterHeader={
        <div className="rutas-detail-matrix-toolbar">
          <Field label="Periodo" htmlFor="bulk-asist-periodo">
            <Select
              id="bulk-asist-periodo"
              value={selectedPeriodName}
              onChange={(e) => {
                setSelectedPeriodName(e.target.value)
                setProveedorFilter('')
                setSelectedRutaId(null)
              }}
            >
              <option value="">— Elige un periodo —</option>
              {availablePeriodNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Proveedor" htmlFor="bulk-asist-proveedor">
            <Select
              id="bulk-asist-proveedor"
              value={proveedorFilter}
              onChange={(e) => {
                setProveedorFilter(e.target.value)
                setSelectedRutaId(null)
              }}
              disabled={!selectedPeriodName || proveedorOptions.length === 0}
            >
              <option value="">Todos los proveedores</option>
              {proveedorOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      }
      footer={
        <div className="rutas-detail-matrix-legend rutas-detail-matrix-legend--footer">
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
          <div className="rutas-detail-matrix-legend__item rutas-detail-matrix-legend__item--hint">
            <Icon name="info" size="sm" /> Clic en el nombre de la fila para fijarla · hover resalta
          </div>
        </div>
      }
    >
      {!selectedPeriodName ? (
        <div className="rutas-detail-matrix-empty">
          <EmptyState
            title="Selecciona un periodo"
            description="Para cargar la planilla de asistencia."
          />
        </div>
      ) : sortedApplicableRutas.length === 0 ? (
        <div className="rutas-detail-matrix-empty">
          <EmptyState
            title={proveedorFilter ? 'Sin líneas de ese proveedor' : `Sin ${rowLabel.toLowerCase()}`}
            description={
              proveedorFilter
                ? 'Prueba con «Todos los proveedores» o elige otro periodo.'
                : 'No hay periodos con ese nombre en las líneas cargadas.'
            }
          />
        </div>
      ) : (
        <div className="rutas-detail-matrix-wrap">
          <table className="rutas-detail-matrix">
            <thead>
              <tr>
                <th className="rutas-detail-matrix__sticky">
                  <button
                    type="button"
                    className="rutas-detail-matrix__sort"
                    onClick={() => toggleRutaSort('nombre')}
                    title="Ordenar por nombre"
                  >
                    <span className="rutas-detail-matrix__sort-label">
                      {rowLabel} ({sortedApplicableRutas.length})
                      {rutaSort.key === 'nombre'
                        ? rutaSort.direction === 'asc'
                          ? ' ↑'
                          : ' ↓'
                        : ''}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="rutas-detail-matrix__sort"
                    onClick={() => toggleRutaSort('proveedor')}
                    title="Ordenar por proveedor"
                  >
                    <span className="rutas-detail-matrix__sort-label rutas-detail-matrix__sort-label--accent">
                      Proveedor
                      {rutaSort.key === 'proveedor'
                        ? rutaSort.direction === 'asc'
                          ? ' ↑'
                          : ' ↓'
                        : ''}
                    </span>
                  </button>
                </th>
                {diasGrid.map((fecha) => {
                  const fStr = format(fecha, 'yyyy-MM-dd')
                  const isSem = isWeekend(fecha)
                  const isFer = feriados.includes(fStr)
                  const isTogglingCol = togglingId === `col-${fStr}`

                  return (
                    <th
                      key={fecha.toString()}
                      className={isSem ? 'is-weekend' : undefined}
                      onClick={() =>
                        can('contratos.change_ausenciaruta') && handleToggleColumn(fecha)
                      }
                    >
                      <div className="rutas-detail-matrix__dayhead">
                        {isTogglingCol ? (
                          <span>…</span>
                        ) : (
                          <>
                            <span>
                              {format(fecha, 'EEE', { locale: es }).substring(0, 2)}
                            </span>
                            <span className={isFer ? 'is-feriado' : undefined}>
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
              {sortedApplicableRutas.map((ruta) => {
                const p = periodoForRuta(ruta, selectedPeriodName)
                const isSelected = selectedRutaId === ruta.id
                return (
                  <tr
                    key={ruta.id}
                    className={isSelected ? 'is-selected' : undefined}
                  >
                    <td className="rutas-detail-matrix__sticky">
                      <button
                        type="button"
                        className="rutas-detail-matrix__row-select"
                        onClick={() => handleSelectRow(ruta.id)}
                        title={
                          isSelected
                            ? 'Quitar selección de fila'
                            : 'Seleccionar fila para seguir el horario'
                        }
                        aria-pressed={isSelected}
                      >
                        <strong className="rutas-detail-matrix__row-name">{ruta.nombre}</strong>
                        <span className="rutas-detail-matrix__row-prov">
                          {ruta.proveedor_nombre || 'Sin proveedor'}
                        </span>
                        {ruta.itinerario ? (
                          <span className="rutas-detail-matrix__row-itin" title={ruta.itinerario}>
                            {ruta.itinerario}
                          </span>
                        ) : null}
                      </button>
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
                                isToggling ||
                                !p ||
                                p.estado === 'CERRADO' ||
                                !can('contratos.change_ausenciaruta')
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
