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
  Textarea,
  Modal,
  FileInput,
  Icon,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const emptyForm = () => ({
  nombre_campana: '',
  descripcion: '',
  documento: null,
  fecha_inicio: '',
  fecha_termino: '',
})

const CapacitacionesTab = ({ user }) => {
  const canAdd = user?.user_permissions?.includes('core.add_ciberseguridadcapacitacion')

  const [campanas, setCampanas] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [formData, setFormData] = useState(emptyForm())
  const [savedOk, setSavedOk] = useState(false)
  const overlay = useFormOverlay()
  const { notify } = useNotify()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const debouncedSearch = useDebouncedValue(search)

  const fetchCampanas = async () => {
    setLoading(true)
    try {
      const res = await api.get('ciberseguridad/capacitaciones/')
      setCampanas(res.data.results || res.data || [])
    } catch (err) {
      notify({ variant: 'danger', text: 'No se pudieron cargar las capacitaciones.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCampanas()
  }, [])

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase()
    if (!q) return campanas
    return campanas.filter(
      (c) =>
        (c.nombre_campana || '').toLowerCase().includes(q) ||
        (c.descripcion || '').toLowerCase().includes(q),
    )
  }, [campanas, debouncedSearch])

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
      if (savedOk) fetchCampanas()
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
          await api.post('ciberseguridad/capacitaciones/', data, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          setSavedOk(true)
        },
        {
          successDescription: 'Campaña creada.',
          formatError: (err) => formatApiFormError(err, 'No se pudo guardar la campaña.'),
        },
      )
    } catch {
      // FormOverlay
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'nombre_campana',
        header: 'Campaña',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
      },
      {
        key: 'descripcion',
        header: 'Descripción',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 1,
        render: (item) => item.descripcion || '—',
      },
      {
        key: 'fecha_inicio',
        header: 'Inicio',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) => item.fecha_inicio || '—',
      },
      {
        key: 'fecha_termino',
        header: 'Término',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) => item.fecha_termino || 'Indefinido',
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
                Material
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
        <Field label="Buscar" htmlFor="cap-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="cap-q"
              type="search"
              placeholder="Buscar por nombre o descripción…"
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
        emptyTitle="Sin campañas"
        emptyDescription="No hay capacitaciones con la búsqueda actual."
        emptyAction={
          canAdd ? (
            <Button variant="primary" size="sm" onClick={openCreate}>
              <Icon name="plus" size="sm" /> Nueva campaña
            </Button>
          ) : undefined
        }
        page={page}
        pageSize={pageSize}
        pageSizeId="cap-page-size"
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setPage(1)
        }}
        mobileCardActions={(item) =>
          item.documento_url
            ? {
                primary: {
                  label: 'Material',
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
                  <Icon name="plus" size="sm" /> Nueva campaña
                </Button>
              </div>
            ) : null}
          </>
        }
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Registrar campaña"
        subheader="Capacitación en ciberseguridad"
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
              form="cap-form"
              loading={overlay.busy}
              disabled={overlay.busy || overlay.active}
            >
              Registrar
            </Button>
          </>
        }
      >
        <form id="cap-form" className="crud-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <Field label="Nombre de la campaña" required htmlFor="cap-nombre" className="field--full">
              <Input
                id="cap-nombre"
                required
                value={formData.nombre_campana}
                onChange={(e) =>
                  setFormData({ ...formData, nombre_campana: e.target.value })
                }
              />
            </Field>
            <Field label="Descripción" required htmlFor="cap-desc" className="field--full">
              <Textarea
                id="cap-desc"
                required
                rows={4}
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              />
            </Field>
            <Field label="Fecha inicio" required htmlFor="cap-fi">
              <Input
                id="cap-fi"
                type="date"
                required
                value={formData.fecha_inicio}
                onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
              />
            </Field>
            <Field label="Fecha término" htmlFor="cap-ft">
              <Input
                id="cap-ft"
                type="date"
                value={formData.fecha_termino}
                onChange={(e) => setFormData({ ...formData, fecha_termino: e.target.value })}
              />
            </Field>
            <Field label="Material adjunto" htmlFor="cap-doc" className="field--full">
              <FileInput
                id="cap-doc"
                label="Seleccionar archivo"
                onChange={(e) =>
                  setFormData({ ...formData, documento: e.target.files?.[0] || null })
                }
              />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default CapacitacionesTab
