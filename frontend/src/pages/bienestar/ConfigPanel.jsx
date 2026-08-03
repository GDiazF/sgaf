import React, { useEffect, useRef, useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import api from '../../api'
import { usePermission } from '../../hooks/usePermission'
import { useNotify } from '../../hooks/useNotify'
import { CATEGORY_ICON_OPTIONS, DEFAULT_CATEGORY_COLOR } from './bienestarIcons'
import {
  Badge,
  Button,
  ConfirmModal,
  EmptyState,
  Field,
  FileInput,
  FormStatus,
  Icon,
  IconButton,
  Input,
  Modal,
  Select,
  Textarea,
  resolveIconName,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const emptyBenefit = (estado = 'BORRADOR', categoria = '') => ({
  titulo: '',
  descripcion: '',
  categoria,
  estado,
  tempFiles: [],
})

const emptyCategory = () => ({
  nombre: '',
  icono: 'Heart',
  color: DEFAULT_CATEGORY_COLOR,
})

/** Más recientes primero (creado_en; fallback por id). */
const byNewestFirst = (a, b) => {
  const da = a.creado_en ? Date.parse(a.creado_en) : 0
  const db = b.creado_en ? Date.parse(b.creado_en) : 0
  if (db !== da) return db - da
  return (b.id || 0) - (a.id || 0)
}

function SortableBenefit({ b, categorias, onDelete, onMove, onEdit }) {
  const { can } = usePermission()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: b.id,
    disabled: !can('bienestar.change_beneficio'),
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  }
  const cat = categorias.find((c) => c.id === b.categoria)
  const color = b.categoria_color || cat?.color || DEFAULT_CATEGORY_COLOR

  return (
    <div ref={setNodeRef} style={style} className="bienestar-kanban-card">
      <span className="bienestar-kanban-card__accent" style={{ backgroundColor: color }} />
      <div className="bienestar-kanban-card__head">
        <Badge variant="neutral" style={{ backgroundColor: color, color: '#fff', borderColor: color }}>
          {cat?.nombre || 'Sin categoría'}
        </Badge>
        <div className="bienestar-kanban-card__actions">
          {can('bienestar.change_beneficio') ? (
            <>
              <IconButton
                aria-label="Editar beneficio"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(b)
                }}
              >
                <Icon name="edit" size={14} />
              </IconButton>
              <IconButton
                aria-label={
                  b.estado === 'BORRADOR'
                    ? 'Publicar beneficio'
                    : 'Volver a borrador'
                }
                onClick={(e) => {
                  e.stopPropagation()
                  onMove(b.id, b.estado === 'BORRADOR' ? 'PUBLICADO' : 'BORRADOR')
                }}
              >
                <Icon name={b.estado === 'BORRADOR' ? 'send' : 'undo'} size={14} />
              </IconButton>
            </>
          ) : null}
          {can('bienestar.delete_beneficio') ? (
            <IconButton
              danger
              aria-label="Eliminar beneficio"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(b)
              }}
            >
              <Icon name="trash" size={14} />
            </IconButton>
          ) : null}
        </div>
      </div>
      <h4 className="bienestar-kanban-card__title">{b.titulo}</h4>
      <p className="bienestar-kanban-card__excerpt">{b.descripcion}</p>
      <div className="bienestar-kanban-card__foot">
        <div className="bienestar-kanban-card__meta">
          {b.archivos?.length > 0 ? (
            <span>
              <Icon name="attach" size={12} /> {b.archivos.length}
            </span>
          ) : null}
          {b.estado === 'PUBLICADO' && b.creado_por_nombre ? (
            <span>{b.creado_por_nombre}</span>
          ) : null}
        </div>
        {can('bienestar.change_beneficio') ? (
          <button
            type="button"
            className="bienestar-kanban-card__grip"
            aria-label="Arrastrar"
            {...attributes}
            {...listeners}
          >
            <Icon name="menu" size={16} />
          </button>
        ) : null}
      </div>
    </div>
  )
}

