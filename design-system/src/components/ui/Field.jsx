import { forwardRef, useId, useState } from 'react'
import { cn } from '../../lib/cn.js'
import { Icon } from '../../icons/Icon.jsx'

export function Field({
  label,
  hint,
  error,
  required,
  success,
  className,
  children,
  htmlFor,
}) {
  return (
    <div
      className={cn(
        'field',
        error && 'field--error',
        success && !error && 'field--success',
        className,
      )}
    >
      {label ? (
        <label
          className={cn('field__label', required && 'field__label--required')}
          htmlFor={htmlFor}
        >
          {label}
        </label>
      ) : null}
      {children}
      {error ? <p className="field__error">{error}</p> : null}
      {!error && hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  )
}

export const Input = forwardRef(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn('input', 'no-global', className)} {...rest} />
})

export const Select = forwardRef(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={cn('select', 'no-global', className)} {...rest}>
      {children}
    </select>
  )
})

export const Textarea = forwardRef(function Textarea(
  { className, ...rest },
  ref,
) {
  return <textarea ref={ref} className={cn('textarea', 'no-global', className)} {...rest} />
})

export function Switch({ checked, onChange, label, disabled, className, id }) {
  const autoId = useId()
  const switchId = id || autoId
  return (
    <label className={cn('switch', className)} htmlFor={switchId}>
      <input
        id={switchId}
        type="checkbox"
        className="switch__input"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span className="switch__track" aria-hidden="true" />
      {label ? <span className="switch__label">{label}</span> : null}
    </label>
  )
}

export function FileInput({
  label = 'Seleccionar archivo',
  onChange,
  className,
  variant = 'button',
  hint,
  ...rest
}) {
  const [fileName, setFileName] = useState('')

  const handleChange = (e) => {
    const files = e.target.files
    if (!files?.length) {
      setFileName('')
    } else if (files.length === 1) {
      setFileName(files[0].name)
    } else {
      setFileName(`${files.length} archivos`)
    }
    onChange?.(e)
  }

  if (variant === 'zone') {
    return (
      <div className={cn('file-input', className)}>
        <label className="file-input__zone">
          <Icon name="upload" className="icon icon--lg" size={22} />
          <span className="file-input__label">{label}</span>
          {hint ? <span className="file-input__hint">{hint}</span> : null}
          <input type="file" className="no-global" onChange={handleChange} {...rest} />
        </label>
        {fileName ? <span className="file-input__name">{fileName}</span> : null}
      </div>
    )
  }

  return (
    <div className={cn('file-input', className)}>
      <label className="file-input__button">
        <Icon name="attach" className="icon" size={16} />
        {label}
        <input type="file" className="no-global" onChange={handleChange} {...rest} />
      </label>
      {fileName ? <span className="file-input__name">{fileName}</span> : null}
    </div>
  )
}

/** Convenience: Field wrapping Input */
export const TextField = forwardRef(function TextField(
  { label, hint, error, required, success, id, className, fieldClassName, ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id || autoId
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      success={success}
      htmlFor={inputId}
      className={fieldClassName}
    >
      <Input ref={ref} id={inputId} className={className} required={required} {...rest} />
    </Field>
  )
})
