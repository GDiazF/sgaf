import { useEffect } from 'react'

const FIXED_SIZE_RE = /modal--(?:map|directory|viewer|shell|resource-admin)\b/
/** Margen para zoom del navegador (90%, 110%, …) y redondeos subpíxel. */
const SCROLL_SLACK_PX = 16

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function maxModalPx(shell) {
  const raw = getComputedStyle(shell).maxHeight
  // getComputedStyle suele devolver px resueltos ("876.5px"); ignorar unidades crudas.
  if (raw && raw.endsWith('px')) {
    const px = Number.parseFloat(raw)
    if (Number.isFinite(px) && px > 0) return px
  }
  const vh = window.visualViewport?.height ?? window.innerHeight
  return Math.round(vh * 0.9)
}

function bodyHandlesOwnScroll(shell) {
  const body = shell.querySelector('.modal__body')
  if (!body) return false
  const { overflowY } = getComputedStyle(body)
  // Modales con scroll interno en paneles (p. ej. resource-admin): no tocar altura.
  return overflowY === 'hidden' || overflowY === 'clip'
}

function sumChrome(el) {
  if (!el) return 0
  const styles = getComputedStyle(el)
  return (
    (Number.parseFloat(styles.paddingTop) || 0)
    + (Number.parseFloat(styles.paddingBottom) || 0)
    + (Number.parseFloat(styles.borderTopWidth) || 0)
    + (Number.parseFloat(styles.borderBottomWidth) || 0)
  )
}

/**
 * Mide la altura natural del contenido sin quedar atrapado por el height
 * ya fijado del shell (ni por el wrapper FormOverlay).
 */
function measureNaturalHeight(shell) {
  const body = shell.querySelector('.modal__body')
  const header = shell.querySelector('.modal__header')
  const footer = shell.querySelector('.modal__footer')

  let total = sumChrome(shell)

  const addBox = (el) => {
    if (!el) return
    total += el.getBoundingClientRect().height
  }

  // Ribbon / nodos sueltos del shell (fuera del host overlay)
  for (const child of shell.children) {
    if (!(child instanceof HTMLElement)) continue
    if (child.classList.contains('form-overlay-host')) continue
    if (child.classList.contains('modal__body')) continue
    if (child.classList.contains('modal__header')) continue
    if (child.classList.contains('modal__footer')) continue
    const pos = getComputedStyle(child).position
    if (pos === 'absolute' || pos === 'fixed') continue
    total += child.getBoundingClientRect().height
  }

  // afterHeader u otros bloques entre header y body, dentro del host.
  // Ignorar .form-overlay: es position:absolute (inset:0) y su
  // getBoundingClientRect no ocupa layout, pero sumarlo duplica la altura
  // al pasar a loading/success/error.
  const host = shell.querySelector('.form-overlay-host')
  if (host) {
    for (const child of host.children) {
      if (!(child instanceof HTMLElement)) continue
      if (child.classList.contains('modal__body')) continue
      if (child.classList.contains('modal__header')) continue
      if (child.classList.contains('modal__footer')) continue
      // FormOverlay es position:absolute e inset:0 → su altura ≈ la del host.
      // Si se suma, el modal “crece” en cada guardado.
      if (child.classList.contains('form-overlay')) continue
      const pos = getComputedStyle(child).position
      if (pos === 'absolute' || pos === 'fixed') continue
      total += child.getBoundingClientRect().height
    }
  }

  addBox(header)
  addBox(footer)

  if (body) {
    const prev = {
      overflow: body.style.overflow,
      height: body.style.height,
      flex: body.style.flex,
      minHeight: body.style.minHeight,
      maxHeight: body.style.maxHeight,
    }
    body.style.overflow = 'visible'
    body.style.height = 'auto'
    body.style.flex = '0 0 auto'
    body.style.minHeight = '0'
    body.style.maxHeight = 'none'
    total += body.scrollHeight
    body.style.overflow = prev.overflow
    body.style.height = prev.height
    body.style.flex = prev.flex
    body.style.minHeight = prev.minHeight
    body.style.maxHeight = prev.maxHeight
  } else {
    for (const child of shell.children) {
      if (!(child instanceof HTMLElement)) continue
      total += child.getBoundingClientRect().height
    }
  }

  return Math.ceil(total)
}

