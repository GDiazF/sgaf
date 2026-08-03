import React, { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Alert, Button, Icon } from '@slep/ui'
import api from '../../api'
import { APP_VERSION } from '../../version'
import '../LoginDs.css'

const ResetPassword = () => {
  const { uid, token } = useParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setIsLoading(true)

    try {
      await api.post('auth/password-reset-confirm/', {
        uid,
        token,
        new_password: password,
      })
      setIsDone(true)
    } catch (err) {
      setError(err.response?.data?.error || 'El enlace es inválido o ha expirado.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-page login-page--auth-recovery" data-od-id="reset-password-page">
      <div className="login-page__bg" aria-hidden="true" />
      <div className="login-page__overlay" aria-hidden="true" />

      <div className="login-page__inner">
        <div className="login-card login-card--recovery card" data-component="LoginCard">
          <section className="login-form-panel">
            <header className="login-form-panel__header">
              <h2 className="login-form-panel__title">Nueva contraseña</h2>
              <p className="login-form-panel__desc">
                <Icon name="lock" className="login-form-panel__desc-icon" size={16} />
                Ingresa tu nueva clave de acceso
              </p>
            </header>

            {!isDone ? (
              <form className="login-form" onSubmit={handleSubmit} noValidate>
                {error ? (
                  <Alert variant="danger" title="Error" className="alert--compact">
                    {error}
                  </Alert>
                ) : null}

                <div className="field">
                  <label className="field__label field__label--required" htmlFor="reset-password">
                    Nueva contraseña
                  </label>
                  <div className="input-wrap input-wrap--password">
                    <Icon name="lock" className="input-wrap__icon" size={16} />
                    <input
                      className="input no-global"
                      id="reset-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                    <button
                      type="button"
                      className="input-wrap__toggle"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      <Icon name="eye" size={16} />
                    </button>
                  </div>
                </div>

                <div className="field">
                  <label
                    className="field__label field__label--required"
                    htmlFor="reset-password-confirm"
                  >
                    Confirmar contraseña
                  </label>
                  <div className="input-wrap">
                    <Icon name="lock" className="input-wrap__icon" size={16} />
                    <input
                      className="input no-global"
                      id="reset-password-confirm"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <div className="login-form__actions">
                  <Button
                    type="submit"
                    variant="primary"
                    className="login-form__submit"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Actualizando…' : 'Actualizar contraseña'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="login-recovery__success">
                <Alert variant="info" title="Contraseña actualizada" className="alert--compact">
                  Tu contraseña ha sido restablecida con éxito. Ya puedes iniciar sesión con tus
                  nuevas credenciales.
                </Alert>
                <div className="login-form__actions">
                  <Button type="button" variant="primary" onClick={() => navigate('/login')}>
                    Ir al inicio de sesión
                  </Button>
                </div>
              </div>
            )}

            <footer className="login-form-panel__footer">
              <span>© {new Date().getFullYear()} SLEP Iquique</span>
              <span>Versión {APP_VERSION}</span>
            </footer>
          </section>
        </div>

        <p className="login-recovery__footer-link">
          <Link to="/login">Volver al inicio de sesión</Link>
        </p>
      </div>
    </div>
  )
}

export default ResetPassword
