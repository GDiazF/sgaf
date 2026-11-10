/** Defaults alineados con renderer.py (plantilla_hf_band_mm). */
export const HF_BAND_MM = { header: 15, footer: 12 }
export const HF_BAND_MIN_MM = 8
export const HF_BAND_MAX_MM = 80

export function resolveHfBandMm(plantilla) {
  const clamp = (value, fallback) => {
    const n = Number(value)
    if (!Number.isFinite(n)) return fallback
    return Math.min(HF_BAND_MAX_MM, Math.max(HF_BAND_MIN_MM, n))
  }
  return {
    header: clamp(plantilla?.altura_encabezado_mm, HF_BAND_MM.header),
    footer: clamp(plantilla?.altura_pie_mm, HF_BAND_MM.footer),
  }
}

export function hfCssVars(plantilla) {
  const { header, footer } = resolveHfBandMm(plantilla)
  return {
    '--doc-hf-header-h': `${header}mm`,
    '--doc-hf-footer-h': `${footer}mm`,
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
