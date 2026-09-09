import { useEffect, useState } from 'react'

/**
 * Activa un flag solo si `active` se mantiene true más de `delayMs`.
 * Útil para skeletons de refetch (evitar flash si la respuesta es instantánea).
 */
export function useDelayedFlag(active, delayMs = 220) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!active) {
      setShow(false)
      return undefined
    }
    const id = window.setTimeout(() => setShow(true), delayMs)
    return () => window.clearTimeout(id)
  }, [active, delayMs])

  return show
}

/**
 * Skeleton de DataTable:
 * - Sin filas + loading → inmediato (primera carga / lista vaciada).
 * - Con filas + loading → solo tras `delayMs` (mantiene datos viejos un instante).
 */
export function useTableSkeleton(loading, rowCount, delayMs = 220) {
  const staleLoading = Boolean(loading && rowCount > 0)
  const delayed = useDelayedFlag(staleLoading, delayMs)
  if (!loading) return false
  if (rowCount === 0) return true
  return delayed
}
