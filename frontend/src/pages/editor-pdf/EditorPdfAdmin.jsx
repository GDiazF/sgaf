import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Alert,
  Button,
  DataTable,
  PageHeader,
  Switch,
} from '@slep/ui'
import api from '../../api'

export default function EditorPdfAdmin() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api.get('editor-pdf/herramientas/')
      .then(({ data }) => {
        if (!active) return
        setRows(Array.isArray(data) ? data : (data.results || []))
      })
      .catch((err) => {
        if (!active) return
        setError(err.response?.data?.detail || 'No se pudo cargar el catálogo.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const columns = useMemo(() => [
    { key: 'nombre', header: 'Herramienta', render: (row) => row.nombre },
    { key: 'categoria', header: 'Categoría', render: (row) => row.categoria },
    {
      key: 'visible',
      header: 'Visible',
      render: (row) => (
        <Switch
          checked={row.visible}
          label={row.visible ? 'Visible' : 'Oculta'}
          onChange={async (event) => {
            const visible = event.target.checked
            setRows((current) => current.map((item) => (
              item.slug === row.slug ? { ...item, visible } : item
            )))
            try {
              await api.patch(`editor-pdf/herramientas/${row.slug}/`, { visible })
            } catch (err) {
              setRows((current) => current.map((item) => (
                item.slug === row.slug ? { ...item, visible: !visible } : item
              )))
              setError(err.response?.data?.detail || 'No se pudo actualizar la herramienta.')
            }
          }}
        />
      ),
    },
  ], [])

  return (
    <div className="page" data-od-id="editor-pdf-admin">
      <PageHeader
        icon="file"
        title="Herramientas del editor PDF"
        description="Elija qué herramientas ven los funcionarios. Ocultar una también bloquea su acceso directo."
        breadcrumbs={[
          { label: 'Editor PDF', to: '/editor-pdf' },
          { label: 'Administración' },
        ]}
        actions={
          <Button variant="secondary" size="sm" onClick={() => navigate('/admin/editor-pdf/firma')}>
            Texto de la firma
          </Button>
        }
        linkComponent={Link}
      />
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        getRowKey={(row) => row.slug}
        emptyTitle="Sin herramientas"
        emptyDescription="El catálogo todavía no se ha cargado."
      />
    </div>
  )
}
