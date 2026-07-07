import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Plus,
    GripVertical,
    Image as ImageIcon,
    File as FileIcon,
    Trash2,
    Heart,
    X,
    Upload,
    Check,
    Send,
    RotateCcw,
    Edit3,
    Loader2,
    FolderSearch,
    Tag,
    Star,
    Book,
    Coffee,
    Shield,
    Briefcase,
    GraduationCap,
    Utensils,
    Plane,
    Settings
} from 'lucide-react';

// --- Icon Map ---
const ICON_OPTIONS = [
    { name: 'Heart', icon: Heart },
    { name: 'Star', icon: Star },
    { name: 'Book', icon: Book },
    { name: 'Coffee', icon: Coffee },
    { name: 'Shield', icon: Shield },
    { name: 'Briefcase', icon: Briefcase },
    { name: 'GraduationCap', icon: GraduationCap },
    { name: 'Utensils', icon: Utensils },
    { name: 'Plane', icon: Plane },
];

const LucidIcon = ({ name, ...props }) => {
    const iconObj = ICON_OPTIONS.find(i => i.name === name);
    const IconComponent = iconObj ? iconObj.icon : Heart;
    return <IconComponent {...props} />;
};
import api from '../../api';
import { usePermission } from '../../hooks/usePermission';
import {
    TITLE_ICON_BOX, BTN_PRIMARY, BTN_SECONDARY, BTN_ICON_EDIT,
    INPUT_FORM, TEXTAREA_FORM, SELECT_FORM,
    MODAL_SHELL, MODAL_BACKDROP_LAYER, MODAL_PANEL, MODAL_PANEL_LG,
    DEFAULT_CATEGORY_COLOR, ICON_PICK_ACTIVE, ICON_PICK, CARD_HOVER,
    DND_GRIP, UPLOAD_ZONE, ADD_POSTIT_BTN, COLOR_SWATCH_HOVER,
} from './bienestarUi';

// --- Portal Component ---
const ModalPortal = ({ children }) => {
    return createPortal(children, document.body);
};

// --- Sortable Item (Refinado) ---
const SortableBenefit = ({ b, categorias, onDelete, onMove, onEdit }) => {
    const { can } = usePermission();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: b.id,
        disabled: !can('bienestar.change_beneficio')
    });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };

    return (
        <div ref={setNodeRef} style={style} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 group hover:shadow-xl transition-all relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: b.categoria_color }}></div>

            <div className="flex items-start justify-between mb-3 pl-1">
                <span className="px-2 py-0.5 rounded-full text-[8px] font-semibold uppercase tracking-wider text-white shadow-sm" style={{ backgroundColor: b.categoria_color }}>
                    {categorias.find(c => c.id === b.categoria)?.nombre}
                </span>
                <div className="flex items-center gap-1">
                    {can('bienestar.change_beneficio') && (
                        <>
                            <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(b); }} className={BTN_ICON_EDIT} title="Editar"><Edit3 className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); onMove(b.id, b.estado === 'BORRADOR' ? 'PUBLICADO' : 'BORRADOR'); }} className={`p-1.5 rounded-lg transition-colors active:scale-95 ${b.estado === 'BORRADOR' ? 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'}`} title={b.estado === 'BORRADOR' ? 'Publicar' : 'Volver a borrador'}>{b.estado === 'BORRADOR' ? <Send className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}</button>
                        </>
                    )}
                    {can('bienestar.delete_beneficio') && (
                        <button type="button" onClick={() => onDelete(b.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                    )}
                </div>
            </div>
            <h4 className="text-[11px] font-medium text-slate-700 uppercase tracking-tighter mb-1 leading-tight pl-1 line-clamp-2">{b.titulo}</h4>
            <p className="text-[10px] text-slate-400 line-clamp-2 mb-4 font-medium leading-relaxed pl-1 uppercase tracking-tighter">{b.descripcion}</p>
            <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-auto pl-1">
                <div className="flex items-center gap-2">
                    {b.archivos?.length > 0 && <div className="flex items-center gap-1 text-[8px] font-bold text-slate-300 uppercase tracking-widest"><FileIcon className="w-3 h-3" /> {b.archivos.length}</div>}
                    {b.estado === 'PUBLICADO' && <span className="text-[8px] font-medium text-slate-300 uppercase tracking-widest italic">{b.creado_por_nombre}</span>}
                </div>
                {can('bienestar.change_beneficio') && (
                    <div {...attributes} {...listeners} className={DND_GRIP}><GripVertical className="w-5 h-5" /></div>
                )}
            </div>
        </div>
    );
};


