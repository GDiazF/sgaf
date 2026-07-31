import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import api from '../../api'
import {
  Badge,
  Button,
  Drawer,
  EmptyState,
  Field,
  FiltersBar,
  Icon,
  IconButton,
  Input,
  resolveIconName,
} from '@slep/ui'

const getFullUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${api.defaults.baseURL.replace('/api', '')}${path}`
}

function BenefitDetailDrawer({ benefit, categorias, onClose, onOpenImage }) {
  const cat = categorias.find((c) => c.id === benefit?.categoria)
  const images = benefit?.archivos?.filter((f) => f.tipo === 'image') || []
  const docs = benefit?.archivos?.filter((f) => f.tipo !== 'image') || []

  return (
    <Drawer open={!!benefit} onClose={onClose} title="Detalle del beneficio" wide>
      {benefit ? (
        <div className="benefit-detail">
          <div>
            <Badge variant="accent">{cat?.nombre || 'Beneficio'}</Badge>
            <h3 className="card__title" style={{ marginTop: 'var(--space-3)' }}>
              {benefit.titulo}
            </h3>
            {benefit.descripcion ? (
              <p className="benefit-detail__lead">{benefit.descripcion}</p>
            ) : null}
          </div>

          {images.length > 0 ? (
            <section>
              <h4 className="benefit-detail__section-title">Galería</h4>
              <div className="benefit-detail__gallery">
                {images.map((file, idx) => (
                  <figure
                    key={idx}
                    className="benefit-detail__photo"
                    onClick={() => onOpenImage(file.archivo)}
                  >
                    <img src={getFullUrl(file.archivo)} alt="" />
                  </figure>
                ))}
              </div>
            </section>
          ) : null}

          {docs.length > 0 ? (
            <section>
              <h4 className="benefit-detail__section-title">Documentos</h4>
              <div className="benefit-detail__docs">
                {docs.map((file, idx) => (
                  <a
                    key={idx}
                    href={getFullUrl(file.archivo)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="benefit-detail__doc"
                  >
                    <Icon name="attach" size={18} />
                    <span className="benefit-detail__doc-meta">
                      <span className="benefit-detail__doc-name">
                        {file.nombre || 'Documento'}
                      </span>
                      <span className="benefit-detail__doc-type">{file.tipo}</span>
                    </span>
                    <Icon name="download" size={16} />
                  </a>
                ))}
              </div>
            </section>
          ) : null}

          <div className="benefit-detail__footer">
            <Button variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      ) : null}
    </Drawer>
  )
}

/**
 * Muro de beneficios publicados (panel para tabs de Bienestar).
 */
const BeneficiosPanel = ({ isNarrow = false }) => {
  const [beneficios, setBeneficios] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBenefit, setSelectedBenefit] = useState(null)
  const [fullscreenImage, setFullscreenImage] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [resB, resC] = await Promise.all([
          api.get('bienestar/beneficios/'),
          api.get('bienestar/categorias/'),
        ])
        if (!alive) return
        setBeneficios(resB.data.results || resB.data || [])
        setCategorias(resC.data.results || resC.data || [])
      } catch (e) {
        console.error('Error cargando beneficios', e)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const filtered = [...beneficios]
    .filter((b) => b.estado === 'PUBLICADO')
    .sort((a, b) => b.id - a.id)
    .filter(
      (b) =>
        selectedCategory === 'ALL' || b.categoria === parseInt(selectedCategory, 10),
    )
    .filter((b) => {
      if (!searchTerm) return true
      const q = searchTerm.toLowerCase()
      return (
        (b.titulo || '').toLowerCase().includes(q) ||
        (b.descripcion || '').toLowerCase().includes(q)
      )
    })

  const activeCount =
    (searchTerm ? 1 : 0) + (selectedCategory !== 'ALL' ? 1 : 0)

  return (
    <>
      <FiltersBar
        activeCount={activeCount}
        onSearch={(e) => e.preventDefault()}
        onClear={() => {
          setSearchTerm('')
          setSelectedCategory('ALL')
        }}
        advanced={
          <div className="bienestar-cat-chips" role="group" aria-label="Categorías">
            <button
              type="button"
              className={`bienestar-cat-chip${selectedCategory === 'ALL' ? ' is-active' : ''}`}
              onClick={() => setSelectedCategory('ALL')}
            >
              Todos
            </button>
            {categorias.map((cat) => {
              const active = parseInt(selectedCategory, 10) === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`bienestar-cat-chip${active ? ' is-active' : ''}`}
                  style={
                    active
                      ? { backgroundColor: cat.color, borderColor: cat.color, color: '#fff' }
                      : { '--chip-accent': cat.color }
                  }
                  onClick={() => setSelectedCategory(String(cat.id))}
                >
                  <Icon
                    name={resolveIconName(cat.icono, 'heart')}
                    size={14}
                    style={!active ? { color: cat.color } : undefined}
                  />
                  {cat.nombre}
                </button>
              )
            })}
          </div>
        }
      >
        <Field label="Buscar" htmlFor="bienestar-search">
          <Input
            id="bienestar-search"
            type="search"
            placeholder="Buscar beneficios…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Field>
      </FiltersBar>

      <div className={`bienestar-wall-scroll${!isNarrow ? ' bienestar-wall-scroll--fill' : ''}`}>
        {loading ? (
          <EmptyState title="Cargando beneficios…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Sin resultados"
            description="No hay beneficios publicados con estos filtros."
          />
        ) : (
          <div className="bienestar-wall-grid">
            {filtered.map((item) => {
              const imageFile = item.archivos?.find((f) => f.tipo === 'image')
              const cat = categorias.find((c) => c.id === item.categoria)
              const catColor = item.categoria_color || cat?.color || '#2563eb'
              return (
                <article
                  key={item.id}
                  className="benefit-card"
                  onClick={() => setSelectedBenefit(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedBenefit(item)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="benefit-card__body">
                    <span className="bienestar-wall-cat" style={{ color: catColor }}>
                      <Icon name={resolveIconName(cat?.icono, 'heart')} size={12} />
                      {cat?.nombre || 'General'}
                    </span>
                    <h3 className="benefit-card__title">{item.titulo}</h3>
                    <p className="benefit-card__excerpt">{item.descripcion}</p>
                  </div>
                  <div className="benefit-card__media">
                    {imageFile ? (
                      <img src={getFullUrl(imageFile.archivo)} alt="" />
                    ) : (
                      <div
                        className="benefit-card__media-empty"
                        style={{ color: catColor }}
                        aria-hidden="true"
                      >
                        <Icon name={resolveIconName(cat?.icono, 'heart')} size={28} />
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      <BenefitDetailDrawer
        benefit={selectedBenefit}
        categorias={categorias}
        onClose={() => setSelectedBenefit(null)}
        onOpenImage={setFullscreenImage}
      />

      {fullscreenImage
        ? createPortal(
            <div
              className="benefit-lightbox"
              onClick={() => setFullscreenImage(null)}
              role="presentation"
            >
              <IconButton
                className="benefit-lightbox__close"
                aria-label="Cerrar imagen"
                onClick={() => setFullscreenImage(null)}
              >
                <Icon name="close" size={20} />
              </IconButton>
              <img
                src={getFullUrl(fullscreenImage)}
                alt=""
                onClick={(e) => e.stopPropagation()}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

export default BeneficiosPanel
