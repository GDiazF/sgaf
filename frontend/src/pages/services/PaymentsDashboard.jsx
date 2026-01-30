import React, { useState, useEffect } from 'react';
import api from '../../api';
import { DollarSign, Search, Plus, Edit2, Trash2, X, Save, Building2, Calendar, FileText, FileCheck, CheckSquare, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DateInput from '../../components/common/DateInput';
import Pagination from '../../components/common/Pagination';
import FilterBar from '../../components/common/FilterBar';
import SortableHeader from '../../components/common/SortableHeader';
import BulkUploadModal from '../../components/common/BulkUploadModal';
import { Filter } from 'lucide-react';

const PaymentsDashboard = () => {
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

    const fetchData = async (page = 1, search = '', status = 'all', order = ordering) => {
        setLoading(true);
        try {
            const params = {
                page,
                search,
                ordering: order
            };

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
                api.get('servicios/'),
                api.get('establecimientos/')
            ]);

            // Handle Pagination
            setPayments(payRes.data.results || []);
            setTotalCount(payRes.data.count || 0);
            setTotalPages(Math.ceil((payRes.data.count || 0) / 10));

            setServices(servRes.data.results || servRes.data);
            setEstablishments(estRes.data.results || estRes.data);

            setSelectedIds(new Set()); // Reset selection on refresh/page change
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
                    api.get('tipos-proveedores/'),
                    api.get('proveedores/')
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
    }, [currentPage, statusFilter, ordering, selectedType, selectedProvider]);

    const handleTypeChange = async (e) => {
        const typeId = e.target.value;
        setSelectedType(typeId);
        setSelectedProvider(''); // Reset provider on type change
        setCurrentPage(1);

        if (typeId) {
            try {
                const res = await api.get(`proveedores/?tipo_proveedor=${typeId}`);
                setProviders(res.data.results || res.data);
            } catch (error) {
                console.error("Error fetching filtered providers:", error);
            }
        } else {
            // If cleared, fetch all providers again
            const res = await api.get('proveedores/');
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
            fetchData(currentPage, searchQuery);
        } catch (error) {
            console.error(error);
            alert("Error al eliminar.");
        }
    };

    // Selection Logic
    const toggleSelection = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    // Generate RC
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


    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`registros-pagos/${editingId}/`, formData);
            } else {
                await api.post('registros-pagos/', formData);
            }
            setShowForm(false);
            fetchData(currentPage, searchQuery);
        } catch (error) {
            console.error(error);
            alert("Error al guardar registro.");
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

    // No client-side filtering
    const filteredData = payments;

    // Format currency (CLP)
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
    };

    // Format date (YYYY-MM-DD -> DD/MM/YYYY)
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col gap-4 mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Pagos de Servicios</h2>
                        <p className="text-slate-500">Registro histórico de pagos realizados.</p>
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-center gap-3 w-full lg:w-auto">
                        <div className="flex items-center gap-2">
                            <select
                                value={selectedType}
                                onChange={handleTypeChange}
                                className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm min-w-[140px]"
                            >
                                <option value="">Todos los Tipos</option>
                                {providerTypes.map(t => (
                                    <option key={t.id} value={t.id}>{t.nombre}</option>
                                ))}
                            </select>

                            <select
                                value={selectedProvider}
                                onChange={handleProviderChange}
                                className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm min-w-[160px]"
                            >
                                <option value="">Todos los Proveedores</option>
                                {providers.map(p => (
                                    <option key={p.id} value={p.id}>{p.nombre}</option>
                                ))}
                            </select>

                            <select
                                value={statusFilter}
                                onChange={handleStatusChange}
                                className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm min-w-[120px]"
                            >
                                <option value="all">Ver: Todos</option>
                                <option value="pending">Pendientes</option>
                                <option value="paid">Con RC</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            {selectedIds.size > 0 && (
                                <button
                                    onClick={handleGenerateRC}
                                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30 font-medium whitespace-nowrap text-sm animate-in fade-in slide-in-from-right-4"
                                >
                                    <FileCheck className="w-4 h-4" />
                                    <span>Generar RC ({selectedIds.size})</span>
                                </button>
                            )}

                            <button
                                onClick={handleNew}
                                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 font-medium whitespace-nowrap text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Registrar</span>
                            </button>

                            <button
                                onClick={handleBulk}
                                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/30 font-medium whitespace-nowrap text-sm"
                            >
                                <FileText className="w-4 h-4" />
                                <span>Carga Masiva</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-96">
                    <FilterBar onSearch={handleSearch} placeholder="Buscar pago..." />
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
                                    {editingId ? 'Editar Pago' : 'Registrar Nuevo Pago'}
                                </h3>
                                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                <div className="space-y-6">
                                    {/* Section 1: Context */}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-blue-600" />
                                            Contexto del Servicio
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-slate-600">Establecimiento</label>
                                                <select
                                                    required
                                                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                                    value={formData.establecimiento}
                                                    onChange={e => {
                                                        setFormData({ ...formData, establecimiento: e.target.value, servicio: '' });
                                                    }}
                                                >
                                                    <option value="">Seleccione...</option>
                                                    {establishments.map(e => (
                                                        <option key={e.id} value={e.id}>{e.nombre}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-slate-600">Servicio</label>
                                                <select
                                                    required
                                                    disabled={!formData.establecimiento}
                                                    className={`w-full p-2.5 border border-slate-200 rounded-lg outline-none text-sm transition-all ${!formData.establecimiento ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white focus:ring-2 focus:ring-blue-500'}`}
                                                    value={formData.servicio}
                                                    onChange={e => setFormData({ ...formData, servicio: e.target.value })}
                                                >
                                                    <option value="">
                                                        {!formData.establecimiento ? 'Esperando establecimiento...' : 'Seleccione Servicio...'}
                                                    </option>
                                                    {services
                                                        .filter(s => s.establecimiento == formData.establecimiento)
                                                        .map(s => (
                                                            <option key={s.id} value={s.id}>
                                                                {s.proveedor_nombre} (ID: {s.numero_cliente})
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 2: Document Details */}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-blue-600" />
                                            Detalles del Documento
                                        </h4>
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-slate-600">Nro Documento</label>
                                                <input
                                                    type="text"
                                                    required
                                                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                                    value={formData.nro_documento}
                                                    onChange={e => setFormData({ ...formData, nro_documento: e.target.value })}
                                                    placeholder="Ej. Factura 12345"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <DateInput
                                                    label="Emisión"
                                                    required
                                                    value={formData.fecha_emision}
                                                    onChange={e => setFormData({ ...formData, fecha_emision: e.target.value })}
                                                />
                                                <DateInput
                                                    label="Vencimiento"
                                                    required
                                                    value={formData.fecha_vencimiento}
                                                    onChange={e => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                                                />

                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-blue-600 uppercase">Envío a Pago</label>
                                                    <div className="relative">
                                                        <DateInput
                                                            value={formData.fecha_pago}
                                                            onChange={e => setFormData({ ...formData, fecha_pago: e.target.value })}
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 3: Amounts */}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                            <DollarSign className="w-4 h-4 text-green-600" />
                                            Montos
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-slate-600">Interés ($)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                                    value={formData.monto_interes}
                                                    onChange={e => setFormData({ ...formData, monto_interes: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-800">Monto Total ($)</label>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                                                    <input
                                                        type="number"
                                                        required
                                                        min="0"
                                                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm text-slate-900"
                                                        value={formData.monto_total}
                                                        onChange={e => setFormData({ ...formData, monto_total: e.target.value })}
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        </div>
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
                                        Guardar Registro
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Bulk Upload Modal */}
            <BulkUploadModal
                isOpen={showBulkForm}
                onClose={() => setShowBulkForm(false)}
                title="Carga Masiva de Pagos"
                description="Suba un archivo Excel con los registros de pago."
                onUpload={handleBulkUpload}
                onDownloadTemplate={handleDownloadTemplate}
                uploading={uploading}
                errors={bulkErrors}
            />

            {/* Table List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="p-4 w-10">
                                    <button
                                        onClick={() => {
                                            if (selectedIds.size === payments.length) {
                                                setSelectedIds(new Set());
                                            } else {
                                                setSelectedIds(new Set(payments.map(p => p.id)));
                                            }
                                        }}
                                        className="text-slate-400 hover:text-blue-600 transition-colors"
                                    >
                                        {selectedIds.size === payments.length && payments.length > 0 ? (
                                            <CheckSquare className="w-5 h-5 text-blue-600" />
                                        ) : (
                                            <Square className="w-5 h-5" />
                                        )}
                                    </button>
                                </th>
                                <SortableHeader label="Documento" sortKey="nro_documento" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Fecha Emisión" sortKey="fecha_emision" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Fecha Venc." sortKey="fecha_vencimiento" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Envío a Pago" sortKey="fecha_pago" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Establecimiento" sortKey="establecimiento__nombre" currentOrdering={ordering} onSort={handleSort} />
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Servicio</th>
                                <SortableHeader label="Monto" sortKey="monto_total" currentOrdering={ordering} onSort={handleSort} className="text-right" />
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 text-center">
                                        {!item.recepcion_conforme ? (
                                            <button
                                                onClick={() => toggleSelection(item.id)}
                                                className="text-slate-400 hover:text-blue-600 transition-colors"
                                            >
                                                {selectedIds.has(item.id) ? (
                                                    <CheckSquare className="w-5 h-5 text-blue-600" />
                                                ) : (
                                                    <Square className="w-5 h-5" />
                                                )}
                                            </button>
                                        ) : (
                                            <div className="w-5 h-5 mx-auto" />
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="font-mono text-sm font-semibold text-slate-800">{item.nro_documento}</div>
                                        {item.recepcion_conforme_folio && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border-green-200 border mt-1">
                                                RC: {item.recepcion_conforme_folio}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm text-slate-600">
                                        {formatDate(item.fecha_emision)}
                                    </td>
                                    <td className="p-4 text-sm text-slate-600">
                                        {formatDate(item.fecha_vencimiento)}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                            {formatDate(item.fecha_pago)}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 text-sm text-slate-700">
                                            <Building2 className="w-4 h-4 text-slate-400" />
                                            {item.establecimiento_nombre}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm font-medium text-blue-700 truncate max-w-xs" title={item.servicio_detalle}>
                                            {item.servicio_detalle}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="font-bold text-sm text-slate-900">{formatCurrency(item.monto_total)}</div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                title="Editar"
                                                disabled={item.recepcion_conforme}
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="Eliminar"
                                                disabled={item.recepcion_conforme}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredData.length === 0 && !loading && (
                    <div className="p-12 text-center text-slate-400">
                        <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No se encontraron pagos registrados.</p>
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

export default PaymentsDashboard;
