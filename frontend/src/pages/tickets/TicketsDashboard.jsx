import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MessageSquare, Clock, AlertCircle, CheckCircle2, ChevronRight, User, Tag, Calendar, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

const StatusBadge = ({ status }) => {
    const config = {
        'ABIERTO': { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Abierto' },
        'EN_PROGRESO': { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'En Progreso' },
        'EN_ESPERA': { color: 'bg-slate-100 text-slate-700 border-slate-200', label: 'En Espera' },
        'RESUELTO': { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Resuelto' },
        'CERRADO': { color: 'bg-slate-400 text-white border-slate-500', label: 'Cerrado' },
    };
    const { color, label } = config[status] || { color: 'bg-slate-100 text-slate-700', label: status };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${color}`}>
            {label}
        </span>
    );
};

const PriorityBadge = ({ priority }) => {
    const config = {
        'BAJA': { color: 'text-slate-400', label: 'Baja' },
        'MEDIA': { color: 'text-blue-500', label: 'Media' },
        'ALTA': { color: 'text-orange-500', label: 'Alta' },
        'CRITICA': { color: 'text-red-600', label: 'Crítica' },
    };
    const { color, label } = config[priority] || { color: 'text-slate-400', label: priority };
    return (
        <span className={`flex items-center gap-1 text-[11px] font-bold ${color}`}>
            <AlertCircle className="w-3 h-3" />
            {label}
        </span>
    );
};

const TicketsDashboard = () => {
    const { user } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const fetchTickets = async (isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const params = {};
            if (statusFilter !== 'ALL') params.estado = statusFilter;
            if (searchTerm) params.search = searchTerm;
            
            const [ticketsRes, statsRes] = await Promise.all([
                api.get('tickets/tickets/', { params }),
                api.get('tickets/tickets/estadisticas/')
            ]);
            
            setTickets(ticketsRes.data.results || ticketsRes.data || []);
            setStats(statsRes.data);
        } catch (error) {
            console.error("Error fetching tickets:", error);
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    useEffect(() => {
        // Al cambiar filtros, si ya tenemos tickets, no mostramos el loader gigante
        fetchTickets(tickets.length === 0);
    }, [statusFilter]);

    const handleSearch = (e) => {
        if (e.key === 'Enter') fetchTickets(false);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Mesa de Ayuda</h2>
                    <p className="text-sm text-slate-500 font-medium">Gestiona tus solicitudes de soporte técnico y administrativo</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Link 
                        to="/tickets/categories" 
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 rounded-2xl font-bold shadow-sm transition-all active:scale-95"
                    >
                        <Tag className="w-5 h-5" />
                        Categorías
                    </Link>
                    <Link 
                        to="/tickets/new" 
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Crear Ticket
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Abiertos', value: stats?.abiertos || 0, color: 'text-blue-600', bg: 'bg-blue-50', icon: Clock },
                    { label: 'En Progreso', value: stats?.en_progreso || 0, color: 'text-amber-600', bg: 'bg-amber-50', icon: Activity },
                    { label: 'Resueltos', value: stats?.resueltos || 0, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
                    { label: 'Total', value: stats?.total || 0, color: 'text-slate-600', bg: 'bg-slate-100', icon: Tag },
                ].map((stat, i) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={stat.label} 
                        className={`p-4 rounded-3xl ${stat.bg} border border-white shadow-sm flex items-center gap-4`}
                    >
                        <div className={`p-3 rounded-2xl bg-white shadow-sm ${stat.color}`}>
                            <stat.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
                            <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Filters & List */}
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Buscar por folio o título..."
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-2xl text-sm transition-all outline-none font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleSearch}
                        />
                    </div>
                    
                    <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                        {['ALL', 'ABIERTO', 'EN_PROGRESO', 'RESUELTO', 'CERRADO'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${statusFilter === status ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                {status === 'ALL' ? 'Todos' : status.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-450px)] custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-100 shadow-sm">
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Ticket</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Asunto</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Categoría</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Estado / Prioridad</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Creado</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <AnimatePresence mode="wait">
                            <motion.tbody 
                                key={statusFilter + searchTerm}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="divide-y divide-slate-50"
                            >
                                {tickets.map((ticket) => (
                                    <tr 
                                        key={ticket.id} 
                                        className="group hover:bg-slate-50/80 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-indigo-600">{ticket.correlativo}</span>
                                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                    <User className="w-3 h-3" />
                                                    {ticket.creado_por_obj?.username}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="max-w-xs">
                                                <p className="text-sm font-bold text-slate-700 truncate">{ticket.titulo}</p>
                                                <p className="text-[11px] text-slate-400 truncate">{ticket.descripcion}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[11px] font-bold text-slate-600">{ticket.categoria_obj?.nombre}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-2">
                                                <StatusBadge status={ticket.estado} />
                                                <PriorityBadge priority={ticket.prioridad} />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Calendar className="w-4 h-4" />
                                                <span className="text-[11px] font-medium">{new Date(ticket.fecha_creacion).toLocaleDateString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link 
                                                to={`/tickets/${ticket.id}`}
                                                className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-lg transition-all"
                                            >
                                                <ChevronRight className="w-5 h-5" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </motion.tbody>
                        </AnimatePresence>
                    </table>
                </div>

                {tickets.length === 0 && !loading && (
                    <div className="p-20 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-4 border-2 border-white shadow-inner">
                            <MessageSquare className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">No se encontraron tickets</h3>
                        <p className="text-sm text-slate-400">Intenta cambiar los filtros o crea uno nuevo.</p>
                    </div>
                )}
                
                {loading && (
                    <div className="p-20 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="text-sm text-slate-400 mt-4 font-bold">Cargando mesa de ayuda...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TicketsDashboard;
