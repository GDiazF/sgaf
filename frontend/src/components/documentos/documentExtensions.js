import { Extension, Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { TextSelection, Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { TableMap, cellAround } from '@tiptap/pm/tables'
import { LogoNodeView, logoAttrsFromPointer } from './LogoNodeView.jsx'
import { ShapeNodeView, shapeCss } from './ShapeNodeView.jsx'
import { cellBorderInlineStyle, normalizeTableBorderWidth } from './cellBorders.js'

function parseCellColwidth(element) {
  const colspan = Math.max(1, Number.parseInt(element.getAttribute('colspan') || '1', 10))
  for (const attr of ['colwidth', 'data-colwidth']) {
    const raw = element.getAttribute(attr)
    if (!raw) continue
    const parts = raw
      .split(',')
      .map((item) => Number.parseInt(String(item).trim(), 10))
      .filter((item) => Number.isFinite(item) && item > 0)
    if (parts.length === colspan) return parts
    if (parts.length === 1 && colspan === 1) return parts
  }
  const styleMatch = String(element.style?.width || '').match(/^(\d+(?:\.\d+)?)px$/)
  if (styleMatch) return [Math.round(Number.parseFloat(styleMatch[1]))]
  return null
}

function withCellLayout(CellExtension) {
  return CellExtension.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        colwidth: {
          default: null,
          parseHTML: (element) => parseCellColwidth(element),
          renderHTML: (attributes) => {
            if (!attributes.colwidth?.length) return {}
            const joined = attributes.colwidth.join(',')
            return { colwidth: joined, 'data-colwidth': joined }
          },
        },
        backgroundColor: {
          default: null,
          parseHTML: (element) => element.style.backgroundColor || null,
          renderHTML: (attributes) => {
            if (!attributes.backgroundColor) return {}
            return { style: `background-color: ${attributes.backgroundColor}` }
          },
        },
        height: {
          default: null,
          parseHTML: (element) => {
            const raw = element.style.height || element.getAttribute('data-height')
            if (!raw) return null
            const num = Number.parseInt(String(raw), 10)
            return Number.isFinite(num) ? num : null
          },
          renderHTML: (attributes) => {
            if (!attributes.height) return {}
            const h = attributes.height
            return {
              'data-height': String(h),
              style: `height: ${h}px; max-height: ${h}px; overflow: hidden; padding-top: ${h < 20 ? 0 : 1}px; padding-bottom: ${h < 20 ? 0 : 1}px`,
            }
          },
        },
        textAlign: {
          default: null,
          parseHTML: (element) => element.style.textAlign || element.getAttribute('data-align') || null,
          renderHTML: (attributes) => {
            if (!attributes.textAlign) return {}
            return {
              'data-align': attributes.textAlign,
              style: `text-align: ${attributes.textAlign}`,
            }
          },
        },
        verticalAlign: {
          default: null,
          parseHTML: (element) => element.style.verticalAlign || element.getAttribute('data-valign') || null,
          renderHTML: (attributes) => {
            if (!attributes.verticalAlign) return {}
            return {
              'data-valign': attributes.verticalAlign,
              style: `vertical-align: ${attributes.verticalAlign}`,
            }
          },
        },
        borderSides: {
          default: null,
          parseHTML: (element) => {
            const raw = element.getAttribute('data-border-sides')
            if (!raw) return null
            return raw === 'none' ? 'none' : raw
          },
          renderHTML: (attributes) => {
            if (!attributes.borderSides) return {}
            return { 'data-border-sides': attributes.borderSides }
          },
        },
        borderWidth: {
          default: 1,
          parseHTML: (element) => normalizeTableBorderWidth(element.getAttribute('data-border-width') || '1'),
          renderHTML: (attributes) => ({
            'data-border-width': String(normalizeTableBorderWidth(attributes.borderWidth)),
          }),
        },
      }
    },
    renderHTML({ node, HTMLAttributes }) {
      const tag = this.name === 'tableHeader' ? 'th' : 'td'
      const colwidth = HTMLAttributes.colwidth
      const widths = Array.isArray(colwidth)
        ? colwidth
        : String(colwidth || '')
          .split(',')
          .map((item) => Number.parseInt(item, 10))
          .filter((item) => Number.isFinite(item) && item > 0)
      const width = widths[0]
      const borderStyle = cellBorderInlineStyle(node.attrs.borderSides, node.attrs.borderWidth)
      const style = [width ? `width: ${width}px` : '', HTMLAttributes.style, borderStyle]
        .filter(Boolean)
        .join('; ')
      return [
        tag,
        mergeAttributes(
          this.options.HTMLAttributes,
          HTMLAttributes,
          style ? { style } : {},
        ),
        0,
      ]
    },
  })
}

