import React, { useState, useRef, useEffect, useLayoutEffect, useId, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Field, Input, Icon } from '@slep/ui'

const MENU_GAP = 4
const MENU_MAX_H = 280

function computeMenuStyle(triggerEl) {
  if (!triggerEl) return null
  const rect = triggerEl.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const edge = 8
  const width = Math.min(rect.width, vw - edge * 2)
  const spaceBelow = vh - rect.bottom - edge
  const spaceAbove = rect.top - edge
  const openUp = spaceBelow < 160 && spaceAbove > spaceBelow
  const maxHeight = Math.min(
    MENU_MAX_H,
    Math.max(120, openUp ? spaceAbove - MENU_GAP : spaceBelow - MENU_GAP),
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

const SearchableSelect = ({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Seleccione una opción…',
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
  const triggerId = `combo-${autoId}`

  const selectedOption = options.find((opt) => String(opt.value) === String(value))
  const displayValue = selectedOption ? selectedOption.label : ''

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

  const handleSelect = (optionValue) => {
    if (disabled) return
    onChange(optionValue)
    close()
  }

  const menu =
    isOpen && menuStyle
      ? createPortal(
          <div
            ref={menuRef}
            className="combo__menu combo__menu--portal"
            role="listbox"
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
                  const isSelected = String(opt.value) === String(value)
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={opt.disabled}
                      onClick={() => handleSelect(opt.value)}
                      className={`combo__option${isSelected ? ' is-selected' : ''}`}
                    >
                      <span className="combo__option-label">{opt.label}</span>
                      {isSelected ? <Icon name="check" size="sm" /> : null}
                    </button>
                  )
                })
              ) : (
                <div className="combo__empty">No se encontraron resultados</div>
              )}
            </div>
          </div>,
          document.body,
        )
      : null

  const control = (
    <div className="combo" ref={containerRef}>
      <button
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => {
          if (disabled) return
          if (isOpen) close()
          else setIsOpen(true)
        }}
        className={`combo__trigger${isOpen ? ' is-open' : ''}${
          !displayValue ? ' is-placeholder' : ''
        }`}
      >
        <span className="combo__trigger-text">{displayValue || placeholder}</span>
        <span className="combo__trigger-actions">
          <Icon name="chevron" className="icon--chevron" size="sm" />
        </span>
      </button>
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

export default SearchableSelect
