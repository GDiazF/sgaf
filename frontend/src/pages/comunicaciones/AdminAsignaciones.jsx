import React, { useState, useEffect, useMemo, useCallback } from 'react'
import api from '../../api'
import { useNotify } from '../../hooks/useNotify'
import { downloadCsv } from '../../utils/csvDownload'
import SearchableSelect from '../../components/common/SearchableSelect'
import {
  DataTable,
  Badge,
  Button,
  Field,
  Modal,
  ConfirmModal,
  Icon,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const EMPTY_FORM = { funcionario: '', establecimiento: '' }

const AdminAsignaciones = () => {
  const [asignaciones, setAsignaciones] = useState([])
  const [funcionarios, setFuncionarios] = useState([])
  const [establecimientos, setEstablecimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [savedOk, setSavedOk] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const { notify } = useNotify()
  const overlay = useFormOverlay()
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [resAsig, resFunc, resEst] = await Promise.all([
        api.get('ejecutivos/asignaciones/', { params: { page_size: 1000 } }),
        api.get('funcionarios/', { params: { activos: true, page_size: 1000 } }),
        api.get('establecimientos/', { params: { page_size: 1000 } }),
      ])
      const data = resAsig.data.results || resAsig.data
      setAsignaciones(Array.isArray(data) ? data : [])
      setFuncionarios(resFunc.data.results || resFunc.data || [])
      setEstablecimientos(resEst.data.results || resEst.data || [])
    } catch (error) {
      console.error(error)
      notify({
        variant: 'danger',
        text: 'No se pudieron cargar las asignaciones.',
      })
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return asignaciones.slice(start, start + pageSize)
  }, [asignaciones, currentPage, pageSize])

  const funcionarioOptions = useMemo(
    () =>
      funcionarios.map((f) => ({
        value: f.id,
        label: f.nombre_funcionario,
      })),
    [funcionarios],
  )

  const establecimientoOptions = useMemo(
    () =>
      establecimientos.map((e) => ({
        value: e.id,
        label: e.nombre,
      })),
    [establecimientos],
  )

  const openModal = () => {
    setForm(EMPTY_FORM)
    setSavedOk(false)
    overlay.reset()
    setModalOpen(true)
  }

  const closeModal = () => {
    if (overlay.busy) return
    overlay.reset()
    setModalOpen(false)
    setForm(EMPTY_FORM)
    setSavedOk(false)
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      setModalOpen(false)
      setForm(EMPTY_FORM)
      if (savedOk) fetchData()
      setSavedOk(false)
      return
    }
    overlay.dismiss()
  }

  const handleAssign = async (e) => {
    e.preventDefault()
    if (!form.funcionario || !form.establecimiento) {
      overlay.setTitle(undefined)
      overlay.setDescription('Seleccione ejecutivo y establecimiento.')
      overlay.setStatus('error')
      return
    }
    try {
      await overlay.run(
        async () => {
          await api.post('ejecutivos/asignaciones/', form)
          setSavedOk(true)
        },
        {
          successDescription: 'Asignación creada.',
          formatError: (err) =>
            formatApiFormError(err, 'Error al asignar o ya existe la asignación.'),
        },
      )
    } catch {
      // FormOverlay
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`ejecutivos/asignaciones/${deleteTarget.id}/`)
      setDeleteTarget(null)
      notify({ variant: 'success', text: 'Asignación eliminada.' })
      await fetchData()
    } catch (error) {
      console.error(error)
      notify({ variant: 'danger', text: 'Error al eliminar la asignación.' })
    } finally {
      setDeleting(false)
    }
  }

  const handleDownload = () => {
    downloadCsv(
      'asignaciones_ejecutivos.csv',
      [
        'Ejecutivo',
        'RUT',
        'Cargo',
        'Establecimiento',
        'RBD',
        'Vigencia',
        'Fecha asignación',
      ],
      asignaciones.map((item) => [
        item.funcionario_details?.nombre_funcionario || '',
        item.funcionario_details?.rut || '',
        item.funcionario_details?.cargo || '',
        item.establecimiento_details?.nombre || '',
        item.establecimiento_details?.rbd ?? '',
        item.vigente ? 'Vigente' : 'Inactivo',
        item.fecha_asignacion
          ? new Date(item.fecha_asignacion).toLocaleDateString('es-CL')
          : '',
      ]),
    )
  }

  const columns = useMemo(
    () => [
      {
        key: 'ejecutivo',
        header: 'Ejecutivo',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        render: (item) =>
          item.funcionario_details?.nombre_funcionario || '—',
      },
      {
        key: 'establecimiento',
        header: 'Establecimiento',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 2,
        render: (item) => item.establecimiento_details?.nombre || '—',
      },
      {
        key: 'vigencia',
        header: 'Vigencia',
        className: 'col--status',
        cardRole: 'status',
        priority: 1,
        render: (item) => (
          <Badge variant={item.vigente ? 'success' : 'danger'}>
            {item.vigente ? 'Vigente' : 'Inactivo'}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Acciones',
        className: 'col--actions',
        render: (item) => (
          <div className="data-table__actions" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              title="Eliminar"
              onClick={() => setDeleteTarget(item)}
            >
              <Icon name="trash" size="sm" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <>
      <DataTable
        columns={columns}
        rows={pageRows}
        loading={loading}
        totalCount={asignaciones.length}
        emptyTitle="Sin asignaciones"
        emptyDescription="Asigná un ejecutivo a un establecimiento para comenzar."
        emptyAction={
          <Button variant="primary" size="sm" onClick={openModal}>
            <Icon name="plus" size="sm" /> Nueva asignación
          </Button>
        }
        fillViewport
        page={currentPage}
        pageSize={pageSize}
        pageSizeId="com-asig-page-size"
        pageSizeOptions={[10, 25, 50]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setCurrentPage(1)
        }}
        mobileCardActions={(item) => ({
          primary: {
            label: 'Eliminar',
            onClick: () => setDeleteTarget(item),
          },
        })}
        toolbar={
          <>
            <div className="table-toolbar__left">
              <span className="table-toolbar__title">Asignaciones</span>
              <Badge variant="neutral">{asignaciones.length}</Badge>
            </div>
            <div className="table-toolbar__right">
              <Button
                action="download"
                size="sm"
                onClick={handleDownload}
                disabled={!asignaciones.length}
              >
                <Icon name="download" size="sm" /> Descargar
              </Button>
              <Button variant="primary" size="sm" onClick={openModal}>
                <Icon name="plus" size="sm" /> Nueva asignación
              </Button>
            </div>
          </>
        }
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Nueva asignación"
        subheader="Vinculá un ejecutivo con un establecimiento"
        {...overlay.modalProps}
        onOverlayDismiss={handleOverlayDismiss}
        footer={
          <>
            <Button variant="ghost" type="button" onClick={closeModal} disabled={overlay.busy}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="asignacion-form"
              loading={overlay.busy}
              disabled={overlay.busy || overlay.active}
            >
              <Icon name="plus" size="sm" />
              {overlay.busy ? 'Asignando…' : 'Asignar'}
            </Button>
          </>
        }
      >
        <form
          id="asignacion-form"
          className="crud-form"
          onSubmit={handleAssign}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        >
          <Field label="Funcionario (ejecutivo)" required htmlFor="asig-func">
            <SearchableSelect
              options={funcionarioOptions}
              value={form.funcionario}
              onChange={(selected) => setForm({ ...form, funcionario: selected })}
              placeholder="Buscar ejecutivo…"
            />
          </Field>
          <Field label="Establecimiento" required htmlFor="asig-estab">
            <SearchableSelect
              options={establecimientoOptions}
              value={form.establecimiento}
              onChange={(selected) => setForm({ ...form, establecimiento: selected })}
              placeholder="Seleccionar sede…"
            />
          </Field>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        onConfirm={confirmDelete}
        title="Eliminar asignación"
        description={`¿Eliminar la asignación de «${
          deleteTarget?.funcionario_details?.nombre_funcionario || ''
        }»?`}
        confirmLabel="Eliminar"
        danger
      />
    </>
  )
}

export default AdminAsignaciones
