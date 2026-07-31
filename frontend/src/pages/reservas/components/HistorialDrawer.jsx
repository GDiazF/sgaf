import React, { useMemo, useState } from 'react'
import {
  Drawer,
  Input,
  Select,
  Icon,
  IconButton,
  Badge,
  ConfirmModal,
  EmptyState,
} from '@slep/ui'
import { ESTADO_BADGE } from '../shared/constants'
import { fmtTime, fmtDateLong } from '../shared/dateUtils'

export default function HistorialDrawer({
  open,
  onClose,
  reservas,
  recursos,
  historySearch,
  setHistorySearch,
  historyFilterEstado,
  setHistoryFilterEstado,
  historyFilterRecurso,
  setHistoryFilterRecurso,
  historySort,
  setHistorySort,
  canForceDelete,
  onSelectReserva,
  onForceDelete,
}) {
  const [confirmDelete, setConfirmDelete] = useState(null)

  const filtered = useMemo(() => {
    let list = [...reservas]

    if (historyFilterEstado === 'HISTORIAL') {
      list = list.filter((r) => ['FINALIZADA', 'RECHAZADA', 'CANCELADA'].includes(r.estado))
    } else if (historyFilterEstado !== 'ALL_RECORDS') {
      list = list.filter((r) => r.estado === historyFilterEstado)
    }

    if (historyFilterRecurso !== 'all') {
      list = list.filter(
        (r) => parseInt(r.recurso, 10) === parseInt(historyFilterRecurso, 10),
      )
    }

    if (historySearch.trim()) {
      const q = historySearch.toLowerCase()
      list = list.filter(
        (r) =>
          r.titulo.toLowerCase().includes(q) ||
          (r.nombre_funcionario && r.nombre_funcionario.toLowerCase().includes(q)) ||
          (r.codigo_reserva && r.codigo_reserva.toLowerCase().includes(q)) ||
          (r.descripcion && r.descripcion.toLowerCase().includes(q)),
      )
    }

    list.sort((a, b) => {
      if (historySort === '-fecha_inicio')
        return new Date(b.fecha_inicio) - new Date(a.fecha_inicio)
      if (historySort === 'fecha_inicio')
        return new Date(a.fecha_inicio) - new Date(b.fecha_inicio)
      if (historySort === 'titulo') return a.titulo.localeCompare(b.titulo)
      return 0
    })

    return list
  }, [
    reservas,
    historyFilterEstado,
    historyFilterRecurso,
    historySearch,
    historySort,
  ])

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title="Historial de Reservas"
        wide
        bodyClassName="historial-drawer-body"
      >
        <div className="historial-drawer">
          <div className="historial-drawer__filters">
            <div className="historial-drawer__search">
              <Icon name="search" size={16} className="historial-drawer__search-icon" />
              <Input
                type="text"
                placeholder="Buscar por título, funcionario, código…"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                aria-label="Buscar en historial"
              />
            </div>

            <div className="historial-drawer__selects">
              <Select
                value={historyFilterEstado}
                onChange={(e) => setHistoryFilterEstado(e.target.value)}
                aria-label="Filtrar por estado"
              >
                <option value="HISTORIAL">Todos (Cerrados)</option>
                <option value="ALL_RECORDS">Todos (Incluso Activos)</option>
                <option value="PENDIENTE">Solo Pendientes</option>
                <option value="APROBADA">Solo Aprobadas</option>
                <option value="FINALIZADA">Solo Finalizadas</option>
                <option value="RECHAZADA">Solo Rechazadas</option>
                <option value="CANCELADA">Solo Canceladas</option>
              </Select>

              <Select
                value={historyFilterRecurso}
                onChange={(e) => setHistoryFilterRecurso(e.target.value)}
                aria-label="Filtrar por recurso"
              >
                <option value="all">Todos los Recursos</option>
                {recursos
                  .slice()
                  .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                    </option>
                  ))}
              </Select>
            </div>

            <div className="historial-drawer__toolbar">
              <span className="historial-drawer__count">
                {filtered.length}{' '}
                {filtered.length === 1 ? 'registro' : 'registros'}
              </span>
              <div className="segment-control historial-drawer__sort-control">
                {[
                  { v: '-fecha_inicio', l: 'Recientes' },
                  { v: 'fecha_inicio', l: 'Antiguos' },
                  { v: 'titulo', l: 'Título' },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    className={`segment-control__btn${historySort === opt.v ? ' is-active' : ''}`}
                    onClick={() => setHistorySort(opt.v)}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="historial-drawer__list">
            {filtered.length === 0 ? (
              <EmptyState
                icon={<Icon name="search" size={32} />}
                title="Sin resultados"
                description="Prueba otro término o cambia los filtros."
              />
            ) : (
              filtered.map((r) => {
                const rec = recursos.find((item) => item.id === r.recurso)
                const color = rec?.color || '#6366f1'
                const estado = (r.estado || '').toUpperCase()
                const badge = ESTADO_BADGE[estado] || ESTADO_BADGE.PENDIENTE
                const person = r.nombre_funcionario || 'Sin nombre'

                return (
                  <button
                    key={r.id}
                    type="button"
                    className={`historial-drawer__item historial-drawer__item--${badge.variant}`}
                    style={{ '--historial-accent': color }}
                    onClick={() => onSelectReserva(r)}
                  >
                    <div className="historial-drawer__item-head">
                      <span className="historial-drawer__item-resource">
                        <span className="historial-drawer__dot" aria-hidden />
                        <span className="historial-drawer__item-resource-name">
                          {rec?.nombre || 'Recurso'}
                        </span>
                      </span>
                      <span className="historial-drawer__item-actions">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        {canForceDelete ? (
                          <IconButton
                            type="button"
                            className="historial-drawer__delete"
                            aria-label="Eliminar permanentemente"
                            onClick={(e) => {
                              e.stopPropagation()
                              setConfirmDelete(r)
                            }}
                          >
                            <Icon name="trash" size={14} />
                          </IconButton>
                        ) : null}
                      </span>
                    </div>

                    <h4 className="historial-drawer__item-title" title={r.titulo}>
                      {r.titulo}
                    </h4>

                    <p className="historial-drawer__item-person" title={person}>
                      <Icon name="user" size={12} />
                      <span>{person}</span>
                    </p>

                    <div className="historial-drawer__item-foot">
                      <span className="historial-drawer__meta">
                        <Icon name="reservas" size={12} />
                        {fmtDateLong(r.fecha_inicio)}
                      </span>
                      <span className="historial-drawer__meta-sep" aria-hidden>
                        ·
                      </span>
                      <span className="historial-drawer__meta">
                        <Icon name="clock" size={12} />
                        {fmtTime(r.fecha_inicio)} – {fmtTime(r.fecha_fin)}
                      </span>
                      <span className="historial-drawer__code">
                        #{r.codigo_reserva || '---'}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </Drawer>

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (confirmDelete) await onForceDelete(confirmDelete)
          setConfirmDelete(null)
        }}
        title="Eliminar permanentemente"
        description={
          confirmDelete
            ? `¿Eliminar PERMANENTEMENTE la reserva "${confirmDelete.titulo}"? Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Eliminar"
        danger
      />
    </>
  )
}
