import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  FiltersBar,
  Field,
  Input,
  Select,
  Button,
  Alert,
  Badge,
  Modal,
  Icon,
  DataTable,
} from '@slep/ui'
import api from '../../api'
import {
  validateMpDateRange,
  validateMpCodeSearch,
  MP_MAX_RANGE_DAYS,
} from '../../utils/mpDateValidation'
import {
  loadMpFavorites,
  saveMpFavorites,
  toggleMpFavorite,
} from './mpFavorites'
import {
  getStatusLabel,
  getStatusVariant,
  formatDate,
} from './mpDetailUtils'
import {
  LicitacionDetailContent,
  LicitacionDetailSubheader,
  LicitacionResponsableMeta,
} from './LicitacionDetailContent'

const todayIsoDate = () => new Date().toISOString().split('T')[0]

const STATE_FILTERS = [
  { v: 'todos', l: 'Todos' },
  { v: 'publicada', l: 'Publicadas' },
  { v: 'cerrada', l: 'Cerradas' },
  { v: 'adjudicada', l: 'Adjudicadas' },
  { v: 'desierta', l: 'Desiertas' },
]

/**
 * Panel de licitaciones Mercado Público (sin PageHeader).
 * Pensado para embeberse en un dashboard con pestañas.
 */
const LicitacionesPanel = ({ isNarrow: isNarrowProp } = {}) => {
  const [lics, setLics] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchCode, setSearchCode] = useState('')
  const [searchMode, setSearchMode] = useState('range')
  const [selectedStartDate, setSelectedStartDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  )
  const [selectedEndDate, setSelectedEndDate] = useState(todayIsoDate())
  const [selectedState, setSelectedState] = useState('todos')
  const [filterState, setFilterState] = useState('todos')
  const [error, setError] = useState(null)
  const [rangeWarning, setRangeWarning] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [apiMeta, setApiMeta] = useState(null)
  const [loadingTime, setLoadingTime] = useState(0)

  const [favStore, setFavStore] = useState(loadMpFavorites)
  const following = favStore.licitaciones || []
  const [ticket] = useState(
    localStorage.getItem('mp_ticket') || 'F23CBE04-6C9D-40C4-985C-7F5FCD6070B6',
  )
  const [selectedLic, setSelectedLic] = useState(null)
  const [copiedCode, setCopiedCode] = useState(null)
  const copiedTimerRef = useRef(null)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [isNarrowInternal, setIsNarrowInternal] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches,
  )
  const isNarrow = typeof isNarrowProp === 'boolean' ? isNarrowProp : isNarrowInternal

  const slepIquiqueCode = '1820906'

  useEffect(() => {
    if (typeof isNarrowProp === 'boolean') return undefined
    const mq = window.matchMedia('(max-width: 1023px)')
    const sync = () => setIsNarrowInternal(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [isNarrowProp])

  useEffect(() => {
    const saved = sessionStorage.getItem('lics_last_search')
    if (!saved) return
    try {
      const data = JSON.parse(saved)
      setLics(data.lics || [])
      setApiMeta(data.apiMeta || null)
      setHasSearched(true)
      if (data.mode) setSearchMode(data.mode)
    } catch (e) {
      console.error('Error restore session:', e)
    }
  }, [])

  useEffect(() => {
    saveMpFavorites(favStore)
  }, [favStore])

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    }
  }, [])

  const copyCodigo = async (codigo) => {
    if (!codigo) return
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiedCode(codigo)
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
      copiedTimerRef.current = setTimeout(() => {
        setCopiedCode((prev) => (prev === codigo ? null : prev))
      }, 2000)
    } catch (err) {
      console.error('No se pudo copiar el código:', err)
      setError('No se pudo copiar el código al portapapeles.')
    }
  }

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
    if (loadingTime < 15) return 'Sincronizando registros en paralelo...'
    if (loadingTime < 30) return 'MP está respondiendo más lento de lo habitual...'
    if (loadingTime < 60) return 'Saturación detectada en MP, reintentando canales...'
    return 'Conexión extendida, por favor espere unos segundos más...'
  }

  const fetchData = async (params = {}) => {
    setError(null)

    const requestParams = { ticket }
    if (params.force) requestParams.force = true

    if (params.codigo) {
      const codeCheck = validateMpCodeSearch(params.codigo)
      if (!codeCheck.valid) {
        setRangeWarning(null)
        setError(codeCheck.error)
        return
      }
      setRangeWarning(null)
      requestParams.codigo = codeCheck.code
    } else {
      const rangeCheck = validateMpDateRange(selectedStartDate, selectedEndDate)
      if (!rangeCheck.valid) {
        setRangeWarning(null)
        setError(rangeCheck.error)
        return
      }
      setRangeWarning(rangeCheck.warning || null)
      requestParams.fecha_inicio = selectedStartDate
      requestParams.fecha_fin = selectedEndDate
      requestParams.CodigoOrganismo = slepIquiqueCode
    }

    setLoading(true)
    setLoadingTime(0)
    setLics([])
    setFilterState('todos')
    setApiMeta(null)
    setHasSearched(false)
    setPage(1)

    try {
      if (selectedState && selectedState !== 'todos') {
        requestParams.estado = selectedState
      }

      console.log('🔍 Enviando a backend:', requestParams)

      const response = await api.get('licitaciones/visor/', {
        params: requestParams,
        timeout: 180000,
      })

      const data = response.data

      if (
        data &&
        typeof data === 'object' &&
        !Array.isArray(data) &&
        data.resultados !== undefined
      ) {
        setLics(data.resultados || [])
        setApiMeta(data.meta || null)
        sessionStorage.setItem(
          'lics_last_search',
          JSON.stringify({
            lics: data.resultados || [],
            apiMeta: data.meta || null,
            mode: searchMode,
          }),
        )
      } else {
        const list = Array.isArray(data) ? data : []
        setLics(list)
        setApiMeta(null)
        sessionStorage.setItem(
          'lics_last_search',
          JSON.stringify({
            lics: list,
            apiMeta: null,
            mode: searchMode,
          }),
        )
      }
    } catch (err) {
      console.error('Sync Error:', err)
      let msg = 'Error al conectar con la API de Mercado Público'
      if (err.code === 'ECONNABORTED') msg = 'Tiempo de espera agotado (MP saturado)'
      else if (err.response?.data?.error) msg = err.response.data.error
      else if (err.message) msg = err.message
      setError(msg)
    } finally {
      setLoading(false)
      setHasSearched(true)
    }
  }

  const fetchDetail = async (codigo) => {
    const existing = lics.find((l) => l.CodigoExterno === codigo)
    if (existing?._has_full_detail) {
      setSelectedLic(existing)
      return
    }

    setSelectedLic({ CodigoExterno: codigo, _loading: true })
    try {
      const response = await api.get('licitaciones/visor/', {
        params: { codigo, ticket },
      })
      if (response.data && response.data.length > 0) {
        const fullDetail = { ...response.data[0], _has_full_detail: true, _loading: false }
        setSelectedLic(fullDetail)
        setLics((prev) =>
          prev.map((l) => (l.CodigoExterno === codigo ? fullDetail : l)),
        )
      }
    } catch (err) {
      console.error('Detail Fetch Error:', err)
      setSelectedLic(null)
    }
  }

  const handleSearchByCode = () => {
    const codeCheck = validateMpCodeSearch(searchCode)
    if (!codeCheck.valid) {
      setError(codeCheck.error)
      return
    }
    fetchData({ codigo: codeCheck.code })
  }

  const handleFiltersSearch = () => {
    const trimmed = (searchCode || '').trim()
    if (trimmed) {
      handleSearchByCode()
      return
    }
    fetchData()
  }

  const clearFilters = () => {
    setSearchCode('')
    setSelectedState('todos')
    setFilterState('todos')
    setSelectedStartDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    )
    setSelectedEndDate(todayIsoDate())
    setError(null)
  }

  const toggleFollow = (lic) => {
    setFavStore((prev) => toggleMpFavorite(prev, 'licitaciones', lic))
  }

  const filteredLics = useMemo(() => {
    if (filterState === 'todos') return lics
    return lics.filter((l) =>
      getStatusLabel(l.Estado, l.CodigoEstado)
        .toLowerCase()
        .includes(filterState.toLowerCase()),
    )
  }, [lics, filterState])

  useEffect(() => {
    setPage(1)
  }, [filterState, lics])

  const pagedLics = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredLics.slice(start, start + pageSize)
  }, [filteredLics, page, pageSize])

  const activeFilterCount =
    (selectedState !== 'todos' ? 1 : 0) + (searchCode.trim() ? 1 : 0)

  const columns = useMemo(
    () => [
      {
        key: 'codigo',
        header: 'Código',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        render: (lic) => (
          <div className="contracts-cat">
            <strong style={{ fontFamily: 'var(--font-mono, monospace)' }}>
              {lic.CodigoExterno}
            </strong>
            <span>{lic.Comprador?.NombreUnidad || 'S/I'}</span>
          </div>
        ),
      },
      {
        key: 'nombre',
        header: 'Nombre',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 2,
        render: (lic) => (
          <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {lic.Nombre || '—'}
          </span>
        ),
      },
      {
        key: 'estado',
        header: 'Estado',
        cardRole: 'status',
        priority: 3,
        render: (lic) => (
          <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <Badge variant={getStatusVariant(lic.Estado, lic.CodigoEstado)} dot>
              {getStatusLabel(lic.Estado, lic.CodigoEstado)}
            </Badge>
            {lic._has_full_detail ? <Badge variant="accent">Full</Badge> : null}
          </span>
        ),
      },
      {
        key: 'creacion',
        header: 'Creación',
        className: 'col--tablet-hide',
        cardRole: 'field',
        render: (lic) => formatDate(lic.Fechas?.FechaCreacion),
      },
      {
        key: 'cierre',
        header: 'Cierre',
        className: 'col--tablet-hide',
        cardRole: 'field',
        render: (lic) => formatDate(lic.Fechas?.FechaCierre || lic.FechaCierre),
      },
      {
        key: 'actions',
        header: 'Acciones',
        className: 'col--actions',
        render: (lic) => {
          const isFollowing = following.some((f) => f.CodigoExterno === lic.CodigoExterno)
          const justCopied = copiedCode === lic.CodigoExterno
          return (
            <div className="data-table__actions" onClick={(e) => e.stopPropagation()}>
              <Button
                variant={justCopied ? 'secondary' : 'quiet'}
                size="sm"
                title={justCopied ? 'Código copiado' : 'Copiar código'}
                aria-label={justCopied ? 'Código copiado' : 'Copiar código'}
                onClick={() => copyCodigo(lic.CodigoExterno)}
              >
                <Icon name={justCopied ? 'check' : 'file'} size="sm" />
              </Button>
              <Button
                variant={isFollowing ? 'secondary' : 'quiet'}
                size="sm"
                title={isFollowing ? 'Dejar de seguir' : 'Seguir'}
                onClick={() => toggleFollow(lic)}
                aria-pressed={isFollowing}
              >
                <Icon
                  name="star"
                  size="sm"
                  fill={isFollowing ? 'currentColor' : 'none'}
                  style={isFollowing ? { color: 'var(--warning, #d97706)' } : undefined}
                />
              </Button>
              <Button
                variant="primary"
                size="sm"
                title="Ver detalle"
                onClick={() => fetchDetail(lic.CodigoExterno)}
              >
                <Icon name="eye" size="sm" /> Detalle
              </Button>
            </div>
          )
        },
      },
    ],
    [following, copiedCode],
  )

  return (
    <>
      <div className="mp-panel-meta">
        <p>
          SLEP Iquique · Organismo {slepIquiqueCode} · Período máx. {MP_MAX_RANGE_DAYS} días
        </p>
        <div className="mp-panel-meta__actions">
          <span>
            Ticket {ticket ? String(ticket).substring(0, 8) : '---'}…
          </span>
          <Button
            type="button"
            variant="quiet"
            size="sm"
            onClick={() => {
              localStorage.removeItem('mp_ticket')
              window.location.reload()
            }}
          >
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
        <Alert variant="info" title={`Cargando · ${loadingTime}s`}>
          {getLoadingMessage()}
        </Alert>
      ) : null}

      <FiltersBar
        onSearch={handleFiltersSearch}
        onClear={clearFilters}
        activeCount={activeFilterCount}
        searchLabel={searchCode.trim() ? 'Buscar' : 'Sincronizar'}
        clearLabel="Limpiar"
        advanced={
          <Field label="Código licitación" htmlFor="lic-codigo">
            <div className="input-wrap">
              <Icon name="search" className="input-wrap__icon" size="sm" />
              <Input
                id="lic-codigo"
                type="search"
                placeholder="Ej. 1234-56-LP26"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
              />
            </div>
          </Field>
        }
      >
        <Field label="Desde" htmlFor="lic-desde">
          <Input
            id="lic-desde"
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
        <Field label="Hasta" htmlFor="lic-hasta">
          <Input
            id="lic-hasta"
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
        <Field label="Estado" htmlFor="lic-estado-api">
          <Select
            id="lic-estado-api"
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
          >
            <option value="todos">Todos</option>
            <option value="publicada">Publicada</option>
            <option value="cerrada">Cerrada</option>
            <option value="adjudicada">Adjudicada</option>
            <option value="desierta">Desierta</option>
          </Select>
        </Field>
      </FiltersBar>

      <DataTable
        columns={columns}
        rows={pagedLics}
        loading={loading}
        totalCount={filteredLics.length}
        emptyTitle={
          hasSearched ? 'No se encontraron registros' : 'Explorador de licitaciones'
        }
        emptyDescription={
          hasSearched
            ? 'No hay procesos para los criterios seleccionados.'
            : 'Sincronice por fechas o busque por código (filtros avanzados).'
        }
        fillViewport={!isNarrow}
        page={page}
        pageSize={pageSize}
        pageSizeId="licitaciones-page-size"
        pageSizeOptions={[10, 20, 50, 100]}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setPage(1)
        }}
        getRowKey={(row) => row.CodigoExterno}
        mobileCardActions={(lic) => ({
          primary: {
            label: 'Detalle',
            onClick: () => fetchDetail(lic.CodigoExterno),
          },
          secondary: {
            label: following.some((f) => f.CodigoExterno === lic.CodigoExterno)
              ? 'Dejar de seguir'
              : 'Seguir',
            onClick: () => toggleFollow(lic),
          },
        })}
        toolbar={
          <div
            className="table-toolbar__left"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 'var(--space-2)',
              width: '100%',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span className="table-toolbar__title">Licitaciones</span>
              <Badge variant="neutral">{filteredLics.length}</Badge>
              {apiMeta ? (
                <Badge variant={apiMeta.source === 'DATABASE' ? 'accent' : 'success'}>
                  {apiMeta.source === 'DATABASE' ? 'Local' : 'API Live'}
                </Badge>
              ) : null}
            </div>
            {hasSearched && lics.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                {STATE_FILTERS.map((f) => (
                  <Button
                    key={f.v}
                    type="button"
                    size="sm"
                    variant={filterState === f.v ? 'primary' : 'quiet'}
                    onClick={() => setFilterState(f.v)}
                  >
                    {f.l}
                  </Button>
                ))}
                {apiMeta?.source === 'DATABASE' ? (
                  <Button
                    type="button"
                    variant="quiet"
                    size="sm"
                    disabled={loading}
                    onClick={() => fetchData({ force: true })}
                  >
                    <Icon name="activity" size="sm" /> Actualizar
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        }
      />

      <Modal
        open={!!selectedLic}
        onClose={() => setSelectedLic(null)}
        size="lg"
        title={selectedLic?.Nombre || selectedLic?.CodigoExterno || 'Detalle'}
        subheader={selectedLic ? <LicitacionDetailSubheader lic={selectedLic} /> : null}
        footer={
          <>
            <LicitacionResponsableMeta lic={selectedLic} />
            <Button type="button" variant="secondary" onClick={() => setSelectedLic(null)}>
              Cerrar
            </Button>
          </>
        }
      >
        {selectedLic?._loading ? (
          <Alert variant="info" title="Cargando">
            Cargando ficha técnica…
          </Alert>
        ) : selectedLic ? (
          <LicitacionDetailContent lic={selectedLic} />
        ) : null}
      </Modal>
    </>
  )
}

export default LicitacionesPanel
