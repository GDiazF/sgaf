import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  PageHeader,
  FiltersBar,
  DataTable,
  Badge,
  Button,
  Field,
  Input,
  Select,
  Alert,
  Icon,
} from '@slep/ui'
import api from '../../api'
import useDebouncedValue from '../../hooks/useDebouncedValue'

const formatCurrency = (amount) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount || 0)

const formatDate = (date) => {
  if (!date) return '—'
  return date.split('-').reverse().join('/')
}

const PaymentsReport = () => {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [establishments, setEstablishments] = useState([])
  const [providers, setProviders] = useState([])

  const [startDate, setStartDate] = useState(`${new Date().getFullYear()}-01-01`)
  const [endDate, setEndDate] = useState('')
  const [selectedEstablishment, setSelectedEstablishment] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [ordering, setOrdering] = useState('-fecha_pago')
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebouncedValue(searchTerm)

  const buildFilterParams = useCallback(
    (search = debouncedSearchTerm) => {
      const params = {}
      if (startDate) params.fecha_pago__gte = startDate
      if (endDate) params.fecha_pago__lte = endDate
      if (selectedEstablishment) {
        if (selectedEstablishment === 'JARDINES') {
          params.establecimiento__tipo__area_gestion = 'JARDIN'
        } else if (selectedEstablishment === 'COLEGIOS') {
          params.establecimiento__tipo__area_gestion = 'ESTABLECIMIENTO'
        } else {
          params.establecimiento = selectedEstablishment
        }
      }
      if (selectedProvider) params.servicio__proveedor = selectedProvider
      if (search) params.search = search
      return params
    },
    [debouncedSearchTerm, endDate, selectedEstablishment, selectedProvider, startDate],
  )

  const fetchData = useCallback(
    async (page = 1, size = pageSize, search = debouncedSearchTerm) => {
      setLoading(true)
      setErrorMessage('')
      try {
        const params = {
          ...buildFilterParams(search),
          page,
          page_size: size,
          ordering,
        }
        const response = await api.get('registros-pagos/', { params })
        const data = response.data.results || response.data || []
        const count = response.data.count || (Array.isArray(data) ? data.length : 0)
        setPayments(Array.isArray(data) ? data : [])
        setTotalCount(count)
      } catch (error) {
        console.error('Error fetching report data:', error)
        setErrorMessage('No se pudieron cargar los registros del reporte.')
      } finally {
        setLoading(false)
      }
    },
    [buildFilterParams, debouncedSearchTerm, ordering, pageSize],
  )

  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [estRes, provRes] = await Promise.all([
          api.get('establecimientos/', { params: { page_size: 1000 } }),
          api.get('proveedores/', { params: { page_size: 1000 } }),
        ])
        const estData = estRes.data.results || estRes.data || []
        const provData = provRes.data.results || provRes.data || []
        setEstablishments(Array.isArray(estData) ? estData : [])
        setProviders(Array.isArray(provData) ? provData : [])
      } catch (error) {
        console.error('Error fetching lookups:', error)
      }
    }
    fetchLookups()
  }, [])

  useEffect(() => {
    fetchData(currentPage, pageSize, debouncedSearchTerm)
  }, [currentPage, pageSize, debouncedSearchTerm, fetchData])

  const handleExport = async () => {
    setErrorMessage('')
    try {
      const params = buildFilterParams()
      const response = await api.get('registros-pagos/export_excel/', {
        params,
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute(
        'download',
        `reporte_consumos_${new Date().toISOString().split('T')[0]}.xlsx`,
      )
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting excel:', error)
      setErrorMessage('No se pudo descargar el reporte en Excel.')
    }
  }

  const handleSort = (key) => {
    setOrdering((prev) => {
      if (prev === key) return `-${key}`
      if (prev === `-${key}`) return key
      return key
    })
    setCurrentPage(1)
  }

  const columns = useMemo(
    () => [
      {
        key: 'fecha_pago',
        header: 'Fecha pago',
        sortable: true,
        render: (row) => formatDate(row.fecha_pago),
      },
      {
        key: 'establecimiento_nombre',
        header: 'Establecimiento',
        render: (row) => row.establecimiento_nombre || '—',
      },
      {
        key: 'servicio_proveedor_nombre',
        header: 'Proveedor',
        render: (row) => row.servicio_proveedor_nombre || '—',
      },
      {
        key: 'servicio_numero_cliente',
        header: 'Nro cliente',
        render: (row) => row.servicio_numero_cliente || '—',
      },
      {
        key: 'consumo',
        header: 'Consumo',
        render: (row) =>
          row.consumo !== null && row.consumo !== undefined
            ? `${row.consumo} ${row.servicio_unidad_medida || ''}`.trim()
            : '—',
      },
      {
        key: 'monto_total',
        header: 'Monto total',
        align: 'right',
        render: (row) => formatCurrency(row.monto_total),
      },
      {
        key: 'recepcion_conforme',
        header: 'Estado',
        render: (row) => (
          <Badge variant={row.recepcion_conforme ? 'success' : 'danger'}>
            {row.recepcion_conforme ? 'Con RC' : 'Pendiente'}
          </Badge>
        ),
      },
    ],
    [],
  )

  return (
    <div className="page" data-od-id="payments-report-page" data-fill-viewport>
      <PageHeader
        icon="receipt"
        title="Reporte de consumos"
        description="Consulta histórica de consumos, facturación y pagos corporativos"
        breadcrumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Servicios', to: '/services' },
          { label: 'Reporte de consumos' },
        ]}
        linkComponent={Link}
        actions={
          <Button type="button" variant="secondary" onClick={handleExport}>
            <Icon name="download" size={16} />
            Descargar Excel
          </Button>
        }
      />

      <FiltersBar>
        <Field label="Buscar">
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="Cliente, factura o jardín…"
          />
        </Field>
        <Field label="Desde">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value)
              setCurrentPage(1)
            }}
          />
        </Field>
        <Field label="Hasta">
          <Input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value)
              setCurrentPage(1)
            }}
          />
        </Field>
        <Field label="Establecimiento">
          <Select
            value={selectedEstablishment}
            onChange={(e) => {
              setSelectedEstablishment(e.target.value)
              setCurrentPage(1)
            }}
          >
            <option value="">Todos</option>
            <option value="JARDINES">Todos los jardines</option>
            <option value="COLEGIOS">Todos los colegios</option>
            {establishments.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Proveedor">
          <Select
            value={selectedProvider}
            onChange={(e) => {
              setSelectedProvider(e.target.value)
              setCurrentPage(1)
            }}
          >
            <option value="">Todos los proveedores</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </Field>
      </FiltersBar>

      {errorMessage ? (
        <Alert variant="danger" title="Error" className="alert--compact">
          {errorMessage}
        </Alert>
      ) : null}

      <DataTable
        columns={columns}
        rows={payments}
        rowKey={(row) => row.id}
        loading={loading}
        emptyTitle="No se encontraron registros"
        emptyDescription="Ajusta los filtros o el rango de fechas."
        page={currentPage}
        pageSize={pageSize}
        pageSizeId="reporte-consumos-page-size"
        pageSizeOptions={[10, 20, 50, 100]}
        totalCount={totalCount}
        onPageChange={(p) => {
          setCurrentPage(p)
          fetchData(p, pageSize, debouncedSearchTerm)
        }}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setCurrentPage(1)
        }}
        ordering={ordering}
        sortKey={ordering.replace(/^-/, '')}
        onSort={handleSort}
      />
    </div>
  )
}

export default PaymentsReport
