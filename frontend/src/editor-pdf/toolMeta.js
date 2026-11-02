const PDF = 'application/pdf,.pdf'
const IMAGES = 'image/*,.jpg,.jpeg,.png,.webp,.bmp,.gif,.tif,.tiff,.svg,.heic,.psd'

const TEXT_FIELD = { name: 'texto', label: 'Texto', placeholder: 'Texto a escribir' }
const RANGE_FIELD = { name: 'rango', label: 'Páginas', placeholder: 'Ej. 1-3, 5', hint: 'Números de página separados por coma. Use un guion para un rango.' }

export const TOOL_META = {
  'merge-pdf': { accept: PDF, multiple: true },
  'alternate-merge': { accept: PDF, multiple: true },
  'duplex-collate': { accept: PDF, multiple: true },
  'compare-pdfs': { accept: PDF, multiple: true },
  'overlay-pdf': { accept: PDF, multiple: true },
  'pdf-to-zip': { accept: PDF, multiple: true },
  'add-attachments': { accept: '*/*', multiple: true },
  'jpg-to-pdf': { accept: 'image/jpeg,.jpg,.jpeg', multiple: true },
  'png-to-pdf': { accept: 'image/png,.png', multiple: true },
  'webp-to-pdf': { accept: 'image/webp,.webp', multiple: true },
  'bmp-to-pdf': { accept: 'image/bmp,.bmp', multiple: true },
  'image-to-pdf': { accept: IMAGES, multiple: true },
  'svg-to-pdf': { accept: 'image/svg+xml,.svg,.png,.jpg', multiple: true },
  'tiff-to-pdf': { accept: 'image/tiff,.tif,.tiff', multiple: true },
  'heic-to-pdf': { accept: 'image/heic,.heic,.heif', multiple: true },
  'psd-to-pdf': { accept: '.psd,image/*', multiple: true },
  'split-pdf': { accept: PDF, fields: [RANGE_FIELD] },
  'extract-pages': { accept: PDF, fields: [RANGE_FIELD] },
  'delete-pages': { accept: PDF, fields: [RANGE_FIELD] },
  'organize-pdf': { accept: PDF, fields: [{ name: 'orden', label: 'Orden', placeholder: 'Ej. 3, 1, 2', hint: 'Números de página en el orden nuevo.' }] },
  'rotate-custom': { accept: PDF, fields: [{ name: 'grados', label: 'Grados', placeholder: '90' }] },
  'crop-pdf': { accept: PDF, fields: [{ name: 'margen', label: 'Margen en puntos', placeholder: '36' }] },
  'page-numbers': { accept: PDF },
  'header-footer': { accept: PDF, fields: [TEXT_FIELD] },
  'add-watermark': { accept: PDF, fields: [TEXT_FIELD] },
  'add-stamps': { accept: PDF, fields: [TEXT_FIELD] },
  'bates-numbering': { accept: PDF, fields: [{ name: 'texto', label: 'Prefijo', placeholder: 'SLEP' }] },
  'add-page-labels': { accept: PDF, fields: [TEXT_FIELD] },
  'text-color': { accept: PDF, fields: [TEXT_FIELD] },
  'edit-pdf': { accept: PDF, fields: [TEXT_FIELD] },
  'edit-pdf-text': { accept: PDF, fields: [TEXT_FIELD] },
  'form-filler': { accept: PDF, fields: [TEXT_FIELD] },
  'form-creator': { accept: PDF, fields: [TEXT_FIELD] },
  'timestamp-pdf': { accept: PDF },
  'edit-metadata': { accept: PDF, fields: [
    { name: 'titulo', label: 'Título' },
    { name: 'autor', label: 'Autor' },
    { name: 'asunto', label: 'Asunto' },
  ] },
  'adjust-colors': { accept: PDF, fields: [{ name: 'brillo', label: 'Brillo (0.5 a 1.5)', placeholder: '1.1' }] },
  'pdf-multi-tool': { accept: PDF, fields: [RANGE_FIELD, { name: 'grados', label: 'Rotación', placeholder: '90' }] },
  'txt-to-pdf': { accept: '.txt,text/plain' },
  'markdown-to-pdf': { accept: '.md,.markdown,text/markdown,text/plain' },
  'json-to-pdf': { accept: '.json,application/json,text/plain' },
  'csv-to-pdf': { accept: '.csv,text/csv,text/plain' },
  'xml-to-pdf': { accept: '.xml,text/xml,application/xml' },
  'rtf-to-pdf': { accept: '.rtf,application/rtf,text/plain' },
  'email-to-pdf': { accept: '.eml,.txt,message/rfc822,text/plain' },
  'excel-to-pdf': { accept: '.xlsx,.xls,.ods,.csv' },
  'ods-to-pdf': { accept: '.ods,.xlsx,.xls' },
  'word-to-pdf': { accept: '.docx,.doc' },
  'odt-to-pdf': { accept: '.odt' },
  'odp-to-pdf': { accept: '.odp' },
  'odg-to-pdf': { accept: '.odg' },
  'powerpoint-to-pdf': { accept: '.pptx,.ppt' },
  'epub-to-pdf': { accept: '.epub' },
  'fb2-to-pdf': { accept: '.fb2,.xml' },
  'cbz-to-pdf': { accept: '.cbz,.zip' },
  'mobi-to-pdf': { accept: '.mobi,.azw' },
  'xps-to-pdf': { accept: '.xps' },
  'wpd-to-pdf': { accept: '.wpd' },
  'wps-to-pdf': { accept: '.wps' },
  'pub-to-pdf': { accept: '.pub' },
  'vsd-to-pdf': { accept: '.vsd,.vsdx' },
  'pages-to-pdf': { accept: '.pages' },
}

const SIGN_SLUGS = new Set(['firma-digital-slep', 'digital-sign-pdf'])

export function isSignTool(slug) {
  return SIGN_SLUGS.has(slug)
}

export function metaFor(slug) {
  return {
    accept: PDF,
    multiple: false,
    fields: [],
    ...(TOOL_META[slug] || {}),
  }
}
