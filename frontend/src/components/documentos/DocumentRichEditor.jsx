import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { Color } from '@tiptap/extension-color'
import TextStyle from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import { SgafTable, SgafTableView, SgafTableRow, TABLE_BORDER_PRESETS, normalizeTableBorders } from './tableLayout'
import { CellSelection } from '@tiptap/pm/tables'
import Placeholder from '@tiptap/extension-placeholder'
import { Icon, IconButton, Input, Select } from '@slep/ui'
import {
  FontSize,
  BackgroundColor,
  LineHeight,
  TemplateVariable,
  LogoVariable,
  ColoredTableCell,
  ColoredTableHeader,
  PageBreak,
  DocumentShape,
  TableRowResize,
} from './documentExtensions'
import { DocumentPagination } from './layoutPageBreaks.js'

const FONT_OPTIONS = [
  { value: 'Calibri, sans-serif', label: 'Calibri' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: '"Times New Roman", serif', label: 'Times New Roman' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Source Sans 3", sans-serif', label: 'Source Sans 3' },
  { value: '"Courier New", monospace', label: 'Courier New' },
]

const SIZE_OPTIONS = ['8pt', '9pt', '10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '20pt', '24pt', '28pt', '36pt']

const TABLE_PICKER_COLS = 10
const TABLE_PICKER_ROWS = 8

const CELL_SWATCHES = [
  { value: null, label: 'Sin relleno', swatch: 'transparent' },
  { value: '#ffffff', label: 'Blanco', swatch: '#ffffff' },
  { value: '#f3f4f6', label: 'Gris claro', swatch: '#f3f4f6' },
  { value: '#dbeafe', label: 'Azul', swatch: '#dbeafe' },
  { value: '#dcfce7', label: 'Verde', swatch: '#dcfce7' },
  { value: '#fef9c3', label: 'Amarillo', swatch: '#fef9c3' },
  { value: '#fed7aa', label: 'Naranja', swatch: '#fed7aa' },
  { value: '#fecaca', label: 'Rojo', swatch: '#fecaca' },
  { value: '#e9d5ff', label: 'Violeta', swatch: '#e9d5ff' },
  { value: '#1e3a8a', label: 'Azul oscuro', swatch: '#1e3a8a' },
  { value: '#14532d', label: 'Verde oscuro', swatch: '#14532d' },
  { value: '#111827', label: 'Negro', swatch: '#111827' },
]

function buildExtensions(placeholder, { paginate = true } = {}) {
  return [
    StarterKit.configure({ heading: { levels: [1, 2, 3] }, horizontalRule: false }),
    Underline,
    TextStyle,
    Color,
    FontFamily,
    FontSize,
    BackgroundColor,
    LineHeight,
    TextAlign.configure({ types: ['heading', 'paragraph', 'logoVariable'] }),
    SgafTable.configure({
      resizable: true,
      handleWidth: 8,
      cellMinWidth: 32,
      lastColumnResizable: true,
      View: SgafTableView,
    }),
    SgafTableRow,
    ColoredTableHeader,
    ColoredTableCell,
    TableRowResize,
    TemplateVariable,
    LogoVariable,
    PageBreak,
    DocumentShape,
    ...(paginate ? [DocumentPagination] : []),
    Placeholder.configure({ placeholder: placeholder || 'Escriba el documento…' }),
  ]
}

function keepEditorFocus(event) {
  event.preventDefault()
}

/**
 * Comandos de formato: ejecutar en mousedown para que un re-render de la cinta
 * no se coma el click.
 */
function toolbarAction(event, action) {
  if (event.type === 'mousedown') {
    if (event.button !== 0) return
    event.preventDefault()
    action()
    return
  }
  if (event.type === 'click' && event.detail === 0) {
    action()
  }
}

function toolbarButtonProps(action) {
  return {
    onMouseDown: (event) => toolbarAction(event, action),
    onClick: (event) => toolbarAction(event, action),
  }
}

/** Menús desplegables: solo preservar foco; abrir/cerrar en click (evita pelear con click-outside). */
function menuTriggerProps(toggle) {
  return {
    onMouseDown: (event) => {
      if (event.button !== 0) return
      event.preventDefault()
    },
    onClick: (event) => {
      event.preventDefault()
      toggle()
    },
  }
}

function isSelectionInTable(editor) {
  if (!editor) return false
  const { selection } = editor.state
  if (selection instanceof CellSelection) return true
  const { $from } = selection
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const role = $from.node(depth).type.spec.tableRole
    if (role === 'table' || role === 'row' || role === 'cell' || role === 'header_cell') return true
    if ($from.node(depth).type.name === 'table') return true
  }
  return editor.isActive('table')
}

function isPagosRepeatRow(editor) {
  if (!editor) return false
  return editor.getAttributes('tableRow').repeat === 'pagos'
}

function toggleInlineMark(editor, markName) {
  const type = editor.schema.marks[markName]
  const { state } = editor
  const { selection } = state

  if (selection instanceof CellSelection) {
    let hasText = false
    let allHaveMark = true
    selection.forEachCell((cell) => {
      cell.descendants((node) => {
        if (!node.isText || !node.text) return
        hasText = true
        if (!type.isInSet(node.marks)) allHaveMark = false
      })
    })
    const tr = state.tr
    selection.forEachCell((cell, pos) => {
      const from = pos + 1
      const to = from + cell.content.size
      if (hasText && allHaveMark) tr.removeMark(from, to, type)
      else tr.addMark(from, to, type.create())
    })
    editor.view.dispatch(tr)
    return
  }

  if (editor.isActive(markName)) {
    editor.chain().focus().unsetMark(markName, { extendEmptyMarkRange: true }).run()
  } else {
    editor.chain().focus().setMark(markName).run()
  }
}

function ToolbarGroup({ label, className = '', children }) {
  return (
    <div className={`doc-editor__toolbar-group${className ? ` ${className}` : ''}`} role="group" aria-label={label}>
      <span className="doc-editor__toolbar-label">{label}</span>
      <div className="doc-editor__toolbar-btns">{children}</div>
    </div>
  )
}

function useClickOutside(open, onClose) {
  const ref = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return undefined
    const onDown = (event) => {
      if (!ref.current?.contains(event.target)) onCloseRef.current()
    }
    // Adjuntar después del evento que abrió el menú, si no se cierra al instante.
    const timer = window.setTimeout(() => {
      document.addEventListener('pointerdown', onDown, true)
    }, 0)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('pointerdown', onDown, true)
    }
  }, [open])

  return ref
}

