/** Utilidades de fecha/hora para el calendario de reservas */

/** Extrae YYYY-MM-DD en tiempo LOCAL */
export const toDateStr = (d) => {
  if (!(d instanceof Date)) d = new Date(d)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const addDays = (d, n) => {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

/** Minutos totales del día en tiempo LOCAL */
export const dtMinutes = (dt) => {
  const d = new Date(dt)
  return d.getHours() * 60 + d.getMinutes()
}

export const hexToRgba = (hex, alpha) => {
  if (!hex || typeof hex !== 'string' || hex.length < 7) return `rgba(99,102,241,${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/** Texto legible sobre relleno sólido del color de recurso */
export const contrastOnFill = (hex) => {
  if (!hex || typeof hex !== 'string' || hex.length < 7) return '#FFFFFF'
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return L > 0.62 ? '#282828' : '#FFFFFF'
}

/**
 * Columnas para eventos que se solapan.
 * Devuelve cada evento con { ev, colIndex, colCount }.
 */
export const layoutEvents = (events) => {
  if (!events.length) return []
  const sorted = [...events].sort(
    (a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio),
  )
  const result = sorted.map((ev) => ({ ev, colIndex: 0, colCount: 1 }))
  const groups = []
  let current = [result[0]]
  for (let i = 1; i < result.length; i++) {
    const item = result[i]
    const startMin = dtMinutes(item.ev.fecha_inicio)
    const overlaps = current.some((c) => dtMinutes(c.ev.fecha_fin) > startMin)
    if (overlaps) current.push(item)
    else {
      groups.push(current)
      current = [item]
    }
  }
  groups.push(current)

  for (const group of groups) {
    const n = group.length
    group.forEach((item, idx) => {
      item.colIndex = idx
      item.colCount = n
    })
  }
  return result
}

export const bloqueoAppliesToDate = (b, dateStr) => {
  if (b.modo === 'DIA') return b.fecha_inicio === dateStr
  if (b.modo === 'RANGO')
    return b.fecha_inicio <= dateStr && (!b.fecha_fin || dateStr <= b.fecha_fin)
  if (b.modo === 'INDEFINIDO') return dateStr >= b.fecha_inicio
  return false
}

export const buildTimeSlots = (horaInicio, horaFin) => {
  const configStart = parseInt(String(horaInicio).split(':')[0], 10) || 7
  const [hFinal, mFinal] = String(horaFin || '18:00')
    .split(':')
    .map(Number)
  const maxMins = hFinal * 60 + (mFinal || 0)
  const slots = []
  for (let h = configStart; h <= hFinal; h++) {
    const m0 = h * 60
    const m30 = h * 60 + 30
    if (m0 < maxMins) slots.push(`${String(h).padStart(2, '0')}:00`)
    if (m30 < maxMins) slots.push(`${String(h).padStart(2, '0')}:30`)
  }
  return { slots, configStart, maxMins }
}

export const weekDaysFrom = (currentDate) => {
  const mon = new Date(currentDate)
  mon.setDate(currentDate.getDate() - ((currentDate.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i))
}

/** Todos los días del mes de `currentDate` (strip móvil/tablet y vista día). */
export const monthDaysFrom = (currentDate) => {
  const y = currentDate.getFullYear()
  const m = currentDate.getMonth()
  const total = new Date(y, m + 1, 0).getDate()
  return Array.from({ length: total }, (_, i) => new Date(y, m, i + 1))
}

export const fmtDayShort = (d) =>
  new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: 'numeric' }).format(d)

export const fmtMonthYear = (d) => {
  const parts = new Intl.DateTimeFormat('es-CL', {
    month: 'long',
    year: 'numeric',
  }).formatToParts(d)
  const month = parts.find((p) => p.type === 'month')?.value
  const year = parts.find((p) => p.type === 'year')?.value
  return `${month} ${year}`
}

/** Etiqueta de período según vista (semana visible o día actual). */
export const fmtPeriodLabel = (viewMode, currentDate, visibleDays = []) => {
  if (viewMode === 'week' && visibleDays.length > 0) {
    const start = visibleDays[0]
    const end = visibleDays[visibleDays.length - 1]
    if (
      start.getMonth() !== end.getMonth() ||
      start.getFullYear() !== end.getFullYear()
    ) {
      const fmtShort = (d) =>
        new Intl.DateTimeFormat('es-CL', { month: 'short' }).format(d).replace(/\.$/, '')
      if (start.getFullYear() !== end.getFullYear()) {
        return `${fmtShort(start)} ${start.getFullYear()} – ${fmtShort(end)} ${end.getFullYear()}`
      }
      return `${fmtShort(start)} – ${fmtShort(end)} ${end.getFullYear()}`
    }
    return fmtMonthYear(start)
  }
  return fmtMonthYear(currentDate)
}

export const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

/** HH:mm local estable (evita ambigüedad de toLocaleTimeString en selects) */
export const toTimeHm = (isoOrDate) => {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Fecha larga para detalle (ej. sábado 25 de julio) */
export const fmtDateWeekday = (iso) => {
  const raw = new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(iso))
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

/** Rango horario 24h (ej. 09:00 – 09:30) */
export const fmtTimeRange = (isoStart, isoEnd) =>
  `${fmtTime(isoStart)} – ${fmtTime(isoEnd)}`

/** Duración legible entre dos ISO (ej. 30 min, 6 h 30 min) */
export const fmtDuration = (isoStart, isoEnd) => {
  const mins = Math.max(
    0,
    Math.round((new Date(isoEnd) - new Date(isoStart)) / 60000),
  )
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

/** Fecha legible para listados (ej. 27 may 2026) */
export const fmtDateLong = (iso) =>
  new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
