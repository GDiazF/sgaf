import React, { useState, useEffect } from 'react';
import api from '../../api';
import { FileText, Plus, Trash2, Download, Search, X, Save, Edit2, Eye, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FilterBar from '../../components/common/FilterBar';
import DocumentViewerModal from '../../components/common/DocumentViewerModal';
import { usePermission } from '../../hooks/usePermission';

const CDPManager = () => {
    const { can } = usePermission();
    const canAdd = can('servicios.add_cdp');
    const canDelete = can('servicios.delete_cdp');
    const canChange = can('servicios.change_cdp');

    const [cdps, setCdps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Edit State
    const [editingId, setEditingId] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    const initialFormState = {
        nombre: '',
        anio: new Date().getFullYear(),
        descripcion: '',
        archivo: null
    };

    const [formData, setFormData] = useState(initialFormState);
    const [selectedDoc, setSelectedDoc] = useState(null);

    const fetchData = async (search = searchQuery) => {
        setLoading(true);
        try {
            const params = { search, ordering: '-anio,-fecha_subida' };
            const response = await api.get('cdps/', { params });
            setCdps(response.data.results || response.data);
        } catch (error) {
            console.error("Error fetching CDPs:", error);
            setCdps([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSearch = (query) => {
        setSearchQuery(query);
        fetchData(query);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Seguro que desea eliminar este CDP?")) return;
        try {
            await api.delete(`cdps/${id}/`);
            fetchData(searchQuery);
        } catch (error) {
            console.error(error);
            alert("Error al eliminar.");
        }
    };

    const handleEdit = (item) => {
        setFormData({
            nombre: item.nombre,
            anio: item.anio || new Date().getFullYear(),
            descripcion: item.descripcion,
            archivo: null // Don't pre-fill file input
        });
        setEditingId(item.id);
        setShowForm(true);
    };

    const handleNew = () => {
        setFormData(initialFormState);
        setEditingId(null);
        setShowForm(true);
    };

    const handleFileChange = (e) => {
        setFormData({ ...formData, archivo: e.target.files[0] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const data = new FormData();
        data.append('nombre', formData.nombre);
        data.append('anio', formData.anio);
        data.append('descripcion', formData.descripcion);
        if (formData.archivo) {
            data.append('archivo', formData.archivo);
        }

        try {
            if (editingId) {
                await api.patch(`cdps/${editingId}/`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await api.post('cdps/', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            setShowForm(false);
            fetchData(searchQuery);
        } catch (error) {
            console.error(error);
            alert("Error al guardar CDP.");
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden w-full">
            {/* Cabecera Premium Estándar */}
            <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 border-b border-slate-200/60 pb-3 px-1">
                <div>
                    <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase">
                        Repositorio CDPs
                    </h2>
                    <div className="flex items-center gap-2 mt-1.5">
                        <p className="text-[10px] md:text-xs font-medium text-slate-500 uppercase tracking-wide">
                            Certificados de Disponibilidad Presupuestaria.
                        </p>
                    </div>
                </div>

                <div className="flex gap-2 self-end md:self-auto shrink-0">
                    {canAdd && (
                        <button
                            onClick={handleNew}
                            className="flex items-center justify-center gap-2 h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/10 active:scale-95"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Subir CDP</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Barra de Filtros Unificada y Simétrica (h-10 / 40px) */}
            <div className="shrink-0 flex flex-col md:flex-row items-center gap-3 w-full bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="w-full md:w-80 lg:w-96 shrink-0">
                    <FilterBar 
                        onSearch={handleSearch} 
                        placeholder="Buscar por nombre, año o descripción..." 
                        inputClassName="no-global !h-10 !text-[10px] !font-bold !rounded-xl !bg-white !border-slate-200 shadow-sm"
                    />
                </div>
            </div>

            {/* Grid Container con Zero-Scroll y Fondo Estándar */}
            <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 overflow-y-auto flex-1 p-4 md:p-6 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {cdps.map(cdp => (
                        <motion.div
                            key={cdp.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="group bg-white rounded-2xl border border-slate-200/60 p-4 hover:shadow-xl hover:shadow-slate-200/50 hover:border-blue-200 transition-all duration-300 relative flex flex-col h-full"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div className="flex gap-1">
                                    {canChange && (
                                        <button
                                            onClick={() => handleEdit(cdp)}
                                            className="opacity-100 sm:opacity-0 group-hover:opacity-100 text-slate-300 hover:text-indigo-600 transition-all p-1"
                                            title="Editar"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                    )}
                                    {canDelete && (
                                        <button
                                            onClick={() => handleDelete(cdp.id)}
                                            className="opacity-100 sm:opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all p-1"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-md border border-blue-100">
                                        Año {cdp.anio}
                                    </span>
                                </div>
                                <h3 className="font-bold text-slate-900 text-sm leading-tight mb-2 group-hover:text-blue-600 transition-colors uppercase truncate">
                                    {cdp.nombre}
                                </h3>
                                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed italic">
                                    "{cdp.descripcion || "Sin descripción registrada."}"
                                </p>
                            </div>

                            <div className="mt-auto pt-3 border-t border-slate-50 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400">
                                    {new Date(cdp.fecha_subida).toLocaleDateString('es-CL')}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => {
                                            const cleanUrl = cdp.archivo?.replace(/^https?:\/\/[^/]+/, '');
                                            setPreviewUrl(cleanUrl);
                                            setSelectedDoc(cdp);
                                        }}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-all"
                                        title="Previsualizar"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Ver</span>
                                    </button>
                                    <a
                                        href={cdp.archivo}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                        title="Descargar"
                                    >
                                        <Download className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {cdps.length === 0 && !loading && (
                        <div className="col-span-full py-20 text-center flex flex-col items-center gap-4">
                            <div className="p-6 bg-slate-50 rounded-full border border-slate-100">
                                <FileText className="w-12 h-12 text-slate-200" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">No hay documentos</h3>
                        </div>
                    )}
                </div>
            </div>

            {/* Upload Modal */}
            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                            onClick={() => setShowForm(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden relative z-10 border border-white/20"
                        >
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">
                                        {editingId ? 'Editar CDP' : 'Subir Nuevo CDP'}
                                    </h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Documentación Presupuestaria</p>
                                </div>
                                <button onClick={() => setShowForm(false)} className="p-2 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all shadow-sm">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="EJ: CDP AGUA"
                                            className="no-global w-full !h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-350 text-sm uppercase"
                                            value={formData.nombre}
                                            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 text-center block w-full">Año</label>
                                        <input
                                            type="number"
                                            required
                                            min="2020"
                                            max="2100"
                                            className="no-global w-full !h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-slate-700 text-center font-mono text-base"
                                            value={formData.anio}
                                            onChange={e => setFormData({ ...formData, anio: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción</label>
                                    <textarea
                                        rows="2"
                                        placeholder="BREVE DESCRIPCIÓN DEL CDP (OPCIONAL)..."
                                        className="no-global w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-semibold text-slate-600 resize-none placeholder:text-slate-350 uppercase text-xs"
                                        value={formData.descripcion}
                                        onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 block">
                                        {editingId ? 'REEMPLAZAR ARCHIVO (PDF)' : 'SELECCIONAR ARCHIVO (PDF)'}
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type="file"
                                            required={!editingId}
                                            accept=".pdf,.doc,.docx"
                                            className="no-global w-full text-xs text-slate-500
                                                file:mr-4 file:py-3 file:px-6
                                                file:rounded-2xl file:border-0
                                                file:text-[10px] file:font-black file:uppercase
                                                file:bg-blue-50 file:text-blue-600
                                                hover:file:bg-blue-100
                                                transition-all cursor-pointer bg-slate-50 rounded-2xl border border-slate-200 p-1 group-hover:border-blue-200"
                                            onChange={handleFileChange}
                                        />
                                    </div>
                                    {editingId && !formData.archivo && <p className="text-[10px] font-bold text-amber-500 italic mt-1.5 ml-2 uppercase tracking-tight">Si no sube un archivo nuevo, se mantendrá el original.</p>}
                                </div>

                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="px-8 py-3.5 text-[11px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-2xl transition-all active:scale-95"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-10 py-3.5 bg-blue-600 text-white text-[11px] font-black uppercase tracking-[0.15em] rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-500/20 hover:shadow-blue-500/30 transition-all active:scale-95 flex items-center gap-3"
                                    >
                                        <Save className="w-3.5 h-3.5" />
                                        {editingId ? 'Guardar Cambios' : 'Subir Documento'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <DocumentViewerModal
                isOpen={!!previewUrl}
                onClose={() => {
                    setPreviewUrl(null);
                    setSelectedDoc(null);
                }}
                fileUrl={previewUrl}
                title={selectedDoc?.nombre || 'Documento'}
                subtitle={selectedDoc ? `CDP - Año ${selectedDoc.anio}` : ''}
            />
        </div>
    );
};

export default CDPManager;
