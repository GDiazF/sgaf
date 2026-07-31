import { forwardRef } from 'react'
import { cn } from '../../lib/cn.js'

/** Extrae solo dígitos (enteros CLP). */
export function parseCLPInput(text) {
  if (text == null) return ''
  const digits = String(text).replace(/\D/g, '')
  if (!digits) return ''
  // Evitar ceros a la izquierda salvo el valor "0"
  return digits.replace(/^0+(?=\d)/, '')
}

/** Formatea un valor numérico/string para display es-CL (miles con punto). */
export function formatCLPDisplay(value) {
  const raw = parseCLPInput(value)
  if (!raw) return ''
  return new Intl.NumberFormat('es-CL').format(Number(raw))
}

/**
 * Input de monto CLP: prefijo $ + separador de miles.
 * `value` / `onChange` usan string numérico limpio ("1234567" | "").
 */
export const CurrencyInput = forwardRef(function CurrencyInput(
  {
    className,
    value = '',
    onChange,
    disabled,
    required,
    id,
    name,
    placeholder = '0',
    ...rest
  },
  ref,
) {
  const display = formatCLPDisplay(value)

  const handleChange = (e) => {
    const next = parseCLPInput(e.target.value)
    onChange?.(next)
  }

  return (
    <div
      className={cn(
        'currency-input',
        disabled && 'is-disabled',
        className,
      )}
    >
      <span className="currency-input__prefix" aria-hidden="true">
        $
      </span>
      <input
        ref={ref}
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className="currency-input__field no-global"
        value={display}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        {...rest}
      />
    </div>
  )
})
