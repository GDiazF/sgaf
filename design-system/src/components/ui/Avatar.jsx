import { useEffect, useState } from 'react'
import { cn } from '../../lib/cn.js'

/**
 * Iniciales: 1ª letra del nombre + 1ª del apellido (última palabra).
 * Un solo token → solo esa inicial.
 */
export function getAvatarInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/**
 * Avatar con foto o iniciales.
 * Si `src` falla al cargar, muestra las iniciales (evita ícono de imagen rota).
 */
export function Avatar({
  src,
  name = '',
  initials,
  size = 'sm',
  className,
  alt = '',
  ...rest
}) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  const label = (initials || getAvatarInitials(name)).slice(0, 2)

  const sizeClass =
    size === 'lg' ? 'avatar--lg' : size === 'md' ? null : 'avatar--sm'

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn('avatar', sizeClass, className)}
        onError={() => setFailed(true)}
        {...rest}
      />
    )
  }

  return (
    <span
      className={cn('avatar', 'avatar--initials', sizeClass, className)}
      aria-hidden={alt ? undefined : true}
      {...rest}
    >
      {label}
    </span>
  )
}
