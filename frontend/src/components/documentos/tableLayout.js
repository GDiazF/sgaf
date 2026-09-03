import { mergeAttributes } from '@tiptap/core'
import { TextSelection, Plugin, PluginKey } from '@tiptap/pm/state'
import TableRow from '@tiptap/extension-table-row'
import { TableMap, CellSelection, deleteRow, deleteColumn, deleteTable } from '@tiptap/pm/tables'
import Table, { TableView, createColGroup } from '@tiptap/extension-table'
import { setCellBordersCommand, normalizeTableBorderWidth } from './cellBorders.js'

export const MIN_COL_WIDTH = 32
const LEFT_HIT = 16
const NESTED_LEFT_HIT = 24

/** Plantillas guardadas sin colwidth en celdas: inferir desde colgroup antes de cargar. */
export function hydrateTableColwidthInHtml(html) {
  if (!html || !String(html).includes('<table')) return html || ''
  const doc = new DOMParser().parseFromString(`<div id="sgaf-hydrate-root">${html}</div>`, 'text/html')
  const root = doc.getElementById('sgaf-hydrate-root')
  if (!root) return html

  root.querySelectorAll('table').forEach((table) => {
    const cols = [...table.querySelectorAll(':scope > colgroup > col')]
    if (!cols.length) return
    const widths = cols.map((col) => {
      const raw = col.getAttribute('style') || ''
      const match = raw.match(/width:\s*(\d+(?:\.\d+)?)px/)
      return match ? Math.round(Number.parseFloat(match[1])) : 0
    })
    if (!widths.some((w) => w > 0)) return

    const firstRow = table.querySelector('tr')
    if (!firstRow) return
    let colIndex = 0
    firstRow.querySelectorAll('th, td').forEach((cell) => {
      const span = Math.max(1, Number.parseInt(cell.getAttribute('colspan') || '1', 10))
      if (cell.getAttribute('colwidth') || cell.getAttribute('data-colwidth')) {
        colIndex += span
        return
      }
      const slice = widths.slice(colIndex, colIndex + span)
      if (!slice.length || !slice.some((w) => w > 0)) {
        colIndex += span
        return
      }
      const joined = slice.map((w) => (w > 0 ? w : MIN_COL_WIDTH)).join(',')
      cell.setAttribute('colwidth', joined)
      cell.setAttribute('data-colwidth', joined)
      colIndex += span
    })
  })

  return root.innerHTML
}

export const TABLE_BORDER_PRESETS = [
  { value: 'all', label: 'Todos los bordes' },
  { value: 'none', label: 'Sin bordes' },
  { value: 'outer', label: 'Exteriores' },
  { value: 'inner', label: 'Interiores' },
  { value: 'horizontal', label: 'Horizontales' },
  { value: 'vertical', label: 'Verticales' },
  { value: 'top', label: 'Superior' },
  { value: 'bottom', label: 'Inferior' },
  { value: 'left', label: 'Izquierdo' },
  { value: 'right', label: 'Derecho' },
  { value: 'top-bottom', label: 'Superior e inferior' },
  { value: 'left-right', label: 'Izquierdo y derecho' },
]

export { TABLE_BORDER_WIDTH_PRESETS, normalizeTableBorderWidth, borderSidesToPreset } from './cellBorders.js'

const TABLE_BORDER_VALUES = new Set(TABLE_BORDER_PRESETS.map((p) => p.value))

export function normalizeTableBorders(value) {
  if (value === false || value === 0 || value === '0' || value === 'false' || value === 'off') return 'none'
  if (value === true || value === 1 || value === '1' || value === 'true' || value === 'on' || value == null || value === '') {
    return 'all'
  }
  const raw = String(value)
  return TABLE_BORDER_VALUES.has(raw) ? raw : 'all'
}

export function tableBordersDataAttr(value) {
  const normalized = normalizeTableBorders(value)
  return normalized === 'all' ? null : normalized
}

export function tableBorderWidthDataAttr(value) {
  const width = normalizeTableBorderWidth(value)
  return width === 1 ? null : String(width)
}

