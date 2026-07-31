import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  PageHeader,
  Button,
  IconButton,
  Icon,
  Alert,
} from '@slep/ui'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import {
  DEFAULT_HOUR_START,
  DEFAULT_HOUR_END,
  SLOT_MIN,
  SLOT_HEIGHT,
  sortByType,
  RECURSO_ICON_NAMES,
  TYPE_LABELS,
} from './shared/constants'
import {
  toDateStr,
  addDays,
  dtMinutes,
  hexToRgba,
  bloqueoAppliesToDate,
  fmtPeriodLabel,
  weekDaysFrom,
  monthDaysFrom,
} from './shared/dateUtils'
import WeekView from './components/WeekView'
import DayView from './components/DayView'
import NuevaReservaModal from './components/NuevaReservaModal'
import DetalleReservaModal from './components/DetalleReservaModal'
import AdminRecursosModal from './components/AdminRecursosModal'
import HistorialDrawer from './components/HistorialDrawer'

const ReservasDashboard = () => {
  const { user } = useAuth()

  const canChangeName =
    user?.is_superuser ||
    (user?.user_permissions &&
      user.user_permissions.includes('solicitudes_reservas.can_change_reserva_name'))
  const canBypass =
    user?.is_superuser ||
    (user?.user_permissions &&
      user.user_permissions.includes('solicitudes_reservas.can_bypass_antelacion'))
  const canForceDelete =
    user?.is_superuser ||
    (user?.user_permissions &&
      user.user_permissions.includes('solicitudes_reservas.can_force_delete_reserva'))
  const canViewLogs =
    user?.is_superuser ||
    (user?.user_permissions &&
      user.user_permissions.includes('solicitudes_reservas.can_view_logs'))
  const canManageSettings =
    user?.is_superuser ||
    (user?.user_permissions &&
      user.user_permissions.includes('solicitudes_reservas.can_manage_settings'))
  const canManageRecursos =
    user?.is_superuser ||
    (user?.user_permissions &&
      user.user_permissions.includes('solicitudes_reservas.add_recursoreservable')) ||
    (user?.user_permissions &&
      user.user_permissions.includes('solicitudes_reservas.change_recursoreservable'))
  const canApproveReserva =
    user?.is_superuser ||
    (user?.user_permissions &&
      user.user_permissions.includes('solicitudes_reservas.can_approve_reserva'))

  const defaultName =
    user?.funcionario_data?.nombre_funcionario ||
    (user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '') ||
    user?.username ||
    ''

  const [recursos, setRecursos] = useState([])
  const [reservas, setReservas] = useState([])
  const [settings, setSettings] = useState({
    hora_inicio: '07:00',
    hora_fin: '18:00',
    dias_bloqueo_antelacion: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const configStart = parseInt(settings.hora_inicio.split(':')[0], 10) || DEFAULT_HOUR_START
  const configEnd = parseInt(settings.hora_fin.split(':')[0], 10) || DEFAULT_HOUR_END
  const [hFinal, mFinal] = settings.hora_fin.split(':').map(Number)
  const MAX_MINS_FIN = hFinal * 60 + mFinal

  const TIME_SLOTS = useMemo(() => {
    const slots = []
    for (let h = configStart; h <= configEnd; h++) {
      const m0 = h * 60
      const m30 = h * 60 + 30
      if (m0 < MAX_MINS_FIN) slots.push(`${String(h).padStart(2, '0')}:00`)
      if (m30 < MAX_MINS_FIN) slots.push(`${String(h).padStart(2, '0')}:30`)
    }
    return slots
  }, [configStart, configEnd, MAX_MINS_FIN])

  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('week')
  const [filtroRecurso, setFiltroRecurso] = useState('all')

  const [modalOpen, setModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    recurso: '',
    titulo: '',
    nombre_funcionario: defaultName,
    descripcion: '',
    fecha: toDateStr(new Date()),
    horaInicio: '09:00',
    horaFin: '10:00',
  })
  const [formTipo, setFormTipo] = useState('')

  const [detailReserva, setDetailReserva] = useState(null)
  const [rechazandoId, setRechazandoId] = useState(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [detailActionError, setDetailActionError] = useState('')

  const [historyOpen, setHistoryOpen] = useState(false)
  const [historySearch, setHistorySearch] = useState('')
  const [historyFilterEstado, setHistoryFilterEstado] = useState('HISTORIAL')
  const [historyFilterRecurso, setHistoryFilterRecurso] = useState('all')
  const [historySort, setHistorySort] = useState('-fecha_inicio')

  const [slotBloqueadoMsg, setSlotBloqueadoMsg] = useState('')

  const [adminOpen, setAdminOpen] = useState(false)
  const [adminEditing, setAdminEditing] = useState(null)
  const [adminForm, setAdminForm] = useState({
    nombre: '',
    tipo: 'SALA',
    ubicacion: '',
    capacidad: 1,
    descripcion: '',
    activo: true,
    color: '#6366f1',
    dias_antelacion: 0,
  })
  const [adminError, setAdminError] = useState('')

  const [bloqueos, setBloqueos] = useState([])
  const [bloqueoForm, setBloqueoForm] = useState({
    modo: 'DIA',
    fecha_inicio: '',
    fecha_fin: '',
    hora_inicio: '08:00',
    hora_fin: '17:30',
    motivo: '',
  })
  const [bloqueoError, setBloqueoError] = useState('')
  const [bloqueoSaving, setBloqueoSaving] = useState(false)

  const [bulkDays, setBulkDays] = useState(0)
  const [selectedBulk, setSelectedBulk] = useState([])
  const [highlightedId, setHighlightedId] = useState(null)

  const location = useLocation()
  const navigate = useNavigate()

  const scrollRef = useRef(null)
  const headerScrollRef = useRef(null)
  const weekScrollRef = useRef(null)
  const processedSearch = useRef('')

  // Compact = tablet/móvil ≤1023 (mismo criterio que el showcase OpenDesign)
  const [isCompact, setIsCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches,
  )
  const [layout, setLayout] = useState(() => {
    if (typeof window === 'undefined') return 'desktop'
    if (window.matchMedia('(max-width: 767px)').matches) return 'mobile'
    if (window.matchMedia('(max-width: 1023px)').matches) return 'tablet'
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

  const fetchData = async ({ silent = false } = {}) => {
    const showSpin = !silent
    const startedAt = showSpin ? Date.now() : 0
    if (showSpin) {
      setRefreshing(true)
      setLoading(true)
    }
    try {
      const [rRes, sRes, tRes] = await Promise.all([
        api.get('reservas/recursos/'),
        api.get('reservas/solicitudes/'),
        api.get('reservas/settings/').catch(() => ({
          data: { hora_inicio: '07:00', hora_fin: '18:00' },
        })),
      ])
      setRecursos(rRes.data.results || rRes.data || [])
      setReservas(sRes.data.results || sRes.data || [])
      if (tRes.data) setSettings(tRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      if (showSpin) {
        // Evita cortar el giro a media vuelta cuando la API responde rápido
        const elapsed = Date.now() - startedAt
        const minSpinMs = 750
        if (elapsed < minSpinMs) {
          await new Promise((r) => setTimeout(r, minSpinMs - elapsed))
        }
        setRefreshing(false)
        setLoading(false)
      }
    }
    try {
      const bRes = await api.get('reservas/bloqueos/')
      setBloqueos(bRes.data.results || bRes.data || [])
    } catch (e) {
      console.warn('Bloqueos no disponibles:', e)
    }
  }

  const todayStr = toDateStr(new Date())

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => fetchData({ silent: true }), 30000)
    return () => clearInterval(interval)
  }, [currentDate, viewMode, filtroRecurso])

  useEffect(() => {
    if (!loading && scrollRef.current) {
      const now = new Date()
      const px = Math.max(
        0,
        ((now.getHours() * 60 + now.getMinutes() - configStart * 60) / SLOT_MIN) * SLOT_HEIGHT -
          120,
      )
      scrollRef.current.scrollTop = px
    }
  }, [loading, configStart])

  const clearDeepLinkParams = useCallback(() => {
    const params = new URLSearchParams(location.search)
    const hadDeepLink = params.has('date') || params.has('highlight')
    if (!hadDeepLink) return

    params.delete('date')
    params.delete('highlight')
    const nextSearch = params.toString()
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : '',
      },
      { replace: true },
    )
  }, [location.pathname, location.search, navigate])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const dateParam = params.get('date')
    const highlightParam = params.get('highlight')

    if (!dateParam && !highlightParam) {
      processedSearch.current = ''
      return
    }

    if (location.search === processedSearch.current && processedSearch.current !== '') return

    if (dateParam) {
      const newDate = new Date(`${dateParam}T12:00:00`)
      if (!isNaN(newDate.getTime())) {
        setCurrentDate(newDate)
      }
      // PC: semana · móvil/tablet: día (como el deep-link histórico)
      if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
        setViewMode('day')
      } else {
        setViewMode('week')
      }
    }

    if (highlightParam && !loading && reservas.length > 0) {
      const id = parseInt(highlightParam, 10)
      const reserva = reservas.find((r) => Number(r.id) === Number(id))

      if (reserva) {
        if (!dateParam && reserva.fecha_inicio) {
          const d = new Date(reserva.fecha_inicio)
          if (!isNaN(d.getTime())) setCurrentDate(d)
        }
        if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
          setViewMode('day')
        } else {
          setViewMode('week')
        }

        setHighlightedId(id)
        processedSearch.current = location.search

        setTimeout(() => {
          const el = document.getElementById(`reserva-${id}`)
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
          }
          setTimeout(() => setHighlightedId(null), 4000)
        }, 500)
        clearDeepLinkParams()
      } else if (!loading) {
        processedSearch.current = location.search
        clearDeepLinkParams()
      }
      return
    }

    // Solo ?date=… — aplicar una vez y limpiar para no bloquear la navegación
    if (dateParam && !highlightParam) {
      processedSearch.current = location.search
      clearDeepLinkParams()
    }
  }, [location.search, loading, reservas, currentDate, clearDeepLinkParams])

  useEffect(() => {
    if (!modalOpen || !formData.fecha) return

    const resDía = formData.recurso
      ? reservas.filter(
          (r) =>
            parseInt(r.recurso, 10) === parseInt(formData.recurso, 10) &&
            r.estado === 'APROBADA' &&
            toDateStr(r.fecha_inicio) === formData.fecha,
        )
      : []

    const getMins = (s) => {
      const [h, m] = s.split(':').map(Number)
      return h * 60 + m
    }
    const now = new Date()
    const nowHourStart = now.getHours() * 60
    const nowMins = nowHourStart + now.getMinutes()
    const esHoy = formData.fecha === todayStr

    const mInicio = getMins(formData.horaInicio)
    const estaOcupadoI = resDía.some(
      (r) => mInicio >= dtMinutes(r.fecha_inicio) && mInicio < dtMinutes(r.fecha_fin),
    )
    const esPasado = esHoy && mInicio < nowHourStart

    let nextInicio = formData.horaInicio
    if (estaOcupadoI || esPasado) {
      const primerLibre = TIME_SLOTS.find((s) => {
        const m = getMins(s)
        if (esHoy && m < nowHourStart) return false
        return !resDía.some(
          (r) => m >= dtMinutes(r.fecha_inicio) && m < dtMinutes(r.fecha_fin),
        )
      })
      if (primerLibre) nextInicio = primerLibre
    }

    const mActInicio = getMins(nextInicio)
    const mFin = getMins(formData.horaFin)
    const saltando = resDía.some((r) => {
      const ri = dtMinutes(r.fecha_inicio)
      return ri >= mActInicio && ri < mFin
    })
    const finEnPasado = esHoy && mFin <= nowMins

    let nextFin = formData.horaFin
    if (mFin <= mActInicio || saltando || finEnPasado || nextInicio !== formData.horaInicio) {
      const sigSlot = TIME_SLOTS.find((s) => {
        const m = getMins(s)
        if (m <= mActInicio) return false
        if (esHoy && m <= nowMins) return false
        return true
      })
      if (sigSlot) nextFin = sigSlot
      else if (settings?.hora_fin) {
        const hf = settings.hora_fin.slice(0, 5)
        if (getMins(hf) > mActInicio && (!esHoy || getMins(hf) > nowMins)) nextFin = hf
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
    settings?.hora_fin,
  ])

  const effectiveView = isCompact ? 'day' : viewMode
  const visibleDays =
    effectiveView === 'week' ? weekDaysFrom(currentDate) : [currentDate]
  const stripDays = useMemo(() => monthDaysFrom(currentDate), [currentDate])

  const reservasBuckets = useMemo(() => {
    const buckets = {}
    if (!Array.isArray(reservas)) return buckets

    reservas.forEach((r) => {
      const dayStr = toDateStr(r.fecha_inicio)
      const key = `${r.recurso}_${dayStr}`
      const rEstado = (r.estado || '').toUpperCase()

      if (rEstado === 'PENDIENTE' || rEstado === 'APROBADA' || rEstado === 'FINALIZADA') {
        if (!buckets[key]) buckets[key] = []
        buckets[key].push(r)
      }
    })
    return buckets
  }, [reservas])

  const recursosFiltrados = (() => {
    let list
    if (filtroRecurso === 'all') {
      list = recursos
    } else if (filtroRecurso.startsWith('tipo_')) {
      const tipo = filtroRecurso.replace('tipo_', '')
      list = recursos.filter((r) => r.tipo === tipo)
    } else {
      list = recursos.filter((r) => r.id === parseInt(filtroRecurso, 10))
    }
    return list.slice().sort(sortByType)
  })()

  const getReservasForDayAndRecurso = (day, recursoId) => {
    const dayStr = toDateStr(day)
    return reservasBuckets[`${recursoId}_${dayStr}`] || []
  }

  const getEventPos = (ev) => {
    const startMin = dtMinutes(ev.fecha_inicio)
    const endMin = dtMinutes(ev.fecha_fin)
    const top = ((startMin - configStart * 60) / SLOT_MIN) * SLOT_HEIGHT
    const height = Math.max(((endMin - startMin) / SLOT_MIN) * SLOT_HEIGHT, 24)
    return { top, height }
  }

  const getDayResources = () => recursosFiltrados

  const handleNav = (dir) => {
    const d = new Date(currentDate)
    // Compact y vista día: navegar por mes (showcase)
    if (isCompact || effectiveView === 'day') {
      d.setMonth(d.getMonth() + dir)
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
    const x = rec?.dias_antelacion || 0
    const limit = new Date()
    limit.setHours(0, 0, 0, 0)
    limit.setDate(limit.getDate() + x)

    if (day <= limit && !canBypass) {
      setSlotBloqueadoMsg(
        `Este recurso necesita ${x} días de antelación. Bloqueado hasta el ${addDays(limit, 1).toLocaleDateString()}.`,
      )
      setTimeout(() => setSlotBloqueadoMsg(''), 3000)
      return
    }
    const dayStr = toDateStr(day)

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
        return hasReserva || (hasBloqueo && !canBypass)
      }

      if (isOccupied(actualSlot)) {
        const firstFree = TIME_SLOTS.find((s) => !isOccupied(s))
        if (firstFree) actualSlot = firstFree
      }
    }

    const [h, m] = actualSlot.split(':').map(Number)
    const endH = m === 30 ? h + 1 : h
    const endM = m === 30 ? 0 : 30

    const recObj = recursos.find((r) => r.id === recursoId)
    setFormTipo(recObj?.tipo || '')
    setFormData({
      recurso: recursoId || '',
      titulo: '',
      nombre_funcionario: defaultName,
      descripcion: '',
      fecha: toDateStr(day),
      horaInicio: actualSlot,
      horaFin: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
    })
    setModalOpen(true)
  }

  const openNewReserva = () => {
    setFormTipo('')
    setFormData({
      recurso: '',
      titulo: '',
      nombre_funcionario: defaultName,
      descripcion: '',
      fecha: toDateStr(currentDate),
      horaInicio: '09:00',
      horaFin: '10:00',
    })
    setModalOpen(true)
  }

  const handleSaveReserva = async () => {
    await api.post('reservas/solicitudes/', {
      recurso: formData.recurso,
      titulo: formData.titulo,
      nombre_funcionario: formData.nombre_funcionario,
      descripcion: formData.descripcion,
      fecha_inicio: `${formData.fecha}T${formData.horaInicio}:00`,
      fecha_fin: `${formData.fecha}T${formData.horaFin}:00`,
      estado: 'PENDIENTE',
    })
  }

  const handleNuevaReservaClose = (result) => {
    setModalOpen(false)
    if (result?.saved) {
      fetchData()
      window.dispatchEvent(new CustomEvent('refresh-notifications'))
    }
  }

  const handleEstado = async (id, estado, motivo = '') => {
    try {
      if (estado === 'APROBADA') {
        await api.post(`reservas/solicitudes/${id}/aprobar/`)
      } else if (estado === 'RECHAZADA') {
        await api.post(`reservas/solicitudes/${id}/rechazar/`, { motivo })
      } else {
        await api.patch(`reservas/solicitudes/${id}/`, { estado })
      }
      setDetailReserva(null)
      setRechazandoId(null)
      setMotivoRechazo('')
      setDetailActionError('')
      fetchData()
      window.dispatchEvent(new CustomEvent('refresh-notifications'))
    } catch (err) {
      setDetailActionError(
        err.response?.data?.detail ||
          err.response?.data?.non_field_errors?.[0] ||
          'Error al actualizar estado',
      )
      throw err
    }
  }

  const handleCancelOwn = async (reserva) => {
    try {
      await api.delete(`reservas/solicitudes/${reserva.id}/`)
      setDetailReserva(null)
      setDetailActionError('')
      fetchData()
      window.dispatchEvent(new CustomEvent('refresh-notifications'))
    } catch (err) {
      setDetailActionError(err.response?.data?.detail || 'Error al cancelar la reserva.')
      throw err
    }
  }

  const handleForceDeleteReserva = async (reserva) => {
    try {
      await api.delete(`reservas/solicitudes/${reserva.id}/force_delete/`)
      setDetailReserva(null)
      setDetailActionError('')
      fetchData()
      window.dispatchEvent(new CustomEvent('refresh-notifications'))
    } catch (err) {
      setDetailActionError(err.response?.data?.detail || 'Error al eliminar la reserva.')
      throw err
    }
  }

  const openAdminCreate = () => {
    setAdminEditing(null)
    setAdminForm({
      nombre: '',
      tipo: 'SALA',
      color: '#6366f1',
      ubicacion: '',
      capacidad: 10,
      descripcion: '',
      activo: true,
      dias_antelacion: 0,
    })
    setAdminError('')
  }

  const openAdminEdit = (r) => {
    if (r.id === 'settings') {
      setAdminEditing(r)
      setAdminError('')
      return
    }
    setAdminEditing(r)
    setAdminForm({
      nombre: r.nombre,
      tipo: r.tipo,
      color: r.color || '#6366f1',
      ubicacion: r.ubicacion || '',
      capacidad: r.capacidad || 10,
      descripcion: r.descripcion || '',
      activo: r.activo,
      dias_antelacion: r.dias_antelacion || 0,
    })
    setAdminError('')
  }

  const handleAdminSave = async () => {
    if (adminEditing) await api.put(`reservas/recursos/${adminEditing.id}/`, adminForm)
    else await api.post('reservas/recursos/', adminForm)
    await fetchData()
  }

  const handleAdminToggle = async (r) => {
    try {
      await api.patch(`reservas/recursos/${r.id}/`, { activo: !r.activo })
      fetchData()
    } catch (err) {
      setAdminError(err.response?.data?.detail || 'Error al actualizar recurso')
      throw err
    }
  }

  const handleAdminDelete = async (r) => {
    try {
      await api.delete(`reservas/recursos/${r.id}/`)
      fetchData()
      if (adminEditing?.id === r.id) openAdminCreate()
    } catch {
      setAdminError('Error al eliminar')
      throw new Error('Error al eliminar')
    }
  }

  const handleSaveSettings = async () => {
    await api.put('reservas/settings/1/', settings)
    await fetchData()
  }

  const handleBulkUpdate = async () => {
    await Promise.all(
      selectedBulk.map((id) =>
        api.patch(`reservas/recursos/${id}/`, { dias_antelacion: bulkDays }),
      ),
    )
    await fetchData()
    setSelectedBulk([])
  }

  const handleBloqueoSave = async (e) => {
    e.preventDefault()
    if (!adminEditing) return
    if (!bloqueoForm.fecha_inicio) {
      setBloqueoError('Selecciona una fecha de inicio.')
      return
    }
    if (bloqueoForm.modo === 'RANGO' && !bloqueoForm.fecha_fin) {
      setBloqueoError('Indica la fecha de fin del rango.')
      return
    }
    if (bloqueoForm.hora_fin <= bloqueoForm.hora_inicio) {
      setBloqueoError('La hora de fin debe ser posterior a la de inicio.')
      return
    }
    setBloqueoSaving(true)
    setBloqueoError('')
    try {
      const payload = {
        recurso: adminEditing.id,
        modo: bloqueoForm.modo,
        fecha_inicio: bloqueoForm.fecha_inicio,
        fecha_fin: bloqueoForm.modo === 'RANGO' ? bloqueoForm.fecha_fin : null,
        hora_inicio: bloqueoForm.hora_inicio,
        hora_fin: bloqueoForm.hora_fin,
        motivo: bloqueoForm.motivo,
      }
      await api.post('reservas/bloqueos/', payload)
      setBloqueoForm({
        modo: 'DIA',
        fecha_inicio: '',
        fecha_fin: '',
        hora_inicio: '08:00',
        hora_fin: '17:30',
        motivo: '',
      })
      fetchData()
    } catch (err) {
      const data = err.response?.data
      const msg =
        typeof data === 'string'
          ? data
          : data?.non_field_errors?.[0] ||
            Object.values(data || {})
              .flat()
              .join(' ') ||
            'Error al guardar bloqueo.'
      setBloqueoError(msg)
    } finally {
      setBloqueoSaving(false)
    }
  }

  const handleBloqueoDelete = async (id) => {
    try {
      await api.delete(`reservas/bloqueos/${id}/`)
      fetchData()
    } catch {
      setAdminError('Error al eliminar bloqueo')
    }
  }

  const closeDetail = () => {
    setDetailReserva(null)
    setRechazandoId(null)
    setMotivoRechazo('')
    setDetailActionError('')
  }

  const tiposPresentes = [...new Set(recursos.slice().sort(sortByType).map((r) => r.tipo))]
  const recursosPorTipo = tiposPresentes.reduce((acc, tipo) => {
    acc[tipo] = recursos.filter((r) => r.tipo === tipo).sort(sortByType)
    return acc
  }, {})

  return (
    <div className="page" data-od-id="reservas-page" data-calendar-page data-fill-viewport>
      <PageHeader
        icon="reservas"
        title="Reservas"
        split
        breadcrumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Reservas' },
        ]}
        linkComponent={Link}
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
            {(canManageSettings || canManageRecursos) ? (
              <IconButton
                type="button"
                aria-label="Administrar"
                title="Administrar"
                onClick={() => {
                  openAdminCreate()
                  setAdminOpen(true)
                }}
              >
                <Icon name="settings" size={16} />
              </IconButton>
            ) : null}
            {canViewLogs ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="btn--log-btn"
                onClick={() => setHistoryOpen(true)}
              >
                <Icon name="clock" size="sm" />
                <span className="btn--log-btn__label">Log</span>
              </Button>
            ) : null}
            <Button type="button" variant="primary" size="sm" onClick={openNewReserva}>
              <Icon name="plus" size="sm" /> Nueva Reserva
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
                      {recursosPorTipo[tipo].map((rec) => {
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
                canBypass={canBypass}
                highlightedId={highlightedId}
                getReservasForDayAndRecurso={getReservasForDayAndRecurso}
                onSlotClick={handleSlotClick}
                onReservaClick={setDetailReserva}
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
                highlightedId={highlightedId}
                getReservasForDayAndRecurso={getReservasForDayAndRecurso}
                getDayResources={getDayResources}
                getEventPos={getEventPos}
                onSlotClick={handleSlotClick}
                onReservaClick={setDetailReserva}
                onSelectDate={setCurrentDate}
              />
            )}
          </div>
        </div>
      </div>

      <Button
        type="button"
        variant="primary"
        className="calendar-fab"
        aria-label="Nueva reserva"
        onClick={openNewReserva}
      >
        <Icon name="plus" size={22} />
      </Button>

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
        canChangeName={canChangeName}
        canBypass={canBypass}
        successDescription="Solicitud creada. Quedó pendiente de aprobación."
      />

      <DetalleReservaModal
        open={!!detailReserva}
        reserva={detailReserva}
        recurso={detailReserva ? recursos.find((r) => r.id === detailReserva.recurso) : null}
        userId={user?.id}
        canApproveReserva={canApproveReserva}
        canForceDelete={canForceDelete}
        rechazandoId={rechazandoId}
        setRechazandoId={setRechazandoId}
        motivoRechazo={motivoRechazo}
        setMotivoRechazo={setMotivoRechazo}
        onClose={closeDetail}
        onApprove={(id) => handleEstado(id, 'APROBADA')}
        onReject={(id, motivo) => handleEstado(id, 'RECHAZADA', motivo)}
        onFinalize={(id) => handleEstado(id, 'FINALIZADA')}
        onCancelOwn={handleCancelOwn}
        onForceDelete={handleForceDeleteReserva}
        actionError={detailActionError}
        setActionError={setDetailActionError}
      />

      <AdminRecursosModal
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        recursos={recursos}
        bloqueos={bloqueos}
        settings={settings}
        setSettings={setSettings}
        adminEditing={adminEditing}
        adminForm={adminForm}
        setAdminForm={setAdminForm}
        adminError={adminError}
        setAdminError={setAdminError}
        bloqueoForm={bloqueoForm}
        setBloqueoForm={setBloqueoForm}
        bloqueoError={bloqueoError}
        bloqueoSaving={bloqueoSaving}
        bulkDays={bulkDays}
        setBulkDays={setBulkDays}
        selectedBulk={selectedBulk}
        setSelectedBulk={setSelectedBulk}
        canManageSettings={canManageSettings}
        todayStr={todayStr}
        onOpenCreate={openAdminCreate}
        onOpenEdit={openAdminEdit}
        onSave={handleAdminSave}
        onToggle={handleAdminToggle}
        onDelete={handleAdminDelete}
        onSaveSettings={handleSaveSettings}
        onBulkUpdate={handleBulkUpdate}
        onBloqueoSave={handleBloqueoSave}
        onBloqueoDelete={handleBloqueoDelete}
        onAfterResourceSave={openAdminCreate}
      />

      <HistorialDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        reservas={reservas}
        recursos={recursos}
        historySearch={historySearch}
        setHistorySearch={setHistorySearch}
        historyFilterEstado={historyFilterEstado}
        setHistoryFilterEstado={setHistoryFilterEstado}
        historyFilterRecurso={historyFilterRecurso}
        setHistoryFilterRecurso={setHistoryFilterRecurso}
        historySort={historySort}
        setHistorySort={setHistorySort}
        canForceDelete={canForceDelete}
        onSelectReserva={(r) => {
          setDetailReserva(r)
          setHistoryOpen(false)
        }}
        onForceDelete={handleForceDeleteReserva}
      />
    </div>
  )
}

export default ReservasDashboard
