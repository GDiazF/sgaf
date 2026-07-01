import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Save, X, Info, ArrowLeft, Loader2, FolderSearch, Tags } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import api from '../../api';
import { BTN_BLUE, BTN_BLUE_FULL, INPUT_FORM, TEXTAREA_FORM, BTN_ICON_EDIT, LOADER_SPIN, INFO_BANNER, INFO_BANNER_ICON, TITLE_ICON_BOX } from './ticketsUi';

const CategoryManagement = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ nombre: '', descripcion: '', activo: true });

    const fetchCategories = async (isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const res = await api.get('tickets/categorias/');
            setCategories(res.data.results || res.data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories(true);
    }, []);

    const handleEdit = (cat) => {
        setFormData({ nombre: cat.nombre, descripcion: cat.descripcion, activo: cat.activo });
        setEditingId(cat.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar esta categoría? Se recomienda desactivarla en su lugar si tiene tickets asociados.')) return;
        try {
            await api.delete(`tickets/categorias/${id}/`);
            fetchCategories(false);
        } catch (error) {
            alert('Error al eliminar. Probablemente existan tickets vinculados a esta categoría.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (editingId) {
                await api.put(`tickets/categorias/${editingId}/`, formData);
            } else {
                await api.post('tickets/categorias/', formData);
            }
            setShowForm(false);
            setEditingId(null);
            setFormData({ nombre: '', descripcion: '', activo: true });
            fetchCategories(false);
        } catch (error) {
            console.error('Error saving category:', error);
            alert('Error al guardar la categoría.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden">
            <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                <div className="flex items-start gap-3 min-w-0">
                    <Link
                        to="/tickets"
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors shrink-0 h-10 w-10 flex items-center justify-center"
                        title="Volver"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className={TITLE_ICON_BOX}>
                            <Tags className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase select-none">
                            Categorías de Tickets
                        </h2>
                        <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-1.5">
                            Clasificación de solicitudes en mesa de ayuda
                        </p>
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => { setShowForm(true); setEditingId(null); setFormData({ nombre: '', descripcion: '', activo: true }); }}
                    className={BTN_BLUE}
                >
                    <Plus className="w-4 h-4" />
                    Nueva Categoría
                </button>
            </div>

            <div className="flex flex-1 min-h-0 gap-4 overflow-hidden">
                <AnimatePresence>
                    {showForm && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="w-full max-w-sm shrink-0 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col overflow-y-auto custom-scrollbar"
                        >
                            <div className="flex items-center justify-between mb-4 shrink-0">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {editingId ? 'Editar Categoría' : 'Nueva Categoría'}
                                </h3>
                                <button type="button" onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4 flex flex-col flex-1">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nombre</label>
                                    <input
                                        required
                                        type="text"
                                        className={INPUT_FORM}
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Descripción</label>
                                    <textarea
                                        rows={4}
                                        className={TEXTAREA_FORM}
                                        value={formData.descripcion}
                                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <input
                                        type="checkbox"
                                        id="activo"
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        checked={formData.activo}
                                        onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                                    />
                                    <label htmlFor="activo" className="text-[10px] font-medium text-slate-600 uppercase tracking-tighter cursor-pointer">
                                        Categoría activa
                                    </label>
                                </div>

                                <button
                                    disabled={isSaving}
                                    type="submit"
                                    className={`mt-auto ${BTN_BLUE_FULL}`}
                                >
                                    <Save className="w-4 h-4" />
                                    {isSaving ? 'Guardando...' : 'Guardar'}
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex flex-col flex-1 min-h-0 gap-3 overflow-hidden">
                    <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                        <div className="overflow-auto flex-1 bg-white custom-scrollbar">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center p-12 h-full flex-1 gap-3 min-h-[200px]">
                                    <Loader2 className={LOADER_SPIN} />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cargando Datos...</span>
                                </div>
                            ) : categories.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-12 text-center h-full flex-1 min-h-[200px]">
                                    <FolderSearch className="w-10 h-10 text-slate-200 mb-3" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No se encontraron registros</span>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse border-spacing-0">
                                    <thead className="sticky top-0 z-10">
                                        <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-200 select-none shadow-sm">
                                            <th className="px-4 py-3 align-middle border-r border-slate-100">Categoría</th>
                                            <th className="px-4 py-3 align-middle border-r border-slate-100">Descripción</th>
                                            <th className="px-4 py-3 align-middle border-r border-slate-100 text-center w-28">Estado</th>
                                            <th className="px-4 py-3 align-middle text-center w-24">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {categories.map((cat) => (
                                            <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-4 py-3 align-middle border-r border-slate-50">
                                                    <span className="text-[11px] font-medium text-slate-700 uppercase tracking-tighter line-clamp-2 block">
                                                        {cat.nombre}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 align-middle border-r border-slate-50 max-w-md">
                                                    <span className="text-[11px] font-medium text-slate-500 uppercase tracking-tighter line-clamp-2 block">
                                                        {cat.descripcion || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 align-middle border-r border-slate-50 text-center">
                                                    <span className={`inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter rounded-lg border ${cat.activo ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                                        {cat.activo ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 align-middle text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button type="button" onClick={() => handleEdit(cat)} className={BTN_ICON_EDIT} title="Editar">
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button type="button" onClick={() => handleDelete(cat.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Eliminar">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        {!loading && categories.length > 0 && (
                            <div className="p-3 bg-slate-50 border-t border-slate-200 shrink-0">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                    Mostrando {categories.length} categoría{categories.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className={INFO_BANNER}>
                        <Info className={INFO_BANNER_ICON} />
                        <div>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nota del sistema</h4>
                            <p className="text-[10px] font-medium text-slate-500 uppercase leading-relaxed tracking-tighter">
                                Estas categorías serán visibles al crear un ticket. Use nombres claros como Soporte Software o Infraestructura.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CategoryManagement;
