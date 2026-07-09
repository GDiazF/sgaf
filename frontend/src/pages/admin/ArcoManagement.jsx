import React, { useState, useEffect } from 'react';
import {
    ShieldAlert, Search, Filter, CheckCircle2, XCircle,
    Clock, AlertTriangle, FileText, Download, ChevronRight,
    CornerDownRight, User, RefreshCw, Send, Check, X
} from 'lucide-react';
import api from '../../api';

const ArcoManagement = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [resolvingId, setResolvingId] = useState(null);
    const [resolutionData, setResolutionData] = useState({
        estado: 'APROBADA',
        motivo_rechazo: ''
    });
    
    // Filtering / Search States
    const [search, setSearch] = useState('');
    const [filterEstado, setFilterEstado] = useState('');
    const [filterTipo, setFilterTipo] = useState('');
    const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterEstado) params.estado = filterEstado;
            if (filterTipo) params.tipo_derecho = filterTipo;
            if (search) params.search = search;

            const res = await api.get('arco/', { params });
            setRequests(res.data.results || res.data || []);
        } catch (err) {
            console.error("Error al obtener solicitudes ARCO:", err);
            showAlert('error', 'No se pudieron cargar las solicitudes ARCO.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [filterEstado, filterTipo]);

    const showAlert = (type, text) => {
        setAlertMsg({ type, text });
        setTimeout(() => setAlertMsg({ type: '', text: '' }), 5000);
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchRequests();
    };

    const handleResolve = async (id) => {
        if (resolutionData.estado === 'RECHAZADA' && !resolutionData.motivo_rechazo) {
            showAlert('error', 'Debe ingresar el motivo del rechazo según exige la ley.');
            return;
        }

        setLoading(true);
        try {
            await api.post(`arco/${id}/resolver/`, resolutionData);
            showAlert('success', `Solicitud resuelta con éxito como: ${resolutionData.estado}`);
            setResolvingId(null);
            setResolutionData({ estado: 'APROBADA', motivo_rechazo: '' });
            fetchRequests();
        } catch (err) {
            console.error("Error al resolver solicitud:", err);
            showAlert('error', err.response?.data?.error || 'Error al procesar la resolución.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-slate-200/80 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-lg font-black text-slate-800 tracking-tight leading-none uppercase">
                        Gestión de Derechos ARCO
                    </h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1.5">
                        Resolución y control de solicitudes de privacidad (Ley N° 21.719)
                    </p>
                </div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Alert Notification */}
                {alertMsg.text && (
                    <div className={`p-4 rounded-2xl flex gap-3 items-center border ${
                        alertMsg.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    }`}>
                        {alertMsg.type === 'error' ? <ShieldAlert className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                        <p className="text-xs font-bold">{alertMsg.text}</p>
                    </div>
                )}

                {/* Filters Board */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
                    <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <div className="md:col-span-2">
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Buscar Funcionario</label>
                            <div className="relative mt-1">
                                <input
                                    type="text"
                                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:border-slate-900 outline-none text-xs font-bold transition-all"
                                    placeholder="Nombre, RUT, anexo..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                            </div>
                        </div>

                        <div>
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Filtrar Estado</label>
                            <select
                                className="w-full mt-1 px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none text-xs font-bold text-slate-700"
                                value={filterEstado}
                                onChange={(e) => setFilterEstado(e.target.value)}
                            >
                                <option value="">Todos los Estados</option>
                                <option value="PENDIENTE">Pendientes</option>
                                <option value="APROBADA">Aprobadas</option>
                                <option value="RECHAZADA">Rechazadas</option>
                            </select>
                        </div>

                        <div>
                            <button
                                type="submit"
                                className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95"
                            >
                                Aplicar Filtros
                            </button>
                        </div>
                    </form>
                </div>

                {/* Main List */}
                <div className="space-y-4">
                    {loading && requests.length === 0 ? (
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-xs font-bold text-slate-400">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                            Cargando solicitudes ARCO...
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-xs font-bold text-slate-400">
                            No se encontraron solicitudes que coincidan con los filtros.
                        </div>
                    ) : (
                        requests.map((req) => (
                            <div key={req.id} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between gap-6">
                                <div className="space-y-3 flex-1">
                                    {/* Requester Info */}
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-100">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                                {req.solicitante_nombre}
                                                {req.solicita_bloqueo && req.estado === 'PENDIENTE' && (
                                                    <span className="text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                                                        Bloqueo Req. (Art. 8° ter)
                                                    </span>
                                                )}
                                            </h3>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">RUT: {req.solicitante_rut}</p>
                                        </div>
                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ml-auto md:ml-2 ${
                                            req.estado === 'PENDIENTE' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                            req.estado === 'APROBADA' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                            'bg-red-100 text-red-700 border border-red-200'
                                        }`}>
                                            {req.estado}
                                        </span>
                                    </div>

                                    {/* Action description */}
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/50 space-y-1 text-left">
                                        <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase">
                                            <span>{req.tipo_derecho}</span>
                                            {req.campo && (
                                                <>
                                                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="text-blue-600">Campo: {req.campo}</span>
                                                </>
                                            )}
                                        </div>
                                        {req.tipo_derecho === 'RECTIFICACION' && (
                                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-1 pl-2">
                                                <span>Valor Actual:</span>
                                                <span className="line-through bg-slate-100 px-1.5 py-0.5 rounded font-mono">{req.valor_anterior || '(vacío)'}</span>
                                                <CornerDownRight className="w-3 h-3 text-slate-400" />
                                                <span>Nuevo Valor:</span>
                                                <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold font-mono">{req.valor_propuesto}</span>
                                            </div>
                                        )}
                                        <div className="text-[10px] text-slate-500 mt-1.5 pl-2">
                                            <span className="font-bold uppercase text-[9px] text-slate-400 block tracking-wider leading-none mb-1">Fundamento legal / Justificación:</span>
                                            "{req.justificacion}"
                                        </div>
                                    </div>

                                    {/* Support files and auditing */}
                                    <div className="flex flex-wrap gap-4 text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-2 items-center">
                                        <span>Solicitado: {new Date(req.fecha_solicitud).toLocaleString()}</span>
                                        {req.archivo_respaldo && (
                                            <a
                                                href={req.archivo_respaldo}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-black"
                                            >
                                                <FileText className="w-3.5 h-3.5" />
                                                Ver Respaldo (PDF/Imagen)
                                            </a>
                                        )}
                                        {req.estado !== 'PENDIENTE' && (
                                            <>
                                                <span>Resuelto: {new Date(req.fecha_resolucion).toLocaleString()}</span>
                                                <span>Por: {req.resuelto_por_nombre}</span>
                                            </>
                                        )}
                                    </div>

                                    {req.estado === 'RECHAZADA' && req.motivo_rechazo && (
                                        <div className="p-3 bg-red-50 text-red-700 border border-red-100 rounded-xl text-[10px] font-bold">
                                            Motivo de Rechazo: "{req.motivo_rechazo}"
                                        </div>
                                    )}
                                </div>

                                {/* Actions / Resolution block */}
                                {req.estado === 'PENDIENTE' && (
                                    <div className="flex flex-col gap-2 justify-center w-full md:w-56 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 flex-shrink-0">
                                        {resolvingId === req.id ? (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Acción</label>
                                                    <select
                                                        className="w-full mt-1 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                                                        value={resolutionData.estado}
                                                        onChange={(e) => setResolutionData({ ...resolutionData, estado: e.target.value })}
                                                    >
                                                        <option value="APROBADA">Aprobar y Aplicar</option>
                                                        <option value="RECHAZADA">Rechazar Solicitud</option>
                                                    </select>
                                                </div>

                                                {resolutionData.estado === 'RECHAZADA' && (
                                                    <div>
                                                        <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Motivo de Rechazo</label>
                                                        <textarea
                                                            className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold h-16 resize-none"
                                                            placeholder="Motivo formal..."
                                                            value={resolutionData.motivo_rechazo}
                                                            onChange={(e) => setResolutionData({ ...resolutionData, motivo_rechazo: e.target.value })}
                                                        />
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => setResolvingId(null)}
                                                        className="py-2 border-2 border-slate-200 text-slate-500 hover:text-slate-800 rounded-lg text-[9px] uppercase font-black tracking-wider transition-all"
                                                    >
                                                        Atrás
                                                    </button>
                                                    <button
                                                        onClick={() => handleResolve(req.id)}
                                                        disabled={loading}
                                                        className="py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[9px] uppercase font-black tracking-wider transition-all flex items-center justify-center gap-1 shadow-md"
                                                    >
                                                        {loading ? <RefreshCw className="w-3 animate-spin" /> : <><Send className="w-3 h-3" /> Enviar</>}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <button
                                                    onClick={() => {
                                                        setResolvingId(req.id);
                                                        setResolutionData({ estado: 'APROBADA', motivo_rechazo: '' });
                                                    }}
                                                    className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-blue-500/10 active:scale-95 transition-all"
                                                >
                                                    <Check className="w-4 h-4" />
                                                    Resolver Solicitud
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ArcoManagement;
