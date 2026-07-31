import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  PageHeader,
  Button,
  IconButton,
  Icon,
  Alert,
} from '@slep/ui'
import WeekView from './components/WeekView'
import DayView from './components/DayView'
import NuevaReservaModal from './components/NuevaReservaModal'
import PublicManageModal from './public/PublicManageModal'
import publicApi from './public/publicApi'
import {
  RECURSO_ICON_NAMES,
  TYPE_LABELS,
  SLOT_MIN,
  SLOT_HEIGHT,
  sortByType,
} from './shared/constants'
import {
  toDateStr,
  addDays,
  dtMinutes,
  hexToRgba,
  bloqueoAppliesToDate,
  buildTimeSlots,
  weekDaysFrom,
  monthDaysFrom,
  fmtPeriodLabel,
} from './shared/dateUtils'

const emptyForm = () => ({
  recurso: '',
  titulo: '',
  nombre_funcionario: '',
  email_contacto: '',
  descripcion: '',
  fecha: toDateStr(new Date()),
  horaInicio: '09:00',
  horaFin: '10:00',
})

export default function PublicReservas() {
  const [recursos, setRecursos] = useState([])
  const [reservas, setReservas] = useState([])
  const [bloqueos, setBloqueos] = useState([])
  const [settings, setSettings] = useState({
    hora_inicio: '07:00',
    hora_fin: '18:00',
    dias_bloqueo_antelacion: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const { slots: TIME_SLOTS, configStart } = useMemo(
    () => buildTimeSlots(settings.hora_inicio, settings.hora_fin),
    [settings.hora_inicio, settings.hora_fin],
  )

  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [viewMode, setViewMode] = useState('week')
  const [filtroRecurso, setFiltroRecurso] = useState('all')
  const [slotBloqueadoMsg, setSlotBloqueadoMsg] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [formData, setFormData] = useState(emptyForm)
  const [honeypot, setHoneypot] = useState('')
  const [formTipo, setFormTipo] = useState('')

  const [manageOpen, setManageOpen] = useState(false)
  const [manageInitial, setManageInitial] = useState(null)

  const scrollRef = useRef(null)
  const weekScrollRef = useRef(null)
  const headerScrollRef = useRef(null)

  const [isCompact, setIsCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches,
  )
  const [layout, setLayout] = useState(() => {
    if (typeof window === 'undefined') return 'desktop'
    if (window.matchMedia('(max-width: 1023px)').matches) {
      return window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'tablet'
    }
    return 'desktop'
  })

  useEffect(() => {
    const mqCompact = window.matchMedia('(max-width: 1023px)')
    const mqMobile = window.matchMedia('(max-width: 767px)')
    const sync = () => {
      const compact = mqCompact.matches
      setIsCompact(compact)
      setLayout(compact ? (mqMobile.matches ? 'mobile' : 'tablet') : 'desktop')
      if (compact) setViewMode('day')
    }
    sync()
    mqCompact.addEventListener('change', sync)
    mqMobile.addEventListener('change', sync)
    return () => {
      mqCompact.removeEventListener('change', sync)
      mqMobile.removeEventListener('change', sync)
    }
  }, [])

  const effectiveView = isCompact ? 'day' : viewMode
  const todayStr = toDateStr(new Date())

  const fetchData = useCallback(async ({ silent = false } = {}) => {
    const showSpin = !silent
    const startedAt = showSpin ? Date.now() : 0
    if (showSpin) {
      setRefreshing(true)
      setLoading(true)
    }
    try {
      const dStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
      const dEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 4, 0)
      const [rRes, sRes, tRes, bRes] = await Promise.all([
        publicApi.get('reservas/recursos/'),
        publicApi.get(
          `reservas/solicitudes/?fecha_inicio__gte=${toDateStr(dStart)}&fecha_inicio__lte=${toDateStr(dEnd)}`,
        ),
        publicApi
          .get('reservas/settings/')
          .catch(() => ({
            data: { hora_inicio: '07:00', hora_fin: '18:00', dias_bloqueo_antelacion: 0 },
          })),
        publicApi.get('reservas/bloqueos/').catch(() => ({ data: [] })),
      ])
      setRecursos(rRes.data?.results || (Array.isArray(rRes.data) ? rRes.data : []))
      setReservas(sRes.data?.results || (Array.isArray(sRes.data) ? sRes.data : []))
      setBloqueos(bRes.data?.results || (Array.isArray(bRes.data) ? bRes.data : []))
      if (tRes.data) setSettings(tRes.data)
    } catch (e) {
      console.error('Error fetching public data:', e)
    } finally {
      if (showSpin) {
        const elapsed = Date.now() - startedAt
        if (elapsed < 750) await new Promise((r) => setTimeout(r, 750 - elapsed))
        setRefreshing(false)
        setLoading(false)
      }
    }
  }, [currentDate])

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => fetchData({ silent: true }), 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const visibleDays = useMemo(
    () => (effectiveView === 'week' ? weekDaysFrom(currentDate) : [currentDate]),
    [effectiveView, currentDate],
  )
  const stripDays = useMemo(() => monthDaysFrom(currentDate), [currentDate])

  useEffect(() => {
    if (isCompact || effectiveView !== 'week' || loading) return
    const container = weekScrollRef.current
    if (!container) return
    const weekDates = visibleDays.map((d) => toDateStr(d))
    const target = weekDates.includes(todayStr) ? todayStr : toDateStr(currentDate)
    const t = window.setTimeout(() => {
      const col = container.querySelector(`#week-day-col-${target}`)
      if (!col) return
      container.scrollTo({ left: Math.max(0, col.offsetLeft - 80), behavior: 'smooth' })
    }, 120)
    return () => clearTimeout(t)
  }, [isCompact, effectiveView, loading, currentDate, todayStr, visibleDays])

  // Auto-ajuste de horas en el modal de solicitud
  useEffect(() => {
    if (!modalOpen || !formData.fecha) return
    const resDia = formData.recurso
      ? reservas.filter(
          (r) =>
            Number(r.recurso) === Number(formData.recurso) &&
            r.estado === 'APROBADA' &&
            toDateStr(r.fecha_inicio) === formData.fecha,
        )
      : []
    const getMins = (s) => {
      const [h, m] = String(s || '0:0').split(':').map(Number)
      return h * 60 + m
    }
    const now = new Date()
    const nowHourStart = now.getHours() * 60
    const nowMins = nowHourStart + now.getMinutes()
    const esHoy = formData.fecha === todayStr
    const mInicio = getMins(formData.horaInicio)
    const ocupado = resDia.some(
      (r) => mInicio >= dtMinutes(r.fecha_inicio) && mInicio < dtMinutes(r.fecha_fin),
    )
    const pasado = esHoy && mInicio < nowHourStart

    let nextInicio = formData.horaInicio
    if (ocupado || pasado) {
      const libre = TIME_SLOTS.find((s) => {
        const m = getMins(s)
        if (esHoy && m < nowHourStart) return false
        return !resDia.some(
          (r) => m >= dtMinutes(r.fecha_inicio) && m < dtMinutes(r.fecha_fin),
        )
      })
      if (libre) nextInicio = libre
    }

    const mAct = getMins(nextInicio)
    const mFin = getMins(formData.horaFin)
    const saltando = resDia.some((r) => {
      const ri = dtMinutes(r.fecha_inicio)
      return ri >= mAct && ri < mFin
    })
    const finEnPasado = esHoy && mFin <= nowMins

    let nextFin = formData.horaFin
    if (mFin <= mAct || saltando || finEnPasado || nextInicio !== formData.horaInicio) {
      const sig = TIME_SLOTS.find((s) => {
        const m = getMins(s)
        if (m <= mAct) return false
        if (esHoy && m <= nowMins) return false
        return true
      })
      if (sig) nextFin = sig
      else {
        const hf = settings.hora_fin.slice(0, 5)
        if (getMins(hf) > mAct && (!esHoy || getMins(hf) > nowMins)) nextFin = hf
      }
    }

    if (nextInicio !== formData.horaInicio || nextFin !== formData.horaFin) {
      setFormData((p) => ({ ...p, horaInicio: nextInicio, horaFin: nextFin }))
    }
  }, [
    formData.recurso,
    formData.fecha,
    formData.horaInicio,
    formData.horaFin,
    modalOpen,
    reservas,
    todayStr,
    TIME_SLOTS,
    settings.hora_fin,
  ])

  const reservasBuckets = useMemo(() => {
    const buckets = {}
    if (!Array.isArray(reservas)) return buckets
    reservas.forEach((r) => {
      const estado = (r.estado || '').toUpperCase()
      if (estado !== 'PENDIENTE' && estado !== 'APROBADA' && estado !== 'FINALIZADA') return
      const key = `${r.recurso}_${toDateStr(r.fecha_inicio)}`
      if (!buckets[key]) buckets[key] = []
      buckets[key].push(r)
    })
    return buckets
  }, [reservas])

  const recursosFiltrados = useMemo(() => {
    let list
    if (filtroRecurso === 'all') list = recursos
    else if (filtroRecurso.startsWith('tipo_')) {
      const tipo = filtroRecurso.replace('tipo_', '')
      list = recursos.filter((r) => r.tipo === tipo)
    } else list = recursos.filter((r) => r.id === parseInt(filtroRecurso, 10))
    return Array.isArray(list) ? list.slice().sort(sortByType) : []
  }, [recursos, filtroRecurso])

  const tiposPresentes = useMemo(
    () => [...new Set(recursos.slice().sort(sortByType).map((r) => r.tipo))],
    [recursos],
  )
  const recursosPorTipo = useMemo(
    () =>
      tiposPresentes.reduce((acc, tipo) => {
        acc[tipo] = recursos.filter((r) => r.tipo === tipo).sort(sortByType)
        return acc
      }, {}),
    [recursos, tiposPresentes],
  )

  const getReservasForDayAndRecurso = (day, recursoId) =>
    reservasBuckets[`${recursoId}_${toDateStr(day)}`] || []

  const getDayResources = () => recursosFiltrados

  const getEventPos = (ev) => {
    const startMin = dtMinutes(ev.fecha_inicio)
    const endMin = dtMinutes(ev.fecha_fin)
    const top = ((startMin - configStart * 60) / SLOT_MIN) * SLOT_HEIGHT
    const height = Math.max(((endMin - startMin) / SLOT_MIN) * SLOT_HEIGHT, 24)
    return { top, height }
  }

  const getAntelacionDays = (rec) => Number(rec?.dias_antelacion) || 0

  const handleNav = (dir) => {
    const d = new Date(currentDate)
    if (isCompact || effectiveView === 'day') {
      d.setMonth(d.getMonth() + dir)
      d.setDate(1)
    } else {
      d.setDate(d.getDate() + dir * 7)
    }
    setCurrentDate(d)
  }

  const handleSetViewMode = (v) => {
    if (isCompact && v === 'week') return
    setViewMode(v)
  }

  const handleSlotClick = (day, slotTime, recursoId) => {
    const rec = recursos.find((r) => r.id === recursoId)
    const x = getAntelacionDays(rec)
    const limit = new Date()
    limit.setHours(0, 0, 0, 0)
    limit.setDate(limit.getDate() + x)
    const dayStr = toDateStr(day)

    if (day <= limit) {
      setSlotBloqueadoMsg(
        `Este recurso requiere ${x} días de antelación. Bloqueado hasta el ${addDays(limit, 1).toLocaleDateString('es-CL')}.`,
      )
      setTimeout(() => setSlotBloqueadoMsg(''), 3500)
      return
    }

    let actualSlot = slotTime || '09:00'
    if (recursoId) {
      const dayEvents = reservas.filter(
        (r) =>
          parseInt(r.recurso, 10) === parseInt(recursoId, 10) &&
          r.estado === 'APROBADA' &&
          toDateStr(r.fecha_inicio) === dayStr,
      )
      const dayBloqueos = bloqueos.filter(
        (b) =>
          parseInt(b.recurso, 10) === parseInt(recursoId, 10) &&
          bloqueoAppliesToDate(b, dayStr),
      )
      const isOccupied = (time) => {
        const [h, m] = time.split(':').map(Number)
        const sStart = h * 60 + m
        const sEnd = sStart + SLOT_MIN
        const hasReserva = dayEvents.some(
          (r) => dtMinutes(r.fecha_inicio) < sEnd && dtMinutes(r.fecha_fin) > sStart,
        )
        const hasBloqueo = dayBloqueos.some((b) => {
          const bStart =
            parseInt(b.hora_inicio.split(':')[0], 10) * 60 +
            parseInt(b.hora_inicio.split(':')[1], 10)
          const bEnd =
            parseInt(b.hora_fin.split(':')[0], 10) * 60 +
            parseInt(b.hora_fin.split(':')[1], 10)
          return bStart < sEnd && bEnd > sStart
        })
        return hasReserva || hasBloqueo
      }
      if (isOccupied(actualSlot)) {
        const firstFree = TIME_SLOTS.find((s) => !isOccupied(s))
        if (firstFree) actualSlot = firstFree
      }
    }

    const [h, m] = actualSlot.split(':').map(Number)
    const endH = m === 30 ? h + 1 : h
    const endM = m === 30 ? 0 : 30
    setFormTipo(rec?.tipo || '')
    setFormData({
      ...emptyForm(),
      recurso: recursoId || '',
      fecha: dayStr,
      horaInicio: actualSlot,
      horaFin: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
    })
    setHoneypot('')
    setModalOpen(true)
  }

  const openNewReserva = () => {
    setFormTipo('')
    setFormData(emptyForm())
    setHoneypot('')
    setModalOpen(true)
  }

  const handleSaveReserva = async () => {
    if (honeypot) return
    await publicApi.post('reservas/solicitudes/', {
      ...formData,
      email_contacto: `${formData.email_contacto}@slepiquique.cl`,
      fecha_inicio: `${formData.fecha}T${formData.horaInicio}:00`,
      fecha_fin: `${formData.fecha}T${formData.horaFin}:00`,
      estado: 'PENDIENTE',
    })
  }

  const handleNuevaReservaClose = (result) => {
    setModalOpen(false)
    if (result?.saved) {
      fetchData({ silent: true })
    }
  }

  const openManage = (reserva = null) => {
    setManageInitial(reserva)
    setManageOpen(true)
  }

  return (
    <div
      className="page public-reservas-page"
      data-od-id="public-reservas-page"
      data-calendar-page
      data-fill-viewport
    >
      <PageHeader
        icon="reservas"
        title="Portal de Reservas"
        description="Solicita y gestiona recursos — SLEP Iquique"
      />

      <div
        className="calendar-module calendar-card"
        data-calendar-module
        data-view={effectiveView}
        data-layout={layout}
      >
        <div className="calendar-toolbar">
          <div className="calendar-toolbar__date-nav">
            <IconButton
              type="button"
              aria-label={isCompact || effectiveView === 'day' ? 'Mes anterior' : 'Semana anterior'}
              onClick={() => handleNav(-1)}
            >
              <Icon name="chevron-left" size={16} />
            </IconButton>
            <Button
              type="button"
              variant="quiet"
              size="sm"
              className="calendar-toolbar__today-desk"
              onClick={() => setCurrentDate(new Date())}
            >
              Hoy
            </Button>
            <span className="calendar-toolbar__period">
              {fmtPeriodLabel(effectiveView, currentDate, visibleDays)}
            </span>
            <IconButton
              type="button"
              aria-label={isCompact || effectiveView === 'day' ? 'Mes siguiente' : 'Semana siguiente'}
              onClick={() => handleNav(1)}
            >
              <Icon name="chevron-right" size={16} />
            </IconButton>
          </div>

          <div className="calendar-toolbar__view-cluster">
            {!isCompact ? (
              <div className="segment-control">
                {[
                  { v: 'week', l: 'Semana' },
                  { v: 'day', l: 'Día' },
                ].map(({ v, l }) => (
                  <button
                    key={v}
                    type="button"
                    className={`segment-control__btn${effectiveView === v ? ' is-active' : ''}`}
                    onClick={() => handleSetViewMode(v)}
                  >
                    {l}
                  </button>
                ))}
              </div>
            ) : null}
            <IconButton
              type="button"
              aria-label="Actualizar"
              aria-busy={refreshing || undefined}
              disabled={refreshing}
              className={`calendar-toolbar__refresh${refreshing ? ' is-spinning' : ''}`}
              onClick={() => fetchData()}
            >
              <Icon name="refresh" size={16} />
            </IconButton>
          </div>

          <span className="calendar-toolbar__spacer" />

          <div className="calendar-toolbar__actions calendar-toolbar__actions--desk">
            <Button type="button" variant="secondary" size="sm" onClick={() => openManage(null)}>
              <Icon name="lock" size="sm" /> Gestionar mi reserva
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={openNewReserva}>
              <Icon name="plus" size="sm" /> Solicitar reserva
            </Button>
          </div>
        </div>

        <div className="calendar-filters">
          <div className="calendar-filters__body is-open">
            <div className="calendar-filters__row">
              <span className="calendar-filters__label">Filtrar</span>
              <div className="filter-chips">
                <button
                  type="button"
                  className={`filter-chip${filtroRecurso === 'all' ? ' is-active' : ''}`}
                  onClick={() => setFiltroRecurso('all')}
                >
                  Todos
                </button>
                {tiposPresentes.map((tipo, tIdx) => {
                  const iconName = RECURSO_ICON_NAMES[tipo] || 'box'
                  const isTipoActive = filtroRecurso === `tipo_${tipo}`
                  return (
                    <React.Fragment key={tipo}>
                      {tIdx > 0 ? <span className="calendar-filters__sep" aria-hidden /> : null}
                      <button
                        type="button"
                        className={`filter-chip${isTipoActive ? ' is-active' : ''}`}
                        onClick={() => setFiltroRecurso(`tipo_${tipo}`)}
                      >
                        <Icon name={iconName} size={12} />
                        {TYPE_LABELS[tipo] || tipo}
                      </button>
                      {(recursosPorTipo[tipo] || []).map((rec) => {
                        const isActive = filtroRecurso === String(rec.id)
                        const color = rec.color || '#6366f1'
                        return (
                          <button
                            key={rec.id}
                            type="button"
                            className={`filter-chip${isActive ? ' is-active' : ''}`}
                            onClick={() => setFiltroRecurso(String(rec.id))}
                            style={{
                              background: isActive ? color : hexToRgba(color, 0.08),
                              borderColor: isActive ? color : hexToRgba(color, 0.25),
                              color: isActive ? 'white' : color,
                              '--resource-color': color,
                            }}
                          >
                            <span
                              className="filter-chip__dot"
                              style={{
                                background: isActive ? 'rgba(255,255,255,0.7)' : color,
                              }}
                            />
                            {rec.nombre}
                          </button>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {slotBloqueadoMsg ? (
          <Alert variant="warning" className="calendar-slot-alert">
            <Icon name="lock" size={14} /> {slotBloqueadoMsg}
          </Alert>
        ) : null}

        <div
          className={`calendar-body${loading || refreshing ? ' is-busy' : ''}`}
          aria-busy={loading || refreshing || undefined}
        >
          {(loading || refreshing) ? (
            <div className="calendar-body__veil" aria-hidden="true" />
          ) : null}
          <div className={`calendar-body__content${!loading && !refreshing ? ' calendar-body__content--enter' : ''}`}>
            {effectiveView === 'week' ? (
              <WeekView
                weekScrollRef={weekScrollRef}
                visibleDays={visibleDays}
                todayStr={todayStr}
                recursosFiltrados={recursosFiltrados}
                bloqueos={bloqueos}
                settings={settings}
                canBypass={false}
                getAntelacionDays={getAntelacionDays}
                getReservasForDayAndRecurso={getReservasForDayAndRecurso}
                onSlotClick={handleSlotClick}
                onReservaClick={(ev) => openManage(ev)}
              />
            ) : (
              <DayView
                isCompact={isCompact}
                currentDate={currentDate}
                stripDays={stripDays}
                todayStr={todayStr}
                recursosFiltrados={recursosFiltrados}
                filtroRecurso={filtroRecurso}
                reservas={reservas}
                bloqueos={bloqueos}
                settings={settings}
                configStart={configStart}
                timeSlots={TIME_SLOTS}
                scrollRef={scrollRef}
                headerScrollRef={headerScrollRef}
                getReservasForDayAndRecurso={getReservasForDayAndRecurso}
                getDayResources={getDayResources}
                getEventPos={getEventPos}
                onSlotClick={handleSlotClick}
                onReservaClick={(ev) => openManage(ev)}
                onSelectDate={setCurrentDate}
              />
            )}
          </div>
        </div>
      </div>

      <div className="public-reservas-page__fab-stack">
        <Button
          type="button"
          variant="secondary"
          className="calendar-fab calendar-fab--secondary"
          aria-label="Gestionar mi reserva"
          onClick={() => openManage(null)}
        >
          <Icon name="lock" size={20} />
        </Button>
        <Button
          type="button"
          variant="primary"
          className="calendar-fab"
          aria-label="Solicitar reserva"
          onClick={openNewReserva}
        >
          <Icon name="plus" size={22} />
        </Button>
      </div>

      <NuevaReservaModal
        open={modalOpen}
        onClose={handleNuevaReservaClose}
        formData={formData}
        setFormData={setFormData}
        formTipo={formTipo}
        setFormTipo={setFormTipo}
        onSave={handleSaveReserva}
        recursos={recursos}
        reservas={reservas}
        bloqueos={bloqueos}
        timeSlots={TIME_SLOTS}
        settings={settings}
        todayStr={todayStr}
        canChangeName
        canBypass={false}
        showEmailField
        honeypot={honeypot}
        setHoneypot={setHoneypot}
        title="Solicitar Reserva"
        subtitle="Completa los datos; un administrador revisará tu solicitud"
        submitLabel="Enviar solicitud"
        successDescription="¡Solicitud enviada! Un administrador revisará tu reserva pronto."
      />

      <PublicManageModal
        open={manageOpen}
        onClose={() => {
          setManageOpen(false)
          setManageInitial(null)
        }}
        initialReserva={manageInitial}
        recursos={recursos}
        timeSlots={TIME_SLOTS}
        onChanged={() => fetchData({ silent: true })}
      />
    </div>
  )
}
