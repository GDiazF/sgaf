import React from 'react'
import { Icon, IconButton } from '@slep/ui'
import ReservationCard from './ReservationCard'
import { RECURSO_ICON_NAMES, TYPE_LABELS } from '../shared/constants'
import { toDateStr, fmtDayShort, hexToRgba, contrastOnFill, bloqueoAppliesToDate } from '../shared/dateUtils'

export default function WeekView({
  weekScrollRef,
  visibleDays,
  todayStr,
  recursosFiltrados,
  bloqueos,
  settings,
  canBypass,
  /** Override por recurso (público: dias_antelacion). Default: settings.dias_bloqueo_antelacion */
  getAntelacionDays,
  highlightedId,
  getReservasForDayAndRecurso,
  onSlotClick,
  onReservaClick,
}) {
  return (
    <div className="calendar-grid-wrap">
      <div ref={weekScrollRef} className="calendar-grid-scroll">
        <div className="calendar-grid">
          <div className="calendar-grid__head">
            <div className="calendar-grid__corner">
              <span className="calendar-grid__corner-label">Recurso / Fecha</span>
            </div>
            {visibleDays.map((day) => {
              const dayS = toDateStr(day)
              const parts = fmtDayShort(day).split(' ')
              return (
                <div
                  key={dayS}
                  id={`week-day-col-${dayS}`}
                  className={`calendar-grid__day${dayS === todayStr ? ' is-today' : ''}${day.getDay() === 0 || day.getDay() === 6 ? ' is-weekend' : ''}`}
                >
                  <div className="calendar-grid__day-name">{parts[0]}</div>
                  <div className="calendar-grid__day-num">{day.getDate()}</div>
                </div>
              )
            })}
          </div>

          {recursosFiltrados.map((rec) => {
            const iconName = RECURSO_ICON_NAMES[rec.tipo] || 'box'
            const color = rec.color || '#6366f1'

            return (
              <div
                key={rec.id}
                className="calendar-grid__row"
                data-resource-row
                data-resource-id={rec.id}
                style={{
                  '--resource-color': color,
                  '--resource-color-pending': hexToRgba(color, 0.12),
                  '--resource-on-fill': contrastOnFill(color),
                }}
              >
                <div
                  className="calendar-grid__resource"
                  style={{ '--resource-color': color }}
                >
                  <div className="calendar-grid__resource-icon">
                    <Icon name={iconName} size={18} />
                  </div>
                  <div>
                    <div className="calendar-grid__resource-name" title={rec.nombre}>
                      {rec.nombre}
                    </div>
                    <div className="calendar-grid__resource-cat">
                      {TYPE_LABELS[rec.tipo] || rec.tipo}
                    </div>
                  </div>
                </div>

                {visibleDays.map((day) => {
                  const dayS = toDateStr(day)
                  const dayEvents = getReservasForDayAndRecurso(day, rec.id)
                  const dayBloqueos = bloqueos.filter(
                    (b) =>
                      Number(b.recurso) === Number(rec.id) &&
                      bloqueoAppliesToDate(b, dayS),
                  )

                  const x =
                    typeof getAntelacionDays === 'function'
                      ? Number(getAntelacionDays(rec)) || 0
                      : settings.dias_bloqueo_antelacion || 0
                  const limit = new Date()
                  limit.setHours(0, 0, 0, 0)
                  limit.setDate(limit.getDate() + x)
                  const isDayBlocked = day <= limit && !canBypass

                  return (
                    <div
                      key={dayS}
                      className={`calendar-grid__cell${dayS === todayStr ? ' is-today' : ''}${day.getDay() === 0 || day.getDay() === 6 ? ' is-weekend' : ''}${isDayBlocked ? ' is-blocked' : ''}`}
                      data-day-index={visibleDays.indexOf(day)}
                      onClick={() => !isDayBlocked && onSlotClick(day, '', rec.id)}
                      role="presentation"
                    >
                      {isDayBlocked ? (
                        <div className="calendar-grid__cell-blocked" aria-hidden />
                      ) : null}

                      {dayBloqueos.map((b) => (
                        <div
                          key={b.id}
                          className="reservation-card reservation-card--status-blocked reservation-card--compact"
                        >
                          <Icon name="lock" size={12} className="reservation-card__status-icon" />
                          <div className="reservation-card__body">
                            <div className="reservation-card__header">
                              <span className="reservation-card__time">
                                {b.hora_inicio.slice(0, 5)} – {b.hora_fin.slice(0, 5)}
                              </span>
                            </div>
                            <p className="reservation-card__title">{b.motivo || 'Bloqueado'}</p>
                          </div>
                        </div>
                      ))}

                      {dayEvents
                        .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))
                        .map((ev) => (
                          <ReservationCard
                            key={ev.id}
                            reserva={ev}
                            color={color}
                            highlighted={Number(ev.id) === Number(highlightedId)}
                            compact
                            onClick={(e) => {
                              e.stopPropagation()
                              onReservaClick(ev)
                            }}
                          />
                        ))}

                      {!isDayBlocked &&
                      !dayBloqueos.some(
                        (b) => b.hora_inicio <= '09:00' && b.hora_fin >= '18:00',
                      ) ? (
                        <div className="calendar-grid__cell-add">
                          <IconButton
                            type="button"
                            className="calendar-grid__cell-add-btn"
                            aria-label="Nueva reserva"
                            onClick={(e) => {
                              e.stopPropagation()
                              onSlotClick(day, '', rec.id)
                            }}
                          >
                            <Icon name="plus" size={16} />
                          </IconButton>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
