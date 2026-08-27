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
  Modal,
  ConfirmModal,
  Icon,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const emptyForm = () => ({ nombre: '', piso: 1, activo: true })

const Subdirecciones = () => {
  const navigate = useNavigate()
  const { can } = usePermission()
  const canAdd = can('funcionarios.add_subdireccion')
  const canChange = can('funcionarios.change_subdireccion')
  const canDelete = can('funcionarios.delete_subdireccion')
  const { notify } = useNotify()
  const overlay = useFormOverlay()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalResults, setTotalResults] = useState(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyForm())
  const [savedOk, setSavedOk] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const debouncedSearch = useDebouncedValue(searchTerm)

  useEffect(() => {
    fetchData(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, pageSize])

  const fetchData = async (page = currentPage) => {
    setLoading(true)
    try {
      const params = {
        page,
        page_size: pageSize,
        ordering: 'nombre',
      }
      if (debouncedSearch) params.search = debouncedSearch

      const response = await api.get('subdirecciones/', { params })
      if (response.data.results) {
        setItems(response.data.results)
        setTotalResults(response.data.count || 0)
      } else {
        setItems(response.data || [])
        setTotalResults(response.data?.length || 0)
      }
      setCurrentPage(page)
    } catch (error) {
      console.error('Error fetching subdirecciones:', error)
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
    setFormData({ nombre: item.nombre, piso: item.piso, activo: item.activo })
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    const wasEdit = Boolean(editingId)
    try {
      await overlay.run(
        async () => {
          if (editingId) {
            await api.put(`subdirecciones/${editingId}/`, formData)
          } else {
            await api.post('subdirecciones/', formData)
          }
          setSavedOk(true)
        },
        {
          successDescription: wasEdit ? 'Subdirección actualizada.' : 'Subdirección guardada.',
          formatError: (err) => formatApiFormError(err, 'No se pudo guardar la subdirección.'),
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
      await api.delete(`subdirecciones/${deleteTarget.id}/`)
      setDeleteTarget(null)
      notify({ variant: 'success', text: 'Subdirección eliminada.' })
      await fetchData(currentPage)
    } catch (error) {
      console.error('Error deleting:', error)
      notify({ variant: 'danger', text: 'Error al eliminar la subdirección.' })
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleActivo = async (item) => {
    try {
      await api.patch(`subdirecciones/${item.id}/`, { activo: !item.activo })
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
        header: 'Nombre',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
      },
      {
        key: 'piso',
        header: 'Piso',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 1,
        render: (item) => item.piso ?? '—',
      },
      {
        key: 'total_departamentos',
        header: 'Deptos.',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) => (
          <Badge variant="neutral">{item.total_departamentos || 0}</Badge>
        ),
      },
      {
        key: 'total_funcionarios',
        header: 'Personal',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) => (
          <Badge variant="neutral">{item.total_funcionarios || 0}</Badge>
        ),
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
    <div className="page" data-od-id="subdirecciones-page">
      <PageHeader
        icon="briefcase"
        title="Subdirecciones"
        description="Estructura organizacional del servicio"
        breadcrumbs={[
          { label: 'Operaciones' },
          { label: 'Funcionarios', to: '/funcionarios' },
          { label: 'Subdirecciones' },
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
                <Icon name="plus" size="sm" /> Nueva subdirección
              </Button>
            ) : null}
          </>
        }
      />

      <FiltersBar onSearch={() => setCurrentPage(1)} onClear={clearFilters}>
        <Field label="Buscar" htmlFor="sub-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="sub-q"
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
        emptyTitle="Sin subdirecciones"
        emptyDescription="No hay registros con los filtros actuales."
        emptyAction={
          <Button variant="quiet" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        }
        page={currentPage}
        pageSize={pageSize}
        pageSizeId="sub-page-size"
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
        title={editingId ? 'Editar subdirección' : 'Nueva subdirección'}
        subheader="Datos de la unidad orgánica"
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
              form="subdireccion-form"
              loading={overlay.busy}
              disabled={overlay.busy || overlay.active}
            >
              {editingId ? 'Guardar cambios' : 'Crear'}
            </Button>
          </>
        }
      >
        <form id="subdireccion-form" className="crud-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <Field label="Nombre" required htmlFor="sub-nombre" className="field--full">
              <Input
                id="sub-nombre"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </Field>
            <Field label="Piso" required htmlFor="sub-piso">
              <Input
                id="sub-piso"
                type="number"
                min={1}
                required
                value={formData.piso}
                onChange={(e) =>
                  setFormData({ ...formData, piso: parseInt(e.target.value, 10) || 1 })
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
        onConfirm={handleConfirmDelete}
        title="Eliminar subdirección"
        description={
          deleteTarget
            ? `¿Eliminar «${deleteTarget.nombre}»? Esta acción no se puede deshacer.`
            : '¿Eliminar esta subdirección?'
        }
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        cancelLabel="Cancelar"
        danger
      />
    </div>
  )
}

export default Subdirecciones