/**
 * Sync body overflow with whether the final shell height needs scroll.
 * While the modal can still grow (natural ≤ max), keep overflow hidden so the
 * height animation does not flash a temporary scrollbar.
 */
function syncBodyOverflow(shell, needsScroll) {
  const body = shell.querySelector('.modal__body')
  if (!body) return null
  body.style.overflowY = needsScroll ? 'auto' : 'hidden'
  return body
}

/**
 * Anima la altura del shell cuando el contenido cambia.
 * Solo habilita scroll del body cuando el contenido supera el max-height.
 */
export function useSmoothModalSize(shellRef, { active = true } = {}) {
  useEffect(() => {
    const shell = shellRef.current
    if (!shell || !active || prefersReducedMotion()) return undefined
    if (FIXED_SIZE_RE.test(shell.className)) return undefined
    if (bodyHandlesOwnScroll(shell)) return undefined

    let raf = 0
    let first = true
    let last = -1
    let locked = false
    let bodyEl = null

    const apply = () => {
      if (locked) return
      // Mientras FormOverlay cubre el formulario, no re-medir: el overlay
      // (y cambios de botón loading en el footer) disparan ResizeObserver
      // y no deben alterar la altura del shell.
      if (shell.querySelector('.form-overlay-host.is-busy')) {
        return
      }
      locked = true

      const from = shell.getBoundingClientRect().height
      const max = maxModalPx(shell)
      const natural = measureNaturalHeight(shell)
      const to = Math.min(natural, max)
      // Si estamos al tope (o muy cerca), el body debe scrollear.
      // El slack cubre zoom del navegador y errores de medición subpíxel.
      const needsScroll = natural >= max - SCROLL_SLACK_PX
      bodyEl = syncBodyOverflow(shell, needsScroll)

      if (first) {
        first = false
        shell.style.transition = 'none'
        shell.style.height = `${to}px`
        void shell.offsetHeight
        shell.style.transition = ''
        last = to
        locked = false
        return
      }

      if (Math.abs(to - last) < 1 && Math.abs(to - from) < 1) {
        locked = false
        return
      }

      shell.style.transition = 'none'
      shell.style.height = `${from}px`
      void shell.offsetHeight
      shell.style.transition = ''
      shell.style.height = `${to}px`
      last = to
      locked = false
    }

    const schedule = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(apply)
    }

    const ro = new ResizeObserver(schedule)
    const body = shell.querySelector('.modal__body')
    bodyEl = body
    if (body) ro.observe(body)
    const header = shell.querySelector('.modal__header')
    const footer = shell.querySelector('.modal__footer')
    if (header) ro.observe(header)
    if (footer) ro.observe(footer)
    // Por si el layout cambia con el host del FormOverlay
    const host = shell.querySelector('.form-overlay-host')
    if (host) ro.observe(host)

    const mo = body
      ? new MutationObserver(schedule)
      : null
    mo?.observe(body, {
      childList: true,
      subtree: true,
      characterData: true,
      // No observar attributes: genera loops al abrir paneles/acordeones.
    })

    schedule()
    window.addEventListener('resize', schedule)
    window.visualViewport?.addEventListener('resize', schedule)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      mo?.disconnect()
      window.removeEventListener('resize', schedule)
      window.visualViewport?.removeEventListener('resize', schedule)
      shell.style.height = ''
      shell.style.transition = ''
      if (bodyEl) bodyEl.style.overflowY = ''
    }
  }, [shellRef, active])
}
