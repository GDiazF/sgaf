import React, { useState, useEffect } from 'react';
import api from '../../api';
import { DollarSign, Search, Plus, Edit2, Trash2, X, Save, Building2, Calendar, FileText, FileCheck, CheckSquare, Square, Power, Download } from 'lucide-react';
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
import PageSizeSelector from '../../components/common/PageSizeSelector';
import { Archive, ArchiveRestore } from 'lucide-react';

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

    const fetchData = async (page = 1, search = '', status = 'all', order = ordering) => {
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

            // Handle Pagination
            setPayments(payRes.data.results || []);
            setTotalCount(payRes.data.count || 0);
            setTotalPages(Math.ceil((payRes.data.count || 0) / pageSize));

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
        setSelectedProvider(''); // Reset provider on type change
        setCurrentPage(1);

        if (typeId) {
            try {
                const res = await api.get(`proveedores/?tipo_proveedor=${typeId}`, { params: { page_size: 1000 } });
                setProviders(res.data.results || res.data);
            } catch (error) {
                console.error("Error fetching filtered providers:", error);
            }
        } else {
            // If cleared, fetch all providers again
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

    const toggleHistoric = async (payment) => {
        try {
            await api.patch(`registros-pagos/${payment.id}/`, {
                es_historico: !payment.es_historico
            });
            fetchData(currentPage, searchQuery, statusFilter, ordering);
        } catch (error) {
            console.error(error);
            alert("Error al actualizar estado histórico.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Seguro que desea eliminar este registro de pago?")) return;
        try {
            await api.delete(`registros-pagos/${id}/`);
            // Pass current search AND status to maintain view
            fetchData(currentPage, searchQuery, statusFilter);
        } catch (error) {
            console.error(error);
            alert("Error al eliminar el registro. Verifique que no tenga documentos asociados.");
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
            // Ensure numeric values are numbers
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
            <div className="flex flex-col gap-3 mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Pagos de Servicios</h2>
                        <p className="text-[11px] text-slate-500">Gestión y registro de consumos.</p>
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-center gap-3 w-full lg:w-auto">
                        <div className="flex items-center gap-3">
                            <FormSelect
                                value={selectedType}
                                onChange={handleTypeChange}
                                options={providerTypes.map(t => ({ value: t.id, label: t.nombre }))}
                                placeholder="Tipos de Proveedor"
                                inputClassName="!py-2 !h-[38px] !text-xs !w-44"
                            />

                            <FormSelect
                                value={selectedProvider}
                                onChange={handleProviderChange}
                                options={providers.map(p => ({ value: p.id, label: p.nombre }))}
                                placeholder="Proveedores..."
                                inputClassName="!py-2 !h-[38px] !text-xs !w-60"
                            />

                            <FormSelect
                                value={statusFilter}
                                onChange={handleStatusChange}
                                options={[
                                    { value: 'all', label: 'Todos' },
                                    { value: 'pending', label: 'Pendientes' },
                                    { value: 'paid', label: 'Con RC' }
                                ]}
                                placeholder="Estado"
                                inputClassName="!py-2 !h-[38px] !text-xs !w-32"
                            />

                            <FormSelect
                                value={esHistoricoFilter}
                                onChange={(e) => setEsHistoricoFilter(e.target.value)}
                                options={[
                                    { value: 'false', label: 'Vigentes' },
                                    { value: 'true', label: 'Históricos' },
                                    { value: 'all', label: 'Todos' }
                                ]}
                                placeholder="Tipo Registro"
                                inputClassName="!py-2 !h-[38px] !text-xs !w-32"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <PageSizeSelector pageSize={pageSize} onChange={setPageSize} />
                            {can('servicios.add_registropago') && (
                                <>
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
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-80">
                    <FilterBar onSearch={handleSearch} placeholder="Buscar pago..." />
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
                                <th className="p-1.5 w-8">
                                    <button
                                        onClick={() => {
                                            const selectable = payments.filter(p => !p.recepcion_conforme);
                                            if (selectable.length === 0) return;

                                            const allSelectableAreSelected = selectable.every(p => selectedIds.has(p.id));
                                            const newSet = new Set(selectedIds);

                                            if (allSelectableAreSelected) {
                                                selectable.forEach(p => newSet.delete(p.id));
                                            } else {
                                                selectable.forEach(p => newSet.add(p.id));
                                            }
                                            setSelectedIds(newSet);
                                        }}
                                        disabled={!payments.some(p => !p.recepcion_conforme)}
                                        className={`transition-colors ${!payments.some(p => !p.recepcion_conforme)
                                            ? 'text-slate-200 cursor-not-allowed'
                                            : 'text-slate-400 hover:text-blue-600'}`}
                                    >
                                        {payments.some(p => !p.recepcion_conforme) && payments.filter(p => !p.recepcion_conforme).every(p => selectedIds.has(p.id)) ? (
                                            <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                                        ) : (
                                            <Square className="w-3.5 h-3.5" />
                                        )}
                                    </button>
                                </th>
                                <SortableHeader label="Documento" sortKey="nro_documento" currentOrdering={ordering} onSort={handleSort} />
                                <th className="p-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Servicio</th>
                                <SortableHeader label="Establecimiento" sortKey="establecimiento__nombre" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Fecha Emisión" sortKey="fecha_emision" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Fecha Venc." sortKey="fecha_vencimiento" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Envío a Pago" sortKey="fecha_pago" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Monto" sortKey="monto_total" currentOrdering={ordering} onSort={handleSort} className="text-right" />
                                <th className="p-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors text-[11px]">
                                    <td className="p-1.5 text-center">
                                        {!item.recepcion_conforme ? (
                                            <button
                                                onClick={() => toggleSelection(item.id)}
                                                className="text-slate-400 hover:text-blue-600 transition-colors"
                                            >
                                                {selectedIds.has(item.id) ? (
                                                    <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                                                ) : (
                                                    <Square className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                        ) : (
                                            <div className="w-3.5 h-3.5 mx-auto opacity-20">
                                                <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-1.5">
                                        <div className="font-mono text-[10px] font-semibold text-slate-800">{item.nro_documento}</div>
                                        {item.recepcion_conforme_folio && (
                                            <span className={`inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium border mt-0.5 ${item.recepcion_conforme_estado === 'HISTORICA'
                                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                                : 'bg-green-100 text-green-800 border-green-200'
                                                }`}>
                                                {item.recepcion_conforme_estado === 'HISTORICA' ? 'H-RC' : 'RC'}: {item.recepcion_conforme_folio}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-1.5">
                                        <div className="font-medium text-blue-700 truncate max-w-[150px]" title={item.servicio_detalle}>
                                            {item.servicio_detalle}
                                        </div>
                                    </td>
                                    <td className="p-1.5">
                                        <div className="flex items-center gap-1.5 text-slate-700">
                                            <Building2 className="w-3 h-3 text-slate-400" />
                                            <span className="truncate max-w-[120px]">{item.establecimiento_nombre}</span>
                                        </div>
                                    </td>
                                    <td className="p-1.5 text-slate-600">
                                        {formatDate(item.fecha_emision)}
                                    </td>
                                    <td className="p-1.5 text-slate-600">
                                        {formatDate(item.fecha_vencimiento)}
                                    </td>
                                    <td className="p-1.5">
                                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                                            <Calendar className="w-3 h-3 text-slate-400" />
                                            {formatDate(item.fecha_pago)}
                                        </div>
                                    </td>
                                    <td className="p-1.5 text-right">
                                        <div className="font-bold text-slate-900">{formatCurrency(item.monto_total)}</div>
                                    </td>
                                    <td className="p-1.5 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleDownloadRC(item)}
                                                className="p-1 px-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                title="Descargar RC"
                                                disabled={!item.recepcion_conforme || item.recepcion_conforme_estado === 'HISTORICA'}
                                            >
                                                <Download className={`w-3 h-3 ${(!item.recepcion_conforme || item.recepcion_conforme_estado === 'HISTORICA') ? 'opacity-20' : ''}`} />
                                            </button>
                                            {can('servicios.change_registropago') && (
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className={`p-1 px-1.5 rounded-lg transition-all ${item.recepcion_conforme && !isPrivileged
                                                        ? 'text-slate-200 cursor-not-allowed'
                                                        : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                                                        }`}
                                                    title={item.recepcion_conforme ? (isPrivileged ? "Editar (Admin)" : "No se puede editar: tiene RC asociada") : "Editar"}
                                                    disabled={item.recepcion_conforme && !isPrivileged}
                                                >
                                                    <Edit2 className="w-3 h-3" />
                                                </button>
                                            )}
                                            {can('servicios.delete_registropago') && (
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className={`p-1 px-1.5 rounded-lg transition-all ${item.recepcion_conforme && !isPrivileged
                                                        ? 'text-slate-200 cursor-not-allowed'
                                                        : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                                        }`}
                                                    title={item.recepcion_conforme ? (isPrivileged ? "Eliminar (Admin)" : "No se puede eliminar: tiene RC asociada") : "Eliminar"}
                                                    disabled={item.recepcion_conforme && !isPrivileged}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
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
            {/* Floating Bulk Action Bar */}
            <AnimatePresence>
                {selectedIds.size > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 p-4 bg-slate-900/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700 text-white min-w-[500px]"
                    >
                        <div className="flex items-center gap-3 pr-4 border-r border-slate-700">
                            <div className="bg-indigo-600 p-2 rounded-lg">
                                <FileCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-xs font-bold">{selectedIds.size} seleccionados</div>
                                <div className="text-[10px] text-slate-400">Generación masiva de RC</div>
                            </div>
                        </div>

                        <div className="flex-1 px-4 text-center">
                            <p className="text-[10px] text-slate-400 font-medium">
                                Los firmantes se asignan editando la RC después de generarla.
                            </p>
                        </div>

                        <div className="flex items-center gap-2 pl-4 border-l border-slate-700">
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            {can('servicios.add_recepcionconforme') && (
                                <button
                                    onClick={handleGenerateHistoricalRC}
                                    className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 rounded-xl transition-all shadow-lg font-black text-xs uppercase tracking-wider"
                                >
                                    <Archive className="w-4 h-4" />
                                    <span>Marcar RC Histórica</span>
                                </button>
                            )}
                            {can('servicios.add_recepcionconforme') && (
                                <button
                                    onClick={handleGenerateRC}
                                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl transition-all shadow-lg font-black text-xs uppercase tracking-wider"
                                >
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
