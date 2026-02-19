import React, { useState, useEffect } from 'react';
import api from '../../api';
import { FileText, Calendar, Building2, Download, Edit2, X, Save, Trash2, Clock, User, PlusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Pagination from '../../components/common/Pagination';
import FilterBar from '../../components/common/FilterBar';
import SortableHeader from '../../components/common/SortableHeader';
import FormInput from '../../components/common/FormInput';
import FormSelect from '../../components/common/FormSelect';

const RecepcionConformeList = () => {
    const [rcs, setRcs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [ordering, setOrdering] = useState('-fecha_emision');

    // Edit Modal State
    const [editingRC, setEditingRC] = useState(null);
    const [editForm, setEditForm] = useState({ observaciones: '', registros_ids: [] });
    const [currentPayments, setCurrentPayments] = useState([]);
    const [availablePayments, setAvailablePayments] = useState([]);
    const [loadingAvailable, setLoadingAvailable] = useState(false);
    const [groups, setGroups] = useState([]);

    // History Modal State
    const [historyRC, setHistoryRC] = useState(null);

    const fetchData = async (page = 1, search = '', order = ordering) => {
        setLoading(true);
        try {
            const params = {
                page: page,
                search: search,
                ordering: order
            };
            const [rcRes, grpRes] = await Promise.all([
                api.get('recepciones-conformes/', { params }),
                api.get('grupos/', { params: { page_size: 1000 } })
            ]);

            setRcs(rcRes.data.results);
            setTotalCount(rcRes.data.count);
            setTotalPages(Math.ceil(rcRes.data.count / 10));
            setGroups(grpRes.data.results || grpRes.data);

        } catch (error) {
            console.error("Error fetching RCs:", error);
            setRcs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(currentPage, searchQuery, ordering);
    }, [currentPage, ordering]);

    const handleSearch = (query) => {
        setSearchQuery(query);
        setCurrentPage(1); // Reset to page 1 on search
        fetchData(1, query);
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
            // Note: Payments list is also paginated now! We need a specific endpoint or params to get ALL available for dropdown/modal
            // For now, let's assume we fetch a reasonable amount or use a specialized endpoint if needed.
            // Best approach for valid dropdowns is search-as-you-type or dedicated non-paginated endpoints for "options".
            // However, for available payments list, scrolling/paginating inside modal is ideal.
            // For this step, I'll fetch the first page of results that match criteria.
            const response = await api.get(`registros-pagos/?servicio__proveedor=${providerId}`);
            // If response is paginated:
            const data = response.data.results || response.data;

            const available = data.filter(p => !p.recepcion_conforme);
            setAvailablePayments(available);
        } catch (error) {
            console.error("Error fetching available payments:", error);
        } finally {
            setLoadingAvailable(false);
        }
    };

    const handleDownloadPDF = async (item) => {
        try {
            const response = await api.get(`recepciones-conformes/${item.id}/generate_pdf/`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const rawFilename = item.nro_oc ? `RC ${item.nro_oc}.pdf` : `RC_Adquisicion_${item.folio || item.id}.pdf`;
            const filename = rawFilename.replace(/[/\\?%*:|"<>]/g, '-');
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Error downloading PDF:", error);
            alert("Error al generar el PDF.");
        }
    };

    const handleEdit = (rc) => {
        setEditingRC(rc);
        setEditForm({
            observaciones: rc.observaciones || '',
            registros_ids: rc.registros.map(r => r.id),
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
            fetchData(currentPage, searchQuery); // Refresh list
            alert("Cambios guardados exitosamente.");
        } catch (error) {
            console.error(error);
            alert("Error al actualizar la RC.");
        }
    };

    const handleAnulate = async (rc) => {
        if (!window.confirm(`¿Está seguro de que desea ANULAR la RC ${rc.folio}?\n\nEsta acción liberará todos los pagos asociados para que puedan ser utilizados en otro documento.\nEl folio quedará marcado como ANULADA.`)) {
            return;
        }

        try {
            await api.post(`recepciones-conformes/${rc.id}/anular/`);
            fetchData(currentPage, searchQuery);
            alert("RC anulada exitosamente.");
        } catch (error) {
            console.error(error);
            alert("Error al anular la RC: " + (error.response?.data?.error || "Error desconocido"));
        }
    };

    // No client-side filtering anymore
    const filteredData = rcs;

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
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Recepciones Conformes</h2>
                    <p className="text-slate-500">Historial de documentos generados.</p>
                </div>

                <div className="flex items-center gap-3">
                    <FilterBar onSearch={handleSearch} placeholder="Buscar por folio, proveedor..." />
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <SortableHeader label="Folio" sortKey="folio" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Fecha Emisión" sortKey="fecha_emision" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Proveedor" sortKey="proveedor__nombre" currentOrdering={ordering} onSort={handleSort} />
                                <th className="p-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Pagos</th>
                                <th className="p-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.map(item => (
                                <tr key={item.id} className={`transition-colors text-xs ${item.estado === 'ANULADA' ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-slate-50'}`}>
                                    <td className="p-2.5">
                                        <div className="flex flex-col">
                                            <div className="font-mono text-xs font-bold text-slate-800 flex items-center gap-2">
                                                <FileText className={`w-3.5 h-3.5 ${item.estado === 'ANULADA' ? 'text-red-400' : 'text-slate-400'}`} />
                                                <span className={item.estado === 'ANULADA' ? 'line-through text-slate-500' : ''}>{item.folio}</span>
                                            </div>
                                            {item.estado === 'ANULADA' && (
                                                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider mt-1">ANULADA</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-2.5">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                            {formatDate(item.fecha_emision)}
                                        </div>
                                    </td>
                                    <td className="p-2.5">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 font-medium text-slate-800">
                                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                                {item.proveedor_nombre}
                                            </div>
                                            {item.tipo_proveedor_nombre && (
                                                <div className="text-[10px] text-slate-500 ml-5.5 mt-0.5">
                                                    {item.tipo_proveedor_nombre}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-2.5 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium ${item.estado === 'ANULADA' ? 'bg-slate-200 text-slate-600' : 'bg-blue-100 text-blue-800'}`}>
                                            {item.registros?.length || 0}
                                        </span>
                                    </td>
                                    <td className="p-2.5 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleViewHistory(item)}
                                                className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                                                title="Ver Historial"
                                            >
                                                <Clock className="w-3.5 h-3.5" />
                                            </button>

                                            {item.estado !== 'ANULADA' && (
                                                <>
                                                    <button
                                                        onClick={() => handleDownloadPDF(item)}
                                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="Descargar PDF"
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(item)}
                                                        className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                                                        title="Editar Contenido"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleAnulate(item)}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Anular RC"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </>
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
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No se encontraron recepciones conformes.</p>
                    </div>
                )}
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    totalCount={totalCount}
                />
            </div>

            {/* History Modal */}
            <AnimatePresence>
                {historyRC && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                            onClick={() => setHistoryRC(null)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden relative z-10 flex flex-col max-h-[80vh]"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Historial de Cambios</h3>
                                    <p className="text-sm text-slate-500 font-mono">{historyRC.folio}</p>
                                </div>
                                <button onClick={() => setHistoryRC(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto p-6">
                                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">

                                    {historyRC.historial && historyRC.historial.length > 0 ? (
                                        historyRC.historial.map((ev, i) => (
                                            <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                {/* Icon */}
                                                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-50 shadow shrink-0 md:order-1 md:group-odd:translate-x-1/2 md:group-even:-translate-x-1/2 z-10">
                                                    {ev.accion === 'CREACION' ? (
                                                        <div className="w-3 h-3 bg-green-500 rounded-full" />
                                                    ) : ev.accion === 'MODIFICACION_PAGOS' ? (
                                                        <div className="w-3 h-3 bg-red-500 rounded-full" />
                                                    ) : (
                                                        <div className="w-3 h-3 bg-blue-500 rounded-full" />
                                                    )}
                                                </div>

                                                {/* Content */}
                                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                                                    <div className="flex items-center justify-between space-x-2 mb-1">
                                                        <div className="font-bold text-slate-900 text-sm capitalize">{ev.accion.replace('_', ' ').toLowerCase()}</div>
                                                        <time className="font-mono text-xs text-slate-500">{formatDateTime(ev.fecha)}</time>
                                                    </div>
                                                    <div className="text-sm text-slate-600 break-words leading-relaxed">
                                                        {ev.detalle}
                                                    </div>
                                                    <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                                                        <User className="w-3 h-3" />
                                                        {ev.usuario || 'Sistema'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-10 text-slate-400">
                                            No hay historial disponible.
                                        </div>
                                    )}

                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Modal (Existing code) */}
            <AnimatePresence>
                {editingRC && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                            onClick={() => setEditingRC(null)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Editar Recepción Conforme</h3>
                                    <p className="text-sm text-slate-500 font-mono">{editingRC.folio}</p>
                                </div>
                                <button onClick={() => setEditingRC(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveEdit} className="flex-1 overflow-auto p-8 space-y-8">
                                {/* Observations */}
                                <FormInput
                                    multiline
                                    rows={3}
                                    label="Observaciones"
                                    icon={<FileText />}
                                    placeholder="Ingrese observaciones adicionales que aparecerán en el documento..."
                                    value={editForm.observaciones}
                                    onChange={e => setEditForm({ ...editForm, observaciones: e.target.value })}
                                />

                                <FormInput
                                    label="Folio RC"
                                    icon={<FileText />}
                                    name="folio"
                                    placeholder="Automático..."
                                    value={editForm.folio}
                                    onChange={e => setEditForm({ ...editForm, folio: e.target.value })}
                                    inputClassName="bg-slate-50 font-mono"
                                />

                                {/* Signer Group Selection */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-2">
                                    <FormSelect
                                        label="Grupo de Firmante"
                                        icon={<User className="text-blue-500" />}
                                        value={editForm.grupo_firmante}
                                        onChange={e => {
                                            const gid = e.target.value;
                                            const grp = groups.find(g => g.id.toString() === gid);
                                            setEditForm({
                                                ...editForm,
                                                grupo_firmante: gid,
                                                firmante: grp ? (grp.jefe || '') : ''
                                            });
                                        }}
                                        options={groups.map(g => ({ value: g.id, label: g.nombre }))}
                                        placeholder="Seleccione grupo..."
                                        inputClassName="bg-blue-50/50 border-blue-100 text-blue-700"
                                        labelClassName="text-blue-600"
                                    />

                                    <FormSelect
                                        label="Firmante Específico"
                                        icon={<User className="text-amber-500" />}
                                        value={editForm.firmante}
                                        onChange={e => setEditForm({ ...editForm, firmante: e.target.value })}
                                        disabled={!editForm.grupo_firmante}
                                        options={groups.find(g => g.id.toString() === editForm.grupo_firmante?.toString())?.miembros_detalle?.map(m => ({
                                            value: m.id,
                                            label: `${m.nombre} ${m.id === groups.find(g => g.id.toString() === editForm.grupo_firmante.toString())?.jefe ? '(Jefe)' : ''}`
                                        })) || []}
                                        placeholder="Seleccione firmante..."
                                        inputClassName="bg-amber-50/50 border-amber-100 text-amber-700"
                                        labelClassName="text-amber-600"
                                    />
                                </div>

                                {/* Payments List */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-bold text-slate-700 flex justify-between items-center">
                                        <span>Pagos Asociados ({currentPayments.length})</span>
                                        <span className="text-xs font-normal text-slate-400">Total: {formatCurrency(currentPayments.reduce((acc, curr) => acc + curr.monto_total, 0))}</span>
                                    </h4>

                                    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden max-h-48 overflow-y-auto">
                                        {currentPayments.length === 0 ? (
                                            <div className="p-8 text-center text-slate-400 text-sm">
                                                No hay pagos asociados.
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-slate-100">
                                                {currentPayments.map(payment => (
                                                    <div key={payment.id} className="p-4 flex items-center justify-between hover:bg-white transition-all group/pago">
                                                        <div className="flex-1 min-w-0 pr-4">
                                                            <div className="flex items-center gap-2 mb-1.5">
                                                                <span className="font-mono text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 group-hover/pago:border-blue-200 group-hover/pago:bg-blue-50 transition-colors uppercase tracking-widest">{payment.nro_documento}</span>
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 opacity-60">
                                                                    <Calendar className="w-3 h-3" />
                                                                    {formatDate(payment.fecha_pago)}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs font-bold text-slate-700 truncate group-hover/pago:text-blue-800 transition-colors">{payment.servicio_detalle}</div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="font-black text-sm text-slate-900">{formatCurrency(payment.monto_total)}</div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemovePayment(payment.id)}
                                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover/pago:opacity-100"
                                                                title="Quitar pago de esta RC"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-orange-600 bg-orange-50 p-3 rounded-lg border border-orange-100">
                                        Nota: Si quita un pago, este volverá a estar disponible para ser asignado a otra RC.
                                    </p>
                                </div>

                                {/* Add Payments Section */}
                                <div className="space-y-3 pt-4 border-t border-slate-100">
                                    <h4 className="text-sm font-bold text-slate-700">Agregar Pagos Disponibles</h4>
                                    <p className="text-xs text-slate-500">Pagos del mismo proveedor pendientes de RC.</p>

                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden max-h-48 overflow-y-auto">
                                        {loadingAvailable ? (
                                            <div className="p-4 text-center text-xs text-slate-400">Cargando pagos disponibles...</div>
                                        ) : availablePayments.length === 0 ? (
                                            <div className="p-4 text-center text-xs text-slate-400">
                                                No hay pagos disponibles para este proveedor.
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-slate-100">
                                                {availablePayments.map(payment => (
                                                    <div key={payment.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                                        <div className="flex-1 min-w-0 pr-4">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-1.5 rounded border border-slate-200">{payment.nro_documento}</span>
                                                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                                                    <Calendar className="w-3 h-3" />
                                                                    {formatDate(payment.fecha_pago)}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-slate-600 truncate">{payment.servicio_detalle}</div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="font-bold text-sm text-slate-900">{formatCurrency(payment.monto_total)}</div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleAddPayment(payment)}
                                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                                                                title="Agregar a RC"
                                                            >
                                                                <PlusCircle className="w-4 h-4" />
                                                                <span className="text-xs font-bold">Agregar</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </form>

                            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                                <button
                                    type="button"
                                    onClick={() => setEditingRC(null)}
                                    className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Guardar Cambios
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RecepcionConformeList;