export function editorContentWidth(view) {
  const el = view?.dom
  if (!el) return null
  const cs = getComputedStyle(el)
  const width = el.clientWidth - parseFloat(cs.paddingLeft || '0') - parseFloat(cs.paddingRight || '0')
  if (width < 64) return null
  return Math.max(MIN_COL_WIDTH, Math.floor(width))
}

export function tablePixelWidth(tableNode) {
  const widths = columnWidths(tableNode)
  if (!widths.length) return null
  const sum = widths.reduce((acc, w) => acc + (w > 0 ? w : 0), 0)
  return sum > 0 ? sum : null
}

function evenWidths(count, budget) {
  const n = Math.max(1, count)
  const usable = Math.max(n, budget)
  const base = Math.floor(usable / n)
  const rem = usable - base * n
  return Array.from({ length: n }, (_, i) => base + (i === n - 1 ? rem : 0))
}

function minColFor(count, budget) {
  return Math.max(1, Math.min(MIN_COL_WIDTH, Math.floor(budget / Math.max(1, count))))
}

function fitWidths(widths, budget) {
  const minCol = minColFor(widths.length, budget)
  const next = widths.map((w) => Math.max(minCol, w || minCol))
  let overflow = next.reduce((sum, w) => sum + w, 0) - budget
  for (let i = next.length - 1; i >= 0 && overflow > 0; i -= 1) {
    const take = Math.min(overflow, next[i] - minCol)
    next[i] -= take
    overflow -= take
  }
  return next
}

function normalizeWidths(widths, budget) {
  if (!widths.length) return widths
  const missing = []
  let known = 0
  widths.forEach((w, i) => {
    if (w > 0) known += w
    else missing.push(i)
  })
  const next = widths.slice()
  if (missing.length === widths.length) return evenWidths(widths.length, budget)
  if (missing.length) {
    const room = Math.max(MIN_COL_WIDTH * missing.length, budget - known)
    const base = Math.floor(room / missing.length)
    const rem = room - base * missing.length
    missing.forEach((i, idx) => {
      next[i] = Math.max(MIN_COL_WIDTH, base + (idx === missing.length - 1 ? rem : 0))
    })
  }
  return fitWidths(next, budget)
}

function widthsEqual(a, b) {
  return a.length === b.length && a.every((w, i) => w === b[i])
}

export function columnWidths(tableNode) {
  const row = tableNode.firstChild
  if (!row) return []
  const widths = []
  for (let i = 0; i < row.childCount; i += 1) {
    const cell = row.child(i)
    const span = cell.attrs.colspan || 1
    const cw = cell.attrs.colwidth
    for (let j = 0; j < span; j += 1) {
      const value = cw && cw[j]
      widths.push(Number.isFinite(value) && value > 0 ? value : 0)
    }
  }
  return widths
}

export function writeColumnWidths(tr, tablePos, tableNode, widths) {
  const map = TableMap.get(tableNode)
  const seen = new Set()
  for (let row = 0; row < map.height; row += 1) {
    for (let col = 0; col < map.width; col += 1) {
      const offset = map.map[row * map.width + col]
      if (seen.has(offset)) continue
      seen.add(offset)
      const cell = tableNode.nodeAt(offset)
      if (!cell) continue
      const span = cell.attrs.colspan || 1
      const colwidth = []
      for (let j = 0; j < span; j += 1) colwidth.push(widths[col + j] || MIN_COL_WIDTH)
      const prev = cell.attrs.colwidth
      if (Array.isArray(prev) && prev.length === colwidth.length && prev.every((w, i) => w === colwidth[i])) continue
      tr.setNodeMarkup(tablePos + 1 + offset, undefined, { ...cell.attrs, colwidth })
    }
  }
  return tr
}

