import React, { useState, useEffect } from 'react'
import api from '../../api'
import SearchableSelect from '../common/SearchableSelect'
import {
  Modal,
  Button,
  Field,
  Input,
  Select,
  Alert,
  Icon,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const EMPTY_FORM = {
  tipo: '',
  nombre: '',
  codigo_inventario: '',
  establecimiento: '',
  ubicacion: '',
}

const AssetModal = ({
  open,
  onClose,
  onSave,
  editingId,
  initialData,
  lookups: { establishments = [] } = {},
}) => {
  const [tipoOptions, setTipoOptions] = useState([])
  const [loadingTypes, setLoadingTypes] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const overlay = useFormOverlay()

  useEffect(() => {
    if (!open) return

    const fetchTypes = async () => {
      setLoadingTypes(true)
      try {
        const response = await api.get('tipo-activos/')
        const data = Array.isArray(response.data)
          ? response.data
          : response.data?.results || []
        setTipoOptions(
          data.map((t) => ({
            value: t.id,
            label: t.nombre,
          })),
        )
      } catch (error) {
        console.error('Error fetching types:', error)
        setTipoOptions([])
      } finally {
        setLoadingTypes(false)
      }
    }

    fetchTypes()
  }, [open])

  useEffect(() => {
    if (!open) return
    overlay.reset()

    if (initialData) {
      setFormData({
        tipo: initialData.tipo ?? '',
        nombre: initialData.nombre ?? '',
        codigo_inventario: initialData.codigo_inventario ?? '',
        establecimiento: initialData.establecimiento ?? '',
        ubicacion: initialData.ubicacion ?? '',
      })
    } else {
      setFormData({
        ...EMPTY_FORM,
        tipo: tipoOptions.length > 0 ? tipoOptions[0].value : '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset solo al abrir
  }, [initialData, open, tipoOptions])

  const establishmentOptions = establishments.map((est) => ({
    value: est.id,
    label: est.nombre,
  }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await overlay.run(
        async () => {
          await onSave(formData)
        },
        {
          successDescription: editingId ? 'Activo actualizado.' : 'Activo registrado.',
          formatError: (err) => formatApiFormError(err, 'Error al guardar el activo.'),
        },
      )
    } catch {
      // FormOverlay
    }
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      onClose?.({ saved: true })
      return
    }
    overlay.dismiss()
  }

  const handleClose = () => {
    if (overlay.busy) return
    overlay.reset()
    onClose?.()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="lg"
      title={editingId ? 'Editar activo' : 'Registrar nuevo activo'}
      subheader="Gestione el inventario de hardware y recursos físicos"
      {...overlay.modalProps}
      onOverlayDismiss={handleOverlayDismiss}
      footer={
        <>
          <Button variant="quiet" type="button" onClick={handleClose} disabled={overlay.busy}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="asset-form"
            loading={overlay.busy}
            disabled={overlay.busy || overlay.active || loadingTypes}
          >
            {editingId ? 'Actualizar activo' : 'Registrar activo'}
          </Button>
        </>
      }
    >
      <form id="asset-form" className="crud-form" onSubmit={handleSubmit}>
        <p className="contracts-section-title">
          <Icon name="box" size="sm" /> Identificación del activo
        </p>
        <div className="form-grid">
          <Field label="Tipo de activo" htmlFor="asset-tipo" required>
            <Select
              id="asset-tipo"
              required
              disabled={loadingTypes}
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
            >
              <option value="">
                {loadingTypes ? 'Cargando…' : 'Seleccionar…'}
              </option>
              {tipoOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Código de inventario"
            htmlFor="asset-codigo"
            hint="Opcional"
          >
            <Input
              id="asset-codigo"
              placeholder="Ej: S/N…"
              value={formData.codigo_inventario}
              onChange={(e) =>
                setFormData({ ...formData, codigo_inventario: e.target.value })
              }
            />
          </Field>

          <Field
            label="Nombre / descripción"
            htmlFor="asset-nombre"
            required
            className="field--full"
          >
            <Input
              id="asset-nombre"
              required
              placeholder="Ej: Proyector Epson X10…"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            />
          </Field>

          <div className="field field--full">
            <SearchableSelect
              label="Establecimiento base"
              required
              options={establishmentOptions}
              value={formData.establecimiento}
              onChange={(val) => setFormData({ ...formData, establecimiento: val })}
              placeholder="Seleccione establecimiento…"
            />
          </div>
        </div>

        <p className="contracts-section-title">
          <Icon name="info" size="sm" /> Ubicación física
        </p>
        <div className="form-grid">
          <Field
            label="Bodega / estante"
            htmlFor="asset-ubicacion"
            hint="Opcional"
            className="field--full"
          >
            <Input
              id="asset-ubicacion"
              placeholder="Ej: Casillero 4A…"
              value={formData.ubicacion}
              onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
            />
          </Field>
        </div>

        <Alert variant="info" title="Inventario centralizado">
          Administre sus activos de forma centralizada. Los tipos de activos pueden
          gestionarse desde el panel de administración.
        </Alert>
      </form>
    </Modal>
  )
}

export default AssetModal
