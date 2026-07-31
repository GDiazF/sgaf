import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api'
import { usePermission } from '../../hooks/usePermission'
import { useNotify } from '../../hooks/useNotify'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import {
  PageHeader,
  FiltersBar,
  DataTable,
  Badge,
  Button,
  Field,
  Input,
  Select,
  Textarea,
  Modal,
  ConfirmModal,
  EmptyState,
  Icon,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const emptyForm = () => ({
  nombre: '',
  descripcion: '',
  jefe: '',
  activo: true,
  funcionarios: [],
})

const Grupos = () => {
  const navigate = useNavigate()
  const { can } = usePermission()
  const canAdd = can('funcionarios.add_grupo')
  const canChange = can('funcionarios.change_grupo')
  const canDelete = can('funcionarios.delete_grupo')
  const { notify } = useNotify()
  const overlay = useFormOverlay()

  const [items, setItems] = useState([])
  const [funcionarios, setFuncionarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalResults, setTotalResults] = useState(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyForm())
  const [savedOk, setSavedOk] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const debouncedSearch = useDebouncedValue(searchTerm)

  useEffect(() => {
    fetchFuncionarios()
  }, [])

  useEffect(() => {
    fetchData(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, pageSize])

  const fetchFuncionarios = async () => {
    try {
      const response = await api.get('funcionarios/', { params: { nopaginate: true } })
      setFuncionarios(
        response.data.results || (Array.isArray(response.data) ? response.data : []),
      )
    } catch (error) {
      console.error('Error fetching funcionarios:', error)
      setFuncionarios([])
    }
  }

  const fetchData = async (page = currentPage) => {
    setLoading(true)
    try {
      const params = { page, page_size: pageSize }
      if (debouncedSearch) params.search = debouncedSearch

      const response = await api.get('grupos/', { params })
      if (response.data.results) {
        setItems(response.data.results)
        setTotalResults(response.data.count || 0)
      } else {
        setItems(response.data || [])
        setTotalResults(response.data?.length || 0)
      }
      setCurrentPage(page)
    } catch (error) {
      console.error('Error fetching grupos:', error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setCurrentPage(1)
  }

  const openCreate = () => {
    setEditingId(null)
    setFormData(emptyForm())
    setSavedOk(false)
    overlay.reset()
    setModalOpen(true)
  }

  const openEdit = (item) => {
    setEditingId(item.id)
    setFormData({
      nombre: item.nombre,
      descripcion: item.descripcion || '',
      jefe: item.jefe || '',
      activo: item.activo,
      funcionarios: item.funcionarios || [],
    })
    setSavedOk(false)
    overlay.reset()
    setModalOpen(true)
  }

  const closeModal = () => {
    if (overlay.busy) return
    overlay.reset()
    setModalOpen(false)
    setEditingId(null)
    setFormData(emptyForm())
    setSavedOk(false)
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      setModalOpen(false)
      setEditingId(null)
      setFormData(emptyForm())
      if (savedOk) fetchData(editingId ? currentPage : 1)
      setSavedOk(false)
      return
    }
    overlay.dismiss()
  }

  const toggleMiembro = (id, checked) => {
    const newIds = checked
      ? [...formData.funcionarios, id]
      : formData.funcionarios.filter((fid) => fid !== id)
    const jefe = newIds.includes(formData.jefe) ? formData.jefe : ''
    setFormData({ ...formData, funcionarios: newIds, jefe })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const wasEdit = Boolean(editingId)
    try {
      await overlay.run(
        async () => {
          const payload = {
            ...formData,
            jefe: formData.jefe || null,
          }
          if (editingId) {
            await api.put(`grupos/${editingId}/`, payload)
          } else {
            await api.post('grupos/', payload)
          }
          setSavedOk(true)
        },
        {
          successDescription: wasEdit ? 'Grupo actualizado.' : 'Grupo guardado.',
          formatError: (err) => formatApiFormError(err, 'No se pudo guardar el grupo.'),
        },
      )
    } catch {
      // FormOverlay
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`grupos/${deleteTarget.id}/`)
      setDeleteTarget(null)
      notify({ variant: 'success', text: 'Grupo eliminado.' })
      await fetchData(currentPage)
    } catch (error) {
      console.error('Error deleting:', error)
      notify({ variant: 'danger', text: 'Error al eliminar el grupo.' })
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleActivo = async (item) => {
    try {
      await api.patch(`grupos/${item.id}/`, { activo: !item.activo })
      fetchData(currentPage)
    } catch (error) {
      console.error('Error toggling status:', error)
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'activo',
        header: 'Estado',
        className: 'col--status',
        cardRole: 'status',
        priority: 1,
        render: (item) =>
          canChange ? (
            <button
              type="button"
              className="badge-toggle"
              aria-label={item.activo ? 'Desactivar' : 'Activar'}
              onClick={() => handleToggleActivo(item)}
            >
              <Badge variant={item.activo ? 'success' : 'neutral'} dot>
                {item.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </button>
          ) : (
            <Badge variant={item.activo ? 'success' : 'neutral'} dot>
              {item.activo ? 'Activo' : 'Inactivo'}
            </Badge>
          ),
      },
      {
        key: 'nombre',
        header: 'Grupo',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
      },
      {
        key: 'descripcion',
        header: 'Descripción',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 1,
        render: (item) => item.descripcion || '—',
      },
      {
        key: 'total_miembros',
        header: 'Miembros',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) => <Badge variant="neutral">{item.total_miembros || 0}</Badge>,
      },
      {
        key: 'jefe_nombre',
        header: 'Jefe / líder',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) => item.jefe_nombre || 'Sin asignar',
      },
      {
        key: 'actions',
        header: 'Acciones',
        className: 'col--actions',
        render: (item) => (
          <div className="data-table__actions">
            {canChange ? (
              <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                Editar
              </Button>
            ) : null}
            {canDelete ? (
              <Button variant="danger" size="sm" onClick={() => setDeleteTarget(item)}>
                Eliminar
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canChange, canDelete],
  )

  return (
    <div className="page" data-od-id="grupos-page">
      <PageHeader
        icon="funcionarios"
        title="Grupos"
        description="Equipos de trabajo del servicio"
        breadcrumbs={[
          { label: 'Operaciones' },
          { label: 'Funcionarios', to: '/funcionarios' },
          { label: 'Grupos' },
        ]}
        linkComponent={Link}
        split
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/funcionarios')}
            >
              Volver al directorio
            </Button>
            {canAdd ? (
              <Button variant="primary" size="sm" onClick={openCreate}>
                <Icon name="plus" size="sm" /> Nuevo grupo
              </Button>
            ) : null}
          </>
        }
      />

      <FiltersBar onSearch={() => setCurrentPage(1)} onClear={clearFilters}>
        <Field label="Buscar" htmlFor="grupo-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="grupo-q"
              type="search"
              placeholder="Buscar por nombre…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </Field>
      </FiltersBar>

      <DataTable
        columns={columns}
        rows={items}
        loading={loading}
        totalCount={totalResults}
        emptyTitle="Sin grupos"
        emptyDescription="No hay registros con los filtros actuales."
        emptyAction={
          <Button variant="quiet" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        }
        page={currentPage}
        pageSize={pageSize}
        pageSizeId="grupo-page-size"
        onPageChange={(page) => fetchData(page)}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setCurrentPage(1)
        }}
        mobileCardActions={(item) => ({
          primary: canChange ? { label: 'Editar', onClick: () => openEdit(item) } : undefined,
          secondary: canDelete
            ? { label: 'Eliminar', onClick: () => setDeleteTarget(item) }
            : undefined,
        })}
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">Listado</span>
            <Badge variant="neutral">{totalResults} registros</Badge>
          </div>
        }
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        size="lg"
        title={editingId ? 'Editar grupo' : 'Nuevo grupo'}
        subheader="Datos del equipo y miembros"
        {...overlay.modalProps}
        onOverlayDismiss={handleOverlayDismiss}
        footer={
          <>
            <Button variant="ghost" type="button" onClick={closeModal} disabled={overlay.busy}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="grupo-form"
              loading={overlay.busy}
              disabled={overlay.busy || overlay.active}
            >
              {editingId ? 'Guardar cambios' : 'Crear'}
            </Button>
          </>
        }
      >
        <form id="grupo-form" className="crud-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <Field label="Nombre" required htmlFor="grupo-nombre" className="field--full">
              <Input
                id="grupo-nombre"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </Field>
            <Field label="Descripción" htmlFor="grupo-desc" className="field--full">
              <Textarea
                id="grupo-desc"
                rows={3}
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              />
            </Field>
            <div className="field field--full">
              <span className="field__label">
                Miembros ({formData.funcionarios.length})
              </span>
              {funcionarios.length === 0 ? (
                <EmptyState title="Sin funcionarios" description="No hay personal disponible." />
              ) : (
                <ul className="func-grupos">
                  {funcionarios.map((func) => {
                    const selected = formData.funcionarios.includes(func.id)
                    return (
                      <li key={func.id}>
                        <label
                          className={`func-grupos__item${selected ? ' is-selected' : ''}`}
                          htmlFor={`grupo-miembro-${func.id}`}
                        >
                          <input
                            id={`grupo-miembro-${func.id}`}
                            type="checkbox"
                            className="no-global"
                            checked={selected}
                            onChange={(e) => toggleMiembro(func.id, e.target.checked)}
                          />
                          <span>{func.nombre_funcionario}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            {formData.funcionarios.length > 0 ? (
              <Field label="Jefe de grupo" htmlFor="grupo-jefe" className="field--full">
                <Select
                  id="grupo-jefe"
                  value={formData.jefe}
                  onChange={(e) => setFormData({ ...formData, jefe: e.target.value })}
                >
                  <option value="">Seleccionar…</option>
                  {formData.funcionarios.map((fid) => {
                    const f = funcionarios.find((func) => func.id === fid)
                    return f ? (
                      <option key={fid} value={fid}>
                        {f.nombre_funcionario}
                      </option>
                    ) : null
                  })}
                </Select>
              </Field>
            ) : null}
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        onConfirm={handleConfirmDelete}
        title="Eliminar grupo"
        description={
          deleteTarget
            ? `¿Eliminar «${deleteTarget.nombre}»? Esta acción no se puede deshacer.`
            : '¿Eliminar este grupo?'
        }
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        cancelLabel="Cancelar"
        danger
      />
    </div>
  )
}

export default Grupos
