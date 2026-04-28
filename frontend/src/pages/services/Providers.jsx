import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Truck, Search, Plus, Edit2, Trash2, X, Save, Building2 } from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import { motion, AnimatePresence } from 'framer-motion';
import Pagination from '../../components/common/Pagination';
import FilterBar from '../../components/common/FilterBar';
import SortableHeader from '../../components/common/SortableHeader';
import ProviderModal from '../../components/services/ProviderModal';

const Providers = () => {
    const { can } = usePermission();
    const [providers, setProviders] = useState([]);
    const [providerTypes, setProviderTypes] = useState([]);

    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Pagination & Search
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
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
                page_size: pageSize,
                search,
                ordering: order
            };

            const [provRes, typesRes] = await Promise.all([
                api.get('proveedores/', { params }),
                api.get('tipos-proveedores/', { params: { page_size: 1000 } })
            ]);

            // Handle Pagination
            setProviders(provRes.data.results || []);
            setTotalCount(provRes.data.count || 0);
            setTotalPages(Math.ceil((provRes.data.count || 0) / pageSize));

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
    }, [currentPage, pageSize, ordering]);

    // Handle initial search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData(1, searchQuery, ordering);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSearch = (query) => {
        setSearchQuery(query);
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

    const handleSave = async (dataToSubmit) => {
        try {
            if (editingId) {
                await api.put(`proveedores/${editingId}/`, dataToSubmit);
            } else {
                await api.post('proveedores/', dataToSubmit);
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
        <div className="flex flex-col w-full lg:h-[calc(100vh-140px)] lg:overflow-hidden">
            {/* Header */}
            <div className="shrink-0 mb-6 lg:mb-4 px-1">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight uppercase leading-none">Proveedores</h2>
                        <p className="text-[10px] md:text-xs text-slate-500 font-normal mt-1">Gestión de empresas prestadoras de servicios.</p>
                    </div>
                    {can('servicios.add_proveedor') && (
                        <button
                            onClick={handleNew}
                            className="lg:hidden p-2.5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-transform"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex flex-row flex-1 gap-2">
                        <div className="relative w-full lg:max-w-md flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, RUT o tipo..."
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all shadow-sm"
                            />
                        </div>
                        <div className="flex gap-2">
                            <select
                                value={pageSize}
                                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                                className="w-[84px] pl-3 pr-7 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm cursor-pointer"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {can('servicios.add_proveedor') && (
                            <button
                                onClick={handleNew}
                                className="hidden lg:flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all font-semibold text-[10px] uppercase shadow-lg shadow-blue-600/20 active:scale-95"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Nuevo Proveedor</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Form */}
            <ProviderModal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                onSave={handleSave}
                editingId={editingId}
                initialData={formData}
                lookups={{ providerTypes }}
            />

            {/* Mobile Cards View */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-4 mb-6">
                {filteredData.map(item => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-lg flex-shrink-0">
                                {item.acronimo ? item.acronimo.substring(0, 2).toUpperCase() : item.nombre.charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-semibold text-slate-800 text-sm truncate uppercase leading-tight">{item.nombre}</h3>
                                {item.acronimo && <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-widest">{item.acronimo}</p>}
                            </div>
                        </div>

                        <div className="space-y-2.5 mb-4">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-medium">RUT:</span>
                                <span className="font-mono text-slate-700 font-semibold">{item.rut || '-'}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-medium">Contacto:</span>
                                <span className="text-slate-700 truncate ml-2 text-right">{item.contacto || '-'}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-medium">Tipo:</span>
                                {item.tipo_proveedor_nombre ? (
                                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[9px] font-bold uppercase border border-slate-200">
                                        {item.tipo_proveedor_nombre}
                                    </span>
                                ) : <span className="text-slate-400">-</span>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-slate-50">
                            {can('servicios.change_proveedor') && (
                                <button
                                    onClick={() => handleEdit(item)}
                                    className="flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 py-2.5 rounded-xl font-semibold text-[10px] uppercase shadow-sm active:scale-95 transition-all"
                                >
                                    <Edit2 className="w-3.5 h-3.5" /> Editar
                                </button>
                            )}
                            {can('servicios.delete_proveedor') && (
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    className="flex items-center justify-center gap-2 bg-red-50 text-red-600 py-2.5 rounded-xl font-semibold text-[10px] uppercase shadow-sm active:scale-95 transition-all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Borrar
                                </button>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Desktop Table List */}
            <div className="hidden lg:flex flex-1 flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-0">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <SortableHeader label="Proveedor" sortKey="nombre" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Tipo" sortKey="tipo_proveedor__nombre" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="RUT" sortKey="rut" currentOrdering={ordering} onSort={handleSort} />
                                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contacto</th>
                                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                            {filteredData.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="py-2 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100 group-hover:bg-white transition-colors">
                                                {item.acronimo ? item.acronimo.substring(0, 2).toUpperCase() : item.nombre.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-800 text-[12px]">{item.nombre}</div>
                                                {item.acronimo && <div className="text-[10px] text-blue-500 font-medium">{item.acronimo}</div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-2 px-4">
                                        {item.tipo_proveedor_nombre ? (
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold uppercase border border-slate-200">
                                                {item.tipo_proveedor_nombre}
                                            </span>
                                        ) : <span className="text-slate-400">-</span>}
                                    </td>
                                    <td className="py-2 px-4 font-mono text-[11px] font-semibold text-slate-400">{item.rut || '-'}</td>
                                    <td className="py-2 px-4 text-xs font-normal text-slate-600">{item.contacto || '-'}</td>
                                    <td className="py-2 px-4 text-right">
                                        <div className="flex justify-end items-center gap-1.5">
                                            {can('servicios.change_proveedor') && (
                                                <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Editar">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            )}
                                            {can('servicios.delete_proveedor') && (
                                                <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Eliminar">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
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
                </div>
            </div>

            {/* Pagination for both views */}
            <div className="shrink-0 py-4 flex justify-center lg:justify-end">
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
