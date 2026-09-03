import { CellSelection } from '@tiptap/pm/tables'
import { TableMap, cellAround } from '@tiptap/pm/tables'

export const TABLE_BORDER_WIDTH_PRESETS = [
  { value: 1, label: 'Fino (1 px)' },
  { value: 2, label: 'Medio (2 px)' },
  { value: 3, label: 'Grueso (3 px)' },
]

const TABLE_BORDER_WIDTH_VALUES = new Set(TABLE_BORDER_WIDTH_PRESETS.map((p) => p.value))

const PRESET_TO_SIDES = {
  all: null,
  none: 'none',
  top: 'top',
  bottom: 'bottom',
  left: 'left',
  right: 'right',
  'top-bottom': 'top,bottom',
  'left-right': 'left,right',
  horizontal: 'top,bottom',
  vertical: 'left,right',
}

export function normalizeTableBorderWidth(value) {
  const num = Number.parseInt(String(value ?? '1'), 10)
  return TABLE_BORDER_WIDTH_VALUES.has(num) ? num : 1
}

/** Estilo inline de bordes por celda (editor + PDF). */
export function cellBorderInlineStyle(borderSides, borderWidth = 1) {
  const w = normalizeTableBorderWidth(borderWidth)
  const color = '#333'
  const transparent = 'transparent'

  if (!borderSides || borderSides === 'all') {
    if (w === 1) return null
    return `border: ${w}px solid ${color}`
  }
  if (borderSides === 'none') {
    return `border: ${w}px solid ${transparent}`
  }
  const set = new Set(borderSides.split(',').map((s) => s.trim()).filter(Boolean))
  return ['top', 'right', 'bottom', 'left']
    .map((side) => `border-${side}: ${w}px solid ${set.has(side) ? color : transparent}`)
    .join('; ')
}

/** Para mostrar el preset activo en la toolbar a partir del valor guardado en la celda. */
export function borderSidesToPreset(borderSides) {
  if (borderSides == null || borderSides === 'all') return 'all'
  if (borderSides === 'none') return 'none'
  const entry = Object.entries(PRESET_TO_SIDES).find(([, sides]) => sides === borderSides)
  return entry ? entry[0] : 'custom'
}

function getTableContext(state) {
  const { selection } = state
  const $from = selection.$from
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === 'table') {
      return { table: $from.node(depth), tablePos: $from.before(depth) }
    }
  }
  if (selection instanceof CellSelection) {
    const $anchor = selection.$anchorCell
    for (let depth = $anchor.depth; depth > 0; depth -= 1) {
      if ($anchor.node(depth).type.name === 'table') {
        return { table: $anchor.node(depth), tablePos: $anchor.before(depth) }
      }
    }
  }
  return null
}

function getCellSelectionRect(selection, table, tablePos) {
  const map = TableMap.get(table)
  const start = tablePos + 1
  const anchor = map.findCell(selection.$anchorCell.pos - start)
  const head = map.findCell(selection.$headCell.pos - start)
  return {
    top: Math.min(anchor.top, head.top),
    left: Math.min(anchor.left, head.left),
    bottom: Math.max(anchor.bottom, head.bottom),
    right: Math.max(anchor.right, head.right),
  }
}

function sidesForOuter(row, col, rect) {
  const sides = []
  if (row === rect.top) sides.push('top')
  if (row === rect.bottom - 1) sides.push('bottom')
  if (col === rect.left) sides.push('left')
  if (col === rect.right - 1) sides.push('right')
  return sides.length ? sides.join(',') : 'none'
}

function sidesForInner(row, col, rect) {
  const sides = []
  if (row > rect.top) sides.push('top')
  if (row < rect.bottom - 1) sides.push('bottom')
  if (col > rect.left) sides.push('left')
  if (col < rect.right - 1) sides.push('right')
  return sides.length ? sides.join(',') : 'none'
}

export function resolveBorderSidesForPreset(preset, rect, row, col) {
  const normalized = String(preset)
  if (normalized === 'outer') return sidesForOuter(row, col, rect)
  if (normalized === 'inner') return sidesForInner(row, col, rect)
  if (Object.prototype.hasOwnProperty.call(PRESET_TO_SIDES, normalized)) {
    return PRESET_TO_SIDES[normalized]
  }
  return null
}

function applyBorderSidesToCell(tr, pos, cell, preset, rect, table, tablePos) {
  const map = TableMap.get(table)
  const rel = map.findCell(pos - tablePos - 1)
  const sides = resolveBorderSidesForPreset(preset, rect, rel.top, rel.left)
  tr.setNodeMarkup(pos, undefined, { ...cell.attrs, borderSides: sides })
}

export function setCellBordersCommand(preset) {
  return ({ state, tr, dispatch }) => {
    const ctx = getTableContext(state)
    if (!ctx) return false
    const { table, tablePos } = ctx
    const { selection } = state

    if (selection instanceof CellSelection) {
      const rect = getCellSelectionRect(selection, table, tablePos)
      selection.forEachCell((cell, pos) => {
        applyBorderSidesToCell(tr, pos, cell, preset, rect, table, tablePos)
      })
    } else {
      const $cell = cellAround(selection.$from)
      if (!$cell) return false
      const map = TableMap.get(table)
      const rel = map.findCell($cell.pos - tablePos - 1)
      const rect = { top: rel.top, left: rel.left, bottom: rel.bottom, right: rel.right }
      applyBorderSidesToCell(tr, $cell.pos, $cell.node, preset, rect, table, tablePos)
    }

    if (dispatch) dispatch(tr)
    return true
  }
}
