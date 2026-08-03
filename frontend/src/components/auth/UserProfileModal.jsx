import React, { useState, useEffect, useRef } from 'react'
import {
  Modal,
  Button,
  IconButton,
  Icon,
  Field,
  Input,
  Select,
  Textarea,
  Switch,
  FileInput,
  Alert,
  Badge,
  EmptyState,
  Avatar,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useNotify } from '../../hooks/useNotify'

const ARCO_ESTADO_VARIANT = {
  PENDIENTE: 'warning',
  APROBADA: 'success',
  RECHAZADA: 'danger',
}

const PROFILE_TABS = [
  { id: 'perfil', label: 'Perfil', view: 'INFO' },
  { id: 'seguridad', label: 'Seguridad', view: 'PASSWORD' },
  { id: 'arco', label: 'Derechos ARCO', view: 'ARCO_HISTORY' },
]

const viewToTab = (view) => {
  if (view === 'INFO') return 'perfil'
  if (view === 'PASSWORD') return 'seguridad'
  return 'arco'
}

const InfoRow = ({ label, value }) => (
  <div className="profile-modal__info-row">
    <dt>{label}</dt>
    <dd>{value || '—'}</dd>
  </div>
)

const UserProfileModal = ({ isOpen, onClose }) => {
  const { user, checkUserStatus } = useAuth()
  const overlay = useFormOverlay()
  const { notify } = useNotify()
  const savedActionRef = useRef(null)

  const [view, setView] = useState('INFO')
  const [loading, setLoading] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [exportSuccess, setExportSuccess] = useState('')

  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  })

  const [arcoHistory, setArcoHistory] = useState([])
  const [arcoForm, setArcoForm] = useState({
    tipo_derecho: 'RECTIFICACION',
    campo: 'anexo',
    valor_propuesto: '',
    justificacion: '',
    archivo_respaldo: null,
    solicita_bloqueo: false,
  })

  useEffect(() => {
    if (!isOpen) {
      setView('INFO')
      overlay.reset()
      savedActionRef.current = null
      setValidationError('')
      setExportSuccess('')
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' })
      setArcoForm({
        tipo_derecho: 'RECTIFICACION',
        campo: 'anexo',
        valor_propuesto: '',
        justificacion: '',
        archivo_respaldo: null,
        solicita_bloqueo: false,
      })
    } else {
      overlay.reset()
      savedActionRef.current = null
      setValidationError('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset al abrir/cerrar
  }, [isOpen])

  const fetchArcoHistory = async () => {
    setLoading(true)
    try {
      const res = await api.get('arco/', { params: { mine: 1 } })
      setArcoHistory(res.data.results || res.data || [])
    } catch (err) {
      console.error('Error al obtener historial ARCO:', err)
      notify({ variant: 'danger', text: 'No se pudo cargar el historial de solicitudes.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (view === 'ARCO_HISTORY') {
      fetchArcoHistory()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  const resetOverlay = () => {
    overlay.reset()
    savedActionRef.current = null
    setValidationError('')
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      const action = savedActionRef.current
      overlay.reset()
      savedActionRef.current = null
      setValidationError('')

      if (action === 'avatar') {
        checkUserStatus()
      } else if (action === 'password') {
        setView('INFO')
        setPasswordData({ old_password: '', new_password: '', confirm_password: '' })
      } else if (action === 'arco') {
        setView('ARCO_HISTORY')
        setArcoForm({
          tipo_derecho: 'RECTIFICACION',
          campo: 'anexo',
          valor_propuesto: '',
          justificacion: '',
          archivo_respaldo: null,
          solicita_bloqueo: false,
        })
        fetchArcoHistory()
      }
      return
    }
    overlay.dismiss()
  }

  const handleClose = () => {
    if (overlay.busy) return
    overlay.reset()
    onClose()
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const formData = new FormData()
    formData.append('avatar', file)

    try {
      await overlay.run(
        async () => {
          await api.post('auth/avatar/', formData)
          savedActionRef.current = 'avatar'
        },
        {
          successDescription: 'Avatar actualizado.',
          formatError: (err) => formatApiFormError(err, 'No se pudo subir la imagen.'),
        },
      )
    } catch {
      // FormOverlay
    }
  }

  const handleAvatarRemove = async () => {
    if (!user?.avatar || overlay.busy) return
    try {
      await overlay.run(
        async () => {
          await api.delete('auth/avatar/')
          savedActionRef.current = 'avatar'
        },
        {
          successDescription: 'Avatar eliminado.',
          formatError: (err) => formatApiFormError(err, 'No se pudo eliminar la imagen.'),
        },
      )
    } catch {
      // FormOverlay
    }
  }

  const handlePasswordSubmit = async () => {
    setValidationError('')
    if (!passwordData.old_password || !passwordData.new_password || !passwordData.confirm_password) {
      setValidationError('Todos los campos son obligatorios.')
      return
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      setValidationError('Las nuevas contraseñas no coinciden.')
      return
    }

    try {
      await overlay.run(
        async () => {
          await api.post('auth/change-password/', {
            old_password: passwordData.old_password,
            new_password: passwordData.new_password,
          })
          savedActionRef.current = 'password'
        },
        {
          successDescription: 'Contraseña actualizada.',
          formatError: (err) =>
            formatApiFormError(err, 'Error al actualizar contraseña.'),
        },
      )
    } catch {
      // FormOverlay
    }
  }

  const handleExportData = () => {
    const exportData = {
      usuario: {
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        rol: user.is_superuser ? 'Administrador' : user.groups?.[0] || 'Usuario',
      },
      funcionario: {
        rut: user.funcionario_data?.rut,
        nombre_completo: user.funcionario_data?.nombre_funcionario,
        cargo: user.funcionario_data?.cargo,
        anexo: user.funcionario_data?.anexo,
        numero_publico: user.funcionario_data?.numero_publico,
        departamento: user.funcionario_data?.departamento,
        unidad: user.funcionario_data?.unidad,
        subdireccion: user.funcionario_data?.subdireccion,
      },
      metadata: {
        sistema: 'SGAF SLEP Iquique',
        fecha_exportacion: new Date().toISOString(),
        declaracion_ley:
          'Este archivo contiene sus datos personales exportados en conformidad al Artículo 9° (Derecho de Portabilidad) de la Ley N° 21.719 de Protección de Datos Personales.',
      },
    }

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(exportData, null, 4),
    )}`
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', jsonString)
    downloadAnchor.setAttribute('download', `datos_personales_${user.username}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()

    setExportSuccess('Datos exportados para portabilidad con éxito.')
    setTimeout(() => setExportSuccess(''), 5000)
  }

  const handleArcoSubmit = async () => {
    setValidationError('')
    if (!arcoForm.justificacion) {
      setValidationError('Debe especificar una justificación para su solicitud.')
      return
    }

    const formData = new FormData()
    formData.append('tipo_derecho', arcoForm.tipo_derecho)
    formData.append('justificacion', arcoForm.justificacion)

    if (arcoForm.tipo_derecho === 'RECTIFICACION') {
      if (!arcoForm.campo || !arcoForm.valor_propuesto) {
        setValidationError('Debe especificar el campo y el valor propuesto.')
        return
      }
      formData.append('campo', arcoForm.campo)
      formData.append('valor_propuesto', arcoForm.valor_propuesto)
    }

    if (arcoForm.archivo_respaldo) {
      formData.append('archivo_respaldo', arcoForm.archivo_respaldo)
    }

    formData.append('solicita_bloqueo', arcoForm.solicita_bloqueo)

    try {
      await overlay.run(
        async () => {
          await api.post('arco/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          savedActionRef.current = 'arco'
        },
        {
          successDescription: 'Solicitud ARCO enviada.',
          formatError: (err) => formatApiFormError(err, 'Error al enviar solicitud.'),
        },
      )
    } catch {
      // FormOverlay
    }
  }

  const selectTab = (tabId) => {
    resetOverlay()
    const tab = PROFILE_TABS.find((t) => t.id === tabId)
    if (tab) setView(tab.view)
  }

  const displayName = user?.funcionario_data?.nombre_funcionario || user?.username
  const roleLabel = user?.is_superuser
    ? 'Administrador'
    : user?.groups?.[0] || 'Usuario'
  const activeTab = viewToTab(view)
  const cargo = user?.funcionario_data?.cargo

  const footer =
    view === 'PASSWORD' ? (
      <>
        <Button variant="ghost" type="button" onClick={handleClose} disabled={overlay.busy}>
          Cerrar
        </Button>
        <Button
          type="button"
          variant="primary"
          loading={overlay.busy}
          disabled={overlay.busy || overlay.active}
          onClick={handlePasswordSubmit}
        >
          Guardar clave
        </Button>
      </>
    ) : view === 'ARCO_FORM' ? (
      <>
        <Button
          variant="ghost"
          type="button"
          onClick={() => {
            resetOverlay()
            setView('ARCO_HISTORY')
          }}
          disabled={overlay.busy}
        >
          Volver
        </Button>
        <Button
          type="button"
          variant="primary"
          loading={overlay.busy}
          disabled={overlay.busy || overlay.active}
          onClick={handleArcoSubmit}
        >
          Enviar solicitud
        </Button>
      </>
    ) : (
      <Button variant="secondary" type="button" onClick={handleClose} disabled={overlay.busy}>
        Cerrar
      </Button>
    )

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      size="lg"
      className="profile-modal"
      title="Mi perfil"
      subheader="Cuenta, seguridad y derechos ARCO"
      footer={footer}
      {...overlay.modalProps}
      onOverlayDismiss={handleOverlayDismiss}
    >
      <div className="profile-modal__body">
        <header className="profile-modal__hero">
          <div className="profile-modal__avatar-wrap">
            <Avatar
              src={user?.avatar}
              name={displayName}
              className="profile-modal__avatar"
            />
            {user?.avatar ? (
              <button
                type="button"
                className="profile-modal__avatar-remove"
                disabled={overlay.busy}
                onClick={handleAvatarRemove}
                title="Quitar foto"
                aria-label="Quitar foto"
              >
                <Icon name="close" size={14} />
              </button>
            ) : null}
            <label className="profile-modal__avatar-edit">
              <span className="sr-only">Cambiar foto</span>
              <Icon name="edit" size={14} />
              <input
                type="file"
                accept="image/*"
                disabled={overlay.busy}
                onChange={handleAvatarChange}
              />
            </label>
          </div>
          <div className="profile-modal__identity">
            <h3 className="profile-modal__name">{displayName}</h3>
            <p className="profile-modal__username">@{user?.username}</p>
            <div className="profile-modal__meta">
              <Badge variant="accent">{roleLabel}</Badge>
              {cargo ? <span className="profile-modal__cargo">{cargo}</span> : null}
            </div>
          </div>
        </header>

        {validationError ? (
          <Alert variant="danger" title="Error" onClose={() => setValidationError('')}>
            {validationError}
          </Alert>
        ) : null}
        {exportSuccess ? (
          <Alert variant="success" title="Listo" onClose={() => setExportSuccess('')}>
            {exportSuccess}
          </Alert>
        ) : null}

        {view !== 'ARCO_FORM' ? (
          <div className="tabs profile-modal__tabs">
            <ul className="tabs__list" role="tablist" aria-label="Secciones del perfil">
              {PROFILE_TABS.map((tab) => (
                <li key={tab.id}>
                  <button
                    type="button"
                    role="tab"
                    className={`tabs__btn${activeTab === tab.id ? ' is-active' : ''}`}
                    aria-selected={activeTab === tab.id}
                    onClick={() => selectTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="profile-modal__panel" role="tabpanel">
          {view === 'INFO' && (
            <div className="profile-modal__section">
              <dl className="profile-modal__info">
                <InfoRow label="RUT / RUN" value={user?.funcionario_data?.rut} />
                <InfoRow label="Correo" value={user?.email} />
                <InfoRow label="Departamento" value={user?.funcionario_data?.departamento} />
                <InfoRow label="Unidad" value={user?.funcionario_data?.unidad} />
                <InfoRow label="Anexo" value={user?.funcionario_data?.anexo} />
              </dl>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="profile-modal__export"
                onClick={handleExportData}
              >
                <Icon name="download" size="sm" />
                Exportar mis datos
              </Button>
            </div>
          )}

          {view === 'PASSWORD' && (
            <div className="profile-modal__section">
              <p className="profile-modal__hint">
                Use una clave distinta a la de otros sistemas institucionales.
              </p>
              <div className="form-grid">
                <Field
                  label="Contraseña actual"
                  required
                  htmlFor="profile-old-pass"
                  className="field--full"
                >
                  <Input
                    id="profile-old-pass"
                    type="password"
                    autoComplete="current-password"
                    value={passwordData.old_password}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, old_password: e.target.value })
                    }
                  />
                </Field>
                <Field label="Nueva clave" required htmlFor="profile-new-pass">
                  <Input
                    id="profile-new-pass"
                    type="password"
                    autoComplete="new-password"
                    value={passwordData.new_password}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, new_password: e.target.value })
                    }
                  />
                </Field>
                <Field label="Confirmar nueva" required htmlFor="profile-confirm-pass">
                  <Input
                    id="profile-confirm-pass"
                    type="password"
                    autoComplete="new-password"
                    value={passwordData.confirm_password}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirm_password: e.target.value })
                    }
                  />
                </Field>
              </div>
            </div>
          )}

          {view === 'ARCO_HISTORY' && (
            <div className="profile-modal__section">
              <div className="profile-modal__section-head">
                <div>
                  <h4 className="profile-modal__section-title">Mis solicitudes</h4>
                  <p className="profile-modal__hint">
                    Acceso, rectificación, oposición y portabilidad (Ley 21.719).
                  </p>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    resetOverlay()
                    setView('ARCO_FORM')
                  }}
                >
                  <Icon name="plus" size="sm" />
                  Nueva
                </Button>
              </div>

              <div className="profile-modal__arco-list">
                {loading ? (
                  <EmptyState title="Cargando solicitudes…" />
                ) : arcoHistory.length === 0 ? (
                  <EmptyState
                    title="Sin solicitudes"
                    description="Aún no has ingresado ninguna solicitud ARCO."
                  />
                ) : (
                  <ul className="profile-modal__arco-items">
                    {arcoHistory.map((req) => (
                      <li key={req.id} className="profile-modal__arco-item">
                        <div className="profile-modal__arco-item-head">
                          <span className="profile-modal__arco-type">
                            {req.tipo_derecho === 'RECTIFICACION'
                              ? `Rectificar: ${req.campo}`
                              : req.tipo_derecho}
                          </span>
                          <Badge variant={ARCO_ESTADO_VARIANT[req.estado] || 'neutral'}>
                            {req.estado}
                          </Badge>
                        </div>
                        {req.tipo_derecho === 'RECTIFICACION' ? (
                          <p className="profile-modal__arco-change">
                            <span className="profile-modal__arco-old">{req.valor_anterior || '—'}</span>
                            <Icon name="chevron" size={12} className="profile-modal__arco-arrow" />
                            <strong>{req.valor_propuesto}</strong>
                          </p>
                        ) : null}
                        {req.justificacion ? (
                          <p className="profile-modal__arco-note">{req.justificacion}</p>
                        ) : null}
                        {req.estado === 'RECHAZADA' && req.motivo_rechazo ? (
                          <Alert variant="danger" title="Motivo de rechazo">
                            {req.motivo_rechazo}
                          </Alert>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {view === 'ARCO_FORM' && (
            <div className="profile-modal__section">
              <div className="profile-modal__section-head">
                <div className="profile-modal__back">
                  <IconButton
                    type="button"
                    aria-label="Volver al historial"
                    onClick={() => {
                      resetOverlay()
                      setView('ARCO_HISTORY')
                    }}
                  >
                    <Icon name="undo" size={16} />
                  </IconButton>
                  <div>
                    <h4 className="profile-modal__section-title">Nueva solicitud ARCO</h4>
                    <p className="profile-modal__hint">RRHH o TI revisará su requerimiento.</p>
                  </div>
                </div>
              </div>

              <div className="form-grid">
                <Field label="Tipo de derecho" htmlFor="arco-tipo" className="field--full">
                  <Select
                    id="arco-tipo"
                    value={arcoForm.tipo_derecho}
                    onChange={(e) =>
                      setArcoForm({
                        ...arcoForm,
                        tipo_derecho: e.target.value,
                        campo: e.target.value === 'RECTIFICACION' ? 'anexo' : '',
                      })
                    }
                  >
                    <option value="RECTIFICACION">Rectificación (modificar un dato)</option>
                    <option value="SUPRESION">Supresión (baja de registro)</option>
                    <option value="OPOSICION">Oposición a un tratamiento</option>
                    <option value="PORTABILIDAD">Portabilidad (copia de datos)</option>
                  </Select>
                </Field>

                {arcoForm.tipo_derecho === 'RECTIFICACION' ? (
                  <>
                    <Field label="Dato a rectificar" htmlFor="arco-campo">
                      <Select
                        id="arco-campo"
                        value={arcoForm.campo}
                        onChange={(e) => setArcoForm({ ...arcoForm, campo: e.target.value })}
                      >
                        <option value="nombre_funcionario">Nombre completo</option>
                        <option value="rut">RUT</option>
                        <option value="anexo">Anexo telefónico</option>
                        <option value="cargo">Cargo</option>
                        <option value="email">Correo electrónico</option>
                      </Select>
                    </Field>
                    <Field label="Nuevo valor" htmlFor="arco-valor">
                      <Input
                        id="arco-valor"
                        type="text"
                        placeholder="Valor corregido"
                        value={arcoForm.valor_propuesto}
                        onChange={(e) =>
                          setArcoForm({ ...arcoForm, valor_propuesto: e.target.value })
                        }
                      />
                    </Field>
                  </>
                ) : null}

                <Field
                  label="Justificación"
                  htmlFor="arco-justificacion"
                  className="field--full"
                  required
                >
                  <Textarea
                    id="arco-justificacion"
                    rows={3}
                    placeholder="Explique el motivo de la solicitud…"
                    value={arcoForm.justificacion}
                    onChange={(e) => setArcoForm({ ...arcoForm, justificacion: e.target.value })}
                  />
                </Field>

                <Field label="Documento de respaldo (opcional)" className="field--full">
                  <FileInput
                    variant="zone"
                    label={
                      arcoForm.archivo_respaldo
                        ? arcoForm.archivo_respaldo.name
                        : 'Subir PDF o imagen'
                    }
                    hint="PDF o imagen"
                    accept="image/*,application/pdf"
                    onChange={(e) =>
                      setArcoForm({
                        ...arcoForm,
                        archivo_respaldo: e.target.files?.[0] || null,
                      })
                    }
                  />
                </Field>

                {arcoForm.tipo_derecho === 'RECTIFICACION' ||
                arcoForm.tipo_derecho === 'SUPRESION' ||
                arcoForm.tipo_derecho === 'OPOSICION' ? (
                  <div className="field field--full profile-modal__switch-block">
                    <Switch
                      id="arco-bloqueo"
                      label="Solicitar bloqueo temporal (Art. 8° ter)"
                      checked={arcoForm.solicita_bloqueo}
                      onChange={(e) =>
                        setArcoForm({ ...arcoForm, solicita_bloqueo: e.target.checked })
                      }
                    />
                    <p className="profile-modal__hint">
                      Suspende el uso de este dato mientras se resuelve la solicitud.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default UserProfileModal
