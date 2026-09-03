/**
 * Obtiene el PDF de un ítem de bandeja (almacenado o generado desde pago RC).
 */
export async function fetchPendientePdfBlob(pendiente, api) {
  let blob = null

  if (pendiente?.tiene_archivo_origen || pendiente?.id) {
    try {
      const stored = await api.get(`firma-digital/pendientes/${pendiente.id}/documento/`, {
        responseType: 'blob',
      })
      if (stored.data instanceof Blob && stored.data.size >= 100) {
        const ct = stored.data.type || ''
        if (!ct.includes('json')) {
          blob = stored.data
        }
      }
    } catch {
      /* fallback */
    }
  }

  if (!blob) {
    const pagoId = pendiente?.meta?.pago_id
    if (!pagoId) {
      throw new Error('Este documento no tiene PDF de origen asociado.')
    }
    const tipo = pendiente.meta?.tipo_pdf || 'PAGO'
    const response = await api.get(`registros-pagos/${pagoId}/generate_pdf/?tipo=${tipo}`, {
      responseType: 'blob',
    })
    blob = response.data
  }

  if (!(blob instanceof Blob) || blob.size < 100) {
    throw new Error('El servidor no devolvió un PDF válido.')
  }

  if (blob.type && blob.type.includes('json')) {
    const text = await blob.text()
    let msg = 'No se pudo generar el PDF.'
    try {
      msg = JSON.parse(text).error || msg
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }

  return blob
}
