import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api';
import {
    History, Search, Filter, Eye, User, Calendar, Database,
    ArrowRight, Loader2, Info, ChevronDown, ChevronRight,
    SearchX, Clock, Tag, Globe, Activity, FileText, CheckCircle2,
    XCircle, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Pagination from '../../components/common/Pagination';
import SortableHeader from '../../components/common/SortableHeader';

const AuditLog = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [ordering, setOrdering] = useState('-timestamp');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);

    // Filters
    const [actionFilter, setActionFilter] = useState('');
    const [modelFilter, setModelFilter] = useState('');

    // Diccionarios para traducir IDs a nombres legibles
    const [lookups, setLookups] = useState({
        tipos_documentos: {},
        establecimientos: {},
        proveedores: {},
        funcionarios: {}
    });

    const fetchLogs = async () => {
        setLoading(true);
        try {
            let url = `admin/audit-log/?page=${currentPage}&ordering=${ordering}`;
            if (actionFilter) url += `&action=${actionFilter}`;
            if (modelFilter) url += `&content_type_name=${modelFilter}`;
            if (searchQuery) url += `&search=${searchQuery}`;

            const response = await api.get(url);
            setLogs(response.data.results || []);
            setTotalCount(response.data.count || 0);
        } catch (error) {
            console.error("Error fetching audit logs:", error);
        } finally {
            setLoading(false);
        }
    };

    // Cargar diccionarios de traducción una sola vez
    const fetchLookups = async () => {
        try {
            const [docs, ests, provs] = await Promise.all([
                api.get('tipos-documentos/'),
                api.get('establecimientos/', { params: { page_size: 1000 } }),
                api.get('proveedores/', { params: { page_size: 1000 } })
            ]);

            const mapData = (arr) => {
                const map = {};
                (arr.results || arr).forEach(item => {
                    map[item.id] = item.nombre;
                });
                return map;
            };

            setLookups({
                tipos_documentos: mapData(docs.data),
                establecimientos: mapData(ests.data),
                proveedores: mapData(provs.data)
            });
        } catch (e) {
            console.warn("No se pudieron cargar todos los diccionarios de nombres:", e);
        }
    };

    useEffect(() => {
        fetchLookups();
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [currentPage, ordering, actionFilter, modelFilter]);

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            setCurrentPage(1);
            fetchLogs();
        }
    };

    const handleSort = (newOrdering) => {
        setOrdering(newOrdering);
    };

    const getActionBadge = (action) => {
        switch (action) {
            case 0: return { label: 'CREACIÓN', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 };
            case 1: return { label: 'EDICIÓN', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Activity };
            case 2: return { label: 'ELIMINACIÓN', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle };
            default: return { label: 'OTRO', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: Info };
        }
    };

    const renderChanges = (changesJson) => {
        if (!changesJson) return null;

        try {
            // Si ya es un objeto (JSONField en backend), usarlo directamente.
            // Si es una cadena, parsearla.
            const changes = typeof changesJson === 'string' ? JSON.parse(changesJson) : changesJson;
            const isNullLike = (val) => val === null || val === undefined || val === 'None' || val === 'null' || String(val).trim() === '';

            const changeEntries = Object.entries(changes).filter(([field, values]) => {
                const [oldVal, newVal] = values;
                return oldVal !== newVal && !(isNullLike(oldVal) && isNullLike(newVal));
            });

            if (changeEntries.length === 0) {
                return (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-3">
                        <Info className="w-8 h-8 opacity-20 text-blue-500" />
                        <p className="text-xs font-semibold uppercase tracking-widest opacity-60">Sin cambios significativos</p>
                        <p className="text-[10px] text-center max-w-[250px] leading-relaxed">
                            Los ajustes detectados no afectan el contenido de los datos (ej: formateo interno).
                        </p>
                    </div>
                );
            }

            return (
                <div className="space-y-3">
                    {changeEntries.map(([field, values]) => {
                        const [oldVal, newVal] = values;

                        const formatValue = (val) => {
                            if (isNullLike(val)) return <span className="italic opacity-50 font-normal ml-1">(sin valor)</span>;

                            // Traducir IDs a nombres si tenemos el diccionario
                            const fieldLower = field.toLowerCase();
                            if (fieldLower.includes('tipo documento') && lookups.tipos_documentos[val]) return lookups.tipos_documentos[val];
                            if (fieldLower.includes('establecimiento') && lookups.establecimientos[val]) return lookups.establecimientos[val];
                            if (fieldLower.includes('proveedor') && lookups.proveedores[val]) return lookups.proveedores[val];

                            if (typeof val === 'object') return JSON.stringify(val);
                            return String(val);
                        };

                        // Formatear el nombre del campo (ej: numero_servicio -> Numero servicio)
                        const fieldLabel = field.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());

                        return (
                            <div key={field} className="group border-b border-slate-50 pb-3 last:border-0 hover:bg-slate-50/30 transition-colors">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{fieldLabel}</span>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                    <div className="flex-1 bg-red-50 text-red-700 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-medium border border-red-100/50 break-all min-h-[32px] flex items-center">
                                        {formatValue(oldVal)}
                                    </div>
                                    <div className="flex justify-center sm:block">
                                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 rotate-90 sm:rotate-0" />
                                    </div>
                                    <div className="flex-1 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-medium border border-emerald-100/50 break-all min-h-[32px] flex items-center">
                                        {formatValue(newVal)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        } catch (e) {
            return <pre className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg overflow-auto">{String(changesJson)}</pre>;
        }
    };

    return (
        <div className="p-6 lg:p-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50/10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <History className="w-8 h-8 text-blue-600" />
                        Registro de Auditoría
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Historial detallado de cambios en el sistema (Audit Trail).</p>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por ID, nombre o IP... (Enter)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearch}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs transition-all focus:ring-4 focus:ring-blue-500/10 outline-none hover:border-slate-300"
                        />
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Filtros:</span>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={actionFilter}
                        onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }}
                        className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="">TODAS LAS ACCIONES</option>
                        <option value="0">CREACIONES</option>
                        <option value="1">EDICIONES</option>
                        <option value="2">ELIMINACIONES</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={modelFilter}
                        onChange={(e) => { setModelFilter(e.target.value); setCurrentPage(1); }}
                        className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="">TODOS LOS MÓDULOS</option>
                        <option value="procedimiento">PROCEDIMIENTOS</option>
                        <option value="servicio">SERVICIOS</option>
                        <option value="proveedor">PROVEEDORES</option>
                        <option value="registropago">PAGOS</option>
                        <option value="facturaadquisicion">FACTURAS/RC ADQ</option>
                        <option value="recepcionconforme">RC SERVICIOS</option>
                        <option value="contrato">CONTRATOS</option>
                        <option value="establecimiento">ESTABLECIMIENTOS</option>
                        <option value="funcionario">FUNCIONARIOS</option>
                        <option value="vehiculo">VEHÍCULOS</option>
                        <option value="activo">ACTIVOS/LLAVES</option>
                        <option value="solicitudreserva">RESERVAS</option>
                    </select>
                </div>

                <div className="ml-auto text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                    Mostrando {logs.length} de {totalCount} registros
                </div>
            </div>

            {/* Content Container */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">

                {/* Mobile View: Cards */}
                <div className="md:hidden divide-y divide-slate-100">
                    {loading ? (
                        <div className="p-16 text-center">
                            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
                            <span className="text-slate-400 text-sm font-medium">Buscando historial...</span>
                        </div>
                    ) : logs.length > 0 ? (
                        logs.map(log => {
                            const action = getActionBadge(log.action);
                            const ActionIcon = action.icon;
                            return (
                                <div key={log.id} className="p-4 space-y-3 active:bg-slate-50 transition-colors" onClick={() => { setSelectedLog(log); setIsDetailModalOpen(true); }}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-black ${action.color}`}>
                                                <ActionIcon className="w-3 h-3" />
                                                {action.label}
                                            </span>
                                            <span className="text-[10px] font-mono text-slate-400">ID #{log.id}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-bold text-slate-900 block">{new Date(log.timestamp).toLocaleDateString('es-CL')}</span>
                                            <span className="text-[9px] text-slate-400 block">{new Date(log.timestamp).toLocaleTimeString('es-CL')}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-bold text-slate-800 text-xs truncate">{log.actor_name}</span>
                                            <span className="text-[10px] text-slate-400 truncate">{log.remote_addr || 'Local'}</span>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Tag className="w-3 h-3 text-blue-500" />
                                            <span className="font-black text-slate-900 uppercase tracking-widest text-[9px]">
                                                {log.content_type_name.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">{log.object_repr}</p>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-10 text-center text-slate-400 text-xs">No hay registros</div>
                    )}
                </div>

                {/* Desktop View: Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50/50 border-b border-slate-200">
                            <tr>
                                <SortableHeader label="Fecha y Hora" sortKey="timestamp" currentOrdering={ordering} onSort={handleSort} />
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-[0.1em]">Usuario / IP</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-[0.1em]">Acción</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-[0.1em]">Recurso afectado</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-[0.1em] text-right">Detalles</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="p-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                                            <span className="text-slate-400 text-sm font-medium">Buscando en el historial...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.length > 0 ? logs.map(log => {
                                const action = getActionBadge(log.action);
                                const ActionIcon = action.icon;

                                return (
                                    <tr key={log.id} className="group hover:bg-slate-50/50 transition-all text-xs border-l-4 border-l-transparent hover:border-l-blue-500">
                                        <td className="p-4 text-slate-600">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900">{new Date(log.timestamp).toLocaleDateString('es-CL')}</span>
                                                <span className="text-[10px] text-slate-400 font-medium">{new Date(log.timestamp).toLocaleTimeString('es-CL')}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800">{log.actor_name}</span>
                                                    <span className="text-[10px] font-mono text-slate-400">{log.remote_addr || 'Local'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black ${action.color}`}>
                                                <ActionIcon className="w-3 h-3" />
                                                {action.label}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <Tag className="w-3 h-3 text-blue-500" />
                                                    <span className="font-black text-slate-900 uppercase tracking-wider text-[10px]">
                                                        {log.content_type_name.replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                                <span className="text-slate-500 mt-0.5 truncate max-w-xs">{log.object_repr}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => { setSelectedLog(log); setIsDetailModalOpen(true); }}
                                                className="p-2.5 bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm hover:shadow-blue-500/20 active:scale-95"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="5" className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-30">
                                            <SearchX className="w-16 h-16 text-slate-300" />
                                            <div>
                                                <p className="text-slate-900 font-bold text-lg text-slate-800">No se encontraron registros</p>
                                                <p className="text-slate-500 text-sm">Intenta ajustar los filtros de búsqueda.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer / Pagination */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/10">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(totalCount / 10)}
                        onPageChange={setCurrentPage}
                        totalCount={totalCount}
                    />
                </div>
            </div>

            {/* Detail Modal */}
            <AnimatePresence>
                {isDetailModalOpen && selectedLog && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsDetailModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 30 }}
                            className="relative bg-white w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] rounded-[24px] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-slate-200"
                        >
                            {/* Modal Header */}
                            <div className="p-8 border-b border-slate-100 bg-white flex items-center justify-between">
                                <div className="flex items-center gap-5">
                                    <div className={`p-4 rounded-3xl shadow-lg ${getActionBadge(selectedLog.action).color.split(' ')[0]} bg-opacity-30`}>
                                        <History className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Detalle de Actividad</h3>
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">ID Transacción: #{selectedLog.id}</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsDetailModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all">
                                    <XCircle className="w-6 h-6 text-slate-300 hover:text-red-500" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/20">
                                {/* Info Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-white p-4 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Calendar className="w-3.5 h-3.5 text-blue-500" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ejecución</span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-800">{new Date(selectedLog.timestamp).toLocaleString('es-CL')}</p>
                                        <p className="text-[10px] text-slate-400 mt-1 font-mono uppercase">Desde IP: {selectedLog.remote_addr || 'Desconocida'}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Database className="w-3.5 h-3.5 text-indigo-500" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Objeto Afectado</span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">{selectedLog.content_type_name.replace(/_/g, ' ')}</p>
                                        <p className="text-[10px] text-indigo-500 font-bold mt-1">Ref: {selectedLog.object_repr}</p>
                                    </div>
                                </div>

                                {/* Actor Info */}
                                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                                        <User className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Responsable del Cambio</span>
                                        <span className="text-lg font-bold text-slate-800">{selectedLog.actor_name}</span>
                                    </div>
                                    <div className="ml-auto">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border ${getActionBadge(selectedLog.action).color}`}>
                                            {getActionBadge(selectedLog.action).label}
                                        </span>
                                    </div>
                                </div>

                                {/* Changes Diff Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-blue-600" />
                                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Comparativa de Cambios</h4>
                                    </div>

                                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm min-h-[100px]">
                                        {selectedLog.changes && selectedLog.changes !== '{}' ? (
                                            renderChanges(selectedLog.changes)
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-2">
                                                <AlertTriangle className="w-8 h-8 opacity-20" />
                                                <p className="text-sm font-medium">No hay detalles de campos para esta acción.</p>
                                                <p className="text-[10px] uppercase font-bold opacity-50 px-8 text-center">(Común en eliminaciones o creaciones sin campos capturados)</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-slate-100 bg-white text-center shrink-0">
                                <button
                                    onClick={() => setIsDetailModalOpen(false)}
                                    className="px-12 py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-xs hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-95"
                                >
                                    Cerrar Detalle
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AuditLog;
