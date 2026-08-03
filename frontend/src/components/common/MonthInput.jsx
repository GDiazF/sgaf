import React, { useState, useEffect, useRef, useId } from 'react'
import { Field, Button, Icon } from '@slep/ui'

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

/**
 * Selector de periodo (YYYY-MM) con UI del design system.
 */
const MonthInput = ({
  label = 'Periodo',
  value,
  onChange,
  required = false,
  className = '',
  htmlFor,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [displayValue, setDisplayValue] = useState('')
  const [viewDate, setViewDate] = useState(new Date())
  const containerRef = useRef(null)
  const autoId = useId()
  const triggerId = htmlFor || `month-${autoId}`

  useEffect(() => {
    if (value) {
      const [y, m] = value.split('-')
      const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 2)
      setDisplayValue(
        date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }).toUpperCase(),
      )
      setViewDate(date)
    } else {
      setDisplayValue('')
      setViewDate(new Date())
    }
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMonthSelect = (monthIndex) => {
    const year = viewDate.getFullYear()
    const month = (monthIndex + 1).toString().padStart(2, '0')
    onChange(`${year}-${month}`)
    setIsOpen(false)
  }

  const changeYear = (delta) => {
    const next = new Date(viewDate)
    next.setFullYear(viewDate.getFullYear() + delta)
    setViewDate(next)
  }

  return (
    <div className={className}>
      <Field label={label} required={required} htmlFor={triggerId}>
        <div className="combo" ref={containerRef}>
          <button
            type="button"
            id={triggerId}
            className={`combo__trigger${isOpen ? ' is-open' : ''}${
              !displayValue ? ' is-placeholder' : ''
            }`}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((open) => !open)}
          >
            <span className="combo__trigger-text">
              {displayValue || 'Seleccione periodo…'}
            </span>
            <span className="combo__trigger-actions">
              <Icon name="reservas" size={14} className="month-picker__trigger-icon" />
            </span>
          </button>

          {isOpen ? (
            <div className="combo__menu month-picker" role="listbox">
              <div className="month-picker__header">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Año anterior"
                  onClick={() => changeYear(-1)}
                >
                  <Icon name="chevron" size="sm" className="month-picker__chevron--prev" />
                </Button>
                <span className="month-picker__year">{viewDate.getFullYear()}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Año siguiente"
                  onClick={() => changeYear(1)}
                >
                  <Icon name="chevron" size="sm" className="month-picker__chevron--next" />
                </Button>
              </div>

              <div className="month-picker__grid">
                {MESES.map((monthName, idx) => {
                  const key = `${viewDate.getFullYear()}-${(idx + 1)
                    .toString()
                    .padStart(2, '0')}`
                  const selected = value === key
                  return (
                    <button
                      key={monthName}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={`month-picker__month${selected ? ' is-selected' : ''}`}
                      onClick={() => handleMonthSelect(idx)}
                    >
                      {monthName.substring(0, 3)}
                    </button>
                  )
                })}
              </div>

              <div className="month-picker__footer">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onChange('')
                    setIsOpen(false)
                  }}
                >
                  Limpiar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const now = new Date()
                    onChange(
                      `${now.getFullYear()}-${(now.getMonth() + 1)
                        .toString()
                        .padStart(2, '0')}`,
                    )
                    setIsOpen(false)
                  }}
                >
                  Mes actual
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </Field>

      {required ? <input type="hidden" value={value || ''} required /> : null}
    </div>
  )
}

export default MonthInput