function createSizedTable(schema, rowsCount, colsCount, withHeaderRow, totalWidth) {
  const cellType = schema.nodes.tableCell
  const headerType = schema.nodes.tableHeader
  const rowType = schema.nodes.tableRow
  const tableType = schema.nodes.table
  const widths = evenWidths(colsCount, totalWidth)
  const makeRow = (type) => {
    const cells = []
    for (let col = 0; col < colsCount; col += 1) {
      cells.push(type.createAndFill({ colwidth: [widths[col]] }))
    }
    return rowType.createChecked(null, cells)
  }
  const rows = []
  for (let row = 0; row < rowsCount; row += 1) {
    rows.push(makeRow(withHeaderRow && row === 0 ? headerType : cellType))
  }
  return tableType.createChecked({ indent: 0 }, rows)
}

function applyWrapperLayout(dom, indent, totalWidth) {
  if (!dom) return
  const value = Math.max(0, Number(indent) || 0)
  const maxAvail = value ? `calc(100% - ${value}px)` : '100%'
  dom.style.marginLeft = value ? `${value}px` : ''
  if (totalWidth && totalWidth > 0) {
    dom.style.width = `${totalWidth}px`
    dom.style.maxWidth = maxAvail
  } else {
    dom.style.width = maxAvail
    dom.style.maxWidth = maxAvail
  }
}

export function syncTableIndents(view) {
  if (!view) return
  view.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'table') return
    const dom = view.nodeDOM(pos)
    if (!dom) return
    const wrap = dom.classList?.contains('sgaf-table-wrap') ? dom : dom.closest?.('.sgaf-table-wrap') || dom
    const table = wrap.querySelector?.('table') || (wrap.tagName === 'TABLE' ? wrap : null)
    const total = tablePixelWidth(node)
    applyWrapperLayout(wrap, node.attrs.indent, total)
    if (table && total) table.style.width = `${total}px`
  })
}

export class SgafTableView extends TableView {
  constructor(node, cellMinWidth, view) {
    super(node, cellMinWidth, view)
    this.dom.classList.add('sgaf-table-wrap')
    this.leftHandle = document.createElement('div')
    this.leftHandle.className = 'table-left-resize-handle'
    this.leftHandle.contentEditable = 'false'
    this.leftHandle.addEventListener('mousedown', (event) => {
      event.stopPropagation()
    }, true)
    this.dom.insertBefore(this.leftHandle, this.table)
    this.applyLayout(node)
  }

  destroy() {
    this.leftHandle = null
  }

  update(node) {
    const ok = super.update(node)
    if (ok) this.applyLayout(node)
    return ok
  }

  ignoreMutation(mutation) {
    if (super.ignoreMutation(mutation)) return true
    return mutation.type === 'attributes' && mutation.target === this.dom
  }

  applyLayout(node) {
    const total = tablePixelWidth(node)
    applyWrapperLayout(this.dom, node.attrs.indent, total)
    if (!this.table) return
    if (total) this.table.style.width = `${total}px`
    const borders = tableBordersDataAttr(node.attrs.borders)
    if (borders) this.table.setAttribute('data-borders', borders)
    else this.table.removeAttribute('data-borders')
  }
}

function tableDomFromNode(view, pos) {
  const wrapper = view.nodeDOM(pos)
  if (!wrapper) return null
  if (wrapper.tagName === 'TABLE') return { wrapper, table: wrapper }
  const table = wrapper.querySelector?.('table')
  return table ? { wrapper, table } : null
}

function getNestedTableWrap(from, root) {
  if (!from) return null
  let scoped = null
  let el = from
  while (el && el !== root) {
    if (el.classList?.contains('sgaf-table-wrap')) {
      const hostCell = el.closest('td, th')
      if (hostCell && hostCell !== el) scoped = el
    }
    el = el.parentElement
  }
  return scoped
}

function findTableFromHandle(view, handleEl) {
  const wrap = handleEl?.closest?.('.sgaf-table-wrap')
  if (!wrap) return null
  let found = null
  view.state.doc.descendants((node, pos) => {
    if (found || node.type.name !== 'table') return
    if (view.nodeDOM(pos) !== wrap) return
    const parts = tableDomFromNode(view, pos)
    if (!parts) return
    found = { node, pos, ...parts }
  })
  return found
}