function KanbanColumn({ col, items, categorias, canAdd, onDelete, onMove, onEdit, onAdd }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id })

  return (
    <section
      ref={setNodeRef}
      className={`bienestar-kanban-col${col.id === 'PUBLICADO' ? ' bienestar-kanban-col--wide' : ''}${isOver ? ' is-over' : ''}`}
      aria-label={col.title}
    >
      <header className="bienestar-kanban-col__head">
        <h3>
          <Icon name={col.icon} size={14} />
          {col.title}
        </h3>
        <span className="bienestar-kanban-col__count">{items.length}</span>
      </header>
      <div className="bienestar-kanban-col__body">
        <SortableContext items={items.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          {items.map((b) => (
            <SortableBenefit
              key={b.id}
              b={b}
              categorias={categorias}
              onDelete={onDelete}
              onMove={onMove}
              onEdit={onEdit}
            />
          ))}
        </SortableContext>
        {items.length === 0 ? (
          <EmptyState title="Sin ítems" description={`No hay ${col.title.toLowerCase()}.`} />
        ) : null}
        {canAdd ? (
          <button type="button" className="bienestar-kanban-add" onClick={() => onAdd(col.id)}>
            <Icon name="plus" size={18} />
            Añadir beneficio
          </button>
        ) : null}
      </div>
    </section>
  )
}

/**
 * Configuración: tablero borrador/publicado + categorías.
 */
