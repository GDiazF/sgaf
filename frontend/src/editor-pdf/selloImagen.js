function cargarImagen(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo leer la imagen de la firma.'))
    img.src = src
  })
}

export async function selloComoImagen({ imagen, tipo, texto, widthPt, heightPt }) {
  const scale = 4
  const width = Math.max(80, Math.round(widthPt * scale))
  const height = Math.max(36, Math.round(heightPt * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const pad = Math.round(2 * scale)
  let textX = pad
  if (imagen) {
    const src = `data:image/${tipo === 'jpg' ? 'jpeg' : 'png'};base64,${imagen}`
    const img = await cargarImagen(src)
    const box = height - pad * 2
    const ratio = Math.min(box / img.width, box / img.height, 1)
    const drawW = img.width * ratio
    const drawH = img.height * ratio
    ctx.drawImage(img, pad, (height - drawH) / 2, drawW, drawH)
    textX = pad + drawW + pad
  }
  ctx.fillStyle = '#172D45'
  ctx.font = `${Math.round(3.1 * scale)}px "Source Sans 3", sans-serif`
  ctx.textBaseline = 'top'
  const lines = String(texto || '').split('\n')
  const lineHeight = Math.round(4.2 * scale)
  const block = lines.length * lineHeight
  let y = Math.max(pad, (height - block) / 2)
  const maxWidth = Math.max(20, width - textX - pad)
  lines.forEach((line) => {
    ctx.fillText(line, textX, y, maxWidth)
    y += lineHeight
  })
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('No se pudo preparar la imagen de la firma.')
  return new Uint8Array(await blob.arrayBuffer())
}
