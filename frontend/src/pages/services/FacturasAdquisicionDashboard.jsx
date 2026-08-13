import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { useNotify } from '../../hooks/useNotify'
import AdquisicionModal from '../../components/services/AdquisicionModal'
import {
  PageHeader,
  FiltersBar,
  DataTable,
  Badge,
  Button,
  Field,
  Input,
  ConfirmModal,
  Icon
} from '@slep/ui'

const initialFormState = () => ({
  cdp: '',
  descripcion: '',
  periodo: '',
  fecha_recepcion: new Date().toISOString().split('T')[0],
  tipo_entrega: '',
  proveedor: '',
  establecimientos: [],
  total_neto: '',
  iva: '',
  total_pagar: '',
  grupo_firmante: '',
  firmante: '',
  nro_factura: '',
  nro_oc: '',
  folio: '',
})

const formatCurrency = (amount) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount || 0)

const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

const TABS = [
  { id: 'sin_oc', label: 'Facturas sin OC', api: 'facturas-adquisicion' },
  { id: 'compra_agil', label: 'Compra ágil', api: 'compras-agiles' },
]

const FacturasAdquisicionDashboard = () => {
  const [activeTab, setActiveTab] = useState('sin_oc')
  const [facturas, setFacturas] = useState([])
  const [lookups, setLookups] = useState({
    establishments: [],
    providers: [],
    deliveryTypes: [],
    groups: [],
    establishmentTypes: [],
  })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(initialFormState)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const { notify } = useNotify()

  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [ordering, setOrdering] = useState('-fecha_recepcion')
  const [pageSize, setPageSize] = useState(10)
  const debouncedSearch = useDebouncedValue(searchQuery)
  const isCompraAgil = activeTab === 'compra_agil'
  const apiBase = isCompraAgil ? 'compras-agiles' : 'facturas-adquisicion'

  const fetchLookups = async () => {
    try {
      const [estRes, provRes, delRes, grpRes, typRes] = await Promise.all([
        api.get('establecimientos/', { params: { page_size: 1000, activo: true } }),
        api.get('proveedores/'),
        api.get('tipos-entrega/'),
        api.get('grupos/', { params: { page_size: 1000 } }),
        api.get('tipos-establecimiento/'),
      ])
      setLookups({
        establishments: estRes.data.results || estRes.data,
        providers: provRes.data.results || provRes.data,
        deliveryTypes: delRes.data.results || delRes.data,
        groups: grpRes.data.results || grpRes.data,
        establishmentTypes: typRes.data.results || typRes.data,
      })
    } catch (error) {
      console.error(error)
    }
  }

  const fetchData = async (
    page = 1,
    size = pageSize,
    search = debouncedSearch,
    order = ordering,
  ) => {
    setLoading(true)
    try {
      const params = {
        page,
        search,
        ordering: order,
        page_size: size,
      }
      const factRes = await api.get(`${apiBase}/`, { params })
      const data = factRes.data.results || (Array.isArray(factRes.data) ? factRes.data : [])
      setFacturas(data)
      setTotalCount(factRes.data.count ?? data.length)
      setCurrentPage(page)
    } catch (error) {
      console.error(error)
      setFacturas([])
      notify({ variant: 'danger', text: 'No se pudieron cargar las recepciones.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLookups()
  }, [])

  useEffect(() => {
    fetchData(1, pageSize, debouncedSearch, ordering)
  }, [debouncedSearch, ordering, pageSize, activeTab])

  const handleTabChange = (tabId) => {
    if (tabId === activeTab) return
    setActiveTab(tabId)
    setSearchQuery('')
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setCurrentPage(1)
  }

  const handleNew = () => {
    setFormData(initialFormState())
    setEditingId(null)
    setShowModal(true)
  }

  const handleEdit = (item) => {
    setFormData({
      cdp: item.cdp,
      periodo: item.periodo || '',
      descripcion: item.descripcion,
      fecha_recepcion: item.fecha_recepcion,
      tipo_entrega: item.tipo_entrega,
      proveedor: item.proveedor,
      establecimientos: item.establecimientos || [],
      total_neto: item.total_neto,
      iva: item.iva,
      total_pagar: item.total_pagar,
      grupo_firmante: item.grupo_firmante || '',
      firmante: item.firmante || '',
      nro_factura: item.nro_factura || '',
      nro_oc: item.nro_oc || '',
      folio: item.folio || '',
    })
    setEditingId(item.id)
    setShowModal(true)
  }

  const handleSave = async (data) => {
    const dataToSave = {
      ...data,
      total_neto: parseInt(data.total_neto, 10) || 0,
      iva: parseInt(data.iva, 10) || 0,
      total_pagar: parseInt(data.total_pagar, 10) || 0,
      grupo_firmante: data.grupo_firmante || null,
      firmante: data.firmante || null,
    }
    try {
      if (editingId) {
        await api.put(`${apiBase}/${editingId}/`, dataToSave)
      } else {
        await api.post(`${apiBase}/`, dataToSave)
      }
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  const handleFormClose = (result) => {
    setShowModal(false)
    setEditingId(null)
    if (result?.saved) {
      fetchData(currentPage, pageSize, debouncedSearch, ordering)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`${apiBase}/${deleteTarget.id}/`)
      setDeleteTarget(null)
      notify({ variant: 'success', text: 'Recepción eliminada.' })
      await fetchData(currentPage, pageSize, debouncedSearch, ordering)
    } catch (error) {
      console.error(error)
      notify({ variant: 'danger', text: 'Error al eliminar la recepción.' })
    } finally {
      setDeleting(false)
    }
  }

  const handleDownloadPDF = async (item) => {
    try {
      const response = await api.get(`${apiBase}/${item.id}/generate_pdf/`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const rawFilename = item.nro_oc
        ? `RC ${item.nro_oc}.pdf`
        : `RC_Adquisicion_${item.folio || item.id}.pdf`
      const filename = rawFilename.replace(/[/\\?%*:|"<>]/g, '-')
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error(error)
      notify({ variant: 'danger', text: 'Error al generar el PDF.' })
    }
  }

  const sortKeyMap = {
    folio: 'id',
    fecha: 'fecha_recepcion',
    proveedor: 'proveedor__nombre',
    total: 'total_pagar',
  }

  const handleSort = (colKey) => {
    const apiKey = sortKeyMap[colKey]
    if (!apiKey) return
    const next =
      ordering === apiKey ? `-${apiKey}` : ordering === `-${apiKey}` ? apiKey : apiKey
    setOrdering(next)
  }

  const activeSortKey = Object.entries(sortKeyMap).find(
    ([, apiKey]) => ordering === apiKey || ordering === `-${apiKey}`,
  )?.[0]

  const columns = useMemo(
    () => [
      {
        key: 'folio',
        header: 'Folio',
        className: 'col--status',
        cardRole: 'status',
        priority: 1,
        sortable: true,
        render: (item) => (
          <Badge variant="neutral">{item.folio || `#${item.id}`}</Badge>
        ),
      },
      {
        key: 'fecha',
        header: 'Fecha',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 1,
        sortable: true,
        render: (item) => formatDate(item.fecha_recepcion),
      },
      {
        key: 'proveedor',
        header: 'Proveedor',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        sortable: true,
        render: (item) => (
          <div className="contracts-cat">
            <strong>{item.proveedor_nombre || '—'}</strong>
            {item.proveedor_rut ? <span>{item.proveedor_rut}</span> : null}
          </div>
        ),
      },
      {
        key: 'detalle',
        header: 'CDP / Detalle',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) => (
          <div className="contracts-cat">
            <span>
              CDP: {item.cdp || '—'}
              {item.nro_oc ? ` · OC: ${item.nro_oc}` : ''}
              {item.periodo ? ` · ${item.periodo}` : ''}
            </span>
            <span title={item.descripcion || ''}>{item.descripcion || '—'}</span>
          </div>
        ),
      },
      {
        key: 'total',
        header: 'Total',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        sortable: true,
        render: (item) => (
          <div className="contracts-cat">
            <strong>{formatCurrency(item.total_pagar)}</strong>
            <span>Neto: {formatCurrency(item.total_neto)}</span>
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Acciones',
        className: 'col--actions',
        render: (item) => (
          <div className="data-table__actions" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownloadPDF(item)}
              title="Generar recepción conforme"
            >
              <Icon name="download" size="sm" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
              <Icon name="edit" size="sm" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(item)}>
              <Icon name="trash" size="sm" />
            </Button>
          </div>
        ),
      },
    ],
    [apiBase],
  )

  return (
    <div className="page" data-od-id="recepciones-adq-page" data-fill-viewport>
      <PageHeader
        icon="receipt"
        title="Recepciones"
        breadcrumbs={[{ label: 'SSGG' }, { label: 'Recepciones' }]}
        linkComponent={Link}
        split
        actions={
          <Button variant="primary" size="sm" onClick={handleNew}>
            <Icon name="plus" size="sm" />
            {isCompraAgil ? 'Registrar compra ágil' : 'Registrar factura'}
          </Button>
        }
      />

      <div className="tabs">
        <ul className="tabs__list" role="tablist" aria-label="Tipos de recepción">
          {TABS.map((tab) => (
            <li key={tab.id}>
              <button
                type="button"
                role="tab"
                className={`tabs__btn${activeTab === tab.id ? ' is-active' : ''}`}
                aria-selected={activeTab === tab.id}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <FiltersBar onSearch={() => setCurrentPage(1)} onClear={clearFilters}>
        <Field label="Buscar" htmlFor="adq-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="adq-q"
              type="search"
              placeholder="Folio, CDP o proveedor…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </Field>
      </FiltersBar>

      <DataTable
        columns={columns}
        rows={facturas}
        loading={loading}
        totalCount={totalCount}
        emptyTitle={isCompraAgil ? 'Sin compras ágiles' : 'Sin facturas'}
        emptyDescription={
          isCompraAgil
            ? 'No hay recepciones de compra ágil con la búsqueda actual.'
            : 'No hay facturas sin OC con la búsqueda actual.'
        }
        emptyAction={
          <Button variant="primary" size="sm" onClick={handleNew}>
            <Icon name="plus" size="sm" />
            {isCompraAgil ? 'Registrar compra ágil' : 'Registrar factura'}
          </Button>
        }
        fillViewport
        page={currentPage}
        pageSize={pageSize}
        pageSizeId="adq-page-size"
        pageSizeOptions={[10, 25, 50, 100]}
        onPageChange={(p) => fetchData(p, pageSize, debouncedSearch, ordering)}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setCurrentPage(1)
        }}
        sortKey={activeSortKey}
        onSort={handleSort}
        mobileCardActions={(item) => ({
          primary: { label: 'Editar', onClick: () => handleEdit(item) },
          secondary: { label: 'PDF', onClick: () => handleDownloadPDF(item) },
        })}
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">Listado</span>
            <Badge variant="neutral">{totalCount}</Badge>
          </div>
        }
      />

      <AdquisicionModal
        open={showModal}
        onClose={handleFormClose}
        onSave={handleSave}
        editingId={editingId}
        initialData={formData}
        lookups={lookups}
        variant={isCompraAgil ? 'compra_agil' : 'sin_oc'}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        onConfirm={confirmDelete}
        title={isCompraAgil ? 'Eliminar compra ágil' : 'Eliminar factura'}
        description={
          deleteTarget
            ? `¿Eliminar ${deleteTarget.folio || `#${deleteTarget.id}`}?`
            : ''
        }
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        danger
      />
    </div>
  )
}

export default FacturasAdquisicionDashboard
