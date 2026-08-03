const ESTADO_CODES = {
  5: 'Publicada',
  6: 'Cerrada',
  7: 'Desierta',
  8: 'Adjudicada',
  9: 'Suspendida',
  12: 'Revocada',
  13: 'Anulada',
  14: 'Desierta',
  15: 'Adjudicada',
}

export const getStatusLabel = (estado, codigoEstado) =>
  estado || ESTADO_CODES[codigoEstado] || 'N/A'

export const getStatusVariant = (estado, codigoEstado) => {
  const e = getStatusLabel(estado, codigoEstado).toLowerCase()
  if (e.includes('publicada')) return 'success'
  if (e.includes('cerrada')) return 'warning'
  if (e.includes('adjudicada')) return 'accent'
  if (
    e.includes('desierta') ||
    e.includes('revocada') ||
    e.includes('anulada') ||
    e.includes('suspendida')
  ) {
    return 'danger'
  }
  return 'neutral'
}

export const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  try {
    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) return String(dateStr).split('T')[0]
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export const formatMoney = (amount) => {
  if (!amount || amount === 0) return null
  return new Intl.NumberFormat('es-CL').format(amount)
}

export const formatOcMoney = (amount) =>
  `$${(amount || 0).toLocaleString('es-CL')}`

export const getOcStatusBadgeVariant = (estado) => {
  const e = (estado || '').toLowerCase()
  if (e.includes('recepcion')) return 'success'
  if (e.includes('acepta') || e.includes('envia') || e.includes('enviada')) return 'accent'
  if (e.includes('cancela') || e.includes('rechaza') || e.includes('rechazada')) return 'danger'
  return 'neutral'
}
