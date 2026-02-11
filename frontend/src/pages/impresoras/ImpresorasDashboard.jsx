import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, RefreshCw, AlertTriangle, CheckCircle, Search, Filter, Droplet, MapPin, Hash, Activity, Plus, Globe, Edit2, Trash2 } from 'lucide-react';
import api from '../../api';
import PrinterModal from './PrinterModal';
import DiscoveryModal from './DiscoveryModal';

const PrinterCard = ({ printer, onRefresh, onEdit, onDelete }) => {
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await onRefresh(printer.id);
        } finally {
            setRefreshing(false);
        }
    };

    const getStatusStyles = () => {
        if (!printer.last_ok && printer.last_check) return { bg: 'bg-rose-500', iconBg: 'bg-rose-50', iconColor: 'text-rose-600', label: 'Desconectada', glow: 'shadow-rose-400/20' };
        if (printer.last_errors && printer.last_errors.length > 0) return { bg: 'bg-amber-500', iconBg: 'bg-amber-50', iconColor: 'text-amber-600', label: 'Atención', glow: 'shadow-amber-400/20' };
        if (printer.last_ok) return { bg: 'bg-emerald-500', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', label: 'Operativa', glow: 'shadow-emerald-400/20' };
        return { bg: 'bg-slate-300', iconBg: 'bg-slate-50', iconColor: 'text-slate-400', label: 'Sin Datos', glow: 'shadow-slate-200' };
    };

    const status = getStatusStyles();

    const TonerBar = ({ color, level, label }) => {
        if (level === null || level === undefined) return null;
        const colorMap = {
            black: 'from-slate-700 via-slate-800 to-slate-900',
            cyan: 'from-cyan-400 via-blue-500 to-blue-600',
            magenta: 'from-pink-400 via-rose-500 to-rose-600',
            yellow: 'from-yellow-300 via-yellow-400 to-amber-500',
        };

        return (
            <div className="flex flex-col gap-1.5 flex-1">
                <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider transition-colors">{label}</span>
                    <span className={`text-[10px] font-black ${level < 20 ? 'text-rose-500' : 'text-slate-800'}`}>{level}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50 p-[1px]">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${level}%` }}
                        transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
                        className={`h-full rounded-full bg-gradient-to-r ${colorMap[color]} shadow-sm`}
                    />
                </div>
            </div>
        );
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -5 }}
            className="group relative bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all flex flex-col h-full overflow-hidden"
        >
            {/* Status Accent Corner */}
            <div className={`absolute top-0 right-0 w-24 h-24 ${status.iconBg} rounded-bl-[4rem] transition-colors group-hover:bg-indigo-50/50 z-0`} />

            {/* Hover Actions - More Integrated */}
            <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all z-20 translate-x-4 group-hover:translate-x-0">
                <button onClick={() => onEdit(printer)} className="p-2 bg-white shadow-xl border border-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl transition-all hover:scale-110 active:scale-95"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => onDelete(printer.id)} className="p-2 bg-white shadow-xl border border-slate-100 text-slate-400 hover:text-rose-600 rounded-xl transition-all hover:scale-110 active:scale-95"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>

            <div className="relative z-10 flex flex-col h-full">
                <div className="mb-5 flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${status.bg} ${printer.last_ok ? 'animate-pulse' : ''} ${status.glow}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${status.iconColor}`}>{status.label}</span>
                    </div>
                    <h3 className="text-[17px] font-black text-slate-900 tracking-tight leading-tight uppercase group-hover:text-indigo-600 transition-colors truncate" title={printer.name}>
                        {printer.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 px-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] truncate">{printer.location}</span>
                    </div>
                </div>

                <div className="flex-1 bg-slate-50/50 rounded-2xl p-5 border border-slate-100 mb-5 flex flex-col justify-center min-h-[145px] group-hover:bg-white transition-colors duration-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                    <div className="space-y-5">
                        <TonerBar color="black" level={printer.toner?.black} label="BK - Black" />

                        {printer.type === 'COLOR' && printer.toner ? (
                            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200/40">
                                <TonerBar color="cyan" level={printer.toner.cyan} label="Cyan" />
                                <TonerBar color="magenta" level={printer.toner.magenta} label="Mag." />
                                <TonerBar color="yellow" level={printer.toner.yellow} label="Yel." />
                            </div>
                        ) : (
                            <div className="pt-4 border-t border-slate-100 flex flex-col items-center gap-1">
                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">Monocromática</span>
                                <div className="flex gap-1">
                                    {[1, 2].map(i => <div key={i} className="w-1 h-1 rounded-full bg-slate-200" />)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {printer.last_errors && printer.last_errors.length > 0 && (
                    <div className="px-3 py-2 bg-rose-50/50 border border-rose-100 rounded-xl flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-3 h-3 text-rose-500 flex-shrink-0" />
                        <span className="text-[10px] text-rose-600 font-bold leading-tight line-clamp-1">{printer.last_errors[0]}</span>
                    </div>
                )}

                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 grayscale group-hover:grayscale-0 transition-all">
                            <Hash className="w-3 h-3 text-indigo-400" />
                            <span className="text-[10px] font-black font-mono text-slate-500 tracking-tighter uppercase">{printer.ip_address}</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 pl-4">
                            Sinc: {printer.last_check ? printer.last_check.split(' ')[1] : '--:--'}
                        </span>
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className={`p-2.5 bg-slate-900 shadow-lg shadow-slate-900/10 rounded-xl text-white hover:bg-slate-800 transition-all active:scale-95 group-hover:scale-110 ${refreshing ? 'animate-spin pr-1' : ''}`}
                    >
                        <RefreshCw className="w-3.5 h-3.5 text-indigo-300" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

const ImpresorasDashboard = () => {
    const [printers, setPrinters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshingAll, setRefreshingAll] = useState(false);
    const [filter, setFilter] = useState('all');

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
    const [selectedPrinter, setSelectedPrinter] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);

    useEffect(() => {
        fetchPrinters();
    }, []);

    const fetchPrinters = async () => {
        try {
            const response = await api.get('printers/');
            const data = Array.isArray(response.data) ? response.data : (response.data?.results || []);
            setPrinters(data);
        } catch (error) {
            console.error("Error fetching printers:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSavePrinter = async (formData) => {
        setModalLoading(true);
        try {
            if (selectedPrinter) {
                await api.patch(`printers/${selectedPrinter.id}/`, formData);
            } else {
                await api.post('printers/', formData);
            }
            fetchPrinters();
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving printer:", error);
            alert("Error al guardar la impresora.");
        } finally {
            setModalLoading(false);
        }
    };

    const handleDeletePrinter = async (id) => {
        if (!window.confirm("¿Está seguro de eliminar esta impresora?")) return;
        try {
            await api.delete(`printers/${id}/`);
            setPrinters(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            console.error("Error deleting printer:", error);
            alert("Error al eliminar la impresora.");
        }
    };

    const handleRefreshPrinter = async (id) => {
        try {
            const response = await api.post(`printers/${id}/refresh/`);
            if (response.data.success) {
                setPrinters(prev => prev.map(p => p.id === id ? response.data.printer : p));
            }
        } catch (error) {
            console.error("Error refreshing printer:", error);
        }
    };

    const handleRefreshAll = async () => {
        setRefreshingAll(true);
        try {
            await api.post('printers/refresh_all/');
            await fetchPrinters();
        } catch (error) {
            console.error("Error refreshing all:", error);
        } finally {
            setRefreshingAll(false);
        }
    };

    const handleDiscoveryResults = async (foundDevices) => {
        // Automatically register found devices or let user pick.
        // For simplicity, let's just register them all as B/N printers.
        if (!foundDevices.length) return;
        setRefreshingAll(true);
        try {
            for (const device of foundDevices) {
                // Check if already exists to avoid duplicates
                if (printers.some(p => p.ip_address === device.ip)) continue;

                await api.post('printers/', {
                    name: device.name,
                    ip_address: device.ip,
                    location: 'Descubierto en red',
                    type: 'B/N'
                });
            }
            fetchPrinters();
            setIsDiscoveryOpen(false);
        } catch (error) {
            console.error("Error registering discovered printers:", error);
        } finally {
            setRefreshingAll(false);
        }
    };

    const filteredPrinters = printers.filter(p => {
        if (filter === 'all') return true;
        if (filter === 'error') return (p.last_errors && p.last_errors.length > 0) || (!p.last_ok && p.last_check);
        if (filter === 'offline') return !p.last_ok && p.last_check;
        if (filter === 'low-toner' && p.toner) {
            const low = (val) => val !== null && val !== undefined && val < 20;
            return low(p.toner.black) || low(p.toner.cyan) || low(p.toner.magenta) || low(p.toner.yellow);
        }
        return true;
    });

    return (
        <div className="flex flex-col gap-8 pb-8 max-w-[1900px] mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header Section Aligned to Institutional Design */}
            <div className="flex justify-between items-end border-b border-slate-200/60 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Centro de Impresión</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Gestión Inteligente de {printers.length} Dispositivos
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsDiscoveryOpen(true)}
                        className="group relative hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest rounded-xl transition-all hover:border-indigo-300 hover:text-indigo-600 hover:shadow-lg hover:shadow-indigo-500/5 active:scale-95"
                    >
                        <Globe className="w-4 h-4 text-slate-400 transition-transform group-hover:rotate-12" />
                        <span>Escanear Red</span>
                    </button>

                    <button
                        onClick={() => {
                            setSelectedPrinter(null);
                            setIsModalOpen(true);
                        }}
                        className="group relative inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 active:scale-95"
                    >
                        <Plus className="w-5 h-5 text-indigo-400 transition-transform group-hover:rotate-90" />
                        <span>Añadir</span>
                    </button>

                    <div className="h-8 w-px bg-slate-200 mx-1" />

                    <button
                        onClick={handleRefreshAll}
                        disabled={refreshingAll || printers.length === 0}
                        className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 rounded-xl transition-all shadow-sm disabled:opacity-30 active:scale-95"
                        title="Actualizar flota completa"
                    >
                        <RefreshCw className={`w-5 h-5 ${refreshingAll ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Filters Aligned to Institutional Design */}
            <div className="flex items-center gap-3 p-1.5 bg-slate-100/50 backdrop-blur rounded-2xl border border-slate-200/40 w-fit">
                {[
                    { id: 'all', label: 'Todo', icon: Activity },
                    { id: 'error', label: 'Errores', icon: AlertTriangle },
                    { id: 'low-toner', label: 'Toner Bajo', icon: Droplet }
                ].map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                            ${filter === f.id
                                ? 'bg-white text-slate-900 shadow-md shadow-slate-200/50 border border-slate-100'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
                    >
                        <f.icon className={`w-3.5 h-3.5 ${filter === f.id ? 'text-indigo-600' : ''}`} />
                        {f.label}
                        <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[9px] ${filter === f.id ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}`}>
                            {f.id === 'all' ? printers.length :
                                f.id === 'error' ? printers.filter(p => (p.last_errors && p.last_errors.length > 0) || (!p.last_ok && p.last_check)).length :
                                    printers.filter(p => {
                                        if (!p.toner) return false;
                                        const low = (val) => val !== null && val !== undefined && val < 20;
                                        return low(p.toner.black) || low(p.toner.cyan) || low(p.toner.magenta) || low(p.toner.yellow);
                                    }).length}
                        </span>
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4">
                    <div className="relative">
                        <div className="w-14 h-14 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin" />
                        <Printer className="w-5 h-5 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] animate-pulse">Sincronizando flota...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-6">
                    <AnimatePresence mode="popLayout">
                        {filteredPrinters.map(printer => (
                            <PrinterCard
                                key={printer.id}
                                printer={printer}
                                onRefresh={handleRefreshPrinter}
                                onEdit={(p) => {
                                    setSelectedPrinter(p);
                                    setIsModalOpen(true);
                                }}
                                onDelete={handleDeletePrinter}
                            />
                        ))}
                    </AnimatePresence>

                    {filteredPrinters.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="col-span-full py-24 text-center bg-white rounded-[2rem] border border-slate-100 shadow-sm"
                        >
                            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <Printer className="w-10 h-10 text-slate-200" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Sin Dispositivos Registrados</h3>
                            <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto font-medium">No se encontraron impresoras que coincidan con el filtro actual.</p>
                        </motion.div>
                    )}
                </div>
            )}

            {/* Modals */}
            <PrinterModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSavePrinter}
                printer={selectedPrinter}
                loading={modalLoading}
            />

            <DiscoveryModal
                isOpen={isDiscoveryOpen}
                onClose={() => setIsDiscoveryOpen(false)}
                onFinish={handleDiscoveryResults}
            />
        </div>
    );
};

export default ImpresorasDashboard;
