import { createContext, useContext, useEffect, useRef } from 'react'
import { NodeViewWrapper } from '@tiptap/react'

export const DocumentCatalogContext = createContext({ logosByKey: {} })

function useLogoSrc(key, fallback) {
  const { logosByKey } = useContext(DocumentCatalogContext)
  return fallback || logosByKey[key] || ''
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function logoContentBox(editor) {
  const el = editor?.view?.dom
  if (!el) return null
  const rect = el.getBoundingClientRect()
  const cs = getComputedStyle(el)
  const pad = {
    left: parseFloat(cs.paddingLeft) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    top: parseFloat(cs.paddingTop) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
  }
  const boxWidth = rect.width
  const boxHeight = rect.height
  const contentWidth = Math.max(0, boxWidth - pad.left - pad.right)
  const contentHeight = Math.max(0, boxHeight - pad.top - pad.bottom)
  return {
    pad,
    boxWidth,
    boxHeight,
    contentWidth,
    contentHeight,
    contentLeft: rect.left + pad.left,
    contentTop: rect.top + pad.top,
  }
}

export function clampLogoPercents(left, top, logoWidth, logoHeight, box) {
  const maxX = Math.max(0, box.contentWidth - logoWidth)
  const maxY = Math.max(0, box.contentHeight - logoHeight)
  const x = clamp(((Number.parseFloat(left) || 0) / 100) * box.boxWidth - box.pad.left, 0, maxX)
  const y = clamp(((Number.parseFloat(top) || 0) / 100) * box.boxHeight - box.pad.top, 0, maxY)
  return {
    left: box.boxWidth ? (((box.pad.left + x) / box.boxWidth) * 100).toFixed(2) : '0',
    top: box.boxHeight ? (((box.pad.top + y) / box.boxHeight) * 100).toFixed(2) : '0',
  }
}

export function logoPercentsFromContentPx(x, y, logoWidth, logoHeight, box) {
  const maxX = Math.max(0, box.contentWidth - logoWidth)
  const maxY = Math.max(0, box.contentHeight - logoHeight)
  const cx = clamp(x, 0, maxX)
  const cy = clamp(y, 0, maxY)
  return {
    left: box.boxWidth ? (((box.pad.left + cx) / box.boxWidth) * 100).toFixed(2) : '0',
    top: box.boxHeight ? (((box.pad.top + cy) / box.boxHeight) * 100).toFixed(2) : '0',
  }
}

export function LogoNodeView({ node, updateAttributes, selected, editor, getPos }) {
  const { previewUrl, label, width, key, textAlign, left, top } = node.attrs
  const src = useLogoSrc(key, previewUrl)
  const resizeStart = useRef({ x: 0, w: 140 })
  const skipAlign = useRef(true)
  const dragging = useRef(false)

  const onResizePointerDown = (event) => {
    event.preventDefault()
    event.stopPropagation()
    resizeStart.current = {
      x: event.clientX,
      w: Number.parseInt(width, 10) || 140,
    }
    const onMove = (moveEvent) => {
      const box = logoContentBox(editor)
      const leftPx = box ? ((Number.parseFloat(left) || 0) / 100) * box.boxWidth : 0
      const maxW = box ? Math.max(48, box.boxWidth - box.pad.right - leftPx) : 420
      const next = clamp(resizeStart.current.w + (moveEvent.clientX - resizeStart.current.x), 48, Math.min(420, maxW))
      updateAttributes({ width: String(Math.round(next)) })
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

    const host = event.currentTarget.closest('.sgaf-logo-node') || event.currentTarget
    const box = logoContentBox(editor)
    if (!box || !host) return

    const hostBox = host.getBoundingClientRect()
    const offsetX = event.clientX - hostBox.left
    const offsetY = event.clientY - hostBox.top
    dragging.current = true

    const apply = (clientX, clientY, persist) => {
      const nextBox = logoContentBox(editor) || box
      const size = host.getBoundingClientRect()
      const next = logoPercentsFromContentPx(
        clientX - offsetX - nextBox.contentLeft,
        clientY - offsetY - nextBox.contentTop,
        size.width,
        size.height,
        nextBox,
      )
      host.style.position = 'absolute'
      host.style.left = `${next.left}%`
      host.style.top = `${next.top}%`
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
    const pos = getPos()
    if (typeof pos !== 'number') return
    const box = logoContentBox(editor)
    const nodeDom = editor?.view?.nodeDOM(pos)
    const hostBox = nodeDom?.getBoundingClientRect?.()
    if (!box || !hostBox) return
    let x = 0
    if (textAlign === 'center') x = (box.contentWidth - hostBox.width) / 2
    if (textAlign === 'right') x = box.contentWidth - hostBox.width
    updateAttributes(logoPercentsFromContentPx(x, ((Number.parseFloat(top) || 0) / 100) * box.boxHeight - box.pad.top, hostBox.width, hostBox.height, box))
  }, [textAlign, editor, getPos, updateAttributes, top])

  useEffect(() => {
    if (dragging.current) return
    const box = logoContentBox(editor)
    const pos = getPos()
    if (!box || typeof pos !== 'number') return
    const nodeDom = editor?.view?.nodeDOM(pos)
    const hostBox = nodeDom?.getBoundingClientRect?.()
    if (!hostBox) return
    const next = clampLogoPercents(left, top, hostBox.width, hostBox.height, box)
    if (
      Math.abs(Number.parseFloat(next.left) - Number.parseFloat(left || '0')) < 0.05
      && Math.abs(Number.parseFloat(next.top) - Number.parseFloat(top || '0')) < 0.05
    ) return
    updateAttributes(next)
  }, [editor, getPos, left, top, width, updateAttributes])

  return (
    <NodeViewWrapper
      as="div"
      className={`sgaf-logo-view${selected ? ' is-selected' : ''}`}
      data-sgaf-logo={key}
      contentEditable={false}
      title={`${label || key}. Arrastre dentro de los márgenes de la página; use la esquina para el tamaño.`}
      onPointerDown={onMovePointerDown}
    >
      {src ? (
        <img
          src={src}
          alt={label || key}
          width={width || 140}
          draggable={false}
          className="sgaf-logo-var"
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
