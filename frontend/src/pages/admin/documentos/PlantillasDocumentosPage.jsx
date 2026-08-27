import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../../api'
import { usePermission } from '../../../hooks/usePermission'
import { useNotify } from '../../../hooks/useNotify'
import {
  PageHeader,
  FiltersBar,
  DataTable,
  Button,
  Icon,
  IconButton,
  Badge,
  Field,
  Input,
  Select,
  Modal,
  ConfirmModal,
  PermissionBlock,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const PAGE_SIZE = 20

const PlantillasDocumentosPage = () => {
  const { can } = usePermission()
  const { notify } = useNotify()
  const overlay = useFormOverlay()
  const navigate = useNavigate()

  const canView = can('documentos.view_plantilladocumento')
  const canAdd = can('documentos.add_plantilladocumento')
  const canChange = can('documentos.change_plantilladocumento')
  const canDelete = can('documentos.delete_plantilladocumento')

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [propositoFilter, setPropositoFilter] = useState('')
  const [propositos, setPropositos] = useState([])
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newProposito, setNewProposito] = useState('borrador')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [ocupados, setOcupados] = useState([])

  const fetchList = async () => {
    setLoading(true)
    try {
      const res = await api.get('documentos/plantillas/', {
        params: {
          search,
          page,
          page_size: PAGE_SIZE,
          ordering: 'nombre',
          ...(propositoFilter ? { proposito: propositoFilter } : {}),
        },
      })
      setItems(res.data.results || res.data || [])
      setTotalCount(res.data.count ?? (res.data.results || res.data || []).length)
    } catch {
      notify({ variant: 'danger', text: 'No se pudieron cargar las plantillas.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!canView) return undefined
    api.get('documentos/catalogo/').then((res) => {
      setPropositos(res.data?.propositos || [])
      setOcupados(res.data?.propositos_ocupados || [])
    }).catch(() => {})
    return undefined
  }, [canView])

  useEffect(() => {
    if (canView) fetchList()
  }, [canView, page, search, propositoFilter])

  const openCreate = () => {
    setNewName('')
    setNewDescription('')
    setNewProposito('borrador')
    overlay.reset()
    setCreateOpen(true)
    api.get('documentos/catalogo/').then((res) => {
      setPropositos(res.data?.propositos || [])
      setOcupados(res.data?.propositos_ocupados || [])
    }).catch(() => {})
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await overlay.run(
        async () => {
          const res = await api.post('documentos/plantillas/', {
            nombre: newName.trim(),
            descripcion: newDescription.trim(),
            proposito: newProposito || 'borrador',
            cuerpo_html: '<p></p>',
          })
          setCreateOpen(false)
          notify({ variant: 'success', text: 'Plantilla creada.' })
          navigate(`/admin/documentos/${res.data.id}`)
        },
        { formatError: (err) => formatApiFormError(err, 'No se pudo crear la plantilla.') },
      )
    } catch {
      // FormOverlay muestra el error
    }
  }

  const handleDuplicate = async (item) => {
    try {
      const res = await api.post(`documentos/plantillas/${item.id}/duplicar/`)
      notify({ variant: 'success', text: 'Plantilla duplicada.' })
      navigate(`/admin/documentos/${res.data.id}`)
    } catch {
      notify({ variant: 'danger', text: 'No se pudo duplicar la plantilla.' })
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`documentos/plantillas/${deleteTarget.id}/`)
      setDeleteTarget(null)
      notify({ variant: 'success', text: 'Plantilla eliminada.' })
      fetchList()
    } catch {
      notify({ variant: 'danger', text: 'No se pudo eliminar la plantilla.' })
    } finally {
      setDeleting(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'nombre',
        header: 'Nombre',
        cardRole: 'title',
        render: (item) => item.nombre,
      },
      {
        key: 'proposito',
        header: 'Propósito',
        render: (item) => {
          const label = propositos.find((p) => p.key === item.proposito)?.label
          return label || item.proposito || 'Sin asignación (borrador)'
        },
      },
      {
        key: 'tamano',
        header: 'Página',
        render: (item) => `${(item.tamano_pagina || '').toUpperCase()} · ${item.orientacion === 'landscape' ? 'Horizontal' : 'Vertical'}`,
      },
      {
        key: 'activa',
        header: 'Estado',
        cardRole: 'status',
        render: (item) => (
          <Badge variant={item.activa ? 'success' : 'neutral'}>
            {item.activa ? 'Activa' : 'Inactiva'}
          </Badge>
        ),
      },
      {
        key: 'actualizado_en',
        header: 'Actualizada',
        className: 'col--tablet-hide',
        render: (item) =>
          item.actualizado_en
            ? new Date(item.actualizado_en).toLocaleString('es-CL')
            : '—',
      },
      {
        key: 'actions',
        header: '',
        className: 'col--actions',
        render: (item) => (
          <div className="data-table__actions">
            {canChange ? (
              <IconButton aria-label="Editar" onClick={() => navigate(`/admin/documentos/${item.id}`)}>
                <Icon name="edit" size={14} />
              </IconButton>
            ) : (
              <IconButton aria-label="Ver" onClick={() => navigate(`/admin/documentos/${item.id}`)}>
                <Icon name="eye" size={14} />
              </IconButton>
            )}
            {canAdd ? (
              <IconButton aria-label="Duplicar" onClick={() => handleDuplicate(item)}>
                <Icon name="file" size={14} />
              </IconButton>
            ) : null}
            {canDelete ? (
              <IconButton danger aria-label="Eliminar" onClick={() => setDeleteTarget(item)}>
                <Icon name="trash" size={14} />
              </IconButton>
            ) : null}
          </div>
        ),
      },
    ],
    [canAdd, canChange, canDelete, navigate, propositos],
  )

  if (!canView) {
    return (
      <div className="page" data-od-id="plantillas-documentos-page">
        <PermissionBlock
          title="Acceso denegado"
          description="No tiene permiso para ver las plantillas de documentos."
        />
      </div>
    )
  }

  return (
    <div className="page" data-od-id="plantillas-documentos-page" data-fill-viewport>
      <PageHeader
        icon="procedimientos"
        title="Plantillas de documentos"
        description="Maquetado tipo Word con variables y logos institucionales"
        breadcrumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Administración' },
          { label: 'Plantillas de documentos' },
        ]}
        linkComponent={Link}
        split
        actions={
          canAdd ? (
            <Button variant="primary" size="sm" onClick={openCreate}>
              <Icon name="plus" size="sm" /> Nueva plantilla
            </Button>
          ) : null
        }
      />

      <FiltersBar
        onSearch={() => setPage(1)}
        onClear={() => {
          setSearch('')
          setPropositoFilter('')
          setPage(1)
        }}
      >
        <Field label="Buscar" htmlFor="doc-tpl-search">
          <Input
            id="doc-tpl-search"
            value={search}
            onChange={(e) => {
              setPage(1)
              setSearch(e.target.value)
            }}
            placeholder="Nombre o descripción"
          />
        </Field>
        <Field label="Propósito" htmlFor="doc-tpl-filter-proposito">
          <Select
            id="doc-tpl-filter-proposito"
            value={propositoFilter}
            onChange={(e) => {
              setPage(1)
              setPropositoFilter(e.target.value)
            }}
          >
            <option value="">Todos</option>
            {propositos.map((item) => (
              <option key={item.key} value={item.key}>{item.label}</option>
            ))}
          </Select>
        </Field>
      </FiltersBar>

      <DataTable
        columns={columns}
        rows={items}
        loading={loading}
        fillViewport
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        onPageChange={setPage}
        emptyTitle="Sin plantillas"
        emptyDescription="Cree la primera plantilla para maquetar documentos institucionales."
      />

      <Modal
        open={createOpen}
        onClose={() => !overlay.busy && setCreateOpen(false)}
        title="Nueva plantilla"
        size="sm"
        {...overlay.modalProps}
        onOverlayDismiss={() => overlay.dismiss()}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={overlay.busy}>
              Cancelar
            </Button>
            <Button variant="primary" form="doc-tpl-create" type="submit" disabled={overlay.busy}>
              Crear y maquetar
            </Button>
          </>
        }
      >
        <form id="doc-tpl-create" onSubmit={handleCreate}>
          <Field label="Nombre" htmlFor="doc-tpl-name" required>
            <Input
              id="doc-tpl-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </Field>
          <Field label="Descripción" htmlFor="doc-tpl-desc">
            <Input
              id="doc-tpl-desc"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
          </Field>
          <Field
            label="Asignación / propósito"
            htmlFor="doc-tpl-proposito"
            hint={
              (propositos.find((p) => p.key === newProposito)?.description)
              || 'Borrador = todas las variables, sin módulo. Un propósito asignable = una sola plantilla.'
            }
          >
            <Select
              id="doc-tpl-proposito"
              value={newProposito}
              onChange={(e) => setNewProposito(e.target.value)}
            >
              {propositos.map((item) => {
                const ocupado = ocupados.includes(item.key) && item.key !== 'borrador'
                return (
                  <option key={item.key} value={item.key} disabled={ocupado}>
                    {item.label}{ocupado ? ' (ya asignada)' : ''}
                  </option>
                )
              })}
              {propositos.length === 0 ? (
                <>
                  <option value="borrador">Sin asignación (borrador)</option>
                  <option value="recepcion_roc">ROC — Recepción con contrato / OC</option>
                  <option value="recepcion_rcf">RCF — Recepción sin OC</option>
                  <option value="recepcion_rca">RCA — Compra ágil</option>
                  <option value="recepcion_rlb_unitario">RLB — Un registro (enviar a pago)</option>
                  <option value="recepcion_rlb">RLB — Recepción conforme (1 o más pagos)</option>
                  <option value="recepcion_rlb_junji">RLB — Monto JUNJI</option>
                  <option value="recepcion_servicio">Recepción de servicio</option>
                </>
              ) : null}
            </Select>
          </Field>
          {overlay.status === 'error' ? (
            <p className="field__hint">{overlay.description}</p>
          ) : null}
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        title="Eliminar plantilla"
        description={`¿Eliminar «${deleteTarget?.nombre}»? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        confirmLoading={deleting}
        closeOnConfirm={false}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

export default PlantillasDocumentosPage
