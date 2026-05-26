import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Zap, Search, Plus, Trash2, Building2, FileText, Hash, Pencil, ChevronRight, FolderSearch, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Pagination from '../../components/common/Pagination';
import SortableHeader from '../../components/common/SortableHeader';
import ServiceModal from '../../components/services/ServiceModal';
import BulkUploadModal from '../../components/common/BulkUploadModal';
import ServiceDetailModal from '../../components/services/ServiceDetailModal';
import { usePermission } from '../../hooks/usePermission';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import {
    BTN_PRIMARY,
    INPUT_FILTER,
    SELECT_FILTER,
    TITLE_ICON_BOX,
    BTN_ICON_EDIT,
    BTN_ICON_DELETE,
} from '../funcionarios/shared/funcionariosUi';

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
    const [errorMessage, setErrorMessage] = useState('');
    const [noticeMessage, setNoticeMessage] = useState('');
    const debouncedSearchQuery = useDebouncedValue(searchQuery);

    const [editingId, setEditingId] = useState(null);
    const [selectedServiceForDetail, setSelectedServiceForDetail] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const handleOpenDetail = (service) => {
        setSelectedServiceForDetail(service);
        setIsDetailModalOpen(true);
    };

    const [formData, setFormData] = useState({
        proveedor: '',
        establecimiento: '',
        numero_cliente: '',
        numero_servicio: '',
        tipo_documento: '',
        unidad_medida: ''
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
        fetchData(currentPage, debouncedSearchQuery, ordering, pageSize);
    }, [currentPage, debouncedSearchQuery, ordering, pageSize]);

    const handleSearch = (query) => {
        setSearchQuery(query);
        setCurrentPage(1);
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
            tipo_documento: item.tipo_documento || '',
            unidad_medida: item.unidad_medida || ''
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
            tipo_documento: '',
            unidad_medida: ''
        });
        setEditingId(null);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Seguro que desea eliminar este servicio?")) return;
        try {
            await api.delete(`servicios/${id}/`);
            setErrorMessage('');
            setNoticeMessage('');
            fetchData(currentPage, searchQuery, ordering, pageSize);
        } catch (error) {
            console.error(error);
            setErrorMessage('Error al eliminar el servicio.');
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
            setErrorMessage('');
            setNoticeMessage('');
            fetchData(currentPage, searchQuery, ordering, pageSize);
        } catch (error) {
            console.error(error);
            setErrorMessage('Error al guardar el servicio.');
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
            setNoticeMessage(res.data.message || 'Carga masiva completada.');
            setErrorMessage('');
            setShowBulkForm(false);
            fetchData(currentPage, searchQuery, ordering, pageSize);
        } catch (error) {
            console.error(error);
            if (error.response?.data?.errors) {
                setBulkErrors(error.response.data.errors);
            } else {
                setErrorMessage(error.response?.data?.error || 'Error al subir el archivo.');
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
            setErrorMessage('Error al descargar la plantilla.');
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden w-full">
            {/* Header section con diseño Premium SGAF (Sección 1 y 4 de UI) */}
            <div className="shrink-0 px-1">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                    <div className="flex items-center gap-3">
                        <div className={TITLE_ICON_BOX}>
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase">
                                Servicios Básicos
                            </h2>
                            <div className="flex items-center gap-2 mt-1.5">
                                <p className="text-[10px] md:text-xs font-medium text-slate-500 ml-0 uppercase">
                                    GESTIÓN DE CONSUMOS Y NÚMEROS DE CLIENTE POR ESTABLECIMIENTO.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {can('servicios.add_servicio') && (
                            <button
                                onClick={handleBulk}
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-5 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-emerald-100 flex items-center gap-2 shrink-0 active:scale-95 shadow-sm"
                                title="Carga Masiva"
                            >
                                <FileText className="w-4 h-4" />
                                <span>Carga Masiva</span>
                            </button>
                        )}
                        {can('servicios.add_servicio') && (
                            <button
                                onClick={handleNew}
                                className={BTN_PRIMARY}
                            >
                                <Plus className="w-4 h-4" />
                                <span>Nuevo Servicio</span>
                            </button>
                        )}
                    </div>
                </div>

            </div>

            {/* Barra de Filtros en Una Sola Fila Unificada (Sección 9 y 20 de UI) */}
            <div className="shrink-0 flex flex-row items-center gap-3 w-full bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="relative flex-1 lg:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="BUSCAR POR CLIENTE, PROVEEDOR..."
                        className={INPUT_FILTER}
                    />
                </div>
                <select
                    value={pageSize}
                    onChange={(e) => {
                        const newSize = Number(e.target.value);
                        setPageSize(newSize);
                        setCurrentPage(1);
                    }}
                    className={`${SELECT_FILTER} w-[96px]`}
                >
                    <option value={10}>10 REG.</option>
                    <option value={20}>20 REG.</option>
                    <option value={50}>50 REG.</option>
                    <option value={100}>100 REG.</option>
                </select>
            </div>

            {(errorMessage || noticeMessage) && (
                <div className={`shrink-0 text-[10px] font-bold uppercase p-3 rounded-xl border flex gap-2 items-center ${errorMessage ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                    {errorMessage ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                    {errorMessage || noticeMessage}
                </div>
            )}

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
            <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                {/* Mobile Cards View */}
                <div className="lg:hidden p-3 flex flex-col gap-3 overflow-auto custom-scrollbar">
                    {services.map(item => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3 hover:border-blue-200/60 transition-all"
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-medium text-slate-700 text-[11px] uppercase tracking-tighter leading-tight line-clamp-2">{item.establecimiento_nombre}</h3>
                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-1">{item.establecimiento_rbd || 'Sin RBD'}</p>
                                </div>
                            </div>

                            <div className="space-y-1.5 text-[10px] font-medium text-slate-500 uppercase tracking-tighter">
                                <div 
                                    onClick={() => handleOpenDetail(item)}
                                    className="flex justify-between items-center gap-3 cursor-pointer group/prov"
                                >
                                    <span>Proveedor:</span>
                                    <span className="font-medium text-blue-600 group-hover/prov:text-blue-700 transition-colors flex items-center gap-0.5 min-w-0 truncate">
                                        {item.proveedor_nombre}
                                        <ChevronRight className="w-3.5 h-3.5 text-blue-500/70 group-hover/prov:text-blue-600 group-hover/prov:translate-x-0.5 transition-all" />
                                    </span>
                                </div>
                                <div className="flex justify-between items-center gap-3">
                                    <span>N° Cliente:</span>
                                    <span className="font-mono text-slate-700 font-medium bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">#{item.numero_cliente}</span>
                                </div>
                                {item.numero_servicio && (
                                    <div className="flex justify-between items-center gap-3">
                                        <span>N° Servicio:</span>
                                        <span className="text-slate-600 font-medium">{item.numero_servicio}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center gap-3">
                                    <span>Tipo Doc:</span>
                                    {item.tipo_documento_nombre ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] font-medium uppercase border border-slate-200">
                                            <FileText className="w-2.5 h-2.5" />
                                            {item.tipo_documento_nombre}
                                        </span>
                                    ) : <span className="text-slate-400">-</span>}
                                </div>
                            </div>

                            {/* Acciones */}
                            <div className="grid grid-cols-2 gap-2 mt-auto pt-2 border-t border-slate-100">
                                {can('servicios.change_servicio') && (
                                    <button
                                        onClick={() => handleEdit(item)}
                                        className="flex items-center justify-center gap-2 bg-blue-50 text-blue-700 h-10 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                                    >
                                        <Pencil className="w-3.5 h-3.5" /> Editar
                                    </button>
                                )}
                                {can('servicios.delete_servicio') && (
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
                    {!loading && services.length === 0 && (
                        <div className="py-20 text-center flex flex-col items-center gap-4">
                            <FolderSearch className="w-10 h-10 text-slate-200" />
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No hay servicios registrados</h3>
                        </div>
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left whitespace-nowrap relative">
                        <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                            <tr>
                                <SortableHeader label="Establecimiento" sortKey="establecimiento__nombre" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Proveedor / Servicio" sortKey="proveedor__nombre" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="N° Cliente (ID)" sortKey="numero_cliente" currentOrdering={ordering} onSort={handleSort} />
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100">Tipo Doc.</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {services.map(item => (
                                <tr key={item.id} className="hover:bg-blue-50/20 transition-all group">
                                    <td className="px-4 py-2 border-r border-slate-50 text-[11px] font-medium text-slate-700 uppercase tracking-tighter">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:border-blue-200 transition-colors">
                                                <Building2 className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-[11px] font-medium text-slate-700 uppercase tracking-tighter">{item.establecimiento_nombre}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 border-r border-slate-50 text-[11px] font-medium text-slate-700 uppercase tracking-tighter">
                                        <div
                                            onClick={() => handleOpenDetail(item)}
                                            className="flex items-center gap-1.5 cursor-pointer group/prov max-w-fit"
                                        >
                                            <span className="text-[11px] font-medium text-blue-600 group-hover/prov:text-blue-700 transition-colors flex items-center gap-0.5">
                                                {item.proveedor_nombre}
                                                <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover/prov:opacity-100 group-hover/prov:translate-x-0.5 transition-all text-blue-500" />
                                            </span>
                                            {item.numero_servicio && (
                                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                                    ID: {item.numero_servicio}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 border-r border-slate-50 text-[11px] font-medium text-slate-500 uppercase tracking-tighter">
                                        <span className="inline-flex font-mono font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 text-[11px]">
                                            #{item.numero_cliente}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 border-r border-slate-50 text-[11px] font-medium text-slate-500 uppercase tracking-tighter">
                                        {item.tipo_documento_nombre ? (
                                            <div className="flex items-center gap-2 px-2 py-0.5 bg-slate-100/50 rounded-lg border border-slate-200 w-fit">
                                                <FileText className="w-3.5 h-3.5 text-slate-500" />
                                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{item.tipo_documento_nombre}</span>
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <div className="flex justify-end gap-1 px-1">
                                            {can('servicios.change_servicio') && (
                                                <button onClick={() => handleEdit(item)} className={BTN_ICON_EDIT} title="Editar">
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            {can('servicios.delete_servicio') && (
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

            {/* Service Detail & Yearly Chart Modal */}
            <ServiceDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                service={selectedServiceForDetail}
            />
        </div>
    );
};

export default ServicesDashboard;
