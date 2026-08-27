import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import axios from 'axios'
import api from '../api'
import { APP_VERSION } from '../version'
import { Alert, Button, Icon } from '@slep/ui'
import './LoginDs.css'

const resolvePublicImageUrl = (path) => {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  const configuredApi = import.meta.env.DEV ? import.meta.env.VITE_API_URL : '/api/'
  try {
    const apiUrl = new URL(configuredApi, window.location.origin)
    const backendOrigin = `${apiUrl.protocol}//${apiUrl.host}`
    return new URL(path, backendOrigin).toString()
  } catch {
    return new URL(path, window.location.origin).toString()
  }
}

const Login = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [rememberDevice, setRememberDevice] = useState(false)
  const [mfaState, setMfaState] = useState({
    required: false,
    method: null,
    emailMask: '',
    token: null,
    availableMethods: [],
    setupRequired: false,
  })
  const [setupMfaData, setSetupMfaData] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)
  const [loginBackgrounds, setLoginBackgrounds] = useState([])
  const [backgroundIndex, setBackgroundIndex] = useState(0)
  const [rotationSeconds, setRotationSeconds] = useState(8)

  const { login, verifyMFA, completeLogin } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    const fetchBackgrounds = async () => {
      try {
        try {
          const configRes = await axios.get('/api/personalizacion/login/backgrounds/public-config/')
          const seconds = Number(configRes.data?.rotation_seconds || 8)
          if (seconds >= 2 && seconds <= 120) setRotationSeconds(seconds)
        } catch {
          setRotationSeconds(8)
        }

        const res = await axios.get('/api/personalizacion/login/backgrounds/active/')
        const raw = Array.isArray(res.data) ? res.data : []
        const normalized = raw
          .map((item) => ({
            id: item.id,
            imageUrl: resolvePublicImageUrl(item.imagen),
            establecimientoNombre: item.establecimiento_nombre || '',
            establecimientoLogo: resolvePublicImageUrl(item.establecimiento_logo),
            establecimientoDirector: item.establecimiento_director || '',
            establecimientoDireccion: item.establecimiento_direccion || '',
            establecimientoCodigo: item.establecimiento_codigo || item.rbd || '',
          }))
          .filter((item) => Boolean(item.imageUrl))

        if (!normalized.length || !mounted) return

        const preloaded = await Promise.all(
          normalized.map(
            (item) =>
              new Promise((resolve) => {
                const img = new Image()
                img.onload = () => resolve(item)
                img.onerror = () => resolve(null)
                img.src = item.imageUrl
              }),
          ),
        )
        if (mounted) {
          const successful = preloaded.filter(Boolean)
          setLoginBackgrounds(successful.length ? successful : normalized)
          setBackgroundIndex(0)
        }
      } catch {
        if (mounted) setLoginBackgrounds([])
      }
    }
    fetchBackgrounds()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (loginBackgrounds.length < 2) return undefined
    const timer = setInterval(() => {
      setBackgroundIndex((prev) => (prev + 1) % loginBackgrounds.length)
    }, Math.max(2, Number(rotationSeconds || 8)) * 1000)
    return () => clearInterval(timer)
  }, [loginBackgrounds, rotationSeconds])

  const activeBackground = useMemo(() => {
    if (!loginBackgrounds.length) return null
    return loginBackgrounds[backgroundIndex] || null
  }, [loginBackgrounds, backgroundIndex])

  const handleLoginEnter = (e) => {
    if (e.key !== 'Enter' || isLoading) return
    e.preventDefault()
    e.currentTarget.form?.requestSubmit()
  }

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const submittedUsername = String(formData.get('username') || '')
    const submittedPassword = String(formData.get('password') || '')

    setUsername(submittedUsername)
    setPassword(submittedPassword)
    setError('')
    setIsLoading(true)
    try {
      const result = await login(submittedUsername, submittedPassword)
      if (result?.mfa_required) {
        setMfaState({
          required: true,
          method: result.mfa_method,
          emailMask: result.email_mask,
          token: result.mfa_token,
          availableMethods: result.available_methods || ['EMAIL'],
          setupRequired: false,
        })
        setMfaCode('')
      } else {
        navigate('/')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Credenciales inválidas. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMfaSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const res = await verifyMFA(mfaState.token, mfaCode, rememberDevice, mfaState.method)
      if (res?.mfa_setup_required) {
        try {
          const setupRes = await api.get(`auth/mfa/setup/?mfa_token=${mfaState.token}`)
          setSetupMfaData(setupRes.data)
          setMfaState((prev) => ({ ...prev, setupRequired: true }))
          setMfaCode('')
        } catch {
          setError('Código correcto, pero hubo un error al cargar el QR. Reintenta.')
        }
      } else {
        navigate('/')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Código inválido o expirado.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetupSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const res = await api.post('auth/mfa/setup/', {
        mfa_token: mfaState.token,
        code: mfaCode,
        method: 'TOTP',
        remember_device: rememberDevice,
      })
      if (res.data.access) {
        completeLogin(res.data)
        navigate('/')
      } else {
        setError('Configuración exitosa, por favor ingresa nuevamente.')
        setMfaState((prev) => ({ ...prev, required: false, setupRequired: false }))
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Código incorrecto. Verifica el autenticador.')
    } finally {
      setIsLoading(false)
    }
  }

  const resendEmailCode = async () => {
    setResendingEmail(true)
    try {
      await api.post('auth/mfa/send-otp/', { mfa_token: mfaState.token })
      setError('Nuevo código enviado a tu correo.')
      setTimeout(() => setError(''), 3000)
    } catch {
      setError('Error al reenviar el código.')
    } finally {
      setResendingEmail(false)
    }
  }

  const switchMfaMethod = async (newMethod) => {
    if (newMethod === 'EMAIL') await resendEmailCode()
    setMfaState({ ...mfaState, method: newMethod })
    setMfaCode('')
  }

  const showSuccessNotice = error.toLowerCase().includes('enviado')
  const panelTitle = !mfaState.required
    ? 'Iniciar sesión'
    : mfaState.setupRequired
      ? 'Configurar autenticador'
      : 'Verificar identidad'
  const panelSubtitle = !mfaState.required
    ? ''
    : mfaState.setupRequired
      ? 'Escanea el código QR y valida el código de 6 dígitos'
      : mfaState.method === 'EMAIL'
        ? `Código enviado a ${mfaState.emailMask}`
        : 'Ingresa el código generado en tu aplicación'

  return (
    <div className="login-page login-page--split" data-login-variant="open-design-split">
      <div className="login-split">
        <section className="login-hero" aria-label="Identidad institucional">
          <div className="login-hero__bg" aria-hidden="true">
            {loginBackgrounds.map((item, index) => (
              <div
                key={item.id || item.imageUrl}
                className="login-hero__slide"
                style={{
                  backgroundImage: `url(${item.imageUrl})`,
                  opacity: index === backgroundIndex ? 1 : 0,
                }}
              />
            ))}
          </div>
          <div className="login-hero__overlay" aria-hidden="true" />

          <div className="login-hero__content">
            <div className="login-hero__brand">
              <div className="login-hero__eyebrow" data-od-id="login-hero-eyebrow">
                <p className="login-hero__eyebrow-label">Portal de gestión interna</p>
                <h1 className="login-hero__title">SISTEMA DE GESTIÓN ADMINISTRATIVA</h1>
                <p className="login-hero__tagline">
                  Operaciones, reservas, establecimientos y soporte en un entorno unificado para el
                  trabajo diario.
                </p>
              </div>
            </div>

            {activeBackground?.establecimientoNombre ? (
              <aside className="login-establishment" aria-label="Establecimiento de referencia">
                {activeBackground.establecimientoLogo ? (
                  <div className="login-establishment__emblem" aria-hidden="true">
                    <img src={activeBackground.establecimientoLogo} alt="" />
                  </div>
                ) : null}
                <div className="login-establishment__body">
                  <p className="login-establishment__eyebrow">Establecimiento</p>
                  <h3 className="login-establishment__name">
                    {activeBackground.establecimientoNombre}
                  </h3>
                  {activeBackground.establecimientoDirector ? (
                    <p className="login-establishment__detail">
                      Director: {activeBackground.establecimientoDirector}
                    </p>
                  ) : null}
                  {activeBackground.establecimientoDireccion ? (
                    <p className="login-establishment__detail">
                      {activeBackground.establecimientoDireccion}
                    </p>
                  ) : null}
                </div>
              </aside>
            ) : null}
          </div>
        </section>

        <aside className="login-rail" aria-label="Acceso al sistema">
          <header className="login-rail__brand">
            <img
              className="login-rail__logo"
              src="/assets/logo-slep-negro.png"
              alt="Servicio Local de Educación Pública Iquique"
              width={280}
              height={96}
            />
          </header>

          <div className="login-rail__main">
            <header className="login-rail__header">
              <h2 className="login-rail__title">{panelTitle}</h2>
              <p className="login-rail__desc">{panelSubtitle}</p>
            </header>

            {error ? (
              <Alert
                variant={showSuccessNotice ? 'info' : 'danger'}
                title={showSuccessNotice ? 'Aviso' : undefined}
                className="alert--compact login-rail__alert"
              >
                {error}
              </Alert>
            ) : null}

            {!mfaState.required ? (
              <form className="login-form" onSubmit={handleLoginSubmit} noValidate>
                <div className="field">
                  <label className="field__label" htmlFor="login-user">
                    Usuario
                  </label>
                  <div className="input-wrap">
                    <Icon name="user" className="input-wrap__icon" size={16} />
                    <input
                      className="input no-global"
                      id="login-user"
                      name="username"
                      type="text"
                      autoComplete="username"
                      placeholder="usuario institucional"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onKeyDown={handleLoginEnter}
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="login-password">
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
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={handleLoginEnter}
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

                <div className="login-form__meta">
                  <Link to="/forgot-password" className="login-form__forgot">
                    Olvidé mi contraseña
                  </Link>
                </div>

                <div className="login-form__actions">
                  <Button
                    type="submit"
                    variant="primary"
                    className="login-form__submit"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Ingresando…' : 'Iniciar sesión'}
                  </Button>
                </div>
              </form>
            ) : mfaState.setupRequired ? (
              <form className="login-form" onSubmit={handleSetupSubmit} noValidate>
                <div className="login-form__qr">
                  {setupMfaData?.otpauth_url ? (
                    <QRCodeCanvas value={setupMfaData.otpauth_url} size={160} />
                  ) : (
                    <div className="login-form__qr-placeholder" />
                  )}
                </div>
                <div className="field">
                  <label className="field__label field__label--required" htmlFor="mfa-setup-code">
                    Código de verificación
                  </label>
                  <input
                    className="input no-global"
                    id="mfa-setup-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                  />
                </div>
                <label className="login-form__remember">
                  <input
                    type="checkbox"
                    className="no-global"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                  />
                  <span>Recordar equipo por 30 días</span>
                </label>
                <div className="login-form__actions">
                  <Button type="submit" variant="primary" disabled={isLoading || mfaCode.length < 6}>
                    Finalizar configuración
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setMfaState((prev) => ({ ...prev, setupRequired: false }))}
                  >
                    Volver
                  </Button>
                </div>
              </form>
            ) : (
              <form className="login-form" onSubmit={handleMfaSubmit} noValidate>
                <div className="field">
                  <label className="field__label field__label--required" htmlFor="mfa-code">
                    Código de verificación
                  </label>
                  <input
                    className="input no-global"
                    id="mfa-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                  />
                </div>
                <label className="login-form__remember">
                  <input
                    type="checkbox"
                    className="no-global"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                  />
                  <span>Recordar equipo por 30 días</span>
                </label>
                <div className="login-form__actions">
                  <Button type="submit" variant="primary" disabled={isLoading || mfaCode.length < 6}>
                    Verificar e ingresar
                  </Button>
                  {mfaState.availableMethods.length > 1 && (
                    <div className="login-form__method-switch">
                      {mfaState.availableMethods.map((method) => (
                        <Button
                          key={method}
                          type="button"
                          variant={mfaState.method === method ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => switchMfaMethod(method)}
                        >
                          {method === 'EMAIL' ? 'Correo' : 'App'}
                        </Button>
                      ))}
                    </div>
                  )}
                  {mfaState.method === 'EMAIL' && (
                    <Button
                      type="button"
                      variant="quiet"
                      disabled={resendingEmail}
                      onClick={resendEmailCode}
                    >
                      {resendingEmail ? 'Enviando…' : 'Reenviar código'}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setMfaCode('')
                      setMfaState((prev) => ({ ...prev, required: false }))
                    }}
                  >
                    Volver al login
                  </Button>
                </div>
              </form>
            )}
          </div>

          <footer className="login-rail__footer">
            <span>© {new Date().getFullYear()} SLEP Iquique</span>
            <span>Versión {APP_VERSION}</span>
          </footer>
        </aside>
      </div>
    </div>
  )
}

export default Login
