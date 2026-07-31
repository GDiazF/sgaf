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

const emptyForm = () => ({ nombre: '', departamento: '', activo: true })

const Unidades = () => {
  const navigate = useNavigate()
  const { can } = usePermission()
  const canAdd = can('funcionarios.add_unidad')
  const canChange = can('funcionarios.change_unidad')
  const canDelete = can('funcionarios.delete_unidad')
  const { notify } = useNotify()
  const overlay = useFormOverlay()

  const [items, setItems] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDepartamento, setFilterDepartamento] = useState('')
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
    fetchDepartamentos()
  }, [])

  useEffect(() => {
    fetchData(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filterDepartamento, pageSize])

  const fetchDepartamentos = async () => {
    try {
      const response = await api.get('departamentos/', { params: { nopaginate: true } })
      setDepartamentos(
        response.data.results || (Array.isArray(response.data) ? response.data : []),
      )
    } catch (error) {
      console.error('Error fetching departamentos:', error)
    }
  }

  const fetchData = async (page = currentPage) => {
    setLoading(true)
    try {
      const params = { page, page_size: pageSize }
      if (debouncedSearch) params.search = debouncedSearch
      if (filterDepartamento) params.departamento = filterDepartamento

      const response = await api.get('unidades/', { params })
      if (response.data.results) {
        setItems(response.data.results)
        setTotalResults(response.data.count || 0)
      } else {
        setItems(response.data || [])
        setTotalResults(response.data?.length || 0)
      }
      setCurrentPage(page)
    } catch (error) {
      console.error('Error fetching unidades:', error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setFilterDepartamento('')
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
      departamento: item.departamento || '',
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
            await api.put(`unidades/${editingId}/`, formData)
          } else {
            await api.post('unidades/', formData)
          }
          setSavedOk(true)
        },
        {
          successDescription: wasEdit ? 'Unidad actualizada.' : 'Unidad guardada.',
          formatError: (err) => formatApiFormError(err, 'No se pudo guardar la unidad.'),
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
      await api.delete(`unidades/${deleteTarget.id}/`)
      setDeleteTarget(null)
      notify({ variant: 'success', text: 'Unidad eliminada.' })
      await fetchData(currentPage)
    } catch (error) {
      console.error('Error deleting:', error)
      notify({ variant: 'danger', text: 'Error al eliminar la unidad.' })
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleActivo = async (item) => {
    try {
      await api.patch(`unidades/${item.id}/`, { activo: !item.activo })
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
        key: 'departamento_nombre',
        header: 'Departamento',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 1,
        render: (item) => item.departamento_nombre || '—',
      },
      {
        key: 'subdireccion_nombre',
        header: 'Subdirección',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) => item.subdireccion_nombre || '—',
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
    <div className="page" data-od-id="unidades-page">
      <PageHeader
        icon="box"
        title="Unidades"
        description="Unidades operativas del servicio"
        breadcrumbs={[
          { label: 'Operaciones' },
          { label: 'Funcionarios', to: '/funcionarios' },
          { label: 'Unidades' },
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
                <Icon name="plus" size="sm" /> Nueva unidad
              </Button>
            ) : null}
          </>
        }
      />

      <FiltersBar
        onSearch={() => setCurrentPage(1)}
        onClear={clearFilters}
        advanced={
          <Field label="Departamento" htmlFor="unidad-depto">
            <Select
              id="unidad-depto"
              value={filterDepartamento}
              onChange={(e) => {
                setFilterDepartamento(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="">Todos los departamentos</option>
              {departamentos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </Select>
          </Field>
        }
      >
        <Field label="Buscar" htmlFor="unidad-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="unidad-q"
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
        emptyTitle="Sin unidades"
        emptyDescription="No hay registros con los filtros actuales."
        emptyAction={
          <Button variant="quiet" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        }
        page={currentPage}
        pageSize={pageSize}
        pageSizeId="unidad-page-size"
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
        title={editingId ? 'Editar unidad' : 'Nueva unidad'}
        subheader="Datos de la unidad operativa"
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
              form="unidad-form"
              loading={overlay.busy}
              disabled={overlay.busy || overlay.active}
            >
              {editingId ? 'Guardar cambios' : 'Crear'}
            </Button>
          </>
        }
      >
        <form id="unidad-form" className="crud-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <Field label="Departamento" required htmlFor="unidad-form-depto" className="field--full">
              <Select
                id="unidad-form-depto"
                required
                value={formData.departamento}
                onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
              >
                <option value="">Seleccionar…</option>
                {departamentos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Nombre" required htmlFor="unidad-form-nombre" className="field--full">
              <Input
                id="unidad-form-nombre"
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
        title="Eliminar unidad"
        description={
          deleteTarget
            ? `¿Eliminar «${deleteTarget.nombre}»? Esta acción no se puede deshacer.`
            : '¿Eliminar esta unidad?'
        }
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        cancelLabel="Cancelar"
        danger
      />
    </div>
  )
}

export default Unidades
