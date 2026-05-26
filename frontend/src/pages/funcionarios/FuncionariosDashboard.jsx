import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Users, Building2, Briefcase, Layers, Plus, Loader2,
    UserCheck, UserX, ArrowRight, LayoutGrid,
} from 'lucide-react';
import api from '../../api';
import { BTN_PRIMARY, TITLE_ICON_BOX, LOADER_SPIN } from './shared/funcionariosUi';

const STRUCTURE_LINKS = [
    { to: '/funcionarios/subdirecciones', label: 'Subdirecciones', desc: 'Estructura organizacional', icon: Building2, countKey: 'subdirecciones' },
    { to: '/funcionarios/departamentos', label: 'Departamentos', desc: 'Administración de departamentos', icon: Briefcase, countKey: 'departamentos' },
    { to: '/funcionarios/unidades', label: 'Unidades', desc: 'Administración de unidades', icon: Layers, countKey: 'unidades' },
    { to: '/funcionarios/grupos', label: 'Grupos', desc: 'Equipos de trabajo', icon: Users, countKey: 'grupos' },
];

const FuncionariosDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('funcionarios/estadisticas/');
                setStats(response.data);
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const kpiCards = [
        { label: 'Nómina total', value: stats?.total || 0, icon: Users, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', valueColor: 'text-slate-800' },
        { label: 'Activos', value: stats?.activos || 0, icon: UserCheck, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', valueColor: 'text-emerald-600' },
        { label: 'Inactivos', value: stats?.inactivos || 0, icon: UserX, iconBg: 'bg-rose-50', iconColor: 'text-rose-600', valueColor: 'text-rose-600' },
        { label: 'Subdirecciones', value: stats?.subdirecciones || 0, icon: Building2, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', valueColor: 'text-blue-600' },
    ];

    if (loading) {
        return (
            <div className="flex flex-col h-[calc(100vh-170px)] items-center justify-center gap-3">
                <Loader2 className={LOADER_SPIN} />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest select-none">
                    Cargando Datos...
                </span>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden">
            <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className={TITLE_ICON_BOX}>
                        <LayoutGrid className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase select-none">
                            Portal de Funcionarios
                        </h2>
                        <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-1.5">
                            Gestión institucional y recursos humanos
                        </p>
                    </div>
                </div>
                <Link to="/funcionarios/list" className={BTN_PRIMARY}>
                    <Plus className="w-4 h-4 shrink-0" />
                    Ir a lista
                </Link>
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

            <div className="shrink-0">
                <Link
                    to="/funcionarios/list"
                    className="block bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-200/60 transition-all group"
                >
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 group-hover:scale-105 transition-transform">
                                <Users className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Directorio principal</p>
                                <p className="text-[11px] font-medium text-slate-700 uppercase tracking-tighter line-clamp-2">
                                    Gestionar funcionarios
                                </p>
                                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter mt-1 line-clamp-2">
                                    Buscar, filtrar y editar perfiles del personal
                                </p>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center shrink-0 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>
                </Link>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 shrink-0 select-none">
                    Estructura organizacional
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pb-1">
                    {STRUCTURE_LINKS.map((item) => (
                        <Link key={item.to} to={item.to} className="group">
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full hover:border-blue-200/60 transition-all">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 mb-3">
                                    <item.icon className="w-5 h-5" />
                                </div>
                                <p className="text-[11px] font-medium text-slate-700 uppercase tracking-tighter line-clamp-2">
                                    {item.label}
                                </p>
                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-1 line-clamp-2">
                                    {item.desc}
                                </p>
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                                    <span className="text-lg font-black text-slate-800 leading-none">
                                        {stats?.[item.countKey] || 0}
                                    </span>
                                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                        Ver <ArrowRight className="w-3 h-3" />
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FuncionariosDashboard;
