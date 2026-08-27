import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { useNotify } from '../../hooks/useNotify'
import ApplicantModal from '../../components/applicants/ApplicantModal'
import {
  PageHeader,
  FiltersBar,
  DataTable,
  Badge,
  Button,
  Field,
  Input,
  Icon
} from '@slep/ui'

const EMPTY_FORM = {
  rut: '',
  nombre: '',
  apellido: '',
  telefono: '',
  email: '',
}

const Applicants = () => {
  const [applicants, setApplicants] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const { notify } = useNotify()

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)

  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches,
  )

  const debouncedSearch = useDebouncedValue(searchQuery)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const sync = () => setIsNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const fetchApplicants = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page: currentPage,
        page_size: pageSize,
      }
      if (debouncedSearch) params.search = debouncedSearch

      const response = await api.get('solicitantes/', { params })
      setApplicants(response.data.results || [])
      setTotalCount(response.data.count || 0)
    } catch (error) {
      console.error('Error fetching applicants:', error)
      setApplicants([])
      notify({ variant: 'danger', text: 'No se pudieron cargar los solicitantes.' })
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, debouncedSearch])

  useEffect(() => {
    fetchApplicants()
  }, [fetchApplicants])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, pageSize])

  const clearFilters = () => {
    setSearchQuery('')
    setCurrentPage(1)
  }

  const handleEdit = (app) => {
    setFormData({
      rut: app.rut || '',
      nombre: app.nombre || '',
      apellido: app.apellido || '',
      telefono: app.telefono || '',
      email: app.email || '',
    })
    setEditingId(app.id)
    setShowForm(true)
  }

  const handleNew = () => {
    setFormData(EMPTY_FORM)
    setEditingId(null)
    setShowForm(true)
  }

  const handleSave = async (dataToSubmit) => {
    try {
      if (editingId) {
        await api.put(`solicitantes/${editingId}/`, dataToSubmit)
      } else {
        await api.post('solicitantes/', dataToSubmit)
      }
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  const handleFormClose = (result) => {
    setShowForm(false)
    setEditingId(null)
    if (result?.saved) {
      fetchApplicants()
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'nombre',
        header: 'Solicitante',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        render: (item) => (
          <div className="contracts-cat">
            <strong>
              {item.nombre} {item.apellido}
            </strong>
            <span>Autorizado</span>
          </div>
        ),
      },
      {
        key: 'rut',
        header: 'RUT',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 1,
        render: (item) => item.rut || '—',
      },
      {
        key: 'estado',
        header: 'Estado',
        className: 'col--status col--tablet-hide',
        cardRole: 'status',
        priority: 2,
        render: () => <Badge variant="success">Autorizado</Badge>,
      },
      {
        key: 'contacto',
        header: 'Contacto',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) => (
          <div className="contracts-cat">
            <span>{item.email || 'Sin email'}</span>
            {item.telefono ? <span>{item.telefono}</span> : null}
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Acciones',
        className: 'col--actions',
        render: (item) => (
          <div
            className="data-table__actions"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="sm"
              title="Editar"
              onClick={() => handleEdit(item)}
            >
              <Icon name="edit" size="sm" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <div
      className="page"
      data-od-id="solicitantes-page"
      {...(!isNarrow ? { 'data-fill-viewport': true } : {})}
    >
      <PageHeader
        icon="funcionarios"
        title="Solicitantes"
        description="Gestione el personal autorizado para retirar llaves."
        breadcrumbs={[{ label: 'Operaciones' }, { label: 'Solicitantes' }]}
        linkComponent={Link}
        split
        actions={
          <Button variant="primary" size="sm" onClick={handleNew}>
            <Icon name="plus" size="sm" /> Nuevo solicitante
          </Button>
        }
      />

      

      <FiltersBar
        onSearch={() => setCurrentPage(1)}
        onClear={clearFilters}
        activeCount={searchQuery ? 1 : 0}
      >
        <Field label="Buscar" htmlFor="sol-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="sol-q"
              type="search"
              placeholder="Nombre, RUT o email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </Field>
      </FiltersBar>

      <DataTable
        columns={columns}
        rows={applicants}
        loading={loading}
        totalCount={totalCount}
        emptyTitle="Sin solicitantes"
        emptyDescription="No se encontraron solicitantes con la búsqueda actual."
        emptyAction={
          <Button variant="primary" size="sm" onClick={handleNew}>
            <Icon name="plus" size="sm" /> Nuevo solicitante
          </Button>
        }
        fillViewport={!isNarrow}
        page={currentPage}
        pageSize={pageSize}
        pageSizeId="solicitantes-page-size"
        pageSizeOptions={[10, 25, 50]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setCurrentPage(1)
        }}
        mobileCardActions={(item) => ({
          primary: {
            label: 'Editar',
            onClick: () => handleEdit(item),
          },
        })}
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">Solicitantes</span>
            <Badge variant="neutral">{totalCount}</Badge>
          </div>
        }
      />

      <ApplicantModal
        isOpen={showForm}
        onClose={handleFormClose}
        onSave={handleSave}
        editingId={editingId}
        initialData={formData}
      />
    </div>
  )
}

export default Applicants
