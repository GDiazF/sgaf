import React, { useEffect, useState } from 'react'
import {
  Modal,
  ConfirmModal,
  Button,
  IconButton,
  Icon,
  Field,
  Input,
  Switch,
  Badge,
  EmptyState,
} from '@slep/ui'
import { usePermission } from '../../hooks/usePermission'
import { useNotify } from '../../hooks/useNotify'
import api from '../../api'

const EstablishmentPhonesModal = ({ isOpen, onClose, establishment }) => {
  const { can } = usePermission()
  const { notify } = useNotify()
  const [phones, setPhones] = useState([])
  const [loading, setLoading] = useState(false)
  const [newPhone, setNewPhone] = useState({
    numero: '',
    etiqueta: '',
    es_principal: false,
  })
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (isOpen && establishment) {
      fetchPhones()
      setIsAdding(false)
      setNewPhone({ numero: '', etiqueta: '', es_principal: false })
      setDeleteTarget(null)
    }
  }, [isOpen, establishment])

  const fetchPhones = async () => {
    setLoading(true)
    try {
      const response = await api.get('telefonos-establecimientos/', {
        params: { establecimiento: establishment.id },
      })
      setPhones(response.data.results || response.data || [])
    } catch (error) {
      console.error('Error fetching phones:', error)
      notify({ variant: 'danger', text: 'Error al cargar los teléfonos.' })
    } finally {
      setLoading(false)
    }
  }

  const handleAddPhone = async () => {
    if (!newPhone.numero || !newPhone.etiqueta) {
      notify({ variant: 'warning', text: 'Ingrese número y etiqueta.' })
      return
    }
    setSaving(true)
    try {
      await api.post('telefonos-establecimientos/', {
        ...newPhone,
        establecimiento: establishment.id,
      })
      setNewPhone({ numero: '', etiqueta: '', es_principal: false })
      setIsAdding(false)
      notify({ variant: 'success', text: 'Teléfono agregado.' })
      await fetchPhones()
    } catch (error) {
      console.error('Error adding phone:', error)
      notify({ variant: 'danger', text: 'Error al agregar el teléfono.' })
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`telefonos-establecimientos/${deleteTarget.id}/`)
      setDeleteTarget(null)
      notify({ variant: 'success', text: 'Teléfono eliminado.' })
      await fetchPhones()
    } catch (error) {
      console.error('Error deleting phone:', error)
      notify({ variant: 'danger', text: 'Error al eliminar el teléfono.' })
    } finally {
      setDeleting(false)
    }
  }

  const handleSetPrincipal = async (id) => {
    try {
      await api.patch(`telefonos-establecimientos/${id}/`, { es_principal: true })
      notify({ variant: 'success', text: 'Teléfono marcado como principal.' })
      await fetchPhones()
    } catch (error) {
      console.error('Error setting principal:', error)
      notify({ variant: 'danger', text: 'Error al marcar como principal.' })
    }
  }

  return (
    <>
      <Modal
        open={isOpen}
        onClose={onClose}
        title="Gestión de teléfonos"
        subheader={establishment?.nombre || 'Establecimiento'}
        footer={
          <Button variant="ghost" type="button" onClick={onClose}>
            Cerrar
          </Button>
        }
      >
        <div className="est-phones">
          {can('establecimientos.add_telefonoestablecimiento') ? (
            <div className="est-phones__add">
              {!isAdding ? (
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setIsAdding(true)}
                >
                  <Icon name="plus" size="sm" />
                  Añadir número
                </Button>
              ) : (
                <div className="form-grid">
                  <Field label="Número" required htmlFor="phone-numero">
                    <Input
                      id="phone-numero"
                      placeholder="Ej: +56 9…"
                      value={newPhone.numero}
                      onChange={(e) =>
                        setNewPhone({ ...newPhone, numero: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Etiqueta" required htmlFor="phone-etiqueta">
                    <Input
                      id="phone-etiqueta"
                      placeholder="Ej: Secretaría"
                      value={newPhone.etiqueta}
                      onChange={(e) =>
                        setNewPhone({ ...newPhone, etiqueta: e.target.value })
                      }
                    />
                  </Field>
                  <div className="field field--full">
                    <Switch
                      id="phone-principal"
                      label="Marcar como principal"
                      checked={!!newPhone.es_principal}
                      onChange={(e) =>
                        setNewPhone({ ...newPhone, es_principal: e.target.checked })
                      }
                    />
                  </div>
                  <div className="est-phones__add-actions field--full">
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => setIsAdding(false)}
                      disabled={saving}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="primary"
                      type="button"
                      onClick={handleAddPhone}
                      loading={saving}
                      disabled={saving || !newPhone.numero || !newPhone.etiqueta}
                    >
                      Guardar teléfono
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {loading ? (
            <EmptyState title="Cargando teléfonos…" />
          ) : phones.length === 0 ? (
            <EmptyState
              title="Sin teléfonos"
              description="No hay números registrados para este establecimiento."
            />
          ) : (
            <ul className="est-phones__list">
              {phones.map((phone) => (
                <li
                  key={phone.id}
                  className={`est-phones__item${phone.es_principal ? ' is-principal' : ''}`}
                >
                  <div className="est-phones__item-icon" aria-hidden="true">
                    <Icon name="telefonos" size={18} />
                  </div>
                  <div className="est-phones__item-body">
                    <div className="est-phones__item-head">
                      <span className="est-phones__numero">{phone.numero}</span>
                      {phone.es_principal ? (
                        <Badge variant="accent">Principal</Badge>
                      ) : null}
                    </div>
                    <span className="est-phones__etiqueta">{phone.etiqueta}</span>
                  </div>
                  <div className="est-phones__item-actions">
                    {!phone.es_principal &&
                    can('establecimientos.change_telefonoestablecimiento') ? (
                      <IconButton
                        aria-label="Marcar como principal"
                        onClick={() => handleSetPrincipal(phone.id)}
                      >
                        <Icon name="check" size={16} />
                      </IconButton>
                    ) : null}
                    {can('establecimientos.delete_telefonoestablecimiento') ? (
                      <IconButton
                        danger
                        aria-label="Eliminar teléfono"
                        onClick={() => setDeleteTarget(phone)}
                      >
                        <Icon name="trash" size={16} />
                      </IconButton>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        onConfirm={handleConfirmDelete}
        title="Eliminar teléfono"
        description={
          deleteTarget
            ? `¿Eliminar el número ${deleteTarget.numero}? Esta acción no se puede deshacer.`
            : '¿Eliminar este teléfono?'
        }
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        cancelLabel="Cancelar"
        danger
      />
    </>
  )
}

export default EstablishmentPhonesModal
