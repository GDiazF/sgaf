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
    Edit3
} from 'lucide-react';
import api from '../../api';
import { usePermission } from '../../hooks/usePermission';

// --- Portal Component para limpieza total ---
const ModalPortal = ({ children }) => {
    return createPortal(children, document.body);
};

// --- Sortable Item ---
const SortableBenefit = ({ b, categorias, onDelete, onMove, onEdit }) => {
    const { can } = usePermission();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
        id: b.id,
        disabled: !can('bienestar.change_beneficio') 
    });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };

    return (
        <div ref={setNodeRef} style={style} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 group hover:shadow-2xl transition-all relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: b.categoria_color }}></div>
            
            <div className="flex items-start justify-between mb-4">
                <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-sm" style={{ backgroundColor: b.categoria_color }}>
                    {categorias.find(c => c.id === b.categoria)?.nombre}
                </span>
                <div className="flex items-center gap-1">
                    {can('bienestar.change_beneficio') && (
                        <>
                            <button onClick={(e) => { e.stopPropagation(); onEdit(b); }} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><Edit3 className="w-4 h-4" /></button>
                            <button onClick={(e) => { e.stopPropagation(); onMove(b.id, b.estado === 'BORRADOR' ? 'PUBLICADO' : 'BORRADOR'); }} className={`p-2 rounded-xl transition-all active:scale-90 ${b.estado === 'BORRADOR' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-600 hover:text-white'}`}>{b.estado === 'BORRADOR' ? <Send className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}</button>
                        </>
                    )}
                    {can('bienestar.delete_beneficio') && (
                        <button onClick={() => onDelete(b.id)} className="p-2 hover:bg-rose-50 rounded-xl text-rose-400"><Trash2 className="w-4 h-4" /></button>
                    )}
                </div>
            </div>
            <h4 className="font-bold text-slate-800 mb-2 leading-tight text-lg">{b.titulo}</h4>
            <p className="text-xs text-slate-500 line-clamp-2 mb-6 font-medium leading-relaxed">{b.descripcion}</p>
            <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-auto">
                <div className="flex flex-col gap-1">
                    {b.archivos?.length > 0 && <div className="flex items-center gap-1.5 text-[9px] font-black text-indigo-500 bg-indigo-50/50 px-3 py-1.5 rounded-xl w-fit"><FileIcon className="w-3 h-3" /> {b.archivos.length}</div>}
                    {b.estado === 'PUBLICADO' && <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1">Ed. {b.creado_por_nombre}</span>}
                </div>
                {can('bienestar.change_beneficio') && (
                    <div {...attributes} {...listeners} className="text-slate-200 hover:text-indigo-400 cursor-grab active:cursor-grabbing p-1"><GripVertical className="w-6 h-6" /></div>
                )}
            </div>
        </div>
    );
};


