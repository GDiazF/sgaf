import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import GestionAtencionDrawer from '../../components/comunicaciones/GestionAtencionDrawer'
import GestionSeguimientoPanel from '../../components/comunicaciones/GestionSeguimientoPanel'
import {
  PageHeader,
  Button,
  IconButton,
  Icon,
  Alert,
  Badge,
  Select,
  ConfirmModal,
  EmptyState,
  TableSkeleton,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'
import { useNotify } from '../../hooks/useNotify'

const EMPTY_FORM = {
  requerimiento: '',
  descripcion: '',
  subdirecciones_requeridas: [],
  departamentos_requeridos: [],
  unidades_requeridas: [],
  estado: 'PENDIENTE',
  respuesta: '',
}

const ESTADO_BADGE = {
  PENDIENTE: { variant: 'danger', label: 'Pendiente' },
  EN_PROCESO: { variant: 'warning', label: 'En proceso' },
  RESPONDIDO: { variant: 'accent', label: 'Respondido' },
  CERRADO: { variant: 'success', label: 'Cerrado' },
}

const isFinalizada = (gestion) => gestion?.estado === 'RESPONDIDO'
const canManagePasos = (gestion) => !['CERRADO', 'RESPONDIDO'].includes(gestion?.estado)

const EstablecimientoGestion = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [gestiones, setGestiones] = useState([])
  const [establecimiento, setEstablecimiento] = useState(null)
  const [subdirecciones, setSubdirecciones] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [unidades, setUnidades] = useState([])
  const [loading, setLoading] = useState(true)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [savedOk, setSavedOk] = useState(false)
  const [pageError, setPageError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const overlay = useFormOverlay()
  const { notify } = useNotify()

  const [expandedGestion, setExpandedGestion] = useState(null)
  const [newPasos, setNewPasos] = useState({})

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [resEst, resGest, resSub, resDep, resUni] = await Promise.all([
        api.get(`establecimientos/${id}/`),
        api.get(`ejecutivos/gestiones/?establecimiento=${id}&page_size=1000`),
        api.get('subdirecciones/?page_size=1000'),
        api.get('departamentos/?page_size=1000'),
        api.get('unidades/?page_size=1000'),
      ])
      setEstablecimiento(resEst.data)
      setGestiones(resGest.data.results || resGest.data || [])
      setSubdirecciones(resSub.data.results || resSub.data || [])
      setDepartamentos(resDep.data.results || resDep.data || [])
      setUnidades(resUni.data.results || resUni.data || [])
    } catch (error) {
      console.error(error)
      setPageError('No se pudieron cargar las atenciones del establecimiento.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddPaso = async (gestion) => {
    if (!canManagePasos(gestion)) {
      setPageError(
        gestion.estado === 'CERRADO'
          ? 'Para agregar pasos debes cambiar la atención a pendiente o en proceso.'
          : 'La atención respondida finalizó su ciclo y no permite nuevos pasos.',
      )
      return
    }
    const title = newPasos[gestion.id]
    if (!title || !title.trim()) return
    try {
      await api.post('ejecutivos/subtareas/', {
        gestion: gestion.id,
        titulo: title,
        completada: false,
      })
      setNewPasos({ ...newPasos, [gestion.id]: '' })
      fetchData()
    } catch (error) {
      console.error(error)
    }
  }

  const toggleSubtarea = async (sub, gestion) => {
    if (!canManagePasos(gestion)) {
      setPageError(
        gestion.estado === 'CERRADO'
          ? 'Para modificar pasos debes cambiar la atención a pendiente o en proceso.'
          : 'La atención respondida finalizó su ciclo y no permite cambios.',
      )
      return
    }
    try {
      await api.patch(`ejecutivos/subtareas/${sub.id}/`, {
        completada: !sub.completada,
      })
      fetchData()
    } catch (error) {
      console.error(error)
    }
  }

  const closeDrawer = () => {
    if (overlay.busy) return
    overlay.reset()
    setIsFormOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setSavedOk(false)
  }

  const openNewDrawer = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setSavedOk(false)
    overlay.reset()
    setIsFormOpen(true)
  }

  const handleEdit = (g) => {
    if (isFinalizada(g)) {
      setPageError('La atención respondida finalizó su ciclo y no permite edición.')
      return
    }
    const toIds = (arr) => (arr || []).map((item) => (typeof item === 'object' ? item.id : item))
    setEditingId(g.id)
    setForm({
      requerimiento: g.requerimiento || '',
      descripcion: g.descripcion || '',
      subdirecciones_requeridas: toIds(g.subdirecciones_requeridas),
      departamentos_requeridos: toIds(g.departamentos_requeridos),
      unidades_requeridas: toIds(g.unidades_requeridas),
      estado: g.estado || 'PENDIENTE',
      respuesta: g.respuesta || '',
    })
    setSavedOk(false)
    overlay.reset()
    setIsFormOpen(true)
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      setIsFormOpen(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
      if (savedOk) fetchData()
      setSavedOk(false)
      return
    }
    overlay.dismiss()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await overlay.run(
        async () => {
          let ejecutivoId = user?.funcionario_data?.id

          if (!ejecutivoId) {
            const asigRes = await api.get(
              `ejecutivos/asignaciones/?establecimiento=${id}&page_size=100`,
            )
            const asignaciones = asigRes.data.results || asigRes.data || []
            if (asignaciones.length > 0) {
              ejecutivoId = asignaciones[0].funcionario
            } else {
              const err = new Error(
                'No puedes registrar la atención: falta perfil de funcionario o ejecutivo asignado al establecimiento.',
              )
              err.formMessage = err.message
              throw err
            }
          }

          const payload = {
            ...form,
            establecimiento: Number(id),
            ejecutivo: ejecutivoId,
          }

          if (editingId) {
            await api.put(`ejecutivos/gestiones/${editingId}/`, payload)
          } else {
            await api.post('ejecutivos/gestiones/', payload)
          }
          setSavedOk(true)
        },
        {
          successDescription: editingId
            ? 'Atención actualizada correctamente.'
            : 'Atención registrada correctamente.',
          formatError: (err) =>
            formatApiFormError(err, 'Error al guardar la atención.'),
        },
      )
    } catch {
      // FormOverlay
    }
  }

  const handleDelete = (gestion) => {
    if (isFinalizada(gestion)) {
      setPageError('La atención respondida finalizó su ciclo y no permite eliminación.')
      return
    }
    setConfirmDeleteId(gestion.id)
  }

  const confirmDelete = async () => {
    if (!confirmDeleteId) return
    setPageError('')
    try {
      await api.delete(`ejecutivos/gestiones/${confirmDeleteId}/`)
      setConfirmDeleteId(null)
      notify({ variant: 'success', text: 'Atención eliminada.' })
      fetchData()
    } catch (error) {
      console.error(error)
      notify({
        variant: 'danger',
        text: `Error al eliminar: ${
          error.response?.data ? JSON.stringify(error.response.data) : error.message
        }`,
      })
    }
  }

  const handleStatusChange = async (gestion, newStatus) => {
    if (isFinalizada(gestion)) {
      setPageError('La atención respondida finalizó su ciclo y no permite cambios de estado.')
      return
    }
    try {
      await api.patch(`ejecutivos/gestiones/${gestion.id}/`, { estado: newStatus })
      fetchData()
    } catch (error) {
      console.error(error)
    }
  }

  const toggleExpand = (gestionId) => {
    setExpandedGestion((prev) => (prev === gestionId ? null : gestionId))
  }

  return (
    <div
      className="page comunicaciones-gestion-page"
      data-od-id="comunicaciones-gestion-detail-page"
      data-fill-viewport
    >
      <PageHeader
        icon="establecimientos"
        title={establecimiento?.nombre || 'Establecimiento'}
        description="Gestión de acompañamiento y seguimiento"
        breadcrumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Ejecutivos de acompañamiento', to: '/comunicaciones/ejecutivos' },
          { label: establecimiento?.nombre || 'Gestión' },
        ]}
        linkComponent={Link}
        split
        actions={
          <div className="comunicaciones-gestion-page__actions">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => navigate('/comunicaciones/ejecutivos')}
            >
              <Icon name="chevron-left" size="sm" />
              Volver
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={openNewDrawer}>
              <Icon name="plus" size="sm" />
              Nueva atención
            </Button>
          </div>
        }
      />

      {pageError ? (
        <Alert variant="danger" onClose={() => setPageError('')}>
          {pageError}
        </Alert>
      ) : null}

      <div className="data-table-shell data-table-shell--fill comunicaciones-gestion-table">
        <div className="table-toolbar">
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">Atenciones</span>
            <Badge variant="neutral">
              {gestiones.length} registrada{gestiones.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        {loading ? (
          <div className="table-loading">
            <TableSkeleton rows={6} />
          </div>
        ) : gestiones.length === 0 ? (
          <div className="table-empty">
            <EmptyState
              title="Sin atenciones"
              description="Registra la primera atención para este establecimiento."
              action={
                <Button type="button" variant="primary" size="sm" onClick={openNewDrawer}>
                  <Icon name="plus" size="sm" /> Nueva atención
                </Button>
              }
            />
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="comunicaciones-gestion-table__col-num">#</th>
                  <th>Fecha</th>
                  <th>Requerimiento</th>
                  <th>Unidad</th>
                  <th>Respuesta / Avances</th>
                  <th>Estado / Acciones</th>
                </tr>
              </thead>
              <tbody>
                {gestiones.map((g, idx) => {
                  const expanded = expandedGestion === g.id
                  const estadoMeta = ESTADO_BADGE[g.estado] || {
                    variant: 'neutral',
                    label: g.estado,
                  }
                  return (
                    <React.Fragment key={g.id}>
                      <tr
                        className={expanded ? 'is-expanded' : undefined}
                        onClick={() => toggleExpand(g.id)}
                      >
                        <td className="comunicaciones-gestion-table__col-num">
                          {gestiones.length - idx}
                        </td>
                        <td className="comunicaciones-gestion-table__fecha">
                          {new Date(g.fecha).toLocaleDateString('es-CL')}
                        </td>
                        <td>
                          <span className="comunicaciones-gestion-table__req">
                            {g.requerimiento}
                          </span>
                        </td>
                        <td>
                          <div className="comunicaciones-gestion-table__chips">
                            {g.unidades_detalles?.length
                              ? g.unidades_detalles.map((u) => (
                                  <Badge key={u.id} variant="accent">
                                    {u.nombre}
                                  </Badge>
                                ))
                              : (
                                  <span className="comunicaciones-gestion-table__muted">
                                    Gral
                                  </span>
                                )}
                          </div>
                        </td>
                        <td>
                          <div className="comunicaciones-gestion-table__avance">
                            <p>{g.respuesta || 'Sin respuesta'}</p>
                            {g.subtareas?.length > 0 ? (
                              <ul>
                                {g.subtareas.slice(0, 2).map((sub) => (
                                  <li key={sub.id} className={sub.completada ? 'is-done' : ''}>
                                    <Icon name="check" size={12} />
                                    <span>{sub.titulo}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="comunicaciones-gestion-table__actions">
                            {isFinalizada(g) ? (
                              <Badge variant={estadoMeta.variant}>{estadoMeta.label}</Badge>
                            ) : (
                              <Select
                                className="comunicaciones-gestion-table__estado"
                                value={g.estado}
                                onChange={(e) => handleStatusChange(g, e.target.value)}
                                aria-label="Estado"
                              >
                                <option value="PENDIENTE">Pendiente</option>
                                <option value="EN_PROCESO">En proceso</option>
                                <option value="RESPONDIDO">Respondido</option>
                                <option value="CERRADO">Cerrado</option>
                              </Select>
                            )}
                            <Button
                              type="button"
                              variant="quiet"
                              size="sm"
                              disabled={isFinalizada(g)}
                              onClick={() => handleEdit(g)}
                            >
                              Responder
                            </Button>
                            <IconButton
                              type="button"
                              aria-label={expanded ? 'Ocultar seguimiento' : 'Ver seguimiento'}
                              onClick={() => toggleExpand(g.id)}
                            >
                              <Icon name="eye" size={16} />
                            </IconButton>
                            <IconButton
                              type="button"
                              aria-label="Eliminar"
                              danger
                              disabled={isFinalizada(g)}
                              onClick={() => handleDelete(g)}
                            >
                              <Icon name="trash" size={16} />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="comunicaciones-gestion-table__detail-row">
                          <td colSpan={6}>
                            <GestionSeguimientoPanel
                              gestion={g}
                              newPaso={newPasos[g.id] || ''}
                              onNewPasoChange={(value) =>
                                setNewPasos({ ...newPasos, [g.id]: value })
                              }
                              onAddPaso={() => handleAddPaso(g)}
                              onToggleSubtarea={toggleSubtarea}
                              canEditPasos={canManagePasos(g)}
                              lockedReason={
                                g.estado === 'CERRADO'
                                  ? 'Atención cerrada: cambia el estado a pendiente o en proceso para agregar pasos.'
                                  : g.estado === 'RESPONDIDO'
                                    ? 'Atención respondida: ciclo finalizado, no permite cambios.'
                                    : ''
                              }
                            />
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <GestionAtencionDrawer
        isOpen={isFormOpen}
        onClose={closeDrawer}
        editingId={editingId}
        establecimientoNombre={establecimiento?.nombre}
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
        subdirecciones={subdirecciones}
        departamentos={departamentos}
        unidades={unidades}
        isSubmitting={overlay.busy}
        overlayProps={overlay.modalProps}
        onOverlayDismiss={handleOverlayDismiss}
      />

      <ConfirmModal
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
        title="Eliminar atención"
        description="¿Está seguro de que desea eliminar esta atención? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
      />
    </div>
  )
}

export default EstablecimientoGestion
