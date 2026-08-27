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
  Modal,
  FileInput,
  Switch,
  Icon,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const emptyForm = () => ({
  titulo: '',
  tipo: 'CONTINUIDAD',
  documento: null,
  fecha_aprobacion: '',
  fecha_proxima_revision: '',
  activo: true,
})

const TIPO_LABEL = {
  CONTINUIDAD: 'Continuidad operativa',
  RECUPERACION: 'Recuperación (DRP)',
  RIESGOS: 'Gestión de riesgos',
  OTRO: 'Otro',
}

const PlanesTab = ({ user }) => {
  const canAdd = user?.user_permissions?.includes('core.add_ciberseguridadplan')

  const [planes, setPlanes] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [formData, setFormData] = useState(emptyForm())
  const [savedOk, setSavedOk] = useState(false)
  const overlay = useFormOverlay()
  const { notify } = useNotify()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const debouncedSearch = useDebouncedValue(search)

  const fetchPlanes = async () => {
    setLoading(true)
    try {
      const res = await api.get('ciberseguridad/planes/')
      setPlanes(res.data.results || res.data || [])
    } catch (err) {
      notify({ variant: 'danger', text: 'No se pudieron cargar los planes.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlanes()
  }, [])

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase()
    if (!q) return planes
    return planes.filter(
      (p) =>
        (p.titulo || '').toLowerCase().includes(q) ||
        (TIPO_LABEL[p.tipo] || p.tipo || '').toLowerCase().includes(q),
    )
  }, [planes, debouncedSearch])

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
      if (savedOk) fetchPlanes()
      setSavedOk(false)
      return
    }
    overlay.dismiss()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = new FormData()
    Object.keys(formData).forEach((key) => {
      if (formData[key] !== null && formData[key] !== '') data.append(key, formData[key])
    })
    try {
      await overlay.run(
        async () => {
          await api.post('ciberseguridad/planes/', data, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          setSavedOk(true)
        },
        {
          successDescription: 'Plan creado.',
          formatError: (err) => formatApiFormError(err, 'No se pudo guardar el plan.'),
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
        header: 'Plan',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
      },
      {
        key: 'tipo',
        header: 'Tipo',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 1,
        render: (item) => (
          <Badge variant="accent">{TIPO_LABEL[item.tipo] || item.tipo}</Badge>
        ),
      },
      {
        key: 'activo',
        header: 'Estado',
        className: 'col--status',
        cardRole: 'status',
        priority: 1,
        render: (item) => (
          <Badge variant={item.activo ? 'success' : 'neutral'} dot>
            {item.activo ? 'Vigente' : 'Inactivo'}
          </Badge>
        ),
      },
      {
        key: 'fecha_aprobacion',
        header: 'Aprobado',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) => item.fecha_aprobacion || '—',
      },
      {
        key: 'fecha_proxima_revision',
        header: 'Próx. revisión',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) => item.fecha_proxima_revision || 'No definida',
      },
      {
        key: 'actions',
        header: 'Acciones',
        className: 'col--actions',
        render: (item) =>
          item.documento_url ? (
            <div className="data-table__actions">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(item.documento_url, '_blank', 'noopener,noreferrer')
                }
              >
                Descargar
              </Button>
            </div>
          ) : (
            '—'
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
        <Field label="Buscar" htmlFor="planes-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="planes-q"
              type="search"
              placeholder="Buscar por título o tipo…"
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
        emptyTitle="Sin planes"
        emptyDescription="No hay planes con la búsqueda actual."
        emptyAction={
          canAdd ? (
            <Button variant="primary" size="sm" onClick={openCreate}>
              <Icon name="plus" size="sm" /> Registrar plan
            </Button>
          ) : undefined
        }
        page={page}
        pageSize={pageSize}
        pageSizeId="planes-page-size"
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setPage(1)
        }}
        mobileCardActions={(item) =>
          item.documento_url
            ? {
                primary: {
                  label: 'Descargar',
                  onClick: () =>
                    window.open(item.documento_url, '_blank', 'noopener,noreferrer'),
                },
              }
            : {}
        }
        toolbar={
          <>
            <div className="table-toolbar__left">
              <span className="table-toolbar__title">Listado</span>
              <Badge variant="neutral">{filtered.length}</Badge>
            </div>
            {canAdd ? (
              <div className="table-toolbar__right">
                <Button variant="primary" size="sm" onClick={openCreate}>
                  <Icon name="plus" size="sm" /> Registrar plan
                </Button>
              </div>
            ) : null}
          </>
        }
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Registrar plan SGSI"
        subheader="Documentación de continuidad y respuesta"
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
              form="planes-form"
              loading={overlay.busy}
              disabled={overlay.busy || overlay.active}
            >
              Guardar plan
            </Button>
          </>
        }
      >
        <form id="planes-form" className="crud-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <Field label="Título" required htmlFor="plan-titulo" className="field--full">
              <Input
                id="plan-titulo"
                required
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              />
            </Field>
            <Field label="Tipo de plan" htmlFor="plan-tipo" className="field--full">
              <Select
                id="plan-tipo"
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              >
                <option value="CONTINUIDAD">Continuidad operativa</option>
                <option value="RECUPERACION">Recuperación (DRP)</option>
                <option value="RIESGOS">Gestión de riesgos</option>
                <option value="OTRO">Otro</option>
              </Select>
            </Field>
            <Field label="Fecha aprobación" required htmlFor="plan-fa">
              <Input
                id="plan-fa"
                type="date"
                required
                value={formData.fecha_aprobacion}
                onChange={(e) =>
                  setFormData({ ...formData, fecha_aprobacion: e.target.value })
                }
              />
            </Field>
            <Field label="Próxima revisión" required htmlFor="plan-fr">
              <Input
                id="plan-fr"
                type="date"
                required
                value={formData.fecha_proxima_revision}
                onChange={(e) =>
                  setFormData({ ...formData, fecha_proxima_revision: e.target.value })
                }
              />
            </Field>
            <Field label="Documento" htmlFor="plan-doc" className="field--full">
              <FileInput
                id="plan-doc"
                label="Seleccionar archivo"
                accept=".pdf,.doc,.docx"
                onChange={(e) =>
                  setFormData({ ...formData, documento: e.target.files?.[0] || null })
                }
              />
            </Field>
            <div className="field field--full">
              <Switch
                id="plan-activo"
                label="Plan vigente"
                checked={!!formData.activo}
                onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default PlanesTab
