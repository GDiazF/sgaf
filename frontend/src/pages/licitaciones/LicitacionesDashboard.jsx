import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Search, Loader2, Calendar, Clock, Globe, RefreshCcw,
    Star, CheckCircle2, AlertCircle, Users,
    Zap, User, Wallet, Filter, X,
    Hash, Package, BarChart3, Eye, FolderSearch, FileStack
} from 'lucide-react';
import {
    TITLE_ICON_BOX, BTN_PRIMARY, INPUT_FILTER, SELECT_STATE, LOADER_SPIN, LINK_MUTED,
    BADGE_BLUE, CODE_TEXT, CODE_TEXT_SM, CARD_HOVER, GROUP_HOVER_TITLE,
    FILTER_CHIP_ACTIVE, FILTER_CHIP, ICON_STAT, BTN_ICON, AMOUNT_BOX, AMOUNT_LABEL, AMOUNT_VALUE, AMOUNT_META,
    MODAL_SHELL, MODAL_BACKDROP, MODAL_PANEL,
} from './licitacionesUi';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import { validateMpDateRange, validateMpCodeSearch, MP_MAX_RANGE_DAYS } from '../../utils/mpDateValidation';
import DateInput from '../../components/common/DateInput';

const ModalPortal = ({ children }) => createPortal(children, document.body);

const todayIsoDate = () => new Date().toISOString().split('T')[0];

