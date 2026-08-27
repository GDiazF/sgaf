import React, { useEffect, useState } from 'react'
import {
  Modal,
  Button,
  Field,
  Input,
  Select,
  Switch,
  FileInput,
  FormStatus,
  Icon,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const emptyForm = (establishmentTypes = []) => ({
  rbd: '',
  nombre: '',
  tipo: establishmentTypes.length > 0 ? establishmentTypes[0].id : '',
  direccion: '',
  ciudad: 'Iquique',
  director: '',
  email: '',
  email_director: '',
  url_web: '',
  latitud: '',
  longitud: '',
  activo: true,
  telefono_principal: '',
})

const EstablishmentModal = ({
  isOpen,
  onClose,
  onSave,
  editingId,
  initialData,
  establishmentTypes = [],
}) => {
  const [formData, setFormData] = useState(emptyForm(establishmentTypes))
  const [coordsString, setCoordsString] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const overlay = useFormOverlay()

  useEffect(() => {
    if (!isOpen) return
    overlay.reset()
    if (initialData && editingId) {
      const principal =
        initialData.telefonos?.find((p) => p.es_principal) || initialData.telefonos?.[0]
      setFormData({
        ...emptyForm(establishmentTypes),
        ...initialData,
        telefono_principal: principal ? principal.numero : '',
      })
      setCoordsString(
        initialData.latitud && initialData.longitud
          ? `${initialData.latitud}, ${initialData.longitud}`
          : '',
      )
      setLogoPreview(initialData.logo || null)
      setLogoFile(null)
    } else {
      setFormData(emptyForm(establishmentTypes))
      setCoordsString('')
      setLogoPreview(null)
      setLogoFile(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset solo al abrir
  }, [initialData, isOpen, establishmentTypes, editingId])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleCoordsChange = (value) => {
    setCoordsString(value)
    const parts = value.split(',').map((p) => p.trim())
    if (parts.length === 2) {
      setFormData((prev) => ({ ...prev, latitud: parts[0], longitud: parts[1] }))
    } else if (value === '') {
      setFormData((prev) => ({ ...prev, latitud: '', longitud: '' }))
    }
  }

  const handleFormSave = async (e) => {
    e.preventDefault()
    try {
      await overlay.run(
        async () => {
          const data = { ...formData }
          if (logoFile) data.logo = logoFile
          await onSave(data)
        },
        {
          successDescription: editingId
            ? 'Establecimiento actualizado.'
            : 'Establecimiento creado.',
          formatError: (err) => formatApiFormError(err),
        },
      )
    } catch {
      // El error se muestra en FormOverlay
    }
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      onClose({ saved: true })
      return
    }
    overlay.dismiss()
  }

  const handleClose = () => {
    if (overlay.busy) return
    overlay.reset()
    onClose()
  }

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      size="lg"
      title={editingId ? 'Editar establecimiento' : 'Nuevo establecimiento'}
      subheader="Información base de la institución educativa"
      {...overlay.modalProps}
      onOverlayDismiss={handleOverlayDismiss}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={handleClose} disabled={overlay.busy}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="est-form"
            loading={overlay.busy}
            disabled={overlay.busy || overlay.active}
          >
            <Icon name="plus" size="sm" />
            {editingId ? 'Guardar cambios' : 'Crear establecimiento'}
          </Button>
        </>
      }
    >
      <form id="est-form" className="crud-form" onSubmit={handleFormSave} noValidate>
        <div className="form-grid">
          <Field label="Logo" htmlFor="est-logo" className="field--full">
            <div className="est-logo-field">
              <div className="est-logo-field__preview" aria-hidden="true">
                {logoPreview ? (
                  <img src={logoPreview} alt="" />
                ) : (
                  <Icon name="establecimientos" size={28} />
                )}
              </div>
              <FileInput
                id="est-logo"
                label="Seleccionar imagen"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
          </Field>

          <Field label="RBD nacional" required htmlFor="est-rbd">
            <Input
              id="est-rbd"
              type="number"
              required
              placeholder="Ej: 12345"
              value={formData.rbd}
              onChange={(e) => setFormData({ ...formData, rbd: e.target.value })}
            />
          </Field>

          <Field label="Tipo de institución" required htmlFor="est-tipo">
            <Select
              id="est-tipo"
              required
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
            >
              <option value="">Seleccionar…</option>
              {establishmentTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Nombre oficial" required htmlFor="est-nombre" className="field--full">
            <Input
              id="est-nombre"
              required
              placeholder="Nombre completo de la institución"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            />
          </Field>

          <Field label="Director/a" htmlFor="est-director">
            <Input
              id="est-director"
              placeholder="Nombre del directivo"
              value={formData.director || ''}
              onChange={(e) => setFormData({ ...formData, director: e.target.value })}
            />
          </Field>

          <Field label="Correo institucional" htmlFor="est-email">
            <Input
              id="est-email"
              type="email"
              placeholder="ejemplo@slep.cl"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </Field>

          <Field label="Correo del director/a" htmlFor="est-email-director">
            <Input
              id="est-email-director"
              type="email"
              placeholder="director@slep.cl"
              value={formData.email_director || ''}
              onChange={(e) =>
                setFormData({ ...formData, email_director: e.target.value })
              }
            />
          </Field>

          <Field label="Página web" htmlFor="est-web">
            <Input
              id="est-web"
              type="url"
              placeholder="https://www.ejemplo.cl"
              value={formData.url_web || ''}
              onChange={(e) => setFormData({ ...formData, url_web: e.target.value })}
            />
          </Field>

          <Field label="Teléfono principal" htmlFor="est-tel">
            <Input
              id="est-tel"
              placeholder="Ej: +56 9 1234 5678"
              value={formData.telefono_principal || ''}
              onChange={(e) =>
                setFormData({ ...formData, telefono_principal: e.target.value })
              }
            />
          </Field>

          <div className="field--full">
            <FormStatus
              variant="info"
              title="Teléfonos adicionales"
              description="Se gestionan desde el ícono de teléfono en el listado."
            />
          </div>

          <Field label="Dirección física" htmlFor="est-dir" className="field--full">
            <Input
              id="est-dir"
              placeholder="Calle, número"
              value={formData.direccion || ''}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
            />
          </Field>

          <Field label="Ciudad" htmlFor="est-ciudad">
            <Input
              id="est-ciudad"
              placeholder="Iquique"
              value={formData.ciudad || ''}
              onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
            />
          </Field>

          <Field label="Coordenadas GPS (lat, long)" htmlFor="est-coords" className="field--full">
            <Input
              id="est-coords"
              placeholder="Ej: -20.21, -70.14"
              value={coordsString}
              onChange={(e) => handleCoordsChange(e.target.value)}
            />
          </Field>

          <div className="field field--full" style={{ paddingTop: '0.25rem' }}>
            <Switch
              checked={!!formData.activo}
              onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
              label="Establecimiento activo"
            />
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default EstablishmentModal
