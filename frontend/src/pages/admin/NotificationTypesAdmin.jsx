import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api'
import { useNotify } from '../../hooks/useNotify'
import {
  PageHeader,
  DataTable,
  Modal,
  ConfirmModal,
  Field,
  Input,
  Select,
  Textarea,
  Switch,
  Button,
  Badge,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const emptyForm = () => ({
  codigo: '',
  modulo: '',
  evento: '',
  nombre: '',
  descripcion: '',
  activo: true,
  enviar_campana: true,
  enviar_email: false,
  cuenta_smtp: '',
  plantilla: '',
  grupos: [],
  roles: [],
  usuarios: [],
  emails_adicionales: '',
})

function toggleId(list, id) {
  const current = list || []
  return current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
}

function PickTable({
  title,
  selectedIds,
  rows,
  filter,
  onFilterChange,
  filterPlaceholder,
  columns,
  getId,
  onToggle,
  emptyLabel,
}) {
  const selectedCount = selectedIds?.length || 0
  const filtered = useMemo(() => {
    const q = (filter || '').trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => {
      const hay = columns.map((c) => String(c.getText?.(row) ?? '')).join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [rows, filter, columns])

  return (
    <div className="pick-table">
      <div className="pick-table__head">
        <h4 className="pick-table__title">{title}</h4>
        <span className="pick-table__meta">
          {selectedCount} sel. · {filtered.length}
          {filtered.length !== rows.length ? `/${rows.length}` : ''}
        </span>
      </div>
      <div className="pick-table__filter">
        <Input
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder={filterPlaceholder || 'Buscar…'}
          aria-label={`Filtrar ${title}`}
        />
      </div>
      <div className="pick-table__scroll">
        {filtered.length === 0 ? (
          <p className="pick-table__empty">{emptyLabel || 'Sin resultados'}</p>
        ) : (
          <table className="pick-table__table">
            <thead>
              <tr>
                <th className="pick-table__check" scope="col">
                  <span className="sr-only">Seleccionar</span>
                </th>
                {columns.map((col) => (
                  <th key={col.key} scope="col">
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const id = getId(row)
                const checked = selectedIds.includes(id)
                return (
                  <tr
                    key={id}
                    className={checked ? 'is-selected' : undefined}
                    onClick={() => onToggle(id)}
                  >
                    <td className="pick-table__check" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggle(id)}
                        aria-label={`Seleccionar ${columns[0]?.getText?.(row) || id}`}
                      />
                    </td>
                    {columns.map((col) => (
                      <td key={col.key}>
                        <span className="pick-table__label">
                          {col.render ? col.render(row) : col.getText?.(row)}
                        </span>
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default function NotificationTypesAdmin({ embedded = false }) {
  const overlay = useFormOverlay()
  const { notify } = useNotify()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState([])
  const [templates, setTemplates] = useState([])
  const [groups, setGroups] = useState([])
  const [roles, setRoles] = useState([])
  const [users, setUsers] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [filterGrupos, setFilterGrupos] = useState('')
  const [filterRoles, setFilterRoles] = useState('')
  const [filterUsuarios, setFilterUsuarios] = useState('')
  const [formTab, setFormTab] = useState('general')
  const [destTab, setDestTab] = useState('grupos')

  const FORM_TABS = [
    { id: 'general', label: 'General' },
    { id: 'canales', label: 'Canales' },
    { id: 'destinatarios', label: 'Destinatarios' },
  ]

  const load = async () => {
    setLoading(true)
    try {
      const [tiposRes, smtpRes, plantillasRes, gruposRes, rolesRes, usersRes] = await Promise.all([
        api.get('notificaciones/tipos/'),
        api.get('comunicaciones/cuentas-smtp/'),
        api.get('comunicaciones/plantillas/'),
        api.get('grupos/', { params: { page_size: 1000 } }),
        api.get('admin/roles/'),
        api.get('admin/users/'),
      ])
      setRows(tiposRes.data.results || tiposRes.data || [])
      setAccounts(smtpRes.data.results || smtpRes.data || [])
      setTemplates(plantillasRes.data.results || plantillasRes.data || [])
      setGroups(gruposRes.data.results || gruposRes.data || [])
      setRoles(rolesRes.data.results || rolesRes.data || [])
      setUsers(usersRes.data.results || usersRes.data || [])
    } catch (err) {
      notify({ variant: 'danger', text: formatApiFormError(err) || 'No se pudo cargar' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const resetFilters = () => {
    setFilterGrupos('')
    setFilterRoles('')
    setFilterUsuarios('')
  }

  const resetFormTabs = () => {
    setFormTab('general')
    setDestTab('grupos')
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    resetFilters()
    resetFormTabs()
    overlay.reset()
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    setForm({
      codigo: row.codigo || '',
      modulo: row.modulo || '',
      evento: row.evento || '',
      nombre: row.nombre || '',
      descripcion: row.descripcion || '',
      activo: !!row.activo,
      enviar_campana: !!row.enviar_campana,
      enviar_email: !!row.enviar_email,
      cuenta_smtp: row.cuenta_smtp ? String(row.cuenta_smtp) : '',
      plantilla: row.plantilla ? String(row.plantilla) : '',
      grupos: row.grupos || [],
      roles: row.roles || [],
      usuarios: row.usuarios || [],
      emails_adicionales: row.emails_adicionales || '',
    })
    resetFilters()
    resetFormTabs()
    overlay.reset()
    setModalOpen(true)
  }

  const closeModal = () => {
    if (overlay.busy) return
    overlay.reset()
    setModalOpen(false)
    setEditing(null)
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      setModalOpen(false)
      setEditing(null)
      load()
      return
    }
    overlay.dismiss()
  }

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const suggestPlantillaId = (modulo, evento, tplList) => {
    const mod = String(modulo || '').toUpperCase()
    const ev = String(evento || '').toUpperCase()
    let proposito = null
    if (mod === 'DOC_SERVICIOS') {
      if (ev.endsWith('_AVISO')) proposito = 'DOC_SERVICIOS_AVISO'
      else if (ev.endsWith('_NUEVO')) proposito = 'DOC_SERVICIOS_NUEVO'
    } else if (mod === 'VEHICULOS' && ev === 'VENCIMIENTO_DOC') {
      proposito = 'ALERTA_VENCIMIENTO_VEHICULO'
    } else if (mod === 'RESERVAS' && ev === 'AVISO_ADMIN') {
      proposito = 'RESERVA_AVISO_ADMIN'
    }
    if (!proposito) return ''
    const hit = (tplList || templates).find((t) => t.proposito === proposito)
    return hit ? String(hit.id) : ''
  }

  const handleSave = async () => {
    if (!form.codigo.trim() || !form.modulo.trim() || !form.evento.trim() || !form.nombre.trim()) {
      notify({ variant: 'warning', text: 'Código, módulo, evento y nombre son obligatorios.' })
      return
    }
    let plantillaId = form.plantilla
    if (form.enviar_email && !plantillaId) {
      plantillaId = suggestPlantillaId(form.modulo, form.evento)
    }

    const payload = {
      codigo: form.codigo.trim().toUpperCase(),
      modulo: form.modulo.trim().toUpperCase(),
      evento: form.evento.trim().toUpperCase(),
      nombre: form.nombre.trim(),
      descripcion: form.descripcion || '',
      activo: form.activo,
      enviar_campana: form.enviar_campana,
      enviar_email: form.enviar_email,
      cuenta_smtp: form.cuenta_smtp ? Number(form.cuenta_smtp) : null,
      plantilla: plantillaId ? Number(plantillaId) : null,
      grupos: form.grupos,
      roles: form.roles,
      usuarios: form.usuarios,
      emails_adicionales: form.emails_adicionales || '',
    }

    const wasEdit = Boolean(editing)
    try {
      await overlay.run(
        async () => {
          if (editing) {
            await api.patch(`notificaciones/tipos/${editing.id}/`, payload)
          } else {
            await api.post('notificaciones/tipos/', payload)
          }
        },
        {
          successDescription: wasEdit ? 'Tipo actualizado.' : 'Tipo creado.',
          formatError: (err) => formatApiFormError(err, 'No se pudo guardar el tipo.'),
        },
      )
    } catch {
      // FormOverlay muestra el error
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`notificaciones/tipos/${deleteTarget.id}/`)
      notify({ variant: 'success', text: 'Tipo eliminado' })
      setDeleteTarget(null)
      await load()
    } catch (err) {
      notify({ variant: 'danger', text: formatApiFormError(err) || 'No se pudo eliminar' })
    }
  }

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es')),
    [groups],
  )
  const sortedRoles = useMemo(
    () => [...roles].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'es')),
    [roles],
  )
  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) =>
        String(a.username || '').localeCompare(String(b.username || ''), 'es'),
      ),
    [users],
  )

  const columns = useMemo(
    () => [
      {
        key: 'nombre',
        header: 'Nombre',
        className: 'col--primary',
        cardRole: 'title',
        render: (row) => <strong>{row.nombre}</strong>,
      },
      {
        key: 'codigo',
        header: 'Código',
        className: 'col--secondary',
        cardRole: 'subtitle',
        render: (row) => row.codigo,
      },
      {
        key: 'canales',
        header: 'Canales',
        render: (row) => (
          <>
            {row.enviar_campana ? <Badge variant="accent">Campana</Badge> : null}{' '}
            {row.enviar_email ? <Badge variant="success">Email</Badge> : null}
            {!row.enviar_campana && !row.enviar_email ? <Badge variant="neutral">Ninguno</Badge> : null}
          </>
        ),
      },
      {
        key: 'smtp',
        header: 'SMTP',
        render: (row) => row.cuenta_smtp_nombre || '—',
      },
      {
        key: 'activo',
        header: 'Estado',
        className: 'col--status',
        cardRole: 'status',
        render: (row) => (
          <Badge variant={row.activo ? 'success' : 'neutral'} dot>
            {row.activo ? 'Activo' : 'Inactivo'}
          </Badge>
        ),
      },
      {
        key: 'acciones',
        header: 'Acciones',
        className: 'col--actions',
        render: (row) => (
          <>
            <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>
              Editar
            </Button>{' '}
            <Button size="sm" variant="danger" onClick={() => setDeleteTarget(row)}>
              Eliminar
            </Button>
          </>
        ),
      },
    ],
    [],
  )

  const table = (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        fillViewport={!embedded}
        emptyTitle="Sin tipos"
        emptyDescription="Crea el primer tipo o espera las semillas de tickets/vehículos/reservas."
        emptyAction={
          <Button variant="primary" onClick={openCreate}>
            Nuevo tipo
          </Button>
        }
        toolbar={
          <>
            <div className="table-toolbar__left">
              <span className="table-toolbar__title">Tipos de evento</span>
              <Badge variant="neutral">{rows.length}</Badge>
            </div>
            <div className="table-toolbar__right">
              <Button variant="primary" size="sm" onClick={openCreate}>
                Nuevo tipo
              </Button>
            </div>
          </>
        }
      />
    </>
  )

  const modals = (
    <>
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar tipo' : 'Nuevo tipo'}
        size="xl"
        {...overlay.modalProps}
        onOverlayDismiss={handleOverlayDismiss}
        footer={
          <>
            <Button variant="secondary" disabled={overlay.busy || overlay.active} onClick={closeModal}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              loading={overlay.busy}
              disabled={overlay.busy || overlay.active}
              onClick={handleSave}
            >
              Guardar
            </Button>
          </>
        }
      >
        <div className="notif-type-form">
          <div className="tabs notif-type-form__tabs">
            <ul className="tabs__list" role="tablist" aria-label="Secciones del tipo">
              {FORM_TABS.map((tab) => (
                <li key={tab.id}>
                  <button
                    type="button"
                    role="tab"
                    id={`tn-tab-${tab.id}`}
                    aria-selected={formTab === tab.id}
                    aria-controls={`tn-panel-${tab.id}`}
                    className={`tabs__btn${formTab === tab.id ? ' is-active' : ''}`}
                    onClick={() => setFormTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div
            id={`tn-panel-${formTab}`}
            role="tabpanel"
            aria-labelledby={`tn-tab-${formTab}`}
            className="tabs__panel is-active notif-type-form__panel"
          >
            {formTab === 'general' ? (
              <section className="notif-type-form__section">
                <div className="form-grid">
                  <Field
                    label="Nombre"
                    htmlFor="tn-nombre"
                    required
                    hint="Texto visible en el listado."
                  >
                    <Input
                      id="tn-nombre"
                      value={form.nombre}
                      onChange={(e) => setField('nombre', e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Código"
                    htmlFor="tn-codigo"
                    required
                    hint={
                      editing
                        ? 'Identificador técnico. No se cambia al editar.'
                        : 'Identificador técnico único (ej. RESERVAS.AVISO_ADMIN).'
                    }
                  >
                    <Input
                      id="tn-codigo"
                      value={form.codigo}
                      onChange={(e) => setField('codigo', e.target.value)}
                      placeholder="RESERVAS.AVISO_ADMIN"
                      disabled={!!editing}
                    />
                  </Field>
                  <Field
                    label="Módulo"
                    htmlFor="tn-modulo"
                    required
                    hint={editing ? 'Fijo: lo usa el código del sistema.' : undefined}
                  >
                    <Input
                      id="tn-modulo"
                      value={form.modulo}
                      onChange={(e) => setField('modulo', e.target.value)}
                      placeholder="RESERVAS"
                      disabled={!!editing}
                    />
                  </Field>
                  <Field
                    label="Evento"
                    htmlFor="tn-evento"
                    required
                    hint={editing ? 'Fijo: lo usa el código del sistema.' : undefined}
                  >
                    <Input
                      id="tn-evento"
                      value={form.evento}
                      onChange={(e) => setField('evento', e.target.value)}
                      placeholder="AVISO_ADMIN"
                      disabled={!!editing}
                    />
                  </Field>
                  <Field label="Descripción" htmlFor="tn-desc" className="field--full">
                    <Textarea
                      id="tn-desc"
                      rows={3}
                      value={form.descripcion}
                      onChange={(e) => setField('descripcion', e.target.value)}
                    />
                  </Field>
                </div>
                <div className="notif-type-form__switches">
                  <Switch
                    checked={form.activo}
                    onChange={(e) => setField('activo', e.target.checked)}
                    label="Activo"
                  />
                </div>
              </section>
            ) : null}

            {formTab === 'canales' ? (
              <section className="notif-type-form__section">
                <div className="notif-type-form__switches">
                  <Switch
                    checked={form.enviar_campana}
                    onChange={(e) => setField('enviar_campana', e.target.checked)}
                    label="Campana"
                  />
                  <Switch
                    checked={form.enviar_email}
                    onChange={(e) => {
                      const on = e.target.checked
                      setForm((prev) => {
                        const next = { ...prev, enviar_email: on }
                        if (on && !prev.plantilla) {
                          next.plantilla = suggestPlantillaId(prev.modulo, prev.evento)
                        }
                        return next
                      })
                    }}
                    label="Correo electrónico"
                  />
                </div>
                {form.enviar_email ? (
                  <div className="form-grid">
                    <Field
                      label="Plantilla"
                      htmlFor="tn-plantilla"
                      hint="Compartida por familia (ej. DOC_SERVICIOS_AVISO). Maquetar en la pestaña Editor."
                    >
                      <Select
                        id="tn-plantilla"
                        value={form.plantilla}
                        onChange={(e) => setField('plantilla', e.target.value)}
                      >
                        <option value="">— Automática / default —</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.proposito} — {t.nombre}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Cuenta SMTP" htmlFor="tn-smtp">
                      <Select
                        id="tn-smtp"
                        value={form.cuenta_smtp}
                        onChange={(e) => setField('cuenta_smtp', e.target.value)}
                      >
                        <option value="">— Plantilla / default —</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nombre}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field
                      label="Emails adicionales"
                      htmlFor="tn-emails"
                      className="field--full"
                      hint="Solo canal correo. Separados por coma o salto de línea."
                    >
                      <Textarea
                        id="tn-emails"
                        rows={3}
                        value={form.emails_adicionales}
                        onChange={(e) => setField('emails_adicionales', e.target.value)}
                      />
                    </Field>
                  </div>
                ) : (
                  <p className="field__hint">
                    Activa correo para elegir plantilla, SMTP y emails adicionales.
                  </p>
                )}
              </section>
            ) : null}

            {formTab === 'destinatarios' ? (
              <section className="notif-type-form__section">
                <p className="field__hint">
                  Mismos destinatarios para campana y correo. Busca y marca en la lista.
                </p>
                <div className="tabs notif-type-form__subtabs">
                  <ul className="tabs__list" role="tablist" aria-label="Tipo de destinatario">
                    {[
                      { id: 'grupos', label: 'Grupos', count: form.grupos.length },
                      { id: 'roles', label: 'Roles', count: form.roles.length },
                      { id: 'usuarios', label: 'Usuarios', count: form.usuarios.length },
                    ].map((tab) => (
                      <li key={tab.id}>
                        <button
                          type="button"
                          role="tab"
                          id={`tn-dest-${tab.id}`}
                          aria-selected={destTab === tab.id}
                          aria-controls={`tn-dest-panel-${tab.id}`}
                          className={`tabs__btn${destTab === tab.id ? ' is-active' : ''}`}
                          onClick={() => setDestTab(tab.id)}
                        >
                          {tab.label}
                          <span className="notif-type-form__tab-count">{tab.count}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div
                  id={`tn-dest-panel-${destTab}`}
                  role="tabpanel"
                  aria-labelledby={`tn-dest-${destTab}`}
                  className="tabs__panel is-active notif-type-form__dest-panel"
                >
                  {destTab === 'grupos' ? (
                    <PickTable
                      title="Grupos"
                      selectedIds={form.grupos}
                      rows={sortedGroups}
                      filter={filterGrupos}
                      onFilterChange={setFilterGrupos}
                      filterPlaceholder="Buscar grupo…"
                      getId={(g) => g.id}
                      onToggle={(id) => setField('grupos', toggleId(form.grupos, id))}
                      emptyLabel={groups.length ? 'Sin coincidencias' : 'No hay grupos'}
                      columns={[
                        {
                          key: 'nombre',
                          header: 'Nombre',
                          getText: (g) => g.nombre || '',
                          render: (g) => <strong>{g.nombre}</strong>,
                        },
                      ]}
                    />
                  ) : null}
                  {destTab === 'roles' ? (
                    <PickTable
                      title="Roles"
                      selectedIds={form.roles}
                      rows={sortedRoles}
                      filter={filterRoles}
                      onFilterChange={setFilterRoles}
                      filterPlaceholder="Buscar rol…"
                      getId={(r) => r.id}
                      onToggle={(id) => setField('roles', toggleId(form.roles, id))}
                      emptyLabel={roles.length ? 'Sin coincidencias' : 'No hay roles'}
                      columns={[
                        {
                          key: 'name',
                          header: 'Nombre',
                          getText: (r) => r.name || '',
                          render: (r) => <strong>{r.name}</strong>,
                        },
                      ]}
                    />
                  ) : null}
                  {destTab === 'usuarios' ? (
                    <PickTable
                      title="Usuarios"
                      selectedIds={form.usuarios}
                      rows={sortedUsers}
                      filter={filterUsuarios}
                      onFilterChange={setFilterUsuarios}
                      filterPlaceholder="Buscar usuario o email…"
                      getId={(u) => u.id}
                      onToggle={(id) => setField('usuarios', toggleId(form.usuarios, id))}
                      emptyLabel={users.length ? 'Sin coincidencias' : 'No hay usuarios'}
                      columns={[
                        {
                          key: 'user',
                          header: 'Usuario',
                          getText: (u) => `${u.username || ''} ${u.email || ''}`,
                          render: (u) => (
                            <>
                              <strong>{u.username}</strong>
                              {u.email ? <span className="pick-table__sub">{u.email}</span> : null}
                            </>
                          ),
                        },
                      ]}
                    />
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar tipo"
        description={
          deleteTarget
            ? `¿Eliminar ${deleteTarget.codigo}? Los productores que lo usen dejarán de notificar.`
            : ''
        }
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        danger
      />
    </>
  )

  if (embedded) {
    return (
      <div data-od-id="notification-types-panel">
        {table}
        {modals}
      </div>
    )
  }

  return (
    <div className="page" data-od-id="notification-types-page" data-fill-viewport>
      <PageHeader
        icon="bell"
        title="Tipos de notificación"
        description="Canales (campana/email), SMTP y destinatarios por evento."
        breadcrumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Administración' },
          { label: 'Notificaciones', to: '/admin/notificaciones' },
          { label: 'Tipos' },
        ]}
        linkComponent={Link}
        split
        actions={
          <Button variant="primary" onClick={openCreate}>
            Nuevo tipo
          </Button>
        }
      />
      {table}
      {modals}
    </div>
  )
}
