import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api'
import { usePermission } from '../../hooks/usePermission'
import { useNotify } from '../../hooks/useNotify'
import { groupPermissions, getFriendlyPermName } from '../../utils/permissionUtils'
import {
  PageHeader,
  FiltersBar,
  DataTable,
  Modal,
  ConfirmModal,
  Field,
  Input,
  Button,
  Icon,
  Badge,
  EmptyState,
  FormSection,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const RolesManagement = () => {
  const { can } = usePermission()
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [roleName, setRoleName] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [ordering, setOrdering] = useState('name')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const { notify } = useNotify()
  const overlay = useFormOverlay()
  const savedOkRef = useRef(false)

  const [expandedGroups, setExpandedGroups] = useState({})
  const [permSearchQuery, setPermSearchQuery] = useState('')

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
      const [rolesRes, permsRes] = await Promise.all([
        api.get('admin/roles/'),
        api.get('admin/permissions/'),
      ])

      setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : rolesRes.data.results || [])
      setPermissions(Array.isArray(permsRes.data) ? permsRes.data : permsRes.data.results || [])
    } catch (error) {
      console.error('Error fetching admin data:', error)
      notify({ variant: 'danger', text: 'No se pudieron cargar los roles.' })
    } finally {
      setLoading(false)
    }
  }

  const groupedPermissions = useMemo(() => groupPermissions(permissions), [permissions])

  const filteredGroupedPermissions = useMemo(() => {
    if (!permSearchQuery.trim()) return groupedPermissions
    const q = permSearchQuery.toLowerCase()
    const result = {}
    Object.entries(groupedPermissions).forEach(([module, perms]) => {
      const matched = perms.filter(
        (p) =>
          getFriendlyPermName(p).toLowerCase().includes(q) ||
          p.codename.toLowerCase().includes(q) ||
          module.toLowerCase().includes(q),
      )
      if (matched.length > 0) result[module] = matched
    })
    return result
  }, [groupedPermissions, permSearchQuery])

  const sortedPermissionModules = useMemo(
    () =>
      Object.entries(filteredGroupedPermissions).sort(([moduleA], [moduleB]) => {
        if (moduleA === 'Otros') return 1
        if (moduleB === 'Otros') return -1
        return moduleA.localeCompare(moduleB)
      }),
    [filteredGroupedPermissions],
  )

  useEffect(() => {
    if (permSearchQuery.trim()) {
      const expanded = {}
      Object.keys(filteredGroupedPermissions).forEach((m) => {
        expanded[m] = true
      })
      setExpandedGroups(expanded)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permSearchQuery])

  const handleEdit = (role) => {
    savedOkRef.current = false
    overlay.reset()
    setEditingId(role.id)
    setRoleName(role.name)
    setSelectedPermissions(role.permissions)
    setPermSearchQuery('')
    setExpandedGroups({})
    setIsModalOpen(true)
  }

  const handleNew = () => {
    savedOkRef.current = false
    overlay.reset()
    setEditingId(null)
    setRoleName('')
    setSelectedPermissions([])
    setPermSearchQuery('')
    setExpandedGroups({})
    setIsModalOpen(true)
  }

  const closeModal = () => {
    if (overlay.busy) return
    overlay.reset()
    setIsModalOpen(false)
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      setIsModalOpen(false)
      if (savedOkRef.current) fetchData()
      savedOkRef.current = false
      return
    }
    overlay.dismiss()
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!roleName) return
    try {
      await overlay.run(
        async () => {
          const data = { name: roleName, permissions: selectedPermissions }
          if (editingId) {
            await api.put(`admin/roles/${editingId}/`, data)
          } else {
            await api.post('admin/roles/', data)
          }
          savedOkRef.current = true
        },
        {
          successDescription: editingId ? 'Rol actualizado.' : 'Rol creado.',
          formatError: (err) => formatApiFormError(err, 'Error al guardar el rol.'),
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
      await api.delete(`admin/roles/${deleteTarget.id}/`)
      setDeleteTarget(null)
      await fetchData()
      notify({ variant: 'success', text: 'Rol eliminado.' })
    } catch (error) {
      console.error('Error deleting role:', error)
      notify({ variant: 'danger', text: 'Error al eliminar el rol.' })
    } finally {
      setDeleting(false)
    }
  }

  const togglePermission = (permId) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId],
    )
  }

  const toggleSelectAll = (modulePerms) => {
    const permIds = modulePerms.map((p) => p.id)
    const allSelected = permIds.every((id) => selectedPermissions.includes(id))

    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((id) => !permIds.includes(id)))
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...permIds])))
    }
  }

  const toggleAccordion = (module) => {
    setExpandedGroups((prev) => ({ ...prev, [module]: !prev[module] }))
  }

  const handleSort = (colKey) => {
    if (colKey !== 'name') return
    const next =
      ordering === 'name' ? '-name' : ordering === '-name' ? 'name' : 'name'
    setOrdering(next)
  }

  const activeSortKey = ordering === 'name' || ordering === '-name' ? 'name' : undefined

  const filteredRoles = useMemo(() => {
    let result = roles.filter((r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()),
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
  }, [roles, searchQuery, ordering])

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRoles.slice(start, start + pageSize)
  }, [filteredRoles, currentPage, pageSize])

  const clearFilters = () => {
    setSearchQuery('')
    setCurrentPage(1)
  }

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Nombre del rol',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        sortable: true,
        render: (role) => (
          <div className="contracts-cat">
            <strong>{role.name}</strong>
          </div>
        ),
      },
      {
        key: 'permissions',
        header: 'Total permisos',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 1,
        render: (role) => {
          const pct =
            permissions.length > 0
              ? Math.min((role.permissions.length / permissions.length) * 100, 100)
              : 0
          return (
            <div className="contracts-cat">
              <strong>{role.permissions.length}</strong>
              <span>{Math.round(pct)}% del catálogo</span>
            </div>
          )
        },
      },
      {
        key: 'actions',
        header: 'Acciones',
        className: 'col--actions',
        render: (role) => (
          <div className="data-table__actions" onClick={(e) => e.stopPropagation()}>
            {can('auth.change_group') ? (
              <Button variant="ghost" size="sm" onClick={() => handleEdit(role)} title="Editar">
                <Icon name="edit" size="sm" />
              </Button>
            ) : null}
            {can('auth.delete_group') ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteTarget({ id: role.id, name: role.name })}
                title="Eliminar"
              >
                <Icon name="trash" size="sm" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [can, permissions.length],
  )

  if (!can('auth.view_group')) {
    return (
      <div className="page" data-od-id="roles-page">
        <EmptyState title="Acceso denegado" description="No tenés permisos para ver roles del sistema." />
      </div>
    )
  }

  return (
    <div
      className="page"
      data-od-id="roles-page"
      {...(!isNarrow ? { 'data-fill-viewport': true } : {})}
    >
      <PageHeader
        icon="shield"
        title="Roles del sistema"
        description="Grupos y permisos predefinidos"
        breadcrumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Administración' },
          { label: 'Roles' },
        ]}
        linkComponent={Link}
        split
        actions={
          can('auth.add_group') ? (
            <Button variant="primary" size="sm" onClick={handleNew}>
              <Icon name="plus" size="sm" /> Nuevo rol
            </Button>
          ) : null
        }
      />

      

      <FiltersBar onSearch={() => setCurrentPage(1)} onClear={clearFilters}>
        <Field label="Buscar" htmlFor="roles-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="roles-q"
              type="search"
              placeholder="Buscar rol…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </Field>
      </FiltersBar>

      <DataTable
        columns={columns}
        rows={pageRows}
        loading={loading}
        totalCount={filteredRoles.length}
        emptyTitle="Sin roles"
        emptyDescription="No se encontraron roles con la búsqueda actual."
        emptyAction={
          can('auth.add_group') ? (
            <Button variant="primary" size="sm" onClick={handleNew}>
              <Icon name="plus" size="sm" /> Nuevo rol
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
        pageSizeId="roles-page-size"
        pageSizeOptions={[8, 10, 25, 50]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setCurrentPage(1)
        }}
        sortKey={activeSortKey}
        onSort={handleSort}
        mobileCardActions={(role) => ({
          primary: can('auth.change_group')
            ? { label: 'Editar', onClick: () => handleEdit(role) }
            : undefined,
          secondary: can('auth.delete_group')
            ? {
                label: 'Eliminar',
                onClick: () => setDeleteTarget({ id: role.id, name: role.name }),
              }
            : undefined,
        })}
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">Roles</span>
            <Badge variant="neutral">{filteredRoles.length}</Badge>
          </div>
        }
      />

      <Modal
        open={isModalOpen}
        onClose={closeModal}
        title={editingId ? 'Editar definición de rol' : 'Nuevo rol de sistema'}
        subheader="Matriz de permisos"
        size="lg"
        {...overlay.modalProps}
        onOverlayDismiss={handleOverlayDismiss}
        footer={
          <>
            <Button variant="quiet" onClick={closeModal} disabled={overlay.busy}>
              Descartar
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={overlay.busy || overlay.active || !roleName}
              loading={overlay.busy}
            >
              {editingId ? 'Guardar cambios' : 'Crear rol'}
            </Button>
          </>
        }
      >
        <form className="crud-form" onSubmit={handleSave}>
          <Field label="Nombre del rol" htmlFor="role-name" required>
            <Input
              id="role-name"
              placeholder="Ej: Encargado de activos"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
            />
          </Field>

          <div className="form-section">
            <div className="form-section__header">
              <div>
                <h2 className="form-section__title">Configuración de privilegios por módulo</h2>
                <p className="form-section__desc">
                  Asignar este rol concederá todos los permisos seleccionados de forma inmediata.
                </p>
              </div>
              <Badge variant="accent">{selectedPermissions.length} seleccionados</Badge>
            </div>
            <div className="form-section__body">
              <Field label="Buscar permiso" htmlFor="perm-q" className="field--full">
                <div className="input-wrap">
                  <Icon name="search" className="input-wrap__icon" size="sm" />
                  <Input
                    id="perm-q"
                    type="search"
                    placeholder="Buscar permiso…"
                    value={permSearchQuery}
                    onChange={(e) => setPermSearchQuery(e.target.value)}
                  />
                </div>
              </Field>

              {sortedPermissionModules.length === 0 && permSearchQuery ? (
                <EmptyState
                  title="Sin resultados"
                  description={`No hay permisos que coincidan con "${permSearchQuery}".`}
                />
              ) : (
                <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                  {sortedPermissionModules.map(([module, perms]) => {
                    const selectedCount = perms.filter((p) =>
                      selectedPermissions.includes(p.id),
                    ).length
                    const allSelected = perms.every((p) => selectedPermissions.includes(p.id))

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
                              gap: 'var(--space-3)',
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
                              {permSearchQuery ? (
                                <Badge variant="accent">
                                  {perms.length} coincidencia{perms.length !== 1 ? 's' : ''}
                                </Badge>
                              ) : null}
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
                                {allSelected ? 'Desmarcar todo' : 'Marcar todo'}
                              </Button>
                              <Badge variant="neutral">
                                {selectedCount} de {perms.length}
                              </Badge>
                            </div>
                          </div>
                        }
                      >
                        {expandedGroups[module] ? (
                          <div className="form-grid">
                            {perms.map((perm) => (
                              <label key={perm.id} className="personal-ti-activo">
                                <input
                                  type="checkbox"
                                  checked={selectedPermissions.includes(perm.id)}
                                  onChange={() => togglePermission(perm.id)}
                                />
                                <span>
                                  <strong>{getFriendlyPermName(perm)}</strong>
                                  <span className="field__hint">Código: {perm.codename}</span>
                                </span>
                              </label>
                            ))}
                          </div>
                        ) : null}
                      </FormSection>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        onConfirm={confirmDelete}
        title="Eliminar rol"
        description={
          deleteTarget
            ? `¿Está seguro de eliminar el rol "${deleteTarget.name}"?`
            : ''
        }
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        danger
      />
    </div>
  )
}

export default RolesManagement
