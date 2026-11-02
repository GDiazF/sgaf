import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import JSZip from 'jszip'
import * as XLSX from 'xlsx'
import { pdfFile, textFile } from './download'

GlobalWorkerOptions.workerSrc = workerUrl

function stem(file) {
  return (file?.name || 'documento').replace(/\.[^.]+$/, '')
}

function plain(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ')
}

async function loadPdf(file) {
  return PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
}

async function bytesOf(file) {
  return new Uint8Array(await file.arrayBuffer())
}

function parsePages(spec, total) {
  const raw = String(spec || '').trim()
  if (!raw) return []
  const set = new Set()
  raw.split(/[,;\s]+/).forEach((part) => {
    if (!part) return
    const range = part.split('-').map((n) => parseInt(n, 10))
    if (range.length === 2 && range.every((n) => Number.isFinite(n))) {
      const [a, b] = range[0] <= range[1] ? range : [range[1], range[0]]
      for (let i = a; i <= b; i += 1) set.add(i)
    } else if (Number.isFinite(range[0])) {
      set.add(range[0])
    }
  })
  return [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)
}

async function copySelected(file, indexes) {
  const src = await loadPdf(file)
  const out = await PDFDocument.create()
  const pages = await out.copyPages(src, indexes)
  pages.forEach((page) => out.addPage(page))
  return out
}

async function textOfPdf(file) {
  const pdf = await getDocument({ data: await bytesOf(file) }).promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const line = content.items.map((item) => item.str).join(' ').replace(/\s+/g, ' ').trim()
    pages.push(line)
  }
  return pages
}

async function renderCanvases(file, { scale = 1.4, filter } = {}) {
  const pdf = await getDocument({ data: await bytesOf(file) }).promise
  const canvases = []
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    await page.render({ canvasContext: ctx, viewport }).promise
    if (filter) filter(ctx, canvas.width, canvas.height)
    canvases.push(canvas)
  }
  return canvases
}

async function canvasBlob(canvas, type = 'image/png', quality) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality))
  if (!blob) throw new Error('El navegador no pudo exportar la imagen.')
  return blob
}

async function canvasesToPdf(canvases) {
  const doc = await PDFDocument.create()
  for (const canvas of canvases) {
    const blob = await canvasBlob(canvas)
    const image = await doc.embedPng(new Uint8Array(await blob.arrayBuffer()))
    const page = doc.addPage([image.width, image.height])
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
  }
  return doc.save()
}

async function imagesToPdf(files) {
  const doc = await PDFDocument.create()
  for (const file of files) {
    const raw = await bytesOf(file)
    let image
    if ((file.type || '').includes('png') || /\.png$/i.test(file.name)) {
      image = await doc.embedPng(raw)
    } else if ((file.type || '').includes('jpeg') || /\.jpe?g$/i.test(file.name)) {
      image = await doc.embedJpg(raw)
    } else {
      const bitmap = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      canvas.getContext('2d').drawImage(bitmap, 0, 0)
      const blob = await canvasBlob(canvas)
      image = await doc.embedPng(new Uint8Array(await blob.arrayBuffer()))
    }
    const page = doc.addPage([image.width, image.height])
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
  }
  return pdfFile(await doc.save(), 'imagenes.pdf')
}

function wrapLines(text, width = 90) {
  const lines = []
  String(text || '').split(/\r?\n/).forEach((paragraph) => {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (!words.length) {
      lines.push('')
      return
    }
    let current = ''
    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word
      if (next.length > width) {
        if (current) lines.push(current)
        current = word
      } else {
        current = next
      }
    })
    if (current) lines.push(current)
  })
  return lines.length ? lines : ['']
}

async function textToPdf(text, filename) {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const lines = wrapLines(text)
  const size = 11
  const leading = 14
  const margin = 48
  let page = doc.addPage()
  let { width, height } = page.getSize()
  let y = height - margin
  lines.forEach((line) => {
    if (y < margin) {
      page = doc.addPage()
      ;({ width, height } = page.getSize())
      y = height - margin
    }
    page.drawText(plain(line).slice(0, 200), { x: margin, y, size, font, color: rgb(0.1, 0.12, 0.16) })
    y -= leading
  })
  return pdfFile(await doc.save(), filename)
}

async function readText(file) {
  return file.text()
}

async function zipEntries(file, test) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const chunks = []
  const names = Object.keys(zip.files).filter((name) => test(name) && !zip.files[name].dir)
  for (const name of names) {
    const xml = await zip.files[name].async('string')
    const text = xml
      .replace(/<w:p[ >]/g, '\n')
      .replace(/<a:p[ >]/g, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+\n/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim()
    if (text) chunks.push(text)
  }
  return chunks.join('\n\n').trim()
}

