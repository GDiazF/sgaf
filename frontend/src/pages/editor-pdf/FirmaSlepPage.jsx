import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Alert,
  Button,
  Field,
  FileInput,
  FormOverlay,
  Input,
  PageHeader,
  useFormOverlay,
} from '@slep/ui'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import api from '../../api'
import { downloadBlob } from '../../editor-pdf/download'
import { selloComoImagen } from '../../editor-pdf/selloImagen'

GlobalWorkerOptions.workerSrc = workerUrl

const STAMP_WIDTH = 210
const STAMP_HEIGHT = 36

function stampBox(page, place) {
  const w = Math.min(0.92, STAMP_WIDTH / page.width)
  const h = Math.min(0.5, STAMP_HEIGHT / page.height)
  const margin = 0.05
  const y = Math.max(0, 1 - h - margin)
  if (place === 'izquierda') return { x: margin, y, w, h }
  if (place === 'centro') return { x: Math.max(0, (1 - w) / 2), y: Math.max(0, (1 - h) / 2), w, h }
  return { x: Math.max(0, 1 - w - margin), y, w, h }
}

export default function FirmaSlepPage({ tool }) {
  const navigate = useNavigate()
  const canvasRef = useRef(null)
  const pdfBytes = useRef(null)
  const pageSize = useRef({ width: 612, height: 792 })
  const dragRef = useRef(null)
  const renderTaskRef = useRef(null)
  const placedLoad = useRef(0)
  const overlay = useFormOverlay()
  const [fileName, setFileName] = useState('')
  const [loadId, setLoadId] = useState(0)
  const [pageCount, setPageCount] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [box, setBox] = useState(() => stampBox({ width: 612, height: 792 }, 'derecha'))
  const [reason, setReason] = useState('Firma Digital Institucional - SLEP Iquique')
  const [location, setLocation] = useState('Iquique, Chile')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const bytes = pdfBytes.current
    if (!bytes) return undefined
    let alive = true

    const show = async () => {
      const pdf = await getDocument({ data: bytes.slice(0) }).promise
      try {
        if (!alive) return
        setPageCount(pdf.numPages)
        const pdfPage = await pdf.getPage(Math.min(pageNumber, pdf.numPages))
        if (!alive) return
        const viewport = pdfPage.getViewport({ scale: 1.2 })
        const base = pdfPage.getViewport({ scale: 1 })
        pageSize.current = { width: base.width, height: base.height }
        if (alive && placedLoad.current !== loadId) {
          placedLoad.current = loadId
          setBox(stampBox(pageSize.current, 'derecha'))
        }
        const canvas = canvasRef.current
        if (!canvas || !alive) return
        canvas.width = viewport.width
        canvas.height = viewport.height
        const task = pdfPage.render({ canvasContext: canvas.getContext('2d'), viewport })
        renderTaskRef.current = task
        try {
          await task.promise
        } finally {
          if (renderTaskRef.current === task) renderTaskRef.current = null
        }
      } finally {
        try {
          await pdf.destroy()
        } catch {
          /* el documento ya se cerró al cancelar el dibujo */
        }
      }
    }

    show().catch((error) => {
      if (!alive || error?.name === 'RenderingCancelledException') return
      setNotice(error.message || 'No se pudo mostrar el PDF.')
    })

    return () => {
      alive = false
      renderTaskRef.current?.cancel()
      renderTaskRef.current = null
    }
  }, [pageNumber, loadId])

  const onFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    pdfBytes.current = new Uint8Array(await file.arrayBuffer())
    setNotice('')
    setPageNumber(1)
    setFileName(file.name)
    setLoadId((current) => current + 1)
  }

  const onPointerDown = (event) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    dragRef.current = {
      dx: event.clientX - rect.left - box.x * rect.width,
      dy: event.clientY - rect.top - box.y * rect.height,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event) => {
    if (!dragRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = (event.clientX - rect.left - dragRef.current.dx) / rect.width
    const y = (event.clientY - rect.top - dragRef.current.dy) / rect.height
    setBox((current) => ({
      ...current,
      x: Math.max(0, Math.min(1 - current.w, x)),
      y: Math.max(0, Math.min(1 - current.h, y)),
    }))
  }

  const onSign = async () => {
    if (!pdfBytes.current) return
    try {
      await overlay.run(async () => {
      const { data } = await api.get('editor-pdf/certificado/')
      const binary = Uint8Array.from(atob(data.p12_base64), (char) => char.charCodeAt(0))
      const { PdfSigner } = await import('zgapdfsigner')
      const { PDFDocument, StandardFonts } = await import('pdf-lib')
      const { width, height } = pageSize.current
      const pdfDoc = await PDFDocument.load(pdfBytes.current, { ignoreEncryption: true })
      const pdfPage = pdfDoc.getPages()[pageNumber - 1]
      const media = pdfPage.getMediaBox()
      const crop = pdfPage.getCropBox()
      const angle = ((pdfPage.getRotation().angle % 360) + 360) % 360
      let areaX = box.x * width
      let areaY = box.y * height
      let areaW = box.w * width
      let areaH = box.h * height
      if (angle === 0) {
        areaX = crop.x + box.x * crop.width
        areaY = (media.y + media.height) - (crop.y + crop.height) + box.y * crop.height
        areaW = box.w * crop.width
        areaH = box.h * crop.height
      }
      const text = data.texto_firma || `Firmado digitalmente por:\n${data.nombre || data.rut}\nSLEP Iquique`
      const probe = await PDFDocument.create()
      const font = await probe.embedFont(StandardFonts.Helvetica)
      const size = 9
      const lineHeight = font.heightAtSize(size, { descender: true })
      const textWidth = Math.max(...text.split('\n').map((line) => font.widthOfTextAtSize(line || ' ', size)))
      const tightW = textWidth + 8
      if (tightW < areaW) {
        areaX += (areaW - tightW) / 2
        areaW = tightW
      }
      const lines = text.split('\n').reduce((count, line) => (
        count + Math.max(1, Math.ceil(font.widthOfTextAtSize(line, size) / Math.max(areaW, 1)))
      ), 0)
      const needed = lines * lineHeight + 8
      if (needed > areaH) {
        const extra = Math.min(needed - areaH, areaY)
        areaY -= extra
        areaH += extra
      }
      const yOffset = Math.max(0, areaH - lines * lineHeight - 4)
      let imgBytes = null
      if (data.imagen_firma) {
        const extra = Math.min(areaH, 32)
        const origen = angle === 0 ? crop.x : 0
        const limite = angle === 0 ? crop.x + crop.width : width
        areaX = Math.max(origen, areaX - extra / 2)
        areaW = Math.min(areaW + extra, limite - areaX)
        imgBytes = await selloComoImagen({
          imagen: data.imagen_firma,
          tipo: data.imagen_tipo,
          texto,
          widthPt: areaW,
          heightPt: areaH,
        })
      }
      const signer = new PdfSigner({
        p12cert: binary.buffer,
        pwd: data.password,
        reason,
        location,
        drawinf: {
          area: {
            x: Math.round(areaX),
            y: Math.round(areaY),
            w: Math.round(areaW),
            h: Math.round(areaH),
          },
          pageidx: pageNumber - 1,
          ...(imgBytes
            ? { imgInfo: { imgData: imgBytes, imgType: 'png' } }
            : {
              textInfo: {
                text,
                size,
                color: '#172D45',
                align: 1,
                yOffset,
              },
            }),
        },
      })
      const signed = await signer.sign(pdfBytes.current)
      const base = fileName.replace(/\.pdf$/i, '')
      downloadBlob(new Blob([signed], { type: 'application/pdf' }), `${base}_firmado_slep.pdf`)
    }, {
      successTitle: 'Documento firmado',
      successDescription: 'La descarga comenzó. El certificado queda en el sistema y el PDF no se guarda aquí.',
      errorTitle: 'No se pudo firmar',
      formatError: (err) => err.response?.data?.detail || err?.message || 'No se pudo firmar.',
    })
    } catch {
      /* el overlay muestra el error */
    }
  }

  return (
    <div className="page" data-od-id="editor-pdf-firma-slep">
      <PageHeader
        icon="file-check"
        title={tool.nombre}
        description="Se usa el certificado de su sesión, creado una vez con su RUT. El PDF firmado solo se descarga."
        breadcrumbs={[
          { label: 'Editor PDF', to: '/editor-pdf' },
          { label: tool.nombre },
        ]}
        linkComponent={Link}
        actions={
          <Button variant="secondary" size="sm" onClick={() => navigate('/editor-pdf')}>
            Volver
          </Button>
        }
      />
      <FormOverlay
        status={overlay.status}
        title={overlay.title}
        description={overlay.description}
        onDismiss={overlay.dismiss}
      >
        <FileInput
          variant="zone"
          label="Arrastre el PDF o haga clic para elegirlo"
          accept="application/pdf,.pdf"
          onChange={onFile}
        />
        {notice ? <Alert variant="danger">{notice}</Alert> : null}
        {fileName ? (
          <div className="doc-editor">
            <div className="doc-ribbon">
              <div className="doc-ribbon__tabs">
                <button type="button" className="doc-ribbon__tab" onClick={() => setPageNumber((n) => Math.max(1, n - 1))}>
                  Anterior
                </button>
                <span className="doc-ribbon__tab is-active">
                  Página {pageNumber} de {pageCount || 1}
                </span>
                <button type="button" className="doc-ribbon__tab" onClick={() => setPageNumber((n) => Math.min(pageCount || 1, n + 1))}>
                  Siguiente
                </button>
              </div>
            </div>
            <div className="doc-editor__canvas">
              <canvas ref={canvasRef} />
              <button
                type="button"
                aria-label="Posición de la firma"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={() => { dragRef.current = null }}
                style={{
                  position: 'absolute',
                  left: `${box.x * 100}%`,
                  top: `${box.y * 100}%`,
                  width: `${box.w * 100}%`,
                  height: `${box.h * 100}%`,
                  border: '2px solid var(--primary)',
                  background: 'var(--primary-subtle)',
                  cursor: 'move',
                }}
              />
            </div>
            <div className="doc-ribbon">
              <div className="doc-ribbon__tabs">
                <button type="button" className="doc-ribbon__tab" onClick={() => setBox(stampBox(pageSize.current, 'izquierda'))}>Abajo izquierda</button>
                <button type="button" className="doc-ribbon__tab" onClick={() => setBox(stampBox(pageSize.current, 'derecha'))}>Abajo derecha</button>
                <button type="button" className="doc-ribbon__tab" onClick={() => setBox(stampBox(pageSize.current, 'centro'))}>Centrado</button>
              </div>
            </div>
          </div>
        ) : null}
        <Field label="Motivo">
          <Input value={reason} onChange={(event) => setReason(event.target.value)} />
        </Field>
        <Field label="Ciudad">
          <Input value={location} onChange={(event) => setLocation(event.target.value)} />
        </Field>
        <Alert variant="info">
          El certificado se genera solo la primera vez y se renueva si está vencido. No se guarda una copia del PDF.
        </Alert>
        <Button variant="primary" onClick={onSign} disabled={!fileName || overlay.busy}>
          Firmar y descargar
        </Button>
      </FormOverlay>
    </div>
  )
}
