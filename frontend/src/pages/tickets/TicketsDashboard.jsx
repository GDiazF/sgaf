import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Clock, CheckCircle2, Tag, Activity, Eye, Loader2, FolderSearch, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api';
import { BTN_BLUE, BTN_SECONDARY, INPUT_FILTER, SELECT_FILTER, LOADER_SPIN, FOLIO_TEXT, TITLE_ICON_BOX } from './ticketsUi';

const STATUS_STYLES = {
    ABIERTO: 'bg-blue-50 text-blue-600 border-blue-100',
    EN_PROGRESO: 'bg-amber-50 text-amber-600 border-amber-100',
    EN_ESPERA: 'bg-slate-50 text-slate-600 border-slate-200',
    RESUELTO: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    CERRADO: 'bg-slate-100 text-slate-500 border-slate-200',
};

const STATUS_LABELS = {
    ABIERTO: 'Abierto',
    EN_PROGRESO: 'En Progreso',
    EN_ESPERA: 'En Espera',
    RESUELTO: 'Resuelto',
    CERRADO: 'Cerrado',
};

const PRIORITY_STYLES = {
    BAJA: 'bg-slate-50 text-slate-500 border-slate-200',
    MEDIA: 'bg-blue-50 text-blue-600 border-blue-100',
    ALTA: 'bg-amber-50 text-amber-600 border-amber-100',
    CRITICA: 'bg-rose-50 text-rose-600 border-rose-100',
};

