import { Badge } from '@slep/ui'

export const STATUS_LABELS = {
  ABIERTO: 'Abierto',
  EN_PROGRESO: 'En progreso',
  EN_ESPERA: 'En espera',
  RESUELTO: 'Resuelto',
  CERRADO: 'Cerrado',
}

export const STATUS_VARIANTS = {
  ABIERTO: 'accent',
  EN_PROGRESO: 'warning',
  EN_ESPERA: 'neutral',
  RESUELTO: 'success',
  CERRADO: 'neutral',
}

export const PRIORITY_LABELS = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  CRITICA: 'Crítica',
}

export const PRIORITY_VARIANTS = {
  BAJA: 'neutral',
  MEDIA: 'accent',
  ALTA: 'warning',
  CRITICA: 'danger',
}

export function StatusBadge({ status, dot = true }) {
  return (
    <Badge variant={STATUS_VARIANTS[status] || 'neutral'} dot={dot}>
      {STATUS_LABELS[status] || status?.replace('_', ' ') || '—'}
    </Badge>
  )
}

export function PriorityBadge({ priority, dot = false }) {
  return (
    <Badge variant={PRIORITY_VARIANTS[priority] || 'neutral'} dot={dot}>
      {PRIORITY_LABELS[priority] || priority || '—'}
    </Badge>
  )
}
