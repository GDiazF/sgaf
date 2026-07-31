import React, { useState, useRef, useEffect, useLayoutEffect, useId, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Field, Input, Icon, Button } from '@slep/ui'

const MENU_GAP = 4
const MENU_MAX_H = 320

function computeMenuStyle(triggerEl) {
  if (!triggerEl) return null
  const rect = triggerEl.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const edge = 8
  const width = Math.min(rect.width, vw - edge * 2)
  const spaceBelow = vh - rect.bottom - edge
  const spaceAbove = rect.top - edge
  const openUp = spaceBelow < 180 && spaceAbove > spaceBelow
  const maxHeight = Math.min(
    MENU_MAX_H,
    Math.max(140, openUp ? spaceAbove - MENU_GAP : spaceBelow - MENU_GAP),
  )

  let left = rect.left
  if (left + width > vw - edge) left = Math.max(edge, vw - edge - width)
  if (left < edge) left = edge

  return {
    position: 'fixed',
    left: `${Math.round(left)}px`,
    width: `${Math.round(width)}px`,
    maxHeight: `${Math.round(maxHeight)}px`,
    ...(openUp
      ? { bottom: `${Math.round(vh - rect.top + MENU_GAP)}px`, top: 'auto' }
      : { top: `${Math.round(rect.bottom + MENU_GAP)}px`, bottom: 'auto' }),
  }
}

const MultiSearchableSelect = ({
  label,
  options = [],
  value = [],
  onChange,
  placeholder = 'Seleccione opciones…',
  required = false,
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [menuStyle, setMenuStyle] = useState(null)
  const containerRef = useRef(null)
  const menuRef = useRef(null)
  const inputRef = useRef(null)
  const autoId = useId()
  const triggerId = `combo-multi-${autoId}`

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const close = useCallback(() => {
    setIsOpen(false)
    setSearchTerm('')
    setMenuStyle(null)
  }, [])

  const positionMenu = useCallback(() => {
    const trigger = containerRef.current?.querySelector('.combo__trigger')
    setMenuStyle(computeMenuStyle(trigger))
  }, [])

  useLayoutEffect(() => {
    if (!isOpen) return undefined
    positionMenu()
    const onReposition = () => positionMenu()
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [isOpen, positionMenu])

  useEffect(() => {
    if (!isOpen) return undefined
    const handleClickOutside = (event) => {
      const inTrigger = containerRef.current?.contains(event.target)
      const inMenu = menuRef.current?.contains(event.target)
      if (!inTrigger && !inMenu) close()
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, close])

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus()
  }, [isOpen])

  const handleToggleOption = (optionValue) => {
    if (disabled) return
    const option = options.find((o) => o.value === optionValue)
    if (option?.disabled) return

    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue]
    onChange(newValue)
  }

  const handleRemoveAll = (e) => {
    e.stopPropagation()
    if (disabled) return
    onChange([])
  }

  const selectedCount = value?.length || 0
  const selectedWord = selectedCount === 1 ? 'seleccionado' : 'seleccionados'
  const selectedSummary =
    selectedCount === 0
      ? placeholder
      : selectedCount === 1
        ? options.find((o) => o.value === value[0])?.label || `1 ${selectedWord}`
        : `${selectedCount} ${selectedWord}`

  const menu =
    isOpen && menuStyle
      ? createPortal(
          <div
            ref={menuRef}
            className="combo__menu combo__menu--portal"
            role="listbox"
            aria-multiselectable="true"
            style={menuStyle}
          >
            <div className="combo__search">
              <div className="input-wrap">
                <Icon name="search" className="input-wrap__icon" size="sm" />
                <Input
                  ref={inputRef}
                  type="search"
                  className="no-global"
                  placeholder="Buscar…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                />
              </div>
            </div>

            <div className="combo__options" onWheel={(e) => e.stopPropagation()}>
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const isSelected = value.includes(opt.value)
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={opt.disabled}
                      onClick={() => handleToggleOption(opt.value)}
                      className={`combo__option${isSelected ? ' is-selected' : ''}`}
                    >
                      <span className="combo__option-check" aria-hidden="true">
                        {isSelected ? <Icon name="check" size="sm" /> : null}
                      </span>
                      <span className="combo__option-label">{opt.label}</span>
                    </button>
                  )
                })
              ) : (
                <div className="combo__empty">No se encontraron resultados</div>
              )}
            </div>

            {selectedCount > 0 ? (
              <div className="combo__footer">
                <span>
                  {selectedCount} de {options.length} seleccionados
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={close}>
                  Listo
                </Button>
              </div>
            ) : null}
          </div>,
          document.body,
        )
      : null

  const control = (
    <div className="combo" ref={containerRef}>
      <div
        id={triggerId}
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={selectedSummary}
        onClick={() => {
          if (disabled) return
          if (isOpen) close()
          else setIsOpen(true)
        }}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (isOpen) close()
            else setIsOpen(true)
          }
        }}
        className={`combo__trigger${isOpen ? ' is-open' : ''}${
          selectedCount === 0 ? ' is-placeholder' : ''
        }`}
      >
        <span className="combo__trigger-text">
          {selectedCount > 0 ? (
            <>
              <span className="combo__count" aria-hidden="true">
                {selectedCount}
              </span>{' '}
              {selectedWord}
            </>
          ) : (
            placeholder
          )}
        </span>
        <span className="combo__trigger-actions">
          {selectedCount > 0 ? (
            <button
              type="button"
              className="combo__clear"
              aria-label="Limpiar selección"
              onClick={handleRemoveAll}
            >
              <Icon name="close" size="sm" />
            </button>
          ) : null}
          <Icon name="chevron" className="icon--chevron" size="sm" />
        </span>
      </div>
      {menu}
    </div>
  )

  if (!label) {
    return <div className={className}>{control}</div>
  }

  return (
    <Field label={label} required={required} htmlFor={triggerId} className={className}>
      {control}
    </Field>
  )
}

export default MultiSearchableSelect
