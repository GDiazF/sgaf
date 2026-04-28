import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Zap, Search, Plus, Edit2, Trash2, X, Save, Building2, FileText, Hash, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Pagination from '../../components/common/Pagination';
import FilterBar from '../../components/common/FilterBar';
import SortableHeader from '../../components/common/SortableHeader';
import ServiceModal from '../../components/services/ServiceModal';
import BulkUploadModal from '../../components/common/BulkUploadModal';
import { usePermission } from '../../hooks/usePermission';

const ServicesDashboard = () => {
    const { can } = usePermission();
    const [services, setServices] = useState([]);
    const [providers, setProviders] = useState([]);
    const [establishments, setEstablishments] = useState([]);
    const [docTypes, setDocTypes] = useState([]);

    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showBulkForm, setShowBulkForm] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [bulkErrors, setBulkErrors] = useState([]);

    // Pagination & Search State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [ordering, setOrdering] = useState('establecimiento__nombre');
    const [pageSize, setPageSize] = useState(10);

    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        proveedor: '',
        establecimiento: '',
        numero_cliente: '',
        numero_servicio: '',
        tipo_documento: ''
    });

    const fetchData = async (page = 1, search = searchQuery, order = ordering, size = pageSize) => {
        setLoading(true);
        try {
            const params = {
                page,
                search,
                ordering: order,
                page_size: size
            };

            const [servRes, provRes, estRes, docRes] = await Promise.all([
                api.get('servicios/', { params }),
                api.get('proveedores/', { params: { page_size: 1000 } }),
                api.get('establecimientos/', { params: { page_size: 1000 } }),
                api.get('tipos-documentos/', { params: { page_size: 1000 } })
            ]);

            setServices(servRes.data.results || []);
            setTotalCount(servRes.data.count || 0);
            setTotalPages(Math.ceil((servRes.data.count || 0) / size));

            setProviders(provRes.data.results || provRes.data);
            setEstablishments(estRes.data.results || estRes.data);
            setDocTypes(docRes.data.results || docRes.data);

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(currentPage, searchQuery, ordering, pageSize);
    }, [currentPage, ordering, pageSize]);

    const handleSearch = (query) => {
        setSearchQuery(query);
        setCurrentPage(1);
        fetchData(1, query, ordering, pageSize);
    };

    const handleSort = (newOrdering) => {
        setOrdering(newOrdering);
        setCurrentPage(1);
    };

    const handleEdit = (item) => {
        setFormData({
            proveedor: item.proveedor,
            establecimiento: item.establecimiento,
            numero_cliente: item.numero_cliente,
            numero_servicio: item.numero_servicio || '',
            tipo_documento: item.tipo_documento || ''
        });
        setEditingId(item.id);
        setShowForm(true);
    };

    const handleNew = () => {
        setFormData({
            proveedor: '',
            establecimiento: '',
            numero_cliente: '',
            numero_servicio: '',
            tipo_documento: ''
        });
        setEditingId(null);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Seguro que desea eliminar este servicio?")) return;
        try {
            await api.delete(`servicios/${id}/`);
            fetchData(currentPage, searchQuery, ordering, pageSize);
        } catch (error) {
            console.error(error);
            alert("Error al eliminar.");
        }
    };

    const handleSave = async (dataToSubmit) => {
        try {
            if (editingId) {
                await api.put(`servicios/${editingId}/`, dataToSubmit);
            } else {
                await api.post('servicios/', dataToSubmit);
            }
            setShowForm(false);
            fetchData(currentPage, searchQuery, ordering, pageSize);
        } catch (error) {
            console.error(error);
            alert("Error al guardar.");
        }
    };

    const handleBulk = () => {
        setBulkErrors([]);
        setShowBulkForm(true);
    };

    const handleBulkUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formDataFile = new FormData();
        formDataFile.append('file', file);

        setUploading(true);
        setBulkErrors([]);
        try {
            const res = await api.post('servicios/bulk_upload/', formDataFile, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert(res.data.message);
            setShowBulkForm(false);
            fetchData(currentPage, searchQuery, ordering, pageSize);
        } catch (error) {
            console.error(error);
            if (error.response?.data?.errors) {
                setBulkErrors(error.response.data.errors);
            } else {
                alert(error.response?.data?.error || "Error al subir el archivo.");
            }
        } finally {
            setUploading(false);
            e.target.value = null; // Reset input
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const response = await api.get('servicios/download_template/', {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'plantilla_servicios.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error(error);
            alert("Error al descargar la plantilla.");
        }
    };

    return (
        <div className="flex flex-col w-full lg:h-[calc(100vh-140px)] lg:overflow-hidden">
            {/* Header section with Premium design */}
            <div className="shrink-0 mb-6 lg:mb-4 px-1">
                <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2 leading-none uppercase">
                            Servicios Básicos
                        </h2>
                        <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-1.5 flex items-center gap-1.5 uppercase tracking-wide">
                            Gestión de consumos y números de cliente por establecimiento.
                        </p>
                    </div>

                    <div className="flex gap-2">
                        {can('servicios.add_servicio') && (
                            <button
                                onClick={handleBulk}
                                className="group relative inline-flex items-center justify-center p-2.5 lg:px-4 lg:py-2 bg-emerald-50 text-emerald-700 text-sm font-semibold rounded-[14px] lg:rounded-xl overflow-hidden transition-all hover:bg-emerald-100 active:scale-95 shadow-sm shrink-0 border border-emerald-100"
                                title="Carga Masiva"
                            >
                                <FileText className="w-5 h-5 lg:w-4 lg:h-4 lg:mr-2" />
                                <span className="hidden lg:inline">Carga Masiva</span>
                            </button>
                        )}
                        {can('servicios.add_servicio') && (
                            <button
                                onClick={handleNew}
                                className="group relative inline-flex items-center justify-center p-2.5 lg:px-5 lg:py-2 bg-blue-600 text-white text-sm font-semibold rounded-[14px] lg:rounded-xl overflow-hidden transition-all hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-500/20 shrink-0"
                            >
                                <Plus className="w-5 h-5 lg:w-4 lg:h-4 lg:mr-2" />
                                <span className="hidden lg:inline">Nuevo Servicio</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex flex-row flex-1 gap-2">
                        <div className="relative w-full lg:max-w-md flex-1">
                            <FilterBar onSearch={handleSearch} placeholder="Buscar por cliente, proveedor..." />
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    const newSize = Number(e.target.value);
                                    setPageSize(newSize);
                                    setCurrentPage(1);
                                }}
                                className="w-[84px] pl-3 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm cursor-pointer"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Form */}
            <ServiceModal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                onSave={handleSave}
                editingId={editingId}
                initialData={formData}
                lookups={{
                    providers,
                    establishments,
                    documentTypes: docTypes.map(d => ({ value: d.id, label: d.nombre }))
                }}
            />

            {/* Bulk Upload Modal */}
            <BulkUploadModal
                isOpen={showBulkForm}
                onClose={() => setShowBulkForm(false)}
                title="Carga Masiva de Servicios"
                description="Suba un archivo Excel con los datos de los servicios básicos (Agua, Luz, Gas, etc.)."
                onUpload={handleBulkUpload}
                onDownloadTemplate={handleDownloadTemplate}
                uploading={uploading}
                errors={bulkErrors}
            />

            {/* Table Container con Zero-Scroll */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                {/* Mobile Cards View */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-4 p-4 overflow-auto custom-scrollbar">
                    {services.map(item => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col relative overflow-hidden"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center flex-shrink-0">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-semibold text-slate-800 text-sm truncate uppercase leading-tight">{item.establecimiento_nombre}</h3>
                                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{item.establecimiento_rbd || 'Sin RBD'}</p>
                                </div>
                            </div>

                            <div className="space-y-2.5 mb-4 flex-1">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-medium">Proveedor:</span>
                                    <span className="font-bold text-blue-700">{item.proveedor_nombre}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-medium">N° Cliente:</span>
                                    <span className="font-mono text-slate-700 font-bold bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">#{item.numero_cliente}</span>
                                </div>
                                {item.numero_servicio && (
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 font-medium">N° Servicio:</span>
                                        <span className="text-slate-600 font-semibold">{item.numero_servicio}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-medium">Tipo Doc:</span>
                                    {item.tipo_documento_nombre ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] font-bold uppercase border border-slate-200">
                                            <FileText className="w-2.5 h-2.5" />
                                            {item.tipo_documento_nombre}
                                        </span>
                                    ) : <span className="text-slate-400">-</span>}
                                </div>
                            </div>

                            {/* Acciones */}
                            <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-slate-50">
                                {can('servicios.change_servicio') && (
                                    <button
                                        onClick={() => handleEdit(item)}
                                        className="flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 py-2.5 rounded-xl font-semibold text-[10px] uppercase shadow-sm active:scale-95 transition-all"
                                    >
                                        <Pencil className="w-3.5 h-3.5" /> Editar
                                    </button>
                                )}
                                {can('servicios.delete_servicio') && (
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
                    {!loading && services.length === 0 && (
                        <div className="col-span-full py-20 text-center flex flex-col items-center gap-4">
                            <div className="p-6 bg-slate-50 rounded-full border border-slate-100">
                                <Zap className="w-12 h-12 text-slate-200" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">No hay servicios registrados</h3>
                        </div>
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left whitespace-nowrap relative">
                        <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                            <tr>
                                <SortableHeader label="Establecimiento" sortKey="establecimiento__nombre" currentOrdering={ordering} onSort={handleSort} className="px-4 py-3 text-xs font-semibold text-slate-500 tracking-wider uppercase" />
                                <SortableHeader label="Proveedor / Servicio" sortKey="proveedor__nombre" currentOrdering={ordering} onSort={handleSort} className="px-4 py-3 text-xs font-semibold text-slate-500 tracking-wider uppercase" />
                                <SortableHeader label="N° Cliente (ID)" sortKey="numero_cliente" currentOrdering={ordering} onSort={handleSort} className="px-4 py-3 text-xs font-semibold text-slate-500 tracking-wider uppercase" />
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 tracking-wider uppercase">Tipo Doc.</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 tracking-wider uppercase text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {services.map(item => (
                                <tr key={item.id} className="hover:bg-blue-50/20 transition-all group">
                                    <td className="px-4 py-1">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:border-blue-200 transition-colors">
                                                <Building2 className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-[12px] font-semibold text-slate-700 tracking-tight">{item.establecimiento_nombre}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-1">
                                        <div className="flex flex-col">
                                            <span className="text-[12px] font-semibold text-blue-600 group-hover:text-blue-700">{item.proveedor_nombre}</span>
                                            {item.numero_servicio && <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">ID: {item.numero_servicio}</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-1">
                                        <span className="inline-flex font-mono font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 text-[12px]">
                                            #{item.numero_cliente}
                                        </span>
                                    </td>
                                    <td className="px-4 py-1">
                                        {item.tipo_documento_nombre ? (
                                            <div className="flex items-center gap-2 px-2 py-0.5 bg-slate-100/50 rounded-lg border border-slate-200 w-fit">
                                                <FileText className="w-3.5 h-3.5 text-slate-500" />
                                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{item.tipo_documento_nombre}</span>
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td className="px-4 py-1 text-right">
                                        <div className="flex justify-end gap-1 px-1">
                                            {can('servicios.change_servicio') && (
                                                <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Editar">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                            )}
                                            {can('servicios.delete_servicio') && (
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
                </div>

                {/* Footer / Pagination */}
                <div className="p-4 bg-slate-50/50 border-t border-slate-200 shrink-0">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={(p) => setCurrentPage(p)}
                        totalCount={totalCount}
                    />
                </div>
            </div>
        </div>
    );
};

export default ServicesDashboard;
