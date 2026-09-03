import { PAGE_GAP_PX } from './layoutPageBreaks.js'
import { htmlHasContent } from './hfMetrics.js'
import { HfBandContent } from './HfBandContent.jsx'

/**
 * Bandas de encabezado/pie sobre cada hoja del cuerpo (solo lectura; clic → editar).
 */
export function DocHfBands({
  show,
  headerHtml,
  footerHtml,
  onEditHeader,
  onEditFooter,
  chrome,
}) {
  if (!show) return null

  const hasHeader = htmlHasContent(headerHtml)
  const hasFooter = htmlHasContent(footerHtml)
  if (!hasHeader && !hasFooter) return null

  const { count = 1, pageH, gap = PAGE_GAP_PX } = chrome || {}
  const sheets = Array.from({ length: count }, (_, index) => ({
    index,
    top: pageH == null ? 0 : index * (pageH + gap),
  }))

  return (
    <div className="doc-hf-bands">
      {sheets.map(({ index, top }) => (
        <div
          key={index}
          className="doc-hf-bands__sheet"
          style={pageH == null ? undefined : { top: `${top}px`, height: `${pageH}px` }}
        >
          {hasHeader ? (
            <button
              type="button"
              className="doc-hf-band doc-hf-band--header"
              title="Encabezado (se repite en cada hoja). Clic para editar."
              onClick={onEditHeader}
            >
              <span className="doc-hf-band__label">Encabezado</span>
              <HfBandContent html={headerHtml} className="doc-hf-band__content" />
            </button>
          ) : null}
          {hasFooter ? (
            <button
              type="button"
              className="doc-hf-band doc-hf-band--footer"
              title="Pie de página (se repite en cada hoja). Clic para editar."
              onClick={onEditFooter}
            >
              <span className="doc-hf-band__label">Pie</span>
              <HfBandContent html={footerHtml} className="doc-hf-band__content" />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  )
}
