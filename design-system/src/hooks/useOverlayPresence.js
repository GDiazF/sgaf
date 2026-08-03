import { useEffect, useState, useRef, useCallback } from 'react'

function exitDelayMs(fallback) {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 0
  }
  return fallback
}

/**
 * Keep overlays mounted while enter/exit CSS transitions run.
 * - open=true  → mount, then next frame add `visible` (triggers .is-open)
 * - open=false → remove `visible`, wait for transition, then unmount
 */
export function useOverlayPresence(open, { durationMs = 320 } = {}) {
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(false)
  const closingRef = useRef(false)
  const timerRef = useRef(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (open) {
      closingRef.current = false
      clearTimer()
      setMounted(true)
      const id = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (!closingRef.current) setVisible(true)
        })
      })
      return () => window.cancelAnimationFrame(id)
    }

    if (!mounted) return undefined

    closingRef.current = true
    setVisible(false)
    clearTimer()
    timerRef.current = window.setTimeout(() => {
      setMounted(false)
      closingRef.current = false
      timerRef.current = null
    }, exitDelayMs(durationMs))

    return clearTimer
  }, [open, mounted, durationMs, clearTimer])

  return { mounted, visible }
}
