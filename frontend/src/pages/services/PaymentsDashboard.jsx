import React, { useState, useEffect } from 'react';
import api from '../../api';
import { DollarSign, Search, Plus, Edit2, Trash2, X, Save, Building2, Calendar, FileText, FileCheck, CheckSquare, Square, Power, Download, Pencil, Archive, ArchiveRestore } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DateInput from '../../components/common/DateInput';
import Pagination from '../../components/common/Pagination';
import FilterBar from '../../components/common/FilterBar';
import SortableHeader from '../../components/common/SortableHeader';
import BulkUploadModal from '../../components/common/BulkUploadModal';
import PaymentModal from '../../components/services/PaymentModal';
import FormSelect from '../../components/common/FormSelect';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../hooks/usePermission';

const PaymentsDashboard = () => {
    const { user } = useAuth();
    const { can } = usePermission();
    const isPrivileged = user?.is_superuser || can('servicios.delete_recepcionconforme');

    const [payments, setPayments] = useState([]);
    const [services, setServices] = useState([]);
    const [establishments, setEstablishments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showBulkForm, setShowBulkForm] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [bulkErrors, setBulkErrors] = useState([]);

    // Pagination & Search
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [ordering, setOrdering] = useState('-fecha_pago');
    const [pageSize, setPageSize] = useState(10);
    const [esHistoricoFilter, setEsHistoricoFilter] = useState('false'); // 'false', 'true', 'all'

    const [editingId, setEditingId] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Filter Data
    const [providerTypes, setProviderTypes] = useState([]);
    const [providers, setProviders] = useState([]);
    const [selectedType, setSelectedType] = useState('');
    const [selectedProvider, setSelectedProvider] = useState('');

    // Initial state for form
    const initialFormState = {
        servicio: '',
        establecimiento: '',
        fecha_emision: '',
        fecha_vencimiento: '',
        fecha_pago: '',
        nro_documento: '',
        monto_interes: 0,
        monto_total: ''
    };

    const [formData, setFormData] = useState(initialFormState);
    const [statusFilter, setStatusFilter] = useState('all'); // all, paid, pending

    const fetchData = async (page = 1, search = searchQuery, status = statusFilter, order = ordering) => {
        setLoading(true);
        try {
            const params = {
                page,
                search,
                ordering: order,
                page_size: pageSize
            };

            if (esHistoricoFilter !== 'all') {
                params.es_historico = esHistoricoFilter;
            }

            if (status === 'paid') {
                params.recepcion_conforme__isnull = 'false';
            } else if (status === 'pending') {
                params.recepcion_conforme__isnull = 'true';
            }

            if (selectedType) {
                params['servicio__proveedor__tipo_proveedor'] = selectedType;
            }
            if (selectedProvider) {
                params['servicio__proveedor'] = selectedProvider;
            }

            const [payRes, servRes, estRes] = await Promise.all([
                api.get('registros-pagos/', { params }),
                api.get('servicios/', { params: { page_size: 1000 } }),
                api.get('establecimientos/', { params: { page_size: 1000 } })
            ]);

            setPayments(payRes.data.results || []);
            setTotalCount(payRes.data.count || 0);
            setTotalPages(Math.ceil((payRes.data.count || 0) / pageSize));

            setServices(servRes.data.results || servRes.data);
            setEstablishments(estRes.data.results || estRes.data);

            setSelectedIds(new Set());
        } catch (error) {
            console.error("Error fetching data:", error);
            setPayments([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const [typesRes, provRes] = await Promise.all([
                    api.get('tipos-proveedores/', { params: { page_size: 1000 } }),
                    api.get('proveedores/', { params: { page_size: 1000 } })
                ]);
                setProviderTypes(typesRes.data.results || typesRes.data);
                setProviders(provRes.data.results || provRes.data);

            } catch (error) {
                console.error("Error fetching filter data:", error);
            }
        };
        fetchFilters();
    }, []);

    useEffect(() => {
        fetchData(currentPage, searchQuery, statusFilter, ordering);
    }, [currentPage, statusFilter, ordering, selectedType, selectedProvider, pageSize, esHistoricoFilter]);

    const handleTypeChange = async (e) => {
        const typeId = e.target.value;
        setSelectedType(typeId);
        setSelectedProvider('');
        setCurrentPage(1);

        if (typeId) {
            try {
                const res = await api.get(`proveedores/?tipo_proveedor=${typeId}`, { params: { page_size: 1000 } });
                setProviders(res.data.results || res.data);
            } catch (error) {
                console.error("Error fetching filtered providers:", error);
            }
        } else {
            const res = await api.get('proveedores/', { params: { page_size: 1000 } });
            setProviders(res.data.results || res.data);
        }
    };

    const handleProviderChange = (e) => {
        setSelectedProvider(e.target.value);
        setCurrentPage(1);
    };

    const handleSort = (newOrdering) => {
        setOrdering(newOrdering);
        setCurrentPage(1);
    };

    const handleSearch = (query) => {
        setSearchQuery(query);
        setCurrentPage(1);
        fetchData(1, query, statusFilter);
    };

    const handleStatusChange = (e) => {
        setStatusFilter(e.target.value);
        setCurrentPage(1);
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleEdit = (item) => {
        setFormData({
            servicio: item.servicio,
            establecimiento: item.establecimiento,
            fecha_emision: item.fecha_emision,
            fecha_vencimiento: item.fecha_vencimiento,
            fecha_pago: item.fecha_pago,
            nro_documento: item.nro_documento,
            monto_interes: item.monto_interes,
            monto_total: item.monto_total
        });
        setEditingId(item.id);
        setShowForm(true);
    };

    const handleNew = () => {
        setFormData(initialFormState);
        setEditingId(null);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Seguro que desea eliminar este registro de pago?")) return;
        try {
            await api.delete(`registros-pagos/${id}/`);
            fetchData(currentPage, searchQuery, statusFilter);
        } catch (error) {
            console.error(error);
            alert("Error al eliminar el registro. Verifique que no tenga documentos asociados.");
        }
    };

    const toggleSelection = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleGenerateHistoricalRC = async () => {
        if (selectedIds.size === 0) return;

        const selectedPayments = payments.filter(p => selectedIds.has(p.id));
        const firstPayment = selectedPayments[0];
        const firstService = services.find(s => s.id === firstPayment.servicio);
        if (!firstService) return;
        const providerId = firstService.proveedor;

        for (let p of selectedPayments) {
            const s = services.find(srv => srv.id === p.servicio);
            if (!s || s.proveedor !== providerId) {
                alert("Error: Todos los pagos seleccionados deben pertenecer al mismo proveedor.");
                return;
            }
        }

        if (!window.confirm(`¿Marcar ${selectedIds.size} pagos como RC HISTÓRICA?`)) return;

        try {
            await api.post('recepciones-conformes/create_historical/', {
                proveedor: providerId,
                registros_ids: Array.from(selectedIds)
            });
            alert("Pagos marcados como Históricos exitosamente.");
            fetchData(currentPage, searchQuery, statusFilter, ordering);
            setSelectedIds(new Set());
        } catch (error) {
            console.error(error);
            alert("Error al procesar acción histórica.");
        }
    };

    const handleGenerateRC = async () => {
        if (selectedIds.size === 0) return;

        const selectedPayments = payments.filter(p => selectedIds.has(p.id));
        const firstPayment = selectedPayments[0];
        const firstService = services.find(s => s.id === firstPayment.servicio);
        if (!firstService) {
            alert("Error: No se pudo identificar el servicio.");
            return;
        }
        const providerId = firstService.proveedor;

        for (let p of selectedPayments) {
            const s = services.find(srv => srv.id === p.servicio);
            if (!s || s.proveedor !== providerId) {
                alert("Error: Todos los pagos seleccionados deben pertenecer al mismo proveedor.");
                return;
            }
        }

        if (!window.confirm(`¿Generar Recepción Conforme para ${selectedIds.size} pagos?`)) return;

        try {
            await api.post('recepciones-conformes/', {
                proveedor: providerId,
                registros_ids: Array.from(selectedIds)
            });
            alert("Recepción Conforme generada exitosamente.");
            fetchData(currentPage, searchQuery);
            setSelectedIds(new Set());
        } catch (error) {
            console.error(error);
            alert("Error al generar RC: " + (error.response?.data?.detail || error.message));
        }
    };

    const handleDownloadRC = async (payment) => {
        try {
            const response = await api.get(`registros-pagos/${payment.id}/generate_pdf/`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `RC_${payment.nro_documento}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error(error);
            alert("Error al descargar la RC.");
        }
    };

    const handleSave = async (dataToSubmit) => {
        try {
            const preparedData = {
                ...dataToSubmit,
                monto_total: parseInt(dataToSubmit.monto_total) || 0,
                monto_interes: parseInt(dataToSubmit.monto_interes) || 0
            };

            if (editingId) {
                await api.put(`registros-pagos/${editingId}/`, preparedData);
            } else {
                await api.post('registros-pagos/', preparedData);
            }
            setShowForm(false);
            fetchData(currentPage, searchQuery, statusFilter);
        } catch (error) {
            console.error(error);
            const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            alert("Error al guardar registro: " + detail);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const response = await api.get('registros-pagos/download_template/', {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'plantilla_pagos.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error(error);
            alert("Error al descargar la plantilla.");
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
            const res = await api.post('registros-pagos/bulk_upload/', formDataFile, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert(res.data.message);
            setShowBulkForm(false);
            fetchData(currentPage, searchQuery);
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

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    return (
        <div className="flex flex-col w-full lg:h-[calc(100vh-140px)] lg:overflow-hidden">
            {/* Header section with Premium design */}
            <div className="shrink-0 mb-6 lg:mb-4 px-1">
                <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2 leading-none uppercase">
                            Pagos de Servicios
                        </h2>
                        <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-1.5 flex items-center gap-1.5 uppercase tracking-wide">
                            Gestión y registro de consumos de servicios básicos.
                        </p>
                    </div>

                    <div className="flex gap-2">
                        {can('servicios.add_registropago') && (
                            <button
                                onClick={handleBulk}
                                className="group relative inline-flex items-center justify-center p-2.5 lg:px-4 lg:py-2 bg-emerald-50 text-emerald-700 text-sm font-semibold rounded-[14px] lg:rounded-xl overflow-hidden transition-all hover:bg-emerald-100 active:scale-95 shadow-sm shrink-0 border border-emerald-100"
                                title="Carga Masiva"
                            >
                                <FileText className="w-5 h-5 lg:w-4 lg:h-4 lg:mr-2" />
                                <span className="hidden lg:inline">Carga Masiva</span>
                            </button>
                        )}
                        {can('servicios.add_registropago') && (
                            <button
                                onClick={handleNew}
                                className="group relative inline-flex items-center justify-center p-2.5 lg:px-5 lg:py-2 bg-blue-600 text-white text-sm font-semibold rounded-[14px] lg:rounded-xl overflow-hidden transition-all hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-500/20 shrink-0"
                            >
                                <Plus className="w-5 h-5 lg:w-4 lg:h-4 lg:mr-2" />
                                <span className="hidden lg:inline whitespace-nowrap">Registrar Pago</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:flex lg:items-center gap-2 lg:gap-3">
                    <div className="col-span-2 lg:flex-1 lg:max-w-md">
                        <FilterBar onSearch={handleSearch} placeholder="Buscar por Garden, Factura o Cliente..." />
                    </div>

                    <FormSelect
                        value={selectedType}
                        onChange={handleTypeChange}
                        options={providerTypes.map(t => ({ value: t.id, label: t.nombre.toUpperCase() }))}
                        placeholder="TIPOS DE PROVEEDOR"
                        inputClassName="!py-1.5 !h-[38px] !text-[10px] !font-bold lg:!w-36 rounded-xl border-slate-200"
                    />

                    <FormSelect
                        value={selectedProvider}
                        onChange={handleProviderChange}
                        options={providers.map(p => ({ value: p.id, label: p.nombre.toUpperCase() }))}
                        placeholder="PROVEEDOR"
                        inputClassName="!py-1.5 !h-[38px] !text-[10px] !font-bold lg:!w-44 rounded-xl border-slate-200"
                    />

                    <FormSelect
                        value={statusFilter}
                        onChange={handleStatusChange}
                        options={[
                            { value: 'all', label: 'TODOS LOS ESTADOS' },
                            { value: 'pending', label: 'PENDIENTES DE RC' },
                            { value: 'paid', label: 'CON RC GENERADA' }
                        ]}
                        placeholder="ESTADO"
                        inputClassName="!py-1.5 !h-[38px] !text-[10px] !font-bold lg:!w-40 rounded-xl border-slate-200"
                    />

                    <FormSelect
                        value={esHistoricoFilter}
                        onChange={(e) => setEsHistoricoFilter(e.target.value)}
                        options={[
                            { value: 'false', label: 'REGISTROS VIGENTES' },
                            { value: 'true', label: 'REGISTROS HISTÓRICOS' },
                            { value: 'all', label: 'VER TODOS' }
                        ]}
                        placeholder="TIPO"
                        inputClassName="!py-1.5 !h-[38px] !text-[10px] !font-bold lg:!w-36 rounded-xl border-slate-200"
                    />

                    <select
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="w-[84px] pl-3 pr-7 h-[38px] bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm cursor-pointer"
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
            </div>

            {/* Modal Form */}
            <PaymentModal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                onSave={handleSave}
                editingId={editingId}
                initialData={formData}
                lookups={{
                    establishments,
                    services
                }}
            />

            {/* Bulk Upload Modal */}
            <BulkUploadModal
                isOpen={showBulkForm}
                onClose={() => setShowBulkForm(false)}
                title="Carga Masiva de Pagos"
                description="Suba un archivo Excel con los registros de pago de servicios."
                onUpload={handleBulkUpload}
                onDownloadTemplate={handleDownloadTemplate}
                uploading={uploading}
                errors={bulkErrors}
            />

            {/* Table Container con Zero-Scroll */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                {/* Mobile Cards View */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-4 p-4 overflow-auto custom-scrollbar">
                    {payments.map(item => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col relative overflow-hidden"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => !item.recepcion_conforme && toggleSelection(item.id)}
                                        className={`transition-colors ${item.recepcion_conforme ? 'opacity-20 cursor-not-allowed' : 'text-slate-400'}`}
                                        disabled={!!item.recepcion_conforme}
                                    >
                                        {selectedIds.has(item.id) || !!item.recepcion_conforme ? (
                                            <CheckSquare className={`w-5 h-5 ${item.recepcion_conforme ? 'text-slate-400' : 'text-blue-600'}`} />
                                        ) : (
                                            <Square className="w-5 h-5" />
                                        )}
                                    </button>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-xs leading-tight uppercase truncate max-w-[150px]">{item.establecimiento_nombre}</h3>
                                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">{item.nro_documento}</p>
                                    </div>
                                </div>
                                {item.recepcion_conforme_folio && (
                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tight border ${item.recepcion_conforme_estado === 'HISTORICA' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                                        {item.recepcion_conforme_estado === 'HISTORICA' ? 'H-RC' : 'RC'}: {item.recepcion_conforme_folio}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-slate-500 font-medium uppercase tracking-tighter">Servicio:</span>
                                    <span className="font-bold text-slate-700 truncate max-w-[150px]">{item.servicio_detalle}</span>
                                </div>
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-slate-500 font-medium uppercase tracking-tighter">F. Pago:</span>
                                    <span className="font-bold text-slate-700">{formatDate(item.fecha_pago)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-slate-500 font-medium uppercase tracking-tighter">Monto:</span>
                                    <span className="font-black text-slate-900 text-xs">{formatCurrency(item.monto_total)}</span>
                                </div>
                            </div>

                            {/* Acciones */}
                            <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-slate-50">
                                {can('servicios.change_registropago') && (
                                    <button
                                        onClick={() => handleEdit(item)}
                                        disabled={item.recepcion_conforme && !isPrivileged}
                                        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-[10px] uppercase shadow-sm active:scale-95 transition-all
                                            ${item.recepcion_conforme && !isPrivileged ? 'bg-slate-50 text-slate-300' : 'bg-indigo-50 text-indigo-700'}`}
                                    >
                                        <Pencil className="w-3.5 h-3.5" /> Editar
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDownloadRC(item)}
                                    disabled={!item.recepcion_conforme || item.recepcion_conforme_estado === 'HISTORICA'}
                                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-[10px] uppercase shadow-sm active:scale-95 transition-all
                                        ${(!item.recepcion_conforme || item.recepcion_conforme_estado === 'HISTORICA') ? 'bg-slate-50 text-slate-300' : 'bg-emerald-50 text-emerald-700'}`}
                                >
                                    <Download className="w-3.5 h-3.5" /> PDF
                                </button>
                                {can('servicios.delete_registropago') && !item.recepcion_conforme && (
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="col-span-2 flex items-center justify-center gap-2 bg-red-50 text-red-600 py-2.5 rounded-xl font-semibold text-[10px] uppercase shadow-sm active:scale-95 transition-all mt-1"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                    {!loading && payments.length === 0 && (
                        <div className="col-span-full py-20 text-center flex flex-col items-center gap-4 uppercase font-black text-slate-300 italic">
                            No se encontraron pagos
                        </div>
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left whitespace-nowrap relative">
                        <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 w-12">
                                    <button
                                        onClick={() => {
                                            const selectable = payments.filter(p => !p.recepcion_conforme);
                                            if (selectable.length === 0) return;
                                            const allSelectableAreSelected = selectable.every(p => selectedIds.has(p.id));
                                            const newSet = new Set(selectedIds);
                                            if (allSelectableAreSelected) selectable.forEach(p => newSet.delete(p.id));
                                            else selectable.forEach(p => newSet.add(p.id));
                                            setSelectedIds(newSet);
                                        }}
                                        disabled={!payments.some(p => !p.recepcion_conforme)}
                                        className={`transition-colors ${!payments.some(p => !p.recepcion_conforme) ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-blue-600'}`}
                                    >
                                        {payments.some(p => !p.recepcion_conforme) && payments.filter(p => !p.recepcion_conforme).every(p => selectedIds.has(p.id)) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                                    </button>
                                </th>
                                <SortableHeader label="Documento" sortKey="nro_documento" currentOrdering={ordering} onSort={handleSort} className="px-4 py-3 text-xs font-semibold text-slate-500 tracking-wider uppercase" />
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 tracking-wider uppercase">Servicio</th>
                                <SortableHeader label="Establecimiento" sortKey="establecimiento__nombre" currentOrdering={ordering} onSort={handleSort} className="px-4 py-3 text-xs font-semibold text-slate-500 tracking-wider uppercase" />
                                <SortableHeader label="Emisión" sortKey="fecha_emision" currentOrdering={ordering} onSort={handleSort} className="px-4 py-3 text-xs font-semibold text-slate-500 tracking-wider uppercase" />
                                <SortableHeader label="Vencimiento" sortKey="fecha_vencimiento" currentOrdering={ordering} onSort={handleSort} className="px-4 py-3 text-xs font-semibold text-slate-500 tracking-wider uppercase" />
                                <SortableHeader label="F. Pago" sortKey="fecha_pago" currentOrdering={ordering} onSort={handleSort} className="px-4 py-3 text-xs font-semibold text-slate-500 tracking-wider uppercase" />
                                <SortableHeader label="Monto" sortKey="monto_total" currentOrdering={ordering} onSort={handleSort} className="px-4 py-3 text-xs font-semibold text-slate-500 tracking-wider uppercase text-right" />
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 tracking-wider uppercase text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {payments.map(item => (
                                <tr key={item.id} className="hover:bg-blue-50/20 transition-all group">
                                    <td className="px-4 py-1">
                                        {!item.recepcion_conforme ? (
                                            <button onClick={() => toggleSelection(item.id)} className="text-slate-400 hover:text-blue-600 transition-colors">
                                                {selectedIds.has(item.id) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                                            </button>
                                        ) : <CheckSquare className="w-4 h-4 text-slate-200" />}
                                    </td>
                                    <td className="px-4 py-1">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-semibold font-mono text-slate-400 leading-none">{item.nro_documento}</span>
                                            {item.recepcion_conforme_folio && (
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border mt-0.5 w-fit uppercase tracking-tighter ${item.recepcion_conforme_estado === 'HISTORICA' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                                    {item.recepcion_conforme_estado === 'HISTORICA' ? 'H-RC' : 'RC'}: {item.recepcion_conforme_folio}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-1 font-semibold text-[12px] text-blue-600 truncate max-w-[140px]" title={item.servicio_detalle}>
                                        {item.servicio_detalle}
                                    </td>
                                    <td className="px-4 py-1">
                                        <span className="text-xs font-semibold text-slate-700 uppercase leading-tight truncate max-w-[120px]" title={item.establecimiento_nombre}>{item.establecimiento_nombre}</span>
                                    </td>
                                    <td className="px-4 py-1 text-xs font-normal text-slate-500">{formatDate(item.fecha_emision)}</td>
                                    <td className="px-4 py-1 text-xs font-normal text-slate-500">{formatDate(item.fecha_vencimiento)}</td>
                                    <td className="px-4 py-1 text-xs font-semibold text-slate-700 uppercase">{formatDate(item.fecha_pago)}</td>
                                    <td className="px-4 py-1 text-right">
                                        <span className="text-[12px] font-bold text-slate-900 leading-none">{formatCurrency(item.monto_total)}</span>
                                    </td>
                                    <td className="px-4 py-1 text-right">
                                        <div className="flex justify-end gap-1 px-1">
                                            <button onClick={() => handleDownloadRC(item)} disabled={!item.recepcion_conforme || item.recepcion_conforme_estado === 'HISTORICA'} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all disabled:opacity-10" title="PDF">
                                                <Download className="w-4 h-4" />
                                            </button>
                                            {can('servicios.change_registropago') && (
                                                <button onClick={() => handleEdit(item)} disabled={item.recepcion_conforme && !isPrivileged} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all disabled:opacity-10" title="Editar">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                            )}
                                            {can('servicios.delete_registropago') && (
                                                <button onClick={() => handleDelete(item.id)} disabled={item.recepcion_conforme && !isPrivileged} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-10" title="Eliminar">
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
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} totalCount={totalCount} />
                </div>
            </div>

            {/* Floating Bulk Action Bar */}
            <AnimatePresence>
                {selectedIds.size > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 p-4 bg-slate-900/95 backdrop-blur-md rounded-[2rem] shadow-2xl border border-white/10 text-white min-w-[320px] md:min-w-[500px]"
                    >
                        <div className="hidden md:flex items-center gap-3 pr-4 border-r border-slate-700">
                            <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-500/20">
                                <FileCheck className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-black leading-none">{selectedIds.size}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Seleccionados</span>
                            </div>
                        </div>

                        <div className="flex-1 px-2 md:px-4">
                            <p className="text-[10px] md:text-xs font-bold text-slate-300 uppercase tracking-tight text-center md:text-left">
                                ACCIÓN MASIVA: RECEPCIÓN CONFORME
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button onClick={() => setSelectedIds(new Set())} className="p-2.5 text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                            {can('servicios.add_recepcionconforme') && (
                                <button onClick={handleGenerateHistoricalRC} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 rounded-2xl transition-all shadow-lg font-black text-[9px] uppercase tracking-widest leading-none">
                                    <Archive className="w-3.5 h-3.5" /> <span className="hidden md:inline">Histórica</span>
                                </button>
                            )}
                            {can('servicios.add_recepcionconforme') && (
                                <button onClick={handleGenerateRC} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-2xl transition-all shadow-lg font-black text-[9px] uppercase tracking-widest leading-none">
                                    Generar RC
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PaymentsDashboard;
