import React, { useState, useEffect } from 'react';
import api from '../../api';
import { FileText, Calendar, Building2, Download, Eye, Search, Edit2, X, Save, Trash2, DollarSign, Clock, User, ChevronRight, PlusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const RecepcionConformeList = () => {
    const [rcs, setRcs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Edit Modal State
    const [editingRC, setEditingRC] = useState(null);
    const [editForm, setEditForm] = useState({ observaciones: '', registros_ids: [] });
    const [currentPayments, setCurrentPayments] = useState([]);
    const [availablePayments, setAvailablePayments] = useState([]);
    const [loadingAvailable, setLoadingAvailable] = useState(false);

    // History Modal State
    const [historyRC, setHistoryRC] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await api.get('recepciones-conformes/');
            setRcs(response.data);
        } catch (error) {
            console.error("Error fetching RCs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchAvailablePayments = async (providerId) => {
        setLoadingAvailable(true);
        try {
            const response = await api.get(`registros-pagos/?servicio__proveedor=${providerId}`);
            // Client-side filter for null RC since backend exact filter might require explicit null handling or custom filter
            const available = response.data.filter(p => !p.recepcion_conforme);
            setAvailablePayments(available);
        } catch (error) {
            console.error("Error fetching available payments:", error);
        } finally {
            setLoadingAvailable(false);
        }
    };

    const handleDownloadPDF = (id) => {
        api.get(`recepciones-conformes/${id}/generate_pdf/`, { responseType: 'blob' })
            .then((response) => {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `RC_${id}.pdf`);
                document.body.appendChild(link);
                link.click();
            })
            .catch((error) => console.error(error));
    };

    const handleEdit = (rc) => {
        setEditingRC(rc);
        setEditForm({
            observaciones: rc.observaciones || '',
            registros_ids: rc.registros.map(r => r.id)
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
            fetchData();
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
            fetchData();
            alert("RC anulada exitosamente.");
        } catch (error) {
            console.error(error);
            alert("Error al anular la RC: " + (error.response?.data?.error || "Error desconocido"));
        }
    };

    const filteredData = rcs.filter(item =>
        item.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.proveedor_nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar RC..."
                            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full md:w-64"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Folio</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Emisión</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Proveedor</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Pagos</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredData.map(item => (
                            <tr key={item.id} className={`transition-colors ${item.estado === 'ANULADA' ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-slate-50'}`}>
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <div className="font-mono text-sm font-bold text-slate-800 flex items-center gap-2">
                                            <FileText className={`w-4 h-4 ${item.estado === 'ANULADA' ? 'text-red-400' : 'text-slate-400'}`} />
                                            <span className={item.estado === 'ANULADA' ? 'line-through text-slate-500' : ''}>{item.folio}</span>
                                        </div>
                                        {item.estado === 'ANULADA' && (
                                            <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider mt-1">ANULADA</span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        {formatDate(item.fecha_emision)}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                                            <Building2 className="w-4 h-4 text-slate-400" />
                                            {item.proveedor_nombre}
                                        </div>
                                        {item.tipo_proveedor_nombre && (
                                            <div className="text-xs text-slate-500 ml-6 mt-0.5">
                                                {item.tipo_proveedor_nombre}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.estado === 'ANULADA' ? 'bg-slate-200 text-slate-600' : 'bg-blue-100 text-blue-800'}`}>
                                        {item.registros?.length || 0}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => handleViewHistory(item)}
                                            className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                                            title="Ver Historial"
                                        >
                                            <Clock className="w-4 h-4" />
                                        </button>

                                        {item.estado !== 'ANULADA' && (
                                            <>
                                                <button
                                                    onClick={() => handleDownloadPDF(item.id)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                    title="Descargar PDF"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                                                    title="Editar Contenido"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleAnulate(item)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Anular RC"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredData.length === 0 && !loading && (
                    <div className="p-12 text-center text-slate-400">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No se encontraron recepciones conformes.</p>
                    </div>
                )}
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

                            <form onSubmit={handleSaveEdit} className="flex-1 overflow-auto p-6 space-y-6">
                                {/* Observations */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Observaciones</label>
                                    <textarea
                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-32"
                                        placeholder="Ingrese observaciones adicionales..."
                                        value={editForm.observaciones}
                                        onChange={e => setEditForm({ ...editForm, observaciones: e.target.value })}
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
                                                    <div key={payment.id} className="p-3 flex items-center justify-between hover:bg-white transition-colors">
                                                        <div className="flex-1 min-w-0 pr-4">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-200 px-1.5 rounded">{payment.nro_documento}</span>
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
                                                                onClick={() => handleRemovePayment(payment.id)}
                                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
