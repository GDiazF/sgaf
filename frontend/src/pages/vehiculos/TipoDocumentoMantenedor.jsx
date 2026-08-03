import React, { useState, useEffect } from 'react'
import api from '../../api'
import { useNotify } from '../../hooks/useNotify'
import {
  Modal,
  ConfirmModal,
  Button,
  Field,
  Input,
  Icon,
  Badge,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const DOC_ICONS = [
  { id: 'FileText', icon: 'file' },
  { id: 'ShieldCheck', icon: 'shield' },
  { id: 'Calendar', icon: 'reservas' },
  { id: 'Wrench', icon: 'procedimientos' },
  { id: 'Info', icon: 'info' },
  { id: 'FileIcon', icon: 'file' },
]

const COLORS = [
  { id: 'blue', label: 'Azul' },
  { id: 'emerald', label: 'Verde' },
  { id: 'amber', label: 'Ámbar' },
  { id: 'rose', label: 'Rojo' },
  { id: 'slate', label: 'Gris' },
]

const DEFAULT_TIPO = {
  nombre: '',
  icono: 'FileText',
  color: 'blue',
  requerido: false,
  dias_aviso_defecto: 15,
}

const TipoDocumentoMantenedor = ({ isOpen, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('docs')
  const [tipos, setTipos] = useState([])
  const [combustibles, setCombustibles] = useState([])
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const overlay = useFormOverlay()
  const { notify } = useNotify()

  const [newTipo, setNewTipo] = useState({ ...DEFAULT_TIPO })
  const [newFuel, setNewFuel] = useState({ nombre: '' })

  const fetchTipos = async () => {
    try {
      const response = await api.get('vehiculos/tipos-documento/')
      setTipos(response.data.results || response.data)
    } catch (error) {
      console.error(error)
    }
  }

  const fetchFuel = async () => {
    try {
      const response = await api.get('vehiculos/tipos-combustible/')
      setCombustibles(response.data.results || response.data)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    setActiveTab('docs')
    setNewTipo({ ...DEFAULT_TIPO })
    setNewFuel({ nombre: '' })
    setPendingDelete(null)
    overlay.reset()
    fetchTipos()
    fetchFuel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const handleClose = () => {
    if (overlay.busy || deleting) return
    overlay.reset()
    onClose()
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      if (activeTab === 'docs') {
        setNewTipo({ ...DEFAULT_TIPO })
        fetchTipos()
      } else {
        setNewFuel({ nombre: '' })
        fetchFuel()
      }
      onUpdate?.()
      return
    }
    overlay.dismiss()
  }

  const handleCreateTipo = async (e) => {
    e.preventDefault()
    try {
      await overlay.run(
        async () => {
          await api.post('vehiculos/tipos-documento/', newTipo)
        },
        {
          successDescription: 'Tipo de documento creado.',
          formatError: (err) =>
            formatApiFormError(err, 'Error al crear el tipo de documento.'),
        },
      )
    } catch {
      // El error se muestra en FormOverlay
    }
  }

  const handleCreateFuel = async (e) => {
    e.preventDefault()
    try {
      await overlay.run(
        async () => {
          await api.post('vehiculos/tipos-combustible/', newFuel)
        },
        {
          successDescription: 'Combustible registrado.',
          formatError: (err) => formatApiFormError(err, 'Error al crear combustible.'),
        },
      )
    } catch {
      // El error se muestra en FormOverlay
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      if (pendingDelete.type === 'tipo') {
        await api.delete(`vehiculos/tipos-documento/${pendingDelete.id}/`)
        await fetchTipos()
        onUpdate?.()
      } else {
        await api.delete(`vehiculos/tipos-combustible/${pendingDelete.id}/`)
        await fetchFuel()
      }
      setPendingDelete(null)
      notify({ variant: 'success', text: 'Eliminado correctamente.' })
    } catch (error) {
      console.error(error)
      notify({
        variant: 'danger',
        text: 'No se pudo eliminar. Puede estar en uso.',
      })
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Modal
        open={isOpen}
        onClose={handleClose}
        title="Configuración de flota"
        size="lg"
        {...overlay.modalProps}
        onOverlayDismiss={handleOverlayDismiss}
        footer={
          <Button variant="quiet" onClick={handleClose} disabled={overlay.busy}>
            Cerrar
          </Button>
        }
      >
        <div className="vehiculos-config">
          <div className="tabs">
            <ul className="tabs__list" role="tablist">
              <li>
                <button
                  type="button"
                  role="tab"
                  className={`tabs__btn${activeTab === 'docs' ? ' is-active' : ''}`}
                  aria-selected={activeTab === 'docs'}
                  onClick={() => {
                    if (overlay.busy) return
                    overlay.reset()
                    setActiveTab('docs')
                  }}
                >
                  Tipos de documento
                </button>
              </li>
              <li>
                <button
                  type="button"
                  role="tab"
                  className={`tabs__btn${activeTab === 'fuel' ? ' is-active' : ''}`}
                  aria-selected={activeTab === 'fuel'}
                  onClick={() => {
                    if (overlay.busy) return
                    overlay.reset()
                    setActiveTab('fuel')
                  }}
                >
                  Tipos de combustible
                </button>
              </li>
            </ul>
          </div>

          {activeTab === 'docs' ? (
            <div className="vehiculos-config__split">
              <form onSubmit={handleCreateTipo} className="vehiculos-config__form">
                <h4>Nuevo documento</h4>
                <Field label="Nombre" htmlFor="tipo-nombre" required>
                  <Input
                    id="tipo-nombre"
                    required
                    value={newTipo.nombre}
                    onChange={(e) =>
                      setNewTipo({ ...newTipo, nombre: e.target.value })
                    }
                    disabled={overlay.busy}
                  />
                </Field>
                <Field label="Icono">
                  <div className="vehiculos-config__icon-grid">
                    {DOC_ICONS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`vehiculos-config__icon-btn${
                          newTipo.icono === item.id ? ' is-active' : ''
                        }`}
                        onClick={() =>
                          setNewTipo({ ...newTipo, icono: item.id })
                        }
                        aria-label={item.id}
                        disabled={overlay.busy}
                      >
                        <Icon name={item.icon} size={16} />
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Color">
                  <div className="vehiculos-config__color-grid">
                    {COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`vehiculos-config__color-btn is-${c.id}${
                          newTipo.color === c.id ? ' is-active' : ''
                        }`}
                        onClick={() => setNewTipo({ ...newTipo, color: c.id })}
                        aria-label={c.label}
                        title={c.label}
                        disabled={overlay.busy}
                      />
                    ))}
                  </div>
                </Field>
                <Field label="Días de aviso previo" htmlFor="tipo-aviso">
                  <Input
                    id="tipo-aviso"
                    inputMode="numeric"
                    value={newTipo.dias_aviso_defecto}
                    onChange={(e) =>
                      setNewTipo({
                        ...newTipo,
                        dias_aviso_defecto: e.target.value,
                      })
                    }
                    placeholder="15"
                    disabled={overlay.busy}
                  />
                </Field>
                <Button
                  type="submit"
                  variant="primary"
                  loading={overlay.busy}
                  disabled={overlay.busy || overlay.active}
                >
                  <Icon name="plus" size="sm" />
                  Registrar
                </Button>
              </form>

              <div className="vehiculos-config__list">
                <h4>Existentes</h4>
                {tipos.length === 0 ? (
                  <p className="vehiculos-flota-empty">No hay tipos registrados.</p>
                ) : (
                  tipos.map((t) => {
                    const iconName =
                      DOC_ICONS.find((i) => i.id === t.icono)?.icon || 'file'
                    return (
                      <div key={t.id} className="vehiculos-config__item">
                        <div className="vehiculos-config__item-main">
                          <Icon name={iconName} size={16} />
                          <span>{t.nombre}</span>
                          <Badge variant="neutral">{t.color}</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Eliminar"
                          disabled={overlay.busy}
                          onClick={() =>
                            setPendingDelete({
                              type: 'tipo',
                              id: t.id,
                              label: 'tipo de documento',
                            })
                          }
                        >
                          <Icon name="trash" size="sm" />
                        </Button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="vehiculos-config__split">
              <form onSubmit={handleCreateFuel} className="vehiculos-config__form">
                <h4>Nuevo combustible</h4>
                <Field label="Nombre" htmlFor="fuel-nombre" required>
                  <Input
                    id="fuel-nombre"
                    required
                    placeholder="Bencina, Diésel…"
                    value={newFuel.nombre}
                    onChange={(e) => setNewFuel({ nombre: e.target.value })}
                    disabled={overlay.busy}
                  />
                </Field>
                <Button
                  type="submit"
                  variant="primary"
                  loading={overlay.busy}
                  disabled={overlay.busy || overlay.active}
                >
                  <Icon name="plus" size="sm" />
                  Registrar
                </Button>
              </form>

              <div className="vehiculos-config__list">
                <h4>Lista de combustibles</h4>
                {combustibles.length === 0 ? (
                  <p className="vehiculos-flota-empty">No hay combustibles.</p>
                ) : (
                  combustibles.map((c) => (
                    <div key={c.id} className="vehiculos-config__item">
                      <div className="vehiculos-config__item-main">
                        <Icon name="activity" size={16} />
                        <span>{c.nombre}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Eliminar"
                        disabled={overlay.busy}
                        onClick={() =>
                          setPendingDelete({
                            type: 'fuel',
                            id: c.id,
                            label: 'combustible',
                          })
                        }
                      >
                        <Icon name="trash" size="sm" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmModal
        open={!!pendingDelete}
        onClose={() => {
          if (!deleting) setPendingDelete(null)
        }}
        onConfirm={confirmDelete}
        title={`Eliminar ${pendingDelete?.label || ''}`}
        description={`¿Eliminar este ${pendingDelete?.label || ''}?`}
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        danger
      />
    </>
  )
}

export default TipoDocumentoMantenedor
