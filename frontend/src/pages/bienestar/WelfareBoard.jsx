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
    Tag,
    Save,
    Star,
    Book,
    Coffee,
    Shield,
    Briefcase,
    GraduationCap,
    Utensils,
    Plane
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
                            <button onClick={(e) => { e.stopPropagation(); onEdit(b); }} className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-900 hover:text-white transition-all"><Edit3 className="w-3.5 h-3.5" /></button>
                            <button onClick={(e) => { e.stopPropagation(); onMove(b.id, b.estado === 'BORRADOR' ? 'PUBLICADO' : 'BORRADOR'); }} className={`p-1.5 rounded-lg transition-all active:scale-95 ${b.estado === 'BORRADOR' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white'}`}>{b.estado === 'BORRADOR' ? <Send className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}</button>
                        </>
                    )}
                    {can('bienestar.delete_beneficio') && (
                        <button onClick={() => onDelete(b.id)} className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-300 hover:text-rose-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    )}
                </div>
            </div>
            <h4 className="font-bold text-slate-800 mb-1 leading-tight text-sm pl-1">{b.titulo}</h4>
            <p className="text-[10px] text-slate-400 line-clamp-2 mb-4 font-medium leading-relaxed pl-1">{b.descripcion}</p>
            <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-auto pl-1">
                <div className="flex items-center gap-2">
                    {b.archivos?.length > 0 && <div className="flex items-center gap-1 text-[8px] font-bold text-slate-300 uppercase tracking-widest"><FileIcon className="w-3 h-3" /> {b.archivos.length}</div>}
                    {b.estado === 'PUBLICADO' && <span className="text-[8px] font-medium text-slate-300 uppercase tracking-widest italic">{b.creado_por_nombre}</span>}
                </div>
                {can('bienestar.change_beneficio') && (
                    <div {...attributes} {...listeners} className="text-slate-100 hover:text-indigo-300 cursor-grab active:cursor-grabbing p-1"><GripVertical className="w-5 h-5" /></div>
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
    const [newCategory, setNewCategory] = useState({ nombre: '', icono: 'Heart', color: '#6366f1' });

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
        try {
            if (editingCategoryId) {
                await api.patch(`bienestar/categorias/${editingCategoryId}/`, newCategory);
            } else {
                await api.post('bienestar/categorias/', newCategory);
            }
            setNewCategory({ nombre: '', icono: 'Heart', color: '#6366f1' });
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
        setBeneficios(prev => prev.map(b => b.id === id ? { ...b, estado: newStatus } : b));
        try { await api.patch(`bienestar/beneficios/${id}/`, { estado: newStatus }); } catch (e) { fetchData(); }
    };

    const handleDelete = async (id) => {
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
        <div className="h-[calc(100vh-170px)] sm:h-[calc(100vh-180px)] flex flex-col space-y-4 overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 pt-4 gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500 shadow-sm shrink-0"><Heart className="w-5 h-5 fill-rose-500/10" /></div>
                    <div className="flex flex-col min-w-0">
                        <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight leading-none mb-1 truncate">Muro de Comunicaciones</h2>
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest truncate">Tablero de Gestión</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 scrollbar-hide">
                    {can('bienestar.add_categoriabienestar') && (
                        <button
                            onClick={() => setCategoryModalOpen(true)}
                            className="bg-white border border-slate-200 text-slate-700 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold uppercase tracking-wider text-[9px] sm:text-[10px] hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 active:scale-95 whitespace-nowrap"
                        >
                            <Tag className="w-3.5 h-3.5 text-indigo-500" /> Categorías
                        </button>
                    )}
                    {can('bienestar.add_beneficio') && (
                        <button onClick={() => { setEditingId(null); setIsModalOpen(true); }} className="bg-slate-900 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold uppercase tracking-wider text-[9px] sm:text-[10px] hover:bg-rose-500 transition-all shadow-lg flex items-center gap-2 active:scale-95 whitespace-nowrap">
                            <Plus className="w-3.5 h-3.5" /> Nuevo Post-it
                        </button>
                    )}
                </div>
            </div>


            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-y-auto lg:overflow-x-auto lg:overflow-y-hidden pb-4 px-4 sm:px-6 custom-scrollbar scroll-smooth">
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
                                <button onClick={() => { setEditingId(null); setNewData({ ...newData, estado: colId }); setIsModalOpen(true); }} className="w-full py-6 border-2 border-dashed border-slate-200 rounded-[1.5rem] sm:rounded-[1.8rem] text-slate-300 flex flex-col items-center justify-center gap-1 hover:border-indigo-200 hover:text-indigo-400 hover:bg-white/50 transition-all group">
                                    <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Añadir Post-it</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </DndContext>

            <ModalPortal>
                <AnimatePresence>
                    {isModalOpen && (
                        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !loading && setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-2xl rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
                                <div className="p-4 sm:p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50 shrink-0">
                                    <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-none">{editingId ? 'Editar Post-it' : 'Nuevo Post-it'}</h3>
                                    <button disabled={loading} onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all"><X className="w-5 h-5 text-slate-400" /></button>
                                </div>
                                <div className="p-4 sm:p-8 space-y-4 sm:space-y-5 overflow-y-auto custom-scrollbar">
                                    <div className="space-y-1">
                                        <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Título del Anuncio</label>
                                        <input type="text" placeholder="Ej: Nuevo Convenio Dental" value={newData.titulo} onChange={e => setNewData({ ...newData, titulo: e.target.value })} className="w-full bg-slate-50 border-none rounded-xl p-3 sm:p-3.5 font-semibold text-slate-700 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-100 transition-all text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Descripción / Cuerpo</label>
                                        <textarea placeholder="Cuéntales más detalles..." rows="6" value={newData.descripcion} onChange={e => setNewData({ ...newData, descripcion: e.target.value })} className="w-full bg-slate-50 border-none rounded-xl p-4 text-slate-600 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-100 transition-all text-sm leading-relaxed min-h-[150px] sm:min-h-[200px]" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
                                            <select value={newData.categoria} onChange={e => setNewData({ ...newData, categoria: e.target.value })} className="w-full bg-slate-50 border-none rounded-xl p-3 sm:p-3.5 font-semibold text-slate-700 appearance-none cursor-pointer text-sm">
                                                <option value="">Selecciona...</option>
                                                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Estado Inicial</label>
                                            <select value={newData.estado} onChange={e => setNewData({ ...newData, estado: e.target.value })} className="w-full bg-slate-50 border-none rounded-xl p-3 sm:p-3.5 font-semibold text-slate-700 appearance-none cursor-pointer text-sm">
                                                <option value="BORRADOR">Como Borrador</option>
                                                <option value="PUBLICADO">Publicar Ahora</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div onClick={() => !loading && fileInputRef.current?.click()} className="border-2 border-dashed border-slate-100 rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center gap-1 hover:border-indigo-200 hover:bg-slate-50 transition-all cursor-pointer group">
                                        <input type="file" ref={fileInputRef} onChange={e => setNewData(p => ({ ...p, tempFiles: [...p.tempFiles, ...Array.from(e.target.files)] }))} multiple hidden />
                                        <Upload className="w-6 h-6 text-slate-200 group-hover:text-indigo-400 transition-all mb-1" />
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

                                    <button disabled={loading || !newData.titulo} onClick={handleSave} className={`w-full py-3.5 sm:py-4 rounded-xl font-bold text-[10px] sm:text-[11px] uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-2 shrink-0 ${loading ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-indigo-600 active:scale-95'}`}>
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? 'Guardar Cambios' : 'Crear Post-it'}
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
                        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-2 sm:p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCategoryModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-[1.5rem] sm:rounded-[2rem] shadow-2xl overflow-hidden text-left flex flex-col max-h-[90vh]">
                                <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                                    <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-widest leading-none">{editingCategoryId ? 'Editar Categoría' : 'Gestionar Categorías'}</h3>
                                    <button onClick={() => { setCategoryModalOpen(false); setEditingCategoryId(null); setNewCategory({ nombre: '', icono: 'Heart', color: '#6366f1' }); }} className="p-2 hover:bg-slate-100 rounded-full transition-all"><X className="w-5 h-5 text-slate-400" /></button>
                                </div>
                                <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
                                    <form onSubmit={handleSaveCategory} className="mb-4 space-y-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre y Color</label>
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    type="text"
                                                    placeholder="Ej: Salud"
                                                    className="flex-1 px-4 h-11 bg-white border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                                                    value={newCategory.nombre}
                                                    onChange={e => setNewCategory({ ...newCategory, nombre: e.target.value })}
                                                    required
                                                />
                                                <div className="relative w-11 h-11 shrink-0 group">
                                                    <input
                                                        type="color"
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                        value={newCategory.color}
                                                        onChange={e => setNewCategory({ ...newCategory, color: e.target.value })}
                                                        title="Elegir Color"
                                                    />
                                                    <div
                                                        className="w-full h-full rounded-xl border border-slate-100 shadow-sm transition-all group-hover:scale-105 group-hover:shadow-md"
                                                        style={{ backgroundColor: newCategory.color }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Icono Representativo</label>
                                            <div className="grid grid-cols-5 gap-2">
                                                {ICON_OPTIONS.map(opt => (
                                                    <button
                                                        key={opt.name}
                                                        type="button"
                                                        onClick={() => setNewCategory({ ...newCategory, icono: opt.name })}
                                                        className={`p-2 rounded-xl border-2 transition-all flex items-center justify-center ${newCategory.icono === opt.name ? 'border-indigo-500 bg-indigo-50 text-indigo-600 scale-105' : 'border-white bg-white text-slate-300 hover:border-slate-200'}`}
                                                    >
                                                        <opt.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            {editingCategoryId && (
                                                <button type="button" onClick={() => { setEditingCategoryId(null); setNewCategory({ nombre: '', icono: 'Heart', color: '#6366f1' }); }} className="flex-1 py-2.5 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 transition-all font-bold uppercase tracking-widest text-[9px]">Cancelar</button>
                                            )}
                                            <button type="submit" className="flex-[2] py-2.5 bg-slate-900 text-white rounded-xl hover:bg-indigo-600 transition-all font-bold uppercase tracking-widest text-[9px] shadow-lg flex items-center justify-center gap-2">
                                                {editingCategoryId ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                                {editingCategoryId ? 'Actualizar' : 'Crear Categoría'}
                                            </button>
                                        </div>
                                    </form>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between px-1">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Existentes ({categorias.length})</p>
                                        </div>
                                        <div className="space-y-2 h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                            {categorias.map(cat => (
                                                <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-2xl group transition-all hover:bg-white hover:shadow-sm">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl shadow-sm flex items-center justify-center" style={{ backgroundColor: cat.color + '20', color: cat.color }}>
                                                            <LucidIcon name={cat.icono} className="w-4 h-4" />
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-700">{cat.nombre}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => handleEditCategory(cat)} className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit3 className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {categorias.length === 0 && (
                                            <div className="py-10 text-center">
                                                <Tag className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                                <p className="text-[10px] font-bold text-slate-300 uppercase">Sin categorías</p>
                                            </div>
                                        )}
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