async function sheetToPdf(file) {
  const book = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const sheet = book.Sheets[book.SheetNames[0]]
  const csv = XLSX.utils.sheet_to_csv(sheet)
  if (!csv.trim()) throw new Error('La hoja no tiene celdas para pasar a PDF.')
  return textToPdf(csv, `${stem(file)}.pdf`)
}

async function packagedTextToPdf(file, test) {
  let text = ''
  try {
    text = await zipEntries(file, test)
  } catch {
    text = ''
  }
  if (!text) text = readableDump(await bytesOf(file))
  if (!text.trim()) throw new Error('No se encontró texto legible en el archivo.')
  return textToPdf(text, `${stem(file)}.pdf`)
}

function readableDump(bytes) {
  const decoder = new TextDecoder('utf-8', { fatal: false })
  return decoder.decode(bytes).replace(/[^\n\r\t\x20-\x7E\u00A0-\u024F]/g, ' ').replace(/ {2,}/g, ' ').trim()
}

async function drawOnPages(file, draw) {
  const doc = await loadPdf(file)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  doc.getPages().forEach((page, index) => {
    const original = page.drawText.bind(page)
    page.drawText = (text, opts) => original(plain(text), opts)
    draw(page, index, font)
  })
  return pdfFile(await doc.save(), `${stem(file)}.pdf`)
}

async function zipBlobs(entries, filename) {
  const zip = new JSZip()
  entries.forEach(({ name, blob }) => zip.file(name, blob))
  const blob = await zip.generateAsync({ type: 'blob' })
  return { blob, filename }
}