function useCloseWhenDisabled(disabled, open, setOpen) {
  useEffect(() => {
    if (disabled && open) setOpen(false)
  }, [disabled, open, setOpen])
}

function TableInsertPicker({ onInsert }) {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState({ rows: 0, cols: 0 })
  const rootRef = useClickOutside(open, () => setOpen(false))
  const rows = hover.rows || 0
  const cols = hover.cols || 0
  const toggleOpen = () => {
    setOpen((prev) => !prev)
    setHover({ rows: 0, cols: 0 })
  }

  return (
    <div className={`doc-table-insert${open ? ' is-open' : ''}`} ref={rootRef}>
      <IconButton
        aria-label="Insertar tabla"
        aria-expanded={open}
        aria-haspopup="true"
        className={open ? 'is-active' : ''}
        {...menuTriggerProps(toggleOpen)}
      >
        <Icon name="table" size={16} />
      </IconButton>
      <div className="doc-table-insert__panel" role="dialog" aria-label="Tamaño de tabla">
        <div
          className="doc-table-insert__grid"
          onMouseLeave={() => setHover({ rows: 0, cols: 0 })}
        >
          {Array.from({ length: TABLE_PICKER_ROWS * TABLE_PICKER_COLS }, (_, index) => {
            const row = Math.floor(index / TABLE_PICKER_COLS) + 1
            const col = (index % TABLE_PICKER_COLS) + 1
            const on = rows > 0 && row <= rows && col <= cols
            return (
              <button
                key={`${row}-${col}`}
                type="button"
                className={`doc-table-insert__cell${on ? ' is-on' : ''}`}
                aria-label={`${row} filas por ${col} columnas`}
                onMouseEnter={() => setHover({ rows: row, cols: col })}
                {...toolbarButtonProps(() => {
                  onInsert(row, col)
                  setOpen(false)
                  setHover({ rows: 0, cols: 0 })
                })}
              />
            )
          })}
        </div>
        <p className="doc-table-insert__caption">
          {rows ? `${rows} × ${cols}` : 'Elija el tamaño'}
        </p>
      </div>
    </div>
  )
}