const ConfigPanel = ({ isNarrow = false }) => {
  const { can } = usePermission()
  const { notify } = useNotify()
  const benefitOverlay = useFormOverlay()
  const categoryOverlay = useFormOverlay()

  const [beneficios, setBeneficios] = useState([])
  const [categorias, setCategorias] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [categoryListError, setCategoryListError] = useState('')
  const [deleteBenefit, setDeleteBenefit] = useState(null)
  const [deleteCategory, setDeleteCategory] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [savedBenefitOk, setSavedBenefitOk] = useState(false)
  const [newData, setNewData] = useState(emptyBenefit())
  const [newCategory, setNewCategory] = useState(emptyCategory())
  const fileInputKey = useRef(0)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const fetchData = async () => {
    try {
      const [resB, resC] = await Promise.all([
        api.get('bienestar/beneficios/'),
        api.get('bienestar/categorias/'),
      ])
      const cats = resC.data.results || resC.data || []
      setBeneficios(resB.data.results || resB.data || [])
      setCategorias(cats)
      setNewData((prev) =>
        prev.categoria || !cats[0] ? prev : { ...prev, categoria: cats[0].id },
      )
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const openCreate = (estado = 'BORRADOR') => {
    setEditingId(null)
    setSavedBenefitOk(false)
    benefitOverlay.reset()
    setNewData(emptyBenefit(estado, categorias[0]?.id || ''))
    fileInputKey.current += 1
    setIsModalOpen(true)
  }

  const openEdit = (benefit) => {
    setEditingId(benefit.id)
    setSavedBenefitOk(false)
    benefitOverlay.reset()
    setNewData({
      titulo: benefit.titulo,
      descripcion: benefit.descripcion,
      categoria: benefit.categoria,
      estado: benefit.estado,
      tempFiles: [],
    })
    fileInputKey.current += 1
    setIsModalOpen(true)
  }

  const closeBenefitModal = () => {
    if (benefitOverlay.busy) return
    benefitOverlay.reset()
    setIsModalOpen(false)
    setEditingId(null)
    setSavedBenefitOk(false)
  }

  const handleBenefitOverlayDismiss = () => {
    if (benefitOverlay.status === 'success') {
      benefitOverlay.reset()
      setIsModalOpen(false)
      setEditingId(null)
      setNewData(emptyBenefit('BORRADOR', categorias[0]?.id || ''))
      if (savedBenefitOk) fetchData()
      setSavedBenefitOk(false)
      return
    }
    benefitOverlay.dismiss()
  }

  const handleSave = async (e) => {
    e?.preventDefault?.()
    const hasPerm = editingId
      ? can('bienestar.change_beneficio')
      : can('bienestar.add_beneficio')
    if (!hasPerm) return
    if (!newData.titulo || !newData.categoria) {
      benefitOverlay.setTitle(undefined)
      benefitOverlay.setDescription('Título y categoría son obligatorios.')
      benefitOverlay.setStatus('error')
      return
    }
    try {
      await benefitOverlay.run(
        async () => {
          const postData = {
            titulo: newData.titulo,
            descripcion: newData.descripcion,
            categoria: parseInt(newData.categoria, 10),
            estado: newData.estado,
          }
          let res
          if (editingId) {
            res = await api.patch(`bienestar/beneficios/${editingId}/`, postData)
          } else {
            res = await api.post('bienestar/beneficios/', postData)
          }
          if (newData.tempFiles.length > 0) {
            for (const file of newData.tempFiles) {
              const formData = new FormData()
              formData.append('beneficio', res.data.id)
              formData.append('archivo', file)
              formData.append('tipo', file.type.startsWith('image/') ? 'image' : 'pdf')
              formData.append('nombre', file.name)
              await api.post('bienestar/archivos/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
              })
            }
          }
          setSavedBenefitOk(true)
        },
        {
          successDescription: editingId
            ? 'Beneficio actualizado correctamente.'
            : 'Beneficio creado correctamente.',
          formatError: (err) => formatApiFormError(err, 'No se pudo guardar el beneficio.'),
        },
      )
    } catch {
      // FormOverlay
    }
  }

  const handleMove = async (id, newStatus) => {
    if (!can('bienestar.change_beneficio')) return
    setBeneficios((prev) => prev.map((b) => (b.id === id ? { ...b, estado: newStatus } : b)))
    try {
      await api.patch(`bienestar/beneficios/${id}/`, { estado: newStatus })
    } catch {
      fetchData()
    }
  }

  const handleConfirmDeleteBenefit = async () => {
    if (!deleteBenefit || !can('bienestar.delete_beneficio')) return
    setDeleting(true)
    try {
      await api.delete(`bienestar/beneficios/${deleteBenefit.id}/`)
      setBeneficios((prev) => prev.filter((b) => b.id !== deleteBenefit.id))
      setDeleteBenefit(null)
      notify({ variant: 'success', text: 'Beneficio eliminado.' })
    } catch (e) {
      console.error(e)
      notify({ variant: 'danger', text: 'No se pudo eliminar el beneficio.' })
    } finally {
      setDeleting(false)
    }
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over) return
    const activeItem = beneficios.find((b) => b.id === active.id)
    const overCol =
      over.id === 'BORRADOR' || over.id === 'PUBLICADO'
        ? over.id
        : beneficios.find((b) => b.id === over.id)?.estado
    if (activeItem && overCol && activeItem.estado !== overCol) {
      handleMove(activeItem.id, overCol)
    }
  }

  const openCategoryModal = () => {
    setCategoryListError('')
    setEditingCategoryId(null)
    setNewCategory(emptyCategory())
    categoryOverlay.reset()
    setCategoryModalOpen(true)
  }

  const closeCategoryModal = () => {
    if (categoryOverlay.busy) return
    categoryOverlay.reset()
    setCategoryModalOpen(false)
    setEditingCategoryId(null)
    setNewCategory(emptyCategory())
    setCategoryListError('')
  }

  const handleCategoryOverlayDismiss = () => {
    if (categoryOverlay.status === 'success') {
      categoryOverlay.reset()
      setNewCategory(emptyCategory())
      setEditingCategoryId(null)
      fetchData()
      return
    }
    categoryOverlay.dismiss()
  }

  const handleSaveCategory = async (e) => {
    e.preventDefault()
    const hasPerm = editingCategoryId
      ? can('bienestar.change_categoriabienestar')
      : can('bienestar.add_categoriabienestar')
    if (!hasPerm) return
    if (!newCategory.nombre?.trim()) {
      categoryOverlay.setTitle(undefined)
      categoryOverlay.setDescription('El nombre es obligatorio.')
      categoryOverlay.setStatus('error')
      return
    }
    setCategoryListError('')
    try {
      await categoryOverlay.run(
        async () => {
          if (editingCategoryId) {
            await api.patch(`bienestar/categorias/${editingCategoryId}/`, newCategory)
          } else {
            await api.post('bienestar/categorias/', newCategory)
          }
        },
        {
          successDescription: editingCategoryId
            ? 'Categoría actualizada.'
            : 'Categoría creada.',
          formatError: (err) =>
            formatApiFormError(err, 'No se pudo guardar la categoría.'),
        },
      )
    } catch {
      // FormOverlay
    }
  }

  const handleEditCategory = (cat) => {
    if (categoryOverlay.busy) return
    categoryOverlay.reset()
    setEditingCategoryId(cat.id)
    setNewCategory({
      nombre: cat.nombre,
      icono: cat.icono || 'Heart',
      color: cat.color || DEFAULT_CATEGORY_COLOR,
    })
    setCategoryListError('')
  }

  const requestDeleteCategory = (cat) => {
    const isUsed = beneficios.some((b) => b.categoria === cat.id)
    if (isUsed) {
      setCategoryListError(
        'No se puede eliminar: hay beneficios asociados. Cámbielos de categoría primero.',
      )
      return
    }
    setDeleteCategory(cat)
  }

  const handleConfirmDeleteCategory = async () => {
    if (!deleteCategory || !can('bienestar.delete_categoriabienestar')) return
    setDeleting(true)
    try {
      await api.delete(`bienestar/categorias/${deleteCategory.id}/`)
      setDeleteCategory(null)
      notify({ variant: 'success', text: 'Categoría eliminada.' })
      await fetchData()
    } catch (e) {
      console.error(e)
      notify({ variant: 'danger', text: 'No se pudo eliminar la categoría.' })
    } finally {
      setDeleting(false)
    }
  }

  const columns = [
    { id: 'BORRADOR', title: 'Borradores', icon: 'file' },
    { id: 'PUBLICADO', title: 'Publicados', icon: 'check' },
  ]

  return (
    <>
      <div className="bienestar-config-toolbar">
        <p className="bienestar-config-toolbar__hint">
          Arrastre entre columnas para publicar o volver a borrador
        </p>
        <div className="bienestar-config-toolbar__actions">
          {can('bienestar.add_categoriabienestar') ||
          can('bienestar.change_categoriabienestar') ? (
            <Button type="button" variant="ghost" size="sm" onClick={openCategoryModal}>
              <Icon name="box" size={16} />
              Categorías
            </Button>
          ) : null}
          {can('bienestar.add_beneficio') ? (
            <Button type="button" variant="primary" size="sm" onClick={() => openCreate()}>
              <Icon name="plus" size={16} />
              Nuevo beneficio
            </Button>
          ) : null}
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className={`bienestar-kanban${!isNarrow ? ' bienestar-kanban--fill' : ''}`}>
          {columns.map((col) => (
            <KanbanColumn
              key={col.id}
              col={col}
              items={beneficios.filter((b) => b.estado === col.id).sort(byNewestFirst)}
              categorias={categorias}
              canAdd={can('bienestar.add_beneficio')}
              onDelete={setDeleteBenefit}
              onMove={handleMove}
              onEdit={openEdit}
              onAdd={openCreate}
            />
          ))}
        </div>
      </DndContext>

      <Modal
        open={isModalOpen}
        onClose={closeBenefitModal}
        title={editingId ? 'Editar beneficio' : 'Nuevo beneficio'}
        subheader="Complete los datos del anuncio institucional."
        {...benefitOverlay.modalProps}
        onOverlayDismiss={handleBenefitOverlayDismiss}
        footer={
          <>
            <Button
              variant="ghost"
              type="button"
              onClick={closeBenefitModal}
              disabled={benefitOverlay.busy}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="bienestar-benefit-form"
              loading={benefitOverlay.busy}
              disabled={benefitOverlay.busy || benefitOverlay.active}
            >
              {editingId ? 'Guardar cambios' : 'Crear beneficio'}
            </Button>
          </>
        }
      >
        <form id="bienestar-benefit-form" className="crud-form" onSubmit={handleSave} noValidate>
          <div className="form-grid">
            <Field label="Título" required htmlFor="bw-titulo" className="field--full">
              <Input
                id="bw-titulo"
                required
                value={newData.titulo}
                onChange={(e) => setNewData({ ...newData, titulo: e.target.value })}
                placeholder="Ej: Nuevo convenio dental"
              />
            </Field>
            <Field label="Descripción" htmlFor="bw-desc" className="field--full">
              <Textarea
                id="bw-desc"
                rows={5}
                value={newData.descripcion}
                onChange={(e) => setNewData({ ...newData, descripcion: e.target.value })}
                placeholder="Detalle del beneficio…"
              />
            </Field>
            <Field label="Categoría" required htmlFor="bw-cat">
              <Select
                id="bw-cat"
                required
                value={newData.categoria}
                onChange={(e) => setNewData({ ...newData, categoria: e.target.value })}
              >
                <option value="">Seleccione…</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Estado" htmlFor="bw-estado">
              <Select
                id="bw-estado"
                value={newData.estado}
                onChange={(e) => setNewData({ ...newData, estado: e.target.value })}
              >
                <option value="BORRADOR">Borrador</option>
                <option value="PUBLICADO">Publicado</option>
              </Select>
            </Field>
            <div className="field field--full">
              <FileInput
                key={fileInputKey.current}
                variant="zone"
                label="Documentos o imágenes"
                hint="Puede adjuntar varios archivos"
                multiple
                disabled={benefitOverlay.busy}
                onChange={(e) =>
                  setNewData((p) => ({
                    ...p,
                    tempFiles: [...p.tempFiles, ...Array.from(e.target.files || [])],
                  }))
                }
              />
              {newData.tempFiles.length > 0 ? (
                <ul className="bienestar-file-list">
                  {newData.tempFiles.map((f, i) => (
                    <li key={`${f.name}-${i}`}>
                      <Icon name="check" size={12} /> {f.name}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={isCategoryModalOpen}
        onClose={closeCategoryModal}
        title={editingCategoryId ? 'Editar categoría' : 'Categorías'}
        subheader="Organice los beneficios por categoría e icono."
        {...categoryOverlay.modalProps}
        onOverlayDismiss={handleCategoryOverlayDismiss}
        footer={
          <Button
            variant="ghost"
            type="button"
            onClick={closeCategoryModal}
            disabled={categoryOverlay.busy}
          >
            Cerrar
          </Button>
        }
      >
        <form className="crud-form" onSubmit={handleSaveCategory} noValidate>
          {categoryListError ? (
            <FormStatus variant="error" title="Atención" description={categoryListError} />
          ) : null}
          <div className="form-grid">
            <Field label="Nombre" required htmlFor="bw-cat-nombre" className="field--full">
              <div className="bienestar-cat-form-row">
                <Input
                  id="bw-cat-nombre"
                  required
                  value={newCategory.nombre}
                  onChange={(e) => setNewCategory({ ...newCategory, nombre: e.target.value })}
                  placeholder="Ej: Salud"
                  disabled={categoryOverlay.busy}
                />
                <label className="bienestar-color-swatch" title="Color">
                  <input
                    type="color"
                    className="no-global"
                    value={newCategory.color}
                    onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                    disabled={categoryOverlay.busy}
                  />
                  <span style={{ backgroundColor: newCategory.color }} />
                </label>
              </div>
            </Field>
            <div className="field field--full">
              <span className="field__label">Icono</span>
              <div className="bienestar-icon-picker">
                {CATEGORY_ICON_OPTIONS.map((name) => {
                  const active = newCategory.icono === name
                  return (
                    <button
                      key={name}
                      type="button"
                      className={`bienestar-icon-picker__btn${active ? ' is-active' : ''}`}
                      onClick={() => setNewCategory({ ...newCategory, icono: name })}
                      aria-label={name}
                      aria-pressed={active}
                      disabled={categoryOverlay.busy}
                    >
                      <Icon name={resolveIconName(name, 'heart')} size={16} />
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="bienestar-cat-form-actions">
            {editingCategoryId ? (
              <Button
                type="button"
                variant="ghost"
                disabled={categoryOverlay.busy}
                onClick={() => {
                  setEditingCategoryId(null)
                  setNewCategory(emptyCategory())
                  categoryOverlay.reset()
                }}
              >
                Cancelar edición
              </Button>
            ) : null}
            {(editingCategoryId
              ? can('bienestar.change_categoriabienestar')
              : can('bienestar.add_categoriabienestar')) && (
              <Button
                type="submit"
                variant="primary"
                loading={categoryOverlay.busy}
                disabled={categoryOverlay.busy || categoryOverlay.active}
              >
                <Icon name="plus" size={16} />
                {editingCategoryId ? 'Actualizar' : 'Crear categoría'}
              </Button>
            )}
          </div>
        </form>

        <div className="bienestar-cat-list">
          <p className="bienestar-cat-list__title">
            Existentes ({categorias.length})
          </p>
          {categorias.length === 0 ? (
            <EmptyState title="Sin categorías" />
          ) : (
            <ul>
              {categorias.map((cat) => (
                <li key={cat.id} className="bienestar-cat-list__item">
                  <span
                    className="bienestar-cat-list__icon"
                    style={{ backgroundColor: `${cat.color}22`, color: cat.color }}
                  >
                    <Icon name={resolveIconName(cat.icono, 'heart')} size={16} />
                  </span>
                  <span className="bienestar-cat-list__name">{cat.nombre}</span>
                  <span className="bienestar-cat-list__actions">
                    {can('bienestar.change_categoriabienestar') ? (
                      <IconButton
                        aria-label="Editar"
                        disabled={categoryOverlay.busy}
                        onClick={() => handleEditCategory(cat)}
                      >
                        <Icon name="edit" size={14} />
                      </IconButton>
                    ) : null}
                    {can('bienestar.delete_categoriabienestar') ? (
                      <IconButton
                        danger
                        aria-label="Eliminar"
                        disabled={categoryOverlay.busy}
                        onClick={() => requestDeleteCategory(cat)}
                      >
                        <Icon name="trash" size={14} />
                      </IconButton>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteBenefit)}
        onClose={() => {
          if (!deleting) setDeleteBenefit(null)
        }}
        onConfirm={handleConfirmDeleteBenefit}
        title="Eliminar beneficio"
        description={
          deleteBenefit
            ? `¿Eliminar «${deleteBenefit.titulo}»? Esta acción no se puede deshacer.`
            : '¿Eliminar este beneficio?'
        }
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        cancelLabel="Cancelar"
        danger
      />

      <ConfirmModal
        open={Boolean(deleteCategory)}
        onClose={() => {
          if (!deleting) setDeleteCategory(null)
        }}
        onConfirm={handleConfirmDeleteCategory}
        title="Eliminar categoría"
        description={
          deleteCategory
            ? `¿Eliminar «${deleteCategory.nombre}»?`
            : '¿Eliminar esta categoría?'
        }
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        cancelLabel="Cancelar"
        danger
      />
    </>
  )
}

export default ConfigPanel
