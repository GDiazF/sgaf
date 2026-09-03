import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api'
import { usePermission } from '../../hooks/usePermission'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { useNotify } from '../../hooks/useNotify'
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
import FeriadosModal from '../../components/contracts/rutas/FeriadosModal'

const ServiciosDashboard = () => {
  const { can } = usePermission()
  const navigate = useNavigate()

  const [servicios, setServicios] = useState([])
  const [tiposServicios, setTiposServicios] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebouncedValue(searchTerm)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    contrato: '',
    tipo_servicio: '',
    nombre: '',
  })
  const createOverlay = useFormOverlay()

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const editOverlay = useFormOverlay()

  const [isFeriadosModalOpen, setIsFeriadosModalOpen] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const { notify } = useNotify()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [servRes, contRes, tiposRes] = await Promise.all([
        api.get('contratos/servicios/'),
        api.get('contratos/contratos/', { params: { page_size: 1000, vista: 'activos' } }),
        api.get('contratos/tipos-servicios/'),
      ])
      const tipos = tiposRes.data.results || tiposRes.data
      setServicios(servRes.data.results || servRes.data)
      setContracts(contRes.data.results || contRes.data)
      setTiposServicios(tipos)
      if (tipos.length > 0) {
        setFormData((prev) =>
          prev.tipo_servicio ? prev : { ...prev, tipo_servicio: tipos[0].id },
        )
      }
    } catch (error) {
      console.error(error)
      notify({ variant: 'danger', text: 'Error al cargar los servicios.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredServicios = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim()
    if (!q) return servicios
    return servicios.filter(
      (s) =>
        (s.nombre || '').toLowerCase().includes(q) ||
        (s.contrato_nombre || '').toLowerCase().includes(q) ||
        (s.tipo_servicio_nombre || '').toLowerCase().includes(q),
    )
  }, [servicios, debouncedSearch])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredServicios.slice(start, start + pageSize)
  }, [filteredServicios, page, pageSize])

  const handleCreateService = async (e) => {
    e.preventDefault()
    try {
      await createOverlay.run(
        async () => {
          await api.post('contratos/servicios/', formData)
        },
        {
          successDescription: 'Servicio operativo creado.',
          formatError: (err) => formatApiFormError(err),
        },
      )
    } catch {
      // El error se muestra en FormOverlay
    }
  }

  const closeCreateModal = () => {
    if (createOverlay.busy) return
    createOverlay.reset()
    setIsModalOpen(false)
  }

  const handleCreateOverlayDismiss = () => {
    if (createOverlay.status === 'success') {
      createOverlay.reset()
      setIsModalOpen(false)
      setFormData({
        contrato: '',
        tipo_servicio: tiposServicios[0]?.id || '',
        nombre: '',
      })
      fetchData()
      return
    }
    createOverlay.dismiss()
  }

  const handleUpdateService = async (e) => {
    e.preventDefault()
    if (!editingService) return
    try {
      await editOverlay.run(
        async () => {
          await api.put(`contratos/servicios/${editingService.id}/`, editingService)
        },
        {
          successDescription: 'Servicio actualizado.',
          formatError: (err) => formatApiFormError(err),
        },
      )
    } catch {
      // El error se muestra en FormOverlay
    }
  }

  const closeEditModal = () => {
    if (editOverlay.busy) return
    editOverlay.reset()
    setIsEditModalOpen(false)
    setEditingService(null)
  }

  const handleEditOverlayDismiss = () => {
    if (editOverlay.status === 'success') {
      editOverlay.reset()
      setIsEditModalOpen(false)
      setEditingService(null)
      fetchData()
      return
    }
    editOverlay.dismiss()
  }

  const confirmDeleteService = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`contratos/servicios/${deleteTarget.id}/`)
      setDeleteTarget(null)
      notify({ variant: 'success', text: 'Servicio eliminado.' })
      await fetchData()
    } catch (error) {
      console.error(error)
      notify({ variant: 'danger', text: 'Error al eliminar el servicio.' })
    } finally {
      setDeleting(false)
    }
  }

  const openEditModal = (servicio) => {
    editOverlay.reset()
    setEditingService({
      id: servicio.id,
      nombre: servicio.nombre,
      tipo_servicio: servicio.tipo_servicio,
      contrato: servicio.contrato,
    })
    setIsEditModalOpen(true)
  }

  const columns = [
    {
      key: 'nombre',
      header: 'Servicio / Operación',
      className: 'col--primary',
      cardRole: 'title',
      priority: 1,
      render: (s) => (
        <button
          type="button"
          className="table-link"
          onClick={() =>
            navigate(
              s.contrato
                ? `/contracts/${s.contrato}?tab=servicios`
                : `/contracts/servicios/${s.id}`,
            )
          }
        >
          <strong>{s.nombre}</strong>
          <span className="contracts-cat">
            <span>{s.tipo_servicio_nombre || '—'}</span>
          </span>
        </button>
      ),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      className: 'col--status',
      cardRole: 'status',
      priority: 1,
      render: (s) => (
        <Badge variant="neutral">{s.tipo_servicio_nombre || '—'}</Badge>
      ),
    },
    {
      key: 'contrato',
      header: 'Contrato vinculado',
      className: 'col--secondary',
      cardRole: 'subtitle',
      priority: 1,
      render: (s) => s.contrato_nombre || 'No vinculado',
    },
    {
      key: 'actions',
      header: 'Acciones',
      className: 'col--actions',
      render: (s) => (
        <div className="data-table__actions" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              navigate(
                s.contrato
                  ? `/contracts/${s.contrato}?tab=servicios`
                  : `/contracts/servicios/${s.id}`,
              )
            }
          >
            Abrir
          </Button>
          {can('contratos.change_rutatransporte') ? (
            <Button variant="ghost" size="sm" onClick={() => openEditModal(s)}>
              <Icon name="edit" size="sm" />
            </Button>
          ) : null}
          {can('contratos.delete_rutatransporte') ? (
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(s)}>
              <Icon name="trash" size="sm" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ]

  const contractOptions = contracts.map((c) => (
    <option key={c.id} value={c.id}>
      [{c.codigo_mercado_publico}] {(c.descripcion || '').slice(0, 40)}
      {(c.descripcion || '').length > 40 ? '…' : ''}
    </option>
  ))

  return (
    <div className="page" data-od-id="rutas-page" data-fill-viewport>
      <PageHeader
        icon="rutas"
        title="Gestión de Rutas"
        description={`Panel operativo de rutas de transporte (${servicios.length})`}
        breadcrumbs={[
          { label: 'SSGG' },
          { label: 'Gestión de Rutas' },
        ]}
        linkComponent={Link}
        split
        actions={
          <>
            {can('contratos.change_rutatransporte') ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsFeriadosModalOpen(true)}
              >
                <Icon name="reservas" size="sm" /> Feriados
              </Button>
            ) : null}
            {can('contratos.add_rutatransporte') ? (
              <Button variant="primary" size="sm" onClick={() => {
                createOverlay.reset()
                setIsModalOpen(true)
              }}>
                <Icon name="plus" size="sm" /> Nueva ruta
              </Button>
            ) : null}
          </>
        }
      />

      

      <FiltersBar
        onSearch={() => setPage(1)}
        onClear={() => {
          setSearchTerm('')
          setPage(1)
        }}
      >
        <Field label="Buscar" htmlFor="rutas-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="rutas-q"
              type="search"
              placeholder="Nombre, contrato o tipo…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </Field>
      </FiltersBar>

      <DataTable
        columns={columns}
        rows={pageRows}
        totalCount={filteredServicios.length}
        loading={loading}
        emptyTitle="Sin servicios"
        emptyDescription="No hay registros con la búsqueda actual."
        emptyAction={
          can('contratos.add_rutatransporte') ? (
            <Button variant="primary" size="sm" onClick={() => {
              createOverlay.reset()
              setIsModalOpen(true)
            }}>
              <Icon name="plus" size="sm" /> Nueva ruta
            </Button>
          ) : undefined
        }
        fillViewport
        page={page}
        pageSize={pageSize}
        pageSizeId="rutas-page"
        pageSizeOptions={[10, 25, 50, 100]}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setPage(1)
        }}
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">Servicios operativos</span>
            <Badge variant="neutral">{filteredServicios.length}</Badge>
          </div>
        }
        mobileCardActions={(s) => ({
          primary: {
            label: 'Abrir',
            onClick: () =>
              navigate(
                s.contrato
                  ? `/contracts/${s.contrato}?tab=servicios`
                  : `/contracts/servicios/${s.id}`,
              ),
          },
          secondary: can('contratos.change_rutatransporte')
            ? { label: 'Editar', onClick: () => openEditModal(s) }
            : undefined,
        })}
      />

      <Modal
        open={isModalOpen}
        onClose={closeCreateModal}
        title="Nueva ruta de transporte"
        subheader="Servicio operativo vinculado a un contrato"
        {...createOverlay.modalProps}
        onOverlayDismiss={handleCreateOverlayDismiss}
        footer={
          <>
            <Button
              variant="ghost"
              type="button"
              onClick={closeCreateModal}
              disabled={createOverlay.busy}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="rutas-create-form"
              loading={createOverlay.busy}
              disabled={createOverlay.busy || createOverlay.active}
            >
              Guardar
            </Button>
          </>
        }
      >
        <form id="rutas-create-form" className="crud-form" onSubmit={handleCreateService}>
          <div className="form-grid">
            <Field label="Nombre" required htmlFor="ruta-nombre" className="field--full">
              <Input
                id="ruta-nombre"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </Field>
            <Field label="Contrato" required htmlFor="ruta-contrato" className="field--full">
              <Select
                id="ruta-contrato"
                required
                value={formData.contrato}
                onChange={(e) => setFormData({ ...formData, contrato: e.target.value })}
              >
                <option value="">Seleccionar…</option>
                {contractOptions}
              </Select>
            </Field>
            <Field label="Tipo" required htmlFor="ruta-tipo" className="field--full">
              <Select
                id="ruta-tipo"
                required
                value={formData.tipo_servicio}
                onChange={(e) =>
                  setFormData({ ...formData, tipo_servicio: e.target.value })
                }
              >
                <option value="">Seleccionar…</option>
                {tiposServicios.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </form>
      </Modal>

      <Modal
        open={isEditModalOpen && !!editingService}
        onClose={closeEditModal}
        title="Editar gestión"
        subheader="Actualizar servicio operativo"
        {...editOverlay.modalProps}
        onOverlayDismiss={handleEditOverlayDismiss}
        footer={
          <>
            <Button
              variant="ghost"
              type="button"
              onClick={closeEditModal}
              disabled={editOverlay.busy}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="rutas-edit-form"
              loading={editOverlay.busy}
              disabled={editOverlay.busy || editOverlay.active}
            >
              Guardar cambios
            </Button>
          </>
        }
      >
        {editingService ? (
          <form id="rutas-edit-form" className="crud-form" onSubmit={handleUpdateService}>
            <div className="form-grid">
              <Field label="Nombre" required htmlFor="edit-nombre" className="field--full">
                <Input
                  id="edit-nombre"
                  required
                  value={editingService.nombre || ''}
                  onChange={(e) =>
                    setEditingService({ ...editingService, nombre: e.target.value })
                  }
                />
              </Field>
              <Field
                label="Contrato"
                required
                htmlFor="edit-contrato"
                className="field--full"
              >
                <Select
                  id="edit-contrato"
                  required
                  value={editingService.contrato || ''}
                  onChange={(e) =>
                    setEditingService({ ...editingService, contrato: e.target.value })
                  }
                >
                  <option value="">Seleccionar…</option>
                  {contractOptions}
                </Select>
              </Field>
              <Field label="Tipo" required htmlFor="edit-tipo" className="field--full">
                <Select
                  id="edit-tipo"
                  required
                  value={editingService.tipo_servicio || ''}
                  onChange={(e) =>
                    setEditingService({
                      ...editingService,
                      tipo_servicio: e.target.value,
                    })
                  }
                >
                  <option value="">Seleccionar…</option>
                  {tiposServicios.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </form>
        ) : null}
      </Modal>

      <FeriadosModal
        open={isFeriadosModalOpen}
        onClose={() => setIsFeriadosModalOpen(false)}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        onConfirm={confirmDeleteService}
        title="Eliminar servicio"
        description={
          deleteTarget
            ? `¿Eliminar «${deleteTarget.nombre}»? Se eliminarán todas las rutas asociadas.`
            : ''
        }
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        danger
      />
    </div>
  )
}

export default ServiciosDashboard
