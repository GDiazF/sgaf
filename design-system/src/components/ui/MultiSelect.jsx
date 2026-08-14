import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn.js'

function normalizeOptions(options) {
  return (options || []).map((item) =>
    item && typeof item === 'object'
      ? { value: item.value, label: item.label ?? String(item.value) }
      : { value: item, label: String(item) },
  )
}

/**
 * Select de apariencia nativa con checkboxes en el panel.
 * `value` / `onChange` trabajan con un array de valores.
 */
export function MultiSelect({
  id,
  value = [],
  onChange,
  options = [],
  placeholder = 'Seleccionar…',
  disabled = false,
  className,
  emptyLabel = 'Sin opciones',
  allLabel = 'Todos',
}) {
  const autoId = useId()
  const triggerId = id || autoId
  const listId = `${triggerId}-list`
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const allRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)

  const items = useMemo(() => normalizeOptions(options), [options])
  const selected = useMemo(() => new Set((value || []).map(String)), [value])
  const selectedCount = items.filter((o) => selected.has(String(o.value))).length
  const allSelected = items.length > 0 && selectedCount === items.length

  const triggerText = (() => {
    if (selectedCount === 0) return placeholder
    if (selectedCount === 1) {
      const only = items.find((o) => selected.has(String(o.value)))
      return only?.label ?? placeholder
    }
    return `${selectedCount} seleccionados`
  })()

  const updatePos = () => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const panelMax = 256
    const gap = 4
    const spaceBelow = window.innerHeight - rect.bottom - gap
    const openUp = spaceBelow < Math.min(panelMax, items.length * 40 + 48) && rect.top > spaceBelow
    setPos({
      left: rect.left,
      width: Math.max(rect.width, 180),
      top: openUp ? undefined : rect.bottom + gap,
      bottom: openUp ? window.innerHeight - rect.top + gap : undefined,
    })
  }

  useLayoutEffect(() => {
    if (!open) return undefined
    updatePos()
    const onReposition = () => updatePos()
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, items.length])

  useEffect(() => {
    if (allRef.current) {
      allRef.current.indeterminate = selectedCount > 0 && !allSelected
    }
  }, [selectedCount, allSelected, open])

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      const t = e.target
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopImmediatePropagation()
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  const emit = (nextValues) => {
    onChange?.(nextValues)
  }

  const toggle = (optionValue) => {
    const key = String(optionValue)
    const next = items
      .map((o) => o.value)
      .filter((v) => (String(v) === key ? !selected.has(key) : selected.has(String(v))))
    emit(next)
  }

  const toggleAll = () => {
    emit(allSelected ? [] : items.map((o) => o.value))
  }

  return (
    <div ref={rootRef} className={cn('select-multi', open && 'is-open', className)}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        className="select-multi__trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (disabled) return
          setOpen((v) => !v)
        }}
      >
        <span
          className={cn(
            'select-multi__trigger-label',
            selectedCount === 0 && 'is-placeholder',
          )}
        >
          {triggerText}
        </span>
      </button>

      {open && pos
        ? createPortal(
            <div
              ref={panelRef}
              id={listId}
              className="select-multi__panel"
              role="listbox"
              aria-multiselectable="true"
              aria-labelledby={triggerId}
              style={{
                top: pos.top,
                bottom: pos.bottom,
                left: pos.left,
                width: pos.width,
              }}
            >
              {items.length === 0 ? (
                <p className="select-multi__empty">{emptyLabel}</p>
              ) : (
                <>
                  <label className="select-multi__option select-multi__option--all">
                    <input
                      ref={allRef}
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                    />
                    <span>{allLabel}</span>
                  </label>
                  {items.map((o) => {
                    const checked = selected.has(String(o.value))
                    return (
                      <label
                        key={String(o.value)}
                        className="select-multi__option"
                        aria-selected={checked}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(o.value)}
                        />
                        <span>{o.label}</span>
                      </label>
                    )
                  })}
                </>
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
