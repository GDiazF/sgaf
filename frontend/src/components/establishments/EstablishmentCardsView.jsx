import React, { useRef, useState } from 'react'
import { Modal, Button, Icon } from '@slep/ui'

const PRINT_CSS = `
  @page { size: VAR_PAGE_SIZE; margin: 5mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: system-ui, sans-serif;
    color: #0f172a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .directory-print { padding: 5mm; }
  .directory-print__title {
    text-align: center;
    margin: 0 0 8px;
    font-size: 28px;
    font-weight: 800;
    text-transform: uppercase;
  }
  .directory-print__meta {
    text-align: center;
    margin: 0 0 24px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #047857;
  }
  .directory-print__grid {
    display: grid;
    grid-template-columns: VAR_COLS;
    gap: 15px;
  }
  .directory-card {
    border: 2px solid rgba(16, 185, 129, 0.2);
    border-radius: 16px;
    overflow: hidden;
    background: #fff;
    page-break-inside: avoid;
    break-inside: avoid;
    min-height: 140px;
    display: flex;
    flex-direction: column;
  }
  .directory-card__name {
    margin: 0;
    padding: 10px 12px;
    text-align: center;
    font-size: 13px;
    font-weight: 800;
    text-transform: uppercase;
    border-bottom: 1px solid rgba(16, 185, 129, 0.2);
    background: #ecfdf5;
  }
  .directory-card__body { display: flex; flex: 1; }
  .directory-card__logo {
    width: 96px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-right: 1px solid #e2e8f0;
    background: #f8fafc;
    padding: 8px;
  }
  .directory-card__logo img,
  .directory-card__logo-fallback {
    width: 72px;
    height: 72px;
    border-radius: 999px;
    object-fit: contain;
    background: #fff;
    border: 2px solid #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,.08);
  }
  .directory-card__logo-fallback {
    display: grid;
    place-items: center;
    font-weight: 800;
    font-size: 12px;
    color: #fff;
    background: linear-gradient(135deg, #34d399, #0d9488);
  }
  .directory-card__info {
    flex: 1;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
  }
  .directory-card__row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 10px;
    background: rgba(5, 150, 105, 0.06);
    border: 1px solid rgba(16, 185, 129, 0.2);
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
  }
`

const EstablishmentCardsView = ({ isOpen, onClose, data, establishmentTypes = [] }) => {
  const printRef = useRef(null)
  const [selectedTypeIds, setSelectedTypeIds] = useState([])
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [isLandscape, setIsLandscape] = useState(false)

  const filteredData = (data || []).filter((item) => {
    const matchesType =
      selectedTypeIds.length === 0 || selectedTypeIds.includes(String(item.tipo))
    return matchesType && item.activo === true
  })

  const toggleType = (id) => {
    const idStr = String(id)
    setSelectedTypeIds((prev) =>
      prev.includes(idStr) ? prev.filter((t) => t !== idStr) : [...prev, idStr],
    )
  }

  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent) return
    const printWindow = window.open('', '_blank', 'width=1200,height=800')
    if (!printWindow) return

    const css = PRINT_CSS.replace(
      'VAR_PAGE_SIZE',
      isLandscape ? '330mm 216mm' : '216mm 330mm',
    ).replace('VAR_COLS', isLandscape ? 'repeat(3, 1fr)' : '1fr')

    printWindow.document.write(`
      <html>
        <head>
          <title>Directorio Institucional - SLEP IQUIQUE</title>
          <style>${css}</style>
        </head>
        <body>
          <div class="directory-print">${printContent.innerHTML}</div>
        </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    }, 600)
  }

  const filterLabel =
    selectedTypeIds.length === 0
      ? 'Todos los tipos'
      : `${selectedTypeIds.length} seleccionados`

  const metaLabel =
    selectedTypeIds.length === 0
      ? 'Iquique'
      : selectedTypeIds.length === 1
        ? establishmentTypes.find((t) => String(t.id) === selectedTypeIds[0])?.nombre ||
          'Iquique'
        : `${selectedTypeIds.length} tipos seleccionados`

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="lg"
      className="directory-cards-modal"
      title="Directorio SLEP"
      subheader="Formato impresión oficio"
      headerActions={
        <div className="directory-cards-modal__toolbar">
          <div className="directory-cards-modal__filter">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsFilterOpen((v) => !v)}
            >
              <Icon name="filter" size={14} />
              {filterLabel}
            </Button>
            {isFilterOpen ? (
              <div className="directory-cards-modal__filter-menu">
                <button
                  type="button"
                  className={`directory-cards-modal__filter-item${selectedTypeIds.length === 0 ? ' is-active' : ''}`}
                  onClick={() => setSelectedTypeIds([])}
                >
                  Mostrar todos
                </button>
                {establishmentTypes.map((t) => {
                  const selected = selectedTypeIds.includes(String(t.id))
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`directory-cards-modal__filter-item${selected ? ' is-active' : ''}`}
                      onClick={() => toggleType(t.id)}
                    >
                      {t.nombre}
                      {selected ? <Icon name="check" size={14} /> : null}
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsLandscape((v) => !v)}
          >
            {isLandscape ? 'Horizontal' : 'Vertical'}
          </Button>
          <Button
            type="button"
            variant={isPreviewMode ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setIsPreviewMode((v) => !v)}
          >
            {isPreviewMode ? 'Vista normal' : 'Previsualizar'}
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={handlePrint}>
            <Icon name="download" size={14} />
            Imprimir
          </Button>
        </div>
      }
    >
      <div
        className={`directory-cards-modal__body${isPreviewMode ? ' is-preview' : ''}${isLandscape ? ' is-landscape' : ''}`}
      >
        <div
          ref={printRef}
          className={`directory-print-sheet${isPreviewMode ? ' is-preview' : ''}${isLandscape ? ' is-landscape' : ''}`}
        >
          <h1 className="directory-print__title">Directorio institucional</h1>
          <p className="directory-print__meta">{metaLabel}</p>

          <div className={`directory-print__grid${isLandscape ? ' is-landscape' : ''}`}>
            {filteredData.map((item) => {
              const principalPhone =
                item.telefonos?.find((p) => p.es_principal) || item.telefonos?.[0]
              return (
                <article key={item.id} className="directory-card">
                  <h3 className="directory-card__name">{item.nombre}</h3>
                  <div className="directory-card__body">
                    <div className="directory-card__logo">
                      {item.logo ? (
                        <img src={item.logo} alt="" />
                      ) : (
                        <span className="directory-card__logo-fallback">
                          {item.nombre.substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="directory-card__info">
                      <div className="directory-card__row">
                        <Icon name="user" size={12} />
                        {item.director || 'Sin director'}
                      </div>
                      <div className="directory-card__row">
                        <Icon name="message" size={12} />
                        {item.email || 'Sin correo'}
                      </div>
                      <div className="directory-card__row">
                        <Icon name="telefonos" size={12} />
                        {principalPhone?.numero || 'Sin teléfono'}
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          {filteredData.length === 0 ? (
            <p className="directory-cards-modal__empty">
              No hay establecimientos activos con el filtro actual.
            </p>
          ) : null}
        </div>
      </div>
    </Modal>
  )
}

export default EstablishmentCardsView
