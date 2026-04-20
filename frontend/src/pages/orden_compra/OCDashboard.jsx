import React, { useState, useEffect } from 'react';
import {
    Search, Loader2, Info, Calendar, Clock, Globe, RefreshCcw, Landmark,
    Star, ArrowUpRight, CheckCircle2, AlertCircle, ShoppingCart, Users,
    Zap, User, MapPin, Wallet, Filter, X, ChevronDown, Mail, Phone,
    Building2, Hash, Package, TrendingUp, BarChart3, Receipt, FileText,
    ExternalLink, MapPinned, CreditCard, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';

const OCDashboard = () => {
    const [ocs, setOcs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchCode, setSearchCode] = useState('');
    const [searchMode, setSearchMode] = useState('range');
    const [selectedStartDate, setSelectedStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [selectedEndDate, setSelectedEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [error, setError] = useState(null);
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

    const getLoadingMessage = () => {
        if (loadingTime < 5) return "Conectando con Mercado Público...";
        if (loadingTime < 15) return "Sincronizando registros...";
        if (loadingTime < 30) return "MP está respondiendo lento...";
        return "Conexión extendida, espere un momento...";
    };

    const fetchOCs = async (isCodeSearch = false, forceScan = false) => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                CodigoOrganismo: slepIquiqueCode,
                ticket: ticket,
                force: forceScan
            };

            if (isCodeSearch) {
                if (!searchCode.trim()) {
                    setError("Ingrese un código de OC válido");
                    setLoading(false);
                    return;
                }
                params.codigo = searchCode.trim();
            } else {
                params.fecha_inicio = selectedStartDate;
                params.fecha_fin = selectedEndDate;
            }

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

    const getStatusColor = (estado) => {
        const e = (estado || '').toLowerCase();
        if (e.includes('recepcion')) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
        if (e.includes('acepta') || e.includes('envia') || e.includes('enviada')) return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        if (e.includes('cancela') || e.includes('rechaza') || e.includes('rechazada')) return 'bg-red-500/10 text-red-500 border-red-500/20';
        return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    };

    return (
        <div className="space-y-4 w-full px-4 sm:px-6 lg:px-8 pb-8">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 backdrop-blur-md p-4 rounded-xl border border-white/20 shadow-xl shadow-slate-200/50">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl shadow-lg shadow-indigo-200">
                        <ShoppingCart className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-slate-800 tracking-tight">Visor de Órdenes de Compra</h1>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            SLEP Iquique <span className="w-1 h-1 bg-slate-300 rounded-full"></span> {slepIquiqueCode}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex items-center bg-white rounded-2xl border border-slate-100 p-1 shadow-sm focus-within:ring-2 ring-indigo-500/20 transition-all">
                        <div className="pl-3 pr-2 text-slate-400">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-2 pr-2">
                            <input
                                type="date"
                                value={selectedStartDate}
                                onChange={(e) => setSelectedStartDate(e.target.value)}
                                className="bg-transparent border-none text-[11px] font-medium text-slate-700 focus:ring-0 p-2 w-[120px]"
                            />
                            <div className="text-slate-300 font-bold">→</div>
                            <input
                                type="date"
                                value={selectedEndDate}
                                onChange={(e) => setSelectedEndDate(e.target.value)}
                                className="bg-transparent border-none text-[11px] font-medium text-slate-700 focus:ring-0 p-2 w-[120px]"
                            />
                        </div>
                        <button
                            onClick={() => fetchOCs(false, true)}
                            disabled={loading}
                            className="bg-slate-900 hover:bg-slate-800 text-white p-2 rounded-lg transition-all shadow-lg active:scale-95 disabled:opacity-50"
                        >
                            {loading && !searchCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                        </button>
                    </div>

                    <div className="h-8 w-[1px] bg-slate-200 hidden md:block mx-1"></div>

                    <div className="relative flex items-center bg-white rounded-2xl border border-slate-100 p-1 shadow-sm focus-within:ring-2 ring-blue-500/20 transition-all group">
                        <div className="pl-3 pr-2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                            <Hash className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            placeholder="Código OC"
                            value={searchCode}
                            onChange={(e) => setSearchCode(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && fetchOCs(true, true)}
                            className="bg-transparent border-none text-xs font-medium text-slate-700 placeholder:text-slate-300 focus:ring-0 p-2 w-32"
                        />
                        <button
                            onClick={() => fetchOCs(true, true)}
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[9px] font-semibold transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50"
                        >
                            {loading && searchCode ? <Loader2 className="w-3 h-3 animate-spin" /> : "BUSCAR"}
                        </button>
                    </div>

                    <div className="flex items-center gap-2 ml-2">
                        <span className="text-[8px] font-bold text-slate-300 uppercase italic">Ticket: {ticket ? String(ticket).substring(0, 8) : '---'}...</span>
                        <button
                            onClick={() => {
                                localStorage.removeItem('mp_ticket');
                                window.location.reload();
                            }}
                            className="text-[8px] font-black text-indigo-400 hover:text-indigo-600 uppercase underline decoration-dotted"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-4 text-red-600 shadow-sm"
                    >
                        <div className="bg-red-500 text-white p-2 rounded-full">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-bold">Error en la consulta</p>
                            <p className="text-xs font-medium opacity-80">{error}</p>
                        </div>
                        <button onClick={() => setError(null)} className="ml-auto p-2 hover:bg-red-100 rounded-full transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="w-full">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-[300px] flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm rounded-xl border border-white/50"
                        >
                            <div className="relative">
                                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                                <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-lg">
                                    {loadingTime}s
                                </div>
                            </div>
                            <div className="text-center mt-6">
                                <p className="font-bold text-slate-800 text-base tracking-tight">{getLoadingMessage()}</p>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Sincronización en tiempo real • Canal Seguro</p>
                            </div>
                        </motion.div>
                    ) : ocs.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {ocs.map((oc, idx) => (
                                <motion.div
                                    key={oc.CodigoExterno || idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    onClick={() => handleOpenDetail(oc)}
                                    className="group bg-white hover:bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 relative overflow-hidden cursor-pointer"
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-50 to-transparent -mr-8 -mt-8 rounded-full transition-transform group-hover:scale-150"></div>

                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <div className="max-w-[65%]">
                                            <div className="flex flex-wrap gap-1 items-center mb-1">
                                                <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-[0.2em]">{oc.CodigoExterno}</span>
                                                {oc.TipoCompraRepresentativo && oc.TipoCompraRepresentativo !== 'No especificado' && (
                                                    <span className="text-[8px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">
                                                        {oc.TipoCompraRepresentativo}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="font-semibold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors uppercase text-xs">{oc.Nombre || 'Sin nombre'}</h3>
                                        </div>
                                        <div className={`px-2.5 py-1 rounded-full border text-[9px] font-bold uppercase tracking-wider ${getStatusColor(oc.Estado)}`}>
                                            {oc.Estado}
                                        </div>
                                    </div>

                                    <div className="space-y-3 relative z-10">
                                        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                            <div className="p-1.5 bg-white rounded-lg shadow-sm">
                                                <Building2 className="w-3 h-3 text-slate-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">Proveedor</p>
                                                {oc.Proveedor?.Nombre || oc.Proveedor?.RazonSocial || oc.Proveedor?.Rut ? (
                                                    <p className="text-xs font-black text-slate-700 uppercase truncate">
                                                        {oc.Proveedor?.Nombre || oc.Proveedor?.RazonSocial || oc.Proveedor?.Rut}
                                                    </p>
                                                ) : (
                                                    <p className="text-xs font-bold text-slate-400 italic truncate">Sin info pública aún</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 bg-emerald-50 rounded-xl">
                                                    <Wallet className="w-3 h-3 text-emerald-500" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Monto</p>
                                                    <p className="text-sm font-black text-emerald-600 tracking-tight">
                                                        ${(oc.MontoTotal || 0).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 bg-indigo-50 rounded-xl">
                                                    <Clock className="w-3 h-3 text-indigo-500" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Fecha</p>
                                                    <p className="text-xs font-black text-slate-700">{oc.Fechas?.FechaCreacion?.split('T')[0] || '---'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between">
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                            <Package className="w-3 h-3" />
                                            {oc.Items?.Cantidad || 0} items
                                        </div>
                                        <div className="text-[10px] font-black text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                            VER DETALLE →
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : hasSearched ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="h-[400px] flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm rounded-[2.5rem] border border-white/50 text-center p-8"
                        >
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <Search className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="font-black text-slate-800 text-lg tracking-tight">No se encontraron resultados</h3>
                            <p className="text-slate-400 font-medium text-sm mt-2 max-w-xs">Intente con otra fecha o verifique el código de la orden de compra.</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="h-[400px] flex flex-col items-center justify-center bg-indigo-600 bg-opacity-[0.03] rounded-[2.5rem] border-2 border-dashed border-indigo-100 text-center p-8"
                        >
                            <div className="w-24 h-24 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center mb-6 relative">
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-black text-xs shadow-lg">?</div>
                                <Receipt className="w-12 h-12 text-indigo-500" />
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg tracking-tight">Explorador de OCs</h3>
                            <p className="text-slate-500 font-bold text-sm mt-2 max-w-xs uppercase tracking-widest leading-relaxed">
                                Ingrese un código o seleccione un rango para sincronizar datos
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Premium Detail Modal */}
            <AnimatePresence>
                {isModalOpen && selectedOC && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
                        onClick={() => setIsModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 20, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white"
                        >
                            {/* Modal Header */}
                            <div className="p-8 pb-4 flex justify-between items-start border-b border-slate-50">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full tracking-widest uppercase">
                                            Ficha de Orden de Compra
                                        </span>
                                        {selectedOC.TipoCompraRepresentativo && selectedOC.TipoCompraRepresentativo !== 'No especificado' && (
                                            <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full tracking-widest uppercase">
                                                {selectedOC.TipoCompraRepresentativo}
                                            </span>
                                        )}
                                        <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${getStatusColor(selectedOC.Estado)}`}>
                                            {selectedOC.Estado}
                                        </span>
                                    </div>
                                    <h2 className="text-lg font-bold text-slate-800 uppercase leading-none mb-1">
                                        {selectedOC.Nombre || 'Orden de Compra s/n'}
                                    </h2>
                                    <p className="text-sm font-bold text-slate-400 flex items-center gap-2">
                                        <Hash className="w-4 h-4" /> {selectedOC.CodigoExterno}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded-2xl transition-all active:scale-95"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                {detailLoading ? (
                                    <div className="h-64 flex flex-col items-center justify-center space-y-4">
                                        <div className="relative">
                                            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                                            <div className="absolute inset-0 blur-xl bg-indigo-400/20 animate-pulse"></div>
                                        </div>
                                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Obteniendo detalles completos...</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        {/* Left Column: Core Info */}
                                        <div className="lg:col-span-1 space-y-6">
                                            {/* General Section */}
                                            <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-4">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                                                    <Info className="w-3 h-3" /> Información General
                                                </h4>

                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Fecha Envío</p>
                                                    <p className="text-sm font-black text-slate-700">{selectedOC.Fechas?.FechaCreacion?.replace('T', ' ').split('.')[0] || '---'}</p>
                                                </div>

                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Tipo</p>
                                                    <p className="text-sm font-black text-indigo-600 uppercase">{selectedOC.Tipo || 'Consignación'}</p>
                                                </div>

                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Monto Total</p>
                                                    <p className="text-xl font-bold text-emerald-600">
                                                        ${(selectedOC.MontoTotal || 0).toLocaleString()} <span className="text-xs">{selectedOC.Moneda || 'CLP'}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Provider Section */}
                                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                                                <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                                                    <Building2 className="w-3 h-3" /> Proveedor
                                                </h4>

                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Razón Social</p>
                                                    <p className="text-sm font-black text-slate-700 uppercase">{selectedOC.Proveedor?.Nombre}</p>
                                                </div>

                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">RUT</p>
                                                    <p className="text-sm font-black text-slate-700">{selectedOC.Proveedor?.Rut}</p>
                                                </div>

                                                {selectedOC.Proveedor?.Contacto && (
                                                    <div className="pt-2 border-t border-slate-50 space-y-2">
                                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                                            <User className="w-3 h-3 text-slate-400" /> {selectedOC.Proveedor.Contacto}
                                                        </div>
                                                        {selectedOC.Proveedor.Mail && (
                                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                                                <Mail className="w-3 h-3 text-slate-400" /> {selectedOC.Proveedor.Mail}
                                                            </div>
                                                        )}
                                                        {selectedOC.Proveedor.Fono && (
                                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                                                <Phone className="w-3 h-3 text-slate-400" /> {selectedOC.Proveedor.Fono}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Main Column: Items & Details */}
                                        <div className="lg:col-span-2 space-y-6">
                                            {/* Summary/Description */}
                                            <div className="p-6 bg-indigo-600/5 rounded-3xl border border-indigo-100 relative overflow-hidden group">
                                                <div className="absolute -right-4 -top-4 text-indigo-600/10 group-hover:scale-110 transition-transform">
                                                    <FileText className="w-24 h-24 rotate-12" />
                                                </div>
                                                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-3">Descripción / Observación</h4>
                                                <p className="text-sm font-bold text-slate-600 leading-relaxed whitespace-pre-line relative z-10">
                                                    {selectedOC.Observacion || 'Sin descripción detallada disponible en esta ficha.'}
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

                                                <div className="overflow-x-auto rounded-3xl border border-slate-100 shadow-sm">
                                                    <table className="w-full text-left border-collapse whitespace-nowrap">
                                                        <thead>
                                                            <tr className="bg-slate-50">
                                                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cod. / Producto</th>
                                                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Cant.</th>
                                                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Unitario</th>
                                                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-50">
                                                            {selectedOC.Items?.Listado?.map((item, idx) => (
                                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                                    <td className="p-4">
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter">
                                                                                {item.CodigoProducto}
                                                                            </span>
                                                                            <span className="text-xs font-black text-slate-700 uppercase line-clamp-1">
                                                                                {item.NombreProducto}
                                                                            </span>
                                                                            {item.Categoria && (
                                                                                <span className="text-[8px] font-bold text-slate-300 uppercase">
                                                                                    {item.Categoria}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-4 text-center">
                                                                        <div className="inline-flex flex-col items-center">
                                                                            <span className="text-xs font-black text-slate-700">{item.Cantidad}</span>
                                                                            <span className="text-[8px] font-bold text-slate-400 uppercase">{item.UnidadMedida || 'Un'}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-4 text-right font-bold text-slate-600 text-xs">
                                                                        ${(item.PrecioNeto || 0).toLocaleString()}
                                                                    </td>
                                                                    <td className="p-4 text-right font-black text-slate-800 text-xs">
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
                                                <div className="bg-slate-50/30 p-4 rounded-2xl border border-slate-50 flex items-center gap-3">
                                                    <div className="p-2 bg-white rounded-xl">
                                                        <CreditCard className="w-3 h-3 text-slate-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase">Condición de Pago</p>
                                                        <p className="text-[10px] font-black text-slate-600 uppercase">{selectedOC.CondicionPago || '30 Días contra factura'}</p>
                                                    </div>
                                                </div>
                                                <div className="bg-slate-50/30 p-4 rounded-2xl border border-slate-50 flex items-center gap-3">
                                                    <div className="p-2 bg-white rounded-xl">
                                                        <Layers className="w-3 h-3 text-slate-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase">Financiamiento</p>
                                                        <p className="text-[10px] font-black text-slate-600 uppercase">{selectedOC.Financiamiento || 'Fondos Propios'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 bg-slate-50 flex items-center justify-between">
                                <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-2">
                                    <Globe className="w-3 h-3" /> Datos sincronizados en tiempo real desde la API de Mercado Público
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 flex items-center gap-2 shadow-lg"
                                        onClick={() => window.open(`https://www.mercadopublico.cl/Directorio/Ticket/TicketOC?codigooc=${selectedOC.CodigoExterno}`, '_blank')}
                                    >
                                        VER EN PORTAL MP <ExternalLink className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default OCDashboard;