function findTableAtLeftEdge(view, event) {
  const from = event.target?.nodeType === 1 ? event.target : event.target?.parentElement
  if (from?.closest?.('.table-row-resize-handle')) return null

  const onHandle = from?.closest?.('.table-left-resize-handle')
  if (onHandle) {
    const hit = findTableFromHandle(view, onHandle)
    if (!hit) return null
    const box = hit.table.getBoundingClientRect()
    const inY = event.clientY >= box.top && event.clientY <= box.bottom
    return inY ? hit : null
  }

  const { clientX, clientY } = event
  const scopedWrap = getNestedTableWrap(from, view.dom)
  const hits = []

  view.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'table') return
    const parts = tableDomFromNode(view, pos)
    if (!parts || !view.dom.contains(parts.table)) return
    if (scopedWrap && parts.wrapper !== scopedWrap) return

    const cell = from?.closest?.('td, th')
    if (cell) {
      const cbox = cell.getBoundingClientRect()
      if (clientY >= cbox.bottom - 10) return
    }

    const box = parts.wrapper.getBoundingClientRect()
    const hitPad = scopedWrap && parts.wrapper === scopedWrap ? NESTED_LEFT_HIT : LEFT_HIT
    const nearLeft = clientX >= box.left - hitPad && clientX <= box.left + hitPad
    const inY = clientY >= box.top && clientY <= box.bottom
    if (!nearLeft || !inY) return

    hits.push({
      node,
      pos,
      ...parts,
      box,
      area: box.width * box.height,
      leftDist: Math.abs(clientX - box.left),
    })
  })

  if (!hits.length) return null

  hits.sort((a, b) => {
    if (a.leftDist !== b.leftDist) return a.leftDist - b.leftDist
    return a.area - b.area
  })
  return hits[0]
}

function paintLeftResize(table, wrapper, indent, widths) {
  const total = widths.reduce((sum, w) => sum + w, 0)
  applyWrapperLayout(wrapper, indent, total)
  const cols = wrapper.querySelectorAll('colgroup col')
  table.style.width = `${total}px`
  widths.forEach((width, i) => {
    if (cols[i]) cols[i].style.width = `${width}px`
  })
}

function previewLeftResize(startX, startIndent, startWidths, clientX, maxW) {
  const delta = Math.round(clientX - startX)
  let indent = startIndent + delta
  const widths = startWidths.slice()
  widths[0] = (startWidths[0] || MIN_COL_WIDTH) - delta
  if (widths[0] < MIN_COL_WIDTH) {
    indent -= MIN_COL_WIDTH - widths[0]
    widths[0] = MIN_COL_WIDTH
  }
  if (indent < 0) {
    widths[0] += indent
    indent = 0
  }
  widths[0] = Math.max(MIN_COL_WIDTH, widths[0])
  const total = widths.reduce((sum, w) => sum + w, 0)
  if (indent + total > maxW) indent = Math.max(0, maxW - total)
  return { indent, widths }
}

function startLeftResize(view, event, hit) {
  event.preventDefault()
  event.stopPropagation()
  const startX = event.clientX
  const startIndent = Math.max(0, Number(hit.node.attrs.indent) || 0)
  const startWidths = columnWidths(hit.node)
  const maxW = editorContentWidth(view) || 640
  const filled = startWidths.every((w) => w > 0)
    ? startWidths
    : evenWidths(Math.max(1, startWidths.length), maxW - startIndent)
  const tablePos = hit.pos
  const tableEl = hit.table
  const wrapper = hit.wrapper
  view.dom.classList.add('resize-cursor')
  wrapper.classList.add('is-left-resizing')

  const paint = (clientX) => {
    const next = previewLeftResize(startX, startIndent, filled, clientX, editorContentWidth(view) || maxW)
    paintLeftResize(tableEl, wrapper, next.indent, next.widths)
    return next
  }

  const win = event.view || window
  const move = (moveEvent) => {
    if (!moveEvent.which) return finish(moveEvent)
    paint(moveEvent.clientX)
  }
  const finish = (upEvent) => {
    win.removeEventListener('mouseup', finish)
    win.removeEventListener('mousemove', move)
    view.dom.classList.remove('resize-cursor')
    wrapper.classList.remove('is-left-resizing')
    const { indent, widths } = paint(upEvent.clientX)
    const tableNode = view.state.doc.nodeAt(tablePos)
    if (!tableNode || tableNode.type.name !== 'table') return
    const tr = writeColumnWidths(view.state.tr, tablePos, tableNode, widths)
    const latest = tr.doc.nodeAt(tablePos)
    tr.setNodeMarkup(tablePos, undefined, { ...latest.attrs, indent })
    tr.setMeta('sgafTableIndent', true)
    view.dispatch(tr)
  }

  win.addEventListener('mouseup', finish)
  win.addEventListener('mousemove', move)
  return true
}

