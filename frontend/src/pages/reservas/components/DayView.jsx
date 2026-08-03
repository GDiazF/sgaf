import React, { useEffect, useRef } from 'react'
import { Icon } from '@slep/ui'
import ReservationCard from './ReservationCard'
import { RECURSO_ICON_NAMES, SLOT_HEIGHT, SLOT_MIN } from '../shared/constants'
import {
  toDateStr,
  fmtDayShort,
  bloqueoAppliesToDate,
  layoutEvents,
} from '../shared/dateUtils'

export default function DayView({
  isCompact,
  currentDate,
  stripDays = [],
  todayStr,
  recursosFiltrados,
  filtroRecurso,
  reservas,
  bloqueos,
  settings,
  configStart,
  timeSlots,
  scrollRef,
  headerScrollRef,
  highlightedId,
  getReservasForDayAndRecurso,
  getDayResources,
  getEventPos,
  onSlotClick,
  onReservaClick,
  onSelectDate,
}) {
  const dayS = toDateStr(currentDate)
  const pickerRef = useRef(null)

  // Centrar el día activo / hoy en el strip (showcase centerStripOnSelected)
  useEffect(() => {
    if (!isCompact || !pickerRef.current) return
    const active = pickerRef.current.querySelector('.calendar-day-view__day-btn.is-active')
    if (!active) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const run = () => {
      const left =
        active.offsetLeft - pickerRef.current.clientWidth / 2 + active.offsetWidth / 2
      pickerRef.current.scrollTo({
        left: Math.max(0, left),
        behavior: reduced ? 'auto' : 'smooth',
      })
    }
    const t = window.setTimeout(run, 50)
    return () => clearTimeout(t)
  }, [isCompact, dayS, stripDays])

  if (isCompact) {
    const dayEvents =
      filtroRecurso === 'all'
        ? reservas.filter((r) => toDateStr(r.fecha_inicio) === dayS)
        : filtroRecurso.startsWith('tipo_')
          ? reservas.filter((r) => {
              if (toDateStr(r.fecha_inicio) !== dayS) return false
              const tipo = filtroRecurso.replace('tipo_', '')
              const rec = recursosFiltrados.find((x) => Number(x.id) === Number(r.recurso))
              return rec?.tipo === tipo
            })
          : reservas.filter(
              (r) =>
                toDateStr(r.fecha_inicio) === dayS &&
                Number(r.recurso) === parseInt(filtroRecurso, 10),
            )

    dayEvents.sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio))

    return (
      <div className="calendar-day-view is-active">
        <div className="calendar-week-strip">
          <div
            ref={pickerRef}
            className="calendar-day-view__picker calendar-day-view__picker--month"
            aria-label="Seleccionar día del mes"
          >
            {stripDays.map((day) => {
              const ds = toDateStr(day)
              const parts = fmtDayShort(day).split(' ')
              return (
                <button
                  key={ds}
                  type="button"
                  data-day-date={ds}
                  aria-selected={ds === dayS ? 'true' : 'false'}
                  className={`calendar-day-view__day-btn${ds === dayS ? ' is-active' : ''}${ds === todayStr ? ' is-today' : ''}${day.getDay() === 0 || day.getDay() === 6 ? ' is-weekend' : ''}`}
                  onClick={() => onSelectDate(day)}
                >
                  <span className="calendar-day-view__name">{parts[0]}</span>
                  <span className="calendar-day-view__num">{day.getDate()}</span>
                </button>
              )
            })}
          </div>
        </div>

        {dayEvents.length === 0 ? (
          <div className="calendar-day-resource__empty">
            <Icon name="reservas" size={32} />
            <p>Sin reservas para este día</p>
          </div>
        ) : (
          recursosFiltrados.map((rec) => {
            const events = dayEvents.filter((ev) => Number(ev.recurso) === Number(rec.id))
            if (!events.length) return null
            const color = rec.color || '#6366f1'
            const iconName = RECURSO_ICON_NAMES[rec.tipo] || 'box'

            return (
              <div
                key={rec.id}
                className="calendar-day-resource"
                data-resource-id={rec.id}
                style={{ '--resource-color': color }}
              >
                <div className="calendar-day-resource__head">
                  <Icon name={iconName} size={16} style={{ color }} />
                  <span className="calendar-day-resource__name">{rec.nombre}</span>
                </div>
                <div className="calendar-day-resource__body">
                  {events.map((ev) => (
                    <ReservationCard
                      key={ev.id}
                      reserva={ev}
                      color={color}
                      highlighted={Number(ev.id) === Number(highlightedId)}
                      onClick={() => onReservaClick(ev)}
                    />
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    )
  }

  return (
    <div className="calendar-day-view is-active">
      <div className="calendar-week-strip">
        <div
          className="calendar-day-view__picker calendar-day-view__picker--month calendar-day-view__picker--fill"
          aria-label="Seleccionar día del mes"
        >
          {stripDays.map((day) => {
            const ds = toDateStr(day)
            const parts = fmtDayShort(day).split(' ')
            return (
              <button
                key={ds}
                type="button"
                data-day-date={ds}
                aria-selected={ds === dayS ? 'true' : 'false'}
                className={`calendar-day-view__day-btn${ds === dayS ? ' is-active' : ''}${ds === todayStr ? ' is-today' : ''}${day.getDay() === 0 || day.getDay() === 6 ? ' is-weekend' : ''}`}
                onClick={() => onSelectDate(day)}
              >
                <span className="calendar-day-view__name">{parts[0]}</span>
                <span className="calendar-day-view__num">{day.getDate()}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div
        ref={headerScrollRef}
        style={{ flexShrink: 0, overflowX: 'auto', borderBottom: '1px solid var(--border)' }}
        onScroll={(e) => {
          if (scrollRef.current) scrollRef.current.scrollLeft = e.target.scrollLeft
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `64px repeat(${getDayResources().length}, minmax(160px, 1fr))`,
            minWidth: '100%',
          }}
        >
          <div
            style={{
              padding: '8px',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--muted)',
              borderRight: '1px solid var(--border)',
            }}
          >
            Hora
          </div>
          {getDayResources().map((rec) => {
            const color = rec.color || '#6366f1'
            const iconName = RECURSO_ICON_NAMES[rec.tipo] || 'box'
            return (
              <div
                key={rec.id}
                style={{
                  padding: '8px 10px',
                  borderRight: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  minWidth: 0,
                }}
              >
                <Icon name={iconName} size={14} style={{ color, flexShrink: 0 }} />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {rec.nombre}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div
        ref={scrollRef}
        style={{ flex: 1, overflow: 'auto', minHeight: 0 }}
        onScroll={(e) => {
          if (headerScrollRef.current) {
            headerScrollRef.current.scrollLeft = e.target.scrollLeft
          }
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `64px repeat(${getDayResources().length}, minmax(160px, 1fr))`,
            minWidth: '100%',
            position: 'relative',
          }}
        >
          <div style={{ position: 'relative' }}>
            {timeSlots.map((slot) => (
              <div
                key={slot}
                style={{
                  height: SLOT_HEIGHT,
                  borderBottom: '1px solid var(--separator)',
                  fontSize: 10,
                  color: 'var(--muted)',
                  padding: '2px 6px',
                  boxSizing: 'border-box',
                }}
              >
                {slot.endsWith(':00') ? slot : ''}
              </div>
            ))}
          </div>

          {getDayResources().map((rec) => {
            const color = rec.color || '#6366f1'
            const dayEvents = getReservasForDayAndRecurso(currentDate, rec.id)
            const dayBloqueos = bloqueos.filter(
              (b) =>
                parseInt(b.recurso, 10) === parseInt(rec.id, 10) &&
                bloqueoAppliesToDate(b, dayS),
            )
            const laid = layoutEvents(dayEvents)

            return (
              <div
                key={rec.id}
                style={{
                  position: 'relative',
                  borderRight: '1px solid var(--border)',
                  minHeight: timeSlots.length * SLOT_HEIGHT,
                }}
              >
                {timeSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className="calendar-grid__slot"
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: ((parseInt(slot.split(':')[0], 10) * 60 +
                        parseInt(slot.split(':')[1], 10) -
                        configStart * 60) /
                        SLOT_MIN) *
                        SLOT_HEIGHT,
                      height: SLOT_HEIGHT,
                      border: 'none',
                      borderBottom: '1px solid var(--separator)',
                      background: 'transparent',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    onClick={() => onSlotClick(currentDate, slot, rec.id)}
                    aria-label={`${slot} ${rec.nombre}`}
                  />
                ))}

                {dayBloqueos.map((b) => {
                  const bStart =
                    parseInt(b.hora_inicio.split(':')[0], 10) * 60 +
                    parseInt(b.hora_inicio.split(':')[1], 10)
                  const bEnd =
                    parseInt(b.hora_fin.split(':')[0], 10) * 60 +
                    parseInt(b.hora_fin.split(':')[1], 10)
                  const top = ((bStart - configStart * 60) / SLOT_MIN) * SLOT_HEIGHT
                  const height = Math.max(((bEnd - bStart) / SLOT_MIN) * SLOT_HEIGHT, 16)
                  return (
                    <div
                      key={b.id}
                      className="calendar-day-bloqueo"
                      style={{ top, height }}
                      title={b.motivo || 'Bloqueo'}
                    >
                      <span className="calendar-day-bloqueo__label">
                        {b.motivo || 'Bloqueo'}
                      </span>
                    </div>
                  )
                })}

                {laid.map(({ ev, colIndex, colCount }) => {
                  const { top, height } = getEventPos(ev)
                  const widthPct = 100 / colCount
                  const leftPct = colIndex * widthPct
                  return (
                    <div
                      key={ev.id}
                      style={{
                        position: 'absolute',
                        top,
                        height,
                        left: `calc(${leftPct}% + 2px)`,
                        width: `calc(${widthPct}% - 4px)`,
                        zIndex: 2,
                      }}
                    >
                      <ReservationCard
                        reserva={ev}
                        color={color}
                        compact
                        highlighted={Number(ev.id) === Number(highlightedId)}
                        onClick={() => onReservaClick(ev)}
                      />
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