const handlers = {
  async 'merge-pdf'(files) {
    if (files.length < 2) throw new Error('Cargue al menos dos PDF.')
    const out = await PDFDocument.create()
    for (const file of files) {
      const src = await loadPdf(file)
      const pages = await out.copyPages(src, src.getPageIndices())
      pages.forEach((page) => out.addPage(page))
    }
    return pdfFile(await out.save(), 'unido.pdf')
  },
  async 'split-pdf'(files, options) {
    const src = await loadPdf(files[0])
    const pages = parsePages(options.rango, src.getPageCount())
    if (!pages.length) throw new Error('Indique las páginas a extraer.')
    const out = await copySelected(files[0], pages.map((n) => n - 1))
    return pdfFile(await out.save(), `${stem(files[0])}_dividido.pdf`)
  },
  async 'extract-pages'(files, options) {
    return handlers['split-pdf'](files, options)
  },
  async 'delete-pages'(files, options) {
    const src = await loadPdf(files[0])
    const drop = new Set(parsePages(options.rango, src.getPageCount()))
    if (!drop.size) throw new Error('Indique las páginas a eliminar.')
    const keep = src.getPageIndices().filter((index) => !drop.has(index + 1))
    if (!keep.length) throw new Error('No puede eliminar todas las páginas.')
    const out = await copySelected(files[0], keep)
    return pdfFile(await out.save(), `${stem(files[0])}_sin_paginas.pdf`)
  },
  async 'organize-pdf'(files, options) {
    const src = await loadPdf(files[0])
    const order = parsePages(options.orden, src.getPageCount())
    if (!order.length) throw new Error('Indique el nuevo orden de páginas.')
    const out = await copySelected(files[0], order.map((n) => n - 1))
    return pdfFile(await out.save(), `${stem(files[0])}_ordenado.pdf`)
  },
  async 'rotate-pdf'(files) {
    return handlers['rotate-custom'](files, { grados: '90' })
  },
  async 'rotate-custom'(files, options) {
    const angle = Number(options.grados || 90)
    if (!Number.isFinite(angle)) throw new Error('Indique los grados de rotación.')
    const doc = await loadPdf(files[0])
    doc.getPages().forEach((page) => {
      const current = page.getRotation().angle
      page.setRotation(degrees((current + angle) % 360))
    })
    return pdfFile(await doc.save(), `${stem(files[0])}_rotado.pdf`)
  },
  async 'reverse-pages'(files) {
    const src = await loadPdf(files[0])
    const indexes = src.getPageIndices().reverse()
    const out = await copySelected(files[0], indexes)
    return pdfFile(await out.save(), `${stem(files[0])}_invertido.pdf`)
  },
  async 'add-blank-page'(files) {
    const doc = await loadPdf(files[0])
    const first = doc.getPage(0)
    doc.addPage(first.getSize())
    return pdfFile(await doc.save(), `${stem(files[0])}_con_blanca.pdf`)
  },
  async 'pdf-multi-tool'(files, options) {
    const removed = await handlers['delete-pages'](files, options).catch(() => null)
    const source = removed
      ? new File([removed.blob], files[0].name, { type: 'application/pdf' })
      : files[0]
    return handlers['rotate-custom']([source], options)
  },
  async 'alternate-merge'(files) {
    if (files.length < 2) throw new Error('Cargue dos PDF para intercalar.')
    const left = await loadPdf(files[0])
    const right = await loadPdf(files[1])
    const out = await PDFDocument.create()
    const total = Math.max(left.getPageCount(), right.getPageCount())
    for (let i = 0; i < total; i += 1) {
      if (i < left.getPageCount()) {
        const [page] = await out.copyPages(left, [i])
        out.addPage(page)
      }
      if (i < right.getPageCount()) {
        const [page] = await out.copyPages(right, [i])
        out.addPage(page)
      }
    }
    return pdfFile(await out.save(), 'intercalado.pdf')
  },
  async 'duplex-collate'(files) {
    return handlers['alternate-merge'](files)
  },
  async 'crop-pdf'(files, options) {
    const margin = Math.max(0, Number(options.margen || 36))
    const doc = await loadPdf(files[0])
    doc.getPages().forEach((page) => {
      const { width, height } = page.getSize()
      page.setCropBox(margin, margin, Math.max(10, width - margin * 2), Math.max(10, height - margin * 2))
    })
    return pdfFile(await doc.save(), `${stem(files[0])}_recortado.pdf`)
  },
  async 'page-numbers'(files) {
    return drawOnPages(files[0], (page, index, font) => {
      const { width } = page.getSize()
      const label = String(index + 1)
      page.drawText(label, { x: width / 2 - font.widthOfTextAtSize(label, 10) / 2, y: 28, size: 10, font, color: rgb(0.2, 0.25, 0.3) })
    })
  },
  async 'header-footer'(files, options) {
    const text = options.texto || 'SLEP Iquique'
    return drawOnPages(files[0], (page, _index, font) => {
      const { width, height } = page.getSize()
      page.drawText(text.slice(0, 80), { x: 36, y: height - 28, size: 10, font, color: rgb(0.2, 0.28, 0.36) })
      page.drawText(text.slice(0, 80), { x: 36, y: 24, size: 10, font, color: rgb(0.2, 0.28, 0.36) })
    })
  },
  async 'add-watermark'(files, options) {
    const text = options.texto || 'SLEP Iquique'
    return drawOnPages(files[0], (page, _index, font) => {
      const { width, height } = page.getSize()
      page.drawText(text.slice(0, 40), {
        x: width / 4,
        y: height / 2,
        size: 42,
        font,
        color: rgb(0.23, 0.45, 0.62),
        opacity: 0.25,
        rotate: degrees(35),
      })
    })
  },
  async 'add-stamps'(files, options) {
    const text = options.texto || 'SLEP'
    return drawOnPages(files[0], (page, _index, font) => {
      const { width, height } = page.getSize()
      page.drawText(text.slice(0, 40), { x: width - 160, y: height - 48, size: 14, font, color: rgb(0.23, 0.45, 0.62) })
    })
  },
  async 'bates-numbering'(files, options) {
    const prefix = options.texto || 'SLEP'
    return drawOnPages(files[0], (page, index, font) => {
      page.drawText(`${prefix}-${String(index + 1).padStart(4, '0')}`, { x: 36, y: 24, size: 10, font, color: rgb(0.15, 0.18, 0.22) })
    })
  },
  async 'add-page-labels'(files, options) {
    return handlers['bates-numbering'](files, { texto: options.texto || 'Pág' })
  },
  async 'text-color'(files, options) {
    return handlers['edit-pdf'](files, options)
  },
  async 'edit-pdf'(files, options) {
    const text = options.texto || 'Anotación'
    return drawOnPages(files[0], (page, _index, font) => {
      page.drawText(text.slice(0, 180), { x: 48, y: 72, size: 12, font, color: rgb(0.15, 0.32, 0.48) })
    })
  },
  async 'edit-pdf-text'(files, options) {
    return handlers['edit-pdf'](files, options)
  },
  async 'background-color'(files) {
    const doc = await loadPdf(files[0])
    doc.getPages().forEach((page) => {
      const { width, height } = page.getSize()
      page.drawRectangle({
        x: 18,
        y: 18,
        width: width - 36,
        height: height - 36,
        borderColor: rgb(0.23, 0.45, 0.62),
        borderWidth: 1.5,
      })
    })
    return pdfFile(await doc.save(), `${stem(files[0])}_fondo.pdf`)
  },
  async 'form-filler'(files, options) {
    const doc = await loadPdf(files[0])
    const form = doc.getForm()
    const fields = form.getFields()
    if (!fields.length) throw new Error('El PDF no tiene campos de formulario.')
    const value = options.texto || ''
    fields.forEach((field) => {
      if (typeof field.setText === 'function') field.setText(value)
    })
    form.flatten()
    return pdfFile(await doc.save(), `${stem(files[0])}_relleno.pdf`)
  },
  async 'form-creator'(files, options) {
    const doc = await loadPdf(files[0])
    const form = doc.getForm()
    const field = form.createTextField('slep.campo')
    field.setText(options.texto || '')
    field.addToPage(doc.getPage(0), { x: 72, y: 72, width: 240, height: 24 })
    return pdfFile(await doc.save(), `${stem(files[0])}_formulario.pdf`)
  },
  async 'flatten-pdf'(files) {
    const doc = await loadPdf(files[0])
    try { doc.getForm().flatten() } catch { /* sin formulario */ }
    return pdfFile(await doc.save(), `${stem(files[0])}_plano.pdf`)
  },
  async 'remove-annotations'(files) {
    return handlers['flatten-pdf'](files)
  },
  async 'sanitize-pdf'(files) {
    const doc = await loadPdf(files[0])
    doc.setTitle('')
    doc.setAuthor('')
    doc.setSubject('')
    doc.setKeywords([])
    doc.setProducer('')
    doc.setCreator('')
    try { doc.getForm().flatten() } catch { /* sin formulario */ }
    return pdfFile(await doc.save(), `${stem(files[0])}_saneado.pdf`)
  },
  async 'remove-metadata'(files) {
    return handlers['sanitize-pdf'](files)
  },
  async 'view-metadata'(files) {
    const doc = await loadPdf(files[0])
    const lines = [
      `Título: ${doc.getTitle() || '—'}`,
      `Autor: ${doc.getAuthor() || '—'}`,
      `Asunto: ${doc.getSubject() || '—'}`,
      `Creador: ${doc.getCreator() || '—'}`,
      `Páginas: ${doc.getPageCount()}`,
    ]
    return textFile(lines.join('\n'), `${stem(files[0])}_metadatos.txt`)
  },
  async 'edit-metadata'(files, options) {
    const doc = await loadPdf(files[0])
    if (options.titulo) doc.setTitle(options.titulo)
    if (options.autor) doc.setAuthor(options.autor)
    if (options.asunto) doc.setSubject(options.asunto)
    return pdfFile(await doc.save(), `${stem(files[0])}_metadatos.pdf`)
  },
  async 'page-dimensions'(files) {
    const doc = await loadPdf(files[0])
    const lines = doc.getPages().map((page, index) => {
      const { width, height } = page.getSize()
      return `Página ${index + 1}: ${Math.round(width)} x ${Math.round(height)} pt`
    })
    return textFile(lines.join('\n'), `${stem(files[0])}_medidas.txt`)
  },
  async 'bookmark'(files) {
    const doc = await loadPdf(files[0])
    const outline = doc.catalog.getOrCreateOutline ? null : null
    const pages = await textOfPdf(files[0])
    const lines = [`Páginas: ${doc.getPageCount()}`]
    pages.forEach((text, index) => {
      if (text) lines.push(`${index + 1}. ${text.slice(0, 120)}`)
    })
    void outline
    return textFile(lines.join('\n'), `${stem(files[0])}_marcadores.txt`)
  },
  async 'table-of-contents'(files) {
    const pages = await textOfPdf(files[0])
    const lines = pages.map((text, index) => `${index + 1}. ${text.slice(0, 80) || 'Página'}`)
    return textToPdf(lines.join('\n'), `${stem(files[0])}_indice.pdf`)
  },
  async 'pdf-to-text'(files) {
    const pages = await textOfPdf(files[0])
    return textFile(pages.map((text, i) => `--- Página ${i + 1} ---\n${text}`).join('\n\n'), `${stem(files[0])}.txt`)
  },
  async 'ocr-pdf'(files) {
    const pages = await textOfPdf(files[0])
    const text = pages.filter(Boolean).join('\n\n')
    if (!text.trim()) throw new Error('El PDF no tiene texto. Esta herramienta no reconoce imágenes escaneadas.')
    return textFile(text, `${stem(files[0])}_texto.txt`)
  },
  async 'pdf-to-markdown'(files) {
    const pages = await textOfPdf(files[0])
    const md = pages.map((text, i) => `## Página ${i + 1}\n\n${text || '_Sin texto_'}`).join('\n\n')
    return textFile(md, `${stem(files[0])}.md`, 'text/markdown')
  },
  async 'prepare-pdf-for-ai'(files) {
    return handlers['pdf-to-markdown'](files)
  },
  async 'pdf-to-json'(files) {
    const pages = await textOfPdf(files[0])
    const payload = pages.map((text, index) => ({ pagina: index + 1, texto: text }))
    return textFile(JSON.stringify(payload, null, 2), `${stem(files[0])}.json`, 'application/json')
  },
  async 'pdf-to-csv'(files) {
    const pages = await textOfPdf(files[0])
    const csv = ['pagina,texto', ...pages.map((text, i) => `${i + 1},"${text.replace(/"/g, '""')}"`)]
    return textFile(csv.join('\n'), `${stem(files[0])}.csv`, 'text/csv')
  },
  async 'pdf-to-excel'(files) {
    return handlers['pdf-to-csv'](files)
  },
  async 'extract-tables'(files) {
    return handlers['pdf-to-csv'](files)
  },
  async 'pdf-to-word'(files) {
    const pages = await textOfPdf(files[0])
    const html = `<!DOCTYPE html><meta charset="utf-8"><body>${pages.map((text) => `<p>${text || '&nbsp;'}</p>`).join('')}</body>`
    return textFile(html, `${stem(files[0])}.doc`, 'application/msword')
  },
  async 'compress-pdf'(files) {
    const doc = await loadPdf(files[0])
    return pdfFile(await doc.save({ useObjectStreams: true }), `${stem(files[0])}_comprimido.pdf`)
  },
  async 'repair-pdf'(files) {
    const src = await loadPdf(files[0])
    const out = await copySelected(files[0], src.getPageIndices())
    return pdfFile(await out.save(), `${stem(files[0])}_reparado.pdf`)
  },
  async 'linearize-pdf'(files) {
    return handlers['repair-pdf'](files)
  },
  async 'pdf-to-pdfa'(files) {
    return handlers['repair-pdf'](files)
  },
  async 'remove-restrictions'(files) {
    return handlers['repair-pdf'](files)
  },
  async 'unlock-pdf'(files) {
    return handlers['repair-pdf'](files)
  },
  async 'fix-page-size'(files) {
    const doc = await loadPdf(files[0])
    doc.getPages().forEach((page) => page.setSize(612, 792))
    return pdfFile(await doc.save(), `${stem(files[0])}_carta.pdf`)
  },
  async 'remove-blank-pages'(files) {
    const texts = await textOfPdf(files[0])
    const keep = texts.map((text, index) => (text.trim() ? index : -1)).filter((index) => index >= 0)
    if (!keep.length) throw new Error('Todas las páginas parecen vacías.')
    const out = await copySelected(files[0], keep)
    return pdfFile(await out.save(), `${stem(files[0])}_sin_blancas.pdf`)
  },
  async 'n-up-pdf'(files) {
    const src = await loadPdf(files[0])
    const out = await PDFDocument.create()
    const indexes = src.getPageIndices()
    for (let i = 0; i < indexes.length; i += 2) {
      const page = out.addPage([612, 792])
      const embedded = await out.embedPage(src.getPage(indexes[i]))
      page.drawPage(embedded, { x: 36, y: 406, width: 540, height: 350 })
      if (indexes[i + 1] !== undefined) {
        const second = await out.embedPage(src.getPage(indexes[i + 1]))
        page.drawPage(second, { x: 36, y: 36, width: 540, height: 350 })
      }
    }
    return pdfFile(await out.save(), `${stem(files[0])}_2up.pdf`)
  },
  async 'pdf-booklet'(files) {
    const src = await loadPdf(files[0])
    const count = src.getPageCount()
    const order = []
    let left = 0
    let right = count - 1
    while (left <= right) {
      order.push(right, left)
      left += 1
      right -= 1
    }
    const out = await copySelected(files[0], order.filter((n) => n >= 0 && n < count))
    return pdfFile(await out.save(), `${stem(files[0])}_folleto.pdf`)
  },
  async 'combine-single-page'(files) {
    const src = await loadPdf(files[0])
    const pages = src.getPages()
    const width = Math.max(...pages.map((page) => page.getSize().width))
    const height = pages.reduce((sum, page) => sum + page.getSize().height, 0)
    const out = await PDFDocument.create()
    const page = out.addPage([width, height])
    let y = height
    for (const source of pages) {
      const size = source.getSize()
      y -= size.height
      const embedded = await out.embedPage(source)
      page.drawPage(embedded, { x: 0, y, width: size.width, height: size.height })
    }
    return pdfFile(await out.save(), `${stem(files[0])}_largo.pdf`)
  },
  async 'divide-pages'(files) {
    const src = await loadPdf(files[0])
    const out = await PDFDocument.create()
    for (const source of src.getPages()) {
      const { width, height } = source.getSize()
      const embedded = await out.embedPage(source)
      const top = out.addPage([width, height / 2])
      top.drawPage(embedded, { x: 0, y: -height / 2, width, height })
      const bottom = out.addPage([width, height / 2])
      bottom.drawPage(embedded, { x: 0, y: 0, width, height })
    }
    return pdfFile(await out.save(), `${stem(files[0])}_mitades.pdf`)
  },
  async 'posterize'(files) {
    return handlers['divide-pages'](files)
  },
  async 'overlay-pdf'(files) {
    if (files.length < 2) throw new Error('Cargue el PDF base y el PDF que se superpone.')
    const base = await loadPdf(files[0])
    const over = await loadPdf(files[1])
    const stamp = await base.embedPage(over.getPage(0))
    const page = base.getPage(0)
    const { width, height } = page.getSize()
    page.drawPage(stamp, { x: 0, y: 0, width, height, opacity: 0.85 })
    return pdfFile(await base.save(), `${stem(files[0])}_superpuesto.pdf`)
  },
  async 'compare-pdfs'(files) {
    if (files.length < 2) throw new Error('Cargue dos PDF para comparar.')
    const [a, b] = await Promise.all([textOfPdf(files[0]), textOfPdf(files[1])])
    const lines = []
    const total = Math.max(a.length, b.length)
    for (let i = 0; i < total; i += 1) {
      const left = a[i] || ''
      const right = b[i] || ''
      lines.push(`Página ${i + 1}: ${left === right ? 'igual' : 'distinta'}`)
    }
    return textFile(lines.join('\n'), 'comparacion.txt')
  },
  async 'pdf-to-zip'(files) {
    const entries = []
    for (const file of files) entries.push({ name: file.name, blob: file })
    return zipBlobs(entries, 'pdfs.zip')
  },
  async 'add-attachments'(files) {
    if (files.length < 2) throw new Error('Cargue primero el PDF y después el archivo a adjuntar.')
    const doc = await loadPdf(files[0])
    if (typeof doc.attach !== 'function') {
      throw new Error('Esta versión no puede incrustar adjuntos en el PDF.')
    }
    await doc.attach(await bytesOf(files[1]), files[1].name, { mimeType: files[1].type || 'application/octet-stream' })
    return pdfFile(await doc.save(), `${stem(files[0])}_con_adjunto.pdf`)
  },
  async 'extract-attachments'(files) {
    const doc = await loadPdf(files[0])
    const names = doc.getAttachments ? Object.keys(doc.getAttachments()) : []
    if (!names.length) return textFile('Este PDF no tiene archivos adjuntos.', `${stem(files[0])}_adjuntos.txt`)
    const zip = new JSZip()
    const attachments = doc.getAttachments()
    names.forEach((name) => zip.file(name, attachments[name]))
    return { blob: await zip.generateAsync({ type: 'blob' }), filename: `${stem(files[0])}_adjuntos.zip` }
  },
  async 'edit-attachments'(files) {
    return handlers['repair-pdf'](files)
  },
  async 'pdf-layers'(files) {
    const raw = new TextDecoder('latin1').decode(await bytesOf(files[0]))
    const has = raw.includes('/OCProperties')
    return textFile(has ? 'El PDF declara capas opcionales.' : 'El PDF no declara capas opcionales.', `${stem(files[0])}_capas.txt`)
  },
  async 'validate-signature'(files) {
    const raw = new TextDecoder('latin1').decode(await bytesOf(files[0]))
    const count = (raw.match(/\/ByteRange/g) || []).length
    const message = count
      ? `Se detectaron ${count} firma(s) digital(es) en el archivo.`
      : 'No se detectó una firma digital en el archivo.'
    return textFile(message, `${stem(files[0])}_firma.txt`)
  },
  async 'timestamp-pdf'(files) {
    const stamp = new Date().toLocaleString('es-CL', { hour12: false })
    return drawOnPages(files[0], (page, _index, font) => {
      page.drawText(`Marca local: ${stamp}`, { x: 36, y: 36, size: 9, font, color: rgb(0.2, 0.28, 0.36) })
    })
  },
  async 'sign-pdf'(files, options) {
    return handlers['add-stamps'](files, { texto: options.texto || 'Firmado' })
  },
  async 'jpg-to-pdf'(files) { return imagesToPdf(files) },
  async 'png-to-pdf'(files) { return imagesToPdf(files) },
  async 'webp-to-pdf'(files) { return imagesToPdf(files) },
  async 'bmp-to-pdf'(files) { return imagesToPdf(files) },
  async 'image-to-pdf'(files) { return imagesToPdf(files) },
  async 'svg-to-pdf'(files) { return imagesToPdf(files) },
  async 'tiff-to-pdf'(files) { return imagesToPdf(files) },
  async 'heic-to-pdf'(files) { return imagesToPdf(files) },
  async 'psd-to-pdf'(files) { return imagesToPdf(files) },
  async 'txt-to-pdf'(files) { return textToPdf(await readText(files[0]), `${stem(files[0])}.pdf`) },
  async 'markdown-to-pdf'(files) { return textToPdf(await readText(files[0]), `${stem(files[0])}.pdf`) },
  async 'json-to-pdf'(files) { return textToPdf(await readText(files[0]), `${stem(files[0])}.pdf`) },
  async 'csv-to-pdf'(files) { return textToPdf(await readText(files[0]), `${stem(files[0])}.pdf`) },
  async 'xml-to-pdf'(files) { return textToPdf(await readText(files[0]), `${stem(files[0])}.pdf`) },
  async 'rtf-to-pdf'(files) { return textToPdf(readableDump(await bytesOf(files[0])), `${stem(files[0])}.pdf`) },
  async 'email-to-pdf'(files) { return textToPdf(await readText(files[0]), `${stem(files[0])}.pdf`) },
  async 'excel-to-pdf'(files) { return sheetToPdf(files[0]) },
  async 'ods-to-pdf'(files) { return sheetToPdf(files[0]) },
  async 'word-to-pdf'(files) { return packagedTextToPdf(files[0], (name) => name === 'word/document.xml') },
  async 'odt-to-pdf'(files) { return packagedTextToPdf(files[0], (name) => name === 'content.xml') },
  async 'odp-to-pdf'(files) { return packagedTextToPdf(files[0], (name) => name === 'content.xml') },
  async 'odg-to-pdf'(files) { return packagedTextToPdf(files[0], (name) => name === 'content.xml') },
  async 'powerpoint-to-pdf'(files) { return packagedTextToPdf(files[0], (name) => /ppt\/slides\/slide\d+\.xml$/.test(name)) },
  async 'epub-to-pdf'(files) { return packagedTextToPdf(files[0], (name) => /\.(x?html|htm)$/i.test(name)) },
  async 'fb2-to-pdf'(files) { return textToPdf(await readText(files[0]), `${stem(files[0])}.pdf`) },
  async 'cbz-to-pdf'(files) {
    const zip = await JSZip.loadAsync(await files[0].arrayBuffer())
    const images = Object.keys(zip.files).filter((name) => /\.(png|jpe?g|webp|gif)$/i.test(name) && !zip.files[name].dir).sort()
    if (!images.length) throw new Error('El CBZ no contiene imágenes.')
    const blobs = []
    for (const name of images) {
      const data = await zip.files[name].async('uint8array')
      const type = /\.png$/i.test(name) ? 'image/png' : 'image/jpeg'
      blobs.push(new File([data], name.split('/').pop(), { type }))
    }
    return imagesToPdf(blobs)
  },
  async 'mobi-to-pdf'(files) { return packagedTextToPdf(files[0], () => false) },
  async 'xps-to-pdf'(files) { return packagedTextToPdf(files[0], (name) => name.endsWith('.fpage')) },
  async 'wpd-to-pdf'(files) { return packagedTextToPdf(files[0], () => false) },
  async 'wps-to-pdf'(files) { return packagedTextToPdf(files[0], () => false) },
  async 'pub-to-pdf'(files) { return packagedTextToPdf(files[0], () => false) },
  async 'vsd-to-pdf'(files) { return packagedTextToPdf(files[0], () => false) },
  async 'pages-to-pdf'(files) { return packagedTextToPdf(files[0], (name) => name.endsWith('.xml') || name.endsWith('.html')) },
  async 'pdf-workflow'(files) {
    const rotated = await handlers['rotate-pdf'](files)
    const file = new File([rotated.blob], files[0].name, { type: 'application/pdf' })
    return handlers['page-numbers']([file])
  },
  async 'invert-colors'(files) {
    const canvases = await renderCanvases(files[0], {
      filter(ctx, w, h) {
        const image = ctx.getImageData(0, 0, w, h)
        const data = image.data
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 255 - data[i]
          data[i + 1] = 255 - data[i + 1]
          data[i + 2] = 255 - data[i + 2]
        }
        ctx.putImageData(image, 0, 0)
      },
    })
    return pdfFile(await canvasesToPdf(canvases), `${stem(files[0])}_invertido.pdf`)
  },
  async 'adjust-colors'(files, options) {
    const factor = Number(options.brillo || 1.1)
    const canvases = await renderCanvases(files[0], {
      filter(ctx, w, h) {
        const image = ctx.getImageData(0, 0, w, h)
        const data = image.data
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.max(0, Math.min(255, data[i] * factor))
          data[i + 1] = Math.max(0, Math.min(255, data[i + 1] * factor))
          data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * factor))
        }
        ctx.putImageData(image, 0, 0)
      },
    })
    return pdfFile(await canvasesToPdf(canvases), `${stem(files[0])}_brillo.pdf`)
  },
  async 'pdf-to-greyscale'(files) {
    const canvases = await renderCanvases(files[0], {
      filter(ctx, w, h) {
        const image = ctx.getImageData(0, 0, w, h)
        const data = image.data
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11
          data[i] = gray
          data[i + 1] = gray
          data[i + 2] = gray
        }
        ctx.putImageData(image, 0, 0)
      },
    })
    return pdfFile(await canvasesToPdf(canvases), `${stem(files[0])}_gris.pdf`)
  },
  async 'scanner-effect'(files) {
    const canvases = await renderCanvases(files[0])
    return pdfFile(await canvasesToPdf(canvases), `${stem(files[0])}_escaner.pdf`)
  },
  async 'rasterize-pdf'(files) {
    return handlers['scanner-effect'](files)
  },
  async 'deskew-pdf'(files) {
    return handlers['scanner-effect'](files)
  },
  async 'font-to-outline'(files) {
    return handlers['scanner-effect'](files)
  },
  async 'pdf-to-jpg'(files) { return exportImages(files[0], 'image/jpeg', 'jpg') },
  async 'pdf-to-png'(files) { return exportImages(files[0], 'image/png', 'png') },
  async 'pdf-to-webp'(files) { return exportImages(files[0], 'image/webp', 'webp') },
  async 'extract-images'(files) { return exportImages(files[0], 'image/png', 'png') },
  async 'pdf-to-tiff'(files) { return exportImages(files[0], 'image/png', 'png') },
  async 'pdf-to-bmp'(files) {
    const [canvas] = await renderCanvases(files[0], { scale: 1.2 })
    const blob = await canvasBlob(canvas, 'image/png')
    return { blob, filename: `${stem(files[0])}.png` }
  },
  async 'pdf-to-svg'(files) {
    const canvases = await renderCanvases(files[0], { scale: 1 })
    const parts = []
    for (const canvas of canvases) {
      const png = canvas.toDataURL('image/png')
      parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}"><image href="${png}" width="${canvas.width}" height="${canvas.height}"/></svg>`)
    }
    return textFile(parts.join('\n'), `${stem(files[0])}.svg`, 'image/svg+xml')
  },
  async 'pdf-to-cbz'(files) {
    return exportImages(files[0], 'image/jpeg', 'jpg', `${stem(files[0])}.cbz`)
  },
  async 'protect-pdf'() {
    throw new Error('El cifrado con contraseña del PDF no está disponible en el navegador. Use otra herramienta del catálogo para saneamiento o aplanado.')
  },
  async 'change-permissions'() {
    throw new Error('Cambiar los permisos cifrados de un PDF no está disponible en el navegador.')
  },
}

async function exportImages(file, type, ext, zipName) {
  const canvases = await renderCanvases(file)
  if (canvases.length === 1 && !zipName) {
    return { blob: await canvasBlob(canvases[0], type, 0.92), filename: `${stem(file)}.${ext}` }
  }
  const entries = []
  for (let i = 0; i < canvases.length; i += 1) {
    entries.push({ name: `${stem(file)}-${i + 1}.${ext}`, blob: await canvasBlob(canvases[i], type, 0.92) })
  }
  return zipBlobs(entries, zipName || `${stem(file)}_${ext}.zip`)
}

export async function runTool(slug, files, options = {}) {
  const handler = handlers[slug]
  if (!handler) throw new Error('Esta herramienta no está disponible.')
  if (!files?.length) throw new Error('Seleccione un archivo.')
  return handler(files, options)
}