export const ColoredTableCell = withCellLayout(TableCell)
export const ColoredTableHeader = withCellLayout(TableHeader)

export const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {}
              return { style: `font-size: ${attributes.fontSize}` }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize) =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    }
  },
})

export const BackgroundColor = Extension.create({
  name: 'backgroundColor',
  addOptions() {
    return { types: ['textStyle'] }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          backgroundColor: {
            default: null,
            parseHTML: (element) => element.style.backgroundColor || null,
            renderHTML: (attributes) => {
              if (!attributes.backgroundColor) return {}
              return { style: `background-color: ${attributes.backgroundColor}` }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setBackgroundColor:
        (backgroundColor) =>
        ({ chain }) =>
          chain().setMark('textStyle', { backgroundColor }).run(),
      unsetBackgroundColor:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { backgroundColor: null }).removeEmptyTextStyle().run(),
    }
  },
})

export const LineHeight = Extension.create({
  name: 'lineHeight',
  addOptions() {
    return { types: ['paragraph', 'heading'] }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) return {}
              return { style: `line-height: ${attributes.lineHeight}` }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setLineHeight:
        (lineHeight) =>
        ({ commands }) =>
          this.options.types.every((type) =>
            commands.updateAttributes(type, { lineHeight }),
          ),
    }
  },
})

export const TemplateVariable = Node.create({
  name: 'templateVariable',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      key: { default: '' },
      label: { default: '' },
    }
  },
  parseHTML() {
    return [
      {
        tag: 'span[data-sgaf-var]',
        getAttrs: (el) => ({
          key: el.getAttribute('data-sgaf-var'),
          label: el.getAttribute('data-label') || el.textContent || '',
        }),
      },
    ]
  },
  renderHTML({ HTMLAttributes }) {
    const key = HTMLAttributes.key || ''
    return [
      'span',
      mergeAttributes({
        'data-sgaf-var': key,
        'data-label': HTMLAttributes.label || key,
        class: 'sgaf-var',
      }),
      `{{ ${key} }}`,
    ]
  },
  addCommands() {
    return {
      insertTemplateVariable:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    }
  },
})

function parsePercent(value) {
  if (value == null || value === '') return null
  const num = Number.parseFloat(String(value).replace('%', ''))
  return Number.isFinite(num) ? String(num) : null
}

function parseLogoPosition(el, axis) {
  const fromData = parsePercent(el.getAttribute(`data-${axis}`))
  if (fromData != null) return fromData
  const raw = el.style?.[axis] || ''
  if (String(raw).includes('mm')) return '0'
  return parsePercent(raw) || '0'
}

export const LogoVariable = Node.create({
  name: 'logoVariable',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,
  addAttributes() {
    return {
      key: { default: '' },
      label: { default: '' },
      width: { default: '140' },
      previewUrl: { default: '' },
      left: {
        default: '0',
        parseHTML: (element) => parseLogoPosition(element, 'left'),
      },
      top: {
        default: '0',
        parseHTML: (element) => parseLogoPosition(element, 'top'),
      },
      page: {
        default: '1',
        parseHTML: (element) => element.getAttribute('data-page') || '1',
      },
    }
  },
  parseHTML() {
    const logoAttrs = (el) => ({
      key: el.getAttribute('data-sgaf-logo'),
      label: el.getAttribute('alt') || '',
      width: el.getAttribute('width') || '140',
      previewUrl: el.getAttribute('data-preview') || el.getAttribute('src') || '',
      left: parseLogoPosition(el, 'left'),
      top: parseLogoPosition(el, 'top'),
      page: el.getAttribute('data-page') || '1',
    })

    return [
      {
        tag: 'img[data-sgaf-logo]',
        getAttrs: logoAttrs,
      },
      {
        tag: 'div.sgaf-logo-slot',
        getAttrs: (el) => {
          const img = el.querySelector('img[data-sgaf-logo]')
          if (!img) return false
          return logoAttrs(img)
        },
      },
    ]
  },
  renderHTML({ HTMLAttributes }) {
    const left = HTMLAttributes.left ?? '0'
    const top = HTMLAttributes.top ?? '0'
    const page = HTMLAttributes.page ?? '1'
    const width = HTMLAttributes.width || '140'
    return [
      'div',
      {
        class: 'sgaf-logo-slot',
        style: 'display:block;width:0;height:0;overflow:visible;margin:0;padding:0;border:0;',
      },
      [
        'img',
        mergeAttributes({
          'data-sgaf-logo': HTMLAttributes.key,
          'data-preview': HTMLAttributes.previewUrl || '',
          'data-left': left,
          'data-top': top,
          'data-page': page,
          class: 'sgaf-logo-var',
          alt: HTMLAttributes.label || HTMLAttributes.key,
          width,
          src: HTMLAttributes.previewUrl || '',
          style: `position:absolute;left:${left}%;top:${top}%;width:${width}px;height:auto;margin:0;`,
        }),
      ],
    ]
  },
  addNodeView() {
    return ReactNodeViewRenderer(LogoNodeView, {
      as: 'div',
      className: 'sgaf-logo-node',
      attrs: () => ({
        contenteditable: 'false',
      }),
      stopEvent: ({ event }) => {
        if (['copy', 'cut', 'paste', 'drop'].includes(event.type)) return false
        return true
      },
      ignoreMutation: (mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') return true
        return false
      },
    })
  },
  addCommands() {
    return {
      insertLogoVariable:
        (attrs) =>
        ({ editor, tr, dispatch }) => {
          const view = editor.view
          const logoW = Number.parseInt(attrs.width, 10) || 140
          let placement = { page: '1', left: '0', top: '0' }
          try {
            const coords = view.coordsAtPos(view.state.selection.from)
            placement = logoAttrsFromPointer(editor, coords.left, coords.top, logoW, 48)
          } catch {
            placement = logoAttrsFromPointer(editor, 0, 0, logoW, 48)
          }
          const node = editor.schema.nodes.logoVariable.create({
            ...attrs,
            ...placement,
          })
          if (dispatch) dispatch(tr.insert(0, node))
          return true
        },
    }
  },
})

