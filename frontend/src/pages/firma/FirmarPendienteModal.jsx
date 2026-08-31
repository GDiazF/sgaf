import React, { useCallback, useEffect, useRef, useState } from 'react'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useNotify } from '../../hooks/useNotify'
import FirmaStampPreview from '../../components/firma/FirmaStampPreview'
import {
  Modal,
  Button,
  Field,
  Input,
  Select,
  Alert,
} from '@slep/ui'

import { ZOOM_DEFAULT } from '../../utils/firmaPreviewZoom'
import { fetchPendientePdfBlob } from '../../utils/firmaPendientePdf'

const PRESETS = [
  { id: 'tl', label: 'Sup. izq.' },
  { id: 'tr', label: 'Sup. der.' },
  { id: 'bl', label: 'Inf. izq.' },
  { id: 'br', label: 'Inf. der.' },
]

function downloadBlob(data, filename) {
  const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

async function readErrorMessage(error) {
  const data = error?.response?.data
  if (!data) return error?.message || 'Error al firmar.'
  if (typeof data === 'string') return data
  if (data.error) return data.error
  if (data instanceof Blob) {
    try {
      const text = await data.text()
      const parsed = JSON.parse(text)
      return parsed.error || text
    } catch {
      return 'Error al firmar.'
    }
  }
  return 'Error al firmar.'
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function getSignerDefaults(user) {
  if (!user) return { name: '', role: '' }
  const fd = user.funcionario_data
  const fromFuncionario = (fd?.nombre_funcionario || '').trim()
  const fromAccount = `${user.first_name || ''} ${user.last_name || ''}`.trim()
  return {
    name: fromFuncionario || fromAccount || user.username || '',
    role: (fd?.cargo || '').trim(),
  }
}

export default function FirmarPendienteModal({ open, pendiente, onClose, onFirmado }) {
  const { user } = useAuth()
  const { notify } = useNotify()
  const [config, setConfig] = useState(null)
  const [pdfFile, setPdfFile] = useState(null)
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [preview, setPreview] = useState(null)
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(ZOOM_DEFAULT)
  const [stampBox, setStampBox] = useState({ x: 0, y: 0, w: 160, h: 56 })
  const [otp, setOtp] = useState('')
  const [signerName, setSignerName] = useState('')
  const [signerRole, setSignerRole] = useState('')
  const [signing, setSigning] = useState(false)
  const dragRef = useRef(null)
  const stageRef = useRef(null)
  const viewportRef = useRef(null)

  useEffect(() => {
    const defaults = getSignerDefaults(user)
    setSignerName(defaults.name)
    setSignerRole(defaults.role)
  }, [user])

  useEffect(() => {
    const vp = viewportRef.current
    if (!vp || !preview || !open) return
    const centerTop = () => {
      const maxX = Math.max(0, vp.scrollWidth - vp.clientWidth)
      vp.scrollLeft = maxX / 2
      vp.scrollTop = 0
    }
    centerTop()
    requestAnimationFrame(centerTop)
  }, [zoom, preview, page, open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await api.get('firma-digital/config/')
        if (!cancelled) setConfig(data)
      } catch {
        if (!cancelled) setConfig(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  const loadPreview = useCallback(async (file, pageNum) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('page', String(pageNum))
    const { data } = await api.post('firma-digital/preview/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    if (!data?.image_base64) {
      throw new Error('La vista previa no incluyó imagen del PDF.')
    }
    setPreview(data)
    const stampW = Math.round(
      (data.page_width_pt ? 205 / data.page_width_pt : 0.28) * data.preview_width_px,
    )
    const stampH = Math.round(
      (data.page_height_pt ? 84 / data.page_height_pt : 0.1) * data.preview_height_px,
    )
    const margin = 16
    setStampBox({
      w: stampW,
      h: stampH,
      x: Math.max(margin, data.preview_width_px - stampW - margin),
      y: Math.max(margin, data.preview_height_px - stampH - margin),
    })
    setZoom(ZOOM_DEFAULT)
  }, [])

  useEffect(() => {
    if (!open || !pendiente) return
    let cancelled = false
    ;(async () => {
      setOtp('')
      setPreview(null)
      setPdfFile(null)
      setPage(1)
      setZoom(ZOOM_DEFAULT)
      setLoadError(null)
      setLoadingPdf(true)
      try {
        const blob = await fetchPendientePdfBlob(pendiente, api)
        if (cancelled) return

        const file = new File(
          [blob],
          `${pendiente.codigo_interno || 'documento'}.pdf`,
          { type: 'application/pdf' },
        )
        setPdfFile(file)
        await loadPreview(file, 1)
      } catch (err) {
        if (!cancelled) {
          const msg =
            err?.message ||
            err?.response?.data?.error ||
            'No se pudo cargar el PDF para firmar.'
          setLoadError(msg)
          notify({ variant: 'danger', text: msg })
        }
      } finally {
        if (!cancelled) setLoadingPdf(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, pendiente, loadPreview, notify])

  const applyPreset = (id) => {
    if (!preview) return
    const margin = 16
    const { w, h } = stampBox
    const maxX = preview.preview_width_px - w - margin
    const maxY = preview.preview_height_px - h - margin
    const map = {
      br: { x: maxX, y: maxY },
      bl: { x: margin, y: maxY },
      tr: { x: maxX, y: margin },
      tl: { x: margin, y: margin },
    }
    const pos = map[id]
    if (pos) setStampBox((prev) => ({ ...prev, ...pos }))
  }

  const boxToPdfCoords = () => {
    if (!preview) return null
    const scaleX = preview.page_width_pt / preview.preview_width_px
    const scaleY = preview.page_height_pt / preview.preview_height_px
    const llx = Math.round(stampBox.x * scaleX)
    const urx = Math.round((stampBox.x + stampBox.w) * scaleX)
    const pdfTop = stampBox.y * scaleY
    const pdfBottom = (stampBox.y + stampBox.h) * scaleY
    const ury = Math.round(preview.page_height_pt - pdfTop)
    const lly = Math.round(preview.page_height_pt - pdfBottom)
    return { llx, lly, urx, ury }
  }

  const onStampPointerDown = (e) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect || !preview) return
    dragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      originX: stampBox.x,
      originY: stampBox.y,
      scaleX: preview.preview_width_px / rect.width,
      scaleY: preview.preview_height_px / rect.height,
    }
  }

  const onStampPointerMove = (e) => {
    const drag = dragRef.current
    if (!drag || !preview) return
    const dx = (e.clientX - drag.startClientX) * drag.scaleX
    const dy = (e.clientY - drag.startClientY) * drag.scaleY
    setStampBox((prev) => ({
      ...prev,
      x: clamp(drag.originX + dx, 0, preview.preview_width_px - prev.w),
      y: clamp(drag.originY + dy, 0, preview.preview_height_px - prev.h),
    }))
  }

  const onStampPointerUp = () => {
    dragRef.current = null
  }

  const handlePageChange = async (e) => {
    const next = Number(e.target.value) || 1
    setPage(next)
    if (pdfFile) {
      try {
        await loadPreview(pdfFile, next)
      } catch {
        notify({ variant: 'danger', text: 'No se pudo cambiar de página.' })
      }
    }
  }

  const handleSign = async () => {
    if (!pendiente || !pdfFile || !preview) return
    if (!signerName.trim()) {
      notify({
        variant: 'warning',
        text: 'Su usuario no tiene funcionario vinculado con nombre.',
      })
      return
    }
    if (!/^\d{6}$/.test(otp.trim())) {
      notify({
        variant: 'warning',
        text: 'Ingrese el OTP de 6 dígitos de Google Authenticator (certificado FirmaGob).',
      })
      return
    }
    const coords = boxToPdfCoords()
    if (!coords) return

    setSigning(true)
    const formData = new FormData()
    formData.append('file', pdfFile)
    formData.append('otp', otp.trim())
    formData.append('page', String(page))
    formData.append('llx', String(coords.llx))
    formData.append('lly', String(coords.lly))
    formData.append('urx', String(coords.urx))
    formData.append('ury', String(coords.ury))

    try {
      const response = await api.post(
        `firma-digital/pendientes/${pendiente.id}/firmar/`,
        formData,
        {
          responseType: 'blob',
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      )
      const codigo =
        response.headers?.['x-sgaf-documento-codigo'] ||
        response.headers?.['X-SGAF-Documento-Codigo']
      downloadBlob(response.data, `${pendiente.codigo_interno}_firmado.pdf`)
      notify({
        variant: 'success',
        text: codigo
          ? `Documento firmado. Código: ${codigo}`
          : 'Documento firmado correctamente.',
      })
      onFirmado?.({ codigo })
      onClose?.()
    } catch (err) {
      notify({ variant: 'danger', text: await readErrorMessage(err) })
    } finally {
      setSigning(false)
    }
  }

  const pageOptions = preview
    ? Array.from({ length: preview.page_count }, (_, i) => ({
        value: String(i + 1),
        label: `Página ${i + 1}`,
      }))
    : []

  const stampStyle = preview
    ? {
        left: `${(stampBox.x / preview.preview_width_px) * 100}%`,
        top: `${(stampBox.y / preview.preview_height_px) * 100}%`,
        width: `${(stampBox.w / preview.preview_width_px) * 100}%`,
        height: `${(stampBox.h / preview.preview_height_px) * 100}%`,
      }
    : undefined

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!signing) onClose?.()
      }}
      className="modal--shell modal--viewer modal--firma-sign"
      bodyClassName="modal__body--viewer"
      title="Ubicar sello y firmar"
      subheader={pendiente?.titulo || pendiente?.codigo_interno || 'Documento'}
      overlayStatus={signing ? 'loading' : null}
      overlayTitle="Firmando documento…"
      overlayDescription="Enviando a FirmaGob. Esto puede tardar unos segundos."
      footer={
        <>
          <Button variant="quiet" size="sm" type="button" onClick={onClose} disabled={signing}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="button"
            loading={signing}
            disabled={signing || loadingPdf || !preview || !signerName.trim()}
            onClick={handleSign}
          >
            Firmar con sello
          </Button>
        </>
      }
    >
      {loadingPdf ? (
        <Alert variant="info" title="Preparando documento">
          Generando vista previa del PDF…
        </Alert>
      ) : null}

      {loadError && !loadingPdf ? (
        <Alert variant="danger" title="No se pudo mostrar el documento">
          {loadError}
        </Alert>
      ) : null}

      {!loadingPdf && !loadError && preview ? (
        <div className="firma-sign-layout">
          <div className="firma-sign-layout__viewer">
            <FirmaStampPreview
              preview={preview}
              page={page}
              zoom={zoom}
              onZoomChange={setZoom}
              stampStyle={stampStyle}
              onStampPointerDown={onStampPointerDown}
              onStampPointerMove={onStampPointerMove}
              onStampPointerUp={onStampPointerUp}
              disabled={signing}
              viewportRef={viewportRef}
              stageRef={stageRef}
            />
          </div>

          <aside className="firma-sign-layout__aside">
            {pageOptions.length > 1 ? (
              <Field label="Página">
                <Select value={String(page)} onChange={handlePageChange} disabled={signing}>
                  {pageOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            <Field label="Esquina del sello">
              <div className="firma-sign-presets" role="group" aria-label="Esquinas del documento">
                {PRESETS.map((p) => (
                  <Button
                    key={p.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={signing}
                    onClick={() => applyPreset(p.id)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </Field>

            <Field label="Firmante" required>
              <Input value={signerName} readOnly disabled={signing} placeholder="Sin nombre" />
            </Field>

            <Field label="Cargo">
              <Input value={signerRole} readOnly disabled={signing} placeholder="Sin cargo" />
            </Field>

            {config?.sello_resuelto?.imagen_url ? (
              <img
                className="firma-sign-layout__sello"
                src={config.sello_resuelto.imagen_url}
                alt={config.sello_resuelto.nombre}
              />
            ) : (
              <Alert variant="warning" title="Sin sello de área">
                Se usará recuadro con nombre y cargo.
              </Alert>
            )}

            <Field label="OTP FirmaGob" required hint="6 dígitos del certificado (RA).">
              <Input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                disabled={signing}
              />
            </Field>
          </aside>
        </div>
      ) : null}
    </Modal>
  )
}
