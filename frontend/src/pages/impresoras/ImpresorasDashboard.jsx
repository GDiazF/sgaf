import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, RefreshCw, AlertTriangle, CheckCircle, Search, Filter, Droplet, MapPin, Hash, Activity, Plus, Globe, Edit2, Trash2 } from 'lucide-react';
import api from '../../api';
import PrinterModal from './PrinterModal';
import DiscoveryModal from './DiscoveryModal';
import { usePermission } from '../../hooks/usePermission';

const PrinterCard = ({ printer, onRefresh, onEdit, onDelete }) => {
    const [refreshing, setRefreshing] = useState(false);
    const { can } = usePermission();

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await onRefresh(printer.id);
        } finally {
            setRefreshing(false);
        }
    };

    const getStatusStyles = () => {
        const hasLowToner = printer.toner && (
            (printer.toner.black !== null && printer.toner.black < 10) ||
            (printer.toner.cyan !== null && printer.toner.cyan < 10) ||
            (printer.toner.magenta !== null && printer.toner.magenta < 10) ||
            (printer.toner.yellow !== null && printer.toner.yellow < 10)
        );

        if (!printer.last_ok && printer.last_check) return { bg: 'bg-red-500', iconBg: 'bg-red-50', iconColor: 'text-red-600', label: 'Desconectada', glow: 'shadow-red-400/20' };
        if (printer.last_errors && printer.last_errors.length > 0) return { bg: 'bg-amber-500', iconBg: 'bg-amber-50', iconColor: 'text-amber-600', label: 'Atención', glow: 'shadow-amber-400/20' };
        if (hasLowToner) return { bg: 'bg-orange-500', iconBg: 'bg-orange-50', iconColor: 'text-orange-600', label: 'Tóner Bajo', glow: 'shadow-orange-400/20' };
        if (printer.last_ok) return { bg: 'bg-emerald-500', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', label: 'Operativa', glow: 'shadow-emerald-400/20' };
        return { bg: 'bg-slate-300', iconBg: 'bg-slate-50', iconColor: 'text-slate-400', label: 'Sin Datos', glow: 'shadow-slate-200' };
    };

    const status = getStatusStyles();

    const TonerBar = ({ color, level, label }) => {
        if (level === null || level === undefined) return null;
        const colorMap = {
            black: 'bg-slate-900',
            cyan: 'bg-cyan-500',
            magenta: 'bg-pink-600',
            yellow: 'bg-yellow-400',
        };

        return (
            <div className="flex items-center gap-2 flex-1 min-w-[60px]">
                <div className="w-1.5 h-1.5 rounded-full shadow-sm flex-shrink-0" style={{ background: color === 'black' ? '#0f172a' : color }} />
                <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/50">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${level}%` }}
                        transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
                        className={`h-full rounded-full ${colorMap[color]}`}
                    />
                </div>
                <span className={`text-[10px] font-bold w-7 text-right ${level < 10 ? 'text-red-600 font-extrabold animate-pulse' : level < 20 ? 'text-orange-500 font-bold' : 'text-slate-600'}`}>{level}%</span>
            </div>
        );
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            whileHover={{ scale: 1.002 }}
            className="group relative bg-white py-2 px-4 pl-5 rounded-lg border border-slate-100 shadow-sm hover:shadow-md hover:shadow-indigo-500/5 transition-all duration-300 md:flex items-center gap-4 overflow-hidden"
        >
            {/* Status Accent Line */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${status.bg}`} />

            {/* Left: Info & Status Icon */}
            <div className="flex items-center gap-3 min-w-[200px] lg:w-[28%]">
                <div className={`relative flex-shrink-0 w-8 h-8 rounded-lg ${status.iconBg} flex items-center justify-center transition-transform group-hover:scale-105 duration-500`}>
                    <Printer className={`w-3.5 h-3.5 ${status.iconColor}`} />
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${status.bg} flex items-center justify-center shadow-sm`}>
                        {status.label === 'Operativa' && <CheckCircle className="w-1 h-1 text-white" />}
                        {status.label === 'Atención' && <AlertTriangle className="w-1 h-1 text-white" />}
                        {status.label === 'Tóner Bajo' && <Droplet className="w-1 h-1 text-white" />}
                        {status.label === 'Desconectada' && <div className="w-0.5 h-0.5 rounded-full bg-white" />}
                    </div>
                </div>

                <div className="min-w-0 flex flex-col justify-center">
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-sm font-black text-slate-900 tracking-tight leading-none uppercase truncate group-hover:text-indigo-600 transition-colors" title={printer.name}>
                            {printer.name}
                        </h3>
                        <span className="text-slate-300 text-[10px]">•</span>
                        <div className="flex items-center gap-1 text-slate-500">
                            <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                            <span className="text-[10px] font-bold uppercase tracking-wide truncate max-w-[120px]" title={printer.location}>{printer.location}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hover Actions - More Integrated */}
            <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all z-20 translate-x-4 group-hover:translate-x-0">
                {can('impresoras.change_printer') && (
                    <button onClick={() => onEdit(printer)} className="p-2 bg-white shadow-xl border border-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl transition-all hover:scale-110 active:scale-95"><Edit2 className="w-3.5 h-3.5" /></button>
                )}
                {can('impresoras.delete_printer') && (
                    <button onClick={() => onDelete(printer.id)} className="p-2 bg-white shadow-xl border border-slate-100 text-slate-400 hover:text-rose-600 rounded-xl transition-all hover:scale-110 active:scale-95"><Trash2 className="w-3.5 h-3.5" /></button>
                )}
            </div>

            {/* Middle: Toner Levels */}
            <div className="hidden md:flex flex-1 items-center gap-4 px-4 border-l border-slate-100/50 h-full">
                <TonerBar color="black" level={printer.toner?.black} label="BK" />
                {printer.type === 'COLOR' ? (
                    <>
                        <TonerBar color="cyan" level={printer.toner?.cyan} label="CY" />
                        <TonerBar color="magenta" level={printer.toner?.magenta} label="MG" />
                        <TonerBar color="yellow" level={printer.toner?.yellow} label="YL" />
                    </>
                ) : (
                    <div className="flex-1 flex items-center gap-2 opacity-40 px-2">
                        <div className="h-px bg-slate-200 flex-1" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Monocromática</span>
                        <div className="h-px bg-slate-200 flex-1" />
                    </div>
                )}
            </div>

            {/* Right: Meta & Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 ml-auto min-w-[150px] border-l border-slate-100/50 pl-4 py-0.5">

                {/* Status/Error Message if present */}
                <div className="flex flex-col items-end gap-0.5 text-right">
                    {printer.last_errors && printer.last_errors.length > 0 ? (
                        <div className="flex items-center gap-1 px-1 py-0.5 bg-red-50 rounded border border-red-100 max-w-[120px]">
                            <AlertTriangle className="w-2.5 h-2.5 text-red-500 flex-shrink-0" />
                            <span className="text-[9px] font-bold text-red-600 truncate" title={printer.last_errors[0]}>{printer.last_errors[0]}</span>
                        </div>
                    ) : (
                        <div className="h-[18px]" />
                    )}

                    <div className="flex items-center gap-1 text-slate-400">
                        <Hash className="w-2.5 h-2.5 text-indigo-300" />
                        <span className="font-mono text-[10px] font-bold text-slate-500">{printer.ip_address}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className={`p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:shadow-md transition-all active:scale-95 ${refreshing ? 'animate-spin' : ''}`}
                        title="Actualizar estado"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex bg-slate-50 p-0.5 rounded-lg border border-slate-200/50">
                        <button
                            onClick={() => onEdit(printer)}
                            className="p-1 px-1.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-sm transition-all"
                            title="Editar"
                        >
                            <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => onDelete(printer.id)}
                            className="p-1 px-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-white hover:shadow-sm transition-all"
                            title="Eliminar"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const ImpresorasDashboard = () => {
    const [printers, setPrinters] = useState([]);
    const [loading, setLoading] = useState(true);
    const { can } = usePermission();
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
        <div className="flex flex-col gap-8 pb-8 w-full px-4 sm:px-6 lg:px-8">
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
                    {can('impresoras.add_printer') && (
                        <>
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
                        </>
                    )}

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
                <div className="flex flex-col gap-2">
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
                            className="w-full py-24 text-center bg-white rounded-[2rem] border border-slate-100 shadow-sm"
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
