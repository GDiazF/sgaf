import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../api'
import { usePermission } from '../../hooks/usePermission'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { useNotify } from '../../hooks/useNotify'
import ContractModal from '../../components/contracts/ContractModal'
import {
  prepareContractPayload,
  contractToFormData,
  contractLabel,
} from '../../utils/contractForm'
import {
  PageHeader,
  FiltersBar,
  DataTable,
  Badge,
  Button,
  Field,
  Input,
  Select,
  ConfirmModal,
  Icon,
} from '@slep/ui'

const estadoVariant = (nombre) => {
  const n = (nombre || '').toLowerCase()
  if (n.includes('activo') || n.includes('vigente')) return 'success'
  if (n.includes('pendiente')) return 'warning'
  if (n.includes('caducado') || n.includes('anul') || n.includes('finaliz')) return 'danger'
  return 'neutral'
}

const formatDate = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('es-CL')
}

const providersLabel = (item) => {
  const list = item.proveedores_asociados || []
  if (!list.length) return 'S/A'
  return list.map((p) => p.proveedor_nombre).join(', ')
}

const Contracts = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { can } = usePermission()
  const vista = searchParams.get('vista') || 'activos'

  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const { notify } = useNotify()

  const [procesos, setProcesos] = useState([])
  const [estados, setEstados] = useState([])
  const [categorias, setCategorias] = useState([])
  const [orientaciones, setOrientaciones] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [establecimientos, setEstablecimientos] = useState([])
  const [tiposEstablecimiento, setTiposEstablecimiento] = useState([])

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [ordering, setOrdering] = useState('vigente_first')
  const [filterCategoria, setFilterCategoria] = useState('')
  const [filterOrientacion, setFilterOrientacion] = useState('')

  const debouncedSearch = useDebouncedValue(searchQuery)
  const isDraftsView = vista === 'borradores'

  const lookups = useMemo(
    () => ({
      procesos,
      estados,
      categorias,
      orientaciones,
      proveedores,
      establecimientos,
      tiposEstablecimiento,
    }),
    [
      procesos,
      estados,
      categorias,
      orientaciones,
      proveedores,
      establecimientos,
      tiposEstablecimiento,
    ],
  )

  const selectVista = (id) => {
    const next = new URLSearchParams(searchParams)
    if (id === 'activos') next.delete('vista')
    else next.set('vista', id)
    navigate({ search: next.toString() ? `?${next.toString()}` : '' }, { replace: true })
    setCurrentPage(1)
  }

  const fetchData = async (page = 1, size = pageSize, search = debouncedSearch) => {
    setLoading(true)
    try {
      const params = {
        page,
        page_size: size,
        search,
        vista,
        ordering:
          vista === 'borradores'
            ? '-updated_at'
            : ordering === 'vigente_first'
              ? '-estado__nombre, -fecha_inicio'
              : ordering,
        ...(filterCategoria && { categoria: filterCategoria }),
        ...(filterOrientacion && { orientacion: filterOrientacion }),
      }
      const response = await api.get('contratos/contratos/', { params })
      const data = response.data.results || (Array.isArray(response.data) ? response.data : [])
      setContracts(data)
      setTotalCount(response.data.count || data.length)
      setCurrentPage(page)
    } catch (error) {
      console.error(error)
      notify({ variant: 'danger', text: 'No se pudieron cargar los contratos.' })
    } finally {
      setLoading(false)
    }
  }

  const fetchLookups = async () => {
    try {
      const [procRes, estRes, catRes, oriRes, provRes, setupsRes, typesRes] = await Promise.all([
        api.get('contratos/procesos/'),
        api.get('contratos/estados/'),
        api.get('contratos/categorias/'),
        api.get('contratos/orientaciones/'),
        api.get('proveedores/'),
        api.get('establecimientos/', { params: { page_size: 1000, activo: true } }),
        api.get('tipos-establecimiento/'),
      ])
      setProcesos(procRes.data.results || procRes.data)
      setEstados(estRes.data.results || estRes.data)
      setCategorias(catRes.data.results || catRes.data)
      setOrientaciones(oriRes.data.results || oriRes.data)
      setProveedores(provRes.data.results || provRes.data)
      setEstablecimientos(setupsRes.data.results || setupsRes.data)
      setTiposEstablecimiento(typesRes.data.results || typesRes.data)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    fetchData(1, pageSize, debouncedSearch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordering, filterCategoria, filterOrientacion, pageSize, debouncedSearch, vista])

  useEffect(() => {
    fetchLookups()
  }, [])

  const clearFilters = () => {
    setSearchQuery('')
    setFilterCategoria('')
    setFilterOrientacion('')
    setCurrentPage(1)
  }

  const handleNew = () => {
    navigate('/contracts/new')
  }

  const handleEdit = (item) => {
    if (item.es_borrador) {
      navigate(`/contracts/${item.id}/edit`)
      return
    }
    setFormData(contractToFormData(item))
    setEditingId(item.id)
    setShowForm(true)
  }

  const handleSave = async (dataToSubmit) => {
    const finalData = prepareContractPayload(dataToSubmit)
    await api.put(`contratos/contratos/${editingId}/`, finalData)
  }

  const handleFormClose = (result) => {
    setShowForm(false)
    setEditingId(null)
    if (result?.saved) {
      fetchData(currentPage, pageSize, debouncedSearch)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`contratos/contratos/${deleteTarget.id}/`)
      setDeleteTarget(null)
      notify({
        variant: 'success',
        text: deleteTarget.es_borrador ? 'Borrador eliminado.' : 'Contrato eliminado.',
      })
      await fetchData(currentPage, pageSize, debouncedSearch)
    } catch (error) {
      console.error(error)
      notify({ variant: 'danger', text: 'Error al eliminar.' })
    } finally {
      setDeleting(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'codigo',
        header: isDraftsView ? 'Borrador' : 'Código / Referencia',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        sortable: !isDraftsView,
        render: (item) => (
          <button
            type="button"
            className="table-link"
            onClick={() =>
              item.es_borrador
                ? navigate(`/contracts/${item.id}/edit`)
                : navigate(`/contracts/${item.id}`)
            }
          >
            <span className="contracts-code">{contractLabel(item)}</span>
            <span className="contracts-desc">
              {item.descripcion?.trim() || 'Sin descripción'}
            </span>
          </button>
        ),
      },
      {
        key: 'estado',
        header: 'Estado',
        className: 'col--status',
        cardRole: 'status',
        priority: 1,
        sortable: !isDraftsView,
        render: (item) =>
          item.es_borrador ? (
            <Badge variant="warning" dot>
              Borrador
            </Badge>
          ) : (
            <Badge variant={estadoVariant(item.estado_nombre)} dot>
              {item.estado_nombre || 'N/A'}
            </Badge>
          ),
      },
      ...(isDraftsView
        ? [
            {
              key: 'updated',
              header: 'Última edición',
              className: 'col--tablet-hide',
              cardRole: 'field',
              priority: 2,
              render: (item) => formatDate(item.updated_at),
            },
          ]
        : [
            {
              key: 'categoria',
              header: 'Categoría',
              className: 'col--secondary',
              cardRole: 'subtitle',
              priority: 1,
              sortable: true,
              render: (item) => (
                <Badge variant="accent">{item.categoria_nombre || '—'}</Badge>
              ),
            },
            {
              key: 'proceso',
              header: 'Proceso',
              className: 'col--tablet-hide',
              cardRole: 'field',
              priority: 2,
              sortable: true,
              render: (item) => item.proceso_nombre || '—',
            },
            {
              key: 'proveedores',
              header: 'Proveedores',
              className: 'col--tablet-hide',
              cardRole: 'field',
              priority: 2,
              render: (item) => (
                <span className="contracts-providers" title={providersLabel(item)}>
                  {providersLabel(item)}
                </span>
              ),
            },
            {
              key: 'fecha_termino',
              header: 'Vencimiento',
              className: 'col--tablet-hide',
              cardRole: 'field',
              priority: 2,
              sortable: true,
              render: (item) => formatDate(item.fecha_termino),
            },
            {
              key: 'plazo',
              header: 'Plazo',
              className: 'col--tablet-hide',
              cardRole: 'field',
              priority: 2,
              render: (item) =>
                item.plazo_meses != null ? `${item.plazo_meses} meses` : '—',
            },
          ]),
      {
        key: 'actions',
        header: 'Acciones',
        className: 'col--actions',
        render: (item) => (
          <div className="data-table__actions">
            {item.es_borrador ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/contracts/${item.id}/edit`)}
              >
                Continuar
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/contracts/${item.id}`)}
              >
                Ver
              </Button>
            )}
            {!item.es_borrador && can('contratos.change_contrato') ? (
              <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                <Icon name="edit" size="sm" />
              </Button>
            ) : null}
            {can('contratos.delete_contrato') ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteTarget(item)}
              >
                <Icon name="trash" size="sm" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [can, navigate, isDraftsView],
  )

  const sortKeyMap = {
    codigo: 'codigo_mercado_publico',
    estado: 'estado__nombre',
    categoria: 'categoria__nombre',
    proceso: 'proceso__nombre',
    fecha_termino: 'fecha_termino',
  }

  const handleSort = (colKey) => {
    if (isDraftsView) return
    const apiKey = sortKeyMap[colKey]
    if (!apiKey) return
    const next =
      ordering === apiKey ? `-${apiKey}` : ordering === `-${apiKey}` ? apiKey : apiKey
    setOrdering(next)
    setCurrentPage(1)
  }

  const activeSortKey = Object.entries(sortKeyMap).find(
    ([, apiKey]) => ordering === apiKey || ordering === `-${apiKey}`,
  )?.[0]

  const vistaDescription = {
    activos: 'Contratos vigentes en curso',
    borradores: 'Borradores guardados automáticamente',
    finalizados: 'Contratos finalizados, caducados o vencidos',
  }[vista]

  const emptyCopy = {
    activos: {
      title: 'Sin contratos vigentes',
      description: 'No hay contratos activos con los filtros actuales.',
    },
    borradores: {
      title: 'Sin borradores',
      description: 'Creá un contrato nuevo para generar un borrador automático.',
    },
    finalizados: {
      title: 'Sin contratos finalizados',
      description: 'No hay contratos finalizados con los filtros actuales.',
    },
  }[vista]

  return (
    <div className="page" data-od-id="contracts-page" data-fill-viewport>
      <PageHeader
        icon="contratos"
        title="Contratos"
        description={`${vistaDescription} (${totalCount})`}
        breadcrumbs={[{ label: 'SSGG' }, { label: 'Contratos' }]}
        linkComponent={Link}
        split
        actions={
          can('contratos.add_contrato') ? (
            <Button variant="primary" size="sm" onClick={handleNew}>
              <Icon name="plus" size="sm" /> Nuevo contrato
            </Button>
          ) : null
        }
      />

      <div className="tabs">
        <ul className="tabs__list" role="tablist" aria-label="Vistas de contratos">
          <li>
            <button
              type="button"
              role="tab"
              className={`tabs__btn${vista === 'activos' ? ' is-active' : ''}`}
              aria-selected={vista === 'activos'}
              onClick={() => selectVista('activos')}
            >
              Vigentes
            </button>
          </li>
          <li>
            <button
              type="button"
              role="tab"
              className={`tabs__btn${vista === 'borradores' ? ' is-active' : ''}`}
              aria-selected={vista === 'borradores'}
              onClick={() => selectVista('borradores')}
            >
              Borradores
            </button>
          </li>
          <li>
            <button
              type="button"
              role="tab"
              className={`tabs__btn${vista === 'finalizados' ? ' is-active' : ''}`}
              aria-selected={vista === 'finalizados'}
              onClick={() => selectVista('finalizados')}
            >
              Finalizados
            </button>
          </li>
        </ul>
      </div>

      <div className="tabs__panel is-active contracts-list-tab-panel" role="tabpanel">
        <FiltersBar
          onSearch={() => setCurrentPage(1)}
          onClear={clearFilters}
          advanced={
            isDraftsView ? null : (
              <>
                <Field label="Orientación" htmlFor="c-ori">
                  <Select
                    id="c-ori"
                    value={filterOrientacion}
                    onChange={(e) => {
                      setFilterOrientacion(e.target.value)
                      setCurrentPage(1)
                    }}
                  >
                    <option value="">Todas</option>
                    {orientaciones.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Categoría" htmlFor="c-cat">
                  <Select
                    id="c-cat"
                    value={filterCategoria}
                    onChange={(e) => {
                      setFilterCategoria(e.target.value)
                      setCurrentPage(1)
                    }}
                  >
                    <option value="">Todas</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            )
          }
        >
          <Field label="Buscar" htmlFor="c-q">
            <div className="input-wrap">
              <Icon name="search" className="input-wrap__icon" size="sm" />
              <Input
                id="c-q"
                type="search"
                placeholder={
                  isDraftsView ? 'Descripción o código…' : 'Código o descripción…'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </Field>
        </FiltersBar>

        <DataTable
          columns={columns}
          rows={contracts}
          loading={loading}
          totalCount={totalCount}
          emptyTitle={emptyCopy.title}
          emptyDescription={emptyCopy.description}
          emptyAction={
            can('contratos.add_contrato') && vista === 'borradores' ? (
              <Button variant="primary" size="sm" onClick={handleNew}>
                <Icon name="plus" size="sm" /> Nuevo contrato
              </Button>
            ) : vista !== 'borradores' ? (
              <Button variant="quiet" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            ) : null
          }
          fillViewport
          page={currentPage}
          pageSize={pageSize}
          pageSizeId="contracts-page-size"
          onPageChange={(p) => fetchData(p, pageSize, debouncedSearch)}
          onPageSizeChange={(n) => {
            setPageSize(n)
            setCurrentPage(1)
          }}
          sortKey={activeSortKey}
          onSort={handleSort}
          mobileCardActions={(item) => ({
            primary: item.es_borrador
              ? {
                  label: 'Continuar',
                  onClick: () => navigate(`/contracts/${item.id}/edit`),
                }
              : { label: 'Ver', onClick: () => navigate(`/contracts/${item.id}`) },
            secondary:
              can('contratos.delete_contrato')
                ? { label: 'Eliminar', onClick: () => setDeleteTarget(item) }
                : undefined,
          })}
          toolbar={
            <div className="table-toolbar__left">
              <span className="table-toolbar__title">Listado</span>
              <Badge variant="neutral">{totalCount}</Badge>
            </div>
          }
        />
      </div>

      <ContractModal
        open={showForm}
        onClose={handleFormClose}
        onSave={handleSave}
        editingId={editingId}
        initialData={formData}
        lookups={lookups}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        onConfirm={confirmDelete}
        title={deleteTarget?.es_borrador ? 'Eliminar borrador' : 'Eliminar contrato'}
        description={
          deleteTarget
            ? deleteTarget.es_borrador
              ? `¿Eliminar el borrador ${contractLabel(deleteTarget)}? Esta acción no se puede deshacer.`
              : `¿Eliminar el contrato ${contractLabel(deleteTarget)}?`
            : ''
        }
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        danger
      />
    </div>
  )
}

export default Contracts