function TableColorPicker({ disabled, value, onChange }) {
  const [open, setOpen] = useState(false)
  const rootRef = useClickOutside(open, () => setOpen(false))
  useCloseWhenDisabled(disabled, open, setOpen)
  const current = value || '#ffffff'

  return (
    <div className={`doc-table-color${open ? ' is-open' : ''}`} ref={rootRef}>
      <IconButton
        aria-label="Color de celda"
        title={disabled ? 'Seleccione una celda de la tabla' : 'Color de celda'}
        aria-expanded={open}
        aria-haspopup="true"
        disabled={disabled}
        className={open ? 'is-active' : ''}
        {...menuTriggerProps(() => setOpen((prev) => !prev))}
      >
        <Icon name="cell-color" size={16} />
      </IconButton>
      <div className="doc-table-color__panel" role="dialog" aria-label="Color de celda">
        <div className="doc-table-color__swatches">
          {CELL_SWATCHES.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`doc-table-color__swatch${item.value == null ? ' is-none' : ''}`}
              style={item.value ? { background: item.swatch } : undefined}
              title={item.label}
              aria-label={item.label}
              {...toolbarButtonProps(() => {
                onChange(item.value)
                setOpen(false)
              })}
            />
          ))}
        </div>
        <label className="doc-table-color__custom" onMouseDown={keepEditorFocus}>
          Personalizado
          <input
            type="color"
            aria-label="Color personalizado de celda"
            value={current}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      </div>
    </div>
  )
}

function TableBorderPreview({ mode }) {
  return (
    <span className={`doc-table-borders__preview doc-table-borders__preview--${mode}`} aria-hidden="true">
      <span /><span /><span /><span />
    </span>
  )
}