function shapePositionStyle(attrs) {
  const left = attrs.left ?? '0'
  const top = attrs.top ?? '0'
  return `position:absolute;left:${left}%;top:${top}%;z-index:1;margin:0;`
}

export const DocumentShape = Node.create({
  name: 'documentShape',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,
  addAttributes() {
    return {
      shape: { default: 'rect' },
      fill: { default: '#1e3a8a' },
      stroke: { default: 'transparent' },
      strokeWidth: { default: '0' },
      width: { default: '160' },
      height: { default: '24' },
      opacity: { default: '1' },
      left: {
        default: '0',
        parseHTML: (element) => parsePercent(element.getAttribute('data-left') || element.style.left) || '0',
      },
      top: {
        default: '0',
        parseHTML: (element) => parsePercent(element.getAttribute('data-top') || element.style.top) || '0',
      },
    }
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-sgaf-shape]',
        getAttrs: (el) => ({
          shape: el.getAttribute('data-sgaf-shape') || 'rect',
          fill: el.getAttribute('data-fill') || el.style.backgroundColor || '#1e3a8a',
          stroke: el.getAttribute('data-stroke') || 'transparent',
          strokeWidth: el.getAttribute('data-stroke-width') || '0',
          width: el.getAttribute('data-width') || String(parseInt(el.style.width, 10) || 160),
          height: el.getAttribute('data-height') || String(parseInt(el.style.height, 10) || 24),
          opacity: el.getAttribute('data-opacity') || el.style.opacity || '1',
          left: parsePercent(el.getAttribute('data-left') || el.style.left) || '0',
          top: parsePercent(el.getAttribute('data-top') || el.style.top) || '0',
        }),
      },
    ]
  },
  renderHTML({ HTMLAttributes }) {
    const left = HTMLAttributes.left ?? '0'
    const top = HTMLAttributes.top ?? '0'
    const width = HTMLAttributes.width || '160'
    const height = HTMLAttributes.height || '24'
    const shape = HTMLAttributes.shape || 'rect'
    return [
      'div',
      mergeAttributes({
        'data-sgaf-shape': shape,
        'data-fill': HTMLAttributes.fill || '#1e3a8a',
        'data-stroke': HTMLAttributes.stroke || 'transparent',
        'data-stroke-width': HTMLAttributes.strokeWidth || '0',
        'data-width': width,
        'data-height': height,
        'data-opacity': HTMLAttributes.opacity || '1',
        'data-left': left,
        'data-top': top,
        class: 'sgaf-shape',
        style: `position:absolute;left:${left}%;top:${top}%;${shapeCss({
          shape,
          fill: HTMLAttributes.fill,
          stroke: HTMLAttributes.stroke,
          strokeWidth: HTMLAttributes.strokeWidth,
          width,
          height,
          opacity: HTMLAttributes.opacity,
        })}`,
      }),
    ]
  },
  addNodeView() {
    return ReactNodeViewRenderer(ShapeNodeView, {
      as: 'div',
      className: 'sgaf-shape-node',
      attrs: ({ node }) => ({
        contenteditable: 'false',
        style: shapePositionStyle(node.attrs),
      }),
      // Igual que logos: el drag lo maneja el NodeView, no ProseMirror
      stopEvent: ({ event }) => {
        if (['copy', 'cut', 'paste', 'drop'].includes(event.type)) return false
        return true
      },
      ignoreMutation: (mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') return true
        return false
      },
    })
  },
  addCommands() {
    return {
      insertDocumentShape:
        (attrs = {}) =>
        ({ editor, tr, dispatch }) => {
          const view = editor.view
          const box = logoContentBox(editor)
          const width = attrs.width || (attrs.shape === 'line' ? '200' : '160')
          const height = attrs.height || (attrs.shape === 'line' ? '8' : attrs.shape === 'ellipse' ? '80' : '24')
          let left = '0'
          let top = '0'
          try {
            const coords = view.coordsAtPos(view.state.selection.from)
            if (box) {
              const next = logoPercentsFromContentPx(
                coords.left - box.contentLeft,
                coords.top - box.contentTop,
                Number.parseInt(width, 10) || 160,
                Number.parseInt(height, 10) || 24,
                box,
              )
              left = next.left
              top = next.top
            }
          } catch {
            if (box) {
              const next = logoPercentsFromContentPx(
                0,
                0,
                Number.parseInt(width, 10) || 160,
                Number.parseInt(height, 10) || 24,
                box,
              )
              left = next.left
              top = next.top
            }
          }
          const node = editor.schema.nodes.documentShape.create({
            shape: 'rect',
            fill: '#1e3a8a',
            stroke: 'transparent',
            strokeWidth: '0',
            opacity: '1',
            ...attrs,
            width,
            height,
            left,
            top,
          })
          if (dispatch) dispatch(tr.insert(0, node))
          return true
        },
      updateDocumentShape:
        (attrs) =>
        ({ state, dispatch, tr }) => {
          const { selection } = state
          const node = selection.node
          if (!node || node.type.name !== 'documentShape') return false
          if (dispatch) {
            tr.setNodeMarkup(selection.from, undefined, { ...node.attrs, ...attrs })
            dispatch(tr)
          }
          return true
        },
    }
  },
})

