export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function pdfFile(bytes, filename) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  return {
    blob: new Blob([data], { type: 'application/pdf' }),
    filename,
  }
}

export function textFile(text, filename, type = 'text/plain;charset=utf-8') {
  return {
    blob: new Blob([text], { type }),
    filename,
  }
}
