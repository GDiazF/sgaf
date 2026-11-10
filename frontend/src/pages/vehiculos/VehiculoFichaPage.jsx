import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../../api'
import SearchableSelect from '../../components/common/SearchableSelect'
import { useNotify } from '../../hooks/useNotify'
import { usePermission } from '../../hooks/usePermission'
import {
  PageHeader,
  Modal,
  ConfirmModal,
  Button,
  Field,
  Input,
  Select,
  Badge,
  Icon,
  FileInput,
  DataTable,
  Textarea,
  Switch,
  FormSection,
  FormOverlay,
  EmptyState,
  useFormOverlay,
  formatApiFormError,
  Alert,
} from '@slep/ui'

const TABS = [
  { id: 'info', label: 'Identificación' },
  { id: 'docs', label: 'Documentos' },
  { id: 'actas', label: 'Actas' },
  { id: 'fuel', label: 'Combustible' },
  { id: 'prev', label: 'Mant. preventivo' },
  { id: 'inc', label: 'Incidentes' },
  { id: 'rep', label: 'Reparaciones' },
]

const YEARS = [2024, 2025, 2026, 2027, 2028]
const MESES = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
]

const STATUS = {
  vencido: { label: 'Vencido', variant: 'danger' },
  por_vencer: { label: 'Por vencer', variant: 'warning' },
  vigente: { label: 'Vigente', variant: 'success' },
  sin_fecha: { label: 'Sin vigencia', variant: 'neutral' },
}

const SKIP_FORM_KEYS = new Set([
  'documentos',
  'imagen',
  'display_name',
  'conductores',
  'conductores_detalle',
  'creado_en',
])
const DATE_FIELDS = new Set(['fecha_adquisicion', 'fecha_inscripcion'])

function formatDateCL(value) {
  if (!value) return '—'
  const raw = String(value).slice(0, 10)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
  if (!m) return String(value)
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('es-CL')
}

function formatDateTimeCL(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('es-CL')
}

function formatMoney(n) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n || 0)
}

function getStatusVencimiento(fecha) {
  if (!fecha) return STATUS.sin_fecha
  const today = new Date()
  const venc = new Date(fecha)
  const diff = (venc - today) / (1000 * 60 * 60 * 24)
  if (diff < 0) return STATUS.vencido
  if (diff < 30) return STATUS.por_vencer
  return STATUS.vigente
}

const emptyUpload = {
  archivo: null,
  numero_referencia: '',
  institucion: '',
  fecha_documento: '',
  fecha_vencimiento: '',
  observaciones: '',
  dias_aviso: '',
}

const emptyFuel = {
  anio: new Date().getFullYear(),
  mes: new Date().getMonth() + 1,
  km_inicial: '',
  km_final: '',
  litros: '',
  gasto_bencina: '',
  gasto_peajes: '',
  gasto_seguros: '',
}

const emptyPrev = {
  fecha: '',
  kilometraje: '',
  cambio_aceite: false,
  cambio_filtro_aceite: false,
  cambio_liquido_frenos: false,
  observaciones: '',
}

const emptyInc = {
  fecha: '',
  hora: '',
  tipo_accidente: '',
  funcionario: '',
  costo_reparacion: '',
  observaciones: '',
}

const emptyRep = {
  fecha: '',
  kilometraje: '',
  tipo_mantenimiento: 'CORRECTIVO',
  descripcion: '',
  costo: '',
  observaciones: '',
}

