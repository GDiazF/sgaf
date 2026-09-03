/** M³ para mostrar: 4 → "4", 12.5 → "12,5" (sin ceros de relleno). */
export function formatM3Display(value) {
  if (value == null || value === '') return ''
  const num = Number(String(value).replace(',', '.'))
  if (Number.isNaN(num)) return String(value)
  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(num)
}

/** M³ para input type="number": punto decimal, sin ceros extra. */
export function formatM3Input(value) {
  if (value == null || value === '') return ''
  const num = Number(String(value).replace(',', '.'))
  if (Number.isNaN(num)) return ''
  if (Number.isInteger(num)) return String(num)
  return String(num)
}
