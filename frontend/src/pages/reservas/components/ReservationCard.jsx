import React from 'react'
import { Icon, Badge } from '@slep/ui'
import { ESTADO_CARD, ESTADO_BADGE } from '../shared/constants'
import { fmtTime, contrastOnFill } from '../shared/dateUtils'

/**
 * @param {{
 *   reserva: object,
 *   color?: string,
 *   highlighted?: boolean,
 *   onClick?: (e: React.MouseEvent) => void,
 *   compact?: boolean,
 * }} props
 */
export default function ReservationCard({
  reserva,
  color = '#6366f1',
  highlighted = false,
  onClick,
  compact = false,
}) {
  const estado = (reserva.estado || '').toUpperCase()
  const cardStatus = ESTADO_CARD[estado] || 'pending'
  const badge = ESTADO_BADGE[estado] || ESTADO_BADGE.PENDIENTE
  const isPending = estado === 'PENDIENTE'

  return (
    <button
      type="button"
      id={`reserva-${reserva.id}`}
      className={`reservation-card reservation-card--status-${cardStatus}${highlighted ? ' is-highlighted' : ''}${compact ? ' reservation-card--compact' : ''}`}
      style={{
        '--resource-color': color,
        '--resource-on-fill': contrastOnFill(color),
      }}
      onClick={onClick}
      title={isPending ? 'En espera de aprobación' : undefined}
    >
      <div className="reservation-card__header">
        <span className="reservation-card__time">
          {fmtTime(reserva.fecha_inicio)} – {fmtTime(reserva.fecha_fin)}
        </span>
        {estado === 'APROBADA' ? (
          <Icon name="lock" size={12} className="reservation-card__status-icon" />
        ) : null}
        {isPending ? (
          <Icon name="unlock" size={12} className="reservation-card__status-icon" />
        ) : null}
      </div>
      <p className="reservation-card__title">{reserva.titulo}</p>
      <p className="reservation-card__person">{reserva.nombre_funcionario}</p>
      {!compact ? (
        <Badge variant={badge.variant} className="reservation-card__status">
          {badge.label}
        </Badge>
      ) : null}
    </button>
  )
}
