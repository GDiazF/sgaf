import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Search, Loader2, Clock, Globe, RefreshCcw,
    AlertCircle, User, Wallet, Mail, Phone,
    Building2, Hash, Package,
    ExternalLink, CreditCard, Layers, FolderSearch, Eye, X, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import { validateMpDateRange, validateMpCodeSearch, MP_MAX_RANGE_DAYS } from '../../utils/mpDateValidation';
import DateInput from '../../components/common/DateInput';
import {
    TITLE_ICON_BOX, BTN_PRIMARY, INPUT_FILTER, LOADER_SPIN, LINK_MUTED,
    BADGE_BLUE, CODE_TEXT, CARD_HOVER, GROUP_HOVER_TITLE, INFO_BANNER, ICON_CLOCK,
    MODAL_SHELL, MODAL_BACKDROP, MODAL_PANEL,
} from './ordenCompraUi';

const ModalPortal = ({ children }) => createPortal(children, document.body);

const todayIsoDate = () => new Date().toISOString().split('T')[0];

const OCDashboard = () => {
    const [ocs, setOcs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchCode, setSearchCode] = useState('');
    const [searchMode, setSearchMode] = useState('range');
    const [selectedStartDate, setSelectedStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [selectedEndDate, setSelectedEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [error, setError] = useState(null);
    const [rangeWarning, setRangeWarning] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [apiMeta, setApiMeta] = useState(null);
    const [loadingTime, setLoadingTime] = useState(0);

    // Modal State
    const [selectedOC, setSelectedOC] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);

    const slepIquiqueCode = "1820906";
    const [ticket] = useState(localStorage.getItem('mp_ticket') || 'F23CBE04-6C9D-40C4-985C-7F5FCD6070B6');

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

    const getMaxEndDate = () => {
        if (!selectedStartDate) return todayIsoDate();
        const start = new Date(selectedStartDate);
        start.setDate(start.getDate() + MP_MAX_RANGE_DAYS - 1);
        const maxAllowed = start.toISOString().split('T')[0];
        const today = todayIsoDate();
        return maxAllowed < today ? maxAllowed : today;
    };

    const getMinStartDate = () => {
        if (!selectedEndDate) return undefined;
        const end = new Date(selectedEndDate);
        end.setDate(end.getDate() - (MP_MAX_RANGE_DAYS - 1));
        return end.toISOString().split('T')[0];
    };

    const getLoadingMessage = () => {
        if (loadingTime < 5) return "Conectando con Mercado Público...";
        if (loadingTime < 15) return "Sincronizando registros...";
        if (loadingTime < 30) return "MP está respondiendo lento...";
        return "Conexión extendida, espere un momento...";
    };

    const fetchOCs = async (isCodeSearch = false, forceScan = false) => {
        setError(null);

        const params = {
            CodigoOrganismo: slepIquiqueCode,
            ticket: ticket,
            force: forceScan
        };

        if (isCodeSearch) {
            const codeCheck = validateMpCodeSearch(searchCode);
            if (!codeCheck.valid) {
                setRangeWarning(null);
                setError(codeCheck.error);
                return;
            }
            setRangeWarning(null);
            params.codigo = codeCheck.code;
        } else {
            const rangeCheck = validateMpDateRange(selectedStartDate, selectedEndDate);
            if (!rangeCheck.valid) {
                setRangeWarning(null);
                setError(rangeCheck.error);
                return;
            }
            setRangeWarning(rangeCheck.warning || null);
            params.fecha_inicio = selectedStartDate;
            params.fecha_fin = selectedEndDate;
        }

        setLoading(true);
        try {

            const response = await api.get('orden_compra/visor/', {
                params,
                timeout: 180000 // 180s
            });
            const data = response.data;

            if (data && data.resultados !== undefined) {
                setOcs(data.resultados || []);
                setApiMeta(data.meta || null);
            } else {
                setOcs(Array.isArray(data) ? data : []);
                setApiMeta(null);
            }
            setHasSearched(true);
        } catch (err) {
            setError(err.response?.data?.error || "Error al conectar con la API de Mercado Público");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDetail = async (oc) => {
        setSelectedOC(oc);
        setIsModalOpen(true);
        setDetailLoading(true);
        try {
            // Refetch with specific code to get the FULL details (items, observation, etc)
            const response = await api.get('orden_compra/visor/', {
                params: {
                    codigo: oc.CodigoExterno,
                    ticket: ticket,
                    force: true // Force API call in backend
                },
                timeout: 30000
            });
            const detailedData = Array.isArray(response.data) ? response.data[0] : response.data;
            if (detailedData) {
                setSelectedOC(detailedData);
            }
        } catch (err) {
            console.error("Error fetching OC detail:", err);
        } finally {
            setDetailLoading(false);
        }
    };

    const getStatusBadgeClass = (estado) => {
        const e = (estado || '').toLowerCase();
        const base = 'text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-tighter';
        if (e.includes('recepcion')) return `${base} bg-emerald-50 text-emerald-600 border-emerald-100`;
        if (e.includes('acepta') || e.includes('envia') || e.includes('enviada')) return `${base} bg-blue-50 text-blue-600 border-blue-100`;
        if (e.includes('cancela') || e.includes('rechaza') || e.includes('rechazada')) return `${base} bg-rose-50 text-rose-600 border-rose-100`;
        return `${base} bg-slate-50 text-slate-500 border-slate-100`;
    };

    return (
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden">
            <div className="shrink-0 flex flex-col gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className={TITLE_ICON_BOX}>
                            <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase select-none">
                                Visor de Órdenes de Compra
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

                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 w-full bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                        <DateInput
                            compact
                            value={selectedStartDate}
                            min={getMinStartDate()}
                            max={selectedEndDate}
                            onChange={(val) => {
                                setSelectedStartDate(val);
                                if (val) {
                                    const start = new Date(val);
                                    const end = new Date(selectedEndDate);
                                    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
                                    if (diffDays > MP_MAX_RANGE_DAYS) {
                                        const maxEnd = new Date(start);
                                        maxEnd.setDate(maxEnd.getDate() + MP_MAX_RANGE_DAYS - 1);
                                        const maxAllowed = maxEnd.toISOString().split('T')[0];
                                        const today = todayIsoDate();
                                        setSelectedEndDate(maxAllowed < today ? maxAllowed : today);
                                    }
                                }
                            }}
                            className="w-full sm:w-[8.5rem] shrink-0"
                        />
                        <span className="text-[10px] font-bold text-slate-300 hidden sm:inline">→</span>
                        <DateInput
                            compact
                            value={selectedEndDate}
                            min={selectedStartDate}
                            max={getMaxEndDate()}
                            onChange={(val) => {
                                setSelectedEndDate(val);
                                if (val) {
                                    const start = new Date(selectedStartDate);
                                    const end = new Date(val);
                                    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
                                    if (diffDays > MP_MAX_RANGE_DAYS) {
                                        const minStart = new Date(end);
                                        minStart.setDate(minStart.getDate() - (MP_MAX_RANGE_DAYS - 1));
                                        setSelectedStartDate(minStart.toISOString().split('T')[0]);
                                    }
                                }
                            }}
                            className="w-full sm:w-[8.5rem] shrink-0"
                        />
                        <button
                            type="button"
                            onClick={() => fetchOCs(false, true)}
                            disabled={loading}
                            className={BTN_PRIMARY}
                        >
                            {loading && !searchCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                            Sincronizar
                        </button>
                    </div>
                    <div className="flex items-center gap-2 w-full lg:w-auto lg:max-w-xs">
                        <div className="relative flex-1 min-w-0">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Código OC"
                                value={searchCode}
                                onChange={(e) => setSearchCode(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && fetchOCs(true, true)}
                                className={INPUT_FILTER}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => fetchOCs(true, true)}
                            disabled={loading}
                            className={BTN_PRIMARY}
                        >
                            {loading && searchCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            Buscar
                        </button>
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
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="shrink-0 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-600"
                    >
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <p className="text-[10px] font-medium uppercase tracking-tighter flex-1">{error}</p>
                        <button type="button" onClick={() => setError(null)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex-1 flex flex-col items-center justify-center gap-3"
                        >
                            <Loader2 className={LOADER_SPIN} />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest select-none">{getLoadingMessage()}</span>
                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{loadingTime}s</span>
                        </motion.div>
                    ) : ocs.length > 0 ? (
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-2">
                            {ocs.map((oc, idx) => (
                                <motion.div
                                    key={oc.CodigoExterno || idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    onClick={() => handleOpenDetail(oc)}
                                    className={`group bg-white p-4 rounded-2xl border border-slate-200 shadow-sm transition-all cursor-pointer flex flex-col ${CARD_HOVER}`}
                                >
                                    <div className="flex justify-between items-start gap-2 mb-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap gap-1 items-center mb-1">
                                                <span className={CODE_TEXT}>{oc.CodigoExterno}</span>
                                                {oc.TipoCompraRepresentativo && oc.TipoCompraRepresentativo !== 'No especificado' && (
                                                    <span className={BADGE_BLUE}>
                                                        {oc.TipoCompraRepresentativo}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className={`text-[11px] font-medium text-slate-700 line-clamp-2 uppercase tracking-tighter transition-colors ${GROUP_HOVER_TITLE}`}>{oc.Nombre || 'Sin nombre'}</h3>
                                        </div>
                                        <span className={`shrink-0 ${getStatusBadgeClass(oc.Estado)}`}>{oc.Estado}</span>
                                    </div>

                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Proveedor</p>
                                                <p className="text-[11px] font-medium text-slate-700 uppercase tracking-tighter truncate">
                                                    {oc.Proveedor?.Nombre || oc.Proveedor?.RazonSocial || oc.Proveedor?.Rut || 'Sin info pública'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex items-center gap-2">
                                                <Wallet className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Monto</p>
                                                    <p className="text-[11px] font-medium text-emerald-600 tracking-tighter">${(oc.MontoTotal || 0).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className={ICON_CLOCK} />
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha</p>
                                                    <p className="text-[11px] font-medium text-slate-700 uppercase tracking-tighter">{oc.Fechas?.FechaCreacion?.split('T')[0] || '---'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                            <Package className="w-3 h-3" />
                                            {oc.Items?.Cantidad || 0} items
                                        </span>
                                        <span className="p-1.5 text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                            <Eye className="w-3.5 h-3.5" />
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                        </div>
                    ) : hasSearched ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                            <FolderSearch className="w-10 h-10 text-slate-200 mb-3" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No se encontraron registros</span>
                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-2 max-w-xs">Pruebe otro rango de fechas o código de OC</p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl mx-1">
                            <FolderSearch className="w-10 h-10 text-slate-200 mb-3" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Explorador de órdenes de compra</span>
                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-2 max-w-sm">
                                Seleccione fechas y sincronice, o busque por código OC
                            </p>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            <ModalPortal>
            <AnimatePresence>
                {isModalOpen && selectedOC && (
                    <div className={MODAL_SHELL}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className={MODAL_BACKDROP}
                            aria-hidden
                        />
                        <motion.div
                            initial={{ scale: 0.95, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 20, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className={MODAL_PANEL}
                        >
                            <div className="bg-slate-50 border-b border-slate-100 p-4 md:p-6 flex justify-between items-start gap-4 shrink-0">
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                    <div className={TITLE_ICON_BOX}>
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className={BADGE_BLUE}>
                                            Ficha OC
                                        </span>
                                        {selectedOC.TipoCompraRepresentativo && selectedOC.TipoCompraRepresentativo !== 'No especificado' && (
                                            <span className={BADGE_BLUE}>
                                                {selectedOC.TipoCompraRepresentativo}
                                            </span>
                                        )}
                                        <span className={getStatusBadgeClass(selectedOC.Estado)}>{selectedOC.Estado}</span>
                                    </div>
                                    <h3 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase line-clamp-2">
                                        {selectedOC.Nombre || 'Orden de Compra s/n'}
                                    </h3>
                                    <p className="text-[10px] font-medium text-slate-500 mt-1.5 uppercase tracking-tighter">
                                        {selectedOC.CodigoExterno}
                                    </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors shrink-0"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar min-h-0">
                                {detailLoading ? (
                                    <div className="h-64 flex flex-col items-center justify-center gap-3">
                                        <Loader2 className={LOADER_SPIN} />
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest select-none">Cargando detalle...</span>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        {/* Left Column: Core Info */}
                                        <div className="lg:col-span-1 space-y-6">
                                            {/* General Section */}
                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                                                    Información general
                                                </h4>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fecha envío</p>
                                                    <p className="text-[11px] font-medium text-slate-700 uppercase tracking-tighter">{selectedOC.Fechas?.FechaCreacion?.replace('T', ' ').split('.')[0] || '---'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo</p>
                                                    <p className={CODE_TEXT}>{selectedOC.Tipo || 'Consignación'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Monto total</p>
                                                    <p className="text-[11px] font-medium text-emerald-600 tracking-tighter">
                                                        ${(selectedOC.MontoTotal || 0).toLocaleString()} {selectedOC.Moneda || 'CLP'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                                                    Proveedor
                                                </h4>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Razón social</p>
                                                    <p className="text-[11px] font-medium text-slate-700 uppercase tracking-tighter">{selectedOC.Proveedor?.Nombre || '---'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">RUT</p>
                                                    <p className="text-[11px] font-medium text-slate-700 uppercase tracking-tighter">{selectedOC.Proveedor?.Rut || '---'}</p>
                                                </div>
                                                {selectedOC.Proveedor?.Contacto && (
                                                    <div className="pt-2 border-t border-slate-100 space-y-2">
                                                        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600 uppercase tracking-tighter">
                                                            <User className="w-3 h-3 text-slate-400 shrink-0" /> {selectedOC.Proveedor.Contacto}
                                                        </div>
                                                        {selectedOC.Proveedor.Mail && (
                                                            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600 uppercase tracking-tighter">
                                                                <Mail className="w-3 h-3 text-slate-400 shrink-0" /> {selectedOC.Proveedor.Mail}
                                                            </div>
                                                        )}
                                                        {selectedOC.Proveedor.Fono && (
                                                            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600 uppercase tracking-tighter">
                                                                <Phone className="w-3 h-3 text-slate-400 shrink-0" /> {selectedOC.Proveedor.Fono}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Main Column: Items & Details */}
                                        <div className="lg:col-span-2 space-y-6">
                                            {/* Summary/Description */}
                                            <div className={INFO_BANNER}>
                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Descripción / observación</h4>
                                                <p className="text-xs font-medium text-slate-700 uppercase leading-relaxed whitespace-pre-line">
                                                    {selectedOC.Observacion || 'Sin descripción detallada disponible.'}
                                                </p>
                                            </div>

                                            {/* Items Table */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                        <Package className="w-3 h-3" /> Listado de Productos / Servicios
                                                    </h4>
                                                    <span className="text-[10px] font-black bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">
                                                        {selectedOC.Items?.Cantidad || 0} POSICIONES
                                                    </span>
                                                </div>

                                                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white custom-scrollbar">
                                                    <table className="w-full text-left border-collapse border-spacing-0">
                                                        <thead className="sticky top-0 z-10">
                                                            <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-200">
                                                                <th className="px-4 py-3 border-r border-slate-100">Cod. / producto</th>
                                                                <th className="px-4 py-3 border-r border-slate-100 text-center w-24">Cant.</th>
                                                                <th className="px-4 py-3 border-r border-slate-100 text-right">Unitario</th>
                                                                <th className="px-4 py-3 text-right">Total</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {selectedOC.Items?.Listado?.map((item, idx) => (
                                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                                    <td className="px-4 py-3 align-middle border-r border-slate-50">
                                                                        <span className={`block ${CODE_TEXT}`}>{item.CodigoProducto}</span>
                                                                        <span className="block text-[11px] font-medium text-slate-700 uppercase tracking-tighter line-clamp-1">{item.NombreProducto}</span>
                                                                        {item.Categoria && (
                                                                            <span className="block text-[10px] font-medium text-slate-400 uppercase tracking-tighter">{item.Categoria}</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 align-middle border-r border-slate-50 text-center">
                                                                        <span className="text-[11px] font-medium text-slate-700">{item.Cantidad}</span>
                                                                        <span className="block text-[10px] font-medium text-slate-400 uppercase tracking-tighter">{item.UnidadMedida || 'Un'}</span>
                                                                    </td>
                                                                    <td className="px-4 py-3 align-middle border-r border-slate-50 text-right text-[11px] font-medium text-slate-500 uppercase tracking-tighter whitespace-nowrap">
                                                                        ${(item.PrecioNeto || 0).toLocaleString()}
                                                                    </td>
                                                                    <td className="px-4 py-3 align-middle text-right text-[11px] font-medium text-slate-700 uppercase tracking-tighter whitespace-nowrap">
                                                                        ${(item.Total || 0).toLocaleString()}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            {/* Extra Metadata Footer */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3">
                                                    <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Condición de pago</p>
                                                        <p className="text-[11px] font-medium text-slate-700 uppercase tracking-tighter">{selectedOC.CondicionPago || '30 días contra factura'}</p>
                                                    </div>
                                                </div>
                                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3">
                                                    <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Financiamiento</p>
                                                        <p className="text-[11px] font-medium text-slate-700 uppercase tracking-tighter">{selectedOC.Financiamiento || 'Fondos propios'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-3 md:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Globe className="w-3 h-3 shrink-0" /> API Mercado Público
                                </p>
                                <button
                                    type="button"
                                    className={BTN_PRIMARY}
                                    onClick={() => window.open(`https://www.mercadopublico.cl/Directorio/Ticket/TicketOC?codigooc=${selectedOC.CodigoExterno}`, '_blank')}
                                >
                                    <ExternalLink className="w-4 h-4" /> Ver en portal MP
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

export default OCDashboard;
