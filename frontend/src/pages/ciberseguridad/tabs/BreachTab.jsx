import React, { useState, useEffect, useMemo } from 'react'
import api from '../../../api'
import useDebouncedValue from '../../../hooks/useDebouncedValue'
import { useNotify } from '../../../hooks/useNotify'
import {
  FiltersBar,
  DataTable,
  Badge,
  Button,
  Field,
  Input,
  Select,
  Textarea,
  Modal,
  Drawer,
  DetailItem,
  Icon,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const emptyForm = () => ({
  titulo: '',
  descripcion: '',
  tipo_amenaza: '',
  gravedad_incidente: 'BAJA',
  fecha_incidente: '',
  fecha_descubrimiento: '',
  estimacion_afectados: 0,
  datos_comprometidos: '',
  medidas_mitigacion: '',
  notificado_agencia: false,
  fecha_notificacion_agencia: '',
  notificado_titulares: false,
  fecha_notificacion_titulares: '',
  estado_csirt: 'ALERTA_TEMPRANA',
})

const GRAVEDAD_VARIANT = {
  BAJA: 'neutral',
  MEDIA: 'accent',
  ALTA: 'warning',
  CRITICA: 'danger',
}

const BreachTab = ({ user }) => {
  const canAdd = user?.user_permissions?.includes('core.add_breachreport')

  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [formData, setFormData] = useState(emptyForm())
  const [savedOk, setSavedOk] = useState(false)
  const overlay = useFormOverlay()
  const { notify } = useNotify()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const debouncedSearch = useDebouncedValue(search)

  const fetchReports = async () => {
    setLoading(true)
    try {
      const res = await api.get('ciberseguridad/breach/')
      setReports(res.data.results || res.data || [])
    } catch (err) {
      console.error(err)
      notify({ variant: 'danger', text: 'No se pudieron cargar los registros.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase()
    if (!q) return reports
    return reports.filter(
      (r) =>
        (r.titulo || '').toLowerCase().includes(q) ||
        (r.descripcion || '').toLowerCase().includes(q),
    )
  }, [reports, debouncedSearch])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  const openCreate = () => {
    setFormData(emptyForm())
    setSavedOk(false)
    overlay.reset()
    setModalOpen(true)
  }

  const closeModal = () => {
    if (overlay.busy) return
    overlay.reset()
    setModalOpen(false)
    setFormData(emptyForm())
    setSavedOk(false)
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      setModalOpen(false)
      setFormData(emptyForm())
      if (savedOk) fetchReports()
      setSavedOk(false)
      return
    }
    overlay.dismiss()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await overlay.run(
        async () => {
          const payload = { ...formData }
          if (!payload.fecha_notificacion_agencia) delete payload.fecha_notificacion_agencia
          if (!payload.fecha_notificacion_titulares) delete payload.fecha_notificacion_titulares

          await api.post('ciberseguridad/breach/', payload)
          setSavedOk(true)
        },
        {
          successDescription: 'Incidente registrado.',
          formatError: (err) => formatApiFormError(err, 'No se pudo registrar el incidente.'),
        },
      )
    } catch {
      // FormOverlay
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'titulo',
        header: 'Incidente',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        render: (item) => (
          <button type="button" className="table-link" onClick={() => setSelected(item)}>
            {item.titulo}
          </button>
        ),
      },
      {
        key: 'gravedad_incidente',
        header: 'Gravedad',
        className: 'col--status',
        cardRole: 'status',
        priority: 1,
        render: (item) => (
          <Badge variant={GRAVEDAD_VARIANT[item.gravedad_incidente] || 'neutral'} dot>
            {item.gravedad_incidente}
          </Badge>
        ),
      },
      {
        key: 'estado_csirt',
        header: 'Estado CSIRT',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 1,
        render: (item) => item.estado_csirt?.replace(/_/g, ' ') || '—',
      },
      {
        key: 'actions',
        header: 'Acciones',
        className: 'col--actions',
        render: (item) => (
          <div className="data-table__actions">
            <Button variant="outline" size="sm" onClick={() => setSelected(item)}>
              Ver
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <div className="cyber-tab">
      

      <FiltersBar
        onSearch={() => setPage(1)}
        onClear={() => {
          setSearch('')
          setPage(1)
        }}
      >
        <Field label="Buscar" htmlFor="breach-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="breach-q"
              type="search"
              placeholder="Buscar incidentes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </Field>
      </FiltersBar>

      <DataTable
        columns={columns}
        rows={pageRows}
        loading={loading}
        totalCount={filtered.length}
        emptyTitle="Sin incidentes"
        emptyDescription="No hay registros con la búsqueda actual."
        emptyAction={
          canAdd ? (
            <Button variant="primary" size="sm" onClick={openCreate}>
              <Icon name="plus" size="sm" /> Registrar incidente
            </Button>
          ) : undefined
        }
        page={page}
        pageSize={pageSize}
        pageSizeId="breach-page-size"
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setPage(1)
        }}
        mobileCardActions={(item) => ({
          primary: { label: 'Ver', onClick: () => setSelected(item) },
        })}
        toolbar={
          <>
            <div className="table-toolbar__left">
              <span className="table-toolbar__title">Incidentes</span>
              <Badge variant="neutral">{filtered.length}</Badge>
            </div>
            {canAdd ? (
              <div className="table-toolbar__right">
                <Button variant="primary" size="sm" onClick={openCreate}>
                  <Icon name="plus" size="sm" /> Registrar incidente
                </Button>
              </div>
            ) : null}
          </>
        }
      />

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.titulo || 'Detalle del incidente'}
        wide
      >
        {selected ? (
          <div className="ticket-aside__details">
            <p className="cyber-breach__desc">{selected.descripcion}</p>
            <DetailItem label="Gravedad">{selected.gravedad_incidente}</DetailItem>
            <DetailItem label="Estado CSIRT">
              {selected.estado_csirt?.replace(/_/g, ' ')}
            </DetailItem>
            <DetailItem label="Medidas">{selected.medidas_mitigacion || 'N/A'}</DetailItem>
          </div>
        ) : null}
      </Drawer>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        size="lg"
        title="Registrar incidente"
        subheader="Notificación CSIRT / Ley 21.663"
        {...overlay.modalProps}
        onOverlayDismiss={handleOverlayDismiss}
        footer={
          <>
            <Button variant="ghost" type="button" onClick={closeModal} disabled={overlay.busy}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="breach-form"
              loading={overlay.busy}
              disabled={overlay.busy || overlay.active}
            >
              Registrar
            </Button>
          </>
        }
      >
        <form id="breach-form" className="crud-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <Field label="Título" required htmlFor="breach-titulo" className="field--full">
              <Input
                id="breach-titulo"
                required
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              />
            </Field>
            <Field label="Descripción" required htmlFor="breach-desc" className="field--full">
              <Textarea
                id="breach-desc"
                required
                rows={4}
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              />
            </Field>
            <Field label="Gravedad" htmlFor="breach-grav">
              <Select
                id="breach-grav"
                value={formData.gravedad_incidente}
                onChange={(e) =>
                  setFormData({ ...formData, gravedad_incidente: e.target.value })
                }
              >
                <option value="BAJA">Baja</option>
                <option value="MEDIA">Media</option>
                <option value="ALTA">Alta</option>
                <option value="CRITICA">Crítica</option>
              </Select>
            </Field>
            <Field label="Estado CSIRT" htmlFor="breach-csirt">
              <Select
                id="breach-csirt"
                value={formData.estado_csirt}
                onChange={(e) => setFormData({ ...formData, estado_csirt: e.target.value })}
              >
                <option value="NO_REPORTADO">No reportado</option>
                <option value="ALERTA_TEMPRANA">Alerta temprana (3h)</option>
                <option value="ACTUALIZACION">Actualización (72h)</option>
                <option value="INFORME_FINAL">Informe final (15 días)</option>
              </Select>
            </Field>
            <Field label="Fecha incidente" required htmlFor="breach-fi">
              <Input
                id="breach-fi"
                type="datetime-local"
                required
                value={formData.fecha_incidente}
                onChange={(e) => setFormData({ ...formData, fecha_incidente: e.target.value })}
              />
            </Field>
            <Field label="Fecha descubrimiento" required htmlFor="breach-fd">
              <Input
                id="breach-fd"
                type="datetime-local"
                required
                value={formData.fecha_descubrimiento}
                onChange={(e) =>
                  setFormData({ ...formData, fecha_descubrimiento: e.target.value })
                }
              />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default BreachTab
