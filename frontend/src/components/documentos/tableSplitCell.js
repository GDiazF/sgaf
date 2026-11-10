/**
 * Dividir celda al estilo Word (misma tabla, sin anidar).
 *
 * - Dividir en columnas → siempre parte en vertical (borde | )
 * - Dividir en filas    → siempre parte en horizontal (borde ─ )
 *
 * TipTap `splitCell` solo se usa para deshacer un merge en la MISMA dirección
 * (colspan→columnas, rowspan→filas). Antes ambos botones lo llamaban igual
 * y por eso parecía que los dos “solo dividían en columnas”.
 */
import {
  CellSelection,
  TableMap,
  addRow,
  cellAround,
  selectedRect,
  selectionCell,
  splitCell,
  tableNodeTypes,
} from '@tiptap/pm/tables'

function resolveSingleCell(state) {
  const sel = state.selection
  if (sel instanceof CellSelection) {
    if (sel.$anchorCell.pos !== sel.$headCell.pos) return null
    const cellNode = sel.$anchorCell.nodeAfter
    const cellPos = sel.$anchorCell.pos
    if (!cellNode || cellPos == null) return null
    return { cellNode, cellPos }
  }
  const $cell = selectionCell(state) || cellAround(sel.$from)
  if (!$cell) return null
  const cellNode = $cell.nodeAfter
  const cellPos = $cell.pos
  if (!cellNode || cellPos == null) return null
  return { cellNode, cellPos }
}

function cellTypeFor(state, cellNode) {
  const types = tableNodeTypes(state.schema)
  const role = cellNode.type.spec.tableRole
  return types[role] || types.cell
}

function copyLayoutAttrs(cellNode, overrides = {}) {
  return {
    backgroundColor: cellNode.attrs.backgroundColor ?? null,
    borderSides: cellNode.attrs.borderSides ?? null,
    borderWidth: cellNode.attrs.borderWidth ?? 1,
    textAlign: cellNode.attrs.textAlign ?? null,
    verticalAlign: cellNode.attrs.verticalAlign ?? null,
    height: cellNode.attrs.height ?? null,
    ...overrides,
  }
}

/** Celda → dos columnas (borde vertical nuevo). */
export function splitCellIntoColumns(state, dispatch) {
  const resolved = resolveSingleCell(state)
  if (!resolved) return false
  const { cellNode, cellPos } = resolved
  const colspan = cellNode.attrs.colspan || 1
  const rowspan = cellNode.attrs.rowspan || 1

  // Merge solo horizontal → deshacer en columnas.
  if (colspan > 1) {
    return splitCell(state, dispatch)
  }

  const rect = selectedRect(state)
  if (!rect) return false
  if (!dispatch) return true

  const tr = state.tr
  const { map, tableStart } = rect
  const currentRow = rect.top
  const currentCol = rect.left
  const baseAttrs = { ...cellNode.attrs }
  const currentColWidth = baseAttrs.colwidth
  let halfWidth = null
  if (currentColWidth?.[0]) {
    halfWidth = Math.max(24, Math.ceil(currentColWidth[0] / 2))
    tr.setNodeMarkup(tr.mapping.map(cellPos), null, {
      ...baseAttrs,
      colwidth: [halfWidth],
    })
  }

  const newCell = cellTypeFor(state, cellNode).createAndFill(
    copyLayoutAttrs(cellNode, {
      colspan: 1,
      rowspan,
      colwidth: halfWidth ? [halfWidth] : null,
    }),
  )
  if (!newCell) return false
  tr.insert(tr.mapping.map(cellPos + cellNode.nodeSize), newCell)

  const seen = new Set()
  for (let row = 0; row < map.height; row += 1) {
    // Filas cubiertas por el rowspan de esta celda no tienen hueco que parchear.
    if (row >= currentRow && row < currentRow + rowspan) continue
    for (let col = 0; col < map.width; col += 1) {
      const cellIndex = map.map[row * map.width + col]
      if (cellIndex == null || seen.has(cellIndex)) continue
      seen.add(cellIndex)
      const cellRect = map.findCell(cellIndex)
      if (cellRect.left > currentCol || cellRect.right <= currentCol) continue

      const otherPos = tr.mapping.map(tableStart + cellIndex)
      const other = tr.doc.nodeAt(otherPos)
      if (!other) continue
      const newColspan = (other.attrs.colspan || 1) + 1
      let updatedColwidth = other.attrs.colwidth
      if (updatedColwidth && halfWidth) {
        const originalColIndex = currentCol - cellRect.left
        updatedColwidth = [
          ...updatedColwidth.slice(0, originalColIndex),
          halfWidth,
          halfWidth,
          ...updatedColwidth.slice(originalColIndex + 1),
        ]
      } else if (halfWidth) {
        updatedColwidth = Array.from({ length: newColspan }, () => halfWidth)
      }
      tr.setNodeMarkup(otherPos, null, {
        ...other.attrs,
        colspan: newColspan,
        colwidth: updatedColwidth,
      })
    }
  }

  dispatch(tr.scrollIntoView())
  return true
}

