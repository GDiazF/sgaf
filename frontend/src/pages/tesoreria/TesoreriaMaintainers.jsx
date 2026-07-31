import React, { useState, useEffect, useMemo, useCallback } from 'react'
import api from '../../api'
import { usePermission } from '../../hooks/usePermission'
import { useNotify } from '../../hooks/useNotify'
import {
  DataTable,
  Modal,
  ConfirmModal,
  Button,
  Field,
  Input,
  Badge,
  Icon,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

export const CONFIG_TABS = [
  {
    id: 'bancos',
    label: 'Bancos',
    title: 'Mapeo de bancos',
    description: 'Nombres en archivos → códigos bancarios',
    endpoint: 'remuneraciones/mapeo-bancos/',
    permissionModel: 'mapeobanco',
    fields: [
      { name: 'nombre', label: 'Nombre en archivo' },
      { name: 'codigo', label: 'Código banco' },
    ],
  },
  {
    id: 'medios',
    label: 'Medios de pago',
    title: 'Medios de pago',
    description: 'Glosas → códigos internos',
    endpoint: 'remuneraciones/mapeo-medios-pago/',
    permissionModel: 'mapeomediospago',
    fields: [
      { name: 'nombre', label: 'Glosa medio' },
      { name: 'codigo', label: 'Código medio' },
    ],
  },
  {
    id: 'directos',
    label: 'Cód. directos',
    title: 'Bancos directos',
    description: 'Segmentos → códigos de 11 dígitos',
    endpoint: 'remuneraciones/mapeo-bancos-directos/',
    permissionModel: 'mapeobancosdirectos',
    fields: [
      { name: 'segmento', label: 'Segmento' },
      { name: 'codigo_completo', label: 'Código completo' },
    ],
  },
  {
    id: 'valevista',
    label: 'Vale Vista',
    title: 'Configuración Vale Vista',
    description: 'Parámetros para archivos de retiro',
    endpoint: 'remuneraciones/vale-vista-config/',
    permissionModel: 'valevistaconfig',
    fields: [
      { name: 'clave', label: 'Parámetro' },
      { name: 'valor', label: 'Valor' },
      { name: 'descripcion', label: 'Descripción' },
    ],
  },
]

const MaintainerPanel = ({ tab, isNarrow }) => {
  const { can } = usePermission()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const { notify } = useNotify()
  const overlay = useFormOverlay()

  const canAdd = can(`remuneraciones.add_${tab.permissionModel}`)
  const canChange = can(`remuneraciones.change_${tab.permissionModel}`)
  const canDelete = can(`remuneraciones.delete_${tab.permissionModel}`)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(tab.endpoint)
      setData(Array.isArray(res.data) ? res.data : res.data.results || [])
    } catch (err) {
      console.error(err)
      setData([])
      notify({ variant: 'danger', text: 'Error al cargar registros.' })
    } finally {
      setLoading(false)
    }
  }, [tab.endpoint])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const closeModal = () => {
    if (overlay.busy) return
    overlay.reset()
    setIsModalOpen(false)
    setEditingId(null)
    setEditForm({})
    setSavedOk(false)
  }

  const startAdd = () => {
    const initial = {}
    tab.fields.forEach((f) => {
      initial[f.name] = ''
    })
    setEditingId(null)
    setEditForm(initial)
    setSavedOk(false)
    overlay.reset()
    setIsModalOpen(true)
  }

  const startEdit = (item) => {
    setEditingId(item.id)
    const form = {}
    tab.fields.forEach((f) => {
      form[f.name] = item[f.name] ?? ''
    })
    setEditForm(form)
    setSavedOk(false)
    overlay.reset()
    setIsModalOpen(true)
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      setIsModalOpen(false)
      setEditingId(null)
      setEditForm({})
      if (savedOk) fetchData()
      setSavedOk(false)
      return
    }
    overlay.dismiss()
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      await overlay.run(
        async () => {
          if (editingId) {
            await api.put(`${tab.endpoint}${editingId}/`, editForm)
          } else {
            await api.post(tab.endpoint, editForm)
          }
          setSavedOk(true)
        },
        {
          successDescription: editingId ? 'Registro actualizado.' : 'Registro creado.',
          formatError: (err) => formatApiFormError(err, 'Error al guardar el registro.'),
        },
      )
    } catch {
      // FormOverlay
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`${tab.endpoint}${deleteTarget.id}/`)
      setDeleteTarget(null)
      notify({ variant: 'success', text: 'Registro eliminado.' })
      await fetchData()
    } catch (err) {
      console.error(err)
      notify({ variant: 'danger', text: 'Error al eliminar.' })
    } finally {
      setDeleting(false)
    }
  }

  const columns = useMemo(() => {
    const cols = tab.fields.map((f, index) => ({
      key: f.name,
      header: f.label,
      className: index === 0 ? 'col--primary' : 'col--secondary',
      cardRole: index === 0 ? 'title' : index === 1 ? 'subtitle' : 'field',
      priority: index < 2 ? 1 : 3,
      render: (item) => item[f.name] || '—',
    }))

    if (canChange || canDelete) {
      cols.push({
        key: 'actions',
        header: 'Acciones',
        className: 'col--actions',
        render: (item) => (
          <div className="data-table__actions" onClick={(e) => e.stopPropagation()}>
            {canChange ? (
              <Button variant="ghost" size="sm" title="Editar" onClick={() => startEdit(item)}>
                <Icon name="edit" size="sm" />
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                variant="ghost"
                size="sm"
                title="Eliminar"
                onClick={() =>
                  setDeleteTarget({
                    id: item.id,
                    label: item[tab.fields[0]?.name] || `#${item.id}`,
                  })
                }
              >
                <Icon name="trash" size="sm" />
              </Button>
            ) : null}
          </div>
        ),
      })
    }

    return cols
  }, [tab.fields, canChange, canDelete])

  return (
    <>
      <DataTable
        columns={columns}
        rows={data}
        loading={loading}
        totalCount={data.length}
        emptyTitle="Sin registros"
        emptyDescription={tab.description}
        emptyAction={
          canAdd ? (
            <Button variant="primary" size="sm" onClick={startAdd}>
              <Icon name="plus" size="sm" /> Nuevo registro
            </Button>
          ) : null
        }
        fillViewport={!isNarrow}
        showFooter={false}
        toolbar={
          <div
            className="table-toolbar__left"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              width: '100%',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span className="table-toolbar__title">{tab.title}</span>
              <Badge variant="neutral">{data.length}</Badge>
            </div>
            {canAdd ? (
              <Button variant="primary" size="sm" onClick={startAdd}>
                <Icon name="plus" size="sm" /> Nuevo
              </Button>
            ) : null}
          </div>
        }
        mobileCardActions={(item) => ({
          primary: canChange
            ? { label: 'Editar', onClick: () => startEdit(item) }
            : undefined,
          secondary: canDelete
            ? {
                label: 'Eliminar',
                onClick: () =>
                  setDeleteTarget({
                    id: item.id,
                    label: item[tab.fields[0]?.name] || `#${item.id}`,
                  }),
              }
            : undefined,
        })}
      />

      <Modal
        open={isModalOpen}
        onClose={closeModal}
        title={editingId ? 'Editar registro' : 'Nuevo registro'}
        subheader={tab.title}
        {...overlay.modalProps}
        onOverlayDismiss={handleOverlayDismiss}
        footer={
          <>
            <Button variant="quiet" onClick={closeModal} disabled={overlay.busy}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              form={`tm-form-${tab.id}`}
              loading={overlay.busy}
              disabled={overlay.busy || overlay.active}
            >
              {overlay.busy ? 'Guardando…' : editingId ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        <form
          id={`tm-form-${tab.id}`}
          onSubmit={handleSave}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        >
          {tab.fields.map((f) => (
            <Field key={f.name} label={f.label} htmlFor={`tm-${tab.id}-${f.name}`} required>
              <Input
                id={`tm-${tab.id}-${f.name}`}
                value={editForm[f.name] || ''}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, [f.name]: e.target.value }))
                }
                placeholder={f.label}
                required
              />
            </Field>
          ))}
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        onConfirm={confirmDelete}
        title="Eliminar registro"
        description={`¿Eliminar ${deleteTarget?.label || 'este registro'}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
      />
    </>
  )
}

/** Sub-pestañas de mapeos (sin PageHeader propio). */
export function TesoreriaConfigSection({ isNarrow }) {
  const [activeTab, setActiveTab] = useState('bancos')
  const current = CONFIG_TABS.find((t) => t.id === activeTab) || CONFIG_TABS[0]

  return (
    <>
      <div className="tabs">
        <ul className="tabs__list" role="tablist" aria-label="Mantenedores tesorería">
          {CONFIG_TABS.map((tab) => (
            <li key={tab.id}>
              <button
                type="button"
                role="tab"
                className={`tabs__btn${activeTab === tab.id ? ' is-active' : ''}`}
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="tabs__panel is-active tesoreria-config-subpanel" role="tabpanel">
        <MaintainerPanel key={current.id} tab={current} isNarrow={isNarrow} />
      </div>
    </>
  )
}
