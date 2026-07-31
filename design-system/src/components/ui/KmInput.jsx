import { forwardRef } from 'react'
import { cn } from '../../lib/cn.js'
import { formatCLPDisplay, parseCLPInput } from './CurrencyInput.jsx'

/** Extrae solo dígitos (enteros, p. ej. kilometraje). */
export function parseKmInput(text) {
  return parseCLPInput(text)
}

/** Formatea enteros con separador de miles es-CL (sin símbolo de moneda). */
export function formatKmDisplay(value) {
  return formatCLPDisplay(value)
}

/**
 * Input numérico con separador de miles (sin $).
 * Ideal para kilometraje u otras cantidades enteras.
 * `value` / `onChange` usan string numérico limpio ("1234567" | "").
 * `suffix` por defecto "km"; pasar "" para ocultarlo.
 */
export const KmInput = forwardRef(function KmInput(
  {
    className,
    value = '',
    onChange,
    disabled,
    required,
    id,
    name,
    placeholder = '0',
    suffix = 'km',
    ...rest
  },
  ref,
) {
  const display = formatKmDisplay(value)

  const handleChange = (e) => {
    const next = parseKmInput(e.target.value)
    onChange?.(next)
  }

  return (
    <div
      className={cn(
        'km-input',
        disabled && 'is-disabled',
        className,
      )}
    >
      <input
        ref={ref}
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className="km-input__field no-global"
        value={display}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        {...rest}
      />
      {suffix ? (
        <span className="km-input__suffix" aria-hidden="true">
          {suffix}
        </span>
      ) : null}
    </div>
  )
})