const StatusBadge = ({ status }) => (
    <span className={`inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter rounded-lg border ${STATUS_STYLES[status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
        {STATUS_LABELS[status] || status?.replace('_', ' ')}
    </span>
);

const PriorityBadge = ({ priority }) => (
    <span className={`inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter rounded-lg border ${PRIORITY_STYLES[priority] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
        {priority || '—'}
    </span>
);

const TicketsDashboard = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const fetchTickets = async (showLoader = false) => {
        if (showLoader) setLoading(true);
        try {
            const params = {};
            if (statusFilter !== 'ALL') params.estado = statusFilter;
            if (searchTerm) params.search = searchTerm;

            const [ticketsRes, statsRes] = await Promise.all([
                api.get('tickets/tickets/', { params }),
                api.get('tickets/tickets/estadisticas/'),
            ]);

            setTickets(ticketsRes.data.results || ticketsRes.data || []);
            setStats(statsRes.data);
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets(true);
    }, [statusFilter]);

    const handleSearch = (e) => {
        if (e.key === 'Enter') fetchTickets(false);
    };

    const kpiCards = [
        { label: 'Abiertos', value: stats?.abiertos || 0, icon: Clock, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', valueColor: 'text-blue-600' },
        { label: 'En Progreso', value: stats?.en_progreso || 0, icon: Activity, iconBg: 'bg-amber-50', iconColor: 'text-amber-600', valueColor: 'text-amber-600' },
        { label: 'Resueltos', value: stats?.resueltos || 0, icon: CheckCircle2, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', valueColor: 'text-emerald-600' },
        { label: 'Total', value: stats?.total || 0, icon: Tag, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', valueColor: 'text-slate-800' },
    ];

    return (
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden">
            <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className={TITLE_ICON_BOX}>
                        <HelpCircle className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase select-none">
                            Mesa de Ayuda
                        </h2>
                        <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-1.5">
                            Gestiona solicitudes de soporte técnico y administrativo
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Link to="/tickets/categories" className={BTN_SECONDARY}>
                        Categorías
                    </Link>
                    <Link to="/tickets/new" className={BTN_BLUE}>
                        <Plus className="w-4 h-4 shrink-0" />
                        Crear Ticket
                    </Link>
                </div>
            </div>

            <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-3">
                {kpiCards.map((stat) => (
                    <div
                        key={stat.label}
                        className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 transition-all hover:shadow-md"
                    >
                        <div className={`w-12 h-12 rounded-xl ${stat.iconBg} ${stat.iconColor} flex items-center justify-center shrink-0`}>
                            <stat.icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest line-clamp-1">{stat.label}</h3>
                            <p className={`text-lg font-black leading-none mt-1 ${stat.valueColor}`}>{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="shrink-0 flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Buscar por folio o título..."
                        className={INPUT_FILTER}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleSearch}
                    />
                </div>
                <div className="relative w-full md:w-52 shrink-0">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className={SELECT_FILTER}
                    >
                        <option value="ALL">Todos los estados</option>
                        <option value="ABIERTO">Abierto</option>
                        <option value="EN_PROGRESO">En Progreso</option>
                        <option value="EN_ESPERA">En Espera</option>
                        <option value="RESUELTO">Resuelto</option>
                        <option value="CERRADO">Cerrado</option>
                    </select>
                </div>
                <button
                    type="button"
                    onClick={() => fetchTickets(false)}
                    disabled={loading}
                    className={BTN_BLUE}
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Search className="w-4 h-4 shrink-0" />}
                    Buscar
                </button>
            </div>

            <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="overflow-auto flex-1 bg-white custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-12 h-full flex-1 gap-3 min-h-[200px]">
                            <Loader2 className={LOADER_SPIN} />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest select-none">
                                Cargando Datos...
                            </span>
                        </div>
                    ) : tickets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center h-full flex-1 min-h-[200px]">
                            <FolderSearch className="w-10 h-10 text-slate-200 mb-3" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
                                No se encontraron registros
                            </span>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse border-spacing-0 min-w-[1100px]">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-200 select-none shadow-sm">
                                    <th className="px-4 py-3 align-middle border-r border-slate-100 w-28">Folio</th>
                                    <th className="px-4 py-3 align-middle border-r border-slate-100 w-36">Solicitante</th>
                                    <th className="px-4 py-3 align-middle border-r border-slate-100">Asunto</th>
                                    <th className="px-4 py-3 align-middle border-r border-slate-100 max-w-[200px]">Descripción</th>
                                    <th className="px-4 py-3 align-middle border-r border-slate-100 w-32">Categoría</th>
                                    <th className="px-4 py-3 align-middle border-r border-slate-100 text-center w-28">Estado</th>
                                    <th className="px-4 py-3 align-middle border-r border-slate-100 text-center w-24">Prioridad</th>
                                    <th className="px-4 py-3 align-middle border-r border-slate-100 w-28">Creado</th>
                                    <th className="px-4 py-3 align-middle text-center w-16">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {tickets.map((ticket) => (
                                    <tr key={ticket.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-4 py-3 align-middle border-r border-slate-50 whitespace-nowrap">
                                            <span className={FOLIO_TEXT}>
                                                {ticket.correlativo}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 align-middle border-r border-slate-50">
                                            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-tighter line-clamp-2 block">
                                                {ticket.creado_por_obj?.username || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 align-middle border-r border-slate-50 max-w-[200px]">
                                            <span className="text-[11px] font-medium text-slate-700 uppercase tracking-tighter line-clamp-2 block">
                                                {ticket.titulo}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 align-middle border-r border-slate-50 max-w-[220px]">
                                            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-tighter line-clamp-2 block">
                                                {ticket.descripcion || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 align-middle border-r border-slate-50">
                                            <span className="text-[11px] font-medium text-slate-600 uppercase tracking-tighter line-clamp-2 block">
                                                {ticket.categoria_obj?.nombre || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 align-middle border-r border-slate-50 text-center">
                                            <StatusBadge status={ticket.estado} />
                                        </td>
                                        <td className="px-4 py-3 align-middle border-r border-slate-50 text-center">
                                            <PriorityBadge priority={ticket.prioridad} />
                                        </td>
                                        <td className="px-4 py-3 align-middle border-r border-slate-50 whitespace-nowrap">
                                            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-tighter">
                                                {new Date(ticket.fecha_creacion).toLocaleDateString('es-CL')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 align-middle text-center">
                                            <Link
                                                to={`/tickets/${ticket.id}`}
                                                className="inline-flex p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Ver detalle"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                {!loading && (
                    <div className="p-3 bg-slate-50 border-t border-slate-200 shrink-0">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest select-none">
                            Mostrando {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TicketsDashboard;
