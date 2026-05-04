import React, { useState, useEffect } from 'react';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, 
    ShieldCheck, 
    ShieldAlert, 
    UserMinus, 
    Search, 
    Filter, 
    FileText, 
    Download,
    Mail,
    Fingerprint,
    Building2,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    ChevronRight
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
            const backendStats = response.data.stats;
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

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <ChevronRight className="w-3 h-3 rotate-90 opacity-20" />;
        return sortConfig.direction === 'asc' ? <ChevronDown className="w-3 h-3 text-blue-600" /> : <ChevronDown className="w-3 h-3 text-blue-600 rotate-180" />;
    };

    const getStatusBadge = (status) => {
        switch(status) {
            case 'MATCHED':
                return <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> Vinculado</span>;
            case 'GOOGLE_ONLY':
                return <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-100 flex items-center gap-1.5"><Mail className="w-3 h-3" /> Solo Google</span>;
            case 'BIO_ONLY':
                return <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-100 flex items-center gap-1.5"><Fingerprint className="w-3 h-3" /> Solo Biométrico</span>;
            default:
                return null;
        }
    };

    return (
        <div className="h-[calc(100vh-73px)] flex flex-col bg-slate-50 overflow-hidden">
            <div className="p-4 md:px-6 md:pt-6 flex flex-col gap-6 overflow-hidden h-full">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
                            <RefreshCw className={`w-8 h-8 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
                            Conciliación de Sistemas
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 ml-11">
                            Cruce dinámico: Google Workspace vs Sistema Biométrico
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={fetchData}
                            className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button className="bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-lg shadow-slate-900/10 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95">
                            <Download className="w-4 h-4" /> Exportar Reporte
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 flex-shrink-0">
                    {[
                        { label: 'Total Registros', value: stats.total, icon: Users, color: 'text-slate-600', bg: 'bg-white', border: 'border-slate-100' },
                        { label: 'Vinculados', value: stats.matched, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50/50', border: 'border-emerald-100' },
                        { label: 'Solo Google', value: stats.googleOnly, icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50/50', border: 'border-blue-100' },
                        { label: 'Solo Biométrico', value: stats.bioOnly, icon: Fingerprint, color: 'text-amber-600', bg: 'bg-amber-50/50', border: 'border-amber-100' },
                        { label: 'Duplicados', value: stats.duplicates, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50/50', border: 'border-rose-100' },
                    ].map((stat, idx) => (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            key={idx} 
                            className={`${stat.bg} p-4 rounded-3xl border ${stat.border} shadow-sm`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                <span className={`text-xl font-black ${stat.color} tracking-tighter`}>{stat.value}</span>
                            </div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Filter & Search Bar */}
                <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center flex-shrink-0">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                            type="text" 
                            placeholder="BUSCAR POR NOMBRE, EMAIL O RUT..."
                            className="w-full !pl-12 !pr-4 py-3 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-slate-900 rounded-2xl outline-none transition-all text-xs font-bold uppercase tracking-tight"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                        {[
                            { id: 'ALL', label: 'Todos', icon: Filter },
                            { id: 'MATCHED', label: 'Vinculados', icon: ShieldCheck },
                            { id: 'GOOGLE_ONLY', label: 'Google', icon: Mail },
                            { id: 'BIO_ONLY', label: 'Biométrico', icon: Fingerprint },
                            { id: 'DUPLICATES', label: 'Duplicados', icon: AlertCircle },
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setFilter(f.id)}
                                className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${filter === f.id ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                            >
                                <f.icon className="w-3 h-3" /> {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Table Area - This one scrolls */}
                <div className="flex-1 overflow-hidden bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col mb-4">
                    <div className="overflow-auto flex-1 sidebar-scrollbar relative">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10 bg-white">
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th 
                                        className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors"
                                        onClick={() => handleSort('nombre_google')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Identidad / RUT {getSortIcon('nombre_google')}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors"
                                        onClick={() => handleSort('email_google')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Información Google {getSortIcon('email_google')}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors"
                                        onClick={() => handleSort('area_bio')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Información Biométrico {getSortIcon('area_bio')}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center cursor-pointer hover:bg-slate-100 transition-colors"
                                        onClick={() => handleSort('match_status')}
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            Estado {getSortIcon('match_status')}
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                        <tbody className="divide-y divide-slate-50">
                            <AnimatePresence>
                                {sortedData.map((item, idx) => (
                                    <motion.tr 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        key={idx} 
                                        className="hover:bg-slate-50/50 transition-colors group"
                                    >
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-700 tracking-tight leading-none mb-1 flex items-center gap-2">
                                                    {item.nombre_google || item.nombre_bio || 'Sin Nombre'}
                                                    {item.is_duplicate_name && <AlertCircle className="w-4 h-4 text-rose-500 animate-pulse" title="Nombre duplicado" />}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter">
                                                    {item.rut || 'RUT NO REGISTRADO'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            {item.email_google ? (
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5 text-blue-600">
                                                        <Mail className="w-3 h-3" />
                                                        <span className="text-[11px] font-bold lowercase">{item.email_google}</span>
                                                        {item.is_duplicate_email && <AlertCircle className="w-3 h-3 text-rose-500" title="Correo duplicado" />}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${item.status_google === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                            {item.status_google}
                                                        </span>
                                                        <span className="text-[9px] font-medium text-slate-400 truncate max-w-[150px]">
                                                            {item.org_unit_google}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter italic">No posee cuenta</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5">
                                            {item.biometrico_id ? (
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5 text-amber-600">
                                                        <Fingerprint className="w-3 h-3" />
                                                        <span className="text-[11px] font-bold font-mono">ID: {item.biometrico_id}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Building2 className="w-3 h-3 text-slate-400" />
                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter truncate max-w-[150px]">
                                                            {item.area_bio || 'Sin área asignada'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter italic">No registrado</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5">
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

            {/* Legend / Info */}
            <div className="flex flex-wrap gap-4 items-center justify-center flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Match por RUT o Email</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Existe en Google pero no en Reloj</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Existe en Reloj pero no en Google</span>
                </div>
            </div>
        </div>
    </div>
    );
};

export default ConciliacionDashboard;
