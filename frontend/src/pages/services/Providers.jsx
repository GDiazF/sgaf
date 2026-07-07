import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Building2, Search, Plus, Edit2, Trash2, FolderSearch, AlertCircle } from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import { motion } from 'framer-motion';
import Pagination from '../../components/common/Pagination';
import SortableHeader from '../../components/common/SortableHeader';
import ProviderModal from '../../components/services/ProviderModal';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import {
    BTN_PRIMARY,
    INPUT_FILTER,
    SELECT_FILTER,
    TITLE_ICON_BOX,
    BTN_ICON_EDIT,
    BTN_ICON_DELETE,
} from '../funcionarios/shared/funcionariosUi';

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
    const [errorMessage, setErrorMessage] = useState('');
    const debouncedSearchQuery = useDebouncedValue(searchQuery);

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

            // Handle Pagination and Data Structure
            const provData = provRes.data.results || (Array.isArray(provRes.data) ? provRes.data : []);
            setProviders(provData);
            setTotalCount(provRes.data.count || provData.length);
            setTotalPages(provRes.data.count ? Math.ceil(provRes.data.count / pageSize) : 1);

            setProviderTypes(typesRes.data.results || typesRes.data);

        } catch (error) {
            console.error("Error fetching data:", error);
            setProviders([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(currentPage, debouncedSearchQuery, ordering);
    }, [currentPage, pageSize, ordering, debouncedSearchQuery]);

    const handleSearch = (query) => {
        setSearchQuery(query);
        setCurrentPage(1);
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
            setErrorMessage('');
            fetchData(currentPage, searchQuery);
        } catch (error) {
            console.error(error);
            setErrorMessage('Error al eliminar el proveedor.');
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
            setErrorMessage('');
            fetchData(currentPage, searchQuery);
        } catch (error) {
            console.error(error);
            setErrorMessage('Error al guardar el proveedor.');
        }
    };

    // No client-side filtering
    const filteredData = providers;

    return (
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden w-full">
            {/* Cabecera Premium Estándar */}
            <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 border-b border-slate-200/60 pb-3 px-1">
                <div className="flex items-center gap-3">
                    <div className={TITLE_ICON_BOX}>
                        <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase">
                            Proveedores
                        </h2>
                        <div className="flex items-center gap-2 mt-1.5">
                            <p className="text-[10px] md:text-xs font-medium text-slate-500 uppercase tracking-wide">
                                Gestión de empresas prestadoras de servicios.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 self-end md:self-auto shrink-0">
                    {can('servicios.add_proveedor') && (
                        <button
                            onClick={handleNew}
                            className={BTN_PRIMARY}
                        >
                            <Plus className="w-4 h-4" />
                            <span>Nuevo Proveedor</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Barra de Filtros Unificada y Simétrica (h-10 / 40px) */}
            <div className="shrink-0 flex flex-col md:flex-row items-center gap-3 w-full bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="w-full md:w-80 lg:w-96 shrink-0 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, RUT o tipo..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className={INPUT_FILTER}
                    />
                </div>

                {/* Selector de tamaño de página (h-10 unificado) */}
                <div className="flex items-center gap-2 ml-auto shrink-0 self-stretch md:self-auto justify-end">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mostrar:</span>
                    <select
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                        className={`${SELECT_FILTER} w-[84px]`}
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
            </div>

            {errorMessage && (
                <div className="shrink-0 bg-rose-50 text-rose-600 text-[10px] font-bold uppercase p-3 rounded-xl border border-rose-100 flex gap-2 items-center">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {errorMessage}
                </div>
            )}

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
                                <h3 className="font-medium text-slate-700 text-[11px] truncate uppercase tracking-tighter leading-tight">{item.nombre}</h3>
                                {item.acronimo && <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{item.acronimo}</p>}
                            </div>
                        </div>

                        <div className="space-y-2.5 mb-4">
                            <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-500 font-medium">RUT:</span>
                                <span className="font-mono text-slate-700 font-medium">{item.rut || '-'}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-500 font-medium">Contacto:</span>
                                <span className="text-slate-700 truncate ml-2 text-right">{item.contacto || '-'}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
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
                                    className="flex items-center justify-center gap-2 bg-blue-50 text-blue-700 h-10 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                                >
                                    <Edit2 className="w-3.5 h-3.5" /> Editar
                                </button>
                            )}
                            {can('servicios.delete_proveedor') && (
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    className="flex items-center justify-center gap-2 bg-rose-50 text-rose-600 h-10 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Borrar
                                </button>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Desktop Table List */}
            <div className="hidden lg:flex flex-1 flex-col bg-slate-50 rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-0">
                <div className="flex-1 overflow-auto custom-scrollbar bg-white">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <SortableHeader label="Proveedor" sortKey="nombre" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Tipo" sortKey="tipo_proveedor__nombre" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="RUT" sortKey="rut" currentOrdering={ordering} onSort={handleSort} />
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100">Contacto</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                            {filteredData.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-4 py-2 border-r border-slate-50 text-[11px] font-medium text-slate-700 uppercase tracking-tighter">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-[11px] border border-blue-100 group-hover:bg-white transition-colors">
                                                {item.acronimo ? item.acronimo.substring(0, 2).toUpperCase() : item.nombre.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-700 text-[11px] uppercase tracking-tighter">{item.nombre}</div>
                                                {item.acronimo && <div className="text-[10px] text-blue-500 font-medium">{item.acronimo}</div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 border-r border-slate-50 text-[11px] font-medium text-slate-500 uppercase tracking-tighter">
                                        {item.tipo_proveedor_nombre ? (
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold uppercase border border-slate-200">
                                                {item.tipo_proveedor_nombre}
                                            </span>
                                        ) : <span className="text-slate-400">-</span>}
                                    </td>
                                    <td className="px-4 py-2 border-r border-slate-50 font-mono text-[11px] font-medium text-slate-500 uppercase tracking-tighter">{item.rut || '-'}</td>
                                    <td className="px-4 py-2 border-r border-slate-50 text-[11px] font-medium text-slate-500 uppercase tracking-tighter">{item.contacto || '-'}</td>
                                    <td className="px-4 py-2 text-right">
                                        <div className="flex justify-end items-center gap-1.5">
                                            {can('servicios.change_proveedor') && (
                                                <button onClick={() => handleEdit(item)} className={BTN_ICON_EDIT} title="Editar">
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            {can('servicios.delete_proveedor') && (
                                                <button onClick={() => handleDelete(item.id)} className={BTN_ICON_DELETE} title="Eliminar">
                                                    <Trash2 className="w-3.5 h-3.5" />
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
                            <FolderSearch className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No se encontraron proveedores.</p>
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