export default function VehiculoFichaPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { notify } = useNotify()
  const { can } = usePermission()
  const canChange = can('vehiculos.change_vehiculo') || can('vehiculos.change_registromensual')
  const canAdd = can('vehiculos.add_registromensual') || canChange
  const canDelete = can('vehiculos.delete_registromensual') || can('vehiculos.delete_vehiculo')

  const [loading, setLoading] = useState(true)
  const [vehiculo, setVehiculo] = useState(null)
  const [activeTab, setActiveTab] = useState('info')
  const [editingVehiculo, setEditingVehiculo] = useState({})
  const [conductorIds, setConductorIds] = useState([])
  const [pendingConductorId, setPendingConductorId] = useState('')
  const [documentos, setDocumentos] = useState([])
  const [tiposDoc, setTiposDoc] = useState([])
  const [tiposCombustible, setTiposCombustible] = useState([])
  const [funcionarios, setFuncionarios] = useState([])
  const [newImage, setNewImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  const [registros, setRegistros] = useState([])
  const [preventivos, setPreventivos] = useState([])
  const [incidentes, setIncidentes] = useState([])
  const [reparaciones, setReparaciones] = useState([])
  const [emisiones, setEmisiones] = useState([])

  const updateOverlay = useFormOverlay()
  const uploadOverlay = useFormOverlay()
  const crudOverlay = useFormOverlay()

  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedTipoForUpload, setSelectedTipoForUpload] = useState(null)
  const [uploadData, setUploadData] = useState(emptyUpload)
  const [pendingDeleteDocId, setPendingDeleteDocId] = useState(null)

  const [fuelOpen, setFuelOpen] = useState(false)
  const [fuelEditing, setFuelEditing] = useState(null)
  const [fuelForm, setFuelForm] = useState(emptyFuel)

  const [prevOpen, setPrevOpen] = useState(false)
  const [prevEditing, setPrevEditing] = useState(null)
  const [prevForm, setPrevForm] = useState(emptyPrev)

  const [incOpen, setIncOpen] = useState(false)
  const [incEditing, setIncEditing] = useState(null)
  const [incForm, setIncForm] = useState(emptyInc)

  const [repOpen, setRepOpen] = useState(false)
  const [repEditing, setRepEditing] = useState(null)
  const [repForm, setRepForm] = useState(emptyRep)

  const [pendingDelete, setPendingDelete] = useState(null)
  const [pdfBusy, setPdfBusy] = useState(null)
  const [actaModalOpen, setActaModalOpen] = useState(false)
  const [actaModalMode, setActaModalMode] = useState('preview') // preview | emitir | reutilizar
  const [actaSolicitanteId, setActaSolicitanteId] = useState('')

  const openActaModal = (mode) => {
    const defaultId =
      (vehiculo?.conductores_detalle || [])[0]?.id
      || (vehiculo?.conductores || [])[0]
      || ''
    setActaSolicitanteId(defaultId ? String(defaultId) : '')
    setActaModalMode(mode)
    setActaModalOpen(true)
  }

  const selectedActaSolicitante = useMemo(
    () => funcionarios.find((f) => String(f.id) === String(actaSolicitanteId)) || null,
    [funcionarios, actaSolicitanteId],
  )

  const buildSolicitanteMeta = (func) => {
    if (!func) return {}
    return {
      solicitante_nombre: func.nombre_funcionario || '',
      solicitante_rut: func.rut || '',
      solicitante_cargo: func.cargo_nombre || '',
      solicitante_unidad: func.unidad_nombre || '',
      solicitante_departamento: func.departamento_nombre || '',
      solicitante_subdireccion: func.subdireccion_nombre || '',
      solicitante_anexo: func.anexo || '',
      solicitante_calidad_juridica: func.calidad_juridica_nombre || '',
      solicitante_grado: func.grado_nombre || '',
      receptor_nombre: func.nombre_funcionario || '',
      receptor_rut: func.rut || '',
      receptor_cargo: func.cargo_nombre || '',
    }
  }

  const loadEmisiones = useCallback(async () => {
    if (!id) return
    try {
      const res = await api.get(`vehiculos/flota/${id}/emisiones/`, {
        params: { tipo: 'acta_entrega' },
      })
      setEmisiones(Array.isArray(res.data) ? res.data : res.data?.results || [])
    } catch (error) {
      console.error(error)
    }
  }, [id])

  const downloadVehiculoPdf = async (kind, options = {}) => {
    if (!id) return
    const {
      emitir = false,
      reutilizar = false,
      emisionId = null,
      folioHint = '',
      meta = {},
    } = options
    const path =
      kind === 'acta'
        ? `vehiculos/flota/${id}/acta-entrega/`
        : `vehiculos/flota/${id}/hoja-vida/`
    const busyKey =
      kind === 'acta'
        ? emisionId
          ? `acta-dl-${emisionId}`
          : emitir
            ? 'acta-emitir'
            : reutilizar
              ? 'acta-ultima'
              : 'acta-preview'
        : 'hoja'
    const filename =
      kind === 'acta'
        ? emitir || reutilizar || emisionId
          ? `${folioHint || vehiculo?.ultima_solicitud_folio || 'acta'}.pdf`
          : `borrador-acta-${vehiculo?.patente || id}.pdf`
        : `hoja-vida-${vehiculo?.patente || id}.pdf`
    setPdfBusy(busyKey)
    try {
      const response =
        kind === 'acta'
          ? await api.post(
              path,
              {
                ...(emitir ? { emitir: 1 } : {}),
                ...(reutilizar ? { reutilizar: 1 } : {}),
                ...(emisionId ? { emision_id: emisionId } : {}),
                ...meta,
              },
              { responseType: 'blob' },
            )
          : await api.get(path, { responseType: 'blob' })
      const contentType = response.headers?.['content-type'] || ''
      if (contentType.includes('application/json')) {
        const text = await response.data.text()
        const data = JSON.parse(text)
        notify({
          variant: 'danger',
          text: data.error || data.hint || 'No se pudo generar el PDF.',
        })
        return
      }
      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: 'application/pdf' }),
      )
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      if (kind === 'acta' && emitir) {
        await loadVehiculo()
        await loadEmisiones()
        notify({
          variant: 'success',
          text: 'Acta emitida: se guardó el PDF y el Nº de solicitud.',
        })
      }
      setActaModalOpen(false)
    } catch (err) {
      let message = 'No se pudo generar el PDF.'
      const data = err?.response?.data
      if (data instanceof Blob) {
        try {
          const parsed = JSON.parse(await data.text())
          message = parsed.error || parsed.hint || message
        } catch {
          /* ignore */
        }
      } else if (typeof data?.error === 'string') {
        message = data.error
      }
      notify({ variant: 'danger', text: message })
    } finally {
      setPdfBusy(null)
    }
  }

  const confirmActaModal = async () => {
    if (!selectedActaSolicitante) {
      notify({ variant: 'warning', text: 'Seleccione el funcionario solicitante.' })
      return
    }
    const meta = buildSolicitanteMeta(selectedActaSolicitante)
    await downloadVehiculoPdf('acta', {
      emitir: actaModalMode === 'emitir',
      reutilizar: actaModalMode === 'reutilizar',
      meta,
    })
  }

  const loadVehiculo = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`vehiculos/flota/${id}/`)
      const data = res.data
      setVehiculo(data)
      setEditingVehiculo({ ...data })
      setDocumentos(data.documentos || [])
      setImagePreview(data.imagen || null)
      setNewImage(null)
      const fromDetalle = (data.conductores_detalle || []).map((c) => c.id)
      const fromIds = (data.conductores || []).map((c) =>
        typeof c === 'object' ? c.id : c,
      )
      setConductorIds(fromDetalle.length ? fromDetalle : fromIds)
    } catch (err) {
      notify({
        variant: 'danger',
        text: formatApiFormError(err) || 'No se pudo cargar el vehículo',
      })
      navigate('/vehiculos/flota')
    } finally {
      setLoading(false)
    }
  }, [id, navigate, notify])

  const loadLookups = useCallback(async () => {
    try {
      const [docsRes, fuelRes, funcRes] = await Promise.all([
        api.get('vehiculos/tipos-documento/'),
        api.get('vehiculos/tipos-combustible/'),
        api.get('funcionarios/', { params: { activos: true, page_size: 1000 } }),
      ])
      setTiposDoc(docsRes.data.results || docsRes.data || [])
      setTiposCombustible(fuelRes.data.results || fuelRes.data || [])
      setFuncionarios(funcRes.data.results || funcRes.data || [])
    } catch (error) {
      console.error(error)
    }
  }, [])

  const loadOperativos = useCallback(async () => {
    if (!id) return
    try {
      const [regRes, prevRes, incRes, repRes] = await Promise.all([
        api.get('vehiculos/registros/', { params: { vehiculo: id, page_size: 500 } }),
        api.get('vehiculos/mantenciones-preventivas/', {
          params: { vehiculo: id, page_size: 500 },
        }),
        api.get('vehiculos/incidentes/', { params: { vehiculo: id, page_size: 500 } }),
        api.get('vehiculos/reparaciones/', { params: { vehiculo: id, page_size: 500 } }),
      ])
      setRegistros(regRes.data.results || regRes.data || [])
      setPreventivos(prevRes.data.results || prevRes.data || [])
      setIncidentes(incRes.data.results || incRes.data || [])
      setReparaciones(repRes.data.results || repRes.data || [])
    } catch (error) {
      console.error(error)
      notify({ variant: 'danger', text: 'Error al cargar datos operativos' })
    }
  }, [id, notify])

  useEffect(() => {
    loadVehiculo()
    loadLookups()
    loadOperativos()
    loadEmisiones()
  }, [loadVehiculo, loadLookups, loadOperativos, loadEmisiones])

  const conductorOptions = useMemo(() => {
    const byId = new Map()
    ;(vehiculo?.conductores_detalle || []).forEach((c) => {
      byId.set(c.id, {
        value: c.id,
        label: c.rut ? `${c.nombre_funcionario} (${c.rut})` : c.nombre_funcionario,
      })
    })
    funcionarios.forEach((f) => {
      byId.set(f.id, {
        value: f.id,
        label: f.rut ? `${f.nombre_funcionario} (${f.rut})` : f.nombre_funcionario,
      })
    })
    return Array.from(byId.values()).sort((a, b) =>
      String(a.label).localeCompare(String(b.label), 'es'),
    )
  }, [funcionarios, vehiculo?.conductores_detalle])

  const conductorRows = useMemo(() => {
    const detalleById = new Map(
      (vehiculo?.conductores_detalle || []).map((c) => [String(c.id), c]),
    )
    const funcById = new Map(funcionarios.map((f) => [String(f.id), f]))
    return conductorIds.map((rawId) => {
      const id = String(rawId)
      const det = detalleById.get(id)
      const func = funcById.get(id)
      return {
        id: Number(rawId) || rawId,
        nombre: det?.nombre_funcionario || func?.nombre_funcionario || '—',
        rut: det?.rut || func?.rut || '',
        subdireccion:
          det?.subdireccion_nombre || func?.subdireccion_nombre || '',
        fecha_asignacion: det?.fecha_asignacion || null,
      }
    })
  }, [conductorIds, funcionarios, vehiculo?.conductores_detalle])

  const availableConductorOptions = useMemo(() => {
    const taken = new Set(conductorIds.map((id) => String(id)))
    return conductorOptions.filter((opt) => !taken.has(String(opt.value)))
  }, [conductorOptions, conductorIds])

  const addConductor = () => {
    if (!pendingConductorId) return
    const id = Number(pendingConductorId)
    if (!Number.isFinite(id)) return
    if (conductorIds.some((x) => String(x) === String(id))) {
      setPendingConductorId('')
      return
    }
    setConductorIds((prev) => [...prev, id])
    setPendingConductorId('')
  }

  const removeConductor = (id) => {
    setConductorIds((prev) => prev.filter((x) => String(x) !== String(id)))
  }

  const docRows = useMemo(
    () =>
      (documentos || []).map((doc) => {
        const tipo =
          tiposDoc.find((t) => t.id === doc.tipo) || {
            id: doc.tipo,
            nombre: doc.tipo_nombre || 'Documento',
          }
        return {
          id: doc.id,
          tipo,
          doc,
          status: getStatusVencimiento(doc.fecha_vencimiento),
        }
      }),
    [documentos, tiposDoc],
  )

  const handleVehiculoChange = (e) => {
    const { name, value } = e.target
    setEditingVehiculo((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setNewImage(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result)
    reader.readAsDataURL(file)
  }

  const handleUpdateVehiculo = async (e) => {
    e?.preventDefault?.()
    if (!vehiculo) return
    const formData = new FormData()
    Object.keys(editingVehiculo).forEach((key) => {
      if (SKIP_FORM_KEYS.has(key)) return
      const val = editingVehiculo[key]
      if (val === null || val === undefined) return
      if (DATE_FIELDS.has(key) && String(val).trim() === '') return
      formData.append(key, val)
    })
    formData.append('conductores', JSON.stringify(conductorIds.map(Number)))
    if (newImage) formData.append('imagen', newImage)

    try {
      await updateOverlay.run(
        async () => {
          const response = await api.put(`vehiculos/flota/${vehiculo.id}/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          setVehiculo(response.data)
          setEditingVehiculo({ ...response.data })
          setDocumentos(response.data.documentos || [])
          setNewImage(null)
          setImagePreview(response.data.imagen || null)
        },
        {
          successDescription: 'Información del vehículo actualizada.',
          formatError: (err) =>
            formatApiFormError(err, 'Error al actualizar la información.'),
        },
      )
    } catch {
      /* overlay */
    }
  }

  const openUpload = () => {
    uploadOverlay.reset()
    setUploadData({ ...emptyUpload })
    setSelectedTipoForUpload(null)
    setUploadOpen(true)
  }

  const handleFileUpload = async () => {
    if (!uploadData.archivo || !selectedTipoForUpload) {
      notify({ variant: 'danger', text: 'Seleccione tipo y archivo.' })
      return
    }
    const formData = new FormData()
    formData.append('vehiculo', vehiculo.id)
    formData.append('tipo', selectedTipoForUpload.id)
    formData.append('archivo', uploadData.archivo)
    ;['numero_referencia', 'institucion', 'fecha_documento', 'fecha_vencimiento', 'observaciones', 'dias_aviso'].forEach(
      (key) => {
        if (uploadData[key]) formData.append(key, uploadData[key])
      },
    )
    try {
      await uploadOverlay.run(
        async () => {
          const response = await api.post('vehiculos/documentos/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          setDocumentos((prev) => [...prev, response.data])
        },
        {
          successDescription: 'Documento subido.',
          formatError: (err) => formatApiFormError(err, 'Error al subir documento.'),
        },
      )
    } catch {
      /* overlay */
    }
  }

  const handleUploadOverlayDismiss = () => {
    if (uploadOverlay.status === 'success') {
      uploadOverlay.reset()
      setUploadOpen(false)
      setUploadData({ ...emptyUpload })
      setSelectedTipoForUpload(null)
      return
    }
    uploadOverlay.dismiss()
  }

  const handleCrudOverlayDismiss = (closeFn) => {
    if (crudOverlay.status === 'success') {
      crudOverlay.reset()
      closeFn()
      loadOperativos()
      return
    }
    crudOverlay.dismiss()
  }

  const confirmDeleteDocument = async () => {
    if (!pendingDeleteDocId) return
    try {
      await api.delete(`vehiculos/documentos/${pendingDeleteDocId}/`)
      setDocumentos((prev) => prev.filter((d) => d.id !== pendingDeleteDocId))
      setPendingDeleteDocId(null)
      notify({ variant: 'success', text: 'Documento eliminado.' })
    } catch (err) {
      notify({
        variant: 'danger',
        text: formatApiFormError(err) || 'No se pudo eliminar',
      })
    }
  }

  const openFuel = (row = null) => {
    crudOverlay.reset()
    setFuelEditing(row)
    if (row) {
      setFuelForm({
        anio: row.anio,
        mes: row.mes,
        km_inicial: row.km_inicial ?? '',
        km_final: row.km_final ?? '',
        litros: row.litros ?? '',
        gasto_bencina: row.gasto_bencina ?? '',
        gasto_peajes: row.gasto_peajes ?? '',
        gasto_seguros: row.gasto_seguros ?? '',
      })
    } else {
      setFuelForm({ ...emptyFuel })
    }
    setFuelOpen(true)
  }

  const saveFuel = async () => {
    const kmIni =
      fuelForm.km_inicial === '' ? null : Number(fuelForm.km_inicial)
    const kmFin = fuelForm.km_final === '' ? null : Number(fuelForm.km_final)
    let km = fuelEditing?.kilometros_recorridos ?? 0
    if (kmIni != null && kmFin != null) km = Math.max(0, kmFin - kmIni)
    const payload = {
      vehiculo: Number(id),
      anio: Number(fuelForm.anio),
      mes: Number(fuelForm.mes),
      km_inicial: kmIni,
      km_final: kmFin,
      litros: fuelForm.litros === '' ? null : fuelForm.litros,
      kilometros_recorridos: km,
      gasto_bencina: fuelForm.gasto_bencina === '' ? 0 : Number(fuelForm.gasto_bencina),
      gasto_peajes: fuelForm.gasto_peajes === '' ? 0 : Number(fuelForm.gasto_peajes),
      gasto_seguros: fuelForm.gasto_seguros === '' ? 0 : Number(fuelForm.gasto_seguros),
      unidad_monetaria: 'Pesos',
    }
    try {
      await crudOverlay.run(
        async () => {
          if (fuelEditing) {
            await api.put(`vehiculos/registros/${fuelEditing.id}/`, payload)
          } else {
            await api.post('vehiculos/registros/', payload)
          }
        },
        {
          successDescription: fuelEditing ? 'Registro actualizado.' : 'Registro creado.',
          formatError: (err) =>
            formatApiFormError(err, 'No se pudo guardar el registro mensual.'),
        },
      )
    } catch {
      /* overlay */
    }
  }

  const openPrev = (row = null) => {
    crudOverlay.reset()
    setPrevEditing(row)
    setPrevForm(
      row
        ? {
            fecha: (row.fecha || '').slice(0, 10),
            kilometraje: row.kilometraje ?? '',
            cambio_aceite: Boolean(row.cambio_aceite),
            cambio_filtro_aceite: Boolean(row.cambio_filtro_aceite),
            cambio_liquido_frenos: Boolean(row.cambio_liquido_frenos),
            observaciones: row.observaciones || '',
          }
        : { ...emptyPrev },
    )
    setPrevOpen(true)
  }

  const savePrev = async () => {
    const payload = {
      vehiculo: Number(id),
      fecha: prevForm.fecha,
      kilometraje: prevForm.kilometraje === '' ? 0 : Number(prevForm.kilometraje),
      cambio_aceite: prevForm.cambio_aceite,
      cambio_filtro_aceite: prevForm.cambio_filtro_aceite,
      cambio_liquido_frenos: prevForm.cambio_liquido_frenos,
      observaciones: prevForm.observaciones || '',
    }
    try {
      await crudOverlay.run(
        async () => {
          if (prevEditing) {
            await api.put(
              `vehiculos/mantenciones-preventivas/${prevEditing.id}/`,
              payload,
            )
          } else {
            await api.post('vehiculos/mantenciones-preventivas/', payload)
          }
        },
        {
          successDescription: 'Mantención preventiva guardada.',
          formatError: (err) => formatApiFormError(err, 'No se pudo guardar.'),
        },
      )
    } catch {
      /* overlay */
    }
  }

  const openInc = (row = null) => {
    crudOverlay.reset()
    setIncEditing(row)
    setIncForm(
      row
        ? {
            fecha: (row.fecha || '').slice(0, 10),
            hora: row.hora ? String(row.hora).slice(0, 5) : '',
            tipo_accidente: row.tipo_accidente || '',
            funcionario: row.funcionario || '',
            costo_reparacion: row.costo_reparacion ?? '',
            observaciones: row.observaciones || '',
          }
        : { ...emptyInc },
    )
    setIncOpen(true)
  }

  const saveInc = async () => {
    const payload = {
      vehiculo: Number(id),
      fecha: incForm.fecha,
      hora: incForm.hora || null,
      tipo_accidente: incForm.tipo_accidente,
      funcionario: incForm.funcionario ? Number(incForm.funcionario) : null,
      costo_reparacion:
        incForm.costo_reparacion === '' ? 0 : Number(incForm.costo_reparacion),
      observaciones: incForm.observaciones || '',
    }
    try {
      await crudOverlay.run(
        async () => {
          if (incEditing) {
            await api.put(`vehiculos/incidentes/${incEditing.id}/`, payload)
          } else {
            await api.post('vehiculos/incidentes/', payload)
          }
        },
        {
          successDescription: 'Incidente guardado.',
          formatError: (err) => formatApiFormError(err, 'No se pudo guardar.'),
        },
      )
    } catch {
      /* overlay */
    }
  }

  const openRep = (row = null) => {
    crudOverlay.reset()
    setRepEditing(row)
    setRepForm(
      row
        ? {
            fecha: (row.fecha || '').slice(0, 10),
            kilometraje: row.kilometraje ?? '',
            tipo_mantenimiento: row.tipo_mantenimiento || 'CORRECTIVO',
            descripcion: row.descripcion || '',
            costo: row.costo ?? '',
            observaciones: row.observaciones || '',
          }
        : { ...emptyRep },
    )
    setRepOpen(true)
  }

  const saveRep = async () => {
    const payload = {
      vehiculo: Number(id),
      fecha: repForm.fecha,
      kilometraje: repForm.kilometraje === '' ? 0 : Number(repForm.kilometraje),
      tipo_mantenimiento: repForm.tipo_mantenimiento,
      descripcion: repForm.descripcion,
      costo: repForm.costo === '' ? 0 : Number(repForm.costo),
      observaciones: repForm.observaciones || '',
    }
    try {
      await crudOverlay.run(
        async () => {
          if (repEditing) {
            await api.put(`vehiculos/reparaciones/${repEditing.id}/`, payload)
          } else {
            await api.post('vehiculos/reparaciones/', payload)
          }
        },
        {
          successDescription: 'Reparación guardada.',
          formatError: (err) => formatApiFormError(err, 'No se pudo guardar.'),
        },
      )
    } catch {
      /* overlay */
    }
  }

  const confirmPendingDelete = async () => {
    if (!pendingDelete) return
    const { kind, item } = pendingDelete
    const urls = {
      fuel: `vehiculos/registros/${item.id}/`,
      prev: `vehiculos/mantenciones-preventivas/${item.id}/`,
      inc: `vehiculos/incidentes/${item.id}/`,
      rep: `vehiculos/reparaciones/${item.id}/`,
    }
    try {
      await api.delete(urls[kind])
      setPendingDelete(null)
      await loadOperativos()
      notify({ variant: 'success', text: 'Registro eliminado.' })
    } catch (err) {
      notify({
        variant: 'danger',
        text: formatApiFormError(err) || 'No se pudo eliminar',
      })
    }
  }

  const docColumns = useMemo(
    () => [
      {
        key: 'tipo',
        header: 'Tipo',
        className: 'col--primary',
        render: (row) => row.tipo?.nombre || row.doc?.tipo_nombre || '—',
      },
      {
        key: 'numero',
        header: 'Nº / póliza',
        render: (row) => row.doc?.numero_referencia || '—',
      },
      {
        key: 'institucion',
        header: 'Institución',
        tabletHide: true,
        render: (row) => row.doc?.institucion || '—',
      },
      {
        key: 'fecha_doc',
        header: 'Emisión',
        tabletHide: true,
        render: (row) => formatDateCL(row.doc?.fecha_documento),
      },
      {
        key: 'estado',
        header: 'Estado',
        className: 'col--status',
        render: (row) => (
          <Badge variant={row.status.variant}>{row.status.label}</Badge>
        ),
      },
      {
        key: 'vencimiento',
        header: 'Vencimiento',
        render: (row) => formatDateCL(row.doc?.fecha_vencimiento),
      },
      {
        key: 'acciones',
        header: 'Acciones',
        className: 'col--actions',
        render: (row) => (
          <div className="data-table__actions">
            <Button
              size="sm"
              variant="ghost"
              title="Ver"
              onClick={() =>
                window.open(row.doc.archivo, '_blank', 'noopener,noreferrer')
              }
            >
              <Icon name="eye" size="sm" />
            </Button>
            {canDelete ? (
              <Button
                size="sm"
                variant="ghost"
                title="Eliminar"
                onClick={() => setPendingDeleteDocId(row.doc.id)}
              >
                <Icon name="trash" size="sm" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canDelete],
  )

  const fuelColumns = useMemo(
    () => [
      {
        key: 'periodo',
        header: 'Periodo',
        className: 'col--primary',
        render: (row) => `${row.mes_nombre || row.mes}/${row.anio}`,
      },
      {
        key: 'km_ini',
        header: 'Km inicio',
        render: (row) => (row.km_inicial != null ? row.km_inicial : '—'),
      },
      {
        key: 'km_fin',
        header: 'Km fin',
        render: (row) => (row.km_final != null ? row.km_final : '—'),
      },
      {
        key: 'km',
        header: 'Km recorridos',
        render: (row) => row.kilometros_recorridos ?? 0,
      },
      {
        key: 'litros',
        header: 'Litros',
        render: (row) => (row.litros != null ? row.litros : '—'),
      },
      {
        key: 'rend',
        header: 'Rendimiento',
        render: (row) =>
          row.rendimiento != null ? `${row.rendimiento} km/L` : '—',
      },
      {
        key: 'bencina',
        header: 'Gasto bencina',
        render: (row) => formatMoney(row.gasto_bencina),
      },
      {
        key: 'acciones',
        header: 'Acciones',
        className: 'col--actions',
        render: (row) => (
          <div className="data-table__actions">
            {canChange ? (
              <Button size="sm" variant="secondary" onClick={() => openFuel(row)}>
                Editar
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                size="sm"
                variant="danger"
                onClick={() => setPendingDelete({ kind: 'fuel', item: row })}
              >
                Eliminar
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canChange, canDelete],
  )

  const prevColumns = useMemo(
    () => [
      {
        key: 'fecha',
        header: 'Fecha',
        className: 'col--primary',
        render: (row) => formatDateCL(row.fecha),
      },
      { key: 'km', header: 'Kilometraje', render: (row) => row.kilometraje ?? 0 },
      {
        key: 'aceite',
        header: 'Aceite',
        render: (row) => (row.cambio_aceite ? 'Sí' : 'No'),
      },
      {
        key: 'filtro',
        header: 'Filtro aceite',
        render: (row) => (row.cambio_filtro_aceite ? 'Sí' : 'No'),
      },
      {
        key: 'frenos',
        header: 'Líq. frenos',
        render: (row) => (row.cambio_liquido_frenos ? 'Sí' : 'No'),
      },
      {
        key: 'obs',
        header: 'Obs.',
        tabletHide: true,
        render: (row) => row.observaciones || '—',
      },
      {
        key: 'acciones',
        header: 'Acciones',
        className: 'col--actions',
        render: (row) => (
          <div className="data-table__actions">
            {canChange ? (
              <Button size="sm" variant="secondary" onClick={() => openPrev(row)}>
                Editar
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                size="sm"
                variant="danger"
                onClick={() => setPendingDelete({ kind: 'prev', item: row })}
              >
                Eliminar
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canChange, canDelete],
  )

  const incColumns = useMemo(
    () => [
      {
        key: 'fecha',
        header: 'Fecha',
        className: 'col--primary',
        render: (row) => formatDateCL(row.fecha),
      },
      {
        key: 'hora',
        header: 'Hora',
        render: (row) => (row.hora ? String(row.hora).slice(0, 5) : '—'),
      },
      { key: 'tipo', header: 'Tipo', render: (row) => row.tipo_accidente || '—' },
      {
        key: 'func',
        header: 'Funcionario',
        render: (row) => row.funcionario_nombre || '—',
      },
      {
        key: 'costo',
        header: 'Costo',
        render: (row) => formatMoney(row.costo_reparacion),
      },
      {
        key: 'obs',
        header: 'Obs.',
        tabletHide: true,
        render: (row) => row.observaciones || '—',
      },
      {
        key: 'acciones',
        header: 'Acciones',
        className: 'col--actions',
        render: (row) => (
          <div className="data-table__actions">
            {canChange ? (
              <Button size="sm" variant="secondary" onClick={() => openInc(row)}>
                Editar
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                size="sm"
                variant="danger"
                onClick={() => setPendingDelete({ kind: 'inc', item: row })}
              >
                Eliminar
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canChange, canDelete],
  )

  const repColumns = useMemo(
    () => [
      {
        key: 'fecha',
        header: 'Fecha',
        className: 'col--primary',
        render: (row) => formatDateCL(row.fecha),
      },
      { key: 'km', header: 'Kilometraje', render: (row) => row.kilometraje ?? 0 },
      {
        key: 'tipo',
        header: 'Tipo',
        render: (row) => row.tipo_mantenimiento_display || row.tipo_mantenimiento,
      },
      {
        key: 'desc',
        header: 'Descripción',
        render: (row) => row.descripcion || '—',
      },
      { key: 'costo', header: 'Costo', render: (row) => formatMoney(row.costo) },
      {
        key: 'obs',
        header: 'Obs.',
        tabletHide: true,
        render: (row) => row.observaciones || '—',
      },
      {
        key: 'acciones',
        header: 'Acciones',
        className: 'col--actions',
        render: (row) => (
          <div className="data-table__actions">
            {canChange ? (
              <Button size="sm" variant="secondary" onClick={() => openRep(row)}>
                Editar
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                size="sm"
                variant="danger"
                onClick={() => setPendingDelete({ kind: 'rep', item: row })}
              >
                Eliminar
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canChange, canDelete],
  )

  const conductorColumns = useMemo(
    () => [
      {
        key: 'nombre',
        header: 'Nombre',
        className: 'col--primary',
        render: (row) => row.nombre || '—',
      },
      {
        key: 'rut',
        header: 'RUT',
        render: (row) => row.rut || '—',
      },
      {
        key: 'subdireccion',
        header: 'Subdirección',
        tabletHide: true,
        render: (row) => row.subdireccion || '—',
      },
      {
        key: 'fecha_asignacion',
        header: 'Asignación',
        render: (row) =>
          row.fecha_asignacion ? formatDateCL(row.fecha_asignacion) : 'Pendiente de guardar',
      },
      {
        key: 'acciones',
        header: 'Acciones',
        className: 'col--actions',
        render: (row) =>
          canChange ? (
            <div className="data-table__actions">
              <Button
                size="sm"
                variant="danger"
                onClick={() => removeConductor(row.id)}
                title="Quitar conductor"
              >
                Quitar
              </Button>
            </div>
          ) : null,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canChange],
  )

  const actasColumns = useMemo(
    () => [
      {
        key: 'folio',
        header: 'Nº solicitud',
        className: 'col--primary',
        render: (row) => row.folio || '—',
      },
      {
        key: 'emitido_en',
        header: 'Emitida',
        render: (row) => formatDateTimeCL(row.emitido_en),
      },
      {
        key: 'solicitante',
        header: 'Funcionario solicitante',
        render: (row) => {
          const nombre = row.solicitante_nombre || '—'
          return row.solicitante_rut ? `${nombre} (${row.solicitante_rut})` : nombre
        },
      },
      {
        key: 'emitido_por',
        header: 'Emitida por',
        tabletHide: true,
        render: (row) => row.emitido_por_nombre || '—',
      },
      {
        key: 'acciones',
        header: 'Acciones',
        className: 'col--actions',
        render: (row) => (
          <div className="data-table__actions">
            <Button
              size="sm"
              variant="secondary"
              loading={pdfBusy === `acta-dl-${row.id}`}
              disabled={!!pdfBusy}
              onClick={() =>
                downloadVehiculoPdf('acta', {
                  emisionId: row.id,
                  folioHint: row.folio,
                  meta: row.meta || {},
                })
              }
              title="Descargar el PDF guardado de esta emisión"
            >
              <Icon name="download" size="sm" /> Descargar
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pdfBusy],
  )

  if (loading || !vehiculo) {
    return (
      <div className="page">
        <PageHeader
          icon="car"
          title="Cargando vehículo…"
          breadcrumbs={[
            { label: 'Inicio', to: '/' },
            { label: 'Vehículos', to: '/vehiculos' },
            { label: 'Flota', to: '/vehiculos/flota' },
          ]}
          linkComponent={Link}
        />
      </div>
    )
  }

  const title = `${vehiculo.marca} ${vehiculo.modelo}`

  return (
    <div className="page" data-od-id="vehiculo-ficha-page" data-fill-viewport>
      <PageHeader
        icon="car"
        title={title}
        description={`PPU ${vehiculo.patente}`}
        className="page-header--compact"
        breadcrumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Vehículos', to: '/vehiculos' },
          { label: 'Flota', to: '/vehiculos/flota' },
          { label: vehiculo.patente },
        ]}
        linkComponent={Link}
        split
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => navigate('/vehiculos/flota')}>
              Volver a flota
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadVehiculoPdf('hoja')}
              loading={pdfBusy === 'hoja'}
              disabled={!!pdfBusy}
            >
              <Icon name="download" size="sm" /> Hoja de vida
            </Button>
            {activeTab === 'info' && canChange ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleUpdateVehiculo}
                loading={updateOverlay.busy}
                disabled={updateOverlay.busy || updateOverlay.active}
              >
                Guardar cambios
              </Button>
            ) : null}
          </>
        }
      />

      <div className="vehiculos-detalle">
        <div className="vehiculos-detalle__meta">
          <Badge variant="accent">{vehiculo.patente}</Badge>
          {vehiculo.tipo_vehiculo ? (
            <Badge variant="neutral">{vehiculo.tipo_vehiculo}</Badge>
          ) : null}
          {vehiculo.tipo_combustible ? (
            <Badge variant="neutral">{vehiculo.tipo_combustible}</Badge>
          ) : null}
          {vehiculo.ultima_solicitud_folio ? (
            <Badge variant="neutral" title="Último Nº de solicitud emitido para este vehículo">
              {vehiculo.ultima_solicitud_folio}
            </Badge>
          ) : null}
          <button
            type="button"
            className="vehiculos-detalle__meta-link"
            onClick={() => setActiveTab('docs')}
          >
            <Badge variant="neutral">{documentos.length} documentos</Badge>
          </button>
        </div>

        <div className="tabs vehiculos-detalle__tabs">
          <ul className="tabs__list" role="tablist" aria-label="Secciones del vehículo">
            {TABS.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  role="tab"
                  className={`tabs__btn${activeTab === t.id ? ' is-active' : ''}`}
                  aria-selected={activeTab === t.id}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                  {t.id === 'docs' ? ` (${documentos.length})` : ''}
                  {t.id === 'actas' ? ` (${emisiones.length})` : ''}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div
          className={`tabs__panel is-active vehiculos-ficha__panel${
            activeTab === 'info'
              ? ' vehiculos-ficha__panel--form'
              : ' vehiculos-ficha__panel--table'
          }`}
          role="tabpanel"
        >
      {activeTab === 'info' ? (
        <FormOverlay
          className="form-overlay-host--inline"
          status={updateOverlay.status}
          title={updateOverlay.title}
          description={updateOverlay.description}
          onDismiss={updateOverlay.dismiss}
        >
          <form
            onSubmit={handleUpdateVehiculo}
            className="crud-form vehiculos-ficha__form"
          >
            <div className="vehiculos-ficha__layout">
              <aside className="vehiculos-ficha__photo">
                <div className="vehiculos-detalle__photo-preview">
                  {imagePreview ? (
                    <img src={imagePreview} alt={title} />
                  ) : (
                    <div className="vehiculos-detalle__photo-empty">
                      <Icon name="car" size={40} />
                      <span>Sin fotografía</span>
                    </div>
                  )}
                </div>
                <div className="vehiculos-ficha__photo-meta">
                  <Badge variant="accent">{vehiculo.patente}</Badge>
                  {editingVehiculo.tipo_vehiculo ? (
                    <Badge variant="neutral">{editingVehiculo.tipo_vehiculo}</Badge>
                  ) : null}
                </div>
                {canChange ? (
                  <FileInput
                    id="veh-foto"
                    label="Cambiar foto"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                ) : null}
              </aside>

              <div className="vehiculos-ficha__sections">
                <FormSection title="Datos del vehículo">
                  <Field label="Marca" htmlFor="veh-marca">
                    <Input
                      id="veh-marca"
                      name="marca"
                      value={editingVehiculo.marca || ''}
                      onChange={handleVehiculoChange}
                      disabled={!canChange}
                    />
                  </Field>
                  <Field label="Modelo" htmlFor="veh-modelo">
                    <Input
                      id="veh-modelo"
                      name="modelo"
                      value={editingVehiculo.modelo || ''}
                      onChange={handleVehiculoChange}
                      disabled={!canChange}
                    />
                  </Field>
                  <Field label="Año" htmlFor="veh-anio">
                    <Input
                      id="veh-anio"
                      name="anio"
                      value={editingVehiculo.anio || ''}
                      onChange={handleVehiculoChange}
                      disabled={!canChange}
                    />
                  </Field>
                  <Field label="PPU / Patente" htmlFor="veh-patente">
                    <Input
                      id="veh-patente"
                      name="patente"
                      value={editingVehiculo.patente || ''}
                      onChange={handleVehiculoChange}
                      disabled={!canChange}
                    />
                  </Field>
                  <Field label="Tipo de vehículo" htmlFor="veh-tipo">
                    <Input
                      id="veh-tipo"
                      name="tipo_vehiculo"
                      value={editingVehiculo.tipo_vehiculo || ''}
                      onChange={handleVehiculoChange}
                      disabled={!canChange}
                      placeholder="Ej. Camioneta"
                    />
                  </Field>
                  <Field label="Color" htmlFor="veh-color">
                    <Input
                      id="veh-color"
                      name="color"
                      value={editingVehiculo.color || ''}
                      onChange={handleVehiculoChange}
                      disabled={!canChange}
                    />
                  </Field>
                  <Field label="Tipo combustible" htmlFor="veh-fuel">
                    <Select
                      id="veh-fuel"
                      name="tipo_combustible"
                      value={editingVehiculo.tipo_combustible || ''}
                      onChange={handleVehiculoChange}
                      disabled={!canChange}
                    >
                      <option value="">Seleccionar…</option>
                      {tiposCombustible.map((c) => (
                        <option key={c.id} value={c.nombre}>{c.nombre}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Cilindrada" htmlFor="veh-cilindrada">
                    <Input
                      id="veh-cilindrada"
                      name="cilindrada"
                      value={editingVehiculo.cilindrada || ''}
                      onChange={handleVehiculoChange}
                      disabled={!canChange}
                    />
                  </Field>
                  <Field label="Nº chasis" htmlFor="veh-chasis">
                    <Input
                      id="veh-chasis"
                      name="nro_chasis"
                      value={editingVehiculo.nro_chasis || ''}
                      onChange={handleVehiculoChange}
                      disabled={!canChange}
                    />
                  </Field>
                  <Field label="Nº motor" htmlFor="veh-motor">
                    <Input
                      id="veh-motor"
                      name="nro_motor"
                      value={editingVehiculo.nro_motor || ''}
                      onChange={handleVehiculoChange}
                      disabled={!canChange}
                    />
                  </Field>
                  <Field label="Fecha de adquisición" htmlFor="veh-adq">
                    <Input
                      id="veh-adq"
                      type="date"
                      name="fecha_adquisicion"
                      value={(editingVehiculo.fecha_adquisicion || '').slice(0, 10)}
                      onChange={handleVehiculoChange}
                      disabled={!canChange}
                    />
                  </Field>
                  <Field label="Fecha de inscripción" htmlFor="veh-insc">
                    <Input
                      id="veh-insc"
                      type="date"
                      name="fecha_inscripcion"
                      value={(editingVehiculo.fecha_inscripcion || '').slice(0, 10)}
                      onChange={handleVehiculoChange}
                      disabled={!canChange}
                    />
                  </Field>
                  <Field
                    label="Lugar de estacionamiento"
                    htmlFor="veh-est"
                    className="field--full"
                  >
                    <Input
                      id="veh-est"
                      name="lugar_estacionamiento"
                      value={editingVehiculo.lugar_estacionamiento || ''}
                      onChange={handleVehiculoChange}
                      disabled={!canChange}
                    />
                  </Field>
                </FormSection>

                <FormSection title="Conductores asignados" asGrid={false}>
                  <div className="vehiculos-ficha__conductores">
                    {canChange ? (
                      <div className="vehiculos-ficha__conductores-add">
                        <SearchableSelect
                          label="Agregar conductor"
                          placeholder="Buscar funcionario…"
                          options={availableConductorOptions}
                          value={pendingConductorId}
                          onChange={setPendingConductorId}
                          disabled={!canChange || availableConductorOptions.length === 0}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={addConductor}
                          disabled={!pendingConductorId}
                        >
                          <Icon name="plus" size="sm" /> Agregar
                        </Button>
                      </div>
                    ) : null}
                    {conductorRows.length === 0 ? (
                      <EmptyState
                        title="Sin conductores"
                        description="Agregue funcionarios habilitados para este vehículo."
                      />
                    ) : (
                      <div className="vehiculos-ficha__conductores-table">
                        <DataTable
                          columns={conductorColumns}
                          rows={conductorRows}
                          emptyTitle="Sin conductores"
                          fillViewport={false}
                        />
                      </div>
                    )}
                  </div>
                </FormSection>
              </div>
            </div>
          </form>
        </FormOverlay>
      ) : null}

      {activeTab === 'docs' ? (
        <DataTable
          columns={docColumns}
          rows={docRows}
          emptyTitle="Sin documentos"
          emptyDescription="Aún no hay documentos cargados para este vehículo."
          emptyAction={
            canAdd && tiposDoc.length > 0 ? (
              <Button variant="primary" onClick={openUpload}>
                <Icon name="plus" size="sm" /> Nuevo documento
              </Button>
            ) : null
          }
          toolbar={
            <>
              <div className="table-toolbar__left">
                <span className="table-toolbar__title">Documentos</span>
                <Badge variant="neutral">{documentos.length}</Badge>
              </div>
              {canAdd ? (
                <div className="table-toolbar__right">
                  <Button variant="primary" size="sm" onClick={openUpload} disabled={!tiposDoc.length}>
                    <Icon name="plus" size="sm" /> Nuevo documento
                  </Button>
                </div>
              ) : null}
            </>
          }
        />
      ) : null}

      {activeTab === 'actas' ? (
        <DataTable
          columns={actasColumns}
          rows={emisiones}
          emptyTitle="Sin actas emitidas"
          emptyDescription="Al emitir un acta se guarda el PDF aquí para redescargarlo."
          emptyAction={
            <Button variant="primary" onClick={() => openActaModal('emitir')} disabled={!!pdfBusy}>
              <Icon name="file" size="sm" /> Emitir acta
            </Button>
          }
          toolbar={
            <>
              <div className="table-toolbar__left">
                <span className="table-toolbar__title">Actas emitidas</span>
                <Badge variant="neutral">{emisiones.length}</Badge>
              </div>
              <div className="table-toolbar__right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openActaModal('preview')}
                  loading={pdfBusy === 'acta-preview'}
                  disabled={!!pdfBusy}
                  title="Vista previa sin asignar Nº de solicitud"
                >
                  <Icon name="download" size="sm" /> Vista previa
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => openActaModal('emitir')}
                  loading={pdfBusy === 'acta-emitir'}
                  disabled={!!pdfBusy}
                >
                  <Icon name="file" size="sm" /> Emitir acta
                </Button>
              </div>
            </>
          }
        />
      ) : null}

      {activeTab === 'fuel' ? (
        <DataTable
          columns={fuelColumns}
          rows={registros}
          emptyTitle="Sin registros de combustible"
          emptyDescription="Crea el primer registro mensual de este vehículo."
          emptyAction={
            canAdd ? (
              <Button variant="primary" onClick={() => openFuel()}>
                <Icon name="plus" size="sm" /> Nuevo registro
              </Button>
            ) : null
          }
          toolbar={
            <>
              <div className="table-toolbar__left">
                <span className="table-toolbar__title">Combustible mensual</span>
                <Badge variant="neutral">{registros.length}</Badge>
              </div>
              {canAdd ? (
                <div className="table-toolbar__right">
                  <Button variant="primary" size="sm" onClick={() => openFuel()}>
                    <Icon name="plus" size="sm" /> Nuevo registro
                  </Button>
                </div>
              ) : null}
            </>
          }
        />
      ) : null}

      {activeTab === 'prev' ? (
        <DataTable
          columns={prevColumns}
          rows={preventivos}
          emptyTitle="Sin mantenciones preventivas"
          emptyDescription="Registra controles preventivos de este vehículo."
          emptyAction={
            canAdd ? (
              <Button variant="primary" onClick={() => openPrev()}>
                <Icon name="plus" size="sm" /> Nuevo control
              </Button>
            ) : null
          }
          toolbar={
            <>
              <div className="table-toolbar__left">
                <span className="table-toolbar__title">Mantención preventiva</span>
                <Badge variant="neutral">{preventivos.length}</Badge>
              </div>
              {canAdd ? (
                <div className="table-toolbar__right">
                  <Button variant="primary" size="sm" onClick={() => openPrev()}>
                    <Icon name="plus" size="sm" /> Nuevo control
                  </Button>
                </div>
              ) : null}
            </>
          }
        />
      ) : null}

      {activeTab === 'inc' ? (
        <DataTable
          columns={incColumns}
          rows={incidentes}
          emptyTitle="Sin incidentes"
          emptyDescription="No hay accidentes ni incidentes registrados."
          emptyAction={
            canAdd ? (
              <Button variant="primary" onClick={() => openInc()}>
                <Icon name="plus" size="sm" /> Nuevo incidente
              </Button>
            ) : null
          }
          toolbar={
            <>
              <div className="table-toolbar__left">
                <span className="table-toolbar__title">Incidentes y accidentes</span>
                <Badge variant="neutral">{incidentes.length}</Badge>
              </div>
              {canAdd ? (
                <div className="table-toolbar__right">
                  <Button variant="primary" size="sm" onClick={() => openInc()}>
                    <Icon name="plus" size="sm" /> Nuevo incidente
                  </Button>
                </div>
              ) : null}
            </>
          }
        />
      ) : null}

      {activeTab === 'rep' ? (
        <DataTable
          columns={repColumns}
          rows={reparaciones}
          emptyTitle="Sin reparaciones"
          emptyDescription="Registra mantenimientos correctivos o preventivos."
          emptyAction={
            canAdd ? (
              <Button variant="primary" onClick={() => openRep()}>
                <Icon name="plus" size="sm" /> Nueva reparación
              </Button>
            ) : null
          }
          toolbar={
            <>
              <div className="table-toolbar__left">
                <span className="table-toolbar__title">Reparaciones y mantenimientos</span>
                <Badge variant="neutral">{reparaciones.length}</Badge>
              </div>
              {canAdd ? (
                <div className="table-toolbar__right">
                  <Button variant="primary" size="sm" onClick={() => openRep()}>
                    <Icon name="plus" size="sm" /> Nueva reparación
                  </Button>
                </div>
              ) : null}
            </>
          }
        />
      ) : null}
        </div>
      </div>

      {/* Upload documento */}
      <Modal
        open={uploadOpen}
        onClose={() => !uploadOverlay.busy && setUploadOpen(false)}
        title="Nuevo documento"
        {...uploadOverlay.modalProps}
        onOverlayDismiss={handleUploadOverlayDismiss}
        footer={
          <>
            <Button variant="quiet" onClick={() => setUploadOpen(false)} disabled={uploadOverlay.busy}>Cancelar</Button>
            <Button variant="primary" onClick={handleFileUpload} loading={uploadOverlay.busy} disabled={!selectedTipoForUpload || !uploadData.archivo || uploadOverlay.busy}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <Field label="Tipo" htmlFor="doc-tipo" required className="field--full">
            <Select id="doc-tipo" value={selectedTipoForUpload?.id || ''} onChange={(e) => setSelectedTipoForUpload(tiposDoc.find((t) => String(t.id) === e.target.value) || null)}>
              <option value="">Seleccionar…</option>
              {tiposDoc.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </Select>
          </Field>
          <Field label="Nº documento / póliza" htmlFor="doc-num">
            <Input id="doc-num" value={uploadData.numero_referencia} onChange={(e) => setUploadData({ ...uploadData, numero_referencia: e.target.value })} />
          </Field>
          <Field label="Institución" htmlFor="doc-inst">
            <Input id="doc-inst" value={uploadData.institucion} onChange={(e) => setUploadData({ ...uploadData, institucion: e.target.value })} />
          </Field>
          <Field label="Emisión" htmlFor="doc-fd">
            <Input id="doc-fd" type="date" value={uploadData.fecha_documento} onChange={(e) => setUploadData({ ...uploadData, fecha_documento: e.target.value })} />
          </Field>
          <Field label="Vencimiento" htmlFor="doc-fv">
            <Input id="doc-fv" type="date" value={uploadData.fecha_vencimiento} onChange={(e) => setUploadData({ ...uploadData, fecha_vencimiento: e.target.value })} />
          </Field>
          <Field label="Observaciones" htmlFor="doc-obs" className="field--full">
            <Textarea id="doc-obs" rows={2} value={uploadData.observaciones} onChange={(e) => setUploadData({ ...uploadData, observaciones: e.target.value })} />
          </Field>
          <Field label="Archivo" htmlFor="doc-file" required className="field--full">
            <FileInput id="doc-file" label={uploadData.archivo?.name || 'Seleccionar archivo'} onChange={(e) => setUploadData({ ...uploadData, archivo: e.target.files?.[0] || null })} />
          </Field>
        </div>
      </Modal>

      {/* Combustible */}
      <Modal
        open={fuelOpen}
        onClose={() => !crudOverlay.busy && setFuelOpen(false)}
        title={fuelEditing ? 'Editar registro mensual' : 'Nuevo registro mensual'}
        {...crudOverlay.modalProps}
        onOverlayDismiss={() =>
          handleCrudOverlayDismiss(() => {
            setFuelOpen(false)
            setFuelEditing(null)
          })
        }
        footer={
          <>
            <Button variant="quiet" onClick={() => setFuelOpen(false)} disabled={crudOverlay.busy}>Cancelar</Button>
            <Button variant="primary" onClick={saveFuel} loading={crudOverlay.busy}>Guardar</Button>
          </>
        }
      >
        <div className="form-grid">
          <Field label="Año" htmlFor="fuel-anio">
            <Select id="fuel-anio" value={fuelForm.anio} onChange={(e) => setFuelForm({ ...fuelForm, anio: e.target.value })}>
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Select>
          </Field>
          <Field label="Mes" htmlFor="fuel-mes">
            <Select id="fuel-mes" value={fuelForm.mes} onChange={(e) => setFuelForm({ ...fuelForm, mes: e.target.value })}>
              {MESES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Km inicial" htmlFor="fuel-kmi">
            <Input id="fuel-kmi" inputMode="numeric" value={fuelForm.km_inicial} onChange={(e) => setFuelForm({ ...fuelForm, km_inicial: e.target.value })} />
          </Field>
          <Field label="Km final" htmlFor="fuel-kmf">
            <Input id="fuel-kmf" inputMode="numeric" value={fuelForm.km_final} onChange={(e) => setFuelForm({ ...fuelForm, km_final: e.target.value })} />
          </Field>
          <Field label="Litros cargados" htmlFor="fuel-lit">
            <Input id="fuel-lit" inputMode="decimal" value={fuelForm.litros} onChange={(e) => setFuelForm({ ...fuelForm, litros: e.target.value })} />
          </Field>
          <Field label="Gasto bencina" htmlFor="fuel-ben">
            <Input id="fuel-ben" inputMode="numeric" value={fuelForm.gasto_bencina} onChange={(e) => setFuelForm({ ...fuelForm, gasto_bencina: e.target.value })} />
          </Field>
          <Field label="Gasto peajes" htmlFor="fuel-pea">
            <Input id="fuel-pea" inputMode="numeric" value={fuelForm.gasto_peajes} onChange={(e) => setFuelForm({ ...fuelForm, gasto_peajes: e.target.value })} />
          </Field>
          <Field label="Gasto seguros" htmlFor="fuel-seg">
            <Input id="fuel-seg" inputMode="numeric" value={fuelForm.gasto_seguros} onChange={(e) => setFuelForm({ ...fuelForm, gasto_seguros: e.target.value })} />
          </Field>
        </div>
      </Modal>

      {/* Preventivo */}
      <Modal
        open={prevOpen}
        onClose={() => !crudOverlay.busy && setPrevOpen(false)}
        title={prevEditing ? 'Editar control preventivo' : 'Nuevo control preventivo'}
        {...crudOverlay.modalProps}
        onOverlayDismiss={() =>
          handleCrudOverlayDismiss(() => {
            setPrevOpen(false)
            setPrevEditing(null)
          })
        }
        footer={
          <>
            <Button variant="quiet" onClick={() => setPrevOpen(false)} disabled={crudOverlay.busy}>Cancelar</Button>
            <Button variant="primary" onClick={savePrev} loading={crudOverlay.busy} disabled={!prevForm.fecha}>Guardar</Button>
          </>
        }
      >
        <div className="form-grid">
          <Field label="Fecha" htmlFor="prev-fecha" required>
            <Input id="prev-fecha" type="date" value={prevForm.fecha} onChange={(e) => setPrevForm({ ...prevForm, fecha: e.target.value })} />
          </Field>
          <Field label="Kilometraje" htmlFor="prev-km">
            <Input id="prev-km" inputMode="numeric" value={prevForm.kilometraje} onChange={(e) => setPrevForm({ ...prevForm, kilometraje: e.target.value })} />
          </Field>
          <div className="field--full">
            <Switch checked={prevForm.cambio_aceite} onChange={(e) => setPrevForm({ ...prevForm, cambio_aceite: e.target.checked })} label="Cambio de aceite" />
          </div>
          <div className="field--full">
            <Switch checked={prevForm.cambio_filtro_aceite} onChange={(e) => setPrevForm({ ...prevForm, cambio_filtro_aceite: e.target.checked })} label="Cambio filtro de aceite" />
          </div>
          <div className="field--full">
            <Switch checked={prevForm.cambio_liquido_frenos} onChange={(e) => setPrevForm({ ...prevForm, cambio_liquido_frenos: e.target.checked })} label="Cambio líquido de frenos" />
          </div>
          <Field label="Observaciones" htmlFor="prev-obs" className="field--full">
            <Textarea id="prev-obs" rows={2} value={prevForm.observaciones} onChange={(e) => setPrevForm({ ...prevForm, observaciones: e.target.value })} />
          </Field>
        </div>
      </Modal>

      {/* Incidente */}
      <Modal
        open={incOpen}
        onClose={() => !crudOverlay.busy && setIncOpen(false)}
        title={incEditing ? 'Editar incidente' : 'Nuevo incidente'}
        {...crudOverlay.modalProps}
        onOverlayDismiss={() =>
          handleCrudOverlayDismiss(() => {
            setIncOpen(false)
            setIncEditing(null)
          })
        }
        footer={
          <>
            <Button variant="quiet" onClick={() => setIncOpen(false)} disabled={crudOverlay.busy}>Cancelar</Button>
            <Button variant="primary" onClick={saveInc} loading={crudOverlay.busy} disabled={!incForm.fecha || !incForm.tipo_accidente}>Guardar</Button>
          </>
        }
      >
        <div className="form-grid">
          <Field label="Fecha" htmlFor="inc-fecha" required>
            <Input id="inc-fecha" type="date" value={incForm.fecha} onChange={(e) => setIncForm({ ...incForm, fecha: e.target.value })} />
          </Field>
          <Field label="Hora" htmlFor="inc-hora">
            <Input id="inc-hora" type="time" value={incForm.hora} onChange={(e) => setIncForm({ ...incForm, hora: e.target.value })} />
          </Field>
          <Field label="Tipo de accidente" htmlFor="inc-tipo" required className="field--full">
            <Input id="inc-tipo" value={incForm.tipo_accidente} onChange={(e) => setIncForm({ ...incForm, tipo_accidente: e.target.value })} />
          </Field>
          <Field label="Funcionario involucrado" htmlFor="inc-func" className="field--full">
            <Select id="inc-func" value={incForm.funcionario} onChange={(e) => setIncForm({ ...incForm, funcionario: e.target.value })}>
              <option value="">— Ninguno —</option>
              {funcionarios.map((f) => (
                <option key={f.id} value={f.id}>{f.nombre_funcionario}</option>
              ))}
            </Select>
          </Field>
          <Field label="Costo de reparación" htmlFor="inc-costo">
            <Input id="inc-costo" inputMode="numeric" value={incForm.costo_reparacion} onChange={(e) => setIncForm({ ...incForm, costo_reparacion: e.target.value })} />
          </Field>
          <Field label="Observaciones" htmlFor="inc-obs" className="field--full">
            <Textarea id="inc-obs" rows={2} value={incForm.observaciones} onChange={(e) => setIncForm({ ...incForm, observaciones: e.target.value })} />
          </Field>
        </div>
      </Modal>

      {/* Reparación */}
      <Modal
        open={repOpen}
        onClose={() => !crudOverlay.busy && setRepOpen(false)}
        title={repEditing ? 'Editar reparación' : 'Nueva reparación'}
        {...crudOverlay.modalProps}
        onOverlayDismiss={() =>
          handleCrudOverlayDismiss(() => {
            setRepOpen(false)
            setRepEditing(null)
          })
        }
        footer={
          <>
            <Button variant="quiet" onClick={() => setRepOpen(false)} disabled={crudOverlay.busy}>Cancelar</Button>
            <Button variant="primary" onClick={saveRep} loading={crudOverlay.busy} disabled={!repForm.fecha || !repForm.descripcion}>Guardar</Button>
          </>
        }
      >
        <div className="form-grid">
          <Field label="Fecha" htmlFor="rep-fecha" required>
            <Input id="rep-fecha" type="date" value={repForm.fecha} onChange={(e) => setRepForm({ ...repForm, fecha: e.target.value })} />
          </Field>
          <Field label="Kilometraje" htmlFor="rep-km">
            <Input id="rep-km" inputMode="numeric" value={repForm.kilometraje} onChange={(e) => setRepForm({ ...repForm, kilometraje: e.target.value })} />
          </Field>
          <Field label="Tipo de mantenimiento" htmlFor="rep-tipo" className="field--full">
            <Select id="rep-tipo" value={repForm.tipo_mantenimiento} onChange={(e) => setRepForm({ ...repForm, tipo_mantenimiento: e.target.value })}>
              <option value="PREVENTIVO">Preventivo</option>
              <option value="CORRECTIVO">Correctivo</option>
            </Select>
          </Field>
          <Field label="Descripción" htmlFor="rep-desc" required className="field--full">
            <Textarea id="rep-desc" rows={3} value={repForm.descripcion} onChange={(e) => setRepForm({ ...repForm, descripcion: e.target.value })} />
          </Field>
          <Field label="Costo" htmlFor="rep-costo">
            <Input id="rep-costo" inputMode="numeric" value={repForm.costo} onChange={(e) => setRepForm({ ...repForm, costo: e.target.value })} />
          </Field>
          <Field label="Observaciones" htmlFor="rep-obs" className="field--full">
            <Textarea id="rep-obs" rows={2} value={repForm.observaciones} onChange={(e) => setRepForm({ ...repForm, observaciones: e.target.value })} />
          </Field>
        </div>
      </Modal>

      <ConfirmModal
        open={!!pendingDeleteDocId}
        onClose={() => setPendingDeleteDocId(null)}
        onConfirm={confirmDeleteDocument}
        title="Eliminar documento"
        description="¿Eliminar este documento? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
      />

      <ConfirmModal
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmPendingDelete}
        title="Eliminar registro"
        description="¿Eliminar este registro? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
      />

      <Modal
        open={actaModalOpen}
        onClose={() => !pdfBusy && setActaModalOpen(false)}
        title={
          actaModalMode === 'emitir'
            ? 'Emitir acta de entrega'
            : actaModalMode === 'reutilizar'
              ? `Reimprimir ${vehiculo?.ultima_solicitud_folio || 'acta'}`
              : 'Vista previa del acta'
        }
        footer={
          <>
            <Button
              variant="quiet"
              onClick={() => setActaModalOpen(false)}
              disabled={!!pdfBusy}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={confirmActaModal}
              loading={!!pdfBusy && pdfBusy.startsWith('acta')}
              disabled={!!pdfBusy || !actaSolicitanteId}
            >
              {actaModalMode === 'emitir'
                ? 'Emitir y descargar'
                : actaModalMode === 'reutilizar'
                  ? 'Reimprimir PDF'
                  : 'Descargar vista previa'}
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <Field
            label="Funcionario solicitante"
            htmlFor="acta-solicitante"
            required
            className="field--full"
            hint="Quien pide el documento. El resto del acta (ámbito, autorización, etc.) se completa a mano."
          >
            <SearchableSelect
              options={conductorOptions}
              value={actaSolicitanteId}
              onChange={setActaSolicitanteId}
              placeholder="Buscar funcionario…"
            />
          </Field>
          {selectedActaSolicitante ? (
            <>
              <Field label="Nombre" htmlFor="acta-sol-nombre">
                <Input
                  id="acta-sol-nombre"
                  value={selectedActaSolicitante.nombre_funcionario || ''}
                  readOnly
                />
              </Field>
              <Field label="RUT" htmlFor="acta-sol-rut">
                <Input id="acta-sol-rut" value={selectedActaSolicitante.rut || ''} readOnly />
              </Field>
              <Field label="Cargo" htmlFor="acta-sol-cargo">
                <Input
                  id="acta-sol-cargo"
                  value={selectedActaSolicitante.cargo_nombre || '—'}
                  readOnly
                />
              </Field>
              <Field label="Unidad" htmlFor="acta-sol-unidad">
                <Input
                  id="acta-sol-unidad"
                  value={selectedActaSolicitante.unidad_nombre || '—'}
                  readOnly
                />
              </Field>
              <Field label="Departamento" htmlFor="acta-sol-depto" className="field--full">
                <Input
                  id="acta-sol-depto"
                  value={[
                    selectedActaSolicitante.departamento_nombre,
                    selectedActaSolicitante.subdireccion_nombre,
                  ]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                  readOnly
                />
              </Field>
            </>
          ) : null}
          {actaModalMode === 'emitir' ? (
            <Alert variant="info" className="field--full" title="Nº de solicitud">
              Se asignará un correlativo nuevo
              {vehiculo?.ultima_solicitud_folio
                ? ` (el último fue ${vehiculo.ultima_solicitud_folio})`
                : ''}
              . La vista previa no consume número.
            </Alert>
          ) : null}
        </div>
      </Modal>
    </div>
  )
}
