import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, Tag, Info, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import api from '../../api';

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
            console.error("Error fetching categories:", error);
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
        if (!window.confirm("¿Estás seguro de eliminar esta categoría? Se recomienda desactivarla en su lugar si tiene tickets asociados.")) return;
        try {
            await api.delete(`tickets/categorias/${id}/`);
            fetchCategories(false);
        } catch (error) {
            alert("Error al eliminar. Probablemente existan tickets vinculados a esta categoría.");
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
            console.error("Error saving category:", error);
            alert("Error al guardar la categoría.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link 
                        to="/tickets"
                        className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-lg rounded-2xl transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <Tag className="w-6 h-6 text-indigo-600" />
                            Categorías de Tickets
                        </h2>
                        <p className="text-sm text-slate-500 font-medium">Gestiona las categorías disponibles para clasificar solicitudes</p>
                    </div>
                </div>
                <button 
                    onClick={() => { setShowForm(true); setEditingId(null); setFormData({ nombre: '', descripcion: '', activo: true }); }}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    Nueva Categoría
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Form Side */}
                <AnimatePresence>
                    {showForm && (
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="lg:col-span-4 bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8 h-fit sticky top-6"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                                    {editingId ? 'Editar Categoría' : 'Nueva Categoría'}
                                </h3>
                                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre</label>
                                    <input 
                                        required
                                        type="text"
                                        className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 rounded-xl text-sm transition-all outline-none font-bold"
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Descripción</label>
                                    <textarea 
                                        rows={4}
                                        className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 rounded-xl text-sm transition-all outline-none font-medium"
                                        value={formData.descripcion}
                                        onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                                    ></textarea>
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                                    <input 
                                        type="checkbox"
                                        id="activo"
                                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={formData.activo}
                                        onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                                    />
                                    <label htmlFor="activo" className="text-xs font-bold text-slate-600 cursor-pointer">Categoría Activa</label>
                                </div>

                                <button 
                                    disabled={isSaving}
                                    type="submit"
                                    className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:bg-indigo-300"
                                >
                                    <Save className="w-5 h-5" />
                                    {isSaving ? 'Guardando...' : 'Guardar Categoría'}
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* List Side */}
                <div className={`${showForm ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-4`}>
                    {loading ? (
                        <div className="p-20 text-center bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
                            <p className="mt-4 text-sm font-bold text-slate-400 uppercase tracking-widest">Cargando...</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Categoría</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Descripción</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</th>
                                        <th className="px-6 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {categories.map(cat => (
                                        <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                                        <Tag className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-sm font-black text-slate-700">{cat.nombre}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs text-slate-500 line-clamp-1 max-w-xs">{cat.descripcion || '-'}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${cat.activo ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                                    {cat.activo ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleEdit(cat)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-md rounded-xl transition-all">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(cat.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-white hover:shadow-md rounded-xl transition-all">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {categories.length === 0 && (
                                <div className="p-20 text-center">
                                    <Tag className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No hay categorías configuradas</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-start gap-4">
                        <div className="p-2 bg-white rounded-xl shadow-sm">
                            <Info className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div>
                            <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-1">Nota del Sistema</h4>
                            <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                Estas categorías serán visibles para todos los usuarios al crear un nuevo ticket. 
                                Te recomendamos usar nombres claros como "Soporte Software", "Infraestructura" o "RRHH" 
                                para facilitar la clasificación de las solicitudes.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CategoryManagement;
