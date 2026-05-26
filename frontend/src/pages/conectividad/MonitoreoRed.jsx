import React, { useState, useEffect, useCallback } from 'react';
import { 
    Activity, Shield, AlertCircle, RefreshCw, XCircle, CheckCircle2, 
    Wifi, Network, Search, Filter, Clock, Map, ChevronRight, Signal, 
    WifiOff, Globe, SignalHigh, Server, Database, Save, Edit, Trash2, Plus
} from 'lucide-react';
import api from '../../api';

const MonitoreoRed = () => {
    const [escuelas, setEscuelas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterLocalidad, setFilterLocalidad] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'online', 'offline'
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingEscuela, setEditingEscuela] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('conectividad/monitoreo/');
            setEscuelas(res.data.results || res.data);
        } catch (error) {
            console.error('Error fetching connectivity data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        // Auto-refresh cada 2 minutos
        const interval = setInterval(() => handleRefreshAll(), 120000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleRefreshAll = async () => {
        if (refreshing) return;
        setRefreshing(true);
        try {
            const res = await api.post('conectividad/monitoreo/refresh_all/');
            setEscuelas(res.data);
        } catch (error) {
            console.error('Error refreshing all schools:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const handleSingleRefresh = async (id) => {
        try {
            const res = await api.post(`conectividad/monitoreo/${id}/ping/`);
            setEscuelas(prev => prev.map(e => e.id === id ? res.data : e));
        } catch (error) {
            console.error('Error refreshing school:', error);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingEscuela.id) {
                await api.put(`conectividad/monitoreo/${editingEscuela.id}/`, editingEscuela);
            } else {
                await api.post(`conectividad/monitoreo/`, editingEscuela);
            }
            setShowEditModal(false);
            fetchData();
        } catch (error) {
            alert('Error al guardar los cambios.');
        }
    };

    const filteredEscuelas = escuelas.filter(e => {
        const matchesSearch = (e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || e.ip_lan.includes(searchTerm));
        const matchesLocalidad = (filterLocalidad === '' || e.localidad === filterLocalidad);
        const matchesStatus = (statusFilter === 'all' || 
                               (statusFilter === 'online' && e.last_status_lan) || 
                               (statusFilter === 'offline' && !e.last_status_lan));
        return matchesSearch && matchesLocalidad && matchesStatus;
    });

    const stats = {
        total: escuelas.length,
        online: escuelas.filter(e => e.last_status_lan).length,
        offline: escuelas.filter(e => !e.last_status_lan).length,
        avgLatency: Math.round(escuelas.reduce((acc, curr) => acc + (curr.latency_lan || 0), 0) / (escuelas.filter(e => e.last_status_lan).length || 1)),
        avgLoss: Math.round(escuelas.reduce((acc, curr) => acc + (curr.packet_loss || 0), 0) / (escuelas.length || 1))
    };

    const StatusDots = ({ history }) => {
        if (!history || history.length === 0) return <div className="h-2" />;
        return (
            <div className="flex gap-0.5 mt-2 overflow-hidden justify-end">
                {[...history].reverse().slice(0, 20).map((h, i) => (
                    <div 
                        key={i} 
                        className={`w-1.5 h-3 rounded-[1px] ${h.status_lan ? (h.packet_loss > 0 ? 'bg-amber-400' : 'bg-emerald-500') : 'bg-rose-500'} opacity-60 hover:opacity-100 transition-opacity`}
                        title={`${new Date(h.timestamp).toLocaleTimeString()}: ${h.latency}ms, ${h.packet_loss}% loss`}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden">
            {/* Cabecera Oficial SGAF */}
            <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                <div>
                    <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase">Monitoreo de Red Institucional</h2>
                    <div className="flex items-center gap-2 mt-1.5">
                        <p className="text-[10px] md:text-xs font-medium text-slate-500 uppercase ml-0">Estado avanzado y métricas de calidad de enlaces terrestres y satelitales.</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                    <button 
                        type="button"
                        onClick={() => { setEditingEscuela({ nombre: '', ip_lan: '', ip_wifi: '', localidad: 'IQUIQUE', tipo_enlace: 'FIBRA', proveedor: 'GTD', velocidad_bajada: 200 }); setShowEditModal(true); }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nueva IP</span>
                    </button>
                    
                    <button 
                        type="button"
                        onClick={handleRefreshAll}
                        disabled={refreshing}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-slate-900/10 flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        <span>{refreshing ? 'Escaneando...' : 'Escanear Todo'}</span>
                    </button>
                </div>
            </div>

            {/* Tarjetas KPI Premium */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 shrink-0">
                {[
                    { id: 'all', label: 'Total Enlaces', value: stats.total, icon: Network, color: 'text-slate-600', bg: 'bg-slate-100/60 text-slate-600', isButton: true },
                    { id: 'online', label: 'Online / Activos', value: stats.online, icon: Wifi, color: 'text-emerald-600', bg: 'bg-emerald-100/60 text-emerald-700', isButton: true },
                    { id: 'offline', label: 'Offline / Caídos', value: stats.offline, icon: WifiOff, color: 'text-rose-600', bg: 'bg-rose-100/60 text-rose-700', isButton: true },
                    { id: 'latency', label: 'Latencia Media', value: `${stats.avgLatency} ms`, icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-100/60 text-indigo-750', isButton: false },
                    { id: 'loss', label: 'Pérdida Media', value: `${stats.avgLoss}%`, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-100/60 text-amber-700', isButton: false },
                ].map((stat, idx) => {
                    const content = (
                        <>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${stat.bg}`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest line-clamp-1">{stat.label}</h3>
                                <p className={`text-lg font-black leading-none mt-1 ${stat.color}`}>{stat.value}</p>
                            </div>
                        </>
                    );

                    if (stat.isButton) {
                        return (
                            <button
                                key={stat.id}
                                type="button"
                                onClick={() => setStatusFilter(stat.id)}
                                className={`p-3 rounded-2xl border text-left flex items-center gap-4 transition-all hover:shadow-md group ${statusFilter === stat.id ? 'bg-indigo-50/40 border-indigo-500 shadow-sm' : 'bg-white border-slate-100 shadow-sm'}`}
                            >
                                {content}
                            </button>
                        );
                    }

                    return (
                        <div
                            key={stat.id}
                            className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md group"
                        >
                            {content}
                        </div>
                    );
                })}
            </div>

            {/* Barra de Filtros y Búsqueda */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3 items-center shrink-0">
                <div className="relative flex-1 w-full shrink-0">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input 
                        type="text" 
                        placeholder="BUSCAR POR ESTABLECIMIENTO O DIRECCIÓN IP..."
                        className="no-global w-full h-10 text-[10px] font-bold bg-white border border-slate-200 pl-10 pr-4 rounded-xl outline-none focus:border-indigo-500 uppercase transition-all shadow-sm placeholder:text-slate-300"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="relative w-full md:w-64 shrink-0">
                    <Map className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none z-10" />
                    <select 
                        className="no-global w-full text-[10px] font-black uppercase tracking-widest pl-9 pr-8 h-10 rounded-xl border border-slate-200 outline-none cursor-pointer appearance-none bg-white text-slate-700 focus:border-indigo-500 shadow-sm bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem_1rem] bg-[right_0.5rem_center] bg-no-repeat" 
                        value={filterLocalidad}
                        onChange={(e) => setFilterLocalidad(e.target.value)}
                    >
                        <option value="">TODAS LAS LOCALIDADES</option>
                        <option value="IQUIQUE">Iquique</option>
                        <option value="ALTO HOSPICIO">Alto Hospicio</option>
                    </select>
                </div>
            </div>

            {/* Inlay Scrollable de Establecimientos (Zero-Scroll) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 bg-slate-50/50 rounded-2xl border border-slate-200 p-3 relative">
                {loading && !refreshing ? (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-[99] flex flex-col items-center justify-center gap-3">
                        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest animate-pulse">Contactando routers de establecimientos...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                        {filteredEscuelas.map((escuela) => (
                            <div 
                                key={escuela.id} 
                                className={`group bg-white rounded-2xl p-4 border transition-all hover:shadow-md flex flex-col justify-between h-[185px] select-none ${escuela.last_status_lan ? 'border-emerald-100 hover:border-emerald-250 shadow-sm' : 'border-rose-100 hover:border-rose-250 shadow-sm'}`}
                            >
                                <div className="flex items-start justify-between gap-2 shrink-0">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className={`p-1.5 rounded-lg shrink-0 ${escuela.last_status_lan ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {escuela.last_status_lan ? <SignalHigh className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                                        </div>
                                        <div className="overflow-hidden">
                                            <h4 className="text-[11px] font-black text-slate-800 leading-none truncate uppercase group-hover:text-indigo-600 transition-colors" title={escuela.nombre}>
                                                {escuela.nombre}
                                            </h4>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1 truncate">
                                                {escuela.localidad} • {escuela.proveedor}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded shrink-0 uppercase tracking-widest ${escuela.uptime_percentage > 95 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                        {escuela.uptime_percentage}% up
                                    </span>
                                </div>

                                <div className="my-2.5 shrink-0">
                                    <div className="flex items-center justify-between text-[10px] bg-slate-50 px-2 py-1.5 rounded-xl border border-slate-100">
                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                            <Server className="w-3 h-3 text-slate-400 shrink-0" />
                                            <code className="text-[9px] text-indigo-600 font-mono font-bold truncate">{escuela.ip_lan}</code>
                                        </div>
                                        <span className={`font-black text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded ${escuela.last_status_lan ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {escuela.last_status_lan ? 'Online' : 'Offline'}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 shrink-0">
                                    <span className={`font-black uppercase tracking-widest ${escuela.packet_loss > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        {escuela.packet_loss}% loss
                                    </span>
                                    <span className="uppercase tracking-tighter">{escuela.tipo_enlace} • {escuela.velocidad_bajada} Mbps</span>
                                </div>

                                <StatusDots history={escuela.recent_history} />

                                <div className="mt-auto pt-2 border-t border-slate-50 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-2.5 h-2.5 text-slate-350 shrink-0" />
                                        <span className="text-[8px] font-bold text-slate-400">{new Date(escuela.last_check).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            type="button"
                                            onClick={() => { setEditingEscuela(escuela); setShowEditModal(true); }}
                                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-all shrink-0 active:scale-90"
                                        >
                                            <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        <span className={`text-[9px] font-black font-mono shrink-0 ${escuela.latency_lan < 50 ? 'text-emerald-500' : 'text-amber-500'}`}>{escuela.latency_lan}ms</span>
                                        <button 
                                            type="button"
                                            onClick={() => handleSingleRefresh(escuela.id)}
                                            className="p-1.5 bg-slate-800 text-white rounded-lg hover:rotate-180 transition-all duration-500 shadow-sm shrink-0 active:scale-90 flex items-center justify-center"
                                        >
                                            <RefreshCw className="w-2.5 h-2.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de Edición Estandarizado */}
            {showEditModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <form onSubmit={handleSave} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col z-[10000]">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                            <h2 className="text-lg font-bold text-slate-800 tracking-tight leading-none uppercase flex items-center gap-2">
                                <Edit className="w-5 h-5 text-indigo-600" />
                                <span>{editingEscuela.id ? 'Editar Configuración' : 'Nuevo Establecimiento'}</span>
                            </h2>
                            <button type="button" onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-650 transition-colors">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar bg-white">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nombre del Establecimiento</label>
                                <input 
                                    required
                                    type="text"
                                    className="no-global w-full h-10 text-[10px] font-bold bg-white border border-slate-200 px-3 rounded-xl outline-none focus:border-indigo-500 uppercase transition-all shadow-sm placeholder:text-slate-300"
                                    value={editingEscuela.nombre}
                                    onChange={(e) => setEditingEscuela({...editingEscuela, nombre: e.target.value})}
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Localidad</label>
                                    <select 
                                        className="no-global w-full text-[10px] font-black uppercase tracking-widest pl-3 pr-8 h-10 rounded-xl border border-slate-200 outline-none cursor-pointer appearance-none bg-white text-slate-700 focus:border-indigo-500 shadow-sm bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem_1rem] bg-[right_0.5rem_center] bg-no-repeat" 
                                        value={editingEscuela.localidad}
                                        onChange={(e) => setEditingEscuela({...editingEscuela, localidad: e.target.value})}
                                    >
                                        <option value="IQUIQUE">Iquique</option>
                                        <option value="ALTO HOSPICIO">Alto Hospicio</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Proveedor</label>
                                    <input 
                                        type="text"
                                        className="no-global w-full h-10 text-[10px] font-bold bg-white border border-slate-200 px-3 rounded-xl outline-none focus:border-indigo-500 uppercase transition-all shadow-sm placeholder:text-slate-300"
                                        value={editingEscuela.proveedor || ''}
                                        onChange={(e) => setEditingEscuela({...editingEscuela, proveedor: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">IP LAN (Router)</label>
                                    <input 
                                        required
                                        type="text"
                                        className="no-global w-full h-10 text-[10px] font-bold bg-white border border-slate-200 px-3 rounded-xl outline-none focus:border-indigo-500 uppercase transition-all shadow-sm placeholder:text-slate-300 font-mono"
                                        value={editingEscuela.ip_lan}
                                        onChange={(e) => setEditingEscuela({...editingEscuela, ip_lan: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Tipo Enlace</label>
                                    <select 
                                        className="no-global w-full text-[10px] font-black uppercase tracking-widest pl-3 pr-8 h-10 rounded-xl border border-slate-200 outline-none cursor-pointer appearance-none bg-white text-slate-700 focus:border-indigo-500 shadow-sm bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem_1rem] bg-[right_0.5rem_center] bg-no-repeat" 
                                        value={editingEscuela.tipo_enlace || ''}
                                        onChange={(e) => setEditingEscuela({...editingEscuela, tipo_enlace: e.target.value})}
                                    >
                                        <option value="FIBRA">Fibra Óptica</option>
                                        <option value="RADIO">Radio Enlace</option>
                                        <option value="STARLINK">Satelital (Starlink)</option>
                                        <option value="ADSL">ADSL / Red Cobre</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Velocidad (Mbps)</label>
                                    <input 
                                        type="number"
                                        className="no-global w-full h-10 text-[10px] font-bold bg-white border border-slate-200 px-3 rounded-xl outline-none focus:border-indigo-500 uppercase transition-all shadow-sm placeholder:text-slate-300"
                                        value={editingEscuela.velocidad_bajada || 0}
                                        onChange={(e) => setEditingEscuela({...editingEscuela, velocidad_bajada: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">IP WIFI (Opcional)</label>
                                    <input 
                                        type="text"
                                        className="no-global w-full h-10 text-[10px] font-bold bg-white border border-slate-200 px-3 rounded-xl outline-none focus:border-indigo-500 uppercase transition-all shadow-sm placeholder:text-slate-300 font-mono"
                                        value={editingEscuela.ip_wifi || ''}
                                        onChange={(e) => setEditingEscuela({...editingEscuela, ip_wifi: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0">
                            <button 
                                type="button" 
                                onClick={() => setShowEditModal(false)} 
                                className="bg-slate-100 hover:bg-slate-200 text-slate-650 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
                            >
                                <Save className="w-3.5 h-3.5" />
                                <span>Guardar Cambios</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default MonitoreoRed;