const WelfareBoard = () => {
    const [beneficios, setBeneficios] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const fileInputRef = useRef(null);
    const [newData, setNewData] = useState({ titulo: '', descripcion: '', categoria: '', estado: 'BORRADOR', tempFiles: [] });

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    const fetchData = async () => {
        try {
            const [resB, resC] = await Promise.all([api.get('bienestar/beneficios/'), api.get('bienestar/categorias/')]);
            setBeneficios(resB.data.results || resB.data);
            setCategorias(resC.data.results || resC.data);
            if (resC.data.length > 0 && !newData.categoria) setNewData(prev => ({ ...prev, categoria: resC.data[0].id }));
        } catch (e) { console.error(e); }
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
        <div className="h-[calc(100vh-180px)] flex flex-col space-y-6 relative">
            <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-rose-50 rounded-[2.2rem] flex items-center justify-center shadow-sm"><Heart className="w-8 h-8 text-rose-500 fill-rose-500" /></div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Bienestar SLEP</h2>
                </div>
                {can('bienestar.add_beneficio') && (
                    <button onClick={() => { setEditingId(null); setIsModalOpen(true); }} className="bg-slate-900 text-white px-8 py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-2xl flex items-center gap-3">
                        <Plus className="w-5 h-5" /> Nuevo Post-it
                    </button>
                )}
            </div>


            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className="flex-1 flex gap-10 overflow-x-auto pb-8 custom-scrollbar scroll-smooth">
                    {['BORRADOR', 'PUBLICADO'].map(colId => (
                        <div key={colId} className={`${colId === 'BORRADOR' ? 'flex-[0.5] min-w-[280px]' : 'flex-[1.5] min-w-[550px]'} bg-slate-100/30 rounded-[4rem] border border-white/50 flex flex-col p-8 shadow-inner backdrop-blur-sm transition-all`}>
                            <div className="flex items-center justify-between mb-8 px-6 text-[12px] font-black uppercase tracking-[0.3em] text-slate-400">
                                <h3 className="flex items-center gap-3">{colId === 'BORRADOR' ? <><FileIcon className="w-4 h-4" /> Borradores</> : <><Send className="w-4 h-4 text-emerald-500" /> Publicados</>}</h3>
                                <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100">{beneficios.filter(b => b.estado === colId).length}</div>
                            </div>
                            <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                                <SortableContext items={beneficios.filter(b => b.estado === colId)} strategy={verticalListSortingStrategy}>
                                    {beneficios.filter(b => b.estado === colId).map(b => (
                                        <SortableBenefit key={b.id} b={b} categorias={categorias} onDelete={handleDelete} onMove={handleMove} onEdit={openEdit} />
                                    ))}
                                </SortableContext>
                                <button onClick={() => { setEditingId(null); setNewData({...newData, estado: colId}); setIsModalOpen(true); }} className="w-full py-8 border-4 border-dashed border-slate-200 rounded-[3rem] text-slate-300 flex flex-col items-center justify-center gap-2 hover:border-indigo-200 hover:text-indigo-400 hover:bg-white/50 transition-all group"><Plus className="w-8 h-8 group-hover:rotate-90 transition-transform" /><span className="text-[10px] font-black uppercase tracking-[0.2em]">Añadir Post-it</span></button>
                            </div>
                        </div>
                    ))}
                </div>
            </DndContext>

            {/* USANDO PORTAL PARA ELIMINAR CUALQUIER SALTO O FRANJA BLANCA */}
            <ModalPortal>
                <AnimatePresence>
                    {isModalOpen && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !loading && setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-10 overflow-hidden">
                                <div className="flex items-center justify-between mb-8"><h3 className="text-2xl font-black text-slate-900 leading-none">{editingId ? 'Editar Post-it' : 'Nuevo Post-it'}</h3><button disabled={loading} onClick={() => setIsModalOpen(false)}><X className="w-6 h-6 text-slate-300" /></button></div>
                                <div className="space-y-5">
                                    <input type="text" placeholder="Título" value={newData.titulo} onChange={e => setNewData({...newData, titulo: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800" />
                                    <textarea placeholder="Descripción..." rows="3" value={newData.descripcion} onChange={e => setNewData({...newData, descripcion: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-600" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <select value={newData.categoria} onChange={e => setNewData({...newData, categoria: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold appearance-none"><option value="">Selecciona Categoría</option>{categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                                        <select value={newData.estado} onChange={e => setNewData({...newData, estado: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold appearance-none"><option value="BORRADOR">Como Borrador</option><option value="PUBLICADO">Publicar Inmediato</option></select>
                                    </div>
                                    <div onClick={() => fileInputRef.current?.click()} className="border-4 border-dashed border-slate-100 rounded-[2.5rem] p-8 flex flex-col items-center justify-center gap-2 hover:border-indigo-200 transition-all cursor-pointer group"><input type="file" ref={fileInputRef} onChange={e => setNewData(p => ({ ...p, tempFiles: [...p.tempFiles, ...Array.from(e.target.files)] }))} multiple hidden /><Upload className="w-10 h-10 text-slate-200 group-hover:text-indigo-400 transition-all" /><p className="text-xs font-black text-slate-400 uppercase tracking-widest">Añadir archivos</p></div>
                                    {newData.tempFiles.length > 0 && <div className="flex flex-wrap gap-2">{newData.tempFiles.map((f, i) => <div key={i} className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-3 py-1 rounded-full"><Check className="w-3 h-3 inline mr-1" /> {f.name}</div>)}</div>}
                                    <button disabled={loading || !newData.titulo} onClick={handleSave} className={`w-full py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl transition-all ${loading ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-emerald-600 shadow-emerald-100'}`}>{loading ? 'Guardando...' : editingId ? 'Actualizar Cambios' : 'CREAR POST'}</button>
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
