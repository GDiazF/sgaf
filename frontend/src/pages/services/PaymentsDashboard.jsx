import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api';
import { DollarSign, Search, Plus, Trash2, X, FileText, FileCheck, CheckSquare, Square, Download, Pencil, Archive, Upload, FolderSearch, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Pagination from '../../components/common/Pagination';
import SortableHeader from '../../components/common/SortableHeader';
import BulkUploadModal from '../../components/common/BulkUploadModal';
import PaymentModal from '../../components/services/PaymentModal';
import FormSelect from '../../components/common/FormSelect';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../hooks/usePermission';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import {
    BTN_PRIMARY,
    BTN_SECONDARY,
    BTN_ICON_EDIT,
    BTN_ICON_DELETE,
    INPUT_FILTER,
    SELECT_FILTER,
    TITLE_ICON_BOX,
} from '../funcionarios/shared/funcionariosUi';

const MotionDiv = motion.div;
const BTN_UPLOAD_PDF = 'bg-blue-50 hover:bg-blue-100 text-blue-700 h-10 min-h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all inline-flex items-center justify-center gap-2 shrink-0 active:scale-95 border border-blue-100 leading-none box-border';
const BTN_BULK_EXCEL = 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 h-10 min-h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all inline-flex items-center justify-center gap-2 shrink-0 active:scale-95 border border-emerald-100 leading-none box-border';
const BTN_REGISTER_PAYMENT = 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white h-10 min-h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20 inline-flex items-center justify-center gap-2 shrink-0 active:scale-95 leading-none box-border';

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
    const [showBulkFilesModal, setShowBulkFilesModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [bulkErrors, setBulkErrors] = useState([]);
    const [bulkFilesResults, setBulkFilesResults] = useState(null);
    const [processingIds, setProcessingIds] = useState([]);

    // Pagination & Search
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [ordering, setOrdering] = useState('-fecha_pago');
    const [pageSize, setPageSize] = useState(10);
    const [esHistoricoFilter, setEsHistoricoFilter] = useState('false'); // 'false', 'true', 'all'
    const [errorMessage, setErrorMessage] = useState('');
    const [noticeMessage, setNoticeMessage] = useState('');
    const debouncedSearchQuery = useDebouncedValue(searchQuery);

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
        monto_total: '',
        consumo: ''
    };

    const [formData, setFormData] = useState(initialFormState);
    const [statusFilter, setStatusFilter] = useState('all'); // all, paid, pending

    // Generate RC Modal State
    const [showRCModal, setShowRCModal] = useState(false);
    const [rcForm, setRCForm] = useState({ grupo_firmante: '', firmante: '' });
    const [groups, setGroups] = useState([]);

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
                const [typesRes, provRes, grpRes] = await Promise.all([
                    api.get('tipos-proveedores/', { params: { page_size: 1000 } }),
                    api.get('proveedores/', { params: { page_size: 1000 } }),
                    api.get('grupos/', { params: { page_size: 1000 } })
                ]);
                setProviderTypes(typesRes.data.results || typesRes.data);
                setProviders(provRes.data.results || provRes.data);
                setGroups(grpRes.data.results || grpRes.data);

            } catch (error) {
                console.error("Error fetching filter data:", error);
            }
        };
        fetchFilters();
    }, []);

    useEffect(() => {
        if (searchQuery !== debouncedSearchQuery) return;
        fetchData(currentPage, debouncedSearchQuery, statusFilter, ordering);
    // fetchData intentionally reads the latest filter state managed in this view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, debouncedSearchQuery, searchQuery, statusFilter, ordering, selectedType, selectedProvider, pageSize, esHistoricoFilter]);

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
            monto_total: item.monto_total,
            consumo: item.consumo || ''
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
            setErrorMessage('');
            setNoticeMessage('Registro de pago eliminado correctamente.');
            fetchData(currentPage, searchQuery, statusFilter);
        } catch (error) {
            console.error(error);
            setErrorMessage('Error al eliminar el registro. Verifique que no tenga documentos asociados.');
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
                setErrorMessage('Todos los pagos seleccionados deben pertenecer al mismo proveedor.');
                return;
            }
        }

        if (!window.confirm(`¿Marcar ${selectedIds.size} pagos como RC HISTÓRICA?`)) return;

        try {
            await api.post('recepciones-conformes/create_historical/', {
                proveedor: providerId,
                registros_ids: Array.from(selectedIds)
            });
            setErrorMessage('');
            setNoticeMessage('Pagos marcados como históricos correctamente.');
            fetchData(currentPage, searchQuery, statusFilter, ordering);
            setSelectedIds(new Set());
        } catch (error) {
            console.error(error);
            setErrorMessage('Error al procesar la acción histórica.');
        }
    };

    const handleGenerateRC = async () => {
        if (selectedIds.size === 0) return;

        const selectedPayments = payments.filter(p => selectedIds.has(p.id));
        const firstPayment = selectedPayments[0];
        const firstService = services.find(s => s.id === firstPayment.servicio);
        if (!firstService) {
            setErrorMessage('No se pudo identificar el servicio del pago seleccionado.');
            return;
        }
        const providerId = firstService.proveedor;

        for (let p of selectedPayments) {
            const s = services.find(srv => srv.id === p.servicio);
            if (!s || s.proveedor !== providerId) {
                setErrorMessage('Todos los pagos seleccionados deben pertenecer al mismo proveedor.');
                return;
            }
        }

        // Instead of window.confirm, show the modal
        setShowRCModal(true);
        setRCForm({ grupo_firmante: '', firmante: '' });
    };

    const confirmGenerateRC = async () => {
        if (!rcForm.firmante) {
            setErrorMessage('Debe seleccionar un firmante.');
            return;
        }

        const selectedPayments = payments.filter(p => selectedIds.has(p.id));
        const providerId = services.find(s => s.id === selectedPayments[0].servicio).proveedor;

        try {
            await api.post('recepciones-conformes/', {
                proveedor: providerId,
                registros_ids: Array.from(selectedIds),
                grupo_firmante: rcForm.grupo_firmante,
                firmante: rcForm.firmante
            });
            setErrorMessage('');
            setNoticeMessage('Recepción conforme generada correctamente.');
            setShowRCModal(false);
            fetchData(currentPage, searchQuery);
            setSelectedIds(new Set());
        } catch (error) {
            console.error(error);
            setErrorMessage(`Error al generar RC: ${error.response?.data?.detail || error.message}`);
        }
    };

    const handleDownloadRC = async (payment, tipo = 'PAGO') => {
        try {
            const response = await api.get(`registros-pagos/${payment.id}/generate_pdf/?tipo=${tipo}`, {
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
            setErrorMessage('Error al descargar la recepción conforme.');
        }
    };

    const handleSave = async (dataToSubmit) => {
        try {
            const preparedData = {
                ...dataToSubmit,
                monto_total: parseInt(dataToSubmit.monto_total) || 0,
                monto_interes: parseInt(dataToSubmit.monto_interes) || 0,
                consumo: dataToSubmit.consumo !== '' ? parseFloat(dataToSubmit.consumo) : null
            };

            if (editingId) {
                await api.put(`registros-pagos/${editingId}/`, preparedData);
            } else {
                await api.post('registros-pagos/', preparedData);
            }
            setShowForm(false);
            setErrorMessage('');
            setNoticeMessage(editingId ? 'Registro de pago actualizado correctamente.' : 'Registro de pago creado correctamente.');
            fetchData(currentPage, searchQuery, statusFilter);
        } catch (error) {
            console.error(error);
            const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            setErrorMessage(`Error al guardar registro: ${detail}`);
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
            setErrorMessage('Error al descargar la plantilla.');
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
            setErrorMessage('');
            setNoticeMessage(res.data.message || 'Carga masiva procesada correctamente.');
            setShowBulkForm(false);
            fetchData(currentPage, searchQuery);
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

    const handleFileUpload = async (payment, file) => {
        if (!file) return;
        if (file.type !== 'application/pdf') {
            setErrorMessage('Por favor, suba un archivo PDF.');
            return;
        }

        setProcessingIds(prev => [...prev, payment.id]);
        const formData = new FormData();
        formData.append('comprobante', file);

        try {
            await api.patch(`registros-pagos/${payment.id}/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            await fetchData(currentPage, searchQuery, statusFilter, ordering);
            setErrorMessage('');
            setNoticeMessage('Comprobante actualizado correctamente.');
        } catch (error) {
            console.error(error);
            setErrorMessage('Error al subir el comprobante.');
        } finally {
            setProcessingIds(prev => prev.filter(id => id !== payment.id));
        }
    };

    const handleBulkFilesUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploading(true);
        setBulkFilesResults(null);
        
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });

        try {
            const res = await api.post('registros-pagos/bulk_upload_files/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setBulkFilesResults(res.data);
            setErrorMessage('');
            fetchData(currentPage, searchQuery, statusFilter, ordering);
        } catch (error) {
            console.error(error);
            setErrorMessage('Error en la carga masiva de archivos.');
        } finally {
            setUploading(false);
            e.target.value = null;
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
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden w-full">
            {/* Cabecera Premium Estándar */}
            <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                <div className="flex items-center gap-3">
                    <div className={TITLE_ICON_BOX}>
                        <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase">
                            Pagos de Servicios
                        </h2>
                        <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-1.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                            Gestión y registro de consumos de servicios básicos ({totalCount})
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 self-stretch md:self-auto justify-end">
                    {can('servicios.add_registropago') && (
                        <button
                            onClick={() => setShowBulkFilesModal(true)}
                            className={BTN_UPLOAD_PDF}
                            title="Subir PDFs Masivos"
                        >
                            <Upload className="w-4 h-4" />
                            <span className="whitespace-nowrap">Subir Boletas</span>
                        </button>
                    )}
                    {can('servicios.add_registropago') && (
                        <button
                            onClick={handleBulk}
                            className={BTN_BULK_EXCEL}
                            title="Carga Masiva Excel"
                        >
                            <FileText className="w-4 h-4" />
                            <span className="whitespace-nowrap">Carga Masiva</span>
                        </button>
                    )}
                    {can('servicios.add_registropago') && (
                        <button
                            onClick={handleNew}
                            className={BTN_REGISTER_PAYMENT}
                        >
                            <Plus className="w-4 h-4" />
                            <span className="whitespace-nowrap">Registrar Pago</span>
                        </button>
                    )}
                </div>
            </div>

            {errorMessage && (
                <div className="shrink-0 bg-rose-50 text-rose-600 text-[10px] font-bold uppercase p-3 rounded-xl border border-rose-100 flex gap-2 items-center">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                </div>
            )}

            {noticeMessage && (
                <div className="shrink-0 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase p-3 rounded-xl border border-blue-100 flex gap-2 items-center">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{noticeMessage}</span>
                </div>
            )}

            {/* Barra de Filtros Unificada y Simétrica (h-10 / 40px) */}
            <div className="shrink-0 grid grid-cols-2 md:flex md:flex-row items-stretch md:items-center gap-3 w-full bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="relative col-span-2 w-full md:w-72 shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Buscar por boleta, medidor, cliente..."
                        className={INPUT_FILTER}
                    />
                </div>

                <FormSelect
                    className="w-full min-w-0 md:w-40"
                    value={selectedType}
                    onChange={handleTypeChange}
                    options={providerTypes.map(t => ({ value: t.id, label: t.nombre.toUpperCase() }))}
                    placeholder="TIPOS DE PROVEEDOR"
                    inputClassName={`${SELECT_FILTER} w-full`}
                />

                <FormSelect
                    className="w-full min-w-0 md:w-48"
                    value={selectedProvider}
                    onChange={handleProviderChange}
                    options={providers.map(p => ({ value: p.id, label: p.nombre.toUpperCase() }))}
                    placeholder="PROVEEDOR"
                    inputClassName={`${SELECT_FILTER} w-full`}
                />

                <FormSelect
                    className="w-full min-w-0 md:w-44"
                    value={statusFilter}
                    onChange={handleStatusChange}
                    options={[
                        { value: 'all', label: 'TODOS LOS ESTADOS' },
                        { value: 'pending', label: 'PENDIENTES DE RC' },
                        { value: 'paid', label: 'CON RC GENERADA' }
                    ]}
                    placeholder="ESTADO"
                    inputClassName={`${SELECT_FILTER} w-full`}
                />

                <FormSelect
                    className="w-full min-w-0 md:w-40"
                    value={esHistoricoFilter}
                    onChange={(e) => {
                        setEsHistoricoFilter(e.target.value);
                        setCurrentPage(1);
                    }}
                    options={[
                        { value: 'false', label: 'REGISTROS VIGENTES' },
                        { value: 'true', label: 'REGISTROS HISTÓRICOS' },
                        { value: 'all', label: 'VER TODOS' }
                    ]}
                    placeholder="TIPO"
                    inputClassName={`${SELECT_FILTER} w-full`}
                />

                <select
                    value={pageSize}
                    onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                    }}
                    className={`${SELECT_FILTER} w-full md:w-[84px] min-w-0 ml-auto md:ml-0`}
                >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                </select>
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

            {/* Generate RC Modal */}
            {createPortal(
            <AnimatePresence>
                {showRCModal && (
                    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 overflow-hidden">
                        <MotionDiv
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed top-0 left-0 w-screen h-screen bg-slate-900/60 backdrop-blur-sm z-[9998]"
                            onClick={() => setShowRCModal(false)}
                        />
                        <MotionDiv
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden relative z-[10000] flex flex-col border border-slate-200 max-h-[90vh]"
                        >
                            <div className="p-4 md:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div className="space-y-1">
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider leading-none">Generar Recepción Conforme</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Se procesarán {selectedIds.size} pagos seleccionados</p>
                                </div>
                                <button onClick={() => setShowRCModal(false)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar">
                                <FormSelect
                                    label="Grupo de Firmante"
                                    value={rcForm.grupo_firmante}
                                    onChange={e => {
                                        const gid = e.target.value;
                                        const grp = groups.find(g => g.id.toString() === gid);
                                        setRCForm({ ...rcForm, grupo_firmante: gid, firmante: grp ? (grp.jefe || '') : '' });
                                    }}
                                    options={groups.map(g => ({ value: g.id, label: g.nombre.toUpperCase() }))}
                                    placeholder="SELECCIONE GRUPO..."
                                    inputClassName={`${SELECT_FILTER} w-full`}
                                    labelClassName="!text-[10px] !font-black !text-slate-400 !uppercase !tracking-widest !ml-1"
                                />

                                <FormSelect
                                    label="Firmante Específico"
                                    value={rcForm.firmante}
                                    onChange={e => setRCForm({ ...rcForm, firmante: e.target.value })}
                                    disabled={!rcForm.grupo_firmante}
                                    options={groups.find(g => g.id.toString() === rcForm.grupo_firmante?.toString())?.miembros_detalle?.map(m => {
                                        const group = groups.find(g => g.id.toString() === rcForm.grupo_firmante?.toString());
                                        return { value: m.id, label: `${m.nombre.toUpperCase()} ${m.id === group?.jefe ? '(JEFE)' : ''}` };
                                    }) || []}
                                    placeholder="SELECCIONE FIRMANTE..."
                                    inputClassName={`${SELECT_FILTER} w-full`}
                                    labelClassName="!text-[10px] !font-black !text-slate-400 !uppercase !tracking-widest !ml-1"
                                />

                                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mt-4">
                                    <p className="text-[10px] font-bold text-blue-600 leading-relaxed uppercase tracking-tight">
                                        ESTA ACCIÓN CREARÁ UN NUEVO DOCUMENTO PDF CON LOS LOGOS INSTITUCIONALES Y LA FIRMA DEL FUNCIONARIO SELECCIONADO.
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
                                <button type="button" onClick={() => setShowRCModal(false)} className={BTN_SECONDARY}>Cancelar</button>
                                <button onClick={confirmGenerateRC} className={BTN_PRIMARY}>
                                    <FileCheck className="w-4 h-4" /> Generar Documento
                                </button>
                            </div>
                        </MotionDiv>
                    </div>
                )}
            </AnimatePresence>,
            document.body
            )}

            {/* Table Container con Zero-Scroll */}
            <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                {/* Mobile Cards View */}
                <div className="lg:hidden p-3 flex flex-col gap-3 overflow-auto custom-scrollbar">
                    {payments.map(item => (
                        <MotionDiv
                            key={item.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3 hover:border-blue-200/60 transition-all"
                        >
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                    <button
                                        onClick={() => !item.recepcion_conforme && toggleSelection(item.id)}
                                        className={`mt-0.5 shrink-0 transition-colors ${item.recepcion_conforme ? 'opacity-20 cursor-not-allowed' : 'text-slate-400'}`}
                                        disabled={!!item.recepcion_conforme}
                                    >
                                        {selectedIds.has(item.id) || !!item.recepcion_conforme ? (
                                            <CheckSquare className={`w-5 h-5 ${item.recepcion_conforme ? 'text-slate-400' : 'text-blue-600'}`} />
                                        ) : (
                                            <Square className="w-5 h-5" />
                                        )}
                                    </button>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-medium text-slate-700 text-[11px] leading-tight uppercase tracking-tighter line-clamp-2">{item.establecimiento_nombre}</h3>
                                        <p className="text-[10px] font-medium text-blue-600 uppercase tracking-widest mt-0.5">{item.nro_documento}</p>
                                    </div>
                                </div>
                                {item.recepcion_conforme_folio && (
                                    <span className={`shrink-0 px-2 py-0.5 rounded-lg text-[9px] font-medium uppercase tracking-tight border ${item.recepcion_conforme_estado === 'HISTORICA' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                                        {item.recepcion_conforme_estado === 'HISTORICA' ? 'H-RC' : 'RC'}: {item.recepcion_conforme_folio}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-1.5 text-[10px] font-medium text-slate-500 uppercase tracking-tighter">
                                <div className="flex justify-between items-center gap-3">
                                    <span>Servicio:</span>
                                    <span className="font-medium text-slate-700 uppercase tracking-tighter text-right truncate min-w-0">{item.servicio_detalle}</span>
                                </div>
                                <div className="flex justify-between items-center gap-3">
                                    <span>Nro Cliente:</span>
                                    <span className="font-mono text-blue-600 font-medium">{item.servicio_numero_cliente}</span>
                                </div>
                                <div className="flex justify-between items-center gap-3">
                                    <span>F. Pago:</span>
                                    <span className="font-medium text-slate-700">{formatDate(item.fecha_pago)}</span>
                                </div>
                                <div className="flex justify-between items-center gap-3">
                                    <span>Monto:</span>
                                    <span className="font-medium text-slate-800 text-[11px]">{formatCurrency(item.monto_total)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Boleta PDF:</span>
                                    {item.comprobante ? (
                                        <div className="flex items-center gap-1">
                                            <a 
                                                href={item.comprobante.startsWith('http') ? item.comprobante : `${import.meta.env.VITE_API_URL}${item.comprobante}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-medium uppercase tracking-tight border border-emerald-100"
                                            >
                                                <FileCheck className="w-3 h-3" /> Ver
                                            </a>
                                            {can('servicios.change_registropago') && (
                                                <button 
                                                    onClick={async () => {
                                                        if(window.confirm("¿Eliminar comprobante?")) {
                                                            try {
                                                                await api.patch(`registros-pagos/${item.id}/`, { comprobante: null });
                                                                fetchData(currentPage, searchQuery, statusFilter, ordering);
                                                            } catch {
                                                                setErrorMessage('Error al eliminar el comprobante.');
                                                            }
                                                        }
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        can('servicios.change_registropago') ? (
                                            <label className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-medium uppercase tracking-tight border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors">
                                                <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileUpload(item, e.target.files[0])} />
                                                <Upload className="w-3 h-3" /> Subir
                                            </label>
                                        ) : null
                                    )}
                                </div>
                            </div>

                            {/* Acciones */}
                            <div className="grid grid-cols-2 gap-2 mt-auto pt-2 border-t border-slate-100">
                                {can('servicios.change_registropago') && (
                                    <button
                                        onClick={() => handleEdit(item)}
                                        disabled={item.recepcion_conforme && !isPrivileged}
                                        className={`flex items-center justify-center gap-2 h-10 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-all
                                            ${item.recepcion_conforme && !isPrivileged ? 'bg-slate-50 text-slate-300' : 'bg-blue-50 text-blue-700'}`}
                                    >
                                        <Pencil className="w-3.5 h-3.5" /> Editar
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDownloadRC(item, 'ESTANDAR')}
                                    disabled={!item.recepcion_conforme || item.recepcion_conforme_estado === 'HISTORICA'}
                                    className={`flex items-center justify-center gap-2 h-10 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-sm active:scale-95 transition-all
                                        ${(!item.recepcion_conforme || item.recepcion_conforme_estado === 'HISTORICA') ? 'bg-slate-50 text-slate-300' : 'bg-blue-50 text-blue-700'}`}
                                >
                                    <FileText className="w-3.5 h-3.5" /> STD
                                </button>
                                <button
                                    onClick={() => handleDownloadRC(item, 'PAGO')}
                                    disabled={!item.recepcion_conforme || item.recepcion_conforme_estado === 'HISTORICA'}
                                    className={`flex items-center justify-center gap-2 h-10 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-sm active:scale-95 transition-all
                                        ${(!item.recepcion_conforme || item.recepcion_conforme_estado === 'HISTORICA') ? 'bg-slate-50 text-slate-300' : 'bg-blue-50 text-blue-700'}`}
                                >
                                    <Download className="w-3.5 h-3.5" /> PAGO
                                </button>
                                {can('servicios.delete_registropago') && !item.recepcion_conforme && (
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="col-span-2 flex items-center justify-center gap-2 bg-rose-50 text-rose-600 h-10 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-all mt-1"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                    </button>
                                )}
                            </div>
                        </MotionDiv>
                    ))}
                    {loading && (
                        <div className="flex flex-col items-center justify-center p-12 h-full flex-1 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cargando Datos...</span>
                        </div>
                    )}
                    {!loading && payments.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-12 text-center h-full flex-1">
                            <FolderSearch className="w-10 h-10 text-slate-200 mb-3" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No se encontraron pagos</span>
                        </div>
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left whitespace-nowrap relative">
                        <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 w-12 border-r border-slate-100">
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
                                <SortableHeader label="Documento" sortKey="nro_documento" currentOrdering={ordering} onSort={handleSort} />
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 tracking-widest uppercase border-r border-slate-100">Servicio</th>
                                <SortableHeader label="Nro Cliente" sortKey="servicio__numero_cliente" currentOrdering={ordering} onSort={handleSort} />
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 tracking-widest uppercase text-center border-r border-slate-100">Folio RC</th>
                                <SortableHeader label="Establecimiento" sortKey="establecimiento__nombre" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Emisión" sortKey="fecha_emision" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Vencimiento" sortKey="fecha_vencimiento" currentOrdering={ordering} onSort={handleSort} />
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 tracking-widest uppercase text-center border-r border-slate-100">Consumo</th>
                                <SortableHeader label="Monto" sortKey="monto_total" currentOrdering={ordering} onSort={handleSort} />
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 tracking-widest uppercase text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && (
                                <tr>
                                    <td colSpan={11}>
                                        <div className="flex flex-col items-center justify-center p-12 h-full flex-1 gap-3">
                                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cargando Datos...</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!loading && payments.map(item => (
                                <tr key={item.id} className="hover:bg-blue-50/20 transition-all group">
                                    <td className="px-4 py-2 border-r border-slate-50">
                                        {!item.recepcion_conforme ? (
                                            <button onClick={() => toggleSelection(item.id)} className="text-slate-400 hover:text-blue-600 transition-colors">
                                                {selectedIds.has(item.id) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                                            </button>
                                        ) : <CheckSquare className="w-4 h-4 text-slate-200" />}
                                    </td>
                                    <td className="px-4 py-2 border-r border-slate-50">
                                        <span className="text-[11px] font-medium text-slate-700 font-mono tracking-tighter">{item.nro_documento}</span>
                                    </td>
                                    <td className="px-4 py-2 border-r border-slate-50 font-medium text-[11px] text-blue-600 uppercase tracking-tighter truncate max-w-[100px]" title={item.servicio_proveedor_nombre}>
                                        {item.servicio_detalle}
                                    </td>
                                    <td className="px-4 py-2 border-r border-slate-50 text-center font-mono text-[11px] font-medium text-slate-500">
                                        {item.servicio_numero_cliente}
                                    </td>
                                    <td className="px-4 py-2 border-r border-slate-50 text-center">
                                        {item.recepcion_conforme_folio ? (
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-medium border uppercase tracking-tighter shadow-sm ${item.recepcion_conforme_estado === 'HISTORICA' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                                {item.recepcion_conforme_estado === 'HISTORICA' ? 'H-RC' : 'RC'}: {item.recepcion_conforme_folio}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-medium text-slate-300 uppercase italic">Pendiente</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 border-r border-slate-50">
                                        <span className="text-[11px] font-medium text-slate-700 uppercase tracking-tighter leading-tight truncate max-w-[120px]" title={item.establecimiento_nombre}>{item.establecimiento_nombre}</span>
                                    </td>
                                    <td className="px-4 py-2 border-r border-slate-50 text-[11px] font-medium text-slate-500">{formatDate(item.fecha_emision)}</td>
                                    <td className="px-4 py-2 border-r border-slate-50 text-[11px] font-medium text-slate-500">{formatDate(item.fecha_vencimiento)}</td>
                                    <td className="px-4 py-2 border-r border-slate-50 text-center">
                                        {item.consumo !== null && item.consumo !== undefined ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[9px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                                                {item.consumo} {item.servicio_unidad_medida}
                                            </span>
                                        ) : (
                                            <span className="text-[11px] font-medium text-slate-300 italic">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 border-r border-slate-50 text-right">
                                        <span className="text-[11px] font-medium text-slate-700 leading-none">{formatCurrency(item.monto_total)}</span>
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <div className="flex justify-end gap-1 px-1">
                                            {item.comprobante ? (
                                                <div className="flex items-center gap-1">
                                                    <a 
                                                        href={item.comprobante.startsWith('http') ? item.comprobante : `${import.meta.env.VITE_API_URL}${item.comprobante}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Ver Comprobante"
                                                    >
                                                        <FileCheck className="w-3.5 h-3.5" />
                                                    </a>
                                                    {can('servicios.change_registropago') && (
                                                        <button 
                                                            onClick={async () => {
                                                                if(window.confirm("¿Desea eliminar este comprobante para subir uno nuevo?")) {
                                                                    try {
                                                                        await api.patch(`registros-pagos/${item.id}/`, { comprobante: null });
                                                                        fetchData(currentPage, searchQuery, statusFilter, ordering);
                                                                    } catch {
                                                                        setErrorMessage('Error al eliminar el comprobante.');
                                                                    }
                                                                }
                                                            }}
                                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                            title="Eliminar y Cambiar"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                can('servicios.change_registropago') ? (
                                                    <label className={`p-1.5 transition-colors rounded-lg cursor-pointer inline-flex items-center justify-center ${processingIds.includes(item.id) ? 'text-slate-300' : 'text-slate-400 hover:text-blue-500 hover:bg-blue-50'}`} title="Subir Comprobante">
                                                        <input
                                                            type="file"
                                                            accept=".pdf"
                                                            className="hidden"
                                                            onChange={(e) => handleFileUpload(item, e.target.files[0])}
                                                            disabled={processingIds.includes(item.id)}
                                                        />
                                                        <Upload className={`w-3.5 h-3.5 ${processingIds.includes(item.id) ? 'animate-pulse' : ''}`} />
                                                    </label>
                                                ) : null
                                            )}

                                            <button onClick={() => handleDownloadRC(item, 'ESTANDAR')} disabled={!item.recepcion_conforme || item.recepcion_conforme_estado === 'HISTORICA'} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-10" title="RC Monto JUNJI">
                                                <FileText className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => handleDownloadRC(item, 'PAGO')} disabled={!item.recepcion_conforme || item.recepcion_conforme_estado === 'HISTORICA'} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-10" title="RC Pago">
                                                <Download className="w-3.5 h-3.5" />
                                            </button>
                                            {can('servicios.change_registropago') && (
                                                <button onClick={() => handleEdit(item)} disabled={item.recepcion_conforme && !isPrivileged} className={`${BTN_ICON_EDIT} disabled:opacity-10`} title="Editar">
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            {can('servicios.delete_registropago') && (
                                                <button onClick={() => handleDelete(item.id)} disabled={item.recepcion_conforme && !isPrivileged} className={`${BTN_ICON_DELETE} disabled:opacity-10`} title="Eliminar">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && payments.length === 0 && (
                                <tr>
                                    <td colSpan={11}>
                                        <div className="flex flex-col items-center justify-center p-12 text-center h-full flex-1">
                                            <FolderSearch className="w-10 h-10 text-slate-200 mb-3" />
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No se encontraron pagos</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer / Pagination */}
                <div className="p-4 bg-slate-50/50 border-t border-slate-200 shrink-0">
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} totalCount={totalCount} />
                </div>
            </div>

            {/* Bulk Files Modal */}
            {createPortal(
            <AnimatePresence>
                {showBulkFilesModal && (
                    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 overflow-hidden">
                        <MotionDiv
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed top-0 left-0 w-screen h-screen bg-slate-900/60 backdrop-blur-sm z-[9998]"
                            onClick={() => !uploading && setShowBulkFilesModal(false)}
                        />
                        <MotionDiv
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-[10000] flex flex-col border border-slate-200 max-h-[90vh]"
                        >
                            <div className="p-4 md:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div className="space-y-1">
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider leading-none">Carga Masiva de Boletas (PDF)</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sube múltiples archivos PDF a la vez</p>
                                </div>
                                <button onClick={() => setShowBulkFilesModal(false)} disabled={uploading} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors disabled:opacity-50">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-5 overflow-y-auto custom-scrollbar">
                                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-5">
                                    <h4 className="text-[10px] font-black text-blue-700 uppercase mb-2 tracking-widest">Instrucciones de Nombre:</h4>
                                    <p className="text-[11px] font-medium text-blue-700 leading-relaxed uppercase">
                                        Para que el sistema asigne automáticamente cada archivo, el nombre debe seguir este patrón:<br/>
                                        <span className="text-blue-900 bg-white/70 px-2 rounded font-mono">{"{Nro_Factura}_{Nro_Cliente}.pdf"}</span><br/>
                                        Ejemplo: <span className="font-mono">846573_723621.pdf</span>
                                    </p>
                                </div>

                                {!bulkFilesResults ? (
                                    <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                                        <Upload className={`w-8 h-8 text-slate-300 mb-4 ${uploading ? 'animate-bounce' : ''}`} />
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 text-center">
                                            {uploading ? 'Procesando archivos...' : 'Seleccione o arrastre los archivos PDF'}
                                        </p>
                                        <label className={`${BTN_PRIMARY} cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                            Seleccionar Archivos
                                            <input
                                                type="file"
                                                multiple
                                                accept=".pdf"
                                                className="hidden"
                                                onChange={handleBulkFilesUpload}
                                                disabled={uploading}
                                            />
                                        </label>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex gap-4">
                                            <div className="flex-1 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                                <span className="text-[10px] font-black text-emerald-600 uppercase block mb-1">Exitosos</span>
                                                <span className="text-2xl font-black text-emerald-700">{bulkFilesResults.success.length}</span>
                                            </div>
                                            <div className="flex-1 p-4 bg-rose-50 rounded-2xl border border-rose-100">
                                                <span className="text-[10px] font-black text-rose-600 uppercase block mb-1">Errores</span>
                                                <span className="text-2xl font-black text-rose-700">{bulkFilesResults.errors.length}</span>
                                            </div>
                                        </div>

                                        {bulkFilesResults.errors.length > 0 && (
                                            <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100 max-h-[200px] overflow-auto custom-scrollbar">
                                                <p className="text-[10px] font-black text-rose-700 uppercase mb-2">Detalle de Errores:</p>
                                                {bulkFilesResults.errors.map((err, i) => (
                                                    <p key={i} className="text-[10px] font-bold text-rose-600/80 mb-1 flex items-center gap-2">
                                                        <X className="w-3 h-3" /> {err}
                                                    </p>
                                                ))}
                                            </div>
                                        )}

                                        <button 
                                            onClick={() => setBulkFilesResults(null)}
                                            className={`${BTN_SECONDARY} w-full`}
                                        >
                                            Subir más archivos
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
                                <button onClick={() => setShowBulkFilesModal(false)} className={BTN_SECONDARY}>
                                    Cerrar
                                </button>
                            </div>
                        </MotionDiv>
                    </div>
                )}
            </AnimatePresence>,
            document.body
            )}

            {/* Floating Bulk Action Bar */}
            <AnimatePresence>
                {selectedIds.size > 0 && (
                    <MotionDiv
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 p-4 bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 text-white min-w-[320px] md:min-w-[500px]"
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
                                <button onClick={handleGenerateHistoricalRC} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white h-10 px-4 rounded-xl transition-all shadow-lg font-black text-[9px] uppercase tracking-widest leading-none">
                                    <Archive className="w-3.5 h-3.5" /> <span className="hidden md:inline">Histórica</span>
                                </button>
                            )}
                            {can('servicios.add_recepcionconforme') && (
                                <button onClick={handleGenerateRC} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white h-10 px-5 rounded-xl transition-all shadow-lg shadow-blue-900/20 font-black text-[9px] uppercase tracking-widest leading-none">
                                    Generar RC
                                </button>
                            )}
                        </div>
                    </MotionDiv>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PaymentsDashboard;
