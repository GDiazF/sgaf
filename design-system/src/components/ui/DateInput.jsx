import { forwardRef, useEffect, useId, useRef, useState } from 'react'
import { cn } from '../../lib/cn.js'
import { Icon } from '../../icons/Icon.jsx'

/** ISO `yyyy-mm-dd` → `dd/mm/yyyy` */
export function formatDateCL(iso) {
  if (!iso) return ''
  const raw = String(iso).slice(0, 10)
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return ''
  return `${m[3]}/${m[2]}/${m[1]}`
}

/** `dd/mm/yyyy` (o parcial con dígitos) → ISO o '' si incompleto; null si inválida. */
export function parseDateCL(text) {
  if (text == null) return ''
  const digits = String(text).replace(/\D/g, '').slice(0, 8)
  if (digits.length < 8) return ''
  const d = Number(digits.slice(0, 2))
  const mo = Number(digits.slice(2, 4))
  const y = Number(digits.slice(4, 8))
  if (!isValidYmd(y, mo, d)) return null
  return `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function isValidYmd(y, mo, d) {
  if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return false
  const dt = new Date(y, mo - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d
}

/** Máscara visual mientras se escribe: dd/mm/yyyy */
export function maskDateCL(text) {
  const digits = String(text ?? '').replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

function emitChange(onChange, name, id, iso) {
  if (!onChange) return
  onChange({
    target: { value: iso, name, id },
    currentTarget: { value: iso, name, id },
    type: 'change',
  })
}

/**
 * Fecha en formato chileno `dd/mm/yyyy`.
 * `value` / `onChange` usan ISO `yyyy-mm-dd` (compatible con Input type="date").
 */
export const DateInput = forwardRef(function DateInput(
  {
    className,
    value = '',
    onChange,
    onBlur,
    disabled,
    required,
    id,
    name,
    placeholder = 'dd/mm/aaaa',
    min,
    max,
    ...rest
  },
  ref,
) {
  const autoId = useId()
  const inputId = id || autoId
  const nativeId = `${inputId}-native`
  const nativeRef = useRef(null)
  const focusedRef = useRef(false)
  const [display, setDisplay] = useState(() => formatDateCL(value))
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    if (focusedRef.current) return
    setDisplay(formatDateCL(value))
    setInvalid(false)
  }, [value])

  const commitFromDisplay = (raw) => {
    const digits = String(raw).replace(/\D/g, '')
    if (!digits) {
      setInvalid(false)
      emitChange(onChange, name, inputId, '')
      return
    }
    if (digits.length < 8) {
      setInvalid(true)
      return
    }
    const iso = parseDateCL(raw)
    if (iso == null) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    setDisplay(formatDateCL(iso))
    emitChange(onChange, name, inputId, iso)
  }

  const handleTextChange = (e) => {
    const next = maskDateCL(e.target.value)
    setDisplay(next)
    setInvalid(false)
    const digits = next.replace(/\D/g, '')
    if (digits.length === 8) {
      const iso = parseDateCL(next)
      if (iso) {
        emitChange(onChange, name, inputId, iso)
      } else {
        setInvalid(true)
      }
    } else if (!digits) {
      emitChange(onChange, name, inputId, '')
    }
  }

  const handleBlur = (e) => {
    focusedRef.current = false
    commitFromDisplay(display)
    onBlur?.(e)
  }

  const handleNativeChange = (e) => {
    const iso = e.target.value || ''
    setDisplay(formatDateCL(iso))
    setInvalid(false)
    emitChange(onChange, name, inputId, iso)
  }

  return (
    <div
      className={cn(
        'date-input',
        disabled && 'is-disabled',
        invalid && 'is-invalid',
        className,
      )}
    >
      <input
        ref={ref}
        id={inputId}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className="date-input__field no-global"
        value={display}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        {...rest}
        onChange={handleTextChange}
        onFocus={(e) => {
          focusedRef.current = true
          rest.onFocus?.(e)
        }}
        onBlur={handleBlur}
      />
      <label
        className="date-input__picker"
        htmlFor={nativeId}
        title="Abrir calendario"
        aria-label="Abrir calendario"
      >
        <Icon name="reservas" size={16} />
        <input
          ref={nativeRef}
          id={nativeId}
          type="date"
          className="date-input__native"
          value={value || ''}
          onChange={handleNativeChange}
          disabled={disabled}
          min={min}
          max={max}
          tabIndex={-1}
        />
      </label>
    </div>
  )
})
