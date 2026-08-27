import React, { useEffect, useMemo, useState } from 'react'
import api from '../../api'
import { validateMpDateRange, validateMpCodeSearch, MP_MAX_RANGE_DAYS } from '../../utils/mpDateValidation'
import {
  loadMpFavorites,
  saveMpFavorites,
  toggleMpFavorite,
  isMpFavorite,
} from './mpFavorites'
import {
  FiltersBar,
  DataTable,
  MetricStrip,
  Alert,
  Badge,
  Button,
  Field,
  Input,
  Select,
  Modal,
  DetailItem,
  Icon,
} from '@slep/ui'

const SLEP_ORGANISMO = '1820906'
const DEFAULT_TICKET = 'F23CBE04-6C9D-40C4-985C-7F5FCD6070B6'

const todayIsoDate = () => new Date().toISOString().split('T')[0]

const daysAgoIso = (days) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

const formatMoney = (amount) =>
  `$${(amount || 0).toLocaleString('es-CL')}`

const getStatusBadgeVariant = (estado) => {
  const e = (estado || '').toLowerCase()
  if (e.includes('recepcion')) return 'success'
  if (e.includes('acepta') || e.includes('envia') || e.includes('enviada')) return 'accent'
  if (e.includes('cancela') || e.includes('rechaza') || e.includes('rechazada')) return 'danger'
  return 'neutral'
}

/**
 * Panel Visor OC (Mercado Público). Sin PageHeader — para embeber en tabs.
 * @param {{ isNarrow?: boolean }} props
 */
