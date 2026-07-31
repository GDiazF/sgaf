import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert, Button, Icon } from '@slep/ui'
import api from '../../api'
import { APP_VERSION } from '../../version'
import '../LoginDs.css'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await api.post('auth/password-reset-request/', { email })
      setIsSent(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Ocurrió un error. Inténtalo de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-page login-page--auth-recovery" data-od-id="forgot-password-page">
      <div className="login-page__bg" aria-hidden="true" />
      <div className="login-page__overlay" aria-hidden="true" />

      <div className="login-page__inner">
        <div className="login-card login-card--recovery card" data-component="LoginCard">
          <section className="login-form-panel">
            <header className="login-form-panel__header">
              <button
                type="button"
                className="login-recovery__back"
                onClick={() => navigate('/login')}
                aria-label="Volver al inicio de sesión"
              >
                <Icon name="chevron-left" size={16} />
                Volver
              </button>
              <h2 className="login-form-panel__title">Recuperar acceso</h2>
              <p className="login-form-panel__desc">
                <Icon name="lock" className="login-form-panel__desc-icon" size={16} />
                Ingresa tu correo institucional
              </p>
            </header>

            {!isSent ? (
              <form className="login-form" onSubmit={handleSubmit} noValidate>
                {error ? (
                  <Alert variant="danger" title="Error" className="alert--compact">
                    {error}
                  </Alert>
                ) : null}

                <div className="field">
                  <label className="field__label field__label--required" htmlFor="forgot-email">
                    Correo electrónico
                  </label>
                  <div className="input-wrap">
                    <Icon name="user" className="input-wrap__icon" size={16} />
                    <input
                      className="input no-global"
                      id="forgot-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="ejemplo@slep-iquique.cl"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                    {isLoading ? 'Enviando…' : 'Enviar instrucciones'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="login-recovery__success">
                <Alert variant="info" title="Correo enviado" className="alert--compact">
                  Si el correo <strong>{email}</strong> está registrado, recibirás un enlace para
                  restablecer tu contraseña en unos minutos.
                </Alert>
                <div className="login-form__actions">
                  <Button type="button" variant="primary" onClick={() => navigate('/login')}>
                    Regresar al inicio de sesión
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
          <Link to="/login">¿Ya tienes acceso? Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}

export default ForgotPassword
