import { HF_BAND_MM } from './hfMetrics.js'

/** Misma lógica que backend/documentos/page_sizes.resolve_page_mm */
export const DEFAULT_PAGE_SIZE_KEY = 'carta'

const FALLBACK_MM = { width: 215.9, height: 279.4 }

export function resolvePageMm(plantilla, pageSizes = []) {
  const tamano = plantilla?.tamano_pagina || DEFAULT_PAGE_SIZE_KEY
  const spec = pageSizes.find((s) => s.key === tamano)
  let width = Number(spec?.width_mm) || FALLBACK_MM.width
  let height = Number(spec?.height_mm) || FALLBACK_MM.height

  if (tamano === 'personalizado') {
    width = Number(plantilla?.ancho_mm) || width
    height = Number(plantilla?.alto_mm) || height
  }

  if (plantilla?.orientacion === 'landscape') {
    ;[width, height] = [height, width]
  }

  return {
    widthMm: width,
    heightMm: height,
  }
}

/** Variables CSS para .doc-page (ancho/alto según tipo de hoja + márgenes). */
export function pageCssVars(plantilla, pageSizes = []) {
  const { widthMm, heightMm } = resolvePageMm(plantilla, pageSizes)
  return {
    '--doc-page-w': `${widthMm}mm`,
    '--doc-page-h': `${heightMm}mm`,
    '--doc-margin-top': `${plantilla?.margen_superior_mm ?? 20}mm`,
    '--doc-margin-right': `${plantilla?.margen_derecho_mm ?? 20}mm`,
    '--doc-margin-bottom': `${plantilla?.margen_inferior_mm ?? 20}mm`,
    '--doc-margin-left': `${plantilla?.margen_izquierdo_mm ?? 20}mm`,
    '--doc-hf-header-h': `${HF_BAND_MM.header}mm`,
    '--doc-hf-footer-h': `${HF_BAND_MM.footer}mm`,
  }
}

export function measureCssMm(el, varName, fallbackMm) {
  if (!el) return fallbackMm
  const raw = getComputedStyle(el).getPropertyValue(varName).trim()
  const value = raw || `${fallbackMm}mm`
  const probe = document.createElement('div')
  probe.style.cssText = `position:absolute;visibility:hidden;height:${value}`
  el.appendChild(probe)
  const px = probe.offsetHeight
  probe.remove()
  return Math.max(1, px)
}

export function readPageLayout(pageEl) {
  if (!pageEl) return null
  return {
    pageW: measureCssMm(pageEl, '--doc-page-w', FALLBACK_MM.width),
    pageH: measureCssMm(pageEl, '--doc-page-h', FALLBACK_MM.height),
    padTop: measureCssMm(pageEl, '--doc-margin-top', 20),
    padRight: measureCssMm(pageEl, '--doc-margin-right', 20),
    padBottom: measureCssMm(pageEl, '--doc-margin-bottom', 20),
    padLeft: measureCssMm(pageEl, '--doc-margin-left', 20),
  }
}

/** Banda compacta encabezado/pie (.doc-page--header | --footer). */
export function readHfBandLayout(pageEl) {
  if (!pageEl?.classList.contains('doc-editor__hf')) return null
  if (pageEl.classList.contains('doc-page--header')) {
    return {
      kind: 'header',
      bandHeight: measureCssMm(pageEl, '--doc-hf-header-h', HF_BAND_MM.header),
    }
  }
  if (pageEl.classList.contains('doc-page--footer')) {
    return {
      kind: 'footer',
      bandHeight: measureCssMm(pageEl, '--doc-hf-footer-h', HF_BAND_MM.footer),
    }
  }
  return null
}
