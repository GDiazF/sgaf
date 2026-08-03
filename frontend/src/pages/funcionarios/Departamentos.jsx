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
  Modal,
  ConfirmModal,
  Icon,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const emptyForm = () => ({ nombre: '', subdireccion: '', activo: true })

const Departamentos = () => {
  const navigate = useNavigate()
  const { can } = usePermission()
  const canAdd = can('funcionarios.add_departamento')
  const canChange = can('funcionarios.change_departamento')
  const canDelete = can('funcionarios.delete_departamento')
  const { notify } = useNotify()
  const overlay = useFormOverlay()

  const [items, setItems] = useState([])
  const [subdirecciones, setSubdirecciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSubdireccion, setFilterSubdireccion] = useState('')
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
    fetchSubdirecciones()
  }, [])

  useEffect(() => {
    fetchData(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filterSubdireccion, pageSize])

  const fetchSubdirecciones = async () => {
    try {
      const response = await api.get('subdirecciones/', { params: { nopaginate: true } })
      setSubdirecciones(
        response.data.results || (Array.isArray(response.data) ? response.data : []),
      )
    } catch (error) {
      console.error('Error fetching subdirecciones:', error)
    }
  }

  const fetchData = async (page = currentPage) => {
    setLoading(true)
    try {
      const params = { page, page_size: pageSize }
      if (debouncedSearch) params.search = debouncedSearch
      if (filterSubdireccion) params.subdireccion = filterSubdireccion

      const response = await api.get('departamentos/', { params })
      if (response.data.results) {
        setItems(response.data.results)
        setTotalResults(response.data.count || 0)
      } else {
        setItems(response.data || [])
        setTotalResults(response.data?.length || 0)
      }
      setCurrentPage(page)
    } catch (error) {
      console.error('Error fetching departamentos:', error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setFilterSubdireccion('')
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
      subdireccion: item.subdireccion || '',
      activo: item.activo,
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    const wasEdit = Boolean(editingId)
    try {
      await overlay.run(
        async () => {
          if (editingId) {
            await api.put(`departamentos/${editingId}/`, formData)
          } else {
            await api.post('departamentos/', formData)
          }
          setSavedOk(true)
        },
        {
          successDescription: wasEdit ? 'Departamento actualizado.' : 'Departamento guardado.',
          formatError: (err) => formatApiFormError(err, 'No se pudo guardar el departamento.'),
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
      await api.delete(`departamentos/${deleteTarget.id}/`)
      setDeleteTarget(null)
      notify({ variant: 'success', text: 'Departamento eliminado.' })
      await fetchData(currentPage)
    } catch (error) {
      console.error('Error deleting:', error)
      notify({ variant: 'danger', text: 'Error al eliminar el departamento.' })
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleActivo = async (item) => {
    try {
      await api.patch(`departamentos/${item.id}/`, { activo: !item.activo })
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
        key: 'subdireccion_nombre',
        header: 'Subdirección',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 1,
        render: (item) => item.subdireccion_nombre || '—',
      },
      {
        key: 'total_unidades',
        header: 'Unidades',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) => <Badge variant="neutral">{item.total_unidades || 0}</Badge>,
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
    <div className="page" data-od-id="departamentos-page">
      <PageHeader
        icon="briefcase"
        title="Departamentos"
        description="Administración departamental"
        breadcrumbs={[
          { label: 'Operaciones' },
          { label: 'Funcionarios', to: '/funcionarios' },
          { label: 'Departamentos' },
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
                <Icon name="plus" size="sm" /> Nuevo departamento
              </Button>
            ) : null}
          </>
        }
      />

      <FiltersBar
        onSearch={() => setCurrentPage(1)}
        onClear={clearFilters}
        advanced={
          <Field label="Subdirección" htmlFor="depto-sub">
            <Select
              id="depto-sub"
              value={filterSubdireccion}
              onChange={(e) => {
                setFilterSubdireccion(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="">Todas las subdirecciones</option>
              {subdirecciones.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.nombre}
                </option>
              ))}
            </Select>
          </Field>
        }
      >
        <Field label="Buscar" htmlFor="depto-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="depto-q"
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
        emptyTitle="Sin departamentos"
        emptyDescription="No hay registros con los filtros actuales."
        emptyAction={
          <Button variant="quiet" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        }
        page={currentPage}
        pageSize={pageSize}
        pageSizeId="depto-page-size"
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
        title={editingId ? 'Editar departamento' : 'Nuevo departamento'}
        subheader="Datos del departamento"
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
              form="departamento-form"
              loading={overlay.busy}
              disabled={overlay.busy || overlay.active}
            >
              {editingId ? 'Guardar cambios' : 'Crear'}
            </Button>
          </>
        }
      >
        <form id="departamento-form" className="crud-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <Field label="Subdirección" required htmlFor="depto-form-sub" className="field--full">
              <Select
                id="depto-form-sub"
                required
                value={formData.subdireccion}
                onChange={(e) => setFormData({ ...formData, subdireccion: e.target.value })}
              >
                <option value="">Seleccionar…</option>
                {subdirecciones.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Nombre" required htmlFor="depto-form-nombre" className="field--full">
              <Input
                id="depto-form-nombre"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
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
        title="Eliminar departamento"
        description={
          deleteTarget
            ? `¿Eliminar «${deleteTarget.nombre}»? Esta acción no se puede deshacer.`
            : '¿Eliminar este departamento?'
        }
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        cancelLabel="Cancelar"
        danger
      />
    </div>
  )
}

export default Departamentos