export const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  selectable: true,
  parseHTML() {
    return [{ tag: 'div[data-sgaf-page-break]' }]
  },
  renderHTML() {
    return ['div', { 'data-sgaf-page-break': '', class: 'sgaf-page-break' }]
  },
  addNodeView() {
    return () => {
      const dom = document.createElement('div')
      dom.className = 'sgaf-page-break'
      dom.setAttribute('data-sgaf-page-break', '')
      return {
        dom,
        ignoreMutation: () => true,
      }
    }
  },
  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ state, dispatch }) => {
          const type = state.schema.nodes.pageBreak
          if (!type) return false
          const { $from } = state.selection
          const insertPos = $from.depth === 0 ? $from.pos : $from.after(1)
          const node = type.create()
          const paragraph = state.schema.nodes.paragraph.create()
          if (dispatch) {
            const tr = state.tr.insert(insertPos, node)
            tr.insert(insertPos + node.nodeSize, paragraph)
            tr.setSelection(TextSelection.create(tr.doc, insertPos + node.nodeSize + 1))
            tr.scrollIntoView()
            dispatch(tr)
          }
          return true
        },
    }
  },
  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => this.editor.commands.setPageBreak(),
      'Control-Enter': () => this.editor.commands.setPageBreak(),
    }
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('sgafPageBreakKeys'),
        props: {
          handleKeyDown: (_view, event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
              event.preventDefault()
              return this.editor.commands.setPageBreak()
            }
            return false
          },
        },
      }),
    ]
  },
})

function findTable($pos) {
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const node = $pos.node(depth)
    if (node.type.spec.tableRole === 'table') {
      return { node, pos: $pos.before(depth) }
    }
  }
  return null
}

function tableAndRowFromCell(view, cellEl) {
  const box = cellEl.getBoundingClientRect()
  const found = view.posAtCoords({
    left: box.left + Math.min(16, box.width / 2),
    top: box.top + Math.min(8, box.height / 2),
  })
  if (!found) return null
  try {
    const $cell = cellAround(view.state.doc.resolve(found.pos))
    if (!$cell) return null
    const table = findTable($cell)
    if (!table) return null
    const map = TableMap.get(table.node)
    const rel = $cell.pos - table.pos - 1
    const rect = map.findCell(rel)
    return { table, map, rect, rowEl: cellEl.closest('tr') }
  } catch {
    return null
  }
}

