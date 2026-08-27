import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../../api'
import { useNotify } from '../../hooks/useNotify'
import NotificationTypesAdmin from './NotificationTypesAdmin'
import {
  PageHeader,
  Card,
  CardHeader,
  Modal,
  ConfirmModal,
  Field,
  Input,
  Select,
  Textarea,
  Button,
  Icon,
  IconButton,
  Badge,
  EmptyState,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const NOTIF_TABS = [
  { id: 'tipos', label: 'Tipos' },
  { id: 'accounts', label: 'Cuentas' },
  { id: 'templates', label: 'Editor' },
]

const TAB_IDS = new Set(NOTIF_TABS.map((t) => t.id))

const EmailSettings = () => {
  const overlay = useFormOverlay()
  const { notify } = useNotify()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(
    TAB_IDS.has(tabFromUrl) ? tabFromUrl : 'tipos',
  )

  useEffect(() => {
    const t = searchParams.get('tab')
    if (TAB_IDS.has(t)) setActiveTab(t)
    else setActiveTab('tipos')
  }, [searchParams])

  const selectTab = (id) => {
    setActiveTab(id)
    setSearchParams(id === 'tipos' ? {} : { tab: id }, { replace: true })
  }

  const [accounts, setAccounts] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [accountSavedOk, setAccountSavedOk] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [accountFormData, setAccountFormData] = useState({
    nombre: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    smtp_use_tls: true,
    smtp_use_ssl: false,
    remitente_nombre: 'SGAF',
    remitente_email: '',
    es_default: false,
  })

  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewMode, setPreviewMode] = useState('desktop')
  const [previewTheme] = useState('light')
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [isTestingConn, setIsTestingConn] = useState(null)

  useEffect(() => {
    fetchData()
    // fetchData initializes several admin resources once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [accRes, tempRes] = await Promise.all([
        api.get('comunicaciones/cuentas-smtp/'),
        api.get('comunicaciones/plantillas/'),
      ])
      setAccounts(accRes.data.results || accRes.data)
      const templatesData = tempRes.data.results || tempRes.data
      setTemplates(templatesData)
      if (templatesData.length > 0) handleSelectTemplate(templatesData[0])
    } catch (error) {
      console.error('Error loading email settings:', error)
      notify({ variant: 'danger', text: 'Error al cargar datos del servidor.' })
    } finally {
      setLoading(false)
    }
  }

  const saveTemplate = async () => {
    setSaving(true)
    try {
      await api.patch(`comunicaciones/plantillas/${selectedTemplate.id}/`, selectedTemplate)
      notify({ variant: 'success', text: 'Guardado con éxito.' })
      fetchData()
    } catch (error) {
      console.error('Error al guardar plantilla:', error)
      notify({ variant: 'danger', text: 'Fallo al guardar.' })
    } finally {
      setSaving(false)
    }
  }

  const sendTestMail = async () => {
    if (!testEmail) {
      notify({ variant: 'danger', text: 'Ingresa un correo.' })
      return
    }
    setSendingTest(true)
    try {
      await api.post(`comunicaciones/plantillas/${selectedTemplate.id}/send_test/`, {
        email: testEmail,
      })
      notify({ variant: 'success', text: 'Correo de prueba enviado.' })
    } catch (error) {
      console.error('Error al enviar prueba:', error)
      notify({ variant: 'danger', text: 'Error al enviar.' })
    } finally {
      setSendingTest(false)
    }
  }
  const getVariables = (purpose) => {
    if (!purpose) return []
    const common = ['{{ nombre }}', '{{ year }}']
    if (purpose === 'MFA') return [...common, '{{ codigo }}']
    if (purpose === 'RESET_PASSWORD') return [...common, '{{ reset_url }}']
    if (purpose.startsWith('RESERVA'))
      return [
        ...common,
        '{{ recurso }}',
        '{{ fecha }}',
        '{{ hora }}',
        '{{ estado }}',
        '{{ codigo_reserva }}',
      ]
    if (purpose.startsWith('DOC_SERVICIOS'))
      return [
        ...common,
        '{{ titulo }}',
        '{{ mensaje }}',
        '{{ link }}',
        '{{ tipo_nombre }}',
        '{{ establecimiento }}',
        '{{ fecha_servicio }}',
        '{{ folio }}',
        '{{ logo_cid }}',
        '{{ modulo }}',
        '{{ evento }}',
      ]
    if (purpose === 'ALERTA_VENCIMIENTO_VEHICULO')
      return [
        ...common,
        '{{ patente }}',
        '{{ vehiculo }}',
        '{{ documento }}',
        '{{ fecha_vencimiento }}',
        '{{ dias_restantes }}',
      ]
    return common
  }

  const handleSelectTemplate = async (template) => {
    setSelectedTemplate(template)
    updatePreview(template.cuerpo_html)
  }

  const updatePreview = async (html) => {
    try {
      const res = await api.post('comunicaciones/plantillas/preview/', { html })
      setPreviewHtml(res.data.html)
    } catch (error) {
      console.error('Error al previsualizar plantilla:', error)
    }
  }

  const handleTemplateChange = (field, value) => {
    const updated = { ...selectedTemplate, [field]: value }
    setSelectedTemplate(updated)
    if (field === 'cuerpo_html') updatePreview(value)
  }

  const handleOpenAccountModal = (acc = null) => {
    if (acc) {
      setEditingAccount(acc)
      setAccountFormData({ ...acc, smtp_password: '' })
    } else {
      setEditingAccount(null)
      setAccountFormData({
        nombre: '',
        smtp_host: '',
        smtp_port: 587,
        smtp_user: '',
        smtp_password: '',
        smtp_use_tls: true,
        smtp_use_ssl: false,
        remitente_nombre: 'SGAF',
        remitente_email: '',
        es_default: accounts.length === 0,
      })
    }
    setShowPassword(false)
    setAccountSavedOk(false)
    overlay.reset()
    setIsAccountModalOpen(true)
  }

  const closeAccountModal = () => {
    if (overlay.busy) return
    overlay.reset()
    setIsAccountModalOpen(false)
    setEditingAccount(null)
    setAccountSavedOk(false)
  }

  const handleAccountOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      setIsAccountModalOpen(false)
      setEditingAccount(null)
      if (accountSavedOk) fetchData()
      setAccountSavedOk(false)
      return
    }
    overlay.dismiss()
  }

  const handleSaveAccount = async (e) => {
    e.preventDefault()
    const wasEdit = Boolean(editingAccount)
    try {
      await overlay.run(
        async () => {
          const data = { ...accountFormData }
          if (!data.smtp_password && editingAccount) delete data.smtp_password
          if (wasEdit) {
            await api.patch(`comunicaciones/cuentas-smtp/${editingAccount.id}/`, data)
          } else {
            await api.post('comunicaciones/cuentas-smtp/', data)
          }
          setAccountSavedOk(true)
        },
        {
          successDescription: wasEdit ? 'Cuenta SMTP actualizada.' : 'Cuenta SMTP guardada.',
          formatError: (err) => formatApiFormError(err, 'Error al guardar cuenta.'),
        },
      )
    } catch {
      // FormOverlay
    }
  }

  const testConnection = async (id) => {
    setIsTestingConn(id)
    try {
      await api.post(`comunicaciones/cuentas-smtp/${id}/test_connection/`)
      notify({ variant: 'success', text: 'Conexión exitosa.' })
    } catch (error) {
      console.error('Error al probar conexión SMTP:', error)
      notify({ variant: 'danger', text: 'Fallo de conexión.' })
    } finally {
      setIsTestingConn(null)
    }
  }

  const handleConfirmDeleteAccount = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`comunicaciones/cuentas-smtp/${deleteTarget.id}/`)
      setDeleteTarget(null)
      notify({ variant: 'success', text: 'Cuenta eliminada.' })
      fetchData()
    } catch (error) {
      console.error('Error al eliminar cuenta SMTP:', error)
      notify({ variant: 'danger', text: 'No se pudo eliminar la cuenta.' })
    } finally {
      setDeleting(false)
    }
  }

  const insertVariable = (variable) => {
    const textarea = document.getElementById('code-editor')
    if (!textarea || !selectedTemplate) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = selectedTemplate.cuerpo_html
    const newText = text.substring(0, start) + variable + text.substring(end)
    handleTemplateChange('cuerpo_html', newText)
  }

  if (loading && activeTab !== 'tipos') {
    return (
      <div className="page" data-od-id="notificaciones-admin-page" data-fill-viewport>
        <PageHeader
          icon="bell"
          title="Notificaciones"
          description="Tipos de evento, canales, SMTP y plantillas"
          breadcrumbs={[
            { label: 'Inicio', to: '/' },
            { label: 'Administración' },
            { label: 'Notificaciones' },
          ]}
          linkComponent={Link}
        />
        <EmptyState title="Cargando configuración" description="Obteniendo datos del servidor…" />
      </div>
    )
  }

  return (
    <div className="page" data-od-id="notificaciones-admin-page" data-fill-viewport>
      <PageHeader
        icon="bell"
        title="Notificaciones"
        description="Tipos de evento, canales (campana/email), SMTP y plantillas"
        breadcrumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Administración' },
          { label: 'Notificaciones' },
        ]}
        linkComponent={Link}
      />

      <div className="tabs">
        <ul className="tabs__list" role="tablist" aria-label="Secciones de notificaciones">
          {NOTIF_TABS.map((tab) => (
            <li key={tab.id}>
              <button
                type="button"
                role="tab"
                id={`notif-tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls={`notif-panel-${tab.id}`}
                className={`tabs__btn${activeTab === tab.id ? ' is-active' : ''}`}
                onClick={() => selectTab(tab.id)}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div
        id={`notif-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`notif-tab-${activeTab}`}
        className="tabs__panel is-active email-settings-tab-panel"
      >
        {activeTab === 'tipos' ? <NotificationTypesAdmin embedded /> : null}
        {activeTab === 'templates' ? (
          <div className="email-templates-layout">
            <Card className="email-templates-sidebar">
              <CardHeader title="Tipo de notificación" />
              <div className="email-sidebar-list">
                {templates.map((temp) => (
                  <button
                    key={temp.id}
                    type="button"
                    className={`email-sidebar-list__btn${selectedTemplate?.id === temp.id ? ' is-active' : ''}`}
                    onClick={() => handleSelectTemplate(temp)}
                  >
                    {temp.nombre}
                  </button>
                ))}
              </div>
            </Card>

            <div className="email-templates-editor">
              <div className="email-templates-toolbar">
                <Field label="Salida" htmlFor="template-smtp">
                  <Select
                    id="template-smtp"
                    value={selectedTemplate?.cuenta_smtp || ''}
                    onChange={(e) => handleTemplateChange('cuenta_smtp', e.target.value)}
                  >
                    <option value="">(Global)</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Button variant="primary" size="sm" onClick={saveTemplate} loading={saving} disabled={saving}>
                  <Icon name="check" size="sm" /> Guardar
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={sendTestMail}
                  loading={sendingTest}
                  disabled={sendingTest}
                >
                  <Icon name="send" size="sm" /> Probar
                </Button>
              </div>

              <Card className="email-code-editor">
                <div className="email-code-editor__head">
                  <span className="email-code-editor__title">Editor.html</span>
                  <div className="email-code-editor__vars">
                    <span className="email-code-editor__vars-label">Variables:</span>
                    {getVariables(selectedTemplate?.proposito).map((v) => (
                      <Button
                        key={v}
                        type="button"
                        variant="quiet"
                        size="sm"
                        onClick={() => insertVariable(v)}
                      >
                        {v}
                      </Button>
                    ))}
                  </div>
                </div>
                <Textarea
                  id="code-editor"
                  className="email-code-editor__textarea"
                  value={selectedTemplate?.cuerpo_html || ''}
                  spellCheck={false}
                  onChange={(e) => handleTemplateChange('cuerpo_html', e.target.value)}
                />
                <div className="email-code-editor__subject">
                  <Field label="Asunto" htmlFor="template-asunto" className="field--inline">
                    <Input
                      id="template-asunto"
                      value={selectedTemplate?.asunto || ''}
                      onChange={(e) => handleTemplateChange('asunto', e.target.value)}
                    />
                  </Field>
                </div>
              </Card>
            </div>

            <Card className="email-templates-preview">
              <CardHeader
                title="Vista previa"
                actions={
                  <div className="email-preview-modes">
                    <IconButton
                      type="button"
                      aria-label="Vista móvil"
                      className={previewMode === 'mobile' ? 'is-active' : undefined}
                      onClick={() => setPreviewMode('mobile')}
                    >
                      <Icon name="message" size={14} />
                    </IconButton>
                    <IconButton
                      type="button"
                      aria-label="Vista escritorio"
                      className={previewMode === 'desktop' ? 'is-active' : undefined}
                      onClick={() => setPreviewMode('desktop')}
                    >
                      <Icon name="monitor" size={14} />
                    </IconButton>
                  </div>
                }
              />
              <div
                className={`email-preview-frame-wrap email-preview-frame-wrap--${previewTheme}${previewMode === 'mobile' ? ' email-preview-frame-wrap--mobile' : ''}`}
              >
                <iframe
                  srcDoc={previewHtml}
                  className="email-preview-frame"
                  title="Vista previa de plantilla"
                />
              </div>
              <div className="email-preview-test">
                <Field label="Correo de prueba" htmlFor="test-email">
                  <Input
                    id="test-email"
                    type="email"
                    placeholder="test@email.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                </Field>
              </div>
            </Card>
          </div>
        ) : activeTab === 'accounts' ? (
          <div className="email-accounts-layout">
            <div className="email-accounts-head">
              <div>
                <h3 className="email-section-title">Cuentas SMTP de salida</h3>
                <p className="email-section-desc">
                  Servidores usados para enviar notificaciones y correos de prueba.
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => handleOpenAccountModal()}>
                <Icon name="plus" size="sm" /> Nueva cuenta
              </Button>
            </div>

            <div className="email-account-grid">
              {accounts.map((acc) => (
                <Card key={acc.id} className="email-account-card">
                  <div className="email-account-card__head">
                    <div className="email-account-card__identity">
                      <span
                        className={`email-account-card__icon${acc.es_default ? ' is-default' : ''}`}
                      >
                        <Icon name="server" size={20} />
                      </span>
                      <div className="email-account-card__body">
                        <div className="email-account-card__title-row">
                          <h4 className="email-account-card__name">{acc.nombre}</h4>
                          {acc.es_default ? <Badge variant="accent">Principal</Badge> : null}
                        </div>
                        <p className="email-account-card__user">{acc.smtp_user}</p>
                        {acc.smtp_host ? (
                          <p className="email-account-card__meta">
                            {acc.smtp_host}
                            {acc.smtp_port ? `:${acc.smtp_port}` : ''}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="email-account-card__actions">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testConnection(acc.id)}
                      loading={isTestingConn === acc.id}
                      disabled={isTestingConn === acc.id}
                    >
                      <Icon name="refresh" size={12} /> Probar
                    </Button>
                    <IconButton aria-label="Configurar cuenta" onClick={() => handleOpenAccountModal(acc)}>
                      <Icon name="edit" size={16} />
                    </IconButton>
                    {!acc.es_default ? (
                      <IconButton
                        aria-label="Eliminar cuenta"
                        onClick={() => setDeleteTarget(acc)}
                      >
                        <Icon name="trash" size={16} />
                      </IconButton>
                    ) : null}
                  </div>
                </Card>
              ))}
              {accounts.length === 0 ? (
                <EmptyState
                  title="Sin cuentas SMTP"
                  description="Agregue una cuenta de salida para enviar correos."
                  action={
                    <Button variant="primary" size="sm" onClick={() => handleOpenAccountModal()}>
                      Nueva cuenta
                    </Button>
                  }
                />
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <Modal
        open={isAccountModalOpen}
        onClose={closeAccountModal}
        size="lg"
        title="Configuración SMTP"
        subheader={editingAccount ? 'Editar cuenta de salida' : 'Nueva cuenta de salida'}
        {...overlay.modalProps}
        onOverlayDismiss={handleAccountOverlayDismiss}
        footer={
          <>
            <Button
              variant="ghost"
              type="button"
              onClick={closeAccountModal}
              disabled={overlay.busy}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="smtp-account-form"
              loading={overlay.busy}
              disabled={overlay.busy || overlay.active}
            >
              Guardar configuración
            </Button>
          </>
        }
      >
        <form id="smtp-account-form" className="crud-form" onSubmit={handleSaveAccount}>
          <div className="form-grid">
            <Field label="Nombre descriptivo" required htmlFor="smtp-nombre" className="field--full">
              <Input
                id="smtp-nombre"
                required
                value={accountFormData.nombre}
                onChange={(e) => setAccountFormData({ ...accountFormData, nombre: e.target.value })}
              />
            </Field>
            <Field label="Host SMTP" required htmlFor="smtp-host">
              <Input
                id="smtp-host"
                required
                value={accountFormData.smtp_host}
                onChange={(e) => setAccountFormData({ ...accountFormData, smtp_host: e.target.value })}
              />
            </Field>
            <Field label="Puerto" required htmlFor="smtp-port">
              <Input
                id="smtp-port"
                required
                type="number"
                value={accountFormData.smtp_port}
                onChange={(e) => setAccountFormData({ ...accountFormData, smtp_port: e.target.value })}
              />
            </Field>
            <Field label="Usuario / email acceso" required htmlFor="smtp-user">
              <Input
                id="smtp-user"
                required
                value={accountFormData.smtp_user}
                onChange={(e) => {
                  const val = e.target.value
                  setAccountFormData({
                    ...accountFormData,
                    smtp_user: val,
                    remitente_email: accountFormData.remitente_email || val,
                  })
                }}
              />
            </Field>
            <Field label="Password" htmlFor="smtp-password">
              <div className="email-smtp-password">
                <Input
                  id="smtp-password"
                  type={showPassword ? 'text' : 'password'}
                  value={accountFormData.smtp_password}
                  onChange={(e) =>
                    setAccountFormData({ ...accountFormData, smtp_password: e.target.value })
                  }
                  placeholder={editingAccount ? 'Dejar vacío para no cambiar' : ''}
                />
                <IconButton
                  type="button"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <Icon name="eye" size={16} />
                </IconButton>
              </div>
            </Field>
            <Field label="Nombre remitente" required htmlFor="smtp-rem-nombre">
              <Input
                id="smtp-rem-nombre"
                required
                value={accountFormData.remitente_nombre}
                onChange={(e) =>
                  setAccountFormData({ ...accountFormData, remitente_nombre: e.target.value })
                }
              />
            </Field>
            <Field label="Email remitente" required htmlFor="smtp-rem-email">
              <Input
                id="smtp-rem-email"
                required
                type="email"
                value={accountFormData.remitente_email}
                onChange={(e) =>
                  setAccountFormData({ ...accountFormData, remitente_email: e.target.value })
                }
              />
            </Field>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        onConfirm={handleConfirmDeleteAccount}
        title="Eliminar cuenta SMTP"
        description={
          deleteTarget
            ? `¿Eliminar «${deleteTarget.nombre}»? Esta acción no se puede deshacer.`
            : '¿Eliminar esta cuenta?'
        }
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        cancelLabel="Cancelar"
        danger
      />
    </div>
  )
}

export default EmailSettings