/** Celda → dos filas (borde horizontal nuevo). */
export function splitCellIntoRows(state, dispatch) {
  const resolved = resolveSingleCell(state)
  if (!resolved) return false
  const { cellNode } = resolved
  const colspan = cellNode.attrs.colspan || 1
  const rowspan = cellNode.attrs.rowspan || 1

  // Merge solo vertical → deshacer en filas.
  if (rowspan > 1) {
    return splitCell(state, dispatch)
  }

  const rect = selectedRect(state)
  if (!rect) return false
  if (!dispatch) return true

  const row = rect.top
  const col = rect.left
  const span = Math.max(1, colspan)

  // Fila completa debajo; luego quitamos celdas que no sean de esta columna.
  let tr = addRow(state.tr, rect, row + 1)

  const tablePos = tr.mapping.map(rect.tableStart - 1)
  const tableNode = tr.doc.nodeAt(tablePos)
  if (!tableNode) return false
  const tableStart = tablePos + 1
  const map = TableMap.get(tableNode)
  const newRow = row + 1

  const bumps = new Map()
  const deletions = []
  let keepPos = null

  for (let c = 0; c < map.width; ) {
    const index = newRow * map.width + c
    const cellOffset = map.map[index]
    const cellRect = map.findCell(cellOffset)

    if (newRow > 0 && map.map[index] === map.map[index - map.width]) {
      c = cellRect.right
      continue
    }

    const inSplitRange = cellRect.left >= col && cellRect.left < col + span
    if (inSplitRange) {
      if (cellRect.left === col) keepPos = tableStart + cellOffset
      else {
        const victim = tableNode.nodeAt(cellOffset)
        if (victim) deletions.push({ from: tableStart + cellOffset, size: victim.nodeSize })
      }
      c = cellRect.right
      continue
    }

    const aboveOffset = map.map[(newRow - 1) * map.width + cellRect.left]
    const abovePos = tableStart + aboveOffset
    if (!bumps.has(abovePos)) {
      const aboveNode = tr.doc.nodeAt(abovePos)
      if (aboveNode) bumps.set(abovePos, aboveNode)
    }
    const victim = tableNode.nodeAt(cellOffset)
    if (victim) deletions.push({ from: tableStart + cellOffset, size: victim.nodeSize })
    c = cellRect.right
  }

  if (keepPos != null && span > 1) {
    const keepNode = tr.doc.nodeAt(keepPos)
    if (keepNode) {
      tr.setNodeMarkup(keepPos, null, {
        ...keepNode.attrs,
        colspan: span,
        colwidth: cellNode.attrs.colwidth || keepNode.attrs.colwidth,
      })
    }
  }

  for (const [pos, node] of bumps) {
    tr.setNodeMarkup(pos, null, {
      ...node.attrs,
      rowspan: (node.attrs.rowspan || 1) + 1,
    })
  }

  deletions.sort((a, b) => b.from - a.from)
  const seenDel = new Set()
  for (const { from, size } of deletions) {
    if (seenDel.has(from)) continue
    seenDel.add(from)
    tr.delete(from, from + size)
  }

  dispatch(tr.scrollIntoView())
  return true
}
