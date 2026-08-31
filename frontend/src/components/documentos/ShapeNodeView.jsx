import { useEffect, useRef } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import {
  clamp,
  logoContentBox,
  logoPercentsFromContentPx,
  clampLogoPercents,
} from './LogoNodeView.jsx'

const MIN_W = 24
const MIN_H = 8
const MAX_W = 640
const MAX_H = 480

export function shapeCss(attrs) {
  const {
    shape = 'rect',
    fill = '#1e3a8a',
    stroke = 'transparent',
    strokeWidth = 0,
    width = 160,
    height = 24,
    opacity = 1,
  } = attrs
  const w = Number.parseInt(width, 10) || 160
  const h = Number.parseInt(height, 10) || 24
  const sw = Number.parseFloat(strokeWidth) || 0
  const radius = shape === 'ellipse' ? '50%' : shape === 'rounded' ? '8px' : '0'
  const parts = [
    `width:${w}px`,
    `height:${h}px`,
    `background:${fill || '#1e3a8a'}`,
    `opacity:${opacity ?? 1}`,
    `border-radius:${radius}`,
    'box-sizing:border-box',
  ]
  if (sw > 0 && stroke && stroke !== 'transparent') {
    parts.push(`border:${sw}px solid ${stroke}`)
  }
  return parts.join(';')
}

function shapeHost(editor, getPos, fallbackEl) {
  const pos = typeof getPos === 'function' ? getPos() : null
  if (typeof pos === 'number' && editor?.view) {
    const dom = editor.view.nodeDOM(pos)
    if (dom instanceof HTMLElement) return dom
  }
  return (
    fallbackEl?.closest?.('.sgaf-shape-node, .node-documentShape')
    || fallbackEl
  )
}

/** Posición izquierda del cuerpo en coords del área útil (sin el handle). */
function shapeContentOrigin(leftPct, topPct, box) {
  const leftPx = ((Number.parseFloat(leftPct) || 0) / 100) * box.boxWidth
  const topPx = ((Number.parseFloat(topPct) || 0) / 100) * box.boxHeight
  return {
    x: leftPx - box.pad.left,
    y: topPx - box.pad.top,
  }
}

export function ShapeNodeView({ node, updateAttributes, selected, editor, getPos }) {
  const {
    shape,
    fill,
    width,
    height,
    left,
    top,
    stroke,
    strokeWidth,
    opacity,
  } = node.attrs
  const resizeStart = useRef({ x: 0, y: 0, w: 160, h: 24 })
  const dragging = useRef(false)
  const w = Number.parseInt(width, 10) || 160
  const h = Number.parseInt(height, 10) || 24

  const onResizePointerDown = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (!editor?.isEditable) return

    resizeStart.current = {
      x: event.clientX,
      y: event.clientY,
      w,
      h,
    }

    const onMove = (moveEvent) => {
      const box = logoContentBox(editor)
      // Límite = área útil; el handle no resta espacio al cuerpo
      const origin = box ? shapeContentOrigin(left, top, box) : { x: 0, y: 0 }
      const maxW = box ? Math.max(MIN_W, box.contentWidth - origin.x) : MAX_W
      const maxH = box ? Math.max(MIN_H, box.contentHeight - origin.y) : MAX_H
      const nextW = clamp(
        resizeStart.current.w + (moveEvent.clientX - resizeStart.current.x),
        MIN_W,
        Math.min(MAX_W, maxW),
      )
      let nextH = clamp(
        resizeStart.current.h + (moveEvent.clientY - resizeStart.current.y),
        MIN_H,
        Math.min(MAX_H, maxH),
      )
      if (shape === 'line') nextH = clamp(nextH, 2, 24)
      updateAttributes({
        width: String(Math.round(nextW)),
        height: String(Math.round(nextH)),
      })
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
    if (event.target.closest?.('.sgaf-shape-view__resize')) return
    if (!editor?.isEditable) return

    event.preventDefault()
    event.stopPropagation()

    const pos = getPos()
    if (typeof pos === 'number') editor.commands.setNodeSelection(pos)

    const host = shapeHost(editor, getPos, event.currentTarget)
    const box = logoContentBox(editor)
    if (!box || !host) return

    // Ancla al cuerpo (attrs), no al rect del host (puede incluir outline/handle)
    const hostBox = host.getBoundingClientRect()
    const offsetX = event.clientX - hostBox.left
    const offsetY = event.clientY - hostBox.top
    dragging.current = true

    const apply = (clientX, clientY, persist) => {
      const nextBox = logoContentBox(editor) || box
      const next = logoPercentsFromContentPx(
        clientX - offsetX - nextBox.contentLeft,
        clientY - offsetY - nextBox.contentTop,
        w,
        h,
        nextBox,
      )
      host.style.position = 'absolute'
      host.style.left = `${next.left}%`
      host.style.top = `${next.top}%`
      host.style.margin = '0'
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
    if (dragging.current) return
    const box = logoContentBox(editor)
    if (!box) return
    const next = clampLogoPercents(left, top, w, h, box)
    if (
      Math.abs(Number.parseFloat(next.left) - Number.parseFloat(left || '0')) < 0.05
      && Math.abs(Number.parseFloat(next.top) - Number.parseFloat(top || '0')) < 0.05
    ) return
    updateAttributes(next)
  }, [editor, left, top, w, h, updateAttributes])

  const label = shape === 'ellipse'
    ? 'Óvalo'
    : shape === 'rounded'
      ? 'Rectángulo redondeado'
      : shape === 'line'
        ? 'Barra'
        : 'Rectángulo'

  const radius = shape === 'ellipse' ? '50%' : shape === 'rounded' ? '8px' : 0
  const border = (Number.parseFloat(strokeWidth) || 0) > 0
    && stroke
    && stroke !== 'transparent'
    ? `${strokeWidth}px solid ${stroke}`
    : undefined

  return (
    <NodeViewWrapper
      as="div"
      className={`sgaf-shape-view${selected ? ' is-selected' : ''}`}
      data-sgaf-shape={shape}
      contentEditable={false}
      title={`${label}. Arrastre dentro de los márgenes de la página; use la esquina para el tamaño.`}
      onPointerDown={onMovePointerDown}
      style={{ width: w, height: h }}
    >
      <div
        className="sgaf-shape-view__body"
        style={{
          width: '100%',
          height: '100%',
          background: fill || '#1e3a8a',
          borderRadius: radius,
          opacity: opacity ?? 1,
          border,
        }}
      />
      <span
        className="sgaf-shape-view__resize"
        contentEditable={false}
        draggable={false}
        onPointerDown={onResizePointerDown}
        onMouseDown={(event) => event.stopPropagation()}
        aria-hidden
      />
    </NodeViewWrapper>
  )
}
