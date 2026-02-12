import React, { useState, useEffect } from 'react';
import api from '../../api';
import { DollarSign, Search, Plus, Edit2, Trash2, X, Save, Building2, Calendar, FileText, FileCheck, CheckSquare, Square, Power } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DateInput from '../../components/common/DateInput';
import Pagination from '../../components/common/Pagination';
import FilterBar from '../../components/common/FilterBar';
import SortableHeader from '../../components/common/SortableHeader';
import BulkUploadModal from '../../components/common/BulkUploadModal';
import PaymentModal from '../../components/services/PaymentModal';

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
    const [groups, setGroups] = useState([]);
    const [selectedSignerGroup, setSelectedSignerGroup] = useState(localStorage.getItem('last_signer_group') || '');
    const [selectedSigner, setSelectedSigner] = useState('');

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
                const [typesRes, provRes, grpRes] = await Promise.all([
                    api.get('tipos-proveedores/'),
                    api.get('proveedores/'),
                    api.get('grupos/', { params: { page_size: 1000 } })
                ]);
                setProviderTypes(typesRes.data.results || typesRes.data);
                setProviders(provRes.data.results || provRes.data);
                setGroups(grpRes.data.results || grpRes.data);

                // Pre-select group from localStorage or first group
                const savedGroup = localStorage.getItem('last_signer_group');
                const allGroups = grpRes.data.results || grpRes.data;
                const activeGrp = allGroups.find(g => g.id.toString() === savedGroup) || allGroups[0];

                if (activeGrp) {
                    setSelectedSignerGroup(activeGrp.id);
                    setSelectedSigner(activeGrp.jefe || '');
                }
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
                registros_ids: Array.from(selectedIds),
                grupo_firmante: selectedSignerGroup || null,
                firmante: selectedSigner || null
            });
            alert("Recepción Conforme generada exitosamente.");
            fetchData(currentPage, searchQuery);
            setSelectedIds(new Set());
        } catch (error) {
            console.error(error);
            alert("Error al generar RC: " + (error.response?.data?.detail || error.message));
        }
    };

    const handleSave = async (dataToSubmit) => {
        try {
            if (editingId) {
                await api.put(`registros-pagos/${editingId}/`, dataToSubmit);
            } else {
                await api.post('registros-pagos/', dataToSubmit);
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
                                className="w-full md:w-48 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                            >
                                <option value="">Todos los Tipos</option>
                                {providerTypes.map(t => (
                                    <option key={t.id} value={t.id}>{t.nombre}</option>
                                ))}
                            </select>

                            <select
                                value={selectedProvider}
                                onChange={handleProviderChange}
                                className="w-full md:w-64 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                            >
                                <option value="">Todos los Proveedores</option>
                                {providers.map(p => (
                                    <option key={p.id} value={p.id}>{p.nombre}</option>
                                ))}
                            </select>

                            <select
                                value={statusFilter}
                                onChange={handleStatusChange}
                                className="w-full md:w-40 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                            >
                                <option value="all">Ver: Todos</option>
                                <option value="pending">Pendientes</option>
                                <option value="paid">Con RC</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            {selectedIds.size > 0 && (
                                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                                    <div className="flex flex-col gap-1">
                                        <select
                                            value={selectedSignerGroup}
                                            onChange={(e) => {
                                                const gid = e.target.value;
                                                setSelectedSignerGroup(gid);
                                                localStorage.setItem('last_signer_group', gid);
                                                const grp = groups.find(g => g.id.toString() === gid);
                                                if (grp) setSelectedSigner(grp.jefe || '');
                                            }}
                                            className="px-3 py-1.5 border border-indigo-200 rounded-lg text-[10px] font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                                            title="Seleccionar grupo que firmará esta RC"
                                        >
                                            <option value="">Seleccionar Grupo...</option>
                                            {groups.map(g => (
                                                <option key={g.id} value={g.id}>{g.nombre}</option>
                                            ))}
                                        </select>

                                        {selectedSignerGroup && (
                                            <select
                                                value={selectedSigner}
                                                onChange={(e) => setSelectedSigner(e.target.value)}
                                                className="px-3 py-1.5 border border-amber-200 rounded-lg text-[10px] font-bold text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white shadow-sm"
                                                title="Seleccionar funcionario que firmará"
                                            >
                                                <option value="">Seleccionar Firmante...</option>
                                                {groups.find(g => g.id.toString() === selectedSignerGroup.toString())?.miembros_detalle?.map(m => (
                                                    <option key={m.id} value={m.id}>
                                                        {m.nombre} {m.id === groups.find(g => g.id.toString() === selectedSignerGroup.toString())?.jefe ? '(Jefe)' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    <button
                                        onClick={handleGenerateRC}
                                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30 font-bold whitespace-nowrap text-xs h-fit"
                                    >
                                        <FileCheck className="w-4 h-4" />
                                        <span>Generar RC ({selectedIds.size})</span>
                                    </button>
                                </div>
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
                                <th className="p-2.5 w-10">
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
                                            <CheckSquare className="w-4 h-4 text-blue-600" />
                                        ) : (
                                            <Square className="w-4 h-4" />
                                        )}
                                    </button>
                                </th>
                                <SortableHeader label="Documento" sortKey="nro_documento" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Fecha Emisión" sortKey="fecha_emision" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Fecha Venc." sortKey="fecha_vencimiento" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Envío a Pago" sortKey="fecha_pago" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Establecimiento" sortKey="establecimiento__nombre" currentOrdering={ordering} onSort={handleSort} />
                                <th className="p-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Servicio</th>
                                <SortableHeader label="Monto" sortKey="monto_total" currentOrdering={ordering} onSort={handleSort} className="text-right" />
                                <th className="p-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors text-xs">
                                    <td className="p-2.5 text-center">
                                        {!item.recepcion_conforme ? (
                                            <button
                                                onClick={() => toggleSelection(item.id)}
                                                className="text-slate-400 hover:text-blue-600 transition-colors"
                                            >
                                                {selectedIds.has(item.id) ? (
                                                    <CheckSquare className="w-4 h-4 text-blue-600" />
                                                ) : (
                                                    <Square className="w-4 h-4" />
                                                )}
                                            </button>
                                        ) : (
                                            <div className="w-4 h-4 mx-auto" />
                                        )}
                                    </td>
                                    <td className="p-2.5">
                                        <div className="font-mono text-xs font-semibold text-slate-800">{item.nro_documento}</div>
                                        {item.recepcion_conforme_folio && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800 border-green-200 border mt-1">
                                                RC: {item.recepcion_conforme_folio}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-2.5 text-slate-600">
                                        {formatDate(item.fecha_emision)}
                                    </td>
                                    <td className="p-2.5 text-slate-600">
                                        {formatDate(item.fecha_vencimiento)}
                                    </td>
                                    <td className="p-2.5">
                                        <div className="flex items-center gap-2 text-slate-700 font-medium">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                            {formatDate(item.fecha_pago)}
                                        </div>
                                    </td>
                                    <td className="p-2.5">
                                        <div className="flex items-center gap-2 text-slate-700">
                                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                            {item.establecimiento_nombre}
                                        </div>
                                    </td>
                                    <td className="p-2.5">
                                        <div className="font-medium text-blue-700 truncate max-w-xs" title={item.servicio_detalle}>
                                            {item.servicio_detalle}
                                        </div>
                                    </td>
                                    <td className="p-2.5 text-right">
                                        <div className="font-bold text-slate-900">{formatCurrency(item.monto_total)}</div>
                                    </td>
                                    <td className="p-2.5 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                title="Editar"
                                                disabled={item.recepcion_conforme}
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="Eliminar"
                                                disabled={item.recepcion_conforme}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
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
