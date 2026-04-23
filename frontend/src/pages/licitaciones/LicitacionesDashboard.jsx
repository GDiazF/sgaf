import React, { useState, useEffect } from 'react';
import {
    Search, Loader2, Info, Calendar, Clock, Globe, RefreshCcw, Landmark,
    Star, ArrowUpRight, CheckCircle2, AlertCircle, FileStack, Users,
    Zap, User, MapPin, Wallet, Filter, X, ChevronDown, Mail, Phone,
    Building2, Hash, Package, TrendingUp, BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';

const LicitacionesDashboard = () => {
    const [lics, setLics] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchCode, setSearchCode] = useState('');
    const [searchMode, setSearchMode] = useState('range');
    const [selectedStartDate, setSelectedStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // -7 dias
    const [selectedEndDate, setSelectedEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedState, setSelectedState] = useState('todos');
    const [filterState, setFilterState] = useState('todos'); // filtro local sobre resultados
    const [error, setError] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [apiMeta, setApiMeta] = useState(null); // Metadata de la última búsqueda
    const [showFilters, setShowFilters] = useState(false);
    const [loadingTime, setLoadingTime] = useState(0);

    const [following, setFollowing] = useState(() => {
        const saved = localStorage.getItem('slep_following');
        return saved ? JSON.parse(saved) : [];
    });
    const [ticket] = useState(localStorage.getItem('mp_ticket') || 'F23CBE04-6C9D-40C4-985C-7F5FCD6070B6');
    const [selectedLic, setSelectedLic] = useState(null);

    // Restaurar estado de búsqueda persistente (Session Storage)
    useEffect(() => {
        const saved = sessionStorage.getItem('lics_last_search');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                setLics(data.lics || []);
                setApiMeta(data.apiMeta || null);
                setHasSearched(true);
                if (data.mode) setSearchMode(data.mode);
            } catch (e) { console.error("Error restore session:", e); }
        }
    }, []);

    const slepIquiqueCode = "1820906";

    useEffect(() => {
        localStorage.setItem('slep_following', JSON.stringify(following));
    }, [following]);

    // Timer para feedback de carga
    useEffect(() => {
        let interval;
        if (loading) {
            setLoadingTime(0);
            interval = setInterval(() => {
                setLoadingTime(prev => prev + 1);
            }, 1000);
        } else {
            setLoadingTime(0);
        }
        return () => clearInterval(interval);
    }, [loading]);

    const getLoadingMessage = () => {
        if (loadingTime < 5) return "Conectando con Mercado Público...";
        if (loadingTime < 15) return "Sincronizando registros en paralelo...";
        if (loadingTime < 30) return "MP está respondiendo más lento de lo habitual...";
        if (loadingTime < 60) return "Saturación detectada en MP, reintentando canales...";
        return "Conexión extendida, por favor espere unos segundos más...";
    };

    const fetchData = async (params = {}) => {
        setLoading(true);
        setLoadingTime(0);
        setError(null);
        setLics([]); // Limpiar resultados anteriores para dar feedback visual
        setFilterState('todos');
        setApiMeta(null);
        setHasSearched(false); // Resetear para mostrar estado de carga limpio
        try {
            // Construir params limpios según el modo de búsqueda
            // CRÍTICO: No enviar parámetros vacíos que confunden el routing del backend
            const requestParams = { ticket };
            if (params.force) requestParams.force = true;

            if (params.codigo) {
                // Búsqueda por código específico
                requestParams.codigo = params.codigo;
            } else {
                // Por defecto: Búsqueda por rango
                requestParams.fecha_inicio = selectedStartDate;
                requestParams.fecha_fin = selectedEndDate;
                requestParams.CodigoOrganismo = slepIquiqueCode;
            }

            // Estado solo si no es "todos"
            if (selectedState && selectedState !== 'todos') {
                requestParams.estado = selectedState;
            }

            console.log('🔍 Enviando a backend:', requestParams);

            const response = await api.get('licitaciones/visor/', {
                params: requestParams,
                timeout: 180000 // 180 segundos (3 minutos)
            });

            const data = response.data;

            // La búsqueda mensual devuelve {resultados, meta}
            // La búsqueda diaria/código devuelve un array directo
            if (data && typeof data === 'object' && !Array.isArray(data) && data.resultados !== undefined) {
                setLics(data.resultados || []);
                setApiMeta(data.meta || null);
                sessionStorage.setItem('lics_last_search', JSON.stringify({
                    lics: data.resultados || [],
                    apiMeta: data.meta || null,
                    mode: searchMode
                }));
            } else {
                const list = Array.isArray(data) ? data : [];
                setLics(list);
                setApiMeta(null);
                sessionStorage.setItem('lics_last_search', JSON.stringify({
                    lics: list,
                    apiMeta: null,
                    mode: searchMode
                }));
            }
        } catch (err) {
            console.error("Sync Error:", err);
            let msg = "Error al conectar con la API de Mercado Público";
            if (err.code === 'ECONNABORTED') msg = "Tiempo de espera agotado (MP saturado)";
            else if (err.response?.data?.error) msg = err.response.data.error;
            else if (err.message) msg = err.message;
            setError(msg);
        } finally {
            setLoading(false);
            setHasSearched(true);
        }
    };

    const fetchDetail = async (codigo) => {
        // Si ya tiene el detalle full, no volver a pedirlo
        const existing = lics.find(l => l.CodigoExterno === codigo);
        if (existing?._has_full_detail) {
            setSelectedLic(existing);
            return;
        }

        setSelectedLic({ CodigoExterno: codigo, _loading: true });
        try {
            const response = await api.get('licitaciones/visor/', {
                params: { codigo, ticket }
            });
            if (response.data && response.data.length > 0) {
                const fullDetail = response.data[0];
                setSelectedLic(fullDetail);
                // Actualizar en la lista para persistir el detalle cargado
                setLics(prev => prev.map(l => l.CodigoExterno === codigo ? fullDetail : l));
            }
        } catch (err) {
            console.error("Detail Fetch Error:", err);
            setSelectedLic(null);
        }
    };

    const handleSearchByCode = (e) => {
        e.preventDefault();
        if (!searchCode) return;
        fetchData({ codigo: searchCode });
    };

    const toggleFollow = (lic) => {
        const code = lic.CodigoExterno;
        if (following.some(f => f.CodigoExterno === code)) {
            setFollowing(prev => prev.filter(f => f.CodigoExterno !== code));
        } else {
            setFollowing(prev => [...prev, lic]);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        try {
            const date = new Date(dateStr);
            if (isNaN(date)) return dateStr.split('T')[0];
            return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch { return dateStr; }
    };

    const formatMoney = (amount) => {
        if (!amount || amount === 0) return null;
        return new Intl.NumberFormat('es-CL').format(amount);
    };

    const getStatusConfig = (estado, codigoEstado) => {
        // Mapeo de códigos numéricos comunes de MP
        const codes = {
            5: 'Publicada',
            6: 'Cerrada',
            7: 'Desierta',
            8: 'Adjudicada',
            9: 'Suspendida',
            12: 'Revocada',
            13: 'Anulada',
            14: 'Desierta',
            15: 'Adjudicada'
        };

        const label = estado || codes[codigoEstado] || 'N/A';
        const e = (label).toLowerCase();

        if (e.includes('publicada')) return { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Publicada' };
        if (e.includes('cerrada')) return { color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: 'Cerrada' };
        if (e.includes('adjudicada')) return { color: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500', label: 'Adjudicada' };
        if (e.includes('desierta')) return { color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', label: 'Desierta' };
        if (e.includes('suspendida')) return { color: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500', label: 'Suspendida' };
        if (e.includes('revocada')) return { color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', label: 'Revocada' };
        return { color: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400', label: label };
    };

    // Filtrado local de resultados
    const filteredLics = filterState === 'todos'
        ? lics
        : lics.filter(l => getStatusConfig(l.Estado, l.CodigoEstado).label.toLowerCase().includes(filterState.toLowerCase()));

    // Estadísticas de resultados
    const stats = {
        total: lics.length,
        publicadas: lics.filter(l => getStatusConfig(l.Estado, l.CodigoEstado).label.toLowerCase().includes('publicada')).length,
        cerradas: lics.filter(l => getStatusConfig(l.Estado, l.CodigoEstado).label.toLowerCase().includes('cerrada')).length,
        adjudicadas: lics.filter(l => getStatusConfig(l.Estado, l.CodigoEstado).label.toLowerCase().includes('adjudicada')).length,
        conDetalle: lics.filter(l => l._has_full_detail).length,
    };

    const stateFilters = [
        { v: 'todos', l: 'Todos' },
        { v: 'publicada', l: 'Publicadas' },
        { v: 'cerrada', l: 'Cerradas' },
        { v: 'adjudicada', l: 'Adjudicadas' },
        { v: 'desierta', l: 'Desiertas' },
    ];

    return (
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 space-y-8">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-200/60 pb-5">
                <div className="flex items-center gap-5">
                    <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl shadow-2xl shadow-indigo-200 text-white relative overflow-hidden">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute -top-4 -right-4 w-12 h-12 bg-white/10 rounded-full blur-xl" />
                        <FileStack className="w-5 h-5 relative z-10" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-slate-900 tracking-tighter uppercase leading-none">Visor de Licitaciones</h1>
                        <p className="text-[10px] font-medium text-slate-400 mt-2 uppercase tracking-[0.3em]">SLEP Iquique • Centro de Inteligencia Técnica</p>
                    </div>
                </div>

                <div />
            </div>

            {/* Search Panel */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 bg-white p-5 rounded-2xl border border-slate-100 shadow-2xl space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-[100px] -mr-32 -mt-32" />

                    <div className="flex flex-col md:flex-row items-end gap-6 relative z-10">
                        <div className="flex-1 flex gap-4">
                            <div className="flex-1 space-y-3">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Fecha Inicio</label>
                                <div className="relative">
                                    <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500" />
                                    <input type="date" value={selectedStartDate} onChange={(e) => setSelectedStartDate(e.target.value)} className="w-full pl-16 pr-8 py-5 bg-slate-50 rounded-3xl border-transparent focus:border-indigo-500 focus:bg-white transition-all outline-none font-medium text-xs text-slate-700" />
                                </div>
                            </div>
                            <div className="flex-1 space-y-3">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Fecha Fin</label>
                                <div className="relative">
                                    <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500" />
                                    <input type="date" value={selectedEndDate} onChange={(e) => setSelectedEndDate(e.target.value)} className="w-full pl-16 pr-8 py-5 bg-slate-50 rounded-3xl border-transparent focus:border-indigo-500 focus:bg-white transition-all outline-none font-medium text-xs text-slate-700" />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => fetchData()}
                            disabled={loading}
                            className="w-full px-12 py-3 bg-indigo-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-3"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                            Consultar Panel
                        </button>
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-5">
                        <div className="p-3 bg-amber-500 rounded-2xl text-white shrink-0">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <p className="text-[10px] font-bold text-amber-900 uppercase leading-loose italic">
                            ATENCIÓN: LA SINCRONIZACIÓN POR RANGO ESCANEA FECHA POR FECHA. ESTO PUEDE TARDAR UNOS MINUTOS SEGÚN EL PERIODO.
                        </p>
                    </div>
                </div>

                <div className="bg-slate-900 p-5 rounded-2xl shadow-2xl flex flex-col justify-center space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
                    <div>
                        <h3 className="text-white text-lg font-bold uppercase tracking-tighter mb-2">Búsqueda Directa</h3>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Localice una ficha por su ID técnico</p>
                    </div>
                    <form onSubmit={handleSearchByCode} className="space-y-4">
                        <input type="text" value={searchCode} onChange={(e) => setSearchCode(e.target.value)} placeholder="EJ: 1820906-6-LP26" className="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/10 text-white font-medium outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-600" />
                        <button type="submit" disabled={loading} className="w-full py-3 bg-white text-slate-900 rounded-xl font-bold text-[8px] uppercase tracking-[0.2em] hover:bg-slate-100 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                            Consultar Código <ArrowUpRight className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>

            {/* Stats Bar - solo cuando hay resultados */}
            {hasSearched && lics.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    {[
                        { label: 'Total Hallados', value: stats.total, icon: <BarChart3 className="w-4 h-4" />, accent: 'indigo' },
                        { label: 'Publicadas', value: stats.publicadas, icon: <Globe className="w-4 h-4" />, accent: 'emerald' },
                        { label: 'Cerradas', value: stats.cerradas, icon: <Clock className="w-4 h-4" />, accent: 'amber' },
                        { label: 'Adjudicadas', value: stats.adjudicadas, icon: <CheckCircle2 className="w-4 h-4" />, accent: 'violet' },
                        { label: 'Con Detalle', value: stats.conDetalle, icon: <Zap className="w-4 h-4" />, accent: 'rose' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-4 relative overflow-hidden group">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-${s.accent}-50 group-hover:text-${s.accent}-600 transition-colors`}>
                                    {s.icon}
                                </div>
                                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">{s.label}</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-bold text-slate-900 tracking-tighter">{s.value}</span>
                                <span className="text-[10px] font-medium text-slate-300 uppercase tracking-widest">Registros</span>
                            </div>
                            <div className={`absolute bottom-0 left-0 h-1 bg-${s.accent}-500 w-0 group-hover:w-full transition-all duration-500`} />
                        </div>
                    ))}
                </motion.div>
            )}



            {/* Dashboard Content */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Panel lateral: Siguiendo */}
                <div className="lg:col-span-1 border-r border-slate-100 pr-5 space-y-8">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Siguiendo
                        </h3>
                        <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-medium">{following.length}</span>
                    </div>

                    <div className="space-y-4">
                        {following.length === 0 ? (
                            <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200 text-center">
                                <Star className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                                <p className="text-[9px] font-medium text-slate-400 uppercase leading-loose">Marca licitaciones con ★ para seguirlas aquí.</p>
                            </div>
                        ) : (
                            following.map(lic => (
                                <div key={lic.CodigoExterno} onClick={() => fetchDetail(lic.CodigoExterno)} className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group relative">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="text-[8px] font-bold text-indigo-600 uppercase">{lic.CodigoExterno}</p>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleFollow(lic);
                                            }}
                                            className="text-amber-500 hover:scale-110 transition-transform"
                                        >
                                            <Star className="w-3.5 h-3.5 fill-amber-500" />
                                        </button>
                                    </div>
                                    <h4 className="text-[11px] font-bold text-slate-800 uppercase line-clamp-2 mb-2 group-hover:text-indigo-600 leading-tight pr-4">{lic.Nombre}</h4>
                                    <div className="flex items-center justify-between text-[8px] font-medium text-slate-400 uppercase">
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(lic.Fechas?.FechaCierre || lic.FechaCierre)}</span>
                                        <span className={`px-2 py-0.5 rounded-full border text-[8px] ${getStatusConfig(lic.Estado, lic.CodigoEstado).color}`}>{lic.Estado || getStatusConfig(lic.Estado, lic.CodigoEstado).label}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Resultados */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Filtros de estado local */}
                    {hasSearched && lics.length > 0 && (
                        <div className="flex flex-col space-y-4">
                            <div className="flex items-center justify-between flex-wrap gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-2">
                                        <Filter className="w-3 h-3" /> Filtrar resultados:
                                    </span>
                                    {stateFilters.map(f => (
                                        <button
                                            key={f.v}
                                            onClick={() => setFilterState(f.v)}
                                            className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border ${filterState === f.v
                                                ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                                                }`}
                                        >
                                            {f.l}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center gap-3 mr-2">
                                    {apiMeta && (
                                        <div className={`px-4 py-2 rounded-full border flex items-center gap-2 transition-all ${apiMeta.source === 'DATABASE'
                                            ? 'bg-indigo-50 border-indigo-100 text-indigo-600'
                                            : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                            }`}>
                                            {apiMeta.source === 'DATABASE' ? <Zap className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                                            <span className="text-[9px] font-black uppercase tracking-widest">
                                                {apiMeta.source === 'DATABASE' ? 'Fuente: Local' : 'Fuente: API Live'}
                                            </span>
                                        </div>
                                    )}

                                    {apiMeta?.source === 'DATABASE' && (
                                        <button
                                            onClick={() => fetchData({ force: true })}
                                            disabled={loading}
                                            className="p-2 bg-white border border-slate-200 text-indigo-600 rounded-full hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm group active:scale-95"
                                            title="Forzar actualización completa desde Mercado Público"
                                        >
                                            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between px-6">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                                    {filteredLics.length} lics. encontradas {filterState !== 'todos' && `(filtrando ${filterState})`}
                                </p>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 text-[9px] font-bold text-slate-300 uppercase italic">
                                        <Hash className="w-3 h-3" /> Ticket: {ticket ? String(ticket).substring(0, 12) : '---'}...
                                    </div>
                                    <button
                                        onClick={() => {
                                            localStorage.removeItem('mp_ticket');
                                            window.location.reload();
                                        }}
                                        className="text-[8px] font-black text-indigo-400 hover:text-indigo-600 uppercase underline decoration-dotted"
                                        title="Limpiar ticket guardado y usar el pool por defecto"
                                    >
                                        Reset
                                    </button>
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                </div>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="py-40 flex flex-col items-center justify-center space-y-6">
                            <div className="relative">
                                <RefreshCcw className="w-12 h-12 text-indigo-600 animate-spin" />
                                <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg">
                                    {loadingTime}s
                                </div>
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tighter">{getLoadingMessage()}</h3>
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Enriqueciendo fichas técnicas • Canal Seguro</p>
                            </div>
                        </div>
                    ) : filteredLics.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredLics.map(lic => {
                                const status = getStatusConfig(lic.Estado, lic.CodigoEstado);
                                const isFollowing = following.some(f => f.CodigoExterno === lic.CodigoExterno);
                                const montoFmt = formatMoney(lic.MontoEstimado);
                                const itemsCount = lic.Items?.Cantidad || lic.Items?.Listado?.length || 0;

                                return (
                                    <motion.div
                                        key={lic.CodigoExterno}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white rounded-xl border border-slate-100 shadow-xl overflow-hidden group hover:border-indigo-300 hover:shadow-2xl transition-all duration-500 flex flex-col relative"
                                    >
                                        {/* Indicador de enriquecimiento */}
                                        {lic._has_full_detail && (
                                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />
                                        )}

                                        {/* Acciones flotantes */}
                                        <div className="absolute top-7 right-7 flex gap-2 z-10">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(lic.CodigoExterno);
                                                }}
                                                className="bg-slate-50 text-slate-400 p-3 rounded-2xl hover:bg-slate-100 hover:text-indigo-600 transition-all shadow-sm"
                                                title="Copiar Código"
                                            >
                                                <Hash className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => toggleFollow(lic)}
                                                className={`p-3 rounded-2xl transition-all ${isFollowing ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-slate-50 text-slate-300 hover:bg-amber-50 hover:text-amber-400'}`}
                                            >
                                                <Star className={`w-4 h-4 ${isFollowing ? 'fill-white' : ''}`} />
                                            </button>
                                        </div>

                                        <div className="p-5 pb-4 flex-1 flex flex-col">
                                            {/* Badges */}
                                            <div className="flex gap-2 mb-5 flex-wrap pr-24">
                                                <span className={`px-3 py-1 rounded-xl text-[9px] font-bold uppercase tracking-widest border flex items-center gap-1.5 ${status.color}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                                                    {status.label}
                                                </span>
                                                {lic._has_full_detail && (
                                                    <span className="px-3 py-1 rounded-xl text-[9px] font-bold uppercase tracking-widest bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center gap-1">
                                                        <Zap className="w-3 h-3" /> Full
                                                    </span>
                                                )}
                                            </div>

                                            {/* Título */}
                                            <div className="flex-1">
                                                <h3 className="text-sm font-bold text-slate-900 uppercase leading-[1.15] mb-3 group-hover:text-indigo-600 transition-colors line-clamp-2">
                                                    {lic.Nombre}
                                                </h3>

                                                {/* Código e Institución */}
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="text-[10px] font-bold text-indigo-600 uppercase flex items-center gap-1.5 tracking-tighter bg-indigo-50 px-3 py-1 rounded-lg">
                                                        {lic.CodigoExterno}
                                                    </div>
                                                    <div className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[150px]">
                                                        {lic.Comprador?.NombreUnidad || 'S/I'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Footer con fechas y CTA */}
                                            <div className="space-y-6 pt-5 border-t border-slate-50">
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest mb-1">Creación</p>
                                                        <p className="text-[10px] font-bold text-slate-600 flex items-center gap-1.5">
                                                            <Calendar className="w-3 h-3 text-indigo-300" />
                                                            {formatDate(lic.Fechas?.FechaCreacion)}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[7px] font-black text-amber-400 uppercase tracking-widest mb-1 text-right">Cierre</p>
                                                        <p className="text-[10px] font-bold text-slate-900 flex items-center justify-end gap-1.5">
                                                            {formatDate(lic.Fechas?.FechaCierre || lic.FechaCierre)}
                                                            <Clock className="w-3 h-3 text-amber-500" />
                                                        </p>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => fetchDetail(lic.CodigoExterno)}
                                                    className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 shadow-xl hover:shadow-indigo-200 group-hover:-translate-y-1"
                                                >
                                                    Ver Detalles Full <ArrowUpRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-20 flex flex-col items-center justify-center text-center space-y-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                            <Search className="w-12 h-12 text-slate-300" />
                            <h3 className="text-xl font-bold text-slate-300 uppercase tracking-tighter">
                                {error ? "Error al Sincronizar" :
                                    hasSearched ? "Sin Resultados" : "Visor Listo"}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest max-w-xs">
                                {error ? error :
                                    hasSearched ? "No hay procesos activos para los criterios seleccionados." :
                                        "Use el panel superior para explorar licitaciones de su institución."}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Ficha Técnica */}
            <AnimatePresence>
                {selectedLic && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSelectedLic(null)}
                            className="absolute inset-0 bg-slate-900/70 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.92, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: 20 }}
                            className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
                        >
                            {/* Modal Header */}
                            <div className="p-8 border-b border-slate-100 flex items-start justify-between gap-6 shrink-0">
                                <div className="flex-1 min-w-0">
                                    <div className="flex gap-3 mb-3 flex-wrap">
                                        <span className="bg-indigo-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-bold font-mono">{selectedLic.CodigoExterno}</span>
                                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-bold border ${getStatusConfig(selectedLic.Estado, selectedLic.CodigoEstado).color}`}>
                                            {getStatusConfig(selectedLic.Estado, selectedLic.CodigoEstado).label}
                                        </span>
                                        {selectedLic._has_full_detail && (
                                            <span className="bg-violet-100 text-violet-700 border border-violet-200 px-4 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5">
                                                <Zap className="w-3 h-3" /> Ficha Enriquecida
                                            </span>
                                        )}
                                    </div>
                                    <h2 className="text-lg font-bold text-slate-900 uppercase leading-tight mb-2">{selectedLic.Nombre || 'Cargando Técnica...'}</h2>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                                        <Landmark className="w-4 h-4" />
                                        {selectedLic.Comprador?.NombreOrganismo || selectedLic.OrganismoNombre || '---'}
                                    </p>
                                </div>
                                <button onClick={() => setSelectedLic(null)} className="p-4 bg-slate-100 rounded-3xl hover:bg-slate-200 transition-colors shrink-0">
                                    <X className="w-6 h-6 text-slate-500" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-10">
                                {selectedLic._loading ? (
                                    <div className="py-40 flex flex-col items-center justify-center space-y-6">
                                        <RefreshCcw className="w-12 h-12 text-indigo-600 animate-spin" />
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recuperando Ficha Técnica desde Mercado Público...</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Sección 1: Comprador e Info General */}
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            {/* Datos del Comprador */}
                                            <div className="lg:col-span-2 bg-slate-50 rounded-3xl p-6 space-y-5">
                                                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                                    <Building2 className="w-4 h-4" /> Datos del Organismo Comprador
                                                </h3>
                                                <div className="grid grid-cols-2 gap-4">
                                                    {[
                                                        { label: 'Unidad', value: selectedLic.Comprador?.NombreUnidad },
                                                        { label: 'RUT Unidad', value: selectedLic.Comprador?.RutUnidad, mono: true },
                                                        { label: 'Dirección', value: selectedLic.Comprador?.DireccionUnidad },
                                                        { label: 'Comuna', value: selectedLic.Comprador?.ComunaUnidad },
                                                        { label: 'Región', value: selectedLic.Comprador?.RegionUnidad },
                                                        { label: 'Organismo', value: selectedLic.Comprador?.NombreOrganismo },
                                                    ].map((f, i) => f.value ? (
                                                        <div key={i}>
                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{f.label}</p>
                                                            <p className={`text-xs font-bold text-slate-800 uppercase ${f.mono ? 'font-mono' : ''}`}>{f.value}</p>
                                                        </div>
                                                    ) : null)}
                                                </div>

                                                {/* Responsable */}
                                                {(selectedLic.Comprador?.NombreUsuario || selectedLic.Comprador?.NombreContacto || selectedLic.Responsables?.ResponsablePago) && (
                                                    <div className="pt-4 border-t border-slate-200 space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            <div className="space-y-4">
                                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                                    <User className="w-3 h-3" /> Responsable del Proceso
                                                                </p>
                                                                <div className="space-y-3">
                                                                    {[
                                                                        { label: 'Nombre', value: selectedLic.Comprador?.NombreUsuario || selectedLic.Comprador?.NombreContacto },
                                                                        { label: 'Cargo', value: selectedLic.Comprador?.CargoUsuario || selectedLic.Comprador?.CargoContacto },
                                                                        { label: 'Email', value: selectedLic.Comprador?.MailUsuario || selectedLic.Comprador?.MailContacto },
                                                                    ].map((f, i) => f.value ? (
                                                                        <div key={i}>
                                                                            <p className="text-[7px] font-black text-slate-400 uppercase mb-0.5">{f.label}</p>
                                                                            <p className="text-[11px] font-bold text-slate-800 uppercase">{f.value}</p>
                                                                        </div>
                                                                    ) : null)}
                                                                </div>
                                                            </div>

                                                            <div className="space-y-4">
                                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                                    <Wallet className="w-3 h-3" /> Responsables Adicionales
                                                                </p>
                                                                <div className="space-y-3">
                                                                    {[
                                                                        { label: 'Responsable Pago', value: selectedLic.Responsables?.ResponsablePago },
                                                                        { label: 'Responsable Contrato', value: selectedLic.Responsables?.ResponsableContrato },
                                                                        { label: 'Email Contrato', value: selectedLic.Responsables?.EmailResponsableContrato },
                                                                    ].map((f, i) => f.value ? (
                                                                        <div key={i}>
                                                                            <p className="text-[7px] font-black text-slate-400 uppercase mb-0.5">{f.label}</p>
                                                                            <p className="text-[11px] font-bold text-slate-800 uppercase">{f.value}</p>
                                                                        </div>
                                                                    ) : null)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Hitos Temporales */}
                                            <div className="space-y-3">
                                                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                                    <Calendar className="w-4 h-4" /> Hitos Temporales
                                                </h3>
                                                {[
                                                    { l: 'Creación MP', d: selectedLic.Fechas?.FechaCreacion },
                                                    { l: 'Publicación', d: selectedLic.Fechas?.FechaPublicacion || selectedLic.FechaEnvio },
                                                    { l: 'Cierre Oferta', d: selectedLic.Fechas?.FechaCierre || selectedLic.FechaCierre },
                                                    { l: 'Apertura Técnica', d: selectedLic.Fechas?.FechaActoAperturaTecnica },
                                                    { l: 'Apertura Económica', d: selectedLic.Fechas?.FechaActoAperturaEconomica },
                                                    { l: 'Adjudicación', d: selectedLic.Fechas?.FechaAdjudicacion },
                                                    { l: 'Adjudicación Est.', d: selectedLic.Fechas?.FechaEstimadaAdjudicacion },
                                                    { l: 'Inicio Preguntas', d: selectedLic.Fechas?.FechaInicio },
                                                    { l: 'Final Preguntas', d: selectedLic.Fechas?.FechaFinal },
                                                    { l: 'Pub. Respuestas', d: selectedLic.Fechas?.FechaPubRespuestas },
                                                    { l: 'Visita a Terreno', d: selectedLic.Fechas?.FechaVisitaTerreno },
                                                    { l: 'Entrega Antecedentes', d: selectedLic.Fechas?.FechaEntregaAntecedentes },
                                                ].filter(h => h.d).map((h, i) => (
                                                    <div key={i} className="flex justify-between items-center py-2.5 border-b border-slate-100">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase">{h.l}</span>
                                                        <span className="text-[10px] font-black text-slate-800">{formatDate(h.d)}</span>
                                                    </div>
                                                ))}

                                                {/* Presupuesto */}
                                                {selectedLic.MontoEstimado > 0 && (
                                                    <div className="mt-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                                                        <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Monto Estimado</p>
                                                        <p className="text-xl font-black text-indigo-700">
                                                            $ {formatMoney(selectedLic.MontoEstimado)}
                                                        </p>
                                                        <p className="text-[8px] text-indigo-400 font-bold mt-0.5">
                                                            {selectedLic.Moneda || 'CLP'}{selectedLic.TipoPago ? ` • ${selectedLic.TipoPago}` : ''}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Descripción */}
                                        {selectedLic.Descripcion && (
                                            <div>
                                                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Descripción General</h3>
                                                <p className="text-sm text-slate-600 leading-relaxed">{selectedLic.Descripcion}</p>
                                            </div>
                                        )}

                                        {/* Items */}
                                        {selectedLic.Items?.Listado?.length > 0 && (
                                            <div className="space-y-4">
                                                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                                    <Package className="w-4 h-4" /> Productos/Servicios Solicitados ({selectedLic.Items.Cantidad})
                                                </h3>
                                                <div className="overflow-x-auto border border-slate-100 rounded-3xl">
                                                    <table className="w-full text-left text-xs whitespace-nowrap">
                                                        <thead className="bg-slate-50 text-slate-400 uppercase text-[9px]">
                                                            <tr>
                                                                <th className="p-4 font-black tracking-widest">Código</th>
                                                                <th className="p-4 font-black tracking-widest">Producto / Servicio</th>
                                                                <th className="p-4 text-center font-black tracking-widest">Cantidad</th>
                                                                <th className="p-4 font-black tracking-widest">Categoría</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {selectedLic.Items.Listado.map((it, idx) => (
                                                                <tr key={idx} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                                    <td className="p-4 font-black text-indigo-600 font-mono text-[10px]">{it.CodigoProducto || '-'}</td>
                                                                    <td className="p-4 space-y-1">
                                                                        <div className="font-bold text-slate-800 uppercase text-[10px]">{it.NombreProducto}</div>
                                                                        {it.Descripcion && <div className="text-[9px] text-slate-400 italic line-clamp-1">{it.Descripcion}</div>}
                                                                    </td>
                                                                    <td className="p-4 text-center font-black text-slate-700">{it.Cantidad} <span className="text-slate-400 font-medium">{it.UnidadMedida}</span></td>
                                                                    <td className="p-4 font-medium text-slate-400 text-[10px] uppercase">{it.Categoria || '-'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {/* Items de ListadoItems (para el modal de detalle via fetchDetail) */}
                                        {selectedLic.ListadoItems?.Listado?.length > 0 && !selectedLic.Items?.Listado?.length && (
                                            <div className="space-y-4">
                                                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                                    <Package className="w-4 h-4" /> Productos/Servicios Solicitados
                                                </h3>
                                                <div className="overflow-x-auto border border-slate-100 rounded-3xl">
                                                    <table className="w-full text-left text-xs whitespace-nowrap">
                                                        <thead className="bg-slate-50 text-slate-400 uppercase text-[9px]">
                                                            <tr>
                                                                <th className="p-4 font-black tracking-widest">Código</th>
                                                                <th className="p-4 font-black tracking-widest">Producto</th>
                                                                <th className="p-4 text-center font-black tracking-widest">Cantidad</th>
                                                                <th className="p-4 font-black tracking-widest">Categoría</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {selectedLic.ListadoItems.Listado.map((it, idx) => (
                                                                <tr key={idx} className="border-t border-slate-50">
                                                                    <td className="p-4 font-black text-indigo-600 font-mono">{it.CodigoProducto}</td>
                                                                    <td className="p-4 font-bold text-slate-800 uppercase">{it.NombreProducto}</td>
                                                                    <td className="p-4 text-center font-black">{it.Cantidad} {it.UnidadMedida}</td>
                                                                    <td className="p-4 font-medium text-slate-400 uppercase">{it.Categoria}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-white rounded-2xl border border-slate-200">
                                        <Users className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Responsable</p>
                                        <p className="text-xs font-black text-slate-800 uppercase">
                                            {selectedLic.Comprador?.NombreUsuario || selectedLic.Comprador?.NombreContacto || 'Oficina Técnica'}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedLic(null)} className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-600 transition-all">
                                    Cerrar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default LicitacionesDashboard;
