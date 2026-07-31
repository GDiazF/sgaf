import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api'
import { useNotify } from '../../hooks/useNotify'
import {
  PageHeader,
  Card,
  CardHeader,
  Modal,
  ConfirmModal,
  Field,
  Input,
  Select,
  Switch,
  Textarea,
  Button,
  Icon,
  IconButton,
  Badge,
  EmptyState,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const DEFAULT_OPERATIONAL_PURPOSE = 'ALERTA_VENCIMIENTO_VEHICULO'
const EXCLUDED_OPERATIONAL_PURPOSES = new Set([
  'MFA',
  'RESET_PASSWORD',
  'RESERVA_SOLICITUD',
  'RESERVA_APROBACION',
  'RESERVA_RECORDATORIO',
  'TEST',
])

const EMAIL_TABS = [
  { id: 'accounts', label: 'Cuentas' },
  { id: 'templates', label: 'Editor' },
  { id: 'recipients', label: 'Destinatarios' },
]

const createEmptyRecipientConfig = (proposito = DEFAULT_OPERATIONAL_PURPOSE) => ({
  proposito,
  grupos: [],
  usuarios: [],
  emails_adicionales: '',
  activo: true,
})

const EmailSettings = () => {
  const overlay = useFormOverlay()
  const { notify } = useNotify()
  const [activeTab, setActiveTab] = useState('accounts')
  const [accounts, setAccounts] = useState([])
  const [templates, setTemplates] = useState([])
  const [operationalRecipients, setOperationalRecipients] = useState([])
  const [selectedRecipientPurpose, setSelectedRecipientPurpose] = useState(DEFAULT_OPERATIONAL_PURPOSE)
  const [groups, setGroups] = useState([])
  const [users, setUsers] = useState([])
  const [recipientForm, setRecipientForm] = useState(createEmptyRecipientConfig())
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

      const [recipientsResult, groupsResult, usersResult] = await Promise.allSettled([
        api.get('comunicaciones/destinatarios-operativos/'),
        api.get('grupos/', { params: { page_size: 1000 } }),
        api.get('admin/users/'),
      ])

      let recipientsData = []
      if (recipientsResult.status === 'fulfilled') {
        recipientsData = recipientsResult.value.data.results || recipientsResult.value.data
        setOperationalRecipients(recipientsData)
      } else {
        console.error('No se pudieron cargar destinatarios operativos:', recipientsResult.reason)
        setOperationalRecipients([])
      }

      if (groupsResult.status === 'fulfilled') {
        setGroups(groupsResult.value.data.results || groupsResult.value.data)
      } else {
        console.error('No se pudieron cargar grupos de funcionarios:', groupsResult.reason)
        setGroups([])
      }

      if (usersResult.status === 'fulfilled') {
        setUsers(
          (usersResult.value.data.results || usersResult.value.data).filter(
            (user) => user.is_active && user.email,
          ),
        )
      } else {
        console.error('No se pudieron cargar usuarios:', usersResult.reason)
        setUsers([])
      }

      const firstOperationalPurpose =
        templatesData.find((item) => !EXCLUDED_OPERATIONAL_PURPOSES.has(item.proposito))?.proposito ||
        DEFAULT_OPERATIONAL_PURPOSE
      const nextPurpose =
        recipientsData.find((item) => item.proposito === selectedRecipientPurpose)?.proposito ||
        firstOperationalPurpose
      const nextRecipientConfig =
        recipientsData.find((item) => item.proposito === nextPurpose) ||
        createEmptyRecipientConfig(nextPurpose)
      setSelectedRecipientPurpose(nextPurpose)
      setRecipientForm(nextRecipientConfig)
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
    return common
  }

  const getOperationalTemplates = () =>
    templates.filter((item) => !EXCLUDED_OPERATIONAL_PURPOSES.has(item.proposito))

  const getPurposeLabel = (purpose) => {
    const template = templates.find((item) => item.proposito === purpose)
    return template?.proposito_display || template?.nombre || purpose
  }

  const handleRecipientPurposeChange = (purpose) => {
    setSelectedRecipientPurpose(purpose)
    const existingConfig = operationalRecipients.find((item) => item.proposito === purpose)
    setRecipientForm(existingConfig || createEmptyRecipientConfig(purpose))
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

  const toggleRecipientSelection = (field, id) => {
    const current = recipientForm[field] || []
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    setRecipientForm({ ...recipientForm, [field]: next })
  }

  const handleSaveOperationalRecipients = async () => {
    setSaving(true)
    try {
      const hasRecipients = Boolean(
        (recipientForm.grupos || []).length ||
          (recipientForm.usuarios || []).length ||
          (recipientForm.emails_adicionales || '').trim(),
      )

      if (recipientForm.activo && !hasRecipients) {
        notify({ variant: 'danger', text: 'Selecciona al menos un grupo, usuario o email adicional.' })
        setSaving(false)
        return
      }

      const payload = {
        ...recipientForm,
        proposito: selectedRecipientPurpose,
      }
      let response
      if (recipientForm.id) {
        response = await api.patch(
          `comunicaciones/destinatarios-operativos/${recipientForm.id}/`,
          payload,
        )
      } else {
        response = await api.post('comunicaciones/destinatarios-operativos/', payload)
      }
      const saved = response.data
      setRecipientForm(saved)
      setOperationalRecipients((prev) => {
        const exists = prev.some((item) => item.id === saved.id)
        return exists
          ? prev.map((item) => (item.id === saved.id ? saved : item))
          : [...prev, saved]
      })
      notify({ variant: 'success', text: 'Destinatarios actualizados.' })
    } catch (error) {
      console.error('Error al guardar destinatarios:', error)
      notify({
        variant: 'danger',
        text: formatApiFormError(error, 'Error al guardar destinatarios.'),
      })
    } finally {
      setSaving(false)
    }
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

  if (loading) {
    return (
      <div className="page" data-od-id="email-settings-page" data-fill-viewport>
        <PageHeader
          icon="message"
          title="Comunicaciones y Notificaciones"
          description="Cuentas SMTP, plantillas y destinatarios operativos"
          breadcrumbs={[
            { label: 'Inicio', to: '/' },
            { label: 'Administración' },
            { label: 'Email' },
          ]}
          linkComponent={Link}
        />
        <EmptyState title="Cargando configuración" description="Obteniendo datos del servidor…" />
      </div>
    )
  }

  return (
    <div className="page" data-od-id="email-settings-page" data-fill-viewport>
      <PageHeader
        icon="message"
        title="Comunicaciones y Notificaciones"
        description="Cuentas SMTP, plantillas y destinatarios operativos"
        breadcrumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Administración' },
          { label: 'Email' },
        ]}
        linkComponent={Link}
      />

      <div className="tabs">
        <ul className="tabs__list" role="tablist" aria-label="Secciones de email">
          {EMAIL_TABS.map((tab) => (
            <li key={tab.id}>
              <button
                type="button"
                role="tab"
                id={`email-tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls={`email-panel-${tab.id}`}
                className={`tabs__btn${activeTab === tab.id ? ' is-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div
        id={`email-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`email-tab-${activeTab}`}
        className="tabs__panel is-active email-settings-tab-panel"
      >
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
        ) : activeTab === 'recipients' ? (
          <div className="email-recipients-layout">
            <div className="email-recipients-head">
              <div>
                <h3 className="email-section-title">Destinatarios operativos</h3>
                <p className="email-section-desc">
                  Define quién recibe correos por propósito usando grupos de funcionarios, usuarios
                  puntuales o correos externos.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveOperationalRecipients}
                loading={saving}
                disabled={saving}
              >
                <Icon name="check" size="sm" /> Guardar configuración
              </Button>
            </div>

            <div className="email-recipients-grid">
              <Card className="email-recipients-sidebar">
                <CardHeader title="Propósitos" />
                <div className="email-sidebar-list">
                  {getOperationalTemplates().map((template) => (
                    <button
                      key={template.proposito}
                      type="button"
                      className={`email-sidebar-list__btn${selectedRecipientPurpose === template.proposito ? ' is-active' : ''}`}
                      onClick={() => handleRecipientPurposeChange(template.proposito)}
                    >
                      <span className="email-sidebar-list__primary">
                        {template.proposito_display || template.nombre}
                      </span>
                      <span className="email-sidebar-list__secondary">{template.proposito}</span>
                    </button>
                  ))}
                  {getOperationalTemplates().length === 0 ? (
                    <EmptyState
                      title="Sin plantillas operativas"
                      description="No hay plantillas disponibles para configurar destinatarios."
                    />
                  ) : null}
                </div>
              </Card>

              <div className="email-recipients-main">
                <Card className="email-recipients-summary">
                  <div className="email-recipients-summary__info">
                    <p className="email-recipients-summary__label">Propósito seleccionado</p>
                    <h3 className="email-recipients-summary__title">
                      {getPurposeLabel(selectedRecipientPurpose)}
                    </h3>
                    <p className="email-recipients-summary__code">{selectedRecipientPurpose}</p>
                  </div>
                  <Switch
                    checked={recipientForm.activo}
                    onChange={(e) =>
                      setRecipientForm({ ...recipientForm, activo: e.target.checked })
                    }
                    label="Activo"
                  />
                </Card>

                <div className="email-recipients-panels">
                  <Card className="email-recipients-panel">
                    <CardHeader
                      title="Grupos de funcionarios"
                      subtitle="Tomados desde Funcionarios › Grupos."
                    />
                    <ul className="func-grupos email-recipients-checklist">
                      {groups.map((group) => {
                        const checked = (recipientForm.grupos || []).includes(group.id)
                        return (
                          <li key={group.id}>
                            <label
                              className={`func-grupos__item${checked ? ' is-selected' : ''}`}
                              htmlFor={`recipient-group-${group.id}`}
                            >
                              <input
                                id={`recipient-group-${group.id}`}
                                type="checkbox"
                                className="no-global"
                                checked={checked}
                                onChange={() => toggleRecipientSelection('grupos', group.id)}
                              />
                              <span>
                                <strong>{group.nombre}</strong>
                                <small>{group.total_miembros || 0} miembros</small>
                              </span>
                            </label>
                          </li>
                        )
                      })}
                      {groups.length === 0 ? (
                        <li className="email-recipients-empty">No hay grupos disponibles.</li>
                      ) : null}
                    </ul>
                  </Card>

                  <Card className="email-recipients-panel">
                    <CardHeader
                      title="Usuarios específicos"
                      subtitle="Opcional para casos fuera del grupo."
                    />
                    <ul className="func-grupos email-recipients-checklist">
                      {users.map((user) => {
                        const checked = (recipientForm.usuarios || []).includes(user.id)
                        return (
                          <li key={user.id}>
                            <label
                              className={`func-grupos__item${checked ? ' is-selected' : ''}`}
                              htmlFor={`recipient-user-${user.id}`}
                            >
                              <input
                                id={`recipient-user-${user.id}`}
                                type="checkbox"
                                className="no-global"
                                checked={checked}
                                onChange={() => toggleRecipientSelection('usuarios', user.id)}
                              />
                              <span>
                                <strong>
                                  {user.first_name || user.username} {user.last_name || ''}
                                </strong>
                                <small>{user.email}</small>
                              </span>
                            </label>
                          </li>
                        )
                      })}
                      {users.length === 0 ? (
                        <li className="email-recipients-empty">No hay usuarios con email disponibles.</li>
                      ) : null}
                    </ul>
                  </Card>
                </div>

                <Card className="email-recipients-emails">
                  <Field
                    label="Emails adicionales"
                    htmlFor="recipient-emails"
                    hint="Separados por coma, punto y coma o salto de línea."
                  >
                    <Textarea
                      id="recipient-emails"
                      rows={3}
                      placeholder="flota@slepiquique.cl"
                      value={recipientForm.emails_adicionales || ''}
                      onChange={(e) =>
                        setRecipientForm({ ...recipientForm, emails_adicionales: e.target.value })
                      }
                    />
                  </Field>
                </Card>
              </div>
            </div>
          </div>
        ) : (
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
        )}
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