function deleteSelectedTablePartFromView(view) {
  const sel = view.state.selection
  if (!(sel instanceof CellSelection)) return false
  const row = sel.isRowSelection()
  const col = sel.isColSelection()
  if (!row && !col) return false
  if (row && col) return deleteTable(view.state, view.dispatch)
  if (col) {
    const map = TableMap.get(sel.$anchorCell.node(-1))
    if (map.width <= 1) return deleteTable(view.state, view.dispatch)
    return deleteColumn(view.state, view.dispatch)
  }
  if (sel.$anchorCell.node(-1).childCount <= 1) return deleteTable(view.state, view.dispatch)
  return deleteRow(view.state, view.dispatch)
}

function tableIndentPlugin() {
  const holder = { view: null }
  return new Plugin({
    key: new PluginKey('sgafTableIndent'),
    appendTransaction(transactions, _oldState, state) {
      if (!transactions.some((tr) => tr.docChanged)) return null
      const view = holder.view
      if (!view) return null
      const maxW = editorContentWidth(view)
      if (!maxW) return null
      let tr = null
      state.doc.descendants((node, pos) => {
        if (node.type.name !== 'table') return
        const indent = Math.max(0, Number(node.attrs.indent) || 0)
        const budget = Math.max(MIN_COL_WIDTH, maxW - indent)
        const current = columnWidths(node)
        const knownSum = current.reduce((sum, w) => sum + (w > 0 ? w : 0), 0)
        const hasAllWidths = current.length > 0 && current.every((w) => w > 0)
        // Tabla ya más angosta que el ancho útil: no estirar al recargar/editar.
        if (hasAllWidths && knownSum > 0 && knownSum <= budget) return
        const next = normalizeWidths(current, budget)
        const total = next.reduce((sum, w) => sum + w, 0)
        const nextIndent = Math.max(0, Math.min(indent, maxW - total))
        if (widthsEqual(current, next) && nextIndent === indent) return
        tr = tr || state.tr
        writeColumnWidths(tr, pos, node, next)
        if (nextIndent !== indent) {
          const latest = tr.doc.nodeAt(pos)
          tr.setNodeMarkup(pos, undefined, { ...latest.attrs, indent: nextIndent })
        }
      })
      return tr
    },
    view(view) {
      holder.view = view
      const onDown = (event) => {
        if (!view.editable || event.button !== 0) return
        const hit = findTableAtLeftEdge(view, event)
        if (!hit) return
        startLeftResize(view, event, hit)
      }
      view.dom.addEventListener('mousedown', onDown, true)
      requestAnimationFrame(() => {
        if (holder.view) syncTableIndents(view)
      })
      return {
        update() {
          syncTableIndents(view)
        },
        destroy() {
          view.dom.removeEventListener('mousedown', onDown, true)
          holder.view = null
        },
      }
    },
    props: {
      handleDOMEvents: {
        mousedown: (view, event) => {
          if (!view.editable || event.button !== 0) return false
          const hit = findTableAtLeftEdge(view, event)
          if (!hit) return false
          return startLeftResize(view, event, hit)
        },
      },
      handleKeyDown: (view, event) => {
        if (event.key !== 'Backspace' && event.key !== 'Delete') return false
        return deleteSelectedTablePartFromView(view)
      },
    },
  })
}