const ESTADO_CODES = {
    5: 'Publicada', 6: 'Cerrada', 7: 'Desierta', 8: 'Adjudicada',
    9: 'Suspendida', 12: 'Revocada', 13: 'Anulada', 14: 'Desierta', 15: 'Adjudicada'
};

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
    const [rangeWarning, setRangeWarning] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [apiMeta, setApiMeta] = useState(null); // Metadata de la última búsqueda
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

    useEffect(() => {
        const check = validateMpDateRange(selectedStartDate, selectedEndDate);
        setRangeWarning(check.valid ? check.warning || null : null);
    }, [selectedStartDate, selectedEndDate]);

    const getLoadingMessage = () => {
        if (loadingTime < 5) return "Conectando con Mercado Público...";
        if (loadingTime < 15) return "Sincronizando registros en paralelo...";
        if (loadingTime < 30) return "MP está respondiendo más lento de lo habitual...";
        if (loadingTime < 60) return "Saturación detectada en MP, reintentando canales...";
        return "Conexión extendida, por favor espere unos segundos más...";
    };

    const fetchData = async (params = {}) => {
        setError(null);

        const requestParams = { ticket };
        if (params.force) requestParams.force = true;

        if (params.codigo) {
            const codeCheck = validateMpCodeSearch(params.codigo);
            if (!codeCheck.valid) {
                setRangeWarning(null);
                setError(codeCheck.error);
                return;
            }
            setRangeWarning(null);
            requestParams.codigo = codeCheck.code;
        } else {
            const rangeCheck = validateMpDateRange(selectedStartDate, selectedEndDate);
            if (!rangeCheck.valid) {
                setRangeWarning(null);
                setError(rangeCheck.error);
                return;
            }
            setRangeWarning(rangeCheck.warning || null);
            requestParams.fecha_inicio = selectedStartDate;
            requestParams.fecha_fin = selectedEndDate;
            requestParams.CodigoOrganismo = slepIquiqueCode;
        }

        setLoading(true);
        setLoadingTime(0);
        setLics([]);
        setFilterState('todos');
        setApiMeta(null);
        setHasSearched(false);
        try {

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
        const codeCheck = validateMpCodeSearch(searchCode);
        if (!codeCheck.valid) {
            setError(codeCheck.error);
            return;
        }
        fetchData({ codigo: codeCheck.code });
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

    const getStatusLabel = (estado, codigoEstado) => estado || ESTADO_CODES[codigoEstado] || 'N/A';

    const getStatusBadgeClass = (estado, codigoEstado) => {
        const e = getStatusLabel(estado, codigoEstado).toLowerCase();
        const base = 'text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-tighter';
        if (e.includes('publicada')) return `${base} bg-emerald-50 text-emerald-600 border-emerald-100`;
        if (e.includes('cerrada')) return `${base} bg-amber-50 text-amber-600 border-amber-100`;
        if (e.includes('adjudicada')) return `${base} bg-blue-50 text-blue-600 border-blue-100`;
        if (e.includes('desierta') || e.includes('revocada') || e.includes('anulada')) return `${base} bg-rose-50 text-rose-600 border-rose-100`;
        if (e.includes('suspendida')) return `${base} bg-rose-50 text-rose-600 border-rose-100`;
        return `${base} bg-slate-50 text-slate-500 border-slate-100`;
    };

    const filteredLics = filterState === 'todos'
        ? lics
        : lics.filter(l => getStatusLabel(l.Estado, l.CodigoEstado).toLowerCase().includes(filterState.toLowerCase()));

    const stats = {
        total: lics.length,
        publicadas: lics.filter(l => getStatusLabel(l.Estado, l.CodigoEstado).toLowerCase().includes('publicada')).length,
        cerradas: lics.filter(l => getStatusLabel(l.Estado, l.CodigoEstado).toLowerCase().includes('cerrada')).length,
        adjudicadas: lics.filter(l => getStatusLabel(l.Estado, l.CodigoEstado).toLowerCase().includes('adjudicada')).length,
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
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden">
            <div className="shrink-0 flex flex-col gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className={TITLE_ICON_BOX}>
                            <FileStack className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase select-none">
                                Visor de Licitaciones
                            </h2>
                            <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-1.5 select-none">
                                SLEP Iquique · Organismo {slepIquiqueCode}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest select-none">
                            Ticket {ticket ? String(ticket).substring(0, 8) : '---'}…
                        </span>
                        <button
                            type="button"
                            onClick={() => { localStorage.removeItem('mp_ticket'); window.location.reload(); }}
                            className={LINK_MUTED}
                        >
                            Reset
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 w-full bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="flex flex-wrap items-center gap-2 flex-1">
                            <DateInput
                                compact
                                value={selectedStartDate}
                                max={selectedEndDate}
                                onChange={setSelectedStartDate}
                                className="w-full sm:w-[8.5rem] shrink-0"
                            />
                            <span className="text-[10px] font-bold text-slate-300 hidden sm:inline">→</span>
                            <DateInput
                                compact
                                value={selectedEndDate}
                                min={selectedStartDate}
                                max={todayIsoDate()}
                                onChange={setSelectedEndDate}
                                className="w-full sm:w-[8.5rem] shrink-0"
                            />
                            <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)} className={SELECT_STATE}>
                                <option value="todos">Todos los estados</option>
                                <option value="publicada">Publicada</option>
                                <option value="cerrada">Cerrada</option>
                                <option value="adjudicada">Adjudicada</option>
                                <option value="desierta">Desierta</option>
                            </select>
                            <button type="button" onClick={() => fetchData()} disabled={loading} className={BTN_PRIMARY}>
                                {loading && !searchCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                                Sincronizar
                            </button>
                        </div>
                        <form onSubmit={handleSearchByCode} className="flex items-center gap-2 w-full lg:w-auto lg:max-w-sm">
                            <div className="relative flex-1 min-w-0">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input type="text" value={searchCode} onChange={(e) => setSearchCode(e.target.value)} placeholder="Código licitación" className={INPUT_FILTER} />
                            </div>
                            <button type="submit" disabled={loading} className={BTN_PRIMARY}>
                                {loading && searchCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                Buscar
                            </button>
                        </form>
                    </div>
                    <p className="text-[9px] font-medium text-slate-500 uppercase tracking-widest px-1">
                        Período máximo {MP_MAX_RANGE_DAYS} días · Mercado Público consulta día a día
                    </p>
                </div>
            </div>

            {rangeWarning && !error && (
                <div className="shrink-0 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-2 text-amber-800">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p className="text-[10px] font-medium uppercase tracking-tighter">{rangeWarning}</p>
                </div>
            )}

            <AnimatePresence>
                {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="shrink-0 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-600">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <p className="text-[10px] font-medium uppercase tracking-tighter flex-1">{error}</p>
                        <button type="button" onClick={() => setError(null)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><X className="w-3.5 h-3.5" /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            {hasSearched && lics.length > 0 && (
                <div className="shrink-0 grid grid-cols-2 md:grid-cols-5 gap-2">
                    {[
                        { label: 'Total', value: stats.total, icon: BarChart3 },
                        { label: 'Publicadas', value: stats.publicadas, icon: Globe },
                        { label: 'Cerradas', value: stats.cerradas, icon: Clock },
                        { label: 'Adjudicadas', value: stats.adjudicadas, icon: CheckCircle2 },
                        { label: 'Con detalle', value: stats.conDetalle, icon: Zap },
                    ].map((s, i) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{s.label}</p>
                                <p className="text-lg font-bold text-slate-800 leading-none">{s.value}</p>
                            </div>
                            <s.icon className={ICON_STAT} />
                        </div>
                    ))}
                </div>
            )}

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-hidden">
                <div className="lg:col-span-1 flex flex-col min-h-0 border border-slate-200 rounded-2xl bg-slate-50 overflow-hidden">
                    <div className="shrink-0 flex items-center justify-between p-3 border-b border-slate-200 bg-white">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Siguiendo
                        </h3>
                        <span className={BADGE_BLUE}>{following.length}</span>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {following.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <FolderSearch className="w-8 h-8 text-slate-200 mb-2" />
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sin seguimiento</span>
                            </div>
                        ) : following.map(lic => (
                            <div key={lic.CodigoExterno} onClick={() => fetchDetail(lic.CodigoExterno)} className={`p-3 bg-white border border-slate-200 rounded-xl ${CARD_HOVER} transition-all cursor-pointer group`}>
                                <div className="flex justify-between items-start gap-1 mb-1">
                                    <p className={`${CODE_TEXT_SM} truncate`}>{lic.CodigoExterno}</p>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleFollow(lic); }} className="shrink-0 p-1 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors">
                                        <Star className="w-3.5 h-3.5 fill-amber-500" />
                                    </button>
                                </div>
                                <h4 className={`text-[11px] font-medium text-slate-700 uppercase tracking-tighter line-clamp-2 mb-2 ${GROUP_HOVER_TITLE}`}>{lic.Nombre}</h4>
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-[9px] font-medium text-slate-400 uppercase flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(lic.Fechas?.FechaCierre || lic.FechaCierre)}</span>
                                    <span className={getStatusBadgeClass(lic.Estado, lic.CodigoEstado)}>{getStatusLabel(lic.Estado, lic.CodigoEstado)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-3 flex flex-col min-h-0 gap-3 overflow-hidden">
                    {/* Filtros de estado local */}
                    {hasSearched && lics.length > 0 && (
                        <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                {stateFilters.map(f => (
                                    <button
                                        key={f.v}
                                        type="button"
                                        onClick={() => setFilterState(f.v)}
                                        className={`px-3 h-9 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border shrink-0 ${filterState === f.v ? FILTER_CHIP_ACTIVE : FILTER_CHIP}`}
                                    >
                                        {f.l}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {apiMeta && (
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-tighter ${apiMeta.source === 'DATABASE' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                        {apiMeta.source === 'DATABASE' ? 'Local' : 'API Live'}
                                    </span>
                                )}
                                {apiMeta?.source === 'DATABASE' && (
                                    <button type="button" onClick={() => fetchData({ force: true })} disabled={loading} className={BTN_ICON} title="Forzar actualización">
                                        <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                                    </button>
                                )}
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{filteredLics.length} registros</span>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className={LOADER_SPIN} />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest select-none">{getLoadingMessage()}</span>
                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{loadingTime}s</span>
                        </div>
                    ) : filteredLics.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
                            {filteredLics.map(lic => {
                                const isFollowing = following.some(f => f.CodigoExterno === lic.CodigoExterno);

                                return (
                                    <motion.div
                                        key={lic.CodigoExterno}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${CARD_HOVER} transition-all flex flex-col`}
                                    >
                                        <div className="p-4 flex-1 flex flex-col">
                                            <div className="flex justify-between items-start gap-2 mb-3">
                                                <div className="flex flex-wrap gap-1 min-w-0">
                                                    <span className={getStatusBadgeClass(lic.Estado, lic.CodigoEstado)}>{getStatusLabel(lic.Estado, lic.CodigoEstado)}</span>
                                                    {lic._has_full_detail && (
                                                        <span className={`${BADGE_BLUE} flex items-center gap-1`}>
                                                            <Zap className="w-3 h-3" /> Full
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex gap-1 shrink-0">
                                                    <button type="button" onClick={() => navigator.clipboard.writeText(lic.CodigoExterno)} className={BTN_ICON} title="Copiar código">
                                                        <Hash className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button type="button" onClick={() => toggleFollow(lic)} className={`p-1.5 rounded-lg transition-colors ${isFollowing ? 'text-amber-500 bg-amber-50' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'}`} title="Seguir">
                                                        <Star className={`w-3.5 h-3.5 ${isFollowing ? 'fill-amber-500' : ''}`} />
                                                    </button>
                                                </div>
                                            </div>
                                            <h3 className="text-[11px] font-medium text-slate-700 uppercase tracking-tighter line-clamp-2 mb-2">{lic.Nombre}</h3>
                                            <p className={`${CODE_TEXT} mb-1`}>{lic.CodigoExterno}</p>
                                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter truncate mb-3">{lic.Comprador?.NombreUnidad || 'S/I'}</p>
                                            <div className="flex justify-between text-[10px] font-medium text-slate-500 uppercase tracking-tighter mt-auto pt-3 border-t border-slate-100">
                                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(lic.Fechas?.FechaCreacion)}</span>
                                                <span className="flex items-center gap-1">{formatDate(lic.Fechas?.FechaCierre || lic.FechaCierre)}<Clock className="w-3 h-3" /></span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => fetchDetail(lic.CodigoExterno)}
                                            className={`m-4 mt-0 ${BTN_PRIMARY} justify-center`}
                                        >
                                            <Eye className="w-4 h-4" /> Ver detalle
                                        </button>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <FolderSearch className="w-10 h-10 text-slate-200 mb-3" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {hasSearched ? 'No se encontraron registros' : 'Explorador de licitaciones'}
                            </span>
                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-2 max-w-xs">
                                {hasSearched ? 'No hay procesos para los criterios seleccionados.' : 'Use sincronizar por fechas o busque por código.'}
                            </p>
                        </div>
                    )}
                    </div>
                </div>
            </div>

            <ModalPortal>
            <AnimatePresence>
                {selectedLic && (
                    <div className={MODAL_SHELL}>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSelectedLic(null)}
                            className={MODAL_BACKDROP}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className={MODAL_PANEL}
                        >
                            <div className="bg-slate-50 border-b border-slate-100 p-4 md:p-6 flex items-start justify-between gap-4 shrink-0">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <div className={`${TITLE_ICON_BOX} shrink-0 mt-0.5`}>
                                        <FileStack className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        <span className={BADGE_BLUE}>{selectedLic.CodigoExterno}</span>
                                        <span className={getStatusBadgeClass(selectedLic.Estado, selectedLic.CodigoEstado)}>{getStatusLabel(selectedLic.Estado, selectedLic.CodigoEstado)}</span>
                                        {selectedLic._has_full_detail && (
                                            <span className={`${BADGE_BLUE} flex items-center gap-1`}>
                                                <Zap className="w-3 h-3" /> Full
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase line-clamp-2">{selectedLic.Nombre || 'Cargando...'}</h3>
                                    <p className="text-[10px] font-medium text-slate-500 mt-1.5 uppercase tracking-tighter">
                                        {selectedLic.Comprador?.NombreOrganismo || selectedLic.OrganismoNombre || '---'}
                                    </p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setSelectedLic(null)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors shrink-0">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar min-h-0">
                                {selectedLic._loading ? (
                                    <div className="py-32 flex flex-col items-center justify-center gap-3">
                                        <Loader2 className={LOADER_SPIN} />
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest select-none">Cargando ficha técnica...</span>
                                    </div>
                                ) : (
                                    <>
                                        {/* Sección 1: Comprador e Info General */}
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            {/* Datos del Comprador */}
                                            <div className="lg:col-span-2 bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-4">
                                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                                                    Datos del organismo comprador
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
                                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{f.label}</p>
                                                            <p className={`text-[11px] font-medium text-slate-700 uppercase tracking-tighter ${f.mono ? 'font-mono' : ''}`}>{f.value}</p>
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
                                                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{f.label}</p>
                                                                            <p className="text-[11px] font-medium text-slate-700 uppercase tracking-tighter">{f.value}</p>
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
                                                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{f.label}</p>
                                                                            <p className="text-[11px] font-medium text-slate-700 uppercase tracking-tighter">{f.value}</p>
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
                                                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">{h.l}</span>
                                                        <span className="text-[11px] font-medium text-slate-700 uppercase tracking-tighter">{formatDate(h.d)}</span>
                                                    </div>
                                                ))}

                                                {/* Presupuesto */}
                                                {selectedLic.MontoEstimado > 0 && (
                                                    <div className={AMOUNT_BOX}>
                                                        <p className={AMOUNT_LABEL}>Monto Estimado</p>
                                                        <p className={AMOUNT_VALUE}>
                                                            $ {formatMoney(selectedLic.MontoEstimado)}
                                                        </p>
                                                        <p className={AMOUNT_META}>
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
                                                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white custom-scrollbar">
                                                    <table className="w-full text-left border-collapse border-spacing-0">
                                                        <thead className="sticky top-0 z-10">
                                                            <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-200">
                                                                <th className="px-4 py-3 border-r border-slate-100">Código</th>
                                                                <th className="px-4 py-3 border-r border-slate-100">Producto / servicio</th>
                                                                <th className="px-4 py-3 border-r border-slate-100 text-center">Cantidad</th>
                                                                <th className="px-4 py-3">Categoría</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {selectedLic.Items.Listado.map((it, idx) => (
                                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                                    <td className={`px-4 py-3 align-middle border-r border-slate-50 ${CODE_TEXT} font-mono`}>{it.CodigoProducto || '-'}</td>
                                                                    <td className="px-4 py-3 align-middle border-r border-slate-50">
                                                                        <span className="block text-[11px] font-medium text-slate-700 uppercase tracking-tighter">{it.NombreProducto}</span>
                                                                        {it.Descripcion && <span className="block text-[10px] font-medium text-slate-400 line-clamp-1">{it.Descripcion}</span>}
                                                                    </td>
                                                                    <td className="px-4 py-3 align-middle border-r border-slate-50 text-center text-[11px] font-medium text-slate-700">{it.Cantidad} <span className="text-slate-400">{it.UnidadMedida}</span></td>
                                                                    <td className="px-4 py-3 align-middle text-[11px] font-medium text-slate-500 uppercase tracking-tighter">{it.Categoria || '-'}</td>
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
                                                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white custom-scrollbar">
                                                    <table className="w-full text-left border-collapse border-spacing-0">
                                                        <thead className="sticky top-0 z-10">
                                                            <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-200">
                                                                <th className="px-4 py-3 border-r border-slate-100">Código</th>
                                                                <th className="px-4 py-3 border-r border-slate-100">Producto</th>
                                                                <th className="px-4 py-3 border-r border-slate-100 text-center">Cantidad</th>
                                                                <th className="px-4 py-3">Categoría</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {selectedLic.ListadoItems.Listado.map((it, idx) => (
                                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                                    <td className={`px-4 py-3 align-middle border-r border-slate-50 ${CODE_TEXT} font-mono`}>{it.CodigoProducto}</td>
                                                                    <td className="px-4 py-3 align-middle border-r border-slate-50 text-[11px] font-medium text-slate-700 uppercase tracking-tighter">{it.NombreProducto}</td>
                                                                    <td className="px-4 py-3 align-middle border-r border-slate-50 text-center text-[11px] font-medium text-slate-700">{it.Cantidad} {it.UnidadMedida}</td>
                                                                    <td className="px-4 py-3 align-middle text-[11px] font-medium text-slate-500 uppercase tracking-tighter">{it.Categoria}</td>
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

                            <div className="p-3 md:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Users className="w-3 h-3 shrink-0" />
                                    {selectedLic.Comprador?.NombreUsuario || selectedLic.Comprador?.NombreContacto || 'Oficina técnica'}
                                </p>
                                <button type="button" onClick={() => setSelectedLic(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0">
                                    Cerrar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            </ModalPortal>
        </div>
    );
};

export default LicitacionesDashboard;
