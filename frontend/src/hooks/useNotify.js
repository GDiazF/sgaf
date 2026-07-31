import { useCallback, useMemo } from 'react'
import { useToast } from '@slep/ui'

const DEFAULT_TITLES = {
  success: 'Listo',
  error: 'Error',
  danger: 'Error',
  warning: 'Atención',
  info: 'Información',
}

/**
 * Feedback flotante global (toast).
 * Reemplazo del patrón alertMsg + <Alert> en el cuerpo de la página.
 *
 * Uso:
 *   const { notify } = useNotify()
 *   notify({ variant: 'success', text: 'Guardado.' })
 *   notify.success('Guardado.')
 *   notify.error('No se pudo guardar.')
 */
export function useNotify() {
  const { showToast, dismiss } = useToast()

  const notify = useCallback(
    (payload, options = {}) => {
      if (payload == null) return null

      if (typeof payload === 'string') {
        return showToast(payload, {
          variant: options.variant || 'info',
          title: options.title,
          duration: options.duration,
        })
      }

      const variant = payload.variant || 'info'
      const message = payload.text ?? payload.message ?? ''
      const title =
        payload.title ??
        options.title ??
        DEFAULT_TITLES[variant] ??
        undefined

      return showToast(message, {
        variant,
        title,
        duration: options.duration ?? payload.duration,
      })
    },
    [showToast],
  )

  const api = useMemo(() => {
    notify.success = (text, options) =>
      notify({ variant: 'success', text }, options)
    notify.error = (text, options) =>
      notify({ variant: 'error', text }, options)
    notify.warning = (text, options) =>
      notify({ variant: 'warning', text }, options)
    notify.info = (text, options) =>
      notify({ variant: 'info', text }, options)
    return notify
  }, [notify])

  return { notify: api, showToast, dismiss }
}

export default useNotify