function applyRowHeightFromInfo(view, info, height) {
  const seen = new Set()
  const { tr } = view.state
  for (let col = 0; col < info.map.width; col += 1) {
    const cellOffset = info.map.map[info.rect.top * info.map.width + col]
    if (seen.has(cellOffset)) continue
    seen.add(cellOffset)
    const cellPos = info.table.pos + 1 + cellOffset
    const cell = view.state.doc.nodeAt(cellPos)
    if (!cell) continue
    tr.setNodeMarkup(cellPos, undefined, { ...cell.attrs, height })
  }
  view.dispatch(tr)
}

const MIN_ROW_HEIGHT = 8

function paintRowHeight(rowEl, height) {
  if (!rowEl) return
  const padY = height < 20 ? 0 : height < 28 ? 1 : 4
  const inner = Math.max(0, height - padY * 2)
  rowEl.style.height = `${height}px`
  rowEl.style.maxHeight = `${height}px`
  for (const c of rowEl.querySelectorAll('td, th')) {
    c.style.height = `${height}px`
    c.style.maxHeight = `${height}px`
    c.style.minHeight = '0px'
    c.style.overflow = 'hidden'
    c.style.paddingTop = `${padY}px`
    c.style.paddingBottom = `${padY}px`
    c.setAttribute('data-height', String(height))
    for (const child of c.children) {
      if (child.classList?.contains('table-row-resize-handle')) continue
      if (child.classList?.contains('table-left-resize-handle')) continue
      if (child.classList?.contains('column-resize-handle')) continue
      child.style.margin = '0'
      child.style.maxHeight = `${inner}px`
      child.style.overflow = 'hidden'
      child.style.lineHeight = '1'
    }
  }
}

function startRowResize(view, event, cell) {
  event.preventDefault()
  event.stopPropagation()
  const info = tableAndRowFromCell(view, cell)
  const rowEl = cell.closest('tr')
  const startY = event.clientY
  const startH = rowEl?.getBoundingClientRect().height || cell.offsetHeight
  view.dom.classList.add('row-resize-cursor')
  rowEl?.classList.add('is-row-resizing')

  const paint = (clientY) => {
    const next = Math.max(MIN_ROW_HEIGHT, Math.round(startH + (clientY - startY)))
    paintRowHeight(rowEl, next)
    return next
  }

  const onMove = (moveEvent) => {
    paint(moveEvent.clientY)
  }
  const onUp = (upEvent) => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    view.dom.classList.remove('row-resize-cursor')
    rowEl?.classList.remove('is-row-resizing')
    const height = paint(upEvent.clientY)
    if (info) applyRowHeightFromInfo(view, info, height)
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
  return true
}

function rowHandleDecorations(doc, holder) {
  const decos = []
  doc.descendants((node, pos) => {
    if (node.type.name !== 'table') return
    const map = TableMap.get(node)
    const seen = new Set()
    for (let row = 0; row < map.height; row += 1) {
      for (let col = 0; col < map.width; col += 1) {
        const offset = map.map[row * map.width + col]
        if (seen.has(offset)) continue
        seen.add(offset)
        const cellPos = pos + 1 + offset
        const cell = node.nodeAt(offset)
        if (!cell) continue
        decos.push(
          Decoration.widget(
            cellPos + 1,
            () => {
              const el = document.createElement('div')
              el.className = 'table-row-resize-handle'
              el.contentEditable = 'false'
              el.addEventListener('pointerdown', (event) => {
                const view = holder.view
                if (event.button !== 0 || !view?.editable) return
                event.preventDefault()
                event.stopPropagation()
                const cellEl = el.closest('td, th')
                if (cellEl) startRowResize(view, event, cellEl)
              })
              return el
            },
            { side: 1, ignoreSelection: true, key: `row-h-${cellPos}`, stopEvent: () => true },
          ),
        )
      }
    }
  })
  return DecorationSet.create(doc, decos)
}

export const TableRowResize = Extension.create({
  name: 'tableRowResize',
  addProseMirrorPlugins() {
    const holder = { view: null }
    return [
      new Plugin({
        key: new PluginKey('sgafTableRowResize'),
        view(view) {
          holder.view = view
          return {
            destroy() {
              holder.view = null
            },
          }
        },
        props: {
          decorations: (state) => rowHandleDecorations(state.doc, holder),
        },
      }),
    ]
  },
})
