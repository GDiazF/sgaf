import React, { useState, useEffect } from 'react';
import api from '../../api';
import { FileText, Plus, Trash2, Download, Search, X, Save, Edit2, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FilterBar from '../../components/common/FilterBar';

const CDPManager = () => {
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

    const fetchData = async (search = '') => {
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
        fetchData(searchQuery);
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
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Repositorio de CDPs</h2>
                    <p className="text-slate-500">Gestión de Certificados de Disponibilidad Presupuestaria.</p>
                </div>

                <div className="flex items-center gap-3">
                    <FilterBar onSearch={handleSearch} placeholder="Buscar CDP..." />
                    <button
                        onClick={handleNew}
                        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 font-medium whitespace-nowrap"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Subir CDP</span>
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cdps.map(cdp => (
                    <motion.div
                        key={cdp.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative group"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold font-mono">
                                    {cdp.anio}
                                </span>
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setPreviewUrl(cdp.archivo)}
                                    className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Ver Documento"
                                >
                                    <Eye className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleEdit(cdp)}
                                    className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(cdp.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <h3 className="font-bold text-slate-800 mb-1">{cdp.nombre}</h3>
                        <p className="text-sm text-slate-500 mb-4 line-clamp-2">{cdp.descripcion || "Sin descripción"}</p>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                            <span className="text-xs text-slate-400">
                                {new Date(cdp.fecha_subida).toLocaleDateString('es-CL')}
                            </span>
                            <a
                                href={cdp.archivo}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                            >
                                <Download className="w-4 h-4" />
                                Descargar
                            </a>
                        </div>
                    </motion.div>
                ))}

                {cdps.length === 0 && !loading && (
                    <div className="col-span-full py-12 text-center text-slate-400">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No hay CDPs subidos.</p>
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                            onClick={() => setShowForm(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="text-lg font-bold text-slate-800">
                                    {editingId ? 'Editar CDP' : 'Subir Nuevo CDP'}
                                </h3>
                                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="text-sm font-semibold text-slate-700 block mb-1">Nombre</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: CDP Agua"
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.nombre}
                                            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-slate-700 block mb-1">Año</label>
                                        <input
                                            type="number"
                                            required
                                            min="2020"
                                            max="2100"
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-center font-mono"
                                            value={formData.anio}
                                            onChange={e => setFormData({ ...formData, anio: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-700 block mb-1">Descripción</label>
                                    <textarea
                                        rows="2"
                                        placeholder="Opcional..."
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                        value={formData.descripcion}
                                        onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-700 block mb-1">
                                        {editingId ? 'Reemplazar Archivo (Opcional)' : 'Archivo PDF'}
                                    </label>
                                    <input
                                        type="file"
                                        required={!editingId}
                                        accept=".pdf,.doc,.docx"
                                        className="w-full p-2 block w-full text-sm text-slate-500
                                            file:mr-4 file:py-2 file:px-4
                                            file:rounded-full file:border-0
                                            file:text-sm file:font-semibold
                                            file:bg-blue-50 file:text-blue-700
                                            hover:file:bg-blue-100
                                        "
                                        onChange={handleFileChange}
                                    />
                                    {editingId && !formData.archivo && <p className="text-xs text-slate-400 mt-1 ml-2">Dejar vacío para mantener el archivo actual.</p>}
                                </div>

                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
                                    >
                                        <Save className="w-4 h-4" />
                                        {editingId ? 'Guardar Cambios' : 'Subir Archivo'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Preview Modal */}
            <AnimatePresence>
                {previewUrl && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
                            onClick={() => setPreviewUrl(null)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] overflow-hidden relative z-10 flex flex-col"
                        >
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h3 className="text-lg font-bold text-slate-800">Previsualización de Documento</h3>
                                <button onClick={() => setPreviewUrl(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="flex-1 bg-slate-100 p-2">
                                <iframe
                                    src={previewUrl}
                                    className="w-full h-full rounded-lg border border-slate-200"
                                    title="PDF Preview"
                                />
                            </div>
                            <div className="p-4 border-t border-slate-100 flex justify-end bg-white">
                                <a
                                    href={previewUrl}
                                    download
                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                                >
                                    <Download className="w-4 h-4" />
                                    Descargar Archivo Original
                                </a>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CDPManager;