const OCPanel = ({ isNarrow: isNarrowProp } = {}) => {
  const [ocs, setOcs] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchCode, setSearchCode] = useState('')
  const [searchMode, setSearchMode] = useState('range')
  const [selectedStartDate, setSelectedStartDate] = useState(daysAgoIso(7))
  const [selectedEndDate, setSelectedEndDate] = useState(todayIsoDate())
  const [error, setError] = useState(null)
  const [rangeWarning, setRangeWarning] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [apiMeta, setApiMeta] = useState(null)
  const [loadingTime, setLoadingTime] = useState(0)

  const [selectedOC, setSelectedOC] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const [ticket] = useState(() => localStorage.getItem('mp_ticket') || DEFAULT_TICKET)
  const [favStore, setFavStore] = useState(loadMpFavorites)

  const [internalNarrow, setInternalNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches,
  )

  const isNarrow = typeof isNarrowProp === 'boolean' ? isNarrowProp : internalNarrow

  useEffect(() => {
    if (typeof isNarrowProp === 'boolean') return undefined
    const mq = window.matchMedia('(max-width: 1023px)')
    const sync = () => setInternalNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [isNarrowProp])

  useEffect(() => {
    saveMpFavorites(favStore)
  }, [favStore])

  useEffect(() => {
    let interval
    if (loading) {
      setLoadingTime(0)
      interval = setInterval(() => {
        setLoadingTime((prev) => prev + 1)
      }, 1000)
    } else {
      setLoadingTime(0)
    }
    return () => clearInterval(interval)
  }, [loading])

  useEffect(() => {
    const check = validateMpDateRange(selectedStartDate, selectedEndDate)
    setRangeWarning(check.valid ? check.warning || null : null)
  }, [selectedStartDate, selectedEndDate])

  const getMaxEndDate = () => {
    if (!selectedStartDate) return todayIsoDate()
    const start = new Date(selectedStartDate)
    start.setDate(start.getDate() + MP_MAX_RANGE_DAYS - 1)
    const maxAllowed = start.toISOString().split('T')[0]
    const today = todayIsoDate()
    return maxAllowed < today ? maxAllowed : today
  }

  const getMinStartDate = () => {
    if (!selectedEndDate) return undefined
    const end = new Date(selectedEndDate)
    end.setDate(end.getDate() - (MP_MAX_RANGE_DAYS - 1))
    return end.toISOString().split('T')[0]
  }

  const getLoadingMessage = () => {
    if (loadingTime < 5) return 'Conectando con Mercado Público...'
    if (loadingTime < 15) return 'Sincronizando registros...'
    if (loadingTime < 30) return 'MP está respondiendo lento...'
    return 'Conexión extendida, espere un momento...'
  }

  const fetchOCs = async (isCodeSearch = false, forceScan = false) => {
    setError(null)

    const params = {
      CodigoOrganismo: SLEP_ORGANISMO,
      ticket,
      force: forceScan,
    }

    if (isCodeSearch) {
      const codeCheck = validateMpCodeSearch(searchCode)
      if (!codeCheck.valid) {
        setRangeWarning(null)
        setError(codeCheck.error)
        return
      }
      setRangeWarning(null)
      params.codigo = codeCheck.code
    } else {
      const rangeCheck = validateMpDateRange(selectedStartDate, selectedEndDate)
      if (!rangeCheck.valid) {
        setRangeWarning(null)
        setError(rangeCheck.error)
        return
      }
      setRangeWarning(rangeCheck.warning || null)
      params.fecha_inicio = selectedStartDate
      params.fecha_fin = selectedEndDate
    }

    setLoading(true)
    try {
      const response = await api.get('orden_compra/visor/', {
        params,
        timeout: 180000,
      })
      const data = response.data

      if (data && data.resultados !== undefined) {
        setOcs(data.resultados || [])
        setApiMeta(data.meta || null)
      } else {
        setOcs(Array.isArray(data) ? data : [])
        setApiMeta(null)
      }
      setHasSearched(true)
      setCurrentPage(1)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al conectar con la API de Mercado Público')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    if (searchMode === 'code') {
      fetchOCs(true, true)
    } else {
      fetchOCs(false, true)
    }
  }

  const toggleFavorite = (oc) => {
    setFavStore((prev) => toggleMpFavorite(prev, 'oc', oc))
  }

  const clearFilters = () => {
    setSearchMode('range')
    setSearchCode('')
    setSelectedStartDate(daysAgoIso(7))
    setSelectedEndDate(todayIsoDate())
    setError(null)
    setRangeWarning(null)
  }

  const handleOpenDetail = async (oc) => {
    setSelectedOC(oc)
    setIsModalOpen(true)
    setDetailLoading(true)
    try {
      const response = await api.get('orden_compra/visor/', {
        params: {
          codigo: oc.CodigoExterno,
          ticket,
          force: true,
        },
        timeout: 30000,
      })
      const detailedData = Array.isArray(response.data) ? response.data[0] : response.data
      if (detailedData) {
        setSelectedOC(detailedData)
      }
    } catch (err) {
      console.error('Error fetching OC detail:', err)
    } finally {
      setDetailLoading(false)
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedOC(null)
    setDetailLoading(false)
  }

  const resetTicket = () => {
    localStorage.removeItem('mp_ticket')
    window.location.reload()
  }

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return ocs.slice(start, start + pageSize)
  }, [ocs, currentPage, pageSize])

  const metrics = useMemo(() => {
    if (!hasSearched) return []
    const items = [
      {
        label: 'Órdenes',
        value: ocs.length,
        hint: 'Resultados de la búsqueda',
      },
    ]
    if (apiMeta?.dias_consultados != null) {
      items.push({
        label: 'Días consultados',
        value: apiMeta.dias_consultados,
        hint: 'Mercado Público día a día',
      })
    }
    if (apiMeta?.total != null && apiMeta.total !== ocs.length) {
      items.push({
        label: 'Total API',
        value: apiMeta.total,
        hint: 'Según metadata',
      })
    }
    return items
  }, [hasSearched, ocs.length, apiMeta])

  const columns = useMemo(
    () => [
      {
        key: 'codigo',
        header: 'Código OC',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        render: (oc) => (
          <div className="contracts-cat">
            <strong>{oc.CodigoExterno || '—'}</strong>
            {oc.TipoCompraRepresentativo && oc.TipoCompraRepresentativo !== 'No especificado' ? (
              <span>
                <Badge variant="accent">{oc.TipoCompraRepresentativo}</Badge>
              </span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'nombre',
        header: 'Nombre',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 2,
        render: (oc) => oc.Nombre || 'Sin nombre',
      },
      {
        key: 'estado',
        header: 'Estado',
        className: 'col--status',
        cardRole: 'status',
        priority: 1,
        render: (oc) => (
          <Badge variant={getStatusBadgeVariant(oc.Estado)}>{oc.Estado || '—'}</Badge>
        ),
      },
      {
        key: 'proveedor',
        header: 'Proveedor',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 3,
        render: (oc) =>
          oc.Proveedor?.Nombre || oc.Proveedor?.RazonSocial || oc.Proveedor?.Rut || 'Sin info pública',
      },
      {
        key: 'monto',
        header: 'Monto',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 3,
        render: (oc) => formatMoney(oc.MontoTotal),
      },
      {
        key: 'fecha',
        header: 'Fecha',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 3,
        render: (oc) => oc.Fechas?.FechaCreacion?.split('T')[0] || '—',
      },
      {
        key: 'items',
        header: 'Ítems',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 3,
        render: (oc) => oc.Items?.Cantidad || 0,
      },
      {
        key: 'actions',
        header: 'Acciones',
        className: 'col--actions',
        render: (oc) => {
          const fav = isMpFavorite(favStore, 'oc', oc.CodigoExterno)
          return (
            <div className="data-table__actions" onClick={(e) => e.stopPropagation()}>
              <Button
                variant={fav ? 'secondary' : 'quiet'}
                size="sm"
                title={fav ? 'Quitar favorito' : 'Agregar a favoritos'}
                onClick={() => toggleFavorite(oc)}
              >
                <Icon name="star" size="sm" />
              </Button>
              <Button variant="primary" size="sm" onClick={() => handleOpenDetail(oc)}>
                <Icon name="eye" size="sm" /> Ver
              </Button>
            </div>
          )
        },
      },
    ],
    [favStore],
  )

  const itemColumns = useMemo(
    () => [
      {
        key: 'producto',
        header: 'Cod. / producto',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        render: (item) => (
          <div className="contracts-cat">
            <strong>{item.CodigoProducto || '—'}</strong>
            <span>{item.NombreProducto || '—'}</span>
            {item.Categoria ? <span>{item.Categoria}</span> : null}
          </div>
        ),
      },
      {
        key: 'cant',
        header: 'Cant.',
        className: 'col--status',
        cardRole: 'status',
        priority: 1,
        render: (item) => (
          <div className="contracts-cat">
            <strong>{item.Cantidad ?? '—'}</strong>
            <span>{item.UnidadMedida || 'Un'}</span>
          </div>
        ),
      },
      {
        key: 'unitario',
        header: 'Unitario',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 3,
        render: (item) => formatMoney(item.PrecioNeto),
      },
      {
        key: 'total',
        header: 'Total',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 2,
        render: (item) => formatMoney(item.Total),
      },
    ],
    [],
  )

  const activeFilterCount =
    (searchMode !== 'range' ? 1 : 0) +
    (searchCode ? 1 : 0) +
    (selectedStartDate !== daysAgoIso(7) || selectedEndDate !== todayIsoDate() ? 1 : 0)

  return (
    <>
      <div className="mp-panel-meta">
        <p>
          SLEP Iquique · Organismo {SLEP_ORGANISMO} · Período máximo {MP_MAX_RANGE_DAYS} días
        </p>
        <div className="mp-panel-meta__actions">
          <span>
            Ticket {ticket ? String(ticket).substring(0, 8) : '---'}…
          </span>
          <Button variant="quiet" size="sm" type="button" onClick={resetTicket}>
            Reset ticket
          </Button>
        </div>
      </div>

      {rangeWarning && !error ? (
        <Alert variant="warning" title="Aviso de rango">
          {rangeWarning}
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="danger" title="Error" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Alert variant="info" title={`${loadingTime}s`}>
          {getLoadingMessage()}
        </Alert>
      ) : null}

      {metrics.length > 0 ? <MetricStrip items={metrics} /> : null}

      <FiltersBar
        onSearch={handleSearch}
        onClear={clearFilters}
        activeCount={activeFilterCount}
        searchLabel={searchMode === 'code' ? 'Buscar' : 'Sincronizar'}
        clearLabel="Limpiar"
      >
        <Field label="Modo" htmlFor="oc-search-mode">
          <Select
            id="oc-search-mode"
            value={searchMode}
            onChange={(e) => setSearchMode(e.target.value)}
          >
            <option value="range">Rango de fechas</option>
            <option value="code">Código OC</option>
          </Select>
        </Field>
        {searchMode === 'range' ? (
          <>
            <Field label="Desde" htmlFor="oc-fecha-inicio">
              <Input
                id="oc-fecha-inicio"
                type="date"
                value={selectedStartDate}
                min={getMinStartDate() || undefined}
                max={selectedEndDate || undefined}
                onChange={(e) => {
                  const val = e.target.value
                  setSelectedStartDate(val)
                  if (val) {
                    const start = new Date(val)
                    const end = new Date(selectedEndDate)
                    const diffDays =
                      Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1
                    if (diffDays > MP_MAX_RANGE_DAYS) {
                      const maxEnd = new Date(start)
                      maxEnd.setDate(maxEnd.getDate() + MP_MAX_RANGE_DAYS - 1)
                      const maxAllowed = maxEnd.toISOString().split('T')[0]
                      const today = todayIsoDate()
                      setSelectedEndDate(maxAllowed < today ? maxAllowed : today)
                    }
                  }
                }}
              />
            </Field>
            <Field label="Hasta" htmlFor="oc-fecha-fin">
              <Input
                id="oc-fecha-fin"
                type="date"
                value={selectedEndDate}
                min={selectedStartDate || undefined}
                max={getMaxEndDate() || undefined}
                onChange={(e) => {
                  const val = e.target.value
                  setSelectedEndDate(val)
                  if (val) {
                    const start = new Date(selectedStartDate)
                    const end = new Date(val)
                    const diffDays =
                      Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1
                    if (diffDays > MP_MAX_RANGE_DAYS) {
                      const minStart = new Date(end)
                      minStart.setDate(minStart.getDate() - (MP_MAX_RANGE_DAYS - 1))
                      setSelectedStartDate(minStart.toISOString().split('T')[0])
                    }
                  }
                }}
              />
            </Field>
          </>
        ) : (
          <Field label="Código OC" htmlFor="oc-codigo">
            <div className="input-wrap">
              <Icon name="search" className="input-wrap__icon" size="sm" />
              <Input
                id="oc-codigo"
                type="search"
                placeholder="Ej. 1234-56-LE26"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
              />
            </div>
          </Field>
        )}
      </FiltersBar>

      <DataTable
        columns={columns}
        rows={pagedRows}
        loading={loading}
        totalCount={ocs.length}
        emptyTitle={hasSearched ? 'No se encontraron registros' : 'Explorador de órdenes de compra'}
        emptyDescription={
          hasSearched
            ? 'Pruebe otro rango de fechas o código de OC'
            : 'Seleccione fechas y sincronice, o busque por código OC'
        }
        fillViewport={!isNarrow}
        page={currentPage}
        pageSize={pageSize}
        pageSizeId="oc-visor-page-size"
        pageSizeOptions={[10, 20, 50, 100]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setCurrentPage(1)
        }}
        getRowKey={(row, i) => row.CodigoExterno || i}
        mobileCardActions={(oc) => ({
          primary: {
            label: 'Ver detalle',
            onClick: () => handleOpenDetail(oc),
          },
          secondary: {
            label: isMpFavorite(favStore, 'oc', oc.CodigoExterno)
              ? 'Quitar favorito'
              : 'Favorito',
            onClick: () => toggleFavorite(oc),
          },
        })}
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">Órdenes de compra</span>
            <Badge variant="neutral">{ocs.length}</Badge>
            {favStore.oc?.length > 0 ? (
              <Badge variant="accent">
                <Icon name="star" size="sm" /> {favStore.oc.length}
              </Badge>
            ) : null}
          </div>
        }
      />

      <Modal
        open={isModalOpen && !!selectedOC}
        onClose={closeModal}
        size="lg"
        title={selectedOC?.Nombre || 'Orden de Compra s/n'}
        subheader={selectedOC?.CodigoExterno || ''}
        headerActions={
          selectedOC ? (
            <Badge variant={getStatusBadgeVariant(selectedOC.Estado)}>
              {selectedOC.Estado || '—'}
            </Badge>
          ) : null
        }
        footer={
          <>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginRight: 'auto', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
              <Icon name="globe" size="sm" /> API Mercado Público
            </span>
            <Button variant="quiet" onClick={closeModal}>
              Cerrar
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                window.open(
                  `https://www.mercadopublico.cl/Directorio/Ticket/TicketOC?codigooc=${selectedOC?.CodigoExterno}`,
                  '_blank',
                )
              }
              disabled={!selectedOC?.CodigoExterno}
            >
              <Icon name="external" size="sm" /> Ver en portal MP
            </Button>
          </>
        }
      >
        {detailLoading ? (
          <Alert variant="info" title="Cargando">
            Cargando detalle…
          </Alert>
        ) : selectedOC ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              <Badge variant="accent">Ficha OC</Badge>
              {selectedOC.TipoCompraRepresentativo &&
              selectedOC.TipoCompraRepresentativo !== 'No especificado' ? (
                <Badge variant="accent">{selectedOC.TipoCompraRepresentativo}</Badge>
              ) : null}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
                gap: 'var(--space-3)',
              }}
            >
              <DetailItem label="Fecha envío">
                {selectedOC.Fechas?.FechaCreacion?.replace('T', ' ').split('.')[0] || '—'}
              </DetailItem>
              <DetailItem label="Tipo">{selectedOC.Tipo || 'Consignación'}</DetailItem>
              <DetailItem label="Monto total">
                {formatMoney(selectedOC.MontoTotal)} {selectedOC.Moneda || 'CLP'}
              </DetailItem>
              <DetailItem label="Condición de pago">
                {selectedOC.CondicionPago || '30 días contra factura'}
              </DetailItem>
              <DetailItem label="Financiamiento">
                {selectedOC.Financiamiento || 'Fondos propios'}
              </DetailItem>
            </div>

            <div>
              <h3 style={{ margin: '0 0 var(--space-2)', fontSize: '0.85rem' }}>Proveedor</h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
                  gap: 'var(--space-3)',
                }}
              >
                <DetailItem label="Razón social">
                  {selectedOC.Proveedor?.Nombre || '—'}
                </DetailItem>
                <DetailItem label="RUT">{selectedOC.Proveedor?.Rut || '—'}</DetailItem>
                {selectedOC.Proveedor?.Contacto ? (
                  <DetailItem label="Contacto">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Icon name="user" size="sm" /> {selectedOC.Proveedor.Contacto}
                    </span>
                  </DetailItem>
                ) : null}
                {selectedOC.Proveedor?.Mail ? (
                  <DetailItem label="Correo">{selectedOC.Proveedor.Mail}</DetailItem>
                ) : null}
                {selectedOC.Proveedor?.Fono ? (
                  <DetailItem label="Teléfono">{selectedOC.Proveedor.Fono}</DetailItem>
                ) : null}
              </div>
            </div>

            <div>
              <h3 style={{ margin: '0 0 var(--space-2)', fontSize: '0.85rem' }}>
                Descripción / observación
              </h3>
              <p style={{ margin: 0, whiteSpace: 'pre-line', fontSize: '0.85rem' }}>
                {selectedOC.Observacion || 'Sin descripción detallada disponible.'}
              </p>
            </div>

            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--space-2)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                <h3 style={{ margin: 0, fontSize: '0.85rem' }}>
                  Listado de productos / servicios
                </h3>
                <Badge variant="neutral">{selectedOC.Items?.Cantidad || 0} posiciones</Badge>
              </div>
              <DataTable
                columns={itemColumns}
                rows={selectedOC.Items?.Listado || []}
                totalCount={selectedOC.Items?.Listado?.length || 0}
                emptyTitle="Sin ítems"
                emptyDescription="Esta orden no tiene posiciones publicadas."
                fillViewport={false}
                showFooter={false}
                getRowKey={(row, i) => `${row.CodigoProducto || 'item'}-${i}`}
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  )
}

export default OCPanel
