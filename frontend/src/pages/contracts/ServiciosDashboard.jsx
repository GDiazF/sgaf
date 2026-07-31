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
  EmptyState,
  Icon,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

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
  const [feriados, setFeriados] = useState([])
  const feriadosOverlay = useFormOverlay()

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteFeriadoTarget, setDeleteFeriadoTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const { notify } = useNotify()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [servRes, contRes, tiposRes] = await Promise.all([
        api.get('contratos/servicios/'),
        api.get('contratos/contratos/', { params: { page_size: 1000 } }),
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

  const fetchFeriados = async () => {
    try {
      const res = await api.get('contratos/feriados/')
      setFeriados(res.data.results || res.data)
    } catch (error) {
      console.error(error)
    }
  }

  const handleSyncFeriados = async () => {
    try {
      await feriadosOverlay.run(
        async () => {
          const anios = [2024, 2025, 2026]
          let totalCreados = 0

          for (const anio of anios) {
            let data = null
            try {
              const response = await fetch(
                `https://feriados-cl.netlify.app/api/holidays/${anio}`,
              )
              if (response.ok) data = await response.json()
            } catch (e) {
              console.error(`Netlify fail for ${anio}`, e)
            }

            if (!data || !data.feriados) {
              try {
                const response = await fetch(
                  'https://api.victorsanmartin.com/feriados/en.json',
                )
                if (response.ok) {
                  const raw = await response.json()
                  data = {
                    feriados: {
                      all: raw
                        .filter((f) => f.date.startsWith(String(anio)))
                        .map((f) => ({
                          ...f,
                          dia: parseInt(f.date.split('-')[2], 10),
                          mes: parseInt(f.date.split('-')[1], 10),
                        })),
                    },
                  }
                }
              } catch (e) {
                console.error(`VictorSM fail for ${anio}`, e)
              }
            }

            if (!data || !data.feriados) continue

            const feriadosList = []
            Object.entries(data.feriados).forEach(([, items]) => {
              items.forEach((item) => {
                const mesPad = String(item.mes).padStart(2, '0')
                const diaPad = String(item.dia).padStart(2, '0')
                feriadosList.push({
                  fecha: `${anio}-${mesPad}-${diaPad}`,
                  descripcion: item.descripcion || item.title,
                })
              })
            })

            if (feriadosList.length > 0) {
              const res = await api.post('contratos/feriados/bulk_create/', feriadosList)
              totalCreados += res.data.creados
            }
          }

          return totalCreados
        },
        {
          successDescription: 'Feriados sincronizados correctamente.',
          formatError: (err) =>
            err?.message || formatApiFormError(err, 'Error al sincronizar feriados.'),
        },
      )
      await fetchFeriados()
    } catch {
      // El error se muestra en FormOverlay
    }
  }

  const closeFeriadosModal = () => {
    if (feriadosOverlay.busy) return
    feriadosOverlay.reset()
    setIsFeriadosModalOpen(false)
  }

  const handleFeriadosOverlayDismiss = () => {
    if (feriadosOverlay.status === 'success') {
      feriadosOverlay.reset()
      fetchFeriados()
      return
    }
    feriadosOverlay.dismiss()
  }

  const confirmDeleteFeriado = async () => {
    if (!deleteFeriadoTarget) return
    setDeleting(true)
    try {
      await api.delete(`contratos/feriados/${deleteFeriadoTarget.id}/`)
      setDeleteFeriadoTarget(null)
      await fetchFeriados()
      notify({ variant: 'success', text: 'Feriado eliminado.' })
    } catch (error) {
      console.error(error)
      notify({ variant: 'danger', text: 'Error al eliminar feriado.' })
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    if (isFeriadosModalOpen) fetchFeriados()
  }, [isFeriadosModalOpen])

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
          onClick={() => navigate(`/contracts/servicios/${s.id}`)}
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
            onClick={() => navigate(`/contracts/servicios/${s.id}`)}
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
            onClick: () => navigate(`/contracts/servicios/${s.id}`),
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

      <Modal
        open={isFeriadosModalOpen}
        onClose={closeFeriadosModal}
        size="lg"
        title="Calendario de feriados"
        subheader="Configuración nacional para exclusión de días"
        {...feriadosOverlay.modalProps}
        onOverlayDismiss={handleFeriadosOverlayDismiss}
        footer={
          <Button
            variant="secondary"
            type="button"
            onClick={closeFeriadosModal}
            disabled={feriadosOverlay.busy}
          >
            Cerrar
          </Button>
        }
      >
        <div className="rutas-feriados">
          <div className="rutas-feriados__sync">
            <div>
              <p className="rutas-feriados__sync-title">Sincronización automática</p>
              <p className="rutas-feriados__sync-hint">
                Obtener feriados 2024–2026 desde fuentes públicas
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSyncFeriados}
              loading={feriadosOverlay.busy}
              disabled={feriadosOverlay.busy || feriadosOverlay.active}
            >
              <Icon name="download" size="sm" /> Sincronizar
            </Button>
          </div>

          {feriados.length === 0 && !feriadosOverlay.busy ? (
            <EmptyState
              title="Sin feriados"
              description="No hay feriados cargados. Sincronizá el calendario nacional."
            />
          ) : (
            <ul className="rutas-feriados__list">
              {feriados.map((f) => (
                <li key={f.id} className="rutas-feriados__item">
                  <div>
                    <strong>{f.descripcion}</strong>
                    <span>{f.fecha}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Eliminar feriado"
                    onClick={() => setDeleteFeriadoTarget(f)}
                  >
                    <Icon name="trash" size="sm" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

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

      <ConfirmModal
        open={!!deleteFeriadoTarget}
        onClose={() => {
          if (!deleting) setDeleteFeriadoTarget(null)
        }}
        onConfirm={confirmDeleteFeriado}
        title="Eliminar feriado"
        description={
          deleteFeriadoTarget
            ? `¿Eliminar «${deleteFeriadoTarget.descripcion}» (${deleteFeriadoTarget.fecha})?`
            : ''
        }
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        danger
      />
    </div>
  )
}

export default ServiciosDashboard