const WelfareBoard = () => {
    const [beneficios, setBeneficios] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editingCategoryId, setEditingCategoryId] = useState(null);
    const fileInputRef = useRef(null);
    const [newData, setNewData] = useState({ titulo: '', descripcion: '', categoria: '', estado: 'BORRADOR', tempFiles: [] });
    const [newCategory, setNewCategory] = useState({ nombre: '', icono: 'Heart', color: DEFAULT_CATEGORY_COLOR });

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    const fetchData = async () => {
        try {
            const [resB, resC] = await Promise.all([api.get('bienestar/beneficios/'), api.get('bienestar/categorias/')]);
            setBeneficios(resB.data.results || resB.data);
            setCategorias(resC.data.results || resC.data);
            if (resC.data.length > 0 && !newData.categoria) setNewData(prev => ({ ...prev, categoria: resC.data[0].id }));
        } catch (e) { console.error(e); }
    };

    const handleSaveCategory = async (e) => {
        e.preventDefault();
        const hasPerm = editingCategoryId ? can('bienestar.change_categoriabienestar') : can('bienestar.add_categoriabienestar');
        if (!hasPerm) return;
        try {
            if (editingCategoryId) {
                await api.patch(`bienestar/categorias/${editingCategoryId}/`, newCategory);
            } else {
                await api.post('bienestar/categorias/', newCategory);
            }
            setNewCategory({ nombre: '', icono: 'Heart', color: DEFAULT_CATEGORY_COLOR });
            setEditingCategoryId(null);
            fetchData();
        } catch (e) {
            console.error("Error saving category", e);
            alert("Error al guardar la categoría");
        }
    };

    const handleEditCategory = (cat) => {
        setEditingCategoryId(cat.id);
        setNewCategory({ nombre: cat.nombre, icono: cat.icono || 'Heart', color: cat.color });
    };

    const handleDeleteCategory = async (id) => {
        if (!can('bienestar.delete_categoriabienestar')) return;
        // Verificar si hay beneficios que usan esta categoría
        const isUsed = beneficios.some(b => b.categoria === id);
        if (isUsed) {
            alert("No se puede eliminar la categoría porque tiene Post-its asociados. Por favor, elimine o cambie la categoría de esos Post-its primero.");
            return;
        }

        if (!window.confirm("¿Está seguro que desea eliminar esta categoría?")) return;
        try {
            await api.delete(`bienestar/categorias/${id}/`);
            fetchData();
        } catch (e) {
            console.error("Error deleting category", e);
            alert("Error al eliminar la categoría");
        }
    };

    useEffect(() => { fetchData(); }, []);

    const openEdit = (benefit) => {
        setEditingId(benefit.id);
        setNewData({ titulo: benefit.titulo, descripcion: benefit.descripcion, categoria: benefit.categoria, estado: benefit.estado, tempFiles: [] });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        const hasPerm = editingId ? can('bienestar.change_beneficio') : can('bienestar.add_beneficio');
        if (!hasPerm) return;
        if (!newData.titulo || !newData.categoria) { alert("Título y Categoría son obligatorios"); return; }
        setLoading(true);
        try {
            const postData = { titulo: newData.titulo, descripcion: newData.descripcion, categoria: parseInt(newData.categoria), estado: newData.estado };
            let res;
            if (editingId) res = await api.patch(`bienestar/beneficios/${editingId}/`, postData);
            else res = await api.post('bienestar/beneficios/', postData);
            if (newData.tempFiles.length > 0) {
                for (const file of newData.tempFiles) {
                    const formData = new FormData();
                    formData.append('beneficio', res.data.id);
                    formData.append('archivo', file);
                    formData.append('tipo', file.type.startsWith('image/') ? 'image' : 'pdf');
                    formData.append('nombre', file.name);
                    await api.post('bienestar/archivos/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                }
            }
            fetchData();
            setIsModalOpen(false);
            setEditingId(null);
            setNewData({ titulo: '', descripcion: '', categoria: categorias[0]?.id, estado: 'BORRADOR', tempFiles: [] });
        } catch (e) { alert("Error: " + JSON.stringify(e.response?.data || "Desconocido")); } finally { setLoading(false); }
    };

    const handleMove = async (id, newStatus) => {
        if (!can('bienestar.change_beneficio')) return;
        setBeneficios(prev => prev.map(b => b.id === id ? { ...b, estado: newStatus } : b));
        try { await api.patch(`bienestar/beneficios/${id}/`, { estado: newStatus }); } catch (e) { fetchData(); }
    };

    const handleDelete = async (id) => {
        if (!can('bienestar.delete_beneficio')) return;
        if (!window.confirm("¿Eliminar este beneficio?")) return;
        try { await api.delete(`bienestar/beneficios/${id}/`); setBeneficios(prev => prev.filter(b => b.id !== id)); } catch (e) { console.error(e); }
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over) return;
        const activeItem = beneficios.find(b => b.id === active.id);
        const overCol = over.id === 'BORRADOR' || over.id === 'PUBLICADO' ? over.id : beneficios.find(b => b.id === over.id)?.estado;
        if (activeItem && overCol && activeItem.estado !== overCol) handleMove(activeItem.id, overCol);
    };

    const { can } = usePermission();

    return (
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden">
            <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className={TITLE_ICON_BOX}>
                        <Settings className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase select-none line-clamp-2">
                            Gestión de Bienestar
                        </h2>
                        <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-1.5 select-none">
                            Tablero de post-its y publicaciones
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto md:overflow-visible shrink-0">
                    {can('bienestar.add_categoriabienestar') && (
                        <button
                            type="button"
                            onClick={() => setCategoryModalOpen(true)}
                            className={`${BTN_SECONDARY} whitespace-nowrap`}
                        >
                            <Tag className="w-4 h-4" /> Categorías
                        </button>
                    )}
                    {can('bienestar.add_beneficio') && (
                        <button
                            type="button"
                            onClick={() => { setEditingId(null); setIsModalOpen(true); }}
                            className={`${BTN_PRIMARY} whitespace-nowrap`}
                        >
                            <Plus className="w-4 h-4" /> Nuevo Post-it
                        </button>
                    )}
                </div>
            </div>


            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-y-auto lg:overflow-x-auto lg:overflow-y-hidden pb-4 px-1 custom-scrollbar scroll-smooth">
                    {['BORRADOR', 'PUBLICADO'].map(colId => (
                        <div key={colId} className={`${colId === 'BORRADOR' ? 'lg:flex-[1] lg:min-w-[320px]' : 'lg:flex-[2] lg:min-w-[600px]'} w-full lg:w-auto bg-slate-50 border border-slate-100 rounded-[1.5rem] sm:rounded-[2.5rem] flex flex-col p-4 sm:p-6 shadow-sm min-h-[400px] lg:min-h-0 shrink-0`}>
                            <div className="flex items-center justify-between mb-4 sm:mb-6 px-2 sm:px-4">
                                <h3 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    {colId === 'BORRADOR' ? <><FileIcon className="w-3.5 h-3.5" /> Borradores</> : <><Send className="w-3.5 h-3.5 text-emerald-500" /> Publicados</>}
                                </h3>
                                <div className="bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-100 text-[10px] font-bold text-slate-400">
                                    {beneficios.filter(b => b.estado === colId).length}
                                </div>
                            </div>
                            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar lg:max-h-full">
                                <SortableContext items={beneficios.filter(b => b.estado === colId)} strategy={verticalListSortingStrategy}>
                                    {beneficios.filter(b => b.estado === colId).map(b => (
                                        <SortableBenefit key={b.id} b={b} categorias={categorias} onDelete={handleDelete} onMove={handleMove} onEdit={openEdit} />
                                    ))}
                                </SortableContext>
                                {can('bienestar.add_beneficio') && (
                                    <button type="button" onClick={() => { setEditingId(null); setNewData({ ...newData, estado: colId }); setIsModalOpen(true); }} className={ADD_POSTIT_BTN}>
                                        <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Añadir Post-it</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </DndContext>

            <ModalPortal>
                <AnimatePresence>
                    {isModalOpen && (
                        <div className={MODAL_SHELL}>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !loading && setIsModalOpen(false)} className={MODAL_BACKDROP_LAYER} />
                            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} onClick={(e) => e.stopPropagation()} className={`${MODAL_PANEL_LG} max-h-[95vh]`}>
                                <div className="bg-slate-50 border-b border-slate-100 p-4 md:p-6 flex items-center justify-between gap-4 shrink-0">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={TITLE_ICON_BOX}>
                                            <Settings className="w-4 h-4" />
                                        </div>
                                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{editingId ? 'Editar Post-it' : 'Nuevo Post-it'}</h3>
                                    </div>
                                    <button type="button" disabled={loading} onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors"><X className="w-5 h-5" /></button>
                                </div>
                                <div className="p-4 md:p-6 space-y-4 overflow-y-auto custom-scrollbar">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Título del Anuncio</label>
                                        <input type="text" placeholder="Ej: Nuevo Convenio Dental" value={newData.titulo} onChange={e => setNewData({ ...newData, titulo: e.target.value })} className={INPUT_FORM} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Descripción / Cuerpo</label>
                                        <textarea placeholder="Cuéntales más detalles..." rows="6" value={newData.descripcion} onChange={e => setNewData({ ...newData, descripcion: e.target.value })} className={`${TEXTAREA_FORM} min-h-[150px] text-slate-700`} />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Categoría</label>
                                            <select value={newData.categoria} onChange={e => setNewData({ ...newData, categoria: e.target.value })} className={`${SELECT_FORM} pr-8`}>
                                                <option value="">Selecciona...</option>
                                                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Estado Inicial</label>
                                            <select value={newData.estado} onChange={e => setNewData({ ...newData, estado: e.target.value })} className={`${SELECT_FORM} pr-8`}>
                                                <option value="BORRADOR">Como Borrador</option>
                                                <option value="PUBLICADO">Publicar Ahora</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div onClick={() => !loading && fileInputRef.current?.click()} className={UPLOAD_ZONE}>
                                        <input type="file" ref={fileInputRef} onChange={e => setNewData(p => ({ ...p, tempFiles: [...p.tempFiles, ...Array.from(e.target.files)] }))} multiple hidden />
                                        <Upload className="w-6 h-6 text-slate-200 group-hover:text-blue-400 transition-all mb-1" />
                                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Documentos o Imágenes</p>
                                    </div>

                                    {newData.tempFiles.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {newData.tempFiles.map((f, i) => (
                                                <div key={i} className="bg-emerald-50 text-emerald-600 text-[8px] sm:text-[9px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                                                    <Check className="w-2.5 h-2.5" /> {f.name.slice(0, 15)}...
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <button type="button" disabled={loading || !newData.titulo} onClick={handleSave} className={`w-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shrink-0 ${loading ? 'bg-slate-200 text-slate-400 h-10' : BTN_PRIMARY}`}>
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" />{editingId ? 'Guardar Cambios' : 'Crear Post-it'}</>}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </ModalPortal>

            {/* Modal de Gestión de Categorías */}
            <ModalPortal>
                <AnimatePresence>
                    {isCategoryModalOpen && (
                        <div className={MODAL_SHELL}>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCategoryModalOpen(false)} className={MODAL_BACKDROP_LAYER} />
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className={MODAL_PANEL}>
                                <div className="bg-slate-50 border-b border-slate-100 p-4 md:p-6 flex items-center justify-between gap-4 shrink-0">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={TITLE_ICON_BOX}>
                                            <Tag className="w-4 h-4" />
                                        </div>
                                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{editingCategoryId ? 'Editar Categoría' : 'Gestionar Categorías'}</h3>
                                    </div>
                                    <button type="button" onClick={() => { setCategoryModalOpen(false); setEditingCategoryId(null); setNewCategory({ nombre: '', icono: 'Heart', color: DEFAULT_CATEGORY_COLOR }); }} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors shrink-0"><X className="w-5 h-5" /></button>
                                </div>
                                <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-5 min-h-0">
                                    <form onSubmit={handleSaveCategory} className="space-y-4 shrink-0">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nombre</label>
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    type="text"
                                                    placeholder="Ej: Salud"
                                                    className={`${INPUT_FORM} flex-1 text-slate-700`}
                                                    value={newCategory.nombre}
                                                    onChange={e => setNewCategory({ ...newCategory, nombre: e.target.value })}
                                                    required
                                                />
                                                <div className="relative w-10 h-10 shrink-0 group" title="Color de categoría">
                                                    <input
                                                        type="color"
                                                        className="no-global absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 p-0 border-0"
                                                        value={newCategory.color}
                                                        onChange={e => setNewCategory({ ...newCategory, color: e.target.value })}
                                                    />
                                                    <div
                                                        className={`w-full h-full rounded-xl border border-slate-200 shadow-sm transition-all ${COLOR_SWATCH_HOVER}`}
                                                        style={{ backgroundColor: newCategory.color }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Icono representativo</label>
                                            <div className="grid grid-cols-5 gap-2">
                                                {ICON_OPTIONS.map(opt => (
                                                    <button
                                                        key={opt.name}
                                                        type="button"
                                                        onClick={() => setNewCategory({ ...newCategory, icono: opt.name })}
                                                        className={`h-10 rounded-xl border transition-all flex items-center justify-center ${newCategory.icono === opt.name ? ICON_PICK_ACTIVE : ICON_PICK}`}
                                                    >
                                                        <opt.icon className="w-4 h-4" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-1">
                                            {editingCategoryId && (
                                                <button type="button" onClick={() => { setEditingCategoryId(null); setNewCategory({ nombre: '', icono: 'Heart', color: DEFAULT_CATEGORY_COLOR }); }} className={`flex-1 ${BTN_SECONDARY}`}>Cancelar</button>
                                            )}
                                            <button type="submit" className={`${editingCategoryId ? 'flex-1' : 'w-full'} ${BTN_PRIMARY}`}>
                                                <Plus className="w-4 h-4" />
                                                {editingCategoryId ? 'Actualizar' : 'Crear Categoría'}
                                            </button>
                                        </div>
                                    </form>

                                    <div className="flex flex-col min-h-0 flex-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 shrink-0">
                                            Categorías existentes ({categorias.length})
                                        </p>
                                        <div className="flex-1 min-h-[180px] max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
                                            {categorias.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-10 text-center h-full">
                                                    <FolderSearch className="w-10 h-10 text-slate-200 mb-3" />
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No se encontraron categorías</span>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {categorias.map(cat => (
                                                        <div key={cat.id} className={`flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl ${CARD_HOVER} transition-all`}>
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center shrink-0" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                                                                    <LucidIcon name={cat.icono} className="w-4 h-4" />
                                                                </div>
                                                                <span className="text-[11px] font-medium text-slate-700 uppercase tracking-tighter truncate">{cat.nombre}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                {can('bienestar.change_categoriabienestar') && (
                                                                    <button type="button" onClick={() => handleEditCategory(cat)} className={BTN_ICON_EDIT} title="Editar"><Edit3 className="w-3.5 h-3.5" /></button>
                                                                )}
                                                                {can('bienestar.delete_categoriabienestar') && (
                                                                    <button type="button" onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </ModalPortal>
        </div>
    );
};

export default WelfareBoard;
