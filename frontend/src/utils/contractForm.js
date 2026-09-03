const VALID_TIPO_OC = ['UNICA', 'MULTIPLE']

export const normalizeTipoOc = (value) =>
  VALID_TIPO_OC.includes(value) ? value : 'UNICA'

const sanitizeProveedorRow = (row) => {
  if (!row?.proveedor) return null
  return {
    ...(row.id ? { id: row.id } : {}),
    proveedor: row.proveedor,
    monto_adjudicado: row.monto_adjudicado === '' ? 0 : row.monto_adjudicado,
    monto_consumido_previo:
      row.monto_consumido_previo === '' ? 0 : row.monto_consumido_previo,
    establecimientos: row.establecimientos || [],
  }
}

export const prepareContractPayload = (data) => {
  const finalData = { ...data }
  const emptyToNull = [
    'plantilla_cobro',
    'proceso',
    'estado',
    'categoria',
    'codigo_mercado_publico',
    'fecha_adjudicacion',
    'fecha_inicio',
    'fecha_termino',
  ]
  for (const key of emptyToNull) {
    if (finalData[key] === '') finalData[key] = null
  }
  if (finalData.orientacion === '') delete finalData.orientacion
  finalData.tipo_oc = normalizeTipoOc(finalData.tipo_oc)
  delete finalData.proveedor
  delete finalData.establecimientos
  if (Array.isArray(finalData.proveedores_asociados)) {
    finalData.proveedores_asociados = finalData.proveedores_asociados
      .map(sanitizeProveedorRow)
      .filter(Boolean)
  }
  return finalData
}
export const contractToFormData = (item) => ({
  codigo_mercado_publico: item.codigo_mercado_publico || '',
  descripcion: item.descripcion || '',
  detalle: item.detalle || '',
  aplica_iva: item.aplica_iva !== false,
  proceso: item.proceso || '',
  estado: item.estado || '',
  categoria: item.categoria || '',
  orientacion: item.orientacion || '',
  proveedor: item.proveedor || '',
  fecha_adjudicacion: item.fecha_adjudicacion || '',
  fecha_inicio: item.fecha_inicio || '',
  fecha_termino: item.fecha_termino || '',
  tipo_oc: normalizeTipoOc(item.tipo_oc),
  nro_oc: item.nro_oc || '',
  cdp: item.cdp || '',
  plantilla_cobro: item.plantilla_cobro || '',
  proveedores_asociados: item.proveedores_asociados || [],
  establecimientos: item.establecimientos || [],
})

export const contractLabel = (item) =>
  item?.codigo_mercado_publico ||
  (item?.es_borrador ? `Borrador #${item?.id}` : 'Sin código')

/** @deprecated Usar contractLabel */
export const contractTitle = contractLabel
