import { createContext, useContext, useEffect, useRef } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import { PAGE_GAP_PX, subscribePageChrome } from './layoutPageBreaks.js'
import { readPageLayout, readHfBandLayout } from './pageMetrics.js'

export const DocumentCatalogContext = createContext({ logosByKey: {} })

function useLogoSrc(key, fallback) {
  const { logosByKey } = useContext(DocumentCatalogContext)
  return fallback || logosByKey[key] || ''
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

/** Métricas de una hoja (área útil dentro de márgenes) o banda encabezado/pie. */
export function logoPageMetrics(editor) {
  const pm = editor?.view?.dom
  const pageEl = pm?.closest('.doc-page')
  if (!pm || !pageEl) return null
  const pmWidth = pm.getBoundingClientRect().width
  if (pmWidth < 8) return null

  const hfBand = readHfBandLayout(pageEl)
  if (hfBand) {
    const contentWidth = Math.max(0, pmWidth)
    const contentHeight = Math.max(0, hfBand.bandHeight)
    return {
      pageEl,
      pm,
      pageH: contentHeight,
      gap: PAGE_GAP_PX,
      pad: { left: 0, right: 0, top: 0, bottom: 0 },
      pmWidth: contentWidth,
      contentWidth,
      contentHeight,
      isHeader: true,
      hfBand: hfBand.kind,
    }
  }

  const layout = readPageLayout(pageEl)
  if (!layout) return null
  const { pageH, padTop, padRight, padBottom, padLeft } = layout
  const contentWidth = Math.max(0, pmWidth - padLeft - padRight)
  const contentHeight = Math.max(0, pageH - padTop - padBottom)
  return {
    pageEl,
    pm,
    pageH,
    gap: PAGE_GAP_PX,
    pad: { left: padLeft, right: padRight, top: padTop, bottom: padBottom },
    pmWidth,
    contentWidth,
    contentHeight,
    isHeader: false,
    hfBand: null,
  }
}

/** Convierte logoViewStyle → string CSS para la capa visible (.sgaf-logo-view). */
export function logoWrapperStyleCss(editor, attrs) {
  const style = logoViewStyle(editor, attrs)
  return Object.entries(style)
    .map(([key, val]) => `${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${val}`)
    .join(';')
}

function logoViewEl(editor, getPos, fallbackEl) {
  const pos = typeof getPos === 'function' ? getPos() : null
  if (typeof pos === 'number' && editor?.view) {
    const dom = editor.view.nodeDOM(pos)
    if (dom instanceof HTMLElement) {
      return dom.querySelector('.sgaf-logo-view') || dom
    }
  }
  return fallbackEl?.closest?.('.sgaf-logo-view') || fallbackEl
}

/** Posición absoluta de la capa visible; el nodo PM queda con huella 0×0 fuera del flujo horizontal. */
export function logoViewStyle(editor, attrs) {
  const m = logoPageMetrics(editor)
  if (!m) {
    const left = attrs?.left ?? '0'
    const top = attrs?.top ?? '0'
    return {
      position: 'absolute',
      left: `${left}%`,
      top: `${top}%`,
      zIndex: 10,
      width: 'max-content',
      margin: 0,
    }
  }
  const pageIdx = Math.max(0, (parseInt(attrs.page, 10) || 1) - 1)
  const leftPct = parseFloat(attrs.left) || 0
  const topPct = parseFloat(attrs.top) || 0
  const leftPx = m.hfBand
    ? (leftPct / 100) * m.contentWidth
    : m.pad.left + (leftPct / 100) * m.contentWidth
  let topPx
  if (m.hfBand) {
    topPx = (topPct / 100) * m.contentHeight
  } else if (m.isHeader) {
    topPx = m.pad.top + (topPct / 100) * m.contentHeight
  } else {
    topPx = m.pad.top + pageIdx * (m.pageH + m.gap) + (topPct / 100) * m.contentHeight
  }
  return {
    position: 'absolute',
    left: `${leftPx}px`,
    top: `${topPx}px`,
    zIndex: 10,
    width: 'max-content',
    margin: 0,
  }
}

/** Convierte coordenadas de puntero → página + % dentro del área útil. */
export function logoAttrsFromPointer(editor, clientX, clientY, logoWidth, logoHeight) {
  const m = logoPageMetrics(editor)
  if (!m) return { page: '1', left: '0', top: '0' }
  const pmRect = m.pm.getBoundingClientRect()
  const x = m.hfBand ? clientX - pmRect.left : clientX - pmRect.left - m.pad.left
  const yDoc = clientY - pmRect.top
  const maxX = Math.max(0, m.contentWidth - logoWidth)
  const maxY = Math.max(0, m.contentHeight - logoHeight)

  if (m.hfBand || m.isHeader) {
    const yInBand = m.hfBand ? yDoc : yDoc - m.pad.top
    return {
      page: '1',
      left: m.contentWidth ? ((clamp(x, 0, maxX) / m.contentWidth) * 100).toFixed(2) : '0',
      top: m.contentHeight ? ((clamp(yInBand, 0, maxY) / m.contentHeight) * 100).toFixed(2) : '0',
    }
  }

  const pageIdx = Math.max(0, Math.floor((yDoc - m.pad.top) / (m.pageH + m.gap)))
  const yInPage = yDoc - m.pad.top - pageIdx * (m.pageH + m.gap)
  return {
    page: String(pageIdx + 1),
    left: m.contentWidth ? ((clamp(x, 0, maxX) / m.contentWidth) * 100).toFixed(2) : '0',
    top: m.contentHeight ? ((clamp(yInPage, 0, maxY) / m.contentHeight) * 100).toFixed(2) : '0',
  }
}

export function clampLogoPageAttrs(editor, attrs, logoWidth, logoHeight) {
  const m = logoPageMetrics(editor)
  if (!m) return attrs
  const maxLeftPct = m.contentWidth ? (Math.max(0, m.contentWidth - logoWidth) / m.contentWidth) * 100 : 0
  const maxTopPct = m.contentHeight ? (Math.max(0, m.contentHeight - logoHeight) / m.contentHeight) * 100 : 0
  return {
    page: attrs.page || '1',
    left: clamp(parseFloat(attrs.left) || 0, 0, maxLeftPct).toFixed(2),
    top: clamp(parseFloat(attrs.top) || 0, 0, maxTopPct).toFixed(2),
  }
}

/** @deprecated Usado por formas; logos usan logoPageMetrics. */
export function logoContentBox(editor) {
  const m = logoPageMetrics(editor)
  if (!m) return null
  return {
    pad: m.pad,
    boxWidth: m.pmWidth,
    boxHeight: m.pageH,
    contentWidth: m.contentWidth,
    contentHeight: m.contentHeight,
    contentLeft: m.pm.getBoundingClientRect().left + m.pad.left,
    contentTop: m.pm.getBoundingClientRect().top + m.pad.top,
  }
}

export function logoPercentsFromContentPx(x, y, logoWidth, logoHeight, box) {
  const maxX = Math.max(0, box.contentWidth - logoWidth)
  const maxY = Math.max(0, box.contentHeight - logoHeight)
  const cx = clamp(x, 0, maxX)
  const cy = clamp(y, 0, maxY)
  return {
    left: box.contentWidth ? ((cx / box.contentWidth) * 100).toFixed(2) : '0',
    top: box.contentHeight ? ((cy / box.contentHeight) * 100).toFixed(2) : '0',
  }
}

export function clampLogoPercents(left, top, logoWidth, logoHeight, box) {
  const maxX = Math.max(0, box.contentWidth - logoWidth)
  const maxY = Math.max(0, box.contentHeight - logoHeight)
  const x = clamp(((Number.parseFloat(left) || 0) / 100) * box.contentWidth, 0, maxX)
  const y = clamp(((Number.parseFloat(top) || 0) / 100) * box.contentHeight, 0, maxY)
  return {
    left: box.contentWidth ? ((x / box.contentWidth) * 100).toFixed(2) : '0',
    top: box.contentHeight ? ((y / box.contentHeight) * 100).toFixed(2) : '0',
  }
}

export function LogoNodeView({ node, updateAttributes, selected, editor, getPos }) {
  const { previewUrl, label, width, key, textAlign, left, top, page } = node.attrs
  const src = useLogoSrc(key, previewUrl)
  const logoW = Number.parseInt(width, 10) || 140
  const resizeStart = useRef({ x: 0, w: 140 })
  const skipAlign = useRef(true)
  const dragging = useRef(false)
  const viewRef = useRef(null)

  const applyViewStyle = (viewEl, attrs) => {
    if (!viewEl) return
    viewEl.style.cssText = logoWrapperStyleCss(editor, attrs)
  }

  const onResizePointerDown = (event) => {
    event.preventDefault()
    event.stopPropagation()
    resizeStart.current = {
      x: event.clientX,
      w: Number.parseInt(width, 10) || 140,
    }
    const onMove = (moveEvent) => {
      const m = logoPageMetrics(editor)
      const logoW = clamp(
        resizeStart.current.w + (moveEvent.clientX - resizeStart.current.x),
        48,
        m ? Math.min(420, m.contentWidth) : 420,
      )
      updateAttributes({ width: String(Math.round(logoW)) })
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const onMovePointerDown = (event) => {
    if (event.button !== 0) return
    if (event.target.closest?.('.sgaf-logo-view__resize')) return
    if (!editor?.isEditable) return

    event.preventDefault()
    event.stopPropagation()

    const pos = getPos()
    if (typeof pos === 'number') editor.commands.setNodeSelection(pos)

    const viewEl = logoViewEl(editor, getPos, event.currentTarget)
    if (!viewEl) return
    const viewBox = viewEl.getBoundingClientRect()
    const offsetX = event.clientX - viewBox.left
    const offsetY = event.clientY - viewBox.top
    dragging.current = true

    const apply = (clientX, clientY, persist) => {
      const next = logoAttrsFromPointer(
        editor,
        clientX - offsetX,
        clientY - offsetY,
        logoW,
        Math.max(32, viewBox.height || 48),
      )
      applyViewStyle(viewEl, { ...node.attrs, ...next })
      if (persist) updateAttributes(next)
    }

    const onMove = (moveEvent) => apply(moveEvent.clientX, moveEvent.clientY, false)
    const onUp = (upEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      dragging.current = false
      apply(upEvent.clientX, upEvent.clientY, true)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  useEffect(() => {
    if (skipAlign.current) {
      skipAlign.current = false
      return
    }
    if (!textAlign || textAlign === 'justify' || dragging.current) return
    const m = logoPageMetrics(editor)
    if (!m || m.contentWidth < 48) return
    let leftPct = parseFloat(left) || 0
    const logoW = Number.parseInt(width, 10) || 140
    if (textAlign === 'center') {
      leftPct = m.contentWidth ? ((m.contentWidth - logoW) / 2 / m.contentWidth) * 100 : 0
    }
    if (textAlign === 'right') {
      leftPct = m.contentWidth ? ((m.contentWidth - logoW) / m.contentWidth) * 100 : 0
    }
    updateAttributes(clampLogoPageAttrs(editor, { page, left: leftPct.toFixed(2), top }, logoW, 48))
  }, [textAlign, editor, page, top, width, updateAttributes, left])

  useEffect(() => {
    const syncView = () => {
      const m = logoPageMetrics(editor)
      if (!m) return
      const viewEl = viewRef.current || logoViewEl(editor, getPos, null)
      if (viewEl) applyViewStyle(viewEl, node.attrs)
    }
    syncView()
    const pageEl = editor?.view?.dom?.closest('.doc-page')
    if (!pageEl) return undefined
    const unsub = subscribePageChrome(pageEl, syncView)
    let ro = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => syncView())
      ro.observe(pageEl)
    }
    return () => {
      unsub()
      ro?.disconnect()
    }
  }, [editor, getPos, page, left, top, width, node.attrs])

  return (
    <NodeViewWrapper
      as="div"
      ref={viewRef}
      className={`sgaf-logo-view${selected ? ' is-selected' : ''}`}
      data-sgaf-logo={key}
      data-page={page || '1'}
      contentEditable={false}
      style={logoViewStyle(editor, node.attrs)}
      title={`${label || key}. Arrastre dentro de los márgenes de la página; use la esquina para el tamaño.`}
      onPointerDown={onMovePointerDown}
    >
      {src ? (
        <img
          src={src}
          alt={label || key}
          width={logoW}
          draggable={false}
          className="sgaf-logo-var"
          style={{ width: `${logoW}px`, height: 'auto', display: 'block' }}
        />
      ) : (
        <span className="sgaf-logo-view__empty">{label || 'Logo'}</span>
      )}
      <span
        className="sgaf-logo-view__resize"
        contentEditable={false}
        draggable={false}
        onPointerDown={onResizePointerDown}
        onMouseDown={(event) => event.stopPropagation()}
        aria-hidden
      />
    </NodeViewWrapper>
  )
}
