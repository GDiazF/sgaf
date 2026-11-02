import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Alert,
  Button,
  EmptyState,
  FiltersBar,
  Icon,
  Input,
  PageHeader,
  cn,
} from '@slep/ui'
import api from '../../api'
import { usePermission } from '../../hooks/usePermission'

export default function EditorPdfCatalogo() {
  const navigate = useNavigate()
  const { can } = usePermission()
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api.get('editor-pdf/herramientas/')
      .then(({ data }) => {
        if (!active) return
        const rows = Array.isArray(data) ? data : (data.results || [])
        setItems(rows.filter((row) => row.visible))
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) =>
      `${item.nombre} ${item.descripcion} ${item.categoria}`.toLowerCase().includes(q),
    )
  }, [items, query])

  const groups = useMemo(() => {
    const map = new Map()
    filtered.forEach((item) => {
      if (!map.has(item.categoria)) map.set(item.categoria, [])
      map.get(item.categoria).push(item)
    })
    return [...map.entries()].map(([categoria, tools]) => [
      categoria,
      [...tools].sort((a, b) => Number(b.slug === 'firma-digital-slep') - Number(a.slug === 'firma-digital-slep')),
    ])
  }, [filtered])

  return (
    <div className="page" data-od-id="editor-pdf-catalogo">
      <PageHeader
        icon="file"
        title="Editor PDF"
        description="Herramientas para preparar y firmar documentos. El archivo resultante se descarga en su equipo."
        breadcrumbs={[{ label: 'Editor PDF' }]}
        linkComponent={Link}
        actions={can('editor_pdf.change_herramientapdf') ? (
          <>
            <Button variant="secondary" size="sm" onClick={() => navigate('/admin/editor-pdf/firma')}>
              Texto de la firma
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/admin/editor-pdf')}>
              Administrar herramientas
            </Button>
          </>
        ) : null}
      />

      <FiltersBar
        searchLabel="Buscar"
        clearLabel="Limpiar"
        onSearch={() => {}}
        onClear={() => setQuery('')}
      >
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar herramienta"
          aria-label="Buscar herramienta"
        />
      </FiltersBar>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {!loading && !error && groups.length === 0 ? (
        <EmptyState
          title="No hay herramientas visibles"
          description="El administrador aún no habilitó herramientas para este catálogo."
        />
      ) : null}

      {groups.map(([categoria, tools]) => (
        <section key={categoria} className="card-tool-section">
          <h2 className="card-tool-section__title">{categoria}</h2>
          <div className="card-tool-grid">
            {tools.map((tool) => {
              const featured = tool.slug === 'firma-digital-slep'
              return (
                <Link
                  key={tool.slug}
                  to={`/editor-pdf/${tool.slug}`}
                  className={cn('card card-tool', featured && 'card-tool--featured')}
                >
                  <span className="card-tool__icon">
                    <Icon name={featured ? 'file-check' : 'file'} size={18} />
                  </span>
                  <span className="card-tool__title">{tool.nombre}</span>
                  <span className="card-tool__desc">{tool.descripcion}</span>
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
