import React, { useState, useEffect } from 'react';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, 
    ShieldCheck, 
    Search, 
    Filter, 
    Download,
    Mail,
    Fingerprint,
    Building2,
    RefreshCw,
    AlertCircle,
    ChevronDown,
    ArrowUpDown
} from 'lucide-react';

const ConciliacionDashboard = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL'); // ALL, MATCHED, GOOGLE_ONLY, BIO_ONLY
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({ total: 0, matched: 0, googleOnly: 0, bioOnly: 0, duplicates: 0 });
    const [sortConfig, setSortConfig] = useState({ key: 'nombre_google', direction: 'asc' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await api.get('conciliacion/data/');
            const results = response.data.results;
            setData(results);
            
            // Calculate stats
            setStats({
                total: results.length,
                matched: results.filter(r => r.match_status === 'MATCHED').length,
                googleOnly: results.filter(r => r.match_status === 'GOOGLE_ONLY').length,
                bioOnly: results.filter(r => r.match_status === 'BIO_ONLY').length,
                duplicates: results.filter(r => r.is_duplicate_email || r.is_duplicate_name).length,
            });
        } catch (error) {
            console.error("Error fetching conciliacion data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedData = [...data].filter(item => {
        let matchesFilter = filter === 'ALL' || item.match_status === filter;
        if (filter === 'DUPLICATES') {
            matchesFilter = item.is_duplicate_email || item.is_duplicate_name;
        }

        const search = searchTerm.toLowerCase();
        const matchesSearch = 
            (item.nombre_google?.toLowerCase().includes(search)) ||
            (item.nombre_bio?.toLowerCase().includes(search)) ||
            (item.email_google?.toLowerCase().includes(search)) ||
            (item.rut?.toLowerCase().includes(search));
        
        return matchesFilter && matchesSearch;
    }).sort((a, b) => {
        const key = sortConfig.key;
        let valA = a[key] || '';
        let valB = b[key] || '';
        
        // Manejo especial para nombres combinados si la key es nombre_google
        if (key === 'nombre_google') {
            valA = (a.nombre_google || a.nombre_bio || '').toLowerCase();
            valB = (b.nombre_google || b.nombre_bio || '').toLowerCase();
        } else if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const getStatusBadge = (status) => {
        switch(status) {
            case 'MATCHED':
                return <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Vinculado</span>;
            case 'GOOGLE_ONLY':
                return <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-100 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" /> Solo Google</span>;
            case 'BIO_ONLY':
                return <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-100 flex items-center gap-1.5"><Fingerprint className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Solo Biométrico</span>;
            default:
                return null;
        }
    };

    const SortableHeader = ({ title, sortKey }) => (
        <th 
            className="px-4 py-3 border-r border-slate-100 text-[10px] font-black uppercase tracking-widest bg-slate-50 cursor-pointer select-none hover:bg-slate-200 transition-colors text-slate-400"
            onClick={() => handleSort(sortKey)}
        >
            <div className="flex items-center gap-1.5">
                <span>{title}</span>
                {sortConfig.key === sortKey ? (
                    sortConfig.direction === 'asc' ? <ChevronDown className="w-3.5 h-3.5 text-indigo-650" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-650 rotate-180 transition-transform" />
                ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-300" />
                )}
            </div>
        </th>
    );

    return (
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden">
            {/* Cabecera de Página Oficial */}
            <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                <div>
                    <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase">Conciliación de Sistemas</h2>
                    <div className="flex items-center gap-2 mt-1.5">
                        <p className="text-[10px] md:text-xs font-medium text-slate-505 uppercase ml-0">Cruce dinámico: Google Workspace vs Sistema Biométrico</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button 
                        onClick={fetchData}
                        disabled={loading}
                        className="h-8 w-8 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center transition active:scale-95 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 shrink-0"
                        title="Actualizar Datos"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    
                    <button className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-slate-900/10 flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        <span>Exportar Reporte</span>
                    </button>
                </div>
            </div>

            {/* Tarjetas KPI Premium */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 shrink-0">
                {[
                    { label: 'Total Registros', value: stats.total, icon: Users, color: 'text-slate-600', bg: 'bg-slate-100/60 text-slate-600' },
                    { label: 'Vinculados', value: stats.matched, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-100/60 text-emerald-700' },
                    { label: 'Solo Google', value: stats.googleOnly, icon: Mail, color: 'text-blue-600', bg: 'bg-blue-100/60 text-blue-700' },
                    { label: 'Solo Biométrico', value: stats.bioOnly, icon: Fingerprint, color: 'text-amber-600', bg: 'bg-amber-100/60 text-amber-700' },
                    { label: 'Duplicados', value: stats.duplicates, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-100/60 text-rose-700' },
                ].map((stat, idx) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={idx} 
                        className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md group"
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${stat.bg}`}>
                            <stat.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest line-clamp-1">{stat.label}</h3>
                            <p className="text-lg font-black text-slate-800 leading-none mt-1">{stat.value}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Barra de Filtros y Búsqueda */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col lg:flex-row gap-3 items-center shrink-0">
                {/* Buscador de Texto (no-global y h-10) */}
                <div className="relative flex-1 w-full shrink-0">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input 
                        type="text" 
                        placeholder="BUSCAR POR NOMBRE, EMAIL O RUT..."
                        className="no-global w-full h-10 text-[10px] font-bold bg-white border border-slate-200 pl-10 pr-4 rounded-xl outline-none focus:border-indigo-500 uppercase transition-all shadow-sm placeholder:text-slate-300"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                {/* Botones de Pestañas de Filtro */}
                <div className="flex items-center gap-1.5 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
                    {[
                        { id: 'ALL', label: 'Todos', icon: Filter },
                        { id: 'MATCHED', label: 'Vinculados', icon: ShieldCheck },
                        { id: 'GOOGLE_ONLY', label: 'Google', icon: Mail },
                        { id: 'BIO_ONLY', label: 'Biométrico', icon: Fingerprint },
                        { id: 'DUPLICATES', label: 'Duplicados', icon: AlertCircle },
                    ].map(f => (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => setFilter(f.id)}
                            className={`px-4 h-10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 shadow-sm shrink-0 ${filter === f.id ? 'bg-slate-900 text-white border border-slate-900 shadow-lg shadow-slate-900/20' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                        >
                            <f.icon className="w-3.5 h-3.5" />
                            <span>{f.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Inlay de Tabla Zero-Scroll */}
            <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-0 relative">
                <AnimatePresence>
                    {loading && (
                        <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-[999] flex items-center justify-center">
                            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                        </div>
                    )}
                </AnimatePresence>

                <div className="overflow-auto flex-1 bg-white custom-scrollbar">
                    <table className="w-full text-left border-collapse border-spacing-0">
                        <thead className="sticky top-0 z-10 shadow-sm">
                            <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-200">
                                <SortableHeader title="Identidad / RUT" sortKey="nombre_google" />
                                <SortableHeader title="Información Google" sortKey="email_google" />
                                <SortableHeader title="Información Biométrico" sortKey="area_bio" />
                                <SortableHeader title="Estado" sortKey="match_status" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <AnimatePresence>
                                {sortedData.map((item, idx) => (
                                    <motion.tr 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        key={idx} 
                                        className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 group"
                                    >
                                        {/* Celda Identidad / RUT */}
                                        <td className="px-4 py-2 border-r border-slate-50 text-[11px] font-medium text-slate-500 uppercase tracking-tighter whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-[12px] font-black text-slate-700 uppercase leading-tight line-clamp-1 flex items-center gap-1.5">
                                                    {item.nombre_google || item.nombre_bio || 'Sin Nombre'}
                                                    {item.is_duplicate_name && <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" title="Nombre duplicado" />}
                                                </span>
                                                <span className="text-[9px] font-bold text-slate-400 font-mono tracking-tighter mt-0.5">
                                                    {item.rut || 'RUT NO REGISTRADO'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Celda Información Google */}
                                        <td className="px-4 py-2 border-r border-slate-50 text-[11px] font-medium text-slate-500 uppercase tracking-tighter whitespace-nowrap">
                                            {item.email_google ? (
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-1 text-indigo-650">
                                                        <Mail className="w-3 h-3 text-indigo-500 shrink-0" />
                                                        <span className="text-[11px] font-bold lowercase tracking-normal">{item.email_google}</span>
                                                        {item.is_duplicate_email && <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" title="Correo duplicado" />}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${item.status_google === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                            {item.status_google}
                                                        </span>
                                                        <span className="text-[9px] font-medium text-slate-400 truncate max-w-[150px]">
                                                            {item.org_unit_google}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-[9px] font-black text-slate-350 uppercase tracking-widest italic">No posee cuenta</span>
                                            )}
                                        </td>

                                        {/* Celda Información Biométrico */}
                                        <td className="px-4 py-2 border-r border-slate-50 text-[11px] font-medium text-slate-500 uppercase tracking-tighter whitespace-nowrap">
                                            {item.biometrico_id ? (
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-1 text-amber-600">
                                                        <Fingerprint className="w-3 h-3 text-amber-500 shrink-0" />
                                                        <span className="text-[11px] font-bold font-mono tracking-normal">ID: {item.biometrico_id}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter truncate max-w-[150px]">
                                                            {item.area_bio || 'Sin área asignada'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-[9px] font-black text-slate-355 uppercase tracking-widest italic">No registrado</span>
                                            )}
                                        </td>

                                        {/* Celda Estado */}
                                        <td className="px-4 py-2 text-center">
                                            <div className="flex justify-center">
                                                {getStatusBadge(item.match_status)}
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                    
                    {sortedData.length === 0 && !loading && (
                        <div className="p-20 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-100">
                                <Search className="w-8 h-8 text-slate-200" />
                            </div>
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">No se encontraron registros</h3>
                            <p className="text-[10px] text-slate-300 font-bold uppercase mt-1">Intenta con otro término de búsqueda</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Leyendas al Pie de Página Estandarizadas */}
            <div className="shrink-0 flex flex-wrap gap-4 items-center justify-center bg-slate-50 border border-slate-200/60 py-2.5 px-4 rounded-xl">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
                    <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest">Match por RUT o Email</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.5)]" />
                    <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest">Existe en Google pero no en Reloj</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.5)]" />
                    <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest">Existe en Reloj pero no en Google</span>
                </div>
            </div>
        </div>
    );
};

export default ConciliacionDashboard;
