/** Mismas bandas que Playwright usa en renderer.py (_header_footer_template). */
export const HF_BAND_MM = { header: 15, footer: 12 }

export function hfCssVars() {
  return {
    '--doc-hf-header-h': `${HF_BAND_MM.header}mm`,
    '--doc-hf-footer-h': `${HF_BAND_MM.footer}mm`,
  }
}

/** ¿Hay contenido editable (texto, logo, forma)? */
export function htmlHasContent(html) {
  if (!html || !String(html).trim()) return false
  const raw = String(html)
  if (/data-sgaf-logo|data-sgaf-shape|sgaf-logo-var|sgaf-shape/i.test(raw)) return true
  const text = raw.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').trim()
  return text.length > 0
}
