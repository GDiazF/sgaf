import { useCallback, useMemo, useState } from 'react'

/**
 * Estado de FormOverlay para envíos de formulario / modal.
 *
 * Uso típico con Modal:
 *   const overlay = useFormOverlay()
 *   await overlay.run(() => api.save(...), { successDescription: 'Guardado.' })
 *   <Modal {...overlay.modalProps} ... />
 */
export function useFormOverlay() {
  const [status, setStatus] = useState(null)
  const [description, setDescription] = useState('')
  const [title, setTitle] = useState(undefined)

  const reset = useCallback(() => {
    setStatus(null)
    setDescription('')
    setTitle(undefined)
  }, [])

  const dismiss = useCallback(() => {
    reset()
  }, [reset])

  const run = useCallback(async (task, options = {}) => {
    const {
      minLoadingMs = 700,
      successTitle,
      successDescription = '',
      errorTitle,
      formatError,
    } = options

    setTitle(undefined)
    setDescription('')
    setStatus('loading')

    const started = Date.now()
    const waitMin = async () => {
      const left = Math.max(0, minLoadingMs - (Date.now() - started))
      if (left) await new Promise((r) => setTimeout(r, left))
    }

    try {
      const result = await task()
      await waitMin()
      setTitle(successTitle)
      setDescription(successDescription || '')
      setStatus('success')
      return result
    } catch (err) {
      await waitMin()
      const msg =
        (typeof formatError === 'function' && formatError(err)) ||
        err?.formMessage ||
        err?.message ||
        'No se pudo guardar'
      setTitle(errorTitle)
      setDescription(String(msg))
      setStatus('error')
      throw err
    }
  }, [])

  const busy = status === 'loading'
  const active = Boolean(status)

  const modalProps = useMemo(
    () => ({
      overlayStatus: status,
      overlayDescription: description,
      overlayTitle: title,
      onOverlayDismiss: dismiss,
    }),
    [status, description, title, dismiss],
  )

  return {
    status,
    description,
    title,
    busy,
    active,
    reset,
    dismiss,
    run,
    setStatus,
    setDescription,
    setTitle,
    modalProps,
  }
}

/**
 * Formatea errores típicos de Django REST (objeto field → mensajes).
 */
export function formatApiFormError(error, fallback = 'No se pudo guardar.') {
  const data = error?.response?.data
  if (!data) return error?.message || fallback
  if (typeof data === 'string') return data
  if (Array.isArray(data)) return data.join('\n')
  if (typeof data === 'object') {
    const lines = Object.entries(data).map(([key, value]) => {
      const text = Array.isArray(value) ? value.join(', ') : String(value)
      if (key === 'detail' || key === 'non_field_errors') return text
      return `${key}: ${text}`
    })
    return lines.filter(Boolean).join('\n') || fallback
  }
  return fallback
}
