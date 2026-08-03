import { useEffect, useState } from 'react'
import { cn } from '../../lib/cn.js'
import { Button } from './Button.jsx'

const CX = 24
const CY = 24
const R = 18
const PATH_LEN = 100

function StatusRing({ status }) {
  const done = status === 'success' || status === 'error'
  /** 0–1: cuánto del círculo está dibujado */
  const [progress, setProgress] = useState(0.08)

  useEffect(() => {
    if (status !== 'loading') {
      // Cierra el hueco restante sobre el mismo círculo (sin remontar)
      setProgress(1)
      return undefined
    }

    setProgress(0.08)
    let raf = 0
    const t0 = performance.now()

    const tick = (now) => {
      const t = Math.min(1, (now - t0) / 1200)
      const ease = 1 - (1 - t) ** 1.7
      setProgress(0.08 + ease * 0.84) // → ~0.92
      if (t < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [status])

  const dashoffset = PATH_LEN * (1 - progress)

  return (
    <svg
      className="form-overlay__ring"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
    >
      <circle
        className="form-overlay__ring-arc"
        cx={CX}
        cy={CY}
        r={R}
        strokeWidth="3.25"
        strokeLinecap="round"
        pathLength={PATH_LEN}
        strokeDasharray={PATH_LEN}
        strokeDashoffset={dashoffset}
      />

      {/* Mismo punto siempre: se oculta al terminar */}
      <circle
        className={cn('form-overlay__dot', done && 'is-hidden')}
        cx={CX}
        cy={CY}
        r="2.4"
      />

      {/* Check y X siempre en el DOM; solo cambia opacidad */}
      <path
        className={cn(
          'form-overlay__mark form-overlay__mark--check',
          status === 'success' && 'is-visible',
        )}
        d="M15.5 24.5l5.2 5.2L33 17"
        strokeWidth="3.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className={cn(
          'form-overlay__mark form-overlay__mark--x',
          status === 'error' && 'is-visible',
        )}
        d="M17.5 17.5l13 13M30.5 17.5l-13 13"
        strokeWidth="3.25"
        strokeLinecap="round"
      />
    </svg>
  )
}

const DEFAULT_TITLES = {
  loading: 'Guardando…',
  success: 'Guardado correctamente',
  error: 'No se pudo guardar',
}

/**
 * Overlay de envío sobre un formulario / modal body.
 * status: null | 'loading' | 'success' | 'error'
 */
export function FormOverlay({
  status = null,
  title,
  description,
  children,
  className,
  onDismiss,
  autoDismissMs = 1600,
  dismissLabel = 'Cerrar',
}) {
  useEffect(() => {
    if (status !== 'success' || !autoDismissMs || !onDismiss) return undefined
    const t = setTimeout(() => onDismiss(), autoDismissMs)
    return () => clearTimeout(t)
  }, [status, autoDismissMs, onDismiss])

  const active = Boolean(status)
  const resolvedTitle = title || (status ? DEFAULT_TITLES[status] : '')

  return (
    <div
      className={cn('form-overlay-host', active && 'is-busy', className)}
      aria-busy={status === 'loading' || undefined}
    >
      {children}
      {active ? (
        <div
          className={cn('form-overlay', `form-overlay--${status}`)}
          role={status === 'error' ? 'alert' : 'status'}
          aria-live={status === 'loading' ? 'polite' : 'assertive'}
        >
          <div className="form-overlay__card">
            <div className="form-overlay__icon" aria-hidden>
              <StatusRing status={status} />
            </div>
            <div className="form-overlay__copy">
              {resolvedTitle ? (
                <div className="form-overlay__title">{resolvedTitle}</div>
              ) : null}
              {/* Slot fijo: evita que la card salte al aparecer el texto */}
              <p className={cn('form-overlay__desc', !description && 'is-empty')}>
                {description || '\u00a0'}
              </p>
            </div>
            <div
              className={cn(
                'form-overlay__actions',
                !(status === 'error' && onDismiss) && 'is-empty',
              )}
            >
              {status === 'error' && onDismiss ? (
                <Button type="button" variant="secondary" size="sm" onClick={onDismiss}>
                  {dismissLabel}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
