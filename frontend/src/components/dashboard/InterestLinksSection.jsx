import React, { useState, useEffect } from 'react'
import api from '../../api'
import { usePermission } from '../../hooks/usePermission'
import { useNotify } from '../../hooks/useNotify'
import {
  Card,
  CardHeader,
  Button,
  IconButton,
  Icon,
  Modal,
  ConfirmModal,
  Field,
  Input,
  Select,
  Textarea,
  Switch,
  EmptyState,
  resolveIconName,
  iconLabels,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

/** Iconos disponibles para links / redes (ids canónicos del DS). */
const LINK_ICON_OPTIONS = [
  'link',
  'globe',
  'facebook',
  'instagram',
  'twitter',
  'linkedin',
  'youtube',
  'file',
  'video',
  'message',
  'book',
  'star',
  'box',
  'shield',
  'activity',
  'telefonos',
  'monitor',
  'compras',
  'reservas',
  'procedimientos',
  'briefcase',
  'graduation',
  'external',
]

const emptyForm = (tipo = 'LINK', orden = 0) => ({
  titulo: '',
  tipo,
  url: '',
  icono: tipo === 'RED_SOCIAL' ? 'globe' : 'link',
  descripcion: '',
  orden,
  activo: true,
})


const InterestLinksSection = ({ isSidebar = false, onRefresh = null }) => {
  const { can } = usePermission()
  const { notify } = useNotify()
  const overlay = useFormOverlay()
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLink, setEditingLink] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [activeTab, setActiveTab] = useState('LINK')
  const [formData, setFormData] = useState(emptyForm())
  const [savedOk, setSavedOk] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchLinks()
  }, [])

  const fetchLinks = async () => {
    setLoading(true)
    try {
      const res = await api.get('links-interes/')
      setLinks(res.data.results || res.data || [])
    } catch (e) {
      console.error('Error fetching links', e)
    } finally {
      setLoading(false)
    }
  }

  const closeFormModal = () => {
    if (overlay.busy) return
    overlay.reset()
    setIsModalOpen(false)
    setEditingLink(null)
    setSavedOk(false)
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      setIsModalOpen(false)
      setEditingLink(null)
      if (savedOk) {
        fetchLinks()
        if (onRefresh) onRefresh()
      }
      setSavedOk(false)
      return
    }
    overlay.dismiss()
  }

  const handleOpenModal = (link = null) => {
    if (link) {
      setEditingLink(link)
      setFormData({
        titulo: link.titulo || '',
        tipo: link.tipo || 'LINK',
        url: link.url || '',
        icono: resolveIconName(link.icono, link.tipo === 'RED_SOCIAL' ? 'globe' : 'link'),
        descripcion: link.descripcion || '',
        orden: link.orden ?? 0,
        activo: link.activo !== false,
      })
    } else {
      setEditingLink(null)
      setFormData(emptyForm(activeTab, links.length))
    }
    setSavedOk(false)
    overlay.reset()
    setIsModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const wasEdit = Boolean(editingLink)
    try {
      await overlay.run(
        async () => {
          const payload = {
            ...formData,
            icono: resolveIconName(formData.icono, formData.tipo === 'RED_SOCIAL' ? 'globe' : 'link'),
            orden: Number(formData.orden) || 0,
          }
          if (wasEdit) {
            await api.put(`links-interes/${editingLink.id}/`, payload)
          } else {
            await api.post('links-interes/', payload)
          }
          setSavedOk(true)
        },
        {
          successDescription: wasEdit ? 'Enlace actualizado.' : 'Enlace creado.',
          formatError: (err) => formatApiFormError(err, 'No se pudo guardar el enlace.'),
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
      await api.delete(`links-interes/${deleteTarget.id}/`)
      setDeleteTarget(null)
      notify({ variant: 'success', text: 'Enlace eliminado.' })
      await fetchLinks()
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Error deleting link', err)
      notify({ variant: 'danger', text: 'Error al eliminar el enlace.' })
    } finally {
      setDeleting(false)
    }
  }

  const filteredLinks = links
    .filter((link) => link.tipo === activeTab)
    .filter(
      (link) =>
        !searchTerm ||
        link.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()),
    )

  const renderIcon = (iconName) => (
    <Icon name={resolveIconName(iconName, 'link')} size={16} />
  )

  return (
    <>
      <div className={isSidebar ? 'links-widget links-widget--fill' : 'links-widget'}>
        <Card data-od-id="links-widget" className={isSidebar ? 'links-widget__card' : undefined}>
          <CardHeader
            title={activeTab === 'LINK' ? 'Links de interés' : 'Redes sociales'}
            subtitle="Accesos institucionales"
            actions={
              can('core.add_linkinteres') ? (
                <IconButton aria-label="Agregar link" onClick={() => handleOpenModal()}>
                  <Icon name="plus" size={18} />
                </IconButton>
              ) : null
            }
          />
          <div className="card__body links-widget__body">
            {!isSidebar ? (
              <div className="links-widget__search">
                <Field label="Buscar" htmlFor="links-search">
                  <Input
                    id="links-search"
                    type="search"
                    placeholder="Buscar…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </Field>
              </div>
            ) : null}

            {isSidebar ? (
              <div data-tabs className="links-widget__tabs">
                <div className="tabs">
                  <ul className="tabs__list" role="tablist">
                    <li>
                      <button
                        type="button"
                        className={`tabs__btn${activeTab === 'LINK' ? ' is-active' : ''}`}
                        role="tab"
                        aria-selected={activeTab === 'LINK'}
                        onClick={() => setActiveTab('LINK')}
                      >
                        Links
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`tabs__btn${activeTab === 'RED_SOCIAL' ? ' is-active' : ''}`}
                        role="tab"
                        aria-selected={activeTab === 'RED_SOCIAL'}
                        onClick={() => setActiveTab('RED_SOCIAL')}
                      >
                        Redes
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            ) : null}

            <div className="tabs__panel is-active links-widget__panel" role="tabpanel">
              {loading ? (
                <EmptyState title="Cargando…" />
              ) : filteredLinks.length === 0 ? (
                <EmptyState title="Sin registros" description="No hay enlaces en esta pestaña." />
              ) : (
                <ul className="link-list">
                  {filteredLinks.map((link) => (
                    <li key={link.id} className="links-widget__item">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-list__item"
                        style={!link.activo ? { opacity: 0.5 } : undefined}
                      >
                        {renderIcon(link.icono)}
                        <span className="links-widget__item-title">
                          {link.titulo || link.nombre}
                        </span>
                        <Icon name="external" size={14} className="link-list__ext" />
                      </a>
                      {(can('core.change_linkinteres') || can('core.delete_linkinteres')) && (
                        <div className="links-widget__item-actions">
                          {can('core.change_linkinteres') && (
                            <IconButton
                              aria-label={`Editar ${link.titulo}`}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleOpenModal(link)
                              }}
                            >
                              <Icon name="edit" size={14} />
                            </IconButton>
                          )}
                          {can('core.delete_linkinteres') && (
                            <IconButton
                              danger
                              aria-label={`Eliminar ${link.titulo}`}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setDeleteTarget(link)
                              }}
                            >
                              <Icon name="trash" size={14} />
                            </IconButton>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      </div>

      <Modal
        open={isModalOpen}
        onClose={closeFormModal}
        title={editingLink ? 'Editar link' : 'Nuevo link de interés'}
        subheader={
          editingLink
            ? 'Actualice los datos del acceso institucional.'
            : 'Complete los datos para registrar un nuevo acceso.'
        }
        {...overlay.modalProps}
        onOverlayDismiss={handleOverlayDismiss}
        footer={
          <>
            <Button variant="ghost" type="button" onClick={closeFormModal} disabled={overlay.busy}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="link-interes-form"
              loading={overlay.busy}
              disabled={overlay.busy || overlay.active}
            >
              {editingLink ? 'Guardar cambios' : 'Crear link'}
            </Button>
          </>
        }
      >
        <form id="link-interes-form" className="crud-form" onSubmit={handleSave} noValidate>
          <div className="form-grid">
            <Field label="Título" required htmlFor="link-titulo" className="field--full">
              <Input
                id="link-titulo"
                required
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Portal de pagos"
              />
            </Field>

            <Field label="URL" required htmlFor="link-url" className="field--full">
              <Input
                id="link-url"
                type="url"
                required
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://ejemplo.cl"
              />
            </Field>

            <Field label="Tipo" htmlFor="link-tipo">
              <Select
                id="link-tipo"
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              >
                <option value="LINK">Link de interés</option>
                <option value="RED_SOCIAL">Red social</option>
              </Select>
            </Field>

            <Field label="Icono" htmlFor="link-icono">
              <Select
                id="link-icono"
                value={resolveIconName(formData.icono, 'link')}
                onChange={(e) => setFormData({ ...formData, icono: e.target.value })}
              >
                {LINK_ICON_OPTIONS.map((key) => (
                  <option key={key} value={key}>
                    {iconLabels[key] || key}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Orden" htmlFor="link-orden">
              <Input
                id="link-orden"
                type="number"
                min={0}
                value={formData.orden}
                onChange={(e) => setFormData({ ...formData, orden: e.target.value })}
              />
            </Field>

            <Field label="Descripción" htmlFor="link-desc" className="field--full">
              <Textarea
                id="link-desc"
                value={formData.descripcion || ''}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={3}
                placeholder="Breve descripción del acceso (opcional)"
              />
            </Field>

            <div className="field field--full">
              <Switch
                id="link-activo"
                label="Link activo"
                checked={!!formData.activo}
                onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
              />
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        onConfirm={handleConfirmDelete}
        title="Eliminar link"
        description={
          deleteTarget
            ? `¿Eliminar «${deleteTarget.titulo}»? Esta acción no se puede deshacer.`
            : '¿Eliminar este enlace?'
        }
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        cancelLabel="Cancelar"
        danger
      />
    </>
  )
}

export default InterestLinksSection
