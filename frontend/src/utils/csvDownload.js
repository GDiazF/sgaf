const CSV_SEPARATOR = ';'

const escapeCsvCell = (value) => {
  if (value == null) return ''
  const text = String(value)
  if (
    text.includes(CSV_SEPARATOR) ||
    text.includes('"') ||
    text.includes('\n') ||
    text.includes('\r')
  ) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export const downloadCsv = (filename, headers, rows) => {
  const lines = [
    headers.map(escapeCsvCell).join(CSV_SEPARATOR),
    ...rows.map((row) => row.map(escapeCsvCell).join(CSV_SEPARATOR)),
  ]
  const blob = new Blob([`\ufeff${lines.join('\r\n')}`], {
    type: 'text/csv;charset=utf-8',
  })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.parentNode.removeChild(link)
  window.URL.revokeObjectURL(url)
}