function TableBorderPicker({ disabled, value, onChange }) {
  const [open, setOpen] = useState(false)
  const rootRef = useClickOutside(open, () => setOpen(false))
  useCloseWhenDisabled(disabled, open, setOpen)
  const current = normalizeTableBorders(value)

  return (
    <div className={`doc-table-borders${open ? ' is-open' : ''}`} ref={rootRef}>
      <IconButton
        aria-label="Bordes de tabla"
        title={disabled ? 'Seleccione una tabla' : 'Bordes de tabla'}
        aria-expanded={open}
        aria-haspopup="true"
        disabled={disabled}
        className={open || current !== 'all' ? 'is-active' : ''}
        {...menuTriggerProps(() => setOpen((prev) => !prev))}
      >
        <Icon name="table-borders" size={16} />
      </IconButton>
      <div className="doc-table-borders__panel" role="dialog" aria-label="Bordes de tabla">
        {TABLE_BORDER_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            className={`doc-table-borders__option${current === preset.value ? ' is-active' : ''}`}
            {...toolbarButtonProps(() => {
              onChange(preset.value)
              setOpen(false)
            })}
          >
            <TableBorderPreview mode={preset.value} />
            <span>{preset.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const SHAPE_PRESETS = [
  { shape: 'rect', label: 'Rectángulo', width: '160', height: '24' },
  { shape: 'rounded', label: 'Redondeado', width: '160', height: '32' },
  { shape: 'ellipse', label: 'Óvalo', width: '120', height: '80' },
  { shape: 'line', label: 'Barra', width: '220', height: '8' },
]

function ShapeTools({ editor }) {
  const active = editor.isActive('documentShape')
  const attrs = active ? editor.getAttributes('documentShape') : {}
  const [fill, setFill] = useState('#1e3a8a')
  const displayFill = active && /^#[0-9a-fA-F]{6}$/.test(attrs.fill || '')
    ? attrs.fill
    : fill

  useEffect(() => {
    if (active && /^#[0-9a-fA-F]{6}$/.test(attrs.fill || '')) {
      setFill(attrs.fill)
    }
  }, [active, attrs.fill])

  const applyFill = (color) => {
    setFill(color)
    if (active) editor.chain().focus().updateDocumentShape({ fill: color }).run()
  }

  return (
    <ToolbarGroup label="Formas">
      {SHAPE_PRESETS.map((preset) => (
        <button
          key={preset.shape}
          type="button"
          className={`doc-shape-insert doc-shape-insert--${preset.shape}`}
          title={preset.label}
          aria-label={`Insertar ${preset.label.toLowerCase()}`}
          {...toolbarButtonProps(() => editor.chain().focus().insertDocumentShape({
            shape: preset.shape,
            width: preset.width,
            height: preset.height,
            fill,
          }).run())}
        >
          <span className="doc-shape-insert__preview" aria-hidden />
        </button>
      ))}
      <label
        className="icon-btn doc-editor__color doc-shape-color"
        title={active ? 'Color de relleno' : 'Color de relleno (próxima forma)'}
        onMouseDown={keepEditorFocus}
      >
        <span className="doc-shape-color__swatch" style={{ background: displayFill }} aria-hidden />
        <input
          type="color"
          aria-label="Color de relleno de forma"
          value={displayFill}
          onChange={(e) => applyFill(e.target.value)}
        />
      </label>
    </ToolbarGroup>
  )
}

function PageSetupGroup({ pageSetup }) {
  if (!pageSetup) return null
  const { plantilla, pageSizes = [], canChange, onChange } = pageSetup
  const patch = (partial) => onChange?.(partial)

  return (
    <>
      <ToolbarGroup label="Tamaño">
        <Select
          className="doc-editor__page-select"
          aria-label="Tamaño de página"
          value={plantilla.tamano_pagina}
          disabled={!canChange}
          onChange={(e) => patch({ tamano_pagina: e.target.value })}
        >
          {pageSizes.map((size) => (
            <option key={size.key} value={size.key}>{size.label}</option>
          ))}
        </Select>
        {plantilla.tamano_pagina === 'personalizado' ? (
          <>
            <Input
              className="doc-editor__page-num"
              type="number"
              min="50"
              step="0.1"
              aria-label="Ancho en milímetros"
              title="Ancho (mm)"
              placeholder="Ancho"
              value={plantilla.ancho_mm || ''}
              disabled={!canChange}
              onChange={(e) => patch({ ancho_mm: e.target.value })}
            />
            <Input
              className="doc-editor__page-num"
              type="number"
              min="50"
              step="0.1"
              aria-label="Alto en milímetros"
              title="Alto (mm)"
              placeholder="Alto"
              value={plantilla.alto_mm || ''}
              disabled={!canChange}
              onChange={(e) => patch({ alto_mm: e.target.value })}
            />
          </>
        ) : null}
      </ToolbarGroup>
      <ToolbarGroup label="Orientación">
        <Select
          className="doc-editor__page-select"
          aria-label="Orientación"
          value={plantilla.orientacion}
          disabled={!canChange}
          onChange={(e) => patch({ orientacion: e.target.value })}
        >
          <option value="portrait">Vertical</option>
          <option value="landscape">Horizontal</option>
        </Select>
      </ToolbarGroup>
      <ToolbarGroup label="Márgenes">
        <div className="doc-editor__page-margins" role="group" aria-label="Márgenes en milímetros">
          {[
            { key: 'margen_superior_mm', label: 'Sup' },
            { key: 'margen_inferior_mm', label: 'Inf' },
            { key: 'margen_izquierdo_mm', label: 'Izq' },
            { key: 'margen_derecho_mm', label: 'Der' },
          ].map((item) => (
            <label key={item.key} className="doc-editor__page-margin">
              <span>{item.label}</span>
              <Input
                className="doc-editor__page-num"
                type="number"
                min="0"
                step="0.5"
                aria-label={`Margen ${item.label.toLowerCase()} (mm)`}
                title={`Margen ${item.label.toLowerCase()} (mm)`}
                value={plantilla[item.key]}
                disabled={!canChange}
                onChange={(e) => patch({ [item.key]: e.target.value })}
              />
            </label>
          ))}
        </div>
      </ToolbarGroup>
    </>
  )
}

export function DocumentToolbar({ editor, pageSetup }) {
  const [, rerender] = useReducer((n) => n + 1, 0)
  const [ribbonTab, setRibbonTab] = useState('inicio')

  useEffect(() => {
    if (!editor) return undefined
    let raf = 0
    const onUpdate = () => {
      cancelAnimationFrame(raf)
      // Diferir el re-render para no destruir el botón entre mousedown y click.
      raf = requestAnimationFrame(() => rerender())
    }
    editor.on('selectionUpdate', onUpdate)
    editor.on('transaction', onUpdate)
    return () => {
      cancelAnimationFrame(raf)
      editor.off('selectionUpdate', onUpdate)
      editor.off('transaction', onUpdate)
    }
  }, [editor])

  if (!editor) return null

  const currentFont = editor.getAttributes('textStyle').fontFamily || ''
  const currentSize = editor.getAttributes('textStyle').fontSize || '11pt'
  const inTable = isSelectionInTable(editor)
  const pagosRepeatRow = inTable && isPagosRepeatRow(editor)
  const tableBorderStyle = inTable
    ? normalizeTableBorders(editor.getAttributes('table').borders)
    : 'all'
  const cellColor =
    editor.getAttributes('tableCell').backgroundColor
    || editor.getAttributes('tableHeader').backgroundColor
  const cellHAlign =
    editor.getAttributes('tableCell').textAlign
    || editor.getAttributes('tableHeader').textAlign
  const cellVAlign =
    editor.getAttributes('tableCell').verticalAlign
    || editor.getAttributes('tableHeader').verticalAlign
    || 'top'

  const setHAlign = (align) => {
    const chain = editor.chain().focus().setTextAlign(align)
    if (inTable) chain.setCellAttribute('textAlign', align)
    chain.run()
  }

  const tabs = [
    { id: 'inicio', label: 'Inicio' },
    ...(pageSetup ? [{ id: 'pagina', label: 'Página' }] : []),
  ]

  return (
    <div className="doc-ribbon">
      <div className="doc-ribbon__tabs" role="tablist" aria-label="Cinta del editor">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={ribbonTab === tab.id}
            className={`doc-ribbon__tab${ribbonTab === tab.id ? ' is-active' : ''}`}
            onClick={() => setRibbonTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="doc-editor__toolbar"
        role="toolbar"
        aria-label={ribbonTab === 'pagina' ? 'Configuración de página' : 'Formato del documento'}
      >
        {ribbonTab === 'pagina' ? (
          <>
            <PageSetupGroup pageSetup={pageSetup} />
            <ToolbarGroup label="Saltos">
              <IconButton
                aria-label="Salto de página"
                title="Salto de página (Ctrl+Enter)"
                {...toolbarButtonProps(() => editor.commands.setPageBreak())}
              >
                <Icon name="page-break" size={16} />
              </IconButton>
            </ToolbarGroup>
          </>
        ) : (
          <>
            <ToolbarGroup label="Fuente">
              <Select
                className="doc-editor__font-select"
                aria-label="Fuente"
                value={currentFont}
                onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
              >
                <option value="">Fuente</option>
                {FONT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
              <Select
                className="doc-editor__size-select"
                aria-label="Tamaño"
                value={currentSize}
                onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
              >
                {SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>{size.replace('pt', '')}</option>
                ))}
              </Select>
              <IconButton
                aria-label="Negrita"
                className={editor.isActive('bold') ? 'is-active' : ''}
                {...toolbarButtonProps(() => toggleInlineMark(editor, 'bold'))}
              >
                <Icon name="bold" size={16} />
              </IconButton>
              <IconButton
                aria-label="Cursiva"
                className={editor.isActive('italic') ? 'is-active' : ''}
                {...toolbarButtonProps(() => toggleInlineMark(editor, 'italic'))}
              >
                <Icon name="italic" size={16} />
              </IconButton>
              <IconButton
                aria-label="Subrayado"
                className={editor.isActive('underline') ? 'is-active' : ''}
                {...toolbarButtonProps(() => toggleInlineMark(editor, 'underline'))}
              >
                <Icon name="underline" size={16} />
              </IconButton>
              <label
                className="icon-btn doc-editor__color"
                title="Color de texto"
                onMouseDown={keepEditorFocus}
              >
                <Icon name="text-color" size={16} />
                <input
                  type="color"
                  aria-label="Color de texto"
                  value={editor.getAttributes('textStyle').color || '#111111'}
                  onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                />
              </label>
              <label
                className="icon-btn doc-editor__color"
                title="Color de fondo"
                onMouseDown={keepEditorFocus}
              >
                <Icon name="highlight" size={16} />
                <input
                  type="color"
                  aria-label="Color de fondo"
                  value={editor.getAttributes('textStyle').backgroundColor || '#fff59d'}
                  onChange={(e) => editor.chain().focus().setBackgroundColor(e.target.value).run()}
                />
              </label>
            </ToolbarGroup>

            <ToolbarGroup label="Párrafo">
              <IconButton
                aria-label="Alinear a la izquierda"
                className={(inTable ? cellHAlign === 'left' : editor.isActive({ textAlign: 'left' })) ? 'is-active' : ''}
                {...toolbarButtonProps(() => setHAlign('left'))}
              >
                <Icon name="align-left" size={16} />
              </IconButton>
              <IconButton
                aria-label="Centrar"
                className={(inTable ? cellHAlign === 'center' : editor.isActive({ textAlign: 'center' })) ? 'is-active' : ''}
                {...toolbarButtonProps(() => setHAlign('center'))}
              >
                <Icon name="align-center" size={16} />
              </IconButton>
              <IconButton
                aria-label="Alinear a la derecha"
                className={(inTable ? cellHAlign === 'right' : editor.isActive({ textAlign: 'right' })) ? 'is-active' : ''}
                {...toolbarButtonProps(() => setHAlign('right'))}
              >
                <Icon name="align-right" size={16} />
              </IconButton>
              <IconButton
                aria-label="Justificar"
                className={(inTable ? cellHAlign === 'justify' : editor.isActive({ textAlign: 'justify' })) ? 'is-active' : ''}
                {...toolbarButtonProps(() => setHAlign('justify'))}
              >
                <Icon name="align-justify" size={16} />
              </IconButton>
              <IconButton
                aria-label="Lista con viñetas"
                className={editor.isActive('bulletList') ? 'is-active' : ''}
                {...toolbarButtonProps(() => editor.chain().focus().toggleBulletList().run())}
              >
                <Icon name="list" size={16} />
              </IconButton>
              <IconButton
                aria-label="Lista numerada"
                className={editor.isActive('orderedList') ? 'is-active' : ''}
                {...toolbarButtonProps(() => editor.chain().focus().toggleOrderedList().run())}
              >
                <Icon name="list-ordered" size={16} />
              </IconButton>
              <Select
                className="doc-editor__leading-select"
                aria-label="Interlineado"
                title="Interlineado"
                value={editor.getAttributes('paragraph').lineHeight || '1.15'}
                onChange={(e) => editor.chain().focus().setLineHeight(e.target.value).run()}
              >
                <option value="1">1.0</option>
                <option value="1.15">1.15</option>
                <option value="1.5">1.5</option>
                <option value="2">2.0</option>
              </Select>
            </ToolbarGroup>

            <ToolbarGroup label="Tabla">
              <TableInsertPicker
                onInsert={(rows, cols) => editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()}
              />
              <TableColorPicker
                disabled={!inTable}
                value={cellColor}
                onChange={(color) => editor.chain().focus().setCellAttribute('backgroundColor', color).run()}
              />
              <TableBorderPicker
                disabled={!inTable}
                value={tableBorderStyle}
                onChange={(style) => editor.chain().focus().setTableBorders(style).run()}
              />
              <IconButton
                aria-label="Alinear arriba"
                disabled={!inTable}
                className={inTable && cellVAlign === 'top' ? 'is-active' : ''}
                {...toolbarButtonProps(() => editor.chain().focus().setCellAttribute('verticalAlign', 'top').run())}
              >
                <Icon name="align-top" size={16} />
              </IconButton>
              <IconButton
                aria-label="Centrar verticalmente"
                disabled={!inTable}
                className={inTable && cellVAlign === 'middle' ? 'is-active' : ''}
                {...toolbarButtonProps(() => editor.chain().focus().setCellAttribute('verticalAlign', 'middle').run())}
              >
                <Icon name="align-middle" size={16} />
              </IconButton>
              <IconButton
                aria-label="Alinear abajo"
                disabled={!inTable}
                className={inTable && cellVAlign === 'bottom' ? 'is-active' : ''}
                {...toolbarButtonProps(() => editor.chain().focus().setCellAttribute('verticalAlign', 'bottom').run())}
              >
                <Icon name="align-bottom" size={16} />
              </IconButton>
              <IconButton
                aria-label="Agregar fila"
                disabled={!inTable}
                {...toolbarButtonProps(() => editor.chain().focus().addRowAfter().run())}
              >
                <Icon name="table-row-plus" size={16} />
              </IconButton>
              <IconButton
                aria-label={pagosRepeatRow ? 'Quitar repetición de fila de pagos' : 'Fila se repite por cada pago'}
                title={pagosRepeatRow ? 'Esta fila se repite por cada boleta (clic para quitar)' : 'Marcar fila: se repite por cada boleta/pago'}
                disabled={!inTable}
                className={pagosRepeatRow ? 'is-active' : ''}
                {...toolbarButtonProps(() => editor.chain().focus().togglePagosRepeatRow().run())}
              >
                <Icon name="list" size={16} />
              </IconButton>
              <IconButton
                aria-label="Agregar columna"
                disabled={!inTable}
                {...toolbarButtonProps(() => editor.chain().focus().addColumnAfter().run())}
              >
                <Icon name="table-col-plus" size={16} />
              </IconButton>
              <IconButton
                aria-label="Eliminar tabla"
                disabled={!inTable}
                {...toolbarButtonProps(() => editor.chain().focus().deleteTable().run())}
              >
                <Icon name="trash" size={16} />
              </IconButton>
            </ToolbarGroup>

            <ShapeTools editor={editor} />
          </>
        )}
      </div>
    </div>
  )
}

export default function DocumentRichEditor({
  content,
  onChange,
  onReady,
  onFocus,
  placeholder,
  compact = false,
  editable = true,
}) {
  // Extensiones estables: si se recrean en cada render, TipTap llama setOptions
  // y la paginación nunca llega a aplicarse.
  const extensions = useMemo(
    () => buildExtensions(placeholder, { paginate: !compact }),
    [placeholder, compact],
  )
  const initialContent = useRef(content || '<p></p>')
  const onChangeRef = useRef(onChange)
  const onFocusRef = useRef(onFocus)
  onChangeRef.current = onChange
  onFocusRef.current = onFocus

  const editor = useEditor({
    extensions,
    content: initialContent.current,
    editable,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    onUpdate: ({ editor: instance }) => {
      onChangeRef.current?.(instance.getHTML())
    },
    onFocus: () => onFocusRef.current?.(),
  }, [extensions])

  useEffect(() => {
    onReady?.(editor)
    return () => onReady?.(null)
  }, [editor, onReady])

  useEffect(() => {
    if (editor) editor.setEditable(editable)
  }, [editor, editable])

  return (
    <div className={compact ? 'doc-editor__hf' : undefined}>
      <EditorContent editor={editor} />
    </div>
  )
}
