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

    const getStatusColor = () => {
        if (!printer.last_ok && printer.last_check) return 'bg-red-100 text-red-600 border-red-200';
        if (printer.last_errors && printer.last_errors.length > 0) return 'bg-yellow-100 text-yellow-600 border-yellow-200';
        if (printer.last_ok) return 'bg-emerald-100 text-emerald-600 border-emerald-200';
        return 'bg-slate-100 text-slate-500 border-slate-200';
    };

    const StatusIcon = () => {
        if (!printer.last_ok && printer.last_check) return <AlertTriangle className="w-5 h-5" />;
        if (printer.last_errors && printer.last_errors.length > 0) return <AlertTriangle className="w-5 h-5" />;
        if (printer.last_ok) return <CheckCircle className="w-5 h-5" />;
        return <Activity className="w-5 h-5" />;
    };

    const TonerBar = ({ color, level, label }) => {
        if (level === null || level === undefined) return null;

        const colorMap = {
            black: 'bg-slate-900',
            cyan: 'bg-cyan-500',
            magenta: 'bg-pink-500',
            yellow: 'bg-yellow-400',
        };

        return (
            <div className="flex flex-col gap-1 w-full">
                <div className="flex justify-between text-xs font-medium text-slate-600">
                    <span className="capitalize">{label}</span>
                    <span>{level}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${level}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className={`h-full rounded-full ${colorMap[color] || 'bg-slate-500'}`}
                    />
                </div>
            </div>
        );
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 group"
        >
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getStatusColor()} bg-opacity-20 shadow-inner`}>
                            <Printer className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">{printer.name}</h3>
                            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                                <MapPin className="w-3 h-3" />
                                {printer.location} {printer.floor && `• ${printer.floor}`}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border shadow-sm ${getStatusColor()}`}>
                            <StatusIcon />
                            <span>{printer.last_ok ? 'Online' : (printer.last_check ? 'Offline' : 'Unknown')}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4 text-[11px] font-bold bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Hash className="w-3 h-3 text-slate-300" />
                        <span className="font-mono">{printer.ip_address}</span>
                    </div>
                    {printer.serial_number && (
                        <div className="flex items-center gap-2 text-slate-400" title="Serial Number">
                            <span className="font-mono truncate">{printer.serial_number}</span>
                        </div>
                    )}
                </div>

                <div className="space-y-3 mb-6">
                    {printer.toner?.black !== null && printer.toner?.black !== undefined ? (
                        <TonerBar color="black" level={printer.toner.black} label="Black" />
                    ) : (
                        <div className="text-[11px] text-slate-300 text-center py-2 flex items-center justify-center gap-2 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                            <Droplet className="w-3 h-3" /> No toner data
                        </div>
                    )}
                    {printer.type === 'COLOR' && printer.toner && (
                        <>
                            <TonerBar color="cyan" level={printer.toner.cyan} label="Cyan" />
                            <TonerBar color="magenta" level={printer.toner.magenta} label="Magenta" />
                            <TonerBar color="yellow" level={printer.toner.yellow} label="Yellow" />
                        </>
                    )}
                </div>

                {printer.last_errors && printer.last_errors.length > 0 && (
                    <div className="mb-4 bg-red-50/50 border border-red-100 p-3 rounded-2xl text-[11px] text-red-600 flex items-start gap-2 shadow-sm">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                        <ul className="space-y-1">
                            {printer.last_errors.map((err, idx) => (
                                <li key={idx} className="font-medium">• {err}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Último Check</span>
                    <span className="text-[10px] text-slate-500 font-medium">{printer.last_check || 'Sin datos'}</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onEdit(printer)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                        title="Editar"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onDelete(printer.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                        title="Eliminar"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className={`ml-1 p-2 bg-white shadow-sm border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all ${refreshing ? 'animate-spin' : ''}`}
                        title="Escanear ahora"
                    >
                        <RefreshCw className="w-4 h-4" />
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
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Impresoras</h1>
                    <p className="text-slate-500 font-medium italic">Gestión de {printers.length} dispositivos en red</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setIsDiscoveryOpen(true)}
                        className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-2xl hover:bg-slate-700 transition-all shadow-xl shadow-slate-200"
                    >
                        <Globe className="w-4 h-4 text-blue-300" />
                        <span className="font-bold text-sm">Escanear Red</span>
                    </button>
                    <button
                        onClick={() => {
                            setSelectedPrinter(null);
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="font-bold text-sm">Nueva Impresora</span>
                    </button>
                    <button
                        onClick={handleRefreshAll}
                        disabled={refreshingAll || printers.length === 0}
                        className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-2xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Actualizar todos los niveles"
                    >
                        <RefreshCw className={`w-5 h-5 ${refreshingAll ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar">
                {[
                    { id: 'all', label: 'Todos', count: printers.length },
                    { id: 'error', label: 'Con Errores', count: printers.filter(p => (p.last_errors && p.last_errors.length > 0) || (!p.last_ok && p.last_check)).length, color: 'text-red-500' },
                    {
                        id: 'low-toner', label: 'Toner Bajo', count: printers.filter(p => {
                            if (!p.toner) return false;
                            const low = (val) => val !== null && val !== undefined && val < 20;
                            return low(p.toner.black) || low(p.toner.cyan) || low(p.toner.magenta) || low(p.toner.yellow);
                        }).length, color: 'text-yellow-600'
                    }
                ].map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`px-5 py-2.5 rounded-2xl text-xs font-bold border transition-all flex items-center gap-3 whitespace-nowrap shadow-sm
                            ${filter === f.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                    >
                        {f.label}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${filter === f.id ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 font-black'}`}>
                            {f.count}
                        </span>
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-24">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
                        <Printer className="w-6 h-6 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
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
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="col-span-full py-24 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-100"
                        >
                            <Printer className="w-16 h-16 mx-auto mb-6 text-slate-100" />
                            <h3 className="text-xl font-bold text-slate-400">No hay dispositivos registrados</h3>
                            <p className="text-slate-300 text-sm mt-2 max-w-sm mx-auto">Usa los botones de arriba para registrar una impresora manual o escanear tu red local.</p>
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