export const SgafTableRow = TableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      repeat: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-sgaf-repeat') || null,
        renderHTML: (attributes) => {
          if (!attributes.repeat) return {}
          return { 'data-sgaf-repeat': attributes.repeat }
        },
      },
    }
  },
  addCommands() {
    return {
      togglePagosRepeatRow:
        () =>
        ({ state, commands }) => {
          const { $from } = state.selection
          for (let depth = $from.depth; depth > 0; depth -= 1) {
            if ($from.node(depth).type.name === 'tableRow') {
              const current = $from.node(depth).attrs.repeat
              return commands.updateAttributes('tableRow', {
                repeat: current === 'pagos' ? null : 'pagos',
              })
            }
          }
          return false
        },
    }
  },
})

export const SgafTable = Table.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      View: SgafTableView,
    }
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      indent: {
        default: 0,
        parseHTML: (element) => {
          const raw = element.getAttribute('data-indent') || element.style.marginLeft
          const num = Number.parseInt(String(raw || ''), 10)
          return Number.isFinite(num) ? num : 0
        },
        renderHTML: (attributes) => {
          if (!attributes.indent) return {}
          return {
            'data-indent': String(attributes.indent),
            style: `margin-left: ${attributes.indent}px`,
          }
        },
      },
      borders: {
        default: 'all',
        parseHTML: (element) => normalizeTableBorders(element.getAttribute('data-borders')),
        renderHTML: (attributes) => {
          const borders = tableBordersDataAttr(attributes.borders)
          return borders ? { 'data-borders': borders } : {}
        },
      },
    }
  },
  renderHTML({ node, HTMLAttributes }) {
    const { colgroup, tableWidth, tableMinWidth } = createColGroup(node, this.options.cellMinWidth)
    const indent = Math.max(0, Number(node.attrs.indent) || 0)
    const sizeStyle = tableWidth ? `width: ${tableWidth}` : `min-width: ${tableMinWidth}`
    const indentStyle = indent ? `margin-left: ${indent}px` : ''
    const borders = tableBordersDataAttr(node.attrs.borders)
    return [
      'table',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        style: [sizeStyle, indentStyle].filter(Boolean).join('; '),
        ...(indent ? { 'data-indent': String(indent) } : {}),
        ...(borders ? { 'data-borders': borders } : {}),
      }),
      colgroup,
      ['tbody', 0],
    ]
  },
  addCommands() {
    return {
      ...this.parent?.(),
      insertTable:
        ({ rows = 3, cols = 3, withHeaderRow = true } = {}) =>
        ({ tr, dispatch, editor }) => {
          const totalWidth = editorContentWidth(editor.view) || 640
          const node = createSizedTable(editor.schema, rows, cols, withHeaderRow, totalWidth)
          if (dispatch) {
            const offset = tr.selection.from + 1
            tr.replaceSelectionWith(node)
              .scrollIntoView()
              .setSelection(TextSelection.near(tr.doc.resolve(offset)))
          }
          return true
        },
      setCellBorders:
        (style = 'all') =>
        (props) => {
          if (!props.editor.isActive('table')) return false
          return setCellBordersCommand(normalizeTableBorders(style))(props)
        },
      setCellBorderWidth:
        (width = 1) =>
        ({ editor, commands }) => {
          if (!editor.isActive('table')) return false
          return commands.setCellAttribute('borderWidth', normalizeTableBorderWidth(width))
        },
      setTableBorders:
        (style = 'all') =>
        (props) => {
          if (!props.editor.isActive('table')) return false
          return setCellBordersCommand(normalizeTableBorders(style))(props)
        },
      setTableBorderWidth:
        (width = 1) =>
        ({ editor, commands }) => {
          if (!editor.isActive('table')) return false
          return commands.setCellAttribute('borderWidth', normalizeTableBorderWidth(width))
        },
    }
  },
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      Backspace: () => deleteSelectedTablePartFromView(this.editor.view),
      Delete: () => deleteSelectedTablePartFromView(this.editor.view),
      'Mod-Backspace': () => deleteSelectedTablePartFromView(this.editor.view),
      'Mod-Delete': () => deleteSelectedTablePartFromView(this.editor.view),
    }
  },
  addProseMirrorPlugins() {
    return [...(this.parent?.() || []), tableIndentPlugin()]
  },
})
