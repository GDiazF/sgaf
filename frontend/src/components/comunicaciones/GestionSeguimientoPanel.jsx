import React, { useEffect, useState } from 'react'
import { Badge, Button, Field, Input, Icon } from '@slep/ui'

const TABS = [
  { id: 'descripcion', label: 'Descripción', icon: 'file' },
  { id: 'pasos', label: 'Pasos', icon: 'procedimientos' },
  { id: 'historial', label: 'Historial', icon: 'clock' },
]

const ESTADO_BADGE = {
  PENDIENTE: { variant: 'danger', label: 'Pendiente' },
  EN_PROCESO: { variant: 'warning', label: 'En proceso' },
  RESPONDIDO: { variant: 'accent', label: 'Respondido' },
  CERRADO: { variant: 'success', label: 'Cerrado' },
}

export default function GestionSeguimientoPanel({
  gestion,
  newPaso,
  onNewPasoChange,
  onAddPaso,
  onToggleSubtarea,
  canEditPasos = true,
  lockedReason = '',
  /** En drawer admin: sin cabecera duplicada (requerimiento/estado ya van arriba) */
  hideHeader = false,
}) {
  const [activeTab, setActiveTab] = useState('descripcion')

  useEffect(() => {
    setActiveTab('descripcion')
  }, [gestion.id])

  const pasosCount = gestion.subtareas?.length || 0
  const historialCount = gestion.historial?.length || 0
  const estadoMeta = ESTADO_BADGE[gestion.estado] || {
    variant: 'neutral',
    label: gestion.estado,
  }

  return (
    <div
      className={`comunicaciones-seguimiento${hideHeader ? ' comunicaciones-seguimiento--embedded' : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="comunicaciones-seguimiento__card">
        {!hideHeader ? (
          <div className="comunicaciones-seguimiento__head">
            <div className="comunicaciones-seguimiento__head-text">
              <p className="comunicaciones-seguimiento__eyebrow">Seguimiento de atención</p>
              <p className="comunicaciones-seguimiento__title">{gestion.requerimiento}</p>
            </div>
            <Badge variant={estadoMeta.variant}>{estadoMeta.label}</Badge>
          </div>
        ) : null}

        <div className="tabs comunicaciones-seguimiento__tabs">
          <ul className="tabs__list" role="tablist">
            {TABS.map((tab) => (
              <li key={tab.id}>
                <button
                  type="button"
                  role="tab"
                  className={`tabs__btn${activeTab === tab.id ? ' is-active' : ''}`}
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon name={tab.icon} size={14} />
                  {tab.label}
                  {tab.id === 'pasos' && pasosCount > 0 ? (
                    <Badge variant="accent">{pasosCount}</Badge>
                  ) : null}
                  {tab.id === 'historial' && historialCount > 0 ? (
                    <Badge variant="neutral">{historialCount}</Badge>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="comunicaciones-seguimiento__body">
          {activeTab === 'descripcion' ? (
            <div className="comunicaciones-seguimiento__blocks">
              <div>
                <p className="comunicaciones-seguimiento__label">Descripción</p>
                <div className="comunicaciones-seguimiento__box">
                  <p>{gestion.descripcion || 'Sin descripción registrada.'}</p>
                </div>
              </div>
              <div>
                <p className="comunicaciones-seguimiento__label">Respuesta</p>
                <div className="comunicaciones-seguimiento__box">
                  <p>{gestion.respuesta || 'Sin respuesta registrada.'}</p>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === 'pasos' ? (
            <div className="comunicaciones-seguimiento__pasos">
              <div className="comunicaciones-seguimiento__pasos-list">
                {gestion.subtareas?.length > 0 ? (
                  gestion.subtareas.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      className={`comunicaciones-seguimiento__paso${sub.completada ? ' is-done' : ''}`}
                      onClick={() => onToggleSubtarea(sub, gestion)}
                      disabled={!canEditPasos}
                    >
                      <Icon
                        name="check"
                        size={16}
                        className="comunicaciones-seguimiento__paso-icon"
                      />
                      <span>{sub.titulo}</span>
                    </button>
                  ))
                ) : (
                  <p className="comunicaciones-seguimiento__empty">No hay pasos registrados</p>
                )}
              </div>

              <form
                className="comunicaciones-seguimiento__paso-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!canEditPasos) return
                  onAddPaso()
                }}
              >
                <Field label="Nuevo paso" htmlFor={`paso-${gestion.id}`} className="field--full">
                  <Input
                    id={`paso-${gestion.id}`}
                    placeholder={canEditPasos ? 'Nuevo paso…' : 'Pasos bloqueados…'}
                    value={newPaso}
                    onChange={(e) => onNewPasoChange(e.target.value.toUpperCase())}
                    disabled={!canEditPasos}
                  />
                </Field>
                <Button type="submit" variant="primary" size="sm" disabled={!canEditPasos}>
                  <Icon name="plus" size="sm" />
                  Añadir
                </Button>
              </form>
              {!canEditPasos && lockedReason ? (
                <p className="comunicaciones-seguimiento__lock">{lockedReason}</p>
              ) : null}
            </div>
          ) : null}

          {activeTab === 'historial' ? (
            <div className="comunicaciones-seguimiento__historial">
              {gestion.historial?.length > 0 ? (
                <ol className="comunicaciones-seguimiento__timeline">
                  {gestion.historial.map((h) => (
                    <li key={h.id}>
                      <div className="comunicaciones-seguimiento__timeline-card">
                        <div className="comunicaciones-seguimiento__timeline-top">
                          <strong>{h.accion}</strong>
                          <time>
                            {new Date(h.fecha).toLocaleString('es-CL')}
                          </time>
                        </div>
                        <p className="comunicaciones-seguimiento__timeline-user">
                          {h.usuario_nombre}
                        </p>
                        {h.detalles ? (
                          <p className="comunicaciones-seguimiento__timeline-detail">
                            {h.detalles}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="comunicaciones-seguimiento__empty">
                  Sin movimientos en el historial
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
