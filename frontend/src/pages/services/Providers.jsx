import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Truck, Search, Plus, Edit2, Trash2, X, Save, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Pagination from '../../components/common/Pagination';
import FilterBar from '../../components/common/FilterBar';
import SortableHeader from '../../components/common/SortableHeader';

const Providers = () => {
    const [providers, setProviders] = useState([]);
    const [providerTypes, setProviderTypes] = useState([]);

    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Pagination & Search
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [ordering, setOrdering] = useState('nombre');

    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        nombre: '',
        rut: '',
        acronimo: '',
        contacto: '',
        tipo_proveedor: ''
    });

    const fetchData = async (page = 1, search = '', order = ordering) => {
        setLoading(true);
        try {
            const params = {
                page,
                search,
                ordering: order
            };

            const [provRes, typesRes] = await Promise.all([
                api.get('proveedores/', { params }),
                api.get('tipos-proveedores/')
            ]);

            // Handle Pagination
            setProviders(provRes.data.results || []);
            setTotalCount(provRes.data.count || 0);
            setTotalPages(Math.ceil((provRes.data.count || 0) / 10));

            setProviderTypes(typesRes.data.results || typesRes.data);

        } catch (error) {
            console.error("Error fetching data:", error);
            setProviders([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(currentPage, searchQuery, ordering);
    }, [currentPage, ordering]);

    const handleSearch = (query) => {
        setSearchQuery(query);
        setCurrentPage(1);
        fetchData(1, query);
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleSort = (newOrdering) => {
        setOrdering(newOrdering);
        setCurrentPage(1);
    };

    const handleEdit = (item) => {
        setFormData({
            nombre: item.nombre,
            rut: item.rut || '',
            acronimo: item.acronimo || '',
            contacto: item.contacto || '',
            tipo_proveedor: item.tipo_proveedor || ''
        });
        setEditingId(item.id);
        setShowForm(true);
    };

    const handleNew = () => {
        setFormData({
            nombre: '',
            rut: '',
            acronimo: '',
            contacto: '',
            tipo_proveedor: ''
        });
        setEditingId(null);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Seguro que desea eliminar este proveedor?")) return;
        try {
            await api.delete(`proveedores/${id}/`);
            fetchData(currentPage, searchQuery);
        } catch (error) {
            console.error(error);
            alert("Error al eliminar.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`proveedores/${editingId}/`, formData);
            } else {
                await api.post('proveedores/', formData);
            }
            setShowForm(false);
            fetchData(currentPage, searchQuery);
        } catch (error) {
            console.error(error);
            alert("Error al guardar.");
        }
    };

    // No client-side filtering
    const filteredData = providers;

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Proveedores</h2>
                    <p className="text-slate-500">Gestión de empresas prestadoras de servicios.</p>
                </div>

                <div className="flex items-center gap-3">
                    <FilterBar onSearch={handleSearch} placeholder="Buscar proveedor..." />
                    <button
                        onClick={handleNew}
                        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 font-medium whitespace-nowrap"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Nuevo Proveedor</span>
                    </button>
                </div>
            </div>

            {/* Modal Form */}
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
                            transition={{ type: "spring", duration: 0.5 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="text-lg font-bold text-slate-800">
                                    {editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                                </h3>
                                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Nombre Empresa</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                            value={formData.nombre}
                                            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                            placeholder="Ej. Compañia General de Electricidad"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">RUT</label>
                                        <input
                                            type="text"
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                            value={formData.rut}
                                            onChange={e => setFormData({ ...formData, rut: e.target.value })}
                                            placeholder="Ej. 76.123.456-7"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Acrónimo</label>
                                        <input
                                            type="text"
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                            value={formData.acronimo}
                                            onChange={e => setFormData({ ...formData, acronimo: e.target.value })}
                                            placeholder="Ej. CGE"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Tipo de Proveedor</label>
                                        <select
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none appearance-none"
                                            value={formData.tipo_proveedor}
                                            onChange={e => setFormData({ ...formData, tipo_proveedor: e.target.value })}
                                        >
                                            <option value="">Seleccione...</option>
                                            {providerTypes.map(t => (
                                                <option key={t.id} value={t.id}>{t.nombre} ({t.acronimo_nemotecnico})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-semibold text-slate-700">Contacto / Dirección</label>
                                        <input
                                            type="text"
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                            value={formData.contacto}
                                            onChange={e => setFormData({ ...formData, contacto: e.target.value })}
                                            placeholder="Información de contacto..."
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
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
                                        Guardar
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Table List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <SortableHeader label="Proveedor" sortKey="nombre" currentOrdering={ordering} onSort={handleSort} />
                            <SortableHeader label="Tipo" sortKey="tipo_proveedor__nombre" currentOrdering={ordering} onSort={handleSort} />
                            <SortableHeader label="RUT" sortKey="rut" currentOrdering={ordering} onSort={handleSort} />
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Contacto</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredData.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-100">
                                            {item.acronimo ? item.acronimo.substring(0, 2).toUpperCase() : item.nombre.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-900">{item.nombre}</div>
                                            {item.acronimo && <div className="text-xs text-blue-500 font-medium">{item.acronimo}</div>}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-3">
                                    {item.tipo_proveedor_nombre ? (
                                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium border border-slate-200">
                                            {item.tipo_proveedor_nombre}
                                        </span>
                                    ) : <span className="text-slate-400 text-xs">-</span>}
                                </td>
                                <td className="p-3 font-mono text-sm text-slate-600">{item.rut || '-'}</td>
                                <td className="p-3 text-sm text-slate-600">{item.contacto || '-'}</td>
                                <td className="p-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredData.length === 0 && !loading && (
                    <div className="p-12 text-center text-slate-400">
                        <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No se encontraron proveedores.</p>
                    </div>
                )}
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    totalCount={totalCount}
                />
            </div>
        </div>
    );
};

export default Providers;
