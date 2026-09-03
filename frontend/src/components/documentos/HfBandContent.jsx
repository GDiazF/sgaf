import { useLayoutEffect, useRef } from 'react'

/** Aplica posición % de logos dentro de bandas de solo lectura (slot 0×0 rompe el %). */
function layoutBandLogos(root) {
  if (!root) return
  root.querySelectorAll('img[data-sgaf-logo]').forEach((img) => {
    const slot = img.closest('.sgaf-logo-slot')
    if (slot) {
      slot.style.cssText =
        'position:absolute;inset:0;width:100%;height:100%;overflow:visible;margin:0;padding:0;border:0;'
    }
    const left = img.getAttribute('data-left') || '0'
    const top = img.getAttribute('data-top') || '0'
    const w = img.getAttribute('width') || '140'
    img.style.cssText =
      `position:absolute;left:${left}%;top:${top}%;width:${w}px;height:auto;margin:0;max-width:none;`
  })
}

export function HfBandContent({ html, className }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    layoutBandLogos(ref.current)
  }, [html])

  return (
    <div
      ref={ref}
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
