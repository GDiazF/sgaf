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
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <Signal className="w-8 h-8 text-indigo-600" />
                        Monitoreo de Red Institucional
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Estado avanzado y métricas de calidad de enlaces terrestres y satelitales.</p>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => { setEditingEscuela({ nombre: '', ip_lan: '', ip_wifi: '', localidad: 'IQUIQUE', tipo_enlace: 'FIBRA', proveedor: 'GTD', velocidad_bajada: 200 }); setShowEditModal(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl shadow-sm hover:bg-slate-50 transition-all font-bold text-sm"
                    >
                        <Plus className="w-4 h-4" /> Nueva IP
                    </button>
                    <button 
                        onClick={handleRefreshAll}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all font-bold text-sm disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? 'Escaneando...' : 'Escanear Todo'}
                    </button>
                </div>
            </div>

            {/* Estadísticas Rápidas */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <button 
                    onClick={() => setStatusFilter('all')}
                    className={`text-left p-4 rounded-2xl border transition-all ${statusFilter === 'all' ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/20' : 'bg-white border-slate-100 shadow-sm hover:border-slate-300'}`}
                >
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Enlaces</p>
                    <p className="text-2xl font-black text-slate-800">{stats.total}</p>
                </button>
                <button 
                    onClick={() => setStatusFilter('online')}
                    className={`text-left p-4 rounded-2xl border transition-all border-l-4 border-l-emerald-500 ${statusFilter === 'online' ? 'bg-emerald-50 border-emerald-200 ring-2 ring-emerald-500/20' : 'bg-white border-slate-100 shadow-sm hover:border-slate-300'}`}
                >
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Online</p>
                    <p className="text-2xl font-black text-emerald-600">{stats.online}</p>
                </button>
                <button 
                    onClick={() => setStatusFilter('offline')}
                    className={`text-left p-4 rounded-2xl border transition-all border-l-4 border-l-rose-500 ${statusFilter === 'offline' ? 'bg-rose-50 border-rose-200 ring-2 ring-rose-500/20' : 'bg-white border-slate-100 shadow-sm hover:border-slate-300'}`}
                >
                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Offline / Caídos</p>
                    <p className="text-2xl font-black text-rose-600">{stats.offline}</p>
                </button>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Latencia Media</p>
                    <p className="text-2xl font-black text-indigo-600">{stats.avgLatency} ms</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Pérdida Media</p>
                    <p className="text-2xl font-black text-amber-600">{stats.avgLoss}%</p>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre o IP..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold shadow-inner"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="md:w-64">
                    <select 
                        className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold shadow-inner"
                        value={filterLocalidad}
                        onChange={(e) => setFilterLocalidad(e.target.value)}
                    >
                        <option value="">Todas las Localidades</option>
                        <option value="IQUIQUE">Iquique</option>
                        <option value="ALTO HOSPICIO">Alto Hospicio</option>
                    </select>
                </div>
            </div>

            {/* Grid de Escuelas */}
            {loading && !refreshing ? (
                <div className="h-64 flex flex-col items-center justify-center gap-4">
                    <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
                    <p className="text-slate-400 font-bold animate-pulse">Contactando routers de establecimientos...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                    {filteredEscuelas.map((escuela) => (
                        <div 
                            key={escuela.id} 
                            className={`group bg-white rounded-2xl p-4 border transition-all hover:shadow-lg ${escuela.last_status_lan ? 'border-emerald-100 hover:border-emerald-200' : 'border-rose-100 hover:border-rose-200'}`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-lg ${escuela.last_status_lan ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                        {escuela.last_status_lan ? <SignalHigh className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                                    </div>
                                    <div className="max-w-[140px] overflow-hidden">
                                        <h3 className="text-xs font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors truncate" title={escuela.nombre}>
                                            {escuela.nombre}
                                        </h3>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{escuela.localidad} • {escuela.proveedor}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${escuela.uptime_percentage > 95 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {escuela.uptime_percentage}% up
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center justify-between text-[10px] bg-slate-50/80 px-2 py-1.5 rounded-lg border border-slate-100/50">
                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                        <Server className="w-2.5 h-2.5 text-slate-400" />
                                        <code className="text-[10px] text-indigo-600 font-mono font-bold truncate">{escuela.ip_lan}</code>
                                    </div>
                                    <span className={`font-black uppercase text-[8px] flex-shrink-0 ml-2 ${escuela.last_status_lan ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {escuela.last_status_lan ? 'ON' : 'OFF'}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="mt-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-black ${escuela.packet_loss > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        {escuela.packet_loss}% loss
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400">{escuela.tipo_enlace}</span>
                                </div>
                                <div className="text-[9px] font-bold text-slate-400">{escuela.velocidad_bajada} Mbps</div>
                            </div>

                            <StatusDots history={escuela.recent_history} />

                            <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-50">
                                <div className="flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5 text-slate-300" />
                                    <span className="text-[8px] font-bold text-slate-400">{new Date(escuela.last_check).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => { setEditingEscuela(escuela); setShowEditModal(true); }}
                                        className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-all"
                                    >
                                        <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <span className={`text-[10px] font-black ${escuela.latency_lan < 50 ? 'text-emerald-500' : 'text-amber-500'}`}>{escuela.latency_lan}ms</span>
                                    <button 
                                        onClick={() => handleSingleRefresh(escuela.id)}
                                        className="p-1.5 bg-slate-800 text-white rounded-lg hover:rotate-180 transition-all duration-500 shadow-sm"
                                    >
                                        <RefreshCw className="w-2.5 h-2.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Edición */}
            {showEditModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <form onSubmit={handleSave} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                                <Edit className="w-6 h-6 text-indigo-600" />
                                {editingEscuela.id ? 'Editar Configuración' : 'Nuevo Establecimiento'}
                            </h2>
                            <button type="button" onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-all">
                                <XCircle className="w-6 h-6 text-slate-300" />
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Nombre del Establecimiento</label>
                                <input 
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 ring-indigo-500 transition-all"
                                    value={editingEscuela.nombre}
                                    onChange={(e) => setEditingEscuela({...editingEscuela, nombre: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Localidad</label>
                                    <select 
                                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold"
                                        value={editingEscuela.localidad}
                                        onChange={(e) => setEditingEscuela({...editingEscuela, localidad: e.target.value})}
                                    >
                                        <option value="IQUIQUE">Iquique</option>
                                        <option value="ALTO HOSPICIO">Alto Hospicio</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Proveedor</label>
                                    <input 
                                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold"
                                        value={editingEscuela.proveedor || ''}
                                        onChange={(e) => setEditingEscuela({...editingEscuela, proveedor: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">IP LAN (Router)</label>
                                    <input 
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-mono font-bold"
                                        value={editingEscuela.ip_lan}
                                        onChange={(e) => setEditingEscuela({...editingEscuela, ip_lan: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Tipo Enlace</label>
                                    <select 
                                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold"
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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Velocidad (Mbps)</label>
                                    <input 
                                        type="number"
                                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold"
                                        value={editingEscuela.velocidad_bajada || 0}
                                        onChange={(e) => setEditingEscuela({...editingEscuela, velocidad_bajada: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">IP WIFI (Opcional)</label>
                                    <input 
                                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-mono font-bold"
                                        value={editingEscuela.ip_wifi || ''}
                                        onChange={(e) => setEditingEscuela({...editingEscuela, ip_wifi: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button type="button" onClick={() => setShowEditModal(false)} className="px-6 py-2.5 text-slate-500 font-bold text-sm">Cancelar</button>
                            <button type="submit" className="px-8 py-2.5 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-200">
                                Guardar Cambios
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default MonitoreoRed;
