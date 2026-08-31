import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api'
import { usePermission } from '../../hooks/usePermission'
import { useNotify } from '../../hooks/useNotify'
import { groupPermissions, getFriendlyPermName } from '../../utils/permissionUtils'
import { formatRut } from '../../utils/rutValidator'
import {
  PageHeader,
  FiltersBar,
  DataTable,
  Modal,
  ConfirmModal,
  Field,
  Input,
  Select,
  Button,
  IconButton,
  Icon,
  Badge,
  EmptyState,
  Switch,
  Card,
  CardHeader,
  FormSection,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const UserManagement = () => {
  const { can } = usePermission()
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [ordering, setOrdering] = useState('username')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [mfaResetTarget, setMfaResetTarget] = useState(null)
  const { notify } = useNotify()
  const overlay = useFormOverlay()
  const savedOkRef = useRef(false)

  const [expandedGroups, setExpandedGroups] = useState({})
  const [globalSecurity, setGlobalSecurity] = useState({ force_mfa_all: false })

  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const sync = () => setIsNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, ordering, pageSize])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [usersRes, rolesRes, permsRes, securityRes] = await Promise.all([
        api.get('admin/users/'),
        api.get('admin/roles/'),
        api.get('admin/permissions/'),
        api.get('admin/security/config/'),
      ])

      const nonSuperUsers = (
        Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.results || []
      ).filter((u) => !u.is_superuser)

      setUsers(nonSuperUsers)
      setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : rolesRes.data.results || [])
      setPermissions(Array.isArray(permsRes.data) ? permsRes.data : permsRes.data.results || [])
      setGlobalSecurity(securityRes.data)
    } catch (error) {
      console.error('Error fetching admin data:', error)
      notify({ variant: 'danger', text: 'No se pudieron cargar los usuarios.' })
    } finally {
      setLoading(false)
    }
  }

  const mfaActionLabels = {
    ENFORCE: 'MFA obligatorio para el usuario.',
    UNENFORCE: 'Obligatoriedad MFA removida.',
    RESET: 'MFA del usuario reiniciado.',
  }

  const toggleGlobalMFA = async () => {
    const newValue = !globalSecurity.force_mfa_all
    try {
      await api.post('admin/security/config/', { force_mfa_all: newValue })
      setGlobalSecurity({ force_mfa_all: newValue })
      notify({
        variant: 'success',
        text: newValue ? 'MFA global activado.' : 'MFA global desactivado.',
      })
    } catch {
      notify({
        variant: 'danger',
        text: 'Error al actualizar configuración global de seguridad',
      })
    }
  }

  const handleUserMFAAction = async (userId, action) => {
    try {
      await api.post('admin/security/mfa-users/', { user_id: userId, action })
      await fetchData()
      if (selectedUser?.id === userId) {
        const usersRes = await api.get('admin/users/')
        const updated = (
          Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.results || []
        ).find((u) => u.id === userId)
        if (updated) {
          setSelectedUser({
            ...updated,
            password: selectedUser.password,
            rut: updated.funcionario_data?.rut || selectedUser.rut || '',
          })
        }
      }
      notify({
        variant: 'success',
        text: mfaActionLabels[action] || 'Acción de seguridad aplicada.',
      })
    } catch {
      notify({ variant: 'danger', text: 'Error al realizar acción de seguridad' })
    }
  }

  const groupedPermissions = useMemo(() => groupPermissions(permissions), [permissions])

  const handleEdit = (user) => {
    savedOkRef.current = false
    overlay.reset()
    setSelectedUser({
      ...user,
      password: '',
      rut: user.funcionario_data?.rut || '',
    })
    setExpandedGroups({})
    setIsModalOpen(true)
  }

  const handleNew = () => {
    savedOkRef.current = false
    overlay.reset()
    setSelectedUser({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      is_active: true,
      password: '',
      rut: '',
      groups: [],
      user_permissions: [],
    })
    setExpandedGroups({})
    setIsModalOpen(true)
  }

  const closeModal = () => {
    if (overlay.busy) return
    overlay.reset()
    setIsModalOpen(false)
    setSelectedUser(null)
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      setIsModalOpen(false)
      setSelectedUser(null)
      if (savedOkRef.current) fetchData()
      savedOkRef.current = false
      return
    }
    overlay.dismiss()
  }

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    try {
      await overlay.run(
        async () => {
          const { funcionario_data: _fd, is_superuser: _su, ...cleanData } = selectedUser

          const payload = { ...cleanData }
          if (!payload.password) delete payload.password

          if (selectedUser.id) {
            await api.patch(`admin/users/${selectedUser.id}/`, payload)
          } else {
            await api.post('admin/users/', payload)
          }
          savedOkRef.current = true
        },
        {
          successDescription: selectedUser.id
            ? 'Usuario actualizado.'
            : 'Usuario creado.',
          formatError: (err) =>
            formatApiFormError(
              err,
              'Error al guardar usuario. Verifique los datos e intente nuevamente.',
            ),
        },
      )
    } catch {
      // FormOverlay
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`admin/users/${deleteTarget.id}/`)
      setDeleteTarget(null)
      await fetchData()
      notify({ variant: 'success', text: 'Usuario eliminado.' })
    } catch (error) {
      console.error('Error deleting user:', error)
      notify({ variant: 'danger', text: 'No se pudo eliminar el usuario.' })
    } finally {
      setDeleting(false)
    }
  }

  const confirmMfaReset = async () => {
    if (!mfaResetTarget) return
    await handleUserMFAAction(mfaResetTarget, 'RESET')
    setMfaResetTarget(null)
  }

  const toggleUserStatus = async (user) => {
    try {
      await api.patch(`admin/users/${user.id}/`, {
        is_active: !user.is_active,
      })
      await fetchData()
      notify({
        variant: 'success',
        text: user.is_active ? 'Usuario desactivado.' : 'Usuario activado.',
      })
    } catch (error) {
      console.error('Error toggling user status:', error)
      notify({ variant: 'danger', text: 'No se pudo cambiar el estado del usuario.' })
    }
  }

  const togglePermission = (permId) => {
    const newPerms = selectedUser.user_permissions.includes(permId)
      ? selectedUser.user_permissions.filter((p) => p !== permId)
      : [...selectedUser.user_permissions, permId]
    setSelectedUser({ ...selectedUser, user_permissions: newPerms })
  }

  const handleRutChange = (e) => {
    const formatted = formatRut(e.target.value)
    setSelectedUser({ ...selectedUser, rut: formatted })
  }

  const toggleSelectAll = (modulePerms) => {
    const permIds = modulePerms.map((p) => p.id)
    const allSelected = permIds.every((id) => selectedUser.user_permissions.includes(id))

    let newPerms
    if (allSelected) {
      newPerms = selectedUser.user_permissions.filter((id) => !permIds.includes(id))
    } else {
      newPerms = Array.from(new Set([...selectedUser.user_permissions, ...permIds]))
    }
    setSelectedUser({ ...selectedUser, user_permissions: newPerms })
  }

  const toggleAccordion = (module) => {
    setExpandedGroups((prev) => ({ ...prev, [module]: !prev[module] }))
  }

  const handleSort = (colKey) => {
    if (colKey !== 'username') return
    const next =
      ordering === 'username'
        ? '-username'
        : ordering === '-username'
          ? 'username'
          : 'username'
    setOrdering(next)
  }

  const activeSortKey =
    ordering === 'username' || ordering === '-username' ? 'username' : undefined

  const filteredUsers = useMemo(() => {
    let result = users.filter(
      (u) =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.funcionario_data?.nombre_funcionario || '')
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (u.funcionario_data?.rut || '').toLowerCase().includes(searchQuery.toLowerCase()),
    )

    if (ordering) {
      const isDesc = ordering.startsWith('-')
      const key = isDesc ? ordering.substring(1) : ordering
      result.sort((a, b) => {
        const valA = (a[key] || '').toString().toLowerCase()
        const valB = (b[key] || '').toString().toLowerCase()
        if (valA < valB) return isDesc ? 1 : -1
        if (valA > valB) return isDesc ? -1 : 1
        return 0
      })
    }
    return result
  }, [users, searchQuery, ordering])

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredUsers.slice(start, start + pageSize)
  }, [filteredUsers, currentPage, pageSize])

  const clearFilters = () => {
    setSearchQuery('')
    setCurrentPage(1)
  }

  const sortedPermissionModules = useMemo(
    () =>
      Object.entries(groupedPermissions).sort(([moduleA], [moduleB]) => {
        if (moduleA === 'Otros') return 1
        if (moduleB === 'Otros') return -1
        return moduleA.localeCompare(moduleB)
      }),
    [groupedPermissions],
  )

  const columns = useMemo(
    () => [
      {
        key: 'status',
        header: 'Estado',
        className: 'col--status',
        cardRole: 'status',
        priority: 1,
        render: (user) => (
          <button
            type="button"
            className="badge-toggle"
            onClick={() => toggleUserStatus(user)}
            title={user.is_active ? 'Desactivar cuenta' : 'Activar cuenta'}
          >
            <Badge variant={user.is_active ? 'success' : 'neutral'} dot>
              {user.is_active ? 'Activo' : 'Inactivo'}
            </Badge>
          </button>
        ),
      },
      {
        key: 'username',
        header: 'Usuario',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        sortable: true,
        render: (user) => (
          <div className="data-table__cell-stack">
            <strong>{user.username}</strong>
            <span>{user.email || 'Sin email'}</span>
          </div>
        ),
      },
      {
        key: 'funcionario',
        header: 'Funcionario / RUT',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 2,
        render: (user) =>
          user.funcionario_data ? (
            <div className="data-table__cell-stack">
              <strong>{user.funcionario_data.nombre_funcionario}</strong>
              <span className="mono">{user.funcionario_data.rut}</span>
            </div>
          ) : (
            <div className="data-table__cell-stack">
              <strong>
                {user.first_name || user.last_name
                  ? `${user.first_name} ${user.last_name}`.trim()
                  : 'Sin nombre'}
              </strong>
              <span>Sin vínculo funcionario</span>
            </div>
          ),
      },
      {
        key: 'groups',
        header: 'Roles',
        render: (user) =>
          user.groups.length > 0 ? (
            <div className="users-table__roles">
              {user.groups.map((g) => (
                <Badge key={g} variant="accent">
                  {g}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="field__hint">Sin roles</span>
          ),
      },
      {
        key: 'mfa',
        header: 'MFA',
        className: 'users-table__col-mfa',
        render: (user) => (
          <div
            className="users-table__mfa"
            onClick={(e) => e.stopPropagation()}
          >
            <Badge
              variant={user.mfa_enabled ? 'success' : 'neutral'}
              title={
                user.mfa_enabled
                  ? `MFA activo (${user.mfa_method})`
                  : 'MFA inactivo'
              }
            >
              {user.mfa_enabled ? 'Sí' : 'No'}
            </Badge>
            <IconButton
              aria-label={
                user.mfa_enforced ? 'Quitar obligatoriedad MFA' : 'Forzar uso de MFA'
              }
              title={user.mfa_enforced ? 'Quitar obligatoriedad' : 'Forzar uso de MFA'}
              onClick={() =>
                handleUserMFAAction(user.id, user.mfa_enforced ? 'UNENFORCE' : 'ENFORCE')
              }
            >
              <Icon name="shield" size={14} />
            </IconButton>
            <IconButton
              aria-label="Reiniciar dispositivo MFA"
              title="Reiniciar dispositivo MFA"
              onClick={() => setMfaResetTarget(user.id)}
            >
              <Icon name="undo" size={14} />
            </IconButton>
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Acciones',
        className: 'col--actions',
        render: (user) => (
          <div className="data-table__actions" onClick={(e) => e.stopPropagation()}>
            {can('auth.change_user') ? (
              <IconButton aria-label="Editar" onClick={() => handleEdit(user)} title="Editar">
                <Icon name="edit" size={14} />
              </IconButton>
            ) : null}
            {can('auth.delete_user') ? (
              <IconButton
                aria-label="Eliminar"
                title="Eliminar"
                onClick={() =>
                  setDeleteTarget({ id: user.id, name: user.username })
                }
              >
                <Icon name="trash" size={14} />
              </IconButton>
            ) : null}
          </div>
        ),
      },
    ],
    [can],
  )

  if (!can('auth.view_user')) {
    return (
      <div className="page" data-od-id="users-page">
        <EmptyState
          title="Acceso denegado"
          description="No tenés permisos para administrar usuarios."
        />
      </div>
    )
  }

  return (
    <div
      className="page"
      data-od-id="users-page"
      {...(!isNarrow ? { 'data-fill-viewport': true } : {})}
    >
      <PageHeader
        icon="funcionarios"
        title="Usuarios y permisos"
        description="Administración de acceso al sistema"
        breadcrumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Administración' },
          { label: 'Usuarios' },
        ]}
        linkComponent={Link}
        split
        actions={
          can('auth.add_user') ? (
            <Button variant="primary" size="sm" onClick={handleNew}>
              <Icon name="plus" size="sm" /> Nuevo usuario
            </Button>
          ) : null
        }
      />

      

      <Card>
        <CardHeader
          title="MFA global obligatorio"
          subtitle={
            globalSecurity.force_mfa_all
              ? 'Todos los usuarios deben usar MFA (fallback: email)'
              : 'Los usuarios eligen si usar MFA'
          }
          actions={
            <Switch
              checked={globalSecurity.force_mfa_all}
              onChange={toggleGlobalMFA}
              label={globalSecurity.force_mfa_all ? 'Activado' : 'Desactivado'}
            />
          }
        />
      </Card>

      <FiltersBar onSearch={() => setCurrentPage(1)} onClear={clearFilters}>
        <Field label="Buscar" htmlFor="users-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="users-q"
              type="search"
              placeholder="Usuario, email, nombre o RUT…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </Field>
      </FiltersBar>

      <DataTable
        className="users-table"
        columns={columns}
        rows={pageRows}
        loading={loading}
        totalCount={filteredUsers.length}
        emptyTitle="Sin usuarios"
        emptyDescription="No se encontraron usuarios con la búsqueda actual."
        emptyAction={
          can('auth.add_user') ? (
            <Button variant="primary" size="sm" onClick={handleNew}>
              <Icon name="plus" size="sm" /> Nuevo usuario
            </Button>
          ) : (
            <Button variant="quiet" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          )
        }
        fillViewport={!isNarrow}
        page={currentPage}
        pageSize={pageSize}
        pageSizeId="users-page-size"
        pageSizeOptions={[10, 20, 50, 100]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setCurrentPage(1)
        }}
        sortKey={activeSortKey}
        onSort={handleSort}
        mobileCardActions={(user) => ({
          primary: can('auth.change_user')
            ? { label: 'Editar', onClick: () => handleEdit(user) }
            : undefined,
          secondary: can('auth.delete_user')
            ? {
                label: 'Eliminar',
                onClick: () => setDeleteTarget({ id: user.id, name: user.username }),
              }
            : undefined,
        })}
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">Usuarios</span>
            <Badge variant="neutral">{filteredUsers.length}</Badge>
          </div>
        }
      />

      <Modal
        open={isModalOpen && !!selectedUser}
        onClose={closeModal}
        title={selectedUser?.id ? 'Refinar permisos de usuario' : 'Nuevo usuario'}
        subheader="Configuración de seguridad"
        size="lg"
        {...overlay.modalProps}
        onOverlayDismiss={handleOverlayDismiss}
        footer={
          <>
            <Button variant="quiet" onClick={closeModal} disabled={overlay.busy}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={overlay.busy || overlay.active}
              loading={overlay.busy}
            >
              Guardar cambios
            </Button>
          </>
        }
      >
        {selectedUser ? (
          <form className="crud-form" onSubmit={handleSave}>
            <FormSection title="Identificación" asGrid={false}>
              <div className="form-grid">
                <Field label="RUT funcionario" htmlFor="user-rut">
                  <Input
                    id="user-rut"
                    placeholder="12345678-9"
                    value={selectedUser.rut || ''}
                    onChange={handleRutChange}
                  />
                </Field>
                <Field label="Username" htmlFor="user-username" required>
                  <Input
                    id="user-username"
                    value={selectedUser.username}
                    autoComplete="off"
                    disabled={!!selectedUser.id}
                    onChange={(e) =>
                      setSelectedUser({ ...selectedUser, username: e.target.value })
                    }
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection title="Datos personales" asGrid={false}>
              <div className="form-grid">
                <Field label="Nombre" htmlFor="user-first-name">
                  <Input
                    id="user-first-name"
                    value={selectedUser.first_name || ''}
                    onChange={(e) =>
                      setSelectedUser({ ...selectedUser, first_name: e.target.value })
                    }
                  />
                </Field>
                <Field label="Apellido" htmlFor="user-last-name">
                  <Input
                    id="user-last-name"
                    value={selectedUser.last_name || ''}
                    onChange={(e) =>
                      setSelectedUser({ ...selectedUser, last_name: e.target.value })
                    }
                  />
                </Field>
                <Field label="Email" htmlFor="user-email" className="field--full">
                  <Input
                    id="user-email"
                    type="email"
                    value={selectedUser.email || ''}
                    onChange={(e) =>
                      setSelectedUser({ ...selectedUser, email: e.target.value })
                    }
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection title="Seguridad" asGrid={false}>
              <div className="form-grid">
                <Field
                  label={selectedUser.id ? 'Cambiar contraseña' : 'Contraseña'}
                  htmlFor="user-password"
                >
                  <Input
                    id="user-password"
                    type="password"
                    placeholder={selectedUser.id ? 'Mantener actual…' : 'Establecer…'}
                    value={selectedUser.password || ''}
                    onChange={(e) =>
                      setSelectedUser({ ...selectedUser, password: e.target.value })
                    }
                  />
                </Field>
                <Field label="Estado de la cuenta" htmlFor="user-active">
                  <Switch
                    id="user-active"
                    checked={selectedUser.is_active}
                    onChange={(e) =>
                      setSelectedUser({ ...selectedUser, is_active: e.target.checked })
                    }
                    label={selectedUser.is_active ? 'Activa' : 'Inactiva'}
                  />
                </Field>
              </div>

              {selectedUser.id ? (
                <div className="form-grid" style={{ marginTop: 'var(--space-3)' }}>
                  <Button
                    type="button"
                    variant="quiet"
                    size="sm"
                    disabled={!selectedUser.mfa_enabled}
                    onClick={() => setMfaResetTarget(selectedUser.id)}
                  >
                    <Icon name="undo" size="sm" />
                    {selectedUser.mfa_enabled
                      ? `Reiniciar MFA (${selectedUser.mfa_method})`
                      : 'MFA no configurado'}
                  </Button>
                  <Button
                    type="button"
                    variant={selectedUser.mfa_enforced ? 'primary' : 'quiet'}
                    size="sm"
                    onClick={() =>
                      handleUserMFAAction(
                        selectedUser.id,
                        selectedUser.mfa_enforced ? 'UNENFORCE' : 'ENFORCE',
                      )
                    }
                  >
                    <Icon name="shield" size="sm" />
                    {selectedUser.mfa_enforced ? 'Quitar obligatoriedad MFA' : 'Forzar uso de MFA'}
                  </Button>
                </div>
              ) : null}
            </FormSection>

            <FormSection
              title="Roles asignados"
              description="Los roles definen los permisos base del usuario. Puede seleccionar uno o varios."
              asGrid={false}
            >
              <Field
                label="Seleccionar roles"
                htmlFor="user-groups"
                hint="Mantenga Ctrl (Cmd en Mac) para seleccionar múltiples roles."
              >
                <Select
                  id="user-groups"
                  multiple
                  value={selectedUser.groups}
                  onChange={(e) => {
                    const options = Array.from(e.target.selectedOptions, (option) => option.value)
                    setSelectedUser({ ...selectedUser, groups: options })
                  }}
                  style={{ minHeight: '6rem' }}
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.name}>
                      {role.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </FormSection>

            <FormSection
              asGrid={false}
              headerExtra={
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-3)',
                    width: '100%',
                  }}
                >
                  <div>
                    <h2 className="form-section__title">Permisos individuales (overrides)</h2>
                    <p className="form-section__desc">
                      Configure permisos específicos adicionales a los roles seleccionados.
                    </p>
                  </div>
                  <Badge variant="accent">
                    {selectedUser.user_permissions.length} permisos activos
                  </Badge>
                </div>
              }
            >
              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                {sortedPermissionModules.map(([module, perms]) => {
                  const selectedCount = perms.filter((p) =>
                    selectedUser.user_permissions.includes(p.id),
                  ).length
                  const allSelected = perms.every((p) =>
                    selectedUser.user_permissions.includes(p.id),
                  )

                  return (
                    <FormSection
                      key={module}
                      asGrid={false}
                      headerExtra={
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 'var(--space-2)',
                            width: '100%',
                          }}
                        >
                          <button
                            type="button"
                            className="tabs__btn"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 'var(--space-2)',
                              border: 'none',
                              background: 'transparent',
                              padding: 0,
                            }}
                            onClick={() => toggleAccordion(module)}
                            aria-expanded={!!expandedGroups[module]}
                          >
                            <Icon
                              name="chevron"
                              size="sm"
                              style={{
                                transform: expandedGroups[module]
                                  ? 'rotate(180deg)'
                                  : undefined,
                                transition: 'transform 0.2s',
                              }}
                            />
                            <span className="form-section__title">{module}</span>
                          </button>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--space-2)',
                            }}
                          >
                            <Button
                              type="button"
                              variant="quiet"
                              size="sm"
                              onClick={() => toggleSelectAll(perms)}
                            >
                              {allSelected ? 'Limpiar' : 'Todos'}
                            </Button>
                            <Badge variant="neutral">
                              {selectedCount}/{perms.length}
                            </Badge>
                          </div>
                        </div>
                      }
                    >
                      {expandedGroups[module] ? (
                        <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                          {perms.map((perm) => (
                            <label key={perm.id} className="personal-ti-activo">
                              <input
                                type="checkbox"
                                checked={selectedUser.user_permissions.includes(perm.id)}
                                onChange={() => togglePermission(perm.id)}
                              />
                              <span>{getFriendlyPermName(perm)}</span>
                            </label>
                          ))}
                        </div>
                      ) : null}
                    </FormSection>
                  )
                })}
              </div>
            </FormSection>
          </form>
        ) : null}
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        onConfirm={confirmDelete}
        title="Eliminar usuario"
        description={
          deleteTarget
            ? `¿Está seguro de eliminar al usuario "${deleteTarget.name}"?`
            : ''
        }
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        danger
      />

      <ConfirmModal
        open={!!mfaResetTarget}
        onClose={() => setMfaResetTarget(null)}
        onConfirm={confirmMfaReset}
        title="Resetear MFA"
        description="¿Resetear MFA? El usuario deberá configurarlo nuevamente."
        confirmLabel="Resetear"
        danger
      />
    </div>
  )
}

export default UserManagement
