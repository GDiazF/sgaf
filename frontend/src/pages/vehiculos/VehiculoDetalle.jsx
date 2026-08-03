import React, { useState, useEffect } from 'react'
import api from '../../api'
import { useNotify } from '../../hooks/useNotify'
import {
  Drawer,
  Modal,
  ConfirmModal,
  Button,
  Field,
  Input,
  Select,
  Badge,
  Icon,
  FileInput,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const ICON_MAP = {
  FileText: 'file',
  ShieldCheck: 'shield',
  Calendar: 'reservas',
  Wrench: 'procedimientos',
  Info: 'info',
  FileIcon: 'file',
}

const STATUS = {
  vencido: { label: 'Vencido', variant: 'danger' },
  por_vencer: { label: 'Por vencer', variant: 'warning' },
  vigente: { label: 'Vigente', variant: 'success' },
  sin_fecha: { label: 'Sin vigencia', variant: 'neutral' },
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

const VehiculoDetalle = ({ vehiculo, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('info')
  const updateOverlay = useFormOverlay()
  const uploadOverlay = useFormOverlay()
  const { notify } = useNotify()
  const [editingVehiculo, setEditingVehiculo] = useState({ ...vehiculo })
  const [documentos, setDocumentos] = useState(vehiculo.documentos || [])
  const [tiposDoc, setTiposDoc] = useState([])
  const [tiposCombustible, setTiposCombustible] = useState([])
  const [selectedTipoForUpload, setSelectedTipoForUpload] = useState(null)
  const [newImage, setNewImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(vehiculo.imagen || null)
  const [pendingDeleteDocId, setPendingDeleteDocId] = useState(null)
  const [uploadData, setUploadData] = useState({
    archivo: null,
    fecha_vencimiento: '',
    observaciones: '',
    dias_aviso: '',
  })

  useEffect(() => {
    setEditingVehiculo({ ...vehiculo })
    setDocumentos(vehiculo.documentos || [])
    setImagePreview(vehiculo.imagen || null)
    setNewImage(null)
  }, [vehiculo])

  useEffect(() => {
    const load = async () => {
      try {
        const [docsRes, fuelRes] = await Promise.all([
          api.get('vehiculos/tipos-documento/'),
          api.get('vehiculos/tipos-combustible/'),
        ])
        setTiposDoc(docsRes.data.results || docsRes.data)
        setTiposCombustible(fuelRes.data.results || fuelRes.data)
      } catch (error) {
        console.error(error)
      }
    }
    load()
  }, [])

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
    setSelectedTipoForUpload(null)
  }

  const handleUploadOverlayDismiss = () => {
    if (uploadOverlay.status === 'success') {
      uploadOverlay.reset()
      setSelectedTipoForUpload(null)
      return
    }
    uploadOverlay.dismiss()
  }

  const handleUpdateVehiculo = async (e) => {
    e?.preventDefault?.()
    const formData = new FormData()
    Object.keys(editingVehiculo).forEach((key) => {
      if (
        editingVehiculo[key] !== null &&
        key !== 'documentos' &&
        key !== 'imagen'
      ) {
        formData.append(key, editingVehiculo[key])
      }
    })
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
          setDocumentos((prev) => [...prev, response.data])
          setUploadData({
            archivo: null,
            fecha_vencimiento: '',
            observaciones: '',
            dias_aviso: '',
          })
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
      setDocumentos((prev) => prev.filter((d) => d.id !== pendingDeleteDocId))
      setPendingDeleteDocId(null)
      notify({ variant: 'success', text: 'Documento eliminado.' })
    } catch (error) {
      console.error('Error deleting document:', error)
      notify({ variant: 'danger', text: 'Error al eliminar el documento.' })
    }
  }

  const title = `${vehiculo.marca} ${vehiculo.modelo}`

  return (
    <>
      <Drawer
        open={!!vehiculo}
        onClose={handleClose}
        title={title}
        wide
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
                  <Field label="Patente" htmlFor="veh-patente">
                    <Input
                      id="veh-patente"
                      name="patente"
                      value={editingVehiculo.patente || ''}
                      onChange={handleVehiculoChange}
                    />
                  </Field>
                  <Field label="Tipo combustible" htmlFor="veh-fuel" className="field--full">
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
                  <Field label="VIN / Chasis" htmlFor="veh-chasis">
                    <Input
                      id="veh-chasis"
                      name="nro_chasis"
                      value={editingVehiculo.nro_chasis || ''}
                      onChange={handleVehiculoChange}
                    />
                  </Field>
                  <Field label="Nro. motor" htmlFor="veh-motor">
                    <Input
                      id="veh-motor"
                      name="nro_motor"
                      value={editingVehiculo.nro_motor || ''}
                      onChange={handleVehiculoChange}
                    />
                  </Field>
                </div>
              </form>
            </div>
          ) : (
            <div className="vehiculos-docs-grid">
              {tiposDoc.map((tipo) => {
                const docCargado = documentos.find((d) => d.tipo === tipo.id)
                const status = docCargado
                  ? getStatusVencimiento(docCargado.fecha_vencimiento)
                  : null
                return (
                  <article key={tipo.id} className="vehiculos-doc-card">
                    <div className="vehiculos-doc-card__head">
                      <Icon name={ICON_MAP[tipo.icono] || 'file'} size={18} />
                      {docCargado ? (
                        <Badge variant={status.variant}>{status.label}</Badge>
                      ) : (
                        <Badge variant="neutral">Pendiente</Badge>
                      )}
                    </div>
                    <h4>{tipo.nombre}</h4>
                    {docCargado ? (
                      <p>
                        Vence: {docCargado.fecha_vencimiento || 'No expira'}
                      </p>
                    ) : (
                      <p>Documento aún no cargado.</p>
                    )}
                    <div className="vehiculos-doc-card__actions">
                      {docCargado ? (
                        <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            window.open(docCargado.archivo, '_blank', 'noopener,noreferrer')
                          }
                        >
                          <Icon name="download" size="sm" /> Ver
                        </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPendingDeleteDocId(docCargado.id)}
                          >
                            <Icon name="trash" size="sm" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            uploadOverlay.reset()
                            setUploadData({
                              archivo: null,
                              fecha_vencimiento: '',
                              observaciones: '',
                              dias_aviso: '',
                            })
                            setSelectedTipoForUpload(tipo)
                          }}
                        >
                          <Icon name="plus" size="sm" /> Cargar
                        </Button>
                      )}
                    </div>
                  </article>
                )
              })}
              {tiposDoc.length === 0 ? (
                <p className="vehiculos-flota-empty">
                  No hay tipos de documento configurados.
                </p>
              ) : null}
            </div>
          )}
        </div>
      </Drawer>

      <Modal
        open={!!selectedTipoForUpload}
        onClose={closeUploadModal}
        title="Cargar documento"
        subheader={selectedTipoForUpload?.nombre}
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
              disabled={uploadOverlay.busy || uploadOverlay.active}
            >
              Vincular documento
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <Field label="Fecha de vencimiento" htmlFor="doc-venc">
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
          <Field label="Archivo" htmlFor="doc-file" className="field--full">
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
