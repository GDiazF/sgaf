import React, { useState, useEffect, useMemo } from 'react'
import api from '../../api'
import MultiSearchableSelect from '../../components/common/MultiSearchableSelect'
import { useNotify } from '../../hooks/useNotify'
import {
  Modal,
  ConfirmModal,
  Button,
  Field,
  Input,
  Select,
  Badge,
  Icon,
  FileInput,
  DataTable,
  Textarea,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const STATUS = {
  vencido: { label: 'Vencido', variant: 'danger' },
  por_vencer: { label: 'Por vencer', variant: 'warning' },
  vigente: { label: 'Vigente', variant: 'success' },
  sin_fecha: { label: 'Sin vigencia', variant: 'neutral' },
  pendiente: { label: 'Pendiente', variant: 'neutral' },
}

function getStatusVencimiento(fecha) {
  if (!fecha) return STATUS.sin_fecha
  const today = new Date()
  const venc = new Date(fecha)
  const diff = (venc - today) / (1000 * 60 * 60 * 24)
  if (diff < 0) return STATUS.vencido
  if (diff < 30) return STATUS.por_vencer
  return STATUS.vigente
}

function formatDateCL(value) {
  if (!value) return '—'
  const raw = String(value).slice(0, 10)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
  if (!m) return String(value)
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('es-CL')
}

const SKIP_FORM_KEYS = new Set([
  'documentos',
  'imagen',
  'display_name',
  'conductores',
  'conductores_detalle',
  'creado_en',
])

const DATE_FIELDS = new Set(['fecha_adquisicion', 'fecha_inscripcion'])

const VehiculoDetalle = ({ vehiculo, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('info')
  const updateOverlay = useFormOverlay()
  const uploadOverlay = useFormOverlay()
  const { notify } = useNotify()
  const [editingVehiculo, setEditingVehiculo] = useState({ ...vehiculo })
  const [conductorIds, setConductorIds] = useState(
    (vehiculo.conductores || []).map((c) => (typeof c === 'object' ? c.id : c)),
  )
  const [documentos, setDocumentos] = useState(vehiculo.documentos || [])
  const [tiposDoc, setTiposDoc] = useState([])
  const [tiposCombustible, setTiposCombustible] = useState([])
  const [funcionarios, setFuncionarios] = useState([])
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedTipoForUpload, setSelectedTipoForUpload] = useState(null)
  const [tipoLocked, setTipoLocked] = useState(false)
  const [newImage, setNewImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(vehiculo.imagen || null)
  const [pendingDeleteDocId, setPendingDeleteDocId] = useState(null)
  const emptyUploadData = {
    archivo: null,
    numero_referencia: '',
    institucion: '',
    fecha_documento: '',
    fecha_vencimiento: '',
    observaciones: '',
    dias_aviso: '',
  }
  const [uploadData, setUploadData] = useState(emptyUploadData)

  useEffect(() => {
    setEditingVehiculo({ ...vehiculo })
    setDocumentos(vehiculo.documentos || [])
    setImagePreview(vehiculo.imagen || null)
    setNewImage(null)
    const fromDetalle = (vehiculo.conductores_detalle || []).map((c) => c.id)
    const fromIds = (vehiculo.conductores || []).map((c) =>
      typeof c === 'object' ? c.id : c,
    )
    setConductorIds(fromDetalle.length ? fromDetalle : fromIds)
  }, [vehiculo])

  useEffect(() => {
    const load = async () => {
      try {
        const [docsRes, fuelRes, funcRes] = await Promise.all([
          api.get('vehiculos/tipos-documento/'),
          api.get('vehiculos/tipos-combustible/'),
          api.get('funcionarios/', { params: { activos: true, page_size: 1000 } }),
        ])
        setTiposDoc(docsRes.data.results || docsRes.data || [])
        setTiposCombustible(fuelRes.data.results || fuelRes.data || [])
        setFuncionarios(funcRes.data.results || funcRes.data || [])
      } catch (error) {
        console.error(error)
      }
    }
    load()
  }, [])

  const conductorOptions = useMemo(
    () =>
      funcionarios.map((f) => ({
        value: f.id,
        label: f.rut ? `${f.nombre_funcionario} (${f.rut})` : f.nombre_funcionario,
      })),
    [funcionarios],
  )

  const docRows = useMemo(
    () =>
      (documentos || []).map((doc) => {
        const tipo =
          tiposDoc.find((t) => t.id === doc.tipo) || {
            id: doc.tipo,
            nombre: doc.tipo_nombre || 'Documento',
            dias_aviso_defecto: 15,
          }
        return {
          id: doc.id,
          tipo,
          doc,
          status: getStatusVencimiento(doc.fecha_vencimiento),
        }
      }),
    [documentos, tiposDoc],
  )

  const handleVehiculoChange = (e) => {
    const { name, value } = e.target
    setEditingVehiculo((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setNewImage(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result)
    reader.readAsDataURL(file)
  }

  const handleClose = () => {
    if (updateOverlay.busy) return
    updateOverlay.reset()
    onClose()
  }

  const handleUpdateOverlayDismiss = () => {
    if (updateOverlay.status === 'success') {
      updateOverlay.reset()
      return
    }
    updateOverlay.dismiss()
  }

  const closeUploadModal = () => {
    if (uploadOverlay.busy) return
    uploadOverlay.reset()
    setUploadOpen(false)
    setSelectedTipoForUpload(null)
    setTipoLocked(false)
  }

  const handleUploadOverlayDismiss = () => {
    if (uploadOverlay.status === 'success') {
      uploadOverlay.reset()
      setUploadOpen(false)
      setSelectedTipoForUpload(null)
      setTipoLocked(false)
      return
    }
    uploadOverlay.dismiss()
  }

  const openUpload = (tipo = null) => {
    uploadOverlay.reset()
    setUploadData({ ...emptyUploadData })
    setSelectedTipoForUpload(tipo)
    setTipoLocked(Boolean(tipo))
    setUploadOpen(true)
  }

  const tiposDisponiblesUpload = useMemo(() => tiposDoc || [], [tiposDoc])

  const handleUpdateVehiculo = async (e) => {
    e?.preventDefault?.()
    const formData = new FormData()
    Object.keys(editingVehiculo).forEach((key) => {
      if (SKIP_FORM_KEYS.has(key)) return
      const val = editingVehiculo[key]
      if (val === null || val === undefined) return
      if (DATE_FIELDS.has(key) && String(val).trim() === '') return
      formData.append(key, val)
    })
    formData.append('conductores', JSON.stringify(conductorIds.map(Number)))
    if (newImage) formData.append('imagen', newImage)

    try {
      await updateOverlay.run(
        async () => {
          const response = await api.put(`vehiculos/flota/${vehiculo.id}/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          onUpdate(response.data)
          setNewImage(null)
        },
        {
          successDescription: 'Información del vehículo actualizada.',
          formatError: (err) =>
            formatApiFormError(err, 'Error al actualizar la información.'),
        },
      )
    } catch {
      // El error se muestra en FormOverlay
    }
  }

  const handleFileUpload = async (e) => {
    e?.preventDefault?.()
    if (!uploadData.archivo || !selectedTipoForUpload) {
      notify({ variant: 'danger', text: 'Seleccione un archivo y tipo.' })
      return
    }
    const formData = new FormData()
    formData.append('vehiculo', vehiculo.id)
    formData.append('tipo', selectedTipoForUpload.id)
    formData.append('archivo', uploadData.archivo)
    if (uploadData.numero_referencia) {
      formData.append('numero_referencia', uploadData.numero_referencia)
    }
    if (uploadData.institucion) {
      formData.append('institucion', uploadData.institucion)
    }
    if (uploadData.fecha_documento) {
      formData.append('fecha_documento', uploadData.fecha_documento)
    }
    if (uploadData.fecha_vencimiento) {
      formData.append('fecha_vencimiento', uploadData.fecha_vencimiento)
    }
    formData.append('observaciones', uploadData.observaciones || '')
    if (uploadData.dias_aviso) {
      formData.append('dias_aviso', uploadData.dias_aviso)
    }

    try {
      await uploadOverlay.run(
        async () => {
          const response = await api.post('vehiculos/documentos/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          const nextDocs = [...documentos, response.data]
          setDocumentos(nextDocs)
          onUpdate?.({ ...vehiculo, documentos: nextDocs })
          setUploadData({ ...emptyUploadData })
        },
        {
          successDescription: 'Documento subido correctamente.',
          formatError: (err) => formatApiFormError(err, 'Error al subir el documento.'),
        },
      )
    } catch {
      // El error se muestra en FormOverlay
    }
  }

  const confirmDeleteDocument = async () => {
    if (!pendingDeleteDocId) return
    try {
      await api.delete(`vehiculos/documentos/${pendingDeleteDocId}/`)
      const nextDocs = documentos.filter((d) => d.id !== pendingDeleteDocId)
      setDocumentos(nextDocs)
      onUpdate?.({ ...vehiculo, documentos: nextDocs })
      setPendingDeleteDocId(null)
      notify({ variant: 'success', text: 'Documento eliminado.' })
    } catch (error) {
      console.error('Error deleting document:', error)
      notify({ variant: 'danger', text: 'Error al eliminar el documento.' })
    }
  }

  const docColumns = useMemo(
    () => [
      {
        key: 'tipo',
        header: 'Tipo',
        className: 'col--primary',
        cardRole: 'title',
        render: (row) => row.tipo?.nombre || row.doc?.tipo_nombre || '—',
      },
      {
        key: 'numero',
        header: 'Nº / póliza',
        render: (row) => row.doc?.numero_referencia || '—',
      },
      {
        key: 'institucion',
        header: 'Institución',
        tabletHide: true,
        render: (row) => row.doc?.institucion || '—',
      },
      {
        key: 'fecha_doc',
        header: 'Fecha doc.',
        tabletHide: true,
        render: (row) => formatDateCL(row.doc?.fecha_documento),
      },
      {
        key: 'estado',
        header: 'Estado',
        className: 'col--status',
        cardRole: 'status',
        render: (row) => (
          <Badge variant={row.status.variant}>{row.status.label}</Badge>
        ),
      },
      {
        key: 'vencimiento',
        header: 'Vencimiento',
        render: (row) => formatDateCL(row.doc?.fecha_vencimiento),
      },
      {
        key: 'observaciones',
        header: 'Obs.',
        tabletHide: true,
        render: (row) => row.doc?.observaciones || '—',
      },
      {
        key: 'acciones',
        header: 'Acciones',
        className: 'col--actions',
        render: (row) => (
          <div className="data-table__actions">
            <Button
              size="sm"
              variant="ghost"
              title="Ver"
              onClick={() =>
                window.open(row.doc.archivo, '_blank', 'noopener,noreferrer')
              }
            >
              <Icon name="eye" size="sm" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              title="Eliminar"
              onClick={() => setPendingDeleteDocId(row.doc.id)}
            >
              <Icon name="trash" size="sm" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  const title = `${vehiculo.marca} ${vehiculo.modelo}`

  return (
    <>
      <Modal
        open={!!vehiculo}
        onClose={handleClose}
        title={title}
        size="xl"
        subheader={vehiculo?.patente || undefined}
        {...updateOverlay.modalProps}
        onOverlayDismiss={handleUpdateOverlayDismiss}
        footer={
          activeTab === 'info' ? (
            <>
              <Button variant="quiet" onClick={handleClose} disabled={updateOverlay.busy}>
                Cerrar
              </Button>
              <Button
                variant="primary"
                onClick={handleUpdateVehiculo}
                loading={updateOverlay.busy}
                disabled={updateOverlay.busy || updateOverlay.active}
              >
                Guardar cambios
              </Button>
            </>
          ) : (
            <Button variant="quiet" onClick={handleClose}>
              Cerrar
            </Button>
          )
        }
      >
        <div className="vehiculos-detalle">
          <div className="vehiculos-detalle__meta">
            <Badge variant="accent">{vehiculo.patente}</Badge>
            <Badge variant="success">Activo</Badge>
            {editingVehiculo.tipo_combustible ? (
              <Badge variant="neutral">{editingVehiculo.tipo_combustible}</Badge>
            ) : null}
            <button
              type="button"
              className="vehiculos-detalle__meta-link"
              onClick={() => setActiveTab('docs')}
            >
              <Badge variant="neutral">{documentos.length} documentos</Badge>
            </button>
          </div>

          <div className="tabs vehiculos-detalle__tabs">
            <ul className="tabs__list" role="tablist">
              <li>
                <button
                  type="button"
                  role="tab"
                  className={`tabs__btn${activeTab === 'info' ? ' is-active' : ''}`}
                  aria-selected={activeTab === 'info'}
                  onClick={() => setActiveTab('info')}
                >
                  Técnica
                </button>
              </li>
              <li>
                <button
                  type="button"
                  role="tab"
                  className={`tabs__btn${activeTab === 'docs' ? ' is-active' : ''}`}
                  aria-selected={activeTab === 'docs'}
                  onClick={() => setActiveTab('docs')}
                >
                  Documentos ({documentos.length})
                </button>
              </li>
            </ul>
          </div>

          {activeTab === 'info' ? (
            <div className="vehiculos-detalle__info">
              <div className="vehiculos-detalle__hero">
                <div className="vehiculos-detalle__photo-preview">
                  {imagePreview ? (
                    <img src={imagePreview} alt={title} />
                  ) : (
                    <div className="vehiculos-detalle__photo-empty">
                      <Icon name="rutas" size={40} />
                      <span>Sin fotografía</span>
                    </div>
                  )}
                </div>
                <FileInput
                  id="veh-foto"
                  label="Cambiar foto"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </div>

              <form onSubmit={handleUpdateVehiculo} className="crud-form vehiculos-detalle__form">
                <div className="form-grid">
                  <Field label="Marca" htmlFor="veh-marca">
                    <Input
                      id="veh-marca"
                      name="marca"
                      value={editingVehiculo.marca || ''}
                      onChange={handleVehiculoChange}
                    />
                  </Field>
                  <Field label="Modelo" htmlFor="veh-modelo">
                    <Input
                      id="veh-modelo"
                      name="modelo"
                      value={editingVehiculo.modelo || ''}
                      onChange={handleVehiculoChange}
                    />
                  </Field>
                  <Field label="Año" htmlFor="veh-anio">
                    <Input
                      id="veh-anio"
                      name="anio"
                      value={editingVehiculo.anio || ''}
                      onChange={handleVehiculoChange}
                    />
                  </Field>
                  <Field label="PPU / Patente" htmlFor="veh-patente">
                    <Input
                      id="veh-patente"
                      name="patente"
                      value={editingVehiculo.patente || ''}
                      onChange={handleVehiculoChange}
                    />
                  </Field>
                  <Field label="Tipo de vehículo" htmlFor="veh-tipo">
                    <Input
                      id="veh-tipo"
                      name="tipo_vehiculo"
                      value={editingVehiculo.tipo_vehiculo || ''}
                      onChange={handleVehiculoChange}
                      placeholder="Ej. Camioneta"
                    />
                  </Field>
                  <Field label="Color" htmlFor="veh-color">
                    <Input
                      id="veh-color"
                      name="color"
                      value={editingVehiculo.color || ''}
                      onChange={handleVehiculoChange}
                    />
                  </Field>
                  <Field label="Tipo combustible" htmlFor="veh-fuel">
                    <Select
                      id="veh-fuel"
                      name="tipo_combustible"
                      value={editingVehiculo.tipo_combustible || ''}
                      onChange={handleVehiculoChange}
                    >
                      <option value="">Seleccionar…</option>
                      {tiposCombustible.map((c) => (
                        <option key={c.id} value={c.nombre}>
                          {c.nombre}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Nº chasis" htmlFor="veh-chasis">
                    <Input
                      id="veh-chasis"
                      name="nro_chasis"
                      value={editingVehiculo.nro_chasis || ''}
                      onChange={handleVehiculoChange}
                    />
                  </Field>
                  <Field label="Nº motor" htmlFor="veh-motor">
                    <Input
                      id="veh-motor"
                      name="nro_motor"
                      value={editingVehiculo.nro_motor || ''}
                      onChange={handleVehiculoChange}
                    />
                  </Field>
                  <Field label="Cilindrada" htmlFor="veh-cilindrada">
                    <Input
                      id="veh-cilindrada"
                      name="cilindrada"
                      value={editingVehiculo.cilindrada || ''}
                      onChange={handleVehiculoChange}
                      placeholder="Ej. 2478"
                    />
                  </Field>
                  <Field label="Fecha de adquisición" htmlFor="veh-adq">
                    <Input
                      id="veh-adq"
                      type="date"
                      name="fecha_adquisicion"
                      value={(editingVehiculo.fecha_adquisicion || '').slice(0, 10)}
                      onChange={handleVehiculoChange}
                    />
                  </Field>
                  <Field label="Fecha de inscripción" htmlFor="veh-insc">
                    <Input
                      id="veh-insc"
                      type="date"
                      name="fecha_inscripcion"
                      value={(editingVehiculo.fecha_inscripcion || '').slice(0, 10)}
                      onChange={handleVehiculoChange}
                    />
                  </Field>
                  <Field
                    label="Lugar de estacionamiento"
                    htmlFor="veh-estacionamiento"
                    className="field--full"
                  >
                    <Input
                      id="veh-estacionamiento"
                      name="lugar_estacionamiento"
                      value={editingVehiculo.lugar_estacionamiento || ''}
                      onChange={handleVehiculoChange}
                      placeholder="Ej. Esmeralda 340"
                    />
                  </Field>
                  <div className="field--full">
                    <MultiSearchableSelect
                      label="Conductores asignados"
                      placeholder="Buscar funcionarios…"
                      options={conductorOptions}
                      value={conductorIds}
                      onChange={setConductorIds}
                    />
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <DataTable
              columns={docColumns}
              rows={docRows}
              emptyTitle="Sin documentos"
              emptyDescription="Aún no hay documentos cargados para este vehículo."
              emptyAction={
                tiposDisponiblesUpload.length > 0 ? (
                  <Button variant="primary" onClick={() => openUpload()}>
                    <Icon name="plus" size="sm" /> Nuevo documento
                  </Button>
                ) : null
              }
              toolbar={
                <>
                  <div className="table-toolbar__left">
                    <span className="table-toolbar__title">Documentos</span>
                    <Badge variant="neutral">{documentos.length}</Badge>
                  </div>
                  <div className="table-toolbar__right">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openUpload()}
                      disabled={tiposDisponiblesUpload.length === 0}
                      title={
                        tiposDisponiblesUpload.length === 0
                          ? 'Configure tipos de documento primero'
                          : 'Agregar documento'
                      }
                    >
                      <Icon name="plus" size="sm" /> Nuevo documento
                    </Button>
                  </div>
                </>
              }
            />
          )}
        </div>
      </Modal>

      <Modal
        open={uploadOpen}
        onClose={closeUploadModal}
        title="Nuevo documento"
        subheader={tipoLocked ? selectedTipoForUpload?.nombre : undefined}
        {...uploadOverlay.modalProps}
        onOverlayDismiss={handleUploadOverlayDismiss}
        footer={
          <>
            <Button
              variant="quiet"
              onClick={closeUploadModal}
              disabled={uploadOverlay.busy}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleFileUpload}
              loading={uploadOverlay.busy}
              disabled={
                uploadOverlay.busy ||
                uploadOverlay.active ||
                !selectedTipoForUpload ||
                !uploadData.archivo
              }
            >
              Guardar
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <Field
            label="Tipo de documento"
            htmlFor="doc-tipo"
            required
            className="field--full"
          >
            <Select
              id="doc-tipo"
              value={selectedTipoForUpload?.id || ''}
              disabled={tipoLocked}
              onChange={(e) => {
                const tipo = tiposDisponiblesUpload.find(
                  (t) => String(t.id) === String(e.target.value),
                )
                setSelectedTipoForUpload(tipo || null)
              }}
            >
              <option value="">Seleccionar…</option>
              {(tipoLocked && selectedTipoForUpload
                ? [selectedTipoForUpload]
                : tiposDisponiblesUpload
              ).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nº documento / póliza" htmlFor="doc-num">
            <Input
              id="doc-num"
              value={uploadData.numero_referencia}
              onChange={(e) =>
                setUploadData({ ...uploadData, numero_referencia: e.target.value })
              }
              placeholder="Ej. número de póliza"
            />
          </Field>
          <Field label="Institución / emisor" htmlFor="doc-inst">
            <Input
              id="doc-inst"
              value={uploadData.institucion}
              onChange={(e) =>
                setUploadData({ ...uploadData, institucion: e.target.value })
              }
              placeholder="Ej. aseguradora"
            />
          </Field>
          <Field label="Emisión" htmlFor="doc-fecha">
            <Input
              id="doc-fecha"
              type="date"
              value={uploadData.fecha_documento}
              onChange={(e) =>
                setUploadData({ ...uploadData, fecha_documento: e.target.value })
              }
            />
          </Field>
          <Field label="Vencimiento" htmlFor="doc-venc">
            <Input
              id="doc-venc"
              type="date"
              value={uploadData.fecha_vencimiento}
              onChange={(e) =>
                setUploadData({ ...uploadData, fecha_vencimiento: e.target.value })
              }
            />
          </Field>
          <Field label="Días aviso previo" htmlFor="doc-aviso">
            <Input
              id="doc-aviso"
              inputMode="numeric"
              placeholder={`Defecto: ${selectedTipoForUpload?.dias_aviso_defecto || 15}`}
              value={uploadData.dias_aviso}
              onChange={(e) =>
                setUploadData({ ...uploadData, dias_aviso: e.target.value })
              }
            />
          </Field>
          <Field label="Observaciones" htmlFor="doc-obs" className="field--full">
            <Textarea
              id="doc-obs"
              rows={2}
              value={uploadData.observaciones}
              onChange={(e) =>
                setUploadData({ ...uploadData, observaciones: e.target.value })
              }
              placeholder="Notas opcionales del documento"
            />
          </Field>
          <Field label="Archivo" htmlFor="doc-file" className="field--full" required>
            <FileInput
              id="doc-file"
              label={
                uploadData.archivo
                  ? uploadData.archivo.name
                  : 'Seleccionar archivo'
              }
              onChange={(e) =>
                setUploadData({
                  ...uploadData,
                  archivo: e.target.files?.[0] || null,
                })
              }
            />
          </Field>
        </div>
      </Modal>

      <ConfirmModal
        open={!!pendingDeleteDocId}
        onClose={() => setPendingDeleteDocId(null)}
        onConfirm={confirmDeleteDocument}
        title="Eliminar documento"
        description="¿Eliminar este documento? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
      />
    </>
  )
}

export default VehiculoDetalle
