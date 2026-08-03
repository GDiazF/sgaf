import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn.js'

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message, { variant = 'info', title, duration = 4000 } = {}) => {
      // Compat con Alert: danger → error
      const normalized =
        variant === 'danger' ? 'error' : variant || 'info'
      const id = ++toastId
      setToasts((prev) => [
        ...prev,
        { id, message, title, variant: normalized },
      ])
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration)
      }
      return id
    },
    [dismiss],
  )

  const value = useMemo(() => ({ showToast, dismiss }), [showToast, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="toast-container" aria-live="polite">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={cn(
                'toast',
                t.variant === 'error' && 'toast--error',
                t.variant === 'success' && 'toast--success',
                t.variant === 'warning' && 'toast--warning',
                t.variant === 'info' && 'toast--info',
              )}
              role="status"
            >
              <div>
                {t.title ? <div className="toast__title">{t.title}</div> : null}
                {t.message ? <p>{t.message}</p> : null}
              </div>
              <button
                type="button"
                className="toast__close"
                aria-label="Cerrar"
                onClick={() => dismiss(t.id)}
              >
                &times;
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
