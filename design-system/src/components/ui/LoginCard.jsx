import { useState } from 'react'
import { Button } from './Button.jsx'
import { Alert } from './Alert.jsx'
import { Icon } from '../../icons/Icon.jsx'
import { cn } from '../../lib/cn.js'

/**
 * Institutional login card matching OpenDesign login.html structure.
 */
export function LoginCard({
  title = 'Iniciar sesión',
  subtitle = 'Ingresa tus credenciales institucionales',
  brandTitle = 'Sistema de gestión administrativa',
  brandEyebrow = 'Plataforma institucional',
  brandDesc = 'Gestiona procesos, solicitudes y servicios desde un único punto de acceso.',
  logoSrc = '/assets/logo-login-dark.png',
  error,
  loading = false,
  onSubmit,
  footer,
  className,
  initialUsername = '',
}) {
  const [username, setUsername] = useState(initialUsername)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState(null)

  const displayError = error || localError

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError(null)
    if (!username.trim() || !password) {
      setLocalError('Ingresa usuario y contraseña.')
      return
    }
    await onSubmit?.({ username: username.trim(), password })
  }

  return (
    <div className={cn('login-page login-page--desktop-only', className)}>
      <div className="login-page__bg" aria-hidden="true" />
      <div className="login-page__overlay" aria-hidden="true" />
      <div className="login-page__inner">
        <div className="login-card card">
          <aside className="login-brand">
            <div className="login-brand__inset">
              <img className="login-brand__logo" src={logoSrc} alt="" width={380} height={120} />
            </div>
            <p className="login-brand__eyebrow">{brandEyebrow}</p>
            <h1 className="login-brand__title">{brandTitle}</h1>
            <p className="login-brand__tagline">{brandDesc}</p>
          </aside>
          <section className="login-form-panel">
            <header className="login-form-panel__header">
              <h2 className="login-form-panel__title">{title}</h2>
              <p className="login-form-panel__desc">{subtitle}</p>
            </header>
            {displayError ? (
              <Alert variant="danger" title="No se pudo iniciar sesión">
                {displayError}
              </Alert>
            ) : null}
            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label className="field__label field__label--required" htmlFor="login-username">
                  Usuario
                </label>
                <div className="input-wrap">
                  <Icon name="user" className="input-wrap__icon" size={16} />
                  <input
                    className="input no-global"
                    id="login-username"
                    name="username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="field">
                <label className="field__label field__label--required" htmlFor="login-password">
                  Contraseña
                </label>
                <div className="input-wrap input-wrap--password">
                  <Icon name="lock" className="input-wrap__icon" size={16} />
                  <input
                    className="input no-global"
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="input-wrap__toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    <Icon name="eye" size={16} />
                  </button>
                </div>
              </div>
              <div className="login-form__actions">
                <Button type="submit" variant="primary" className="login-form__submit" disabled={loading}>
                  {loading ? 'Ingresando…' : 'Ingresar'}
                </Button>
              </div>
            </form>
            {footer ? <footer className="login-form-panel__footer">{footer}</footer> : null}
          </section>
        </div>
      </div>
    </div>
  )
}
