import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useNotify } from '../../hooks/useNotify'
import { usePermission } from '../../hooks/usePermission'
import DocumentViewerModal from '../../components/common/DocumentViewerModal'
import {
  PageHeader,
  FiltersBar,
  DataTable,
  Modal,
  ConfirmModal,
  Field,
  Input,
  Select,
  Textarea,
  Switch,
  Button,
  Badge,
  Icon,
  FileInput,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const EMPTY_FILTERS = {
  q: '',
  proveedor: '',
  establecimiento: '',
  fecha_desde: '',
  fecha_hasta: '',
}

/** Ruta relativa `/media/…` para iframe vía proxy (dev) o mismo origen (prod). */
function previewPath(path) {
  if (!path) return null
  return String(path).replace(/^https?:\/\/[^/]+/, '')
}

/** Fecha ISO → formato chileno (evita desfase UTC). */
function formatDateCL(value) {
  if (!value) return '—'
  const raw = String(value).slice(0, 10)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
  if (!m) {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('es-CL')
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('es-CL')
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function flattenRegistro(reg) {
  return {
    ...reg,
    ...(reg.valores || {}),
  }
}

const SORTABLE_CORE = {
  folio: 'folio',
  fecha_servicio: 'fecha_servicio',
  proveedor: 'proveedor__nombre',
  establecimiento: 'establecimiento__nombre',
}

function formatDateTimeCL(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.toLocaleDateString('es-CL')} ${d.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

/** Correos de envío: institucional + director (sin duplicados). */
function emailsEnvioEstablecimiento(row) {
  if (!row) return []
  const seen = new Set()
  const out = []
  for (const raw of [row.establecimiento_email, row.establecimiento_email_director]) {
    const email = String(raw || '').trim()
    if (!email) continue
    const key = email.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(email)
  }
  return out
}

function buildColumns(
  campos,
  { onEdit, onDelete, onViewFile, onDownload, onSendEmail, canChange, canDelete },
) {
  const active = (campos || []).filter((c) => c.activo).sort((a, b) => a.orden - b.orden)
  const cols = active
    .filter((c) => c.tipo_dato !== 'file')
    .slice(0, 6)
    .map((c) => ({
      key: c.clave,
      header: c.etiqueta,
      sortable: Boolean(SORTABLE_CORE[c.clave]),
      className: c.orden === 0 ? 'col--primary' : undefined,
      cardRole: c.orden === 0 ? 'title' : undefined,
      render: (row) => {
        const flat = flattenRegistro(row)
        if (c.clave === 'proveedor') return row.proveedor_nombre || '—'
        if (c.clave === 'establecimiento') return row.establecimiento_nombre || '—'
        if (c.clave === 'fecha_servicio' || c.tipo_dato === 'date') {
          return formatDateCL(flat[c.clave] ?? flat.fecha_servicio)
        }
        if (c.clave === 'folio') return flat.folio || '—'
        const v = flat[c.clave]
        if (v === true) return 'Sí'
        if (v === false) return 'No'
        return v ?? '—'
      },
    }))

  cols.push({
    key: 'correo',
    header: 'Correo',
    className: 'col--status',
    cardRole: 'status',
    render: (row) =>
      row.correo_enviado_en ? (
        <Badge variant="success" title={formatDateTimeCL(row.correo_enviado_en)}>
          Enviado
        </Badge>
      ) : (
        <Badge variant="neutral">Pendiente</Badge>
      ),
  })

  cols.push({
    key: 'acciones',
    header: 'Acciones',
    className: 'col--actions',
    render: (row) => {
      const hasFile = Boolean(row.archivo || row.archivo_url)
      const destEmails = emailsEnvioEstablecimiento(row)
      const canEmail = canChange && hasFile && destEmails.length > 0
      const yaEnviado = Boolean(row.correo_enviado_en)
      const destLabel = destEmails.join(', ')
      return (
        <div className="data-table__actions">
          {hasFile ? (
            <Button
              size="sm"
              variant="ghost"
              title="Ver"
              onClick={() => onViewFile(row)}
            >
              <Icon name="eye" size="sm" />
            </Button>
          ) : null}
          {hasFile ? (
            <Button
              size="sm"
              variant="ghost"
              title="Descargar"
              onClick={() => onDownload(row)}
            >
              <Icon name="download" size="sm" />
            </Button>
          ) : null}
          {canEmail ? (
            <Button
              size="sm"
              variant={yaEnviado ? 'secondary' : 'ghost'}
              title={
                yaEnviado
                  ? `Reenviar a ${destLabel} (enviado ${formatDateTimeCL(row.correo_enviado_en)})`
                  : `Enviar a ${destLabel}`
              }
              onClick={() => onSendEmail(row)}
            >
              <Icon name="send" size="sm" />
              {yaEnviado ? ' Reenviar' : ''}
            </Button>
          ) : null}
          {canChange ? (
            <Button size="sm" variant="secondary" onClick={() => onEdit(row)}>
              Editar
            </Button>
          ) : null}
          {canDelete ? (
            <Button size="sm" variant="danger" onClick={() => onDelete(row)}>
              Eliminar
            </Button>
          ) : null}
        </div>
      )
    },
  })
  return cols
}

export default function DocumentacionServicios() {
  const { notify } = useNotify()
  const { can } = usePermission()
  const { user } = useAuth()
  const overlay = useFormOverlay()
  const showConfig =
    can('documentacion_servicios.configure_tiporegistroservicio') || Boolean(user?.is_staff)
  const canAdd = can('documentacion_servicios.add_registroserviciodoc')
  const canChange = can('documentacion_servicios.change_registroserviciodoc')
  const canDelete = can('documentacion_servicios.delete_registroserviciodoc')

  const [tipos, setTipos] = useState([])
  const [activeTipoId, setActiveTipoId] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [proveedores, setProveedores] = useState([])
  const [establecimientos, setEstablecimientos] = useState([])
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [ordering, setOrdering] = useState('-fecha_servicio')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selectedKeys, setSelectedKeys] = useState([])
  const [zipBusy, setZipBusy] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [archivo, setArchivo] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [emailTarget, setEmailTarget] = useState(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [viewer, setViewer] = useState(null)

  const [configOpen, setConfigOpen] = useState(false)
  const [configTipo, setConfigTipo] = useState(null)
  const [campoForm, setCampoForm] = useState({
    clave: '',
    etiqueta: '',
    tipo_dato: 'text',
    obligatorio: false,
    orden: 0,
    dias_aviso: '',
  })

  const activeTipo = useMemo(
    () => tipos.find((t) => t.id === activeTipoId) || null,
    [tipos, activeTipoId],
  )

  const activeFilterCount = useMemo(
    () =>
      [filters.proveedor, filters.establecimiento, filters.fecha_desde, filters.fecha_hasta].filter(
        Boolean,
      ).length,
    [filters],
  )

  const loadMeta = useCallback(async () => {
    try {
      const [tiposRes, provRes, estRes] = await Promise.all([
        api.get('doc-servicios/tipos/'),
        api.get('proveedores/', { params: { page_size: 1000 } }),
        api.get('establecimientos/', { params: { page_size: 1000 } }),
      ])
      const list = tiposRes.data.results || tiposRes.data || []
      setTipos(list)
      setProveedores(provRes.data.results || provRes.data || [])
      setEstablecimientos(estRes.data.results || estRes.data || [])
      setActiveTipoId((prev) => prev || list[0]?.id || null)
    } catch (err) {
      notify({ variant: 'danger', text: formatApiFormError(err) || 'No se pudo cargar' })
    }
  }, [notify])

  const loadRegistros = useCallback(async () => {
    if (!activeTipoId) {
      setRows([])
      setTotalCount(0)
      return
    }
    setLoading(true)
    try {
      const res = await api.get('doc-servicios/registros/', {
        params: {
          tipo: activeTipoId,
          q: filters.q || undefined,
          proveedor: filters.proveedor || undefined,
          establecimiento: filters.establecimiento || undefined,
          fecha_desde: filters.fecha_desde || undefined,
          fecha_hasta: filters.fecha_hasta || undefined,
          ordering,
          page,
          page_size: pageSize,
        },
      })
      setRows(res.data.results || res.data || [])
      setTotalCount(res.data.count ?? (res.data.results || res.data || []).length)
    } catch (err) {
      notify({ variant: 'danger', text: formatApiFormError(err) || 'Error al listar' })
    } finally {
      setLoading(false)
    }
  }, [activeTipoId, filters, ordering, page, pageSize, notify])

  useEffect(() => {
    loadMeta()
  }, [loadMeta])

  useEffect(() => {
    loadRegistros()
  }, [loadRegistros])

  useEffect(() => {
    setPage(1)
    setSelectedKeys([])
  }, [activeTipoId])

  const clearFilters = () => {
    setDraftFilters(EMPTY_FILTERS)
    setFilters(EMPTY_FILTERS)
    setPage(1)
  }

  const applyFilters = () => {
    setFilters({ ...draftFilters })
    setPage(1)
  }

  const handleSort = (colKey) => {
    const apiKey = SORTABLE_CORE[colKey]
    if (!apiKey) return
    setOrdering((prev) => {
      if (prev === apiKey) return `-${apiKey}`
      if (prev === `-${apiKey}`) return apiKey
      return `-${apiKey}`
    })
    setPage(1)
  }

  const activeSortKey = useMemo(() => {
    for (const [col, api] of Object.entries(SORTABLE_CORE)) {
      if (ordering === api || ordering === `-${api}`) return col
    }
    return null
  }, [ordering])

  const openViewer = (row) => {
    const path = previewPath(row.archivo_url || row.archivo)
    setViewer({
      fileUrl: path,
      title: row.folio || activeTipo?.nombre || 'Documento',
      subtitle: row.establecimiento_nombre || '',
    })
  }

  const downloadOne = (row) => {
    const path = previewPath(row.archivo_url || row.archivo)
    if (!path) {
      notify({ variant: 'warning', text: 'Este registro no tiene archivo' })
      return
    }
    const link = document.createElement('a')
    link.href = path
    link.download = ''
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const downloadZip = async () => {
    if (!selectedKeys.length) {
      notify({ variant: 'warning', text: 'Seleccione al menos un registro' })
      return
    }
    setZipBusy(true)
    try {
      const res = await api.post(
        'doc-servicios/registros/descargar-zip/',
        { ids: selectedKeys.map(Number) },
        { responseType: 'blob' },
      )
      const ctype = res.headers['content-type'] || ''
      if (ctype.includes('application/json')) {
        const text = await res.data.text?.()
        let msg = 'No se pudo generar el ZIP'
        try {
          msg = JSON.parse(text)?.detail || msg
        } catch {
          /* ignore */
        }
        notify({ variant: 'danger', text: msg })
        return
      }
      triggerBlobDownload(res.data, 'documentacion_servicios.zip')
      notify({ variant: 'success', text: `ZIP con ${selectedKeys.length} registro(s)` })
    } catch (err) {
      let msg = formatApiFormError(err) || 'No se pudo descargar el ZIP'
      const data = err?.response?.data
      if (data instanceof Blob) {
        try {
          const parsed = JSON.parse(await data.text())
          msg = parsed.detail || msg
        } catch {
          /* ignore */
        }
      }
      notify({ variant: 'danger', text: msg })
    } finally {
      setZipBusy(false)
    }
  }

  const closeModal = () => {
    if (overlay.busy) return
    overlay.reset()
    setModalOpen(false)
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      setModalOpen(false)
      loadRegistros()
      return
    }
    overlay.dismiss()
  }

  const openCreate = () => {
    overlay.reset()
    setEditing(null)
    setArchivo(null)
    const initial = {}
    ;(activeTipo?.campos || [])
      .filter((c) => c.activo)
      .forEach((c) => {
        initial[c.clave] = ''
      })
    if (activeTipo?.usa_folio && activeTipo.prefijo_folio) {
      initial.folio = activeTipo.prefijo_folio
    }
    setForm(initial)
    setModalOpen(true)
  }

  const openEdit = (row) => {
    overlay.reset()
    setEditing(row)
    setArchivo(null)
    const flat = flattenRegistro(row)
    const initial = {}
    ;(activeTipo?.campos || [])
      .filter((c) => c.activo)
      .forEach((c) => {
        if (c.clave === 'proveedor') initial.proveedor = row.proveedor || ''
        else if (c.clave === 'establecimiento') initial.establecimiento = row.establecimiento || ''
        else if (c.clave === 'archivo') initial.archivo = ''
        else initial[c.clave] = flat[c.clave] ?? ''
      })
    setForm(initial)
    setModalOpen(true)
  }

  const setField = (clave, value) => setForm((prev) => ({ ...prev, [clave]: value }))

  const handleSave = () => {
    if (!activeTipoId) return
    const data = new FormData()
    data.append('tipo', String(activeTipoId))
    Object.entries(form).forEach(([k, v]) => {
      if (k === 'archivo') return
      if (v === undefined || v === null || v === '') return
      data.append(k, v)
    })
    if (archivo) data.append('archivo', archivo)

    overlay
      .run(
        async () => {
          if (editing) {
            await api.patch(`doc-servicios/registros/${editing.id}/`, data)
          } else {
            await api.post('doc-servicios/registros/', data)
          }
        },
        {
          successDescription: editing ? 'Registro actualizado.' : 'Registro creado.',
          formatError: (err) => formatApiFormError(err),
        },
      )
      .catch(() => {})
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`doc-servicios/registros/${deleteTarget.id}/`)
      notify({ variant: 'success', text: 'Eliminado' })
      setDeleteTarget(null)
      await loadRegistros()
    } catch (err) {
      notify({ variant: 'danger', text: formatApiFormError(err) || 'No se pudo eliminar' })
    }
  }

  const openConfig = async () => {
    if (!activeTipo) return
    try {
      const res = await api.get(`doc-servicios/tipos/${activeTipo.id}/`)
      setConfigTipo(res.data)
      setConfigOpen(true)
    } catch (err) {
      notify({ variant: 'danger', text: formatApiFormError(err) || 'Sin permiso de configuración' })
    }
  }

  const saveTipoNotificar = (checked) => {
    if (!configTipo) return
    overlay.run(async () => {
      await api.patch(`doc-servicios/tipos/${configTipo.id}/`, {
        notificar_al_crear: checked,
      })
      const res = await api.get(`doc-servicios/tipos/${configTipo.id}/`)
      setConfigTipo(res.data)
      await loadMeta()
      notify({
        variant: 'success',
        text: checked
          ? 'Aviso al crear activo — configúralo en Tipos de notificación'
          : 'Aviso al crear desactivado',
      })
    })
  }

  const saveAvisoSoloUltimo = (checked) => {
    if (!configTipo) return
    overlay.run(async () => {
      await api.patch(`doc-servicios/tipos/${configTipo.id}/`, {
        aviso_solo_ultimo_por_establecimiento: checked,
      })
      const res = await api.get(`doc-servicios/tipos/${configTipo.id}/`)
      setConfigTipo(res.data)
      await loadMeta()
      notify({
        variant: 'success',
        text: checked
          ? 'Avisos por fecha: solo el último registro por establecimiento'
          : 'Avisos por fecha: todos los registros del tipo',
      })
    })
  }

  const saveCampoDiasAviso = (campo, value) => {
    const dias = value === '' || value === null ? null : Number(value)
    overlay.run(async () => {
      await api.patch(`doc-servicios/campos/${campo.id}/`, {
        dias_aviso: Number.isFinite(dias) && dias > 0 ? dias : null,
      })
      const res = await api.get(`doc-servicios/tipos/${configTipo.id}/`)
      setConfigTipo(res.data)
      await loadMeta()
      notify({ variant: 'success', text: 'Aviso por fecha actualizado' })
    })
  }

  const saveCampo = () => {
    if (!configTipo || !campoForm.clave.trim() || !campoForm.etiqueta.trim()) {
      notify({ variant: 'warning', text: 'Clave y etiqueta son obligatorias' })
      return
    }
    const isDate =
      campoForm.tipo_dato === 'date' ||
      campoForm.clave.trim().toLowerCase() === 'fecha_servicio'
    const diasRaw = campoForm.dias_aviso
    const dias =
      isDate && diasRaw !== '' && diasRaw != null ? Number(diasRaw) : null
    overlay.run(async () => {
      await api.post('doc-servicios/campos/', {
        clave: campoForm.clave.trim().toLowerCase().replace(/\s+/g, '_'),
        etiqueta: campoForm.etiqueta,
        tipo_dato: campoForm.tipo_dato,
        obligatorio: campoForm.obligatorio,
        orden: campoForm.orden,
        tipo: configTipo.id,
        dias_aviso: Number.isFinite(dias) && dias > 0 ? dias : null,
      })
      const res = await api.get(`doc-servicios/tipos/${configTipo.id}/`)
      setConfigTipo(res.data)
      setCampoForm({
        clave: '',
        etiqueta: '',
        tipo_dato: 'text',
        obligatorio: false,
        orden: res.data.campos?.length || 0,
        dias_aviso: '',
      })
      await loadMeta()
      notify({ variant: 'success', text: 'Campo agregado' })
    })
  }

  const columns = useMemo(
    () =>
      buildColumns(activeTipo?.campos || [], {
        onEdit: openEdit,
        onDelete: setDeleteTarget,
        onViewFile: openViewer,
        onDownload: downloadOne,
        onSendEmail: setEmailTarget,
        canChange,
        canDelete,
      }),
    [activeTipo, canChange, canDelete],
  )

  const confirmSendEmail = async () => {
    if (!emailTarget) return
    setSendingEmail(true)
    try {
      const res = await api.post(`doc-servicios/registros/${emailTarget.id}/enviar-correo/`)
      const enviadoEn = res.data.correo_enviado_en || new Date().toISOString()
      const dest =
        res.data.destinatario ||
        emailsEnvioEstablecimiento(emailTarget).join(', ') ||
        'los destinatarios'
      setRows((prev) =>
        prev.map((r) =>
          r.id === emailTarget.id ? { ...r, correo_enviado_en: enviadoEn } : r,
        ),
      )
      setEmailTarget(null)
      notify({
        variant: 'success',
        title: 'Correo enviado',
        text: `Se envió correctamente a ${dest}.`,
      })
    } catch (err) {
      notify({
        variant: 'danger',
        title: 'No se pudo enviar',
        text: formatApiFormError(err, 'No se pudo enviar el correo.'),
      })
      throw err
    } finally {
      setSendingEmail(false)
    }
  }

  const renderDynamicField = (campo) => {
    const id = `dsf-${campo.clave}`
    const value = form[campo.clave] ?? ''
    if (campo.tipo_dato === 'proveedor') {
      return (
        <Field key={campo.clave} label={campo.etiqueta} htmlFor={id} required={campo.obligatorio}>
          <Select
            id={id}
            value={value}
            onChange={(e) => setField(campo.clave, e.target.value)}
          >
            <option value="">— Seleccionar —</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </Field>
      )
    }
    if (campo.tipo_dato === 'establecimiento') {
      return (
        <Field key={campo.clave} label={campo.etiqueta} htmlFor={id} required={campo.obligatorio}>
          <Select
            id={id}
            value={value}
            onChange={(e) => setField(campo.clave, e.target.value)}
          >
            <option value="">— Seleccionar —</option>
            {establecimientos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </Select>
        </Field>
      )
    }
    if (campo.tipo_dato === 'file') {
      return (
        <Field
          key={campo.clave}
          label={campo.etiqueta}
          required={campo.obligatorio && !(editing?.archivo || editing?.archivo_url)}
          hint={
            editing?.archivo || editing?.archivo_url
              ? 'Dejar vacío para conservar el archivo actual'
              : undefined
          }
        >
          <FileInput
            onChange={(e) => setArchivo(e.target.files?.[0] || null)}
            accept=".pdf,image/*"
          />
        </Field>
      )
    }
    if (campo.tipo_dato === 'boolean') {
      return (
        <Switch
          key={campo.clave}
          checked={value === true || value === 'true' || value === '1'}
          onChange={(e) => setField(campo.clave, e.target.checked)}
          label={campo.etiqueta}
        />
      )
    }
    if (campo.tipo_dato === 'select') {
      const opts = Array.isArray(campo.opciones) ? campo.opciones : []
      return (
        <Field key={campo.clave} label={campo.etiqueta} htmlFor={id} required={campo.obligatorio}>
          <Select id={id} value={value} onChange={(e) => setField(campo.clave, e.target.value)}>
            <option value="">— Seleccionar —</option>
            {opts.map((o) => {
              const v = typeof o === 'object' ? o.value : o
              const l = typeof o === 'object' ? o.label : o
              return (
                <option key={v} value={v}>
                  {l}
                </option>
              )
            })}
          </Select>
        </Field>
      )
    }
    if (campo.tipo_dato === 'date' || campo.clave === 'fecha_servicio') {
      return (
        <Field key={campo.clave} label={campo.etiqueta} htmlFor={id} required={campo.obligatorio}>
          <Input
            id={id}
            type="date"
            value={value}
            onChange={(e) => setField(campo.clave, e.target.value)}
          />
        </Field>
      )
    }
    if (campo.tipo_dato === 'text' && campo.clave === 'observaciones') {
      return (
        <Field key={campo.clave} label={campo.etiqueta} htmlFor={id} className="field--full">
          <Textarea
            id={id}
            rows={2}
            value={value}
            onChange={(e) => setField(campo.clave, e.target.value)}
          />
        </Field>
      )
    }
    return (
      <Field key={campo.clave} label={campo.etiqueta} htmlFor={id} required={campo.obligatorio}>
        <Input
          id={id}
          type={campo.tipo_dato === 'number' ? 'number' : 'text'}
          value={value}
          onChange={(e) => setField(campo.clave, e.target.value)}
          placeholder={campo.tipo_dato === 'folio' ? activeTipo?.prefijo_folio || '' : undefined}
        />
      </Field>
    )
  }

  return (
    <div className="page" data-od-id="doc-servicios-page" data-fill-viewport>
      <PageHeader
        icon="file"
        title="Documentación de servicios"
        description="Certificados y documentos de servicios por establecimiento."
        breadcrumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Servicios' },
          { label: 'Documentación' },
        ]}
        linkComponent={Link}
        split
        actions={
          <>
            {selectedKeys.length > 0 ? (
              <Button
                variant="secondary"
                loading={zipBusy}
                onClick={downloadZip}
              >
                <Icon name="download" size="sm" /> Descargar ZIP ({selectedKeys.length})
              </Button>
            ) : null}
            {showConfig ? (
              <Button variant="secondary" onClick={openConfig} disabled={!activeTipo}>
                Campos del tipo
              </Button>
            ) : null}
            {canAdd ? (
              <Button variant="primary" onClick={openCreate} disabled={!activeTipo}>
                Nuevo registro
              </Button>
            ) : null}
          </>
        }
      />

      <div className="tabs">
        <ul className="tabs__list" role="tablist" aria-label="Tipos de documentación">
          {tipos.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                role="tab"
                className={`tabs__btn${activeTipoId === t.id ? ' is-active' : ''}`}
                aria-selected={activeTipoId === t.id}
                onClick={() => setActiveTipoId(t.id)}
              >
                {t.nombre}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <FiltersBar
        onSearch={applyFilters}
        onClear={clearFilters}
        activeCount={activeFilterCount}
        advanced={
          <>
            <Field label="Proveedor" htmlFor="doc-f-prov">
              <Select
                id="doc-f-prov"
                value={draftFilters.proveedor}
                onChange={(e) =>
                  setDraftFilters((p) => ({ ...p, proveedor: e.target.value }))
                }
              >
                <option value="">Todos</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Establecimiento" htmlFor="doc-f-est">
              <Select
                id="doc-f-est"
                value={draftFilters.establecimiento}
                onChange={(e) =>
                  setDraftFilters((p) => ({ ...p, establecimiento: e.target.value }))
                }
              >
                <option value="">Todos</option>
                {establecimientos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Desde" htmlFor="doc-f-desde">
              <Input
                id="doc-f-desde"
                type="date"
                value={draftFilters.fecha_desde}
                onChange={(e) =>
                  setDraftFilters((p) => ({ ...p, fecha_desde: e.target.value }))
                }
              />
            </Field>
            <Field label="Hasta" htmlFor="doc-f-hasta">
              <Input
                id="doc-f-hasta"
                type="date"
                value={draftFilters.fecha_hasta}
                onChange={(e) =>
                  setDraftFilters((p) => ({ ...p, fecha_hasta: e.target.value }))
                }
              />
            </Field>
          </>
        }
      >
        <Field label="Buscar" htmlFor="doc-f-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="doc-f-q"
              type="search"
              placeholder="Folio…"
              value={draftFilters.q}
              onChange={(e) => setDraftFilters((p) => ({ ...p, q: e.target.value }))}
            />
          </div>
        </Field>
      </FiltersBar>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        fillViewport
        selectable
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        pageSizeId="doc-serv-page-size"
        pageSizeOptions={[10, 20, 50, 100]}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setPage(1)
        }}
        sortKey={activeSortKey}
        onSort={handleSort}
        emptyTitle="Sin registros"
        emptyDescription={
          activeTipo
            ? `Aún no hay registros de ${activeTipo.nombre}.`
            : 'No hay tipos de documentación activos.'
        }
        emptyAction={
          activeTipo && canAdd ? (
            <Button variant="primary" onClick={openCreate}>
              Nuevo registro
            </Button>
          ) : null
        }
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">Listado</span>
            <Badge variant="neutral">{totalCount}</Badge>
            {selectedKeys.length > 0 ? (
              <Badge variant="accent">{selectedKeys.length} seleccionados</Badge>
            ) : null}
          </div>
        }
        mobileCardActions={(row) => {
          const hasFile = Boolean(row.archivo || row.archivo_url)
          if (hasFile) {
            return {
              primary: { label: 'Ver', onClick: () => openViewer(row) },
              secondary: { label: 'Descargar', onClick: () => downloadOne(row) },
            }
          }
          if (canChange) {
            return {
              primary: { label: 'Editar', onClick: () => openEdit(row) },
            }
          }
          return {}
        }}
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar registro' : `Nuevo — ${activeTipo?.nombre || ''}`}
        size="lg"
        {...overlay.modalProps}
        onOverlayDismiss={handleOverlayDismiss}
        footer={
          <>
            <Button variant="secondary" disabled={overlay.busy} onClick={closeModal}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              loading={overlay.busy}
              disabled={overlay.busy || overlay.active}
              onClick={handleSave}
            >
              Guardar
            </Button>
          </>
        }
      >
        <div className="form-grid">
          {(activeTipo?.campos || [])
            .filter((c) => c.activo)
            .sort((a, b) => a.orden - b.orden)
            .map((c) => renderDynamicField(c))}
        </div>
      </Modal>

      <Modal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        title={`Configurar — ${configTipo?.nombre || ''}`}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setConfigOpen(false)}>
            Cerrar
          </Button>
        }
      >
        {configTipo ? (
          <div className="notif-type-form">
            <p className="field__hint">
              Código: <code>{configTipo.codigo}</code>
              {configTipo.usa_folio ? ` · Folio (prefijo ${configTipo.prefijo_folio || '—'})` : ''}
              {' · '}
              <Link to="/admin/notificaciones">Notificaciones</Link>
            </p>

            <h3 className="notif-type-form__section-title">Notificaciones</h3>
            <Switch
              checked={Boolean(configTipo.notificar_al_crear)}
              onChange={(e) => saveTipoNotificar(e.target.checked)}
              label="Avisar al crear un registro"
            />
            <Switch
              checked={Boolean(configTipo.aviso_solo_ultimo_por_establecimiento)}
              onChange={(e) => saveAvisoSoloUltimo(e.target.checked)}
              label="Avisos por fecha: solo el último por establecimiento"
            />
            <p className="field__hint">
              Crea el tipo <code>DOC_SERVICIOS.{configTipo.codigo}_NUEVO</code> en el panel
              (campana / email / destinatarios). En fechas, «Aviso (días)» = primer hito; también
              avisa a los 60, 45, 30, 20, 10, 5 y 1 día(s) si quedan por debajo (una vez cada hito).
              Si activas «solo el último», el historial se conserva pero los recordatorios miran
              únicamente el registro más reciente de cada colegio.
            </p>

            <div className="pick-table">
              <div className="pick-table__head">
                <h4 className="pick-table__title">Campos actuales</h4>
              </div>
              <div className="pick-table__scroll">
                <table className="pick-table__table">
                  <thead>
                    <tr>
                      <th>Orden</th>
                      <th>Clave</th>
                      <th>Etiqueta</th>
                      <th>Tipo</th>
                      <th>Oblig.</th>
                      <th>Aviso (días)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(configTipo.campos || [])
                      .slice()
                      .sort((a, b) => a.orden - b.orden)
                      .map((c) => {
                        const isDate = c.tipo_dato === 'date' || c.clave === 'fecha_servicio'
                        return (
                          <tr key={c.id}>
                            <td>{c.orden}</td>
                            <td>
                              <code>{c.clave}</code>
                            </td>
                            <td>{c.etiqueta}</td>
                            <td>{c.tipo_dato}</td>
                            <td>{c.obligatorio ? 'Sí' : 'No'}</td>
                            <td>
                              {isDate ? (
                                <Input
                                  type="number"
                                  min={0}
                                  placeholder="—"
                                  defaultValue={c.dias_aviso ?? ''}
                                  aria-label={`Días de aviso ${c.etiqueta}`}
                                  onBlur={(e) => {
                                    const next = e.target.value
                                    const prev = c.dias_aviso == null ? '' : String(c.dias_aviso)
                                    if (next === prev) return
                                    saveCampoDiasAviso(c, next)
                                  }}
                                />
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            <h3 className="notif-type-form__section-title">Agregar campo</h3>
            <div className="form-grid">
              <Field label="Clave" required>
                <Input
                  value={campoForm.clave}
                  onChange={(e) => setCampoForm({ ...campoForm, clave: e.target.value })}
                  placeholder="ej. responsable"
                />
              </Field>
              <Field label="Etiqueta" required>
                <Input
                  value={campoForm.etiqueta}
                  onChange={(e) => setCampoForm({ ...campoForm, etiqueta: e.target.value })}
                />
              </Field>
              <Field label="Tipo de dato">
                <Select
                  value={campoForm.tipo_dato}
                  onChange={(e) => setCampoForm({ ...campoForm, tipo_dato: e.target.value })}
                >
                  <option value="text">Texto</option>
                  <option value="number">Número</option>
                  <option value="date">Fecha</option>
                  <option value="boolean">Sí/No</option>
                  <option value="select">Lista</option>
                  <option value="proveedor">Proveedor</option>
                  <option value="establecimiento">Establecimiento</option>
                  <option value="file">Archivo</option>
                  <option value="folio">Folio</option>
                </Select>
              </Field>
              <Field label="Orden">
                <Input
                  type="number"
                  value={campoForm.orden}
                  onChange={(e) =>
                    setCampoForm({ ...campoForm, orden: Number(e.target.value) || 0 })
                  }
                />
              </Field>
              {(campoForm.tipo_dato === 'date' ||
                campoForm.clave.trim().toLowerCase() === 'fecha_servicio') && (
                <Field
                  label="Avisar N días antes"
                  hint="Ej. 60 → hitos 60, 45, 30, 20, 10, 5 y 1. Vacío = sin aviso."
                >
                  <Input
                    type="number"
                    min={1}
                    value={campoForm.dias_aviso}
                    onChange={(e) =>
                      setCampoForm({ ...campoForm, dias_aviso: e.target.value })
                    }
                    placeholder="ej. 15"
                  />
                </Field>
              )}
              <Switch
                checked={campoForm.obligatorio}
                onChange={(e) => setCampoForm({ ...campoForm, obligatorio: e.target.checked })}
                label="Obligatorio"
              />
            </div>
            <Button variant="primary" onClick={saveCampo} loading={overlay.busy}>
              Agregar campo
            </Button>
          </div>
        ) : null}
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar registro"
        description="¿Eliminar este registro de documentación?"
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        danger
      />

      <ConfirmModal
        open={!!emailTarget}
        onClose={() => {
          if (!sendingEmail) setEmailTarget(null)
        }}
        title={emailTarget?.correo_enviado_en ? 'Reenviar documento por correo' : 'Enviar documento por correo'}
        description={
          emailTarget
            ? (() => {
                const dest = emailsEnvioEstablecimiento(emailTarget).join(', ')
                const nombre = emailTarget.establecimiento_nombre || 'establecimiento'
                if (emailTarget.correo_enviado_en) {
                  return `Ya se envió el ${formatDateTimeCL(emailTarget.correo_enviado_en)}. ¿Reenviar a ${dest} (${nombre}) con el documento adjunto?`
                }
                return `Se enviará a ${dest} (${nombre}) con el documento adjunto.`
              })()
            : ''
        }
        confirmLabel={
          sendingEmail
            ? 'Enviando…'
            : emailTarget?.correo_enviado_en
              ? 'Reenviar'
              : 'Enviar'
        }
        cancelLabel="Cancelar"
        danger={false}
        closeOnConfirm={false}
        confirmLoading={sendingEmail}
        onConfirm={confirmSendEmail}
      />

      <DocumentViewerModal
        open={!!viewer}
        onClose={() => setViewer(null)}
        fileUrl={viewer?.fileUrl}
        title={viewer?.title}
        subtitle={viewer?.subtitle}
        documentType={activeTipo?.nombre || 'Documento'}
      />
    </div>
  )
}
