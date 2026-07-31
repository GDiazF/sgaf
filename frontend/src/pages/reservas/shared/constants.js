/** Constantes del módulo de reservas */

export const DEFAULT_HOUR_START = 7
export const DEFAULT_HOUR_END = 18
export const SLOT_MIN = 30
export const SLOT_HEIGHT = 44

/** Iconos DS por tipo de recurso */
export const RECURSO_ICON_NAMES = {
  SALA: 'building',
  VEHICULO: 'car',
  PROYECTOR: 'monitor',
  OTRO: 'box',
}

export const TYPE_ORDER = { SALA: 0, VEHICULO: 1, PROYECTOR: 2, OTRO: 3 }

export const TYPE_LABELS = {
  SALA: 'Salas',
  VEHICULO: 'Vehículos',
  PROYECTOR: 'Proyectores',
  OTRO: 'Otros',
}

export const sortByType = (a, b) => {
  const ta = TYPE_ORDER[a.tipo] ?? 9
  const tb = TYPE_ORDER[b.tipo] ?? 9
  if (ta !== tb) return ta - tb
  return a.nombre.localeCompare(b.nombre, 'es')
}

/** Mapeo estado API → clase reservation-card */
export const ESTADO_CARD = {
  PENDIENTE: 'pending',
  APROBADA: 'confirmed',
  RECHAZADA: 'pending',
  CANCELADA: 'blocked',
  FINALIZADA: 'confirmed',
}

export const ESTADO_BADGE = {
  PENDIENTE: { label: 'En espera', variant: 'warning' },
  APROBADA: { label: 'Aprobada', variant: 'success' },
  RECHAZADA: { label: 'Rechazada', variant: 'danger' },
  CANCELADA: { label: 'Cancelada', variant: 'neutral' },
  FINALIZADA: { label: 'Finalizada', variant: 'accent' },
}

export const DEFAULT_COLORS = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
]

export const HISTORIAL_ESTADOS = ['RECHAZADA', 'CANCELADA', 'FINALIZADA']
