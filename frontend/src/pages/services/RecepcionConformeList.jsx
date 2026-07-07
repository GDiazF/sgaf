import React, { useState, useEffect } from 'react';
import api from '../../api';
import { FileText, Download, X, Save, Trash2, Clock, User, PlusCircle, Pencil, Search, Upload, FileCheck, FolderSearch, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePermission } from '../../hooks/usePermission';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import Pagination from '../../components/common/Pagination';
import SortableHeader from '../../components/common/SortableHeader';
import FormInput from '../../components/common/FormInput';
import FormSelect from '../../components/common/FormSelect';
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
const BTN_ICON_VIEW = 'p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors';

const RecepcionConformeList = () => {
    const [rcs, setRcs] = useState([]);
    const [loading, setLoading] = useState(true);
    const { can } = usePermission();
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [ordering, setOrdering] = useState('-fecha_emision');
    const [statusFilter, setStatusFilter] = useState('all');
    const [errorMessage, setErrorMessage] = useState('');
    const [noticeMessage, setNoticeMessage] = useState('');
    const debouncedSearchQuery = useDebouncedValue(searchQuery);

    // Edit Modal State
    const [editingRC, setEditingRC] = useState(null);
    const [editForm, setEditForm] = useState({ observaciones: '', registros_ids: [] });
    const [currentPayments, setCurrentPayments] = useState([]);
    const [availablePayments, setAvailablePayments] = useState([]);
    const [loadingAvailable, setLoadingAvailable] = useState(false);
    const [groups, setGroups] = useState([]);

    // History Modal State
    const [historyRC, setHistoryRC] = useState(null);
    const [processingIds, setProcessingIds] = useState([]);

    const fetchData = async (page = 1, search = debouncedSearchQuery, order = ordering) => {
        setLoading(true);
        try {
            const params = {
                page: page,
                page_size: pageSize,
                search: search,
                ordering: order,
                estado: statusFilter !== 'all' ? statusFilter : undefined
            };
            const [rcRes, grpRes] = await Promise.all([
                api.get('recepciones-conformes/', { params }),
                api.get('grupos/', { params: { page_size: 1000 } })
            ]);

            const rcData = rcRes.data.results || rcRes.data;
            const rcCount = rcRes.data.count || (Array.isArray(rcRes.data) ? rcRes.data.length : 0);

            setRcs(Array.isArray(rcData) ? rcData : []);
            setTotalCount(rcCount);
            setTotalPages(Math.ceil(rcCount / pageSize) || 1);
            setGroups(grpRes.data.results || grpRes.data || []);

        } catch (error) {
            console.error("Error fetching RCs:", error);
            setRcs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (searchQuery !== debouncedSearchQuery) return;
        fetchData(currentPage, debouncedSearchQuery, ordering);
    // fetchData reads latest status/page size state for this server-side table.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, pageSize, ordering, debouncedSearchQuery, searchQuery, statusFilter]);

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

    const fetchAvailablePayments = async (providerId) => {
        setLoadingAvailable(true);
        try {
            const response = await api.get(`registros-pagos/?servicio__proveedor=${providerId}&page_size=1000`);
            const data = response.data.results || response.data;
            const available = data.filter(p => !p.recepcion_conforme);
            setAvailablePayments(available);
        } catch (error) {
            console.error("Error fetching available payments:", error);
        } finally {
            setLoadingAvailable(false);
        }
    };

    const handleDownloadPDF = async (item, tipo = 'PAGO') => {
        try {
            const response = await api.get(`recepciones-conformes/${item.id}/generate_pdf/?tipo=${tipo}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const rawFilename = `RC_${item.folio || item.id}.pdf`;
            const filename = rawFilename.replace(/[/\\?%*:|"<>]/g, '-');
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Error downloading PDF:", error);
            setErrorMessage('Error al generar el PDF.');
        }
    };

    const handleEdit = (rc) => {
        setEditingRC(rc);
        setEditForm({
            observaciones: rc.observaciones || '',
            registros_ids: (rc.registros || []).map(r => r.id),
            grupo_firmante: rc.grupo_firmante || '',
            firmante: rc.firmante || '',
            folio: rc.folio || ''
        });
        setCurrentPayments(rc.registros);
        fetchAvailablePayments(rc.proveedor);
    };

    const handleViewHistory = (rc) => {
        setHistoryRC(rc);
    }

    const handleRemovePayment = (paymentId) => {
        if (!window.confirm("¿Quitar este pago de la Recepción Conforme?")) return;
        setEditForm(prev => ({
            ...prev,
            registros_ids: prev.registros_ids.filter(id => id !== paymentId)
        }));
        setCurrentPayments(prev => prev.filter(p => p.id !== paymentId));
    };

    const handleAddPayment = (payment) => {
        if (editForm.registros_ids.includes(payment.id)) return;

        setEditForm(prev => ({
            ...prev,
            registros_ids: [...prev.registros_ids, payment.id]
        }));
        setCurrentPayments(prev => [...prev, payment]);
        setAvailablePayments(prev => prev.filter(p => p.id !== payment.id));
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        try {
            await api.patch(`recepciones-conformes/${editingRC.id}/`, editForm);
            setEditingRC(null);
            fetchData(currentPage, searchQuery);
            setErrorMessage('');
            setNoticeMessage('Cambios guardados correctamente.');
        } catch (error) {
            console.error(error);
            setErrorMessage('Error al actualizar la recepción conforme.');
        }
    };

    const handleFileUpload = async (rc, file) => {
        if (!file) return;
        if (file.type !== 'application/pdf') {
            setErrorMessage('Por favor, suba un archivo PDF.');
            return;
        }

        const confirmMsg = `¿Subir recepción firmada para el folio ${rc.folio || rc.id}?\nEsto marcará el documento como COMPLETADO.`;
        if (!window.confirm(confirmMsg)) return;

        setProcessingIds(prev => [...prev, rc.id]);
        const formData = new FormData();
        formData.append('archivo_escaneado', file);

        try {
            await api.patch(`recepciones-conformes/${rc.id}/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            await fetchData(currentPage, searchQuery);
            setErrorMessage('');
            setNoticeMessage('Documento firmado subido correctamente.');
        } catch (error) {
            console.error(error);
            setErrorMessage('Error al subir el archivo.');
        } finally {
            setProcessingIds(prev => prev.filter(id => id !== rc.id));
        }
    };

    const handleDeleteFile = async (rc) => {
        if (!window.confirm(`¿Está seguro de que desea eliminar el archivo firmado de la RC ${rc.folio || rc.id}?`)) return;
        
        setProcessingIds(prev => [...prev, rc.id]);
        try {
            await api.patch(`recepciones-conformes/${rc.id}/`, { archivo_escaneado: null });
            await fetchData(currentPage, searchQuery);
            setErrorMessage('');
            setNoticeMessage('Archivo eliminado correctamente.');
        } catch (error) {
            console.error(error);
            setErrorMessage('Error al eliminar el archivo.');
        } finally {
            setProcessingIds(prev => prev.filter(id => id !== rc.id));
        }
    };

    const handleAnulate = async (rc) => {
        const confirmMsg = `¿Está seguro de que desea ANULAR la RC ${rc.folio || rc.id}?\n\nEsta acción liberará todos los pagos asociados para que puedan ser utilizados en otro documento.\nEl folio quedará marcado como ANULADA.`;
        if (!window.confirm(confirmMsg)) return;

        setProcessingIds(prev => [...prev, rc.id]);
        try {
            await api.post(`recepciones-conformes/${rc.id}/anular/`);
            await fetchData(currentPage, searchQuery, ordering);
            setErrorMessage('');
            setNoticeMessage('Recepción conforme anulada correctamente.');
        } catch (error) {
            console.error(error);
            const errorMsg = error.response?.data?.error || error.response?.data?.detail || "Error desconocido";
            setErrorMessage(`Error al anular la RC: ${errorMsg}`);
        } finally {
            setProcessingIds(prev => prev.filter(id => id !== rc.id));
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('es-CL');
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden w-full">
            {/* Cabecera Premium Estándar */}
            <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                <div className="flex items-center gap-3">
                    <div className={TITLE_ICON_BOX}>
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase">
                            Recepciones Conformes
                        </h2>
                        <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-1.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                            Historial y gestión de documentos tributarios aceptados.
                        </p>
                    </div>
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
                <div className="relative col-span-2 w-full md:w-80 shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Buscar por folio, proveedor..."
                        className={INPUT_FILTER}
                    />
                </div>

                {/* Filtro por Pestañas de Estado (Compatibilidad h-10) */}
                <div className="col-span-2 md:col-span-1 flex bg-slate-200/60 p-1 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar h-10 items-center">
                    {[
                        { id: 'all', label: 'TODO' },
                        { id: 'EMITIDA', label: 'PENDIENTES' },
                        { id: 'COMPLETADA', label: 'COMPLETADAS' },
                        { id: 'ANULADA', label: 'ANULADAS' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => { setStatusFilter(tab.id); setCurrentPage(1); }}
                            className={`flex-1 md:flex-none px-3 md:px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap h-8 flex items-center justify-center ${
                                statusFilter === tab.id
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Paginador de tamaño de página (h-10 unificado) */}
                <div className="col-span-2 md:col-span-1 flex items-center gap-2 ml-auto shrink-0 self-stretch md:self-auto justify-end">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mostrar:</span>
                    <select
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                        className={`${SELECT_FILTER} w-[84px] min-w-0`}
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
            </div>

            {/* Table Container con Zero-Scroll */}
            <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">

                {/* Mobile Cards View */}
                <div className="lg:hidden p-3 flex flex-col gap-3 overflow-auto custom-scrollbar">
                    {rcs.map(item => (
                        <MotionDiv
                            key={item.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`bg-white p-4 rounded-2xl shadow-sm border flex flex-col gap-3 hover:border-blue-200/60 transition-all ${item.estado === 'ANULADA' ? 'border-rose-100 bg-rose-50/20' : 'border-slate-200'}`}
                        >
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${item.estado === 'ANULADA' ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className={`font-medium text-[11px] leading-none uppercase tracking-tight ${item.estado === 'ANULADA' ? 'text-rose-500 line-through' : 'text-slate-700'}`}>
                                            {item.folio || 'SIN FOLIO'}
                                        </h3>
                                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-1.5">{formatDate(item.fecha_emision)}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    {item.estado === 'ANULADA' ? (
                                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-medium uppercase tracking-tight bg-rose-50 text-rose-600 border border-rose-100">
                                            Anulada
                                        </span>
                                    ) : (
                                        <>
                                            {item.archivo_escaneado ? (
                                                <div className="flex items-center gap-1">
                                                    <a 
                                                        href={item.archivo_escaneado.startsWith('http') ? item.archivo_escaneado : `${import.meta.env.VITE_API_URL}${item.archivo_escaneado}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-medium uppercase tracking-tight border border-blue-100"
                                                    >
                                                        <FileCheck className="w-3 h-3" /> Ver
                                                    </a>
                                                    {can('servicios.change_recepcionconforme') && (
                                                        <button 
                                                            onClick={() => handleDeleteFile(item)}
                                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                            title="Eliminar Archivo"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                can('servicios.change_recepcionconforme') && (
                                                    <label className={`flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-medium uppercase tracking-tight border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors ${processingIds.includes(item.id) ? 'opacity-50' : ''}`}>
                                                        <input
                                                            type="file"
                                                            accept=".pdf"
                                                            className="hidden"
                                                            onChange={(e) => handleFileUpload(item, e.target.files[0])}
                                                            disabled={processingIds.includes(item.id)}
                                                        />
                                                        <Upload className={`w-3 h-3 ${processingIds.includes(item.id) ? 'animate-pulse' : ''}`} /> Subir
                                                    </label>
                                                )
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1.5 text-[10px] font-medium text-slate-500 uppercase tracking-tighter">
                                <div className="flex justify-between items-center gap-3">
                                    <span>Proveedor:</span>
                                    <span className="font-medium text-slate-700 truncate min-w-0 uppercase text-right leading-tight">{item.proveedor_nombre || 'S/P'}</span>
                                </div>
                                <div className="flex justify-between items-center gap-3">
                                    <span>Pagos Asoc:</span>
                                    <span className="font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">{item.registros?.length || 0}</span>
                                </div>
                            </div>

                            {/* Acciones */}
                            <div className="grid grid-cols-2 gap-2 mt-auto pt-2 border-t border-slate-100">
                                <button
                                    onClick={() => handleViewHistory(item)}
                                    className="flex items-center justify-center gap-2 h-10 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-all bg-slate-50 text-slate-500"
                                >
                                    <Clock className="w-3.5 h-3.5" /> Historial
                                </button>
                                {item.estado !== 'ANULADA' && (
                                    <button
                                        onClick={() => handleDownloadPDF(item)}
                                        className="flex items-center justify-center gap-2 h-10 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-all bg-blue-50 text-blue-700"
                                    >
                                        <Download className="w-3.5 h-3.5" /> Descargar
                                    </button>
                                )}
                                {item.estado !== 'ANULADA' && can('servicios.change_recepcionconforme') && (
                                    <button
                                        onClick={() => handleEdit(item)}
                                        className="flex items-center justify-center gap-2 h-10 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-all bg-blue-50 text-blue-700"
                                    >
                                        <Pencil className="w-3.5 h-3.5" /> Editar
                                    </button>
                                )}
                                {item.estado !== 'ANULADA' && can('servicios.delete_recepcionconforme') && (
                                    <button
                                        onClick={() => handleAnulate(item)}
                                        disabled={processingIds.includes(item.id)}
                                        className="flex items-center justify-center gap-2 h-10 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-all bg-rose-50 text-rose-600"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Anular
                                    </button>
                                )}
                            </div>
                        </MotionDiv>
                    ))}
                    {loading && (
                        <div className="col-span-full flex flex-col items-center justify-center p-12 h-full flex-1 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cargando Datos...</span>
                        </div>
                    )}
                    {!loading && rcs.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-12 text-center h-full flex-1">
                            <FolderSearch className="w-10 h-10 text-slate-200 mb-3" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No se encontraron recepciones</span>
                        </div>
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block flex-1 overflow-auto custom-scrollbar bg-white">
                    <table className="w-full text-left whitespace-nowrap relative">
                        <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                            <tr>
                                <SortableHeader label="Folio" sortKey="folio" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Emisión" sortKey="fecha_emision" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Proveedor" sortKey="proveedor__nombre" currentOrdering={ordering} onSort={handleSort} />
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 tracking-widest uppercase text-center border-r border-slate-100">Pagos</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 tracking-widest uppercase text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && (
                                <tr>
                                    <td colSpan={5}>
                                        <div className="flex flex-col items-center justify-center p-12 h-full flex-1 gap-3">
                                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cargando Datos...</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!loading && rcs.map(item => (
                                <tr key={item.id} className={`hover:bg-blue-50/20 transition-all group ${item.estado === 'ANULADA' ? 'bg-rose-50/30' : ''}`}>
                                    <td className="px-4 py-2 border-r border-slate-50">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1.5 rounded-lg border ${
                                                    item.estado === 'ANULADA' ? 'bg-rose-50 text-rose-500 border-rose-100' : 
                                                    item.estado === 'COMPLETADA' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' :
                                                    'bg-slate-50 text-slate-400 border-slate-100'
                                                }`}>
                                                    <FileText className="w-3.5 h-3.5" />
                                                </div>
                                                <span className={`text-[11px] font-medium font-mono tracking-tighter uppercase ${item.estado === 'ANULADA' ? 'text-rose-500 line-through' : 'text-slate-700'}`}>
                                                    {item.folio || 'SIN FOLIO'}
                                                </span>
                                            </div>
                                            {item.estado === 'ANULADA' && <span className="text-[9px] font-medium text-rose-600 uppercase tracking-widest mt-0.5 ml-10">ANULADA</span>}
                                            {item.estado === 'COMPLETADA' && <span className="text-[9px] font-medium text-emerald-600 uppercase tracking-widest mt-0.5 ml-10">COMPLETADA</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 border-r border-slate-50 text-[11px] font-medium text-slate-500 tracking-tighter uppercase">
                                        {formatDate(item.fecha_emision)}
                                    </td>
                                    <td className="px-4 py-2 border-r border-slate-50">
                                        <div className="flex flex-col max-w-[250px]">
                                            <span className="text-[11px] font-medium text-slate-700 leading-tight uppercase tracking-tighter truncate">{item.proveedor_nombre || 'S/P'}</span>
                                            <span className="text-[9px] font-medium text-slate-400 tracking-widest mt-0.5 uppercase truncate opacity-70">{item.tipo_proveedor_nombre}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 border-r border-slate-50 text-center">
                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-medium uppercase tracking-tight border ${item.estado === 'ANULADA' ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                            {item.registros?.length || 0}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <div className="flex justify-end gap-1 px-1">
                                            <button onClick={() => handleViewHistory(item)} className={BTN_ICON_VIEW} title="Historial">
                                                <Clock className="w-3.5 h-3.5" />
                                            </button>
                                            {item.estado !== 'ANULADA' && (
                                                <>
                                                    {item.archivo_escaneado ? (
                                                        <div className="flex items-center gap-0.5">
                                                            <a 
                                                                href={item.archivo_escaneado.startsWith('http') ? item.archivo_escaneado : `${import.meta.env.VITE_API_URL}${item.archivo_escaneado}`} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className={BTN_ICON_VIEW}
                                                                title="Ver Recepción Escaneada"
                                                            >
                                                                <FileCheck className="w-3.5 h-3.5" />
                                                            </a>
                                                            {can('servicios.change_recepcionconforme') && (
                                                                <button 
                                                                    onClick={() => handleDeleteFile(item)}
                                                                    className={BTN_ICON_DELETE}
                                                                    title="Eliminar y Cambiar"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        can('servicios.change_recepcionconforme') && (
                                                            <label className={`p-1.5 transition-colors rounded-lg cursor-pointer inline-flex items-center justify-center ${processingIds.includes(item.id) ? 'text-slate-300' : 'text-slate-400 hover:text-blue-500 hover:bg-blue-50'}`} title="Subir Recepción Firmada">
                                                                <input
                                                                    type="file"
                                                                    accept=".pdf"
                                                                    className="hidden"
                                                                    onChange={(e) => handleFileUpload(item, e.target.files[0])}
                                                                    disabled={processingIds.includes(item.id)}
                                                                />
                                                                <Upload className={`w-3.5 h-3.5 ${processingIds.includes(item.id) ? 'animate-pulse' : ''}`} />
                                                            </label>
                                                        )
                                                    )}
                                                    <button onClick={() => handleDownloadPDF(item, 'PAGO')} className={BTN_ICON_VIEW} title="Descargar PDF">
                                                        <Download className="w-3.5 h-3.5" />
                                                    </button>
                                                    {can('servicios.change_recepcionconforme') && (
                                                        <button onClick={() => handleEdit(item)} className={BTN_ICON_EDIT} title="Editar">
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {can('servicios.delete_recepcionconforme') && (
                                                        <button
                                                            onClick={() => handleAnulate(item)}
                                                            disabled={processingIds.includes(item.id)}
                                                            className={`${BTN_ICON_DELETE} disabled:opacity-50`}
                                                            title="Anular"
                                                        >
                                                            <Trash2 className={`w-3.5 h-3.5 ${processingIds.includes(item.id) ? 'animate-pulse' : ''}`} />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && rcs.length === 0 && (
                                <tr>
                                    <td colSpan={5}>
                                        <div className="flex flex-col items-center justify-center p-12 text-center h-full flex-1">
                                            <FolderSearch className="w-10 h-10 text-slate-200 mb-3" />
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No se encontraron recepciones</span>
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

            {/* History Modal (Keeping logic, just touching up styles) */}
            <AnimatePresence>
                {historyRC && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <MotionDiv
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                            onClick={() => setHistoryRC(null)}
                        />
                        <MotionDiv
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 flex flex-col max-h-[85vh] border border-white/20"
                        >
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Trazabilidad</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{historyRC.folio || 'RC SIN FOLIO'}</p>
                                </div>
                                <button onClick={() => setHistoryRC(null)} className="p-2 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all shadow-sm">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto p-8 custom-scrollbar">
                                <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[1.125rem] before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-100">
                                    {historyRC?.historial && historyRC.historial.length > 0 ? (
                                        historyRC.historial.map((ev, i) => (
                                            <div key={i} className="relative pl-10">
                                                {/* Icon */}
                                                <div className={`absolute left-0 w-9 h-9 rounded-2xl flex items-center justify-center shadow-lg border-4 border-white transform transition-transform hover:scale-110 z-10 
                                                    ${ev?.accion === 'CREACION' ? 'bg-emerald-500 text-white' : ev?.accion === 'MODIFICACION_PAGOS' ? 'bg-rose-500 text-white' : 'bg-blue-600 text-white'}`}>
                                                    <Clock className="w-4 h-4" />
                                                </div>

                                                <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100">
                                                    <div className="flex items-center justify-between gap-4 mb-3">
                                                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-white rounded-lg border border-slate-200 shadow-sm">{ev?.accion?.replace('_', ' ')}</span>
                                                        <time className="text-[10px] font-black font-mono text-slate-400 uppercase">{formatDateTime(ev?.fecha)}</time>
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-700 leading-relaxed uppercase tracking-tight">{ev?.detalle}</p>
                                                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                        <User className="w-3.5 h-3.5" />
                                                        {ev?.usuario || 'SISTEMA'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12 flex flex-col items-center gap-3">
                                            <Clock className="w-12 h-12 text-slate-100" />
                                            <p className="text-sm font-black text-slate-300 uppercase tracking-widest italic">Sin registros históricos</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </MotionDiv>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Modal (Keeping same logic, cleaning up styles) */}
            <AnimatePresence>
                {editingRC && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <MotionDiv
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                            onClick={() => setEditingRC(null)}
                        />
                        <MotionDiv
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden relative z-10 flex flex-col max-h-[90vh] border border-white/20"
                        >
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Editar Contenido</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ajuste de pagos y firmantes</p>
                                </div>
                                <button onClick={() => setEditingRC(null)} className="p-2 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all shadow-sm">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveEdit} className="flex-1 overflow-auto p-8 custom-scrollbar space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormSelect
                                        label="Grupo de Firmante"
                                        value={editForm.grupo_firmante}
                                        onChange={e => {
                                            const gid = e.target.value;
                                            const grp = groups.find(g => g.id.toString() === gid);
                                            setEditForm({ ...editForm, grupo_firmante: gid, firmante: grp ? (grp.jefe || '') : '' });
                                        }}
                                        options={groups.map(g => ({ value: g.id, label: g.nombre.toUpperCase() }))}
                                        placeholder="SELECCIONE GRUPO..."
                                        inputClassName={`${SELECT_FILTER} w-full`}
                                        labelClassName="!text-[10px] !font-black !text-slate-400 !uppercase !tracking-widest !ml-1"
                                    />

                                    <FormSelect
                                        label="Firmante Específico"
                                        value={editForm.firmante}
                                        onChange={e => setEditForm({ ...editForm, firmante: e.target.value })}
                                        disabled={!editForm.grupo_firmante}
                                        options={groups.find(g => g.id.toString() === editForm.grupo_firmante?.toString())?.miembros_detalle?.map(m => {
                                            const group = groups.find(g => g.id.toString() === editForm.grupo_firmante?.toString());
                                            return { value: m.id, label: `${m.nombre.toUpperCase()} ${m.id === group?.jefe ? '(JEFE)' : ''}` };
                                        }) || []}
                                        placeholder="SELECCIONE FIRMANTE..."
                                        inputClassName={`${SELECT_FILTER} w-full`}
                                        labelClassName="!text-[10px] !font-black !text-slate-400 !uppercase !tracking-widest !ml-1"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                                        <span>Pagos Asociados ({currentPayments.length})</span>
                                        <span className="text-blue-600">{formatCurrency(currentPayments.reduce((acc, curr) => acc + curr.monto_total, 0))}</span>
                                    </h4>
                                    <div className="bg-slate-50/50 rounded-3xl border border-slate-100 overflow-hidden divide-y divide-slate-100 shadow-inner">
                                        {currentPayments.length === 0 ? (
                                            <div className="p-12 text-center text-slate-300 font-bold uppercase text-[10px] italic">Sin pagos vinculados</div>
                                        ) : (
                                            currentPayments.map(p => (
                                                <div key={p?.id} className="p-4 flex items-center justify-between group hover:bg-white transition-all">
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-black font-mono text-slate-900 uppercase tracking-tight">{p?.nro_documento}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{p?.servicio_detalle}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-xs font-black text-slate-900">{formatCurrency(p?.monto_total || 0)}</span>
                                                        <button type="button" onClick={() => handleRemovePayment(p?.id)} className={BTN_ICON_DELETE}>
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4">
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Agregar Pagos Disponibles</h4>
                                    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden divide-y divide-slate-100 shadow-sm max-h-48 overflow-y-auto custom-scrollbar">
                                        {loadingAvailable ? (
                                            <div className="p-8 text-center text-slate-400 text-[10px] font-bold uppercase flex items-center justify-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                                Cargando pagos disponibles...
                                            </div>
                                        ) : availablePayments.length === 0 ? (
                                            <div className="p-8 text-center text-slate-400 text-[10px] font-bold uppercase">No hay pagos pendientes para este proveedor</div>
                                        ) : (
                                            availablePayments.map(p => (
                                                <div key={p.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors px-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black font-mono text-slate-700 uppercase">{p.nro_documento}</span>
                                                        <span className="text-[9px] font-bold text-slate-400 truncate max-w-[200px] uppercase mt-0.5">{p.servicio_detalle}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-[11px] font-black text-slate-900">{formatCurrency(p.monto_total)}</span>
                                                        <button type="button" onClick={() => handleAddPayment(p)} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                                                            <PlusCircle className="w-3.5 h-3.5" /> Agregar
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                                <div className="pt-4">
                                    <FormInput
                                        multiline
                                        rows={3}
                                        label="Glosa / Observaciones Adicionales"
                                        placeholder="ESTAS OBSERVACIONES APARECERÁN EN EL DOCUMENTO PDF GENERADO..."
                                        value={editForm.observaciones}
                                        onChange={e => setEditForm({ ...editForm, observaciones: e.target.value.toUpperCase() })}
                                        inputClassName="no-global w-full text-[10px] font-bold bg-white border border-slate-200 px-3 py-2 rounded-xl outline-none focus:border-blue-500 uppercase transition-all shadow-sm resize-none placeholder:text-slate-300"
                                        labelClassName="!text-[10px] !font-black !text-slate-400 !uppercase !tracking-widest !ml-1"
                                    />
                                </div>
                            </form>

                            <div className="p-8 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                                <button type="button" onClick={() => setEditingRC(null)} className={BTN_SECONDARY}>Cancelar</button>
                                <button onClick={handleSaveEdit} className={BTN_PRIMARY}>
                                    <Save className="w-4 h-4" /> Guardar Cambios
                                </button>
                            </div>
                        </MotionDiv>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RecepcionConformeList;
