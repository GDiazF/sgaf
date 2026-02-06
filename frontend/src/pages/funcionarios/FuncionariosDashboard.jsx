import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCheck, UserX, Building2, Phone, Briefcase, Layers, TrendingUp, ChevronRight, Plus, Key, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../api';

const FuncionariosDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const [funcionariosRes, subdireccionesRes, departamentosRes, unidadesRes, estadisticasRes] = await Promise.all([
                api.get('funcionarios/'),
                api.get('subdirecciones/'),
                api.get('departamentos/'),
                api.get('unidades/'),
                api.get('funcionarios/estadisticas/')
            ]);

            setStats({
                funcionarios: funcionariosRes.data.length,
                subdirecciones: subdireccionesRes.data.length,
                departamentos: departamentosRes.data.length,
                unidades: unidadesRes.data.length,
                estadisticas: estadisticasRes.data
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const cards = [
        {
            title: 'Funcionarios',
            value: stats?.estadisticas?.total || 0,
            icon: Users,
            color: 'blue',
            link: '/funcionarios/list',
            description: `${stats?.estadisticas?.activos || 0} activos`
        },
        {
            title: 'Subdirecciones',
            value: stats?.subdirecciones || 0,
            icon: Building2,
            color: 'purple',
            link: '/funcionarios/subdirecciones',
            description: 'Nivel superior'
        },
        {
            title: 'Departamentos',
            value: stats?.departamentos || 0,
            icon: Briefcase,
            color: 'green',
            link: '/funcionarios/departamentos',
            description: 'Por subdirección'
        },
        {
            title: 'Unidades',
            value: stats?.unidades || 0,
            icon: Layers,
            color: 'orange',
            link: '/funcionarios/unidades',
            description: 'Por departamento'
        }
    ];

    const colorClasses = {
        blue: 'bg-blue-500',
        purple: 'bg-purple-500',
        green: 'bg-green-500',
        orange: 'bg-orange-500'
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 pb-8">
            {/* Header Ultra-Limpio */}
            <div className="flex justify-between items-end border-b border-gray-100 pb-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight italic">Portal de Personal</h1>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mt-1">SGAF / Gestión Institucional</p>
                </div>
                <Link
                    to="/funcionarios/new"
                    className="bg-slate-900 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-xl shadow-slate-900/10 transition-all flex items-center gap-2 group"
                >
                    <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                    Nuevo Registro
                </Link>
            </div>

            {/* Layout Principal Mejorado */}
            <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">

                {/* Columna Izquierda: Data & Analytics (Alta Densidad) */}
                <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 min-h-0">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                        <div className="relative z-10">
                            <p className="text-blue-300 text-[10px] font-bold uppercase tracking-widest">Nómina Total</p>
                            <h2 className="text-5xl font-black text-white mt-1 tabular-nums">{stats?.estadisticas?.total || 0}</h2>
                            <div className="mt-4 flex flex-col gap-2">
                                <div className="flex justify-between items-center text-[11px] text-slate-400">
                                    <span>Activos</span>
                                    <span className="text-emerald-400 font-bold">{stats?.estadisticas?.activos || 0}</span>
                                </div>
                                <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-400 transition-all duration-1000"
                                        style={{ width: `${(stats?.estadisticas?.activos / stats?.estadisticas?.total) * 100 || 0}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
                                    <span>Bajas</span>
                                    <span className="text-rose-400 font-bold">{stats?.estadisticas?.inactivos || 0}</span>
                                </div>
                            </div>
                        </div>
                        <Users className="w-32 h-32 text-white/5 absolute -right-8 -top-8 group-hover:rotate-12 transition-transform duration-700" />
                    </div>

                    <div className="bg-white/50 backdrop-blur-sm border border-slate-100 rounded-[2rem] p-6 flex flex-col">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-blue-500" />
                            Distribución por Entidad
                        </h3>
                        <div className="space-y-4">
                            {stats?.estadisticas?.por_subdireccion && Object.entries(stats.estadisticas.por_subdireccion).map(([nombre, cantidad]) => (
                                <div key={nombre} className="group relative">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[11px] font-bold text-slate-600 truncate max-w-[80%] uppercase tracking-tight">{nombre}</span>
                                        <span className="text-xs font-black text-slate-900">{cantidad}</span>
                                    </div>
                                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-slate-300 group-hover:bg-blue-500 transition-all"
                                            style={{ width: `${(cantidad / stats?.estadisticas?.total) * 100 || 0}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                            {(!stats?.estadisticas?.por_subdireccion || Object.keys(stats.estadisticas.por_subdireccion).length === 0) && (
                                <p className="text-[10px] text-slate-400 text-center py-4 italic">No hay datos de distribución</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: Navigation Hub */}
                <div className="col-span-12 lg:col-span-9 flex flex-col gap-6">

                    {/* Tarjeta Principal "Hero" - Más Esbelta */}
                    <Link to="/funcionarios/list" className="group">
                        <div className="bg-white border-2 border-slate-50 rounded-[2rem] p-6 h-40 flex items-center justify-between shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-500 relative overflow-hidden">
                            <div className="relative z-10">
                                <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Portal Principal</span>
                                <h2 className="text-3xl font-black text-slate-900 mt-1">Gestión de Personal</h2>
                                <p className="text-slate-500 text-xs mt-0.5 max-w-md line-clamp-1">Nómina completa, búsquedas avanzadas y perfiles individuales.</p>
                                <div className="mt-2 flex items-center gap-2 text-blue-600 text-xs font-bold group-hover:gap-3 transition-all">
                                    Abrir Catálogo <ArrowRight className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="w-24 h-24 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                <Users className="w-12 h-12 text-blue-600" />
                            </div>
                        </div>
                    </Link>

                    {/* Estructura - Mini Cards Compactas */}
                    <div className="grid grid-cols-3 gap-4">
                        <Link to="/funcionarios/subdirecciones" className="group">
                            <div className="bg-slate-50 rounded-[1.5rem] p-4 h-28 flex flex-col justify-between hover:bg-purple-600 transition-all duration-500 group">
                                <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-purple-600 group-hover:bg-white/20 group-hover:text-white transition-colors">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-sm font-black text-slate-900 group-hover:text-white transition-colors leading-tight truncate">Sub-Direcciones</h4>
                                    <p className="text-[10px] text-slate-500 group-hover:text-purple-100 mt-1 font-bold uppercase tracking-tight">{stats?.subdirecciones || 0} Registros</p>
                                </div>
                            </div>
                        </Link>

                        <Link to="/funcionarios/departamentos" className="group">
                            <div className="bg-slate-50 rounded-[1.5rem] p-4 h-28 flex flex-col justify-between hover:bg-emerald-600 transition-all duration-500 group">
                                <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-emerald-600 group-hover:bg-white/20 group-hover:text-white transition-colors">
                                    <Briefcase className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-sm font-black text-slate-900 group-hover:text-white transition-colors leading-tight truncate">Departamentos</h4>
                                    <p className="text-[10px] text-slate-500 group-hover:text-emerald-100 mt-1 font-bold uppercase tracking-tight">{stats?.departamentos || 0} Registros</p>
                                </div>
                            </div>
                        </Link>

                        <Link to="/funcionarios/unidades" className="group">
                            <div className="bg-slate-50 rounded-[1.5rem] p-4 h-28 flex flex-col justify-between hover:bg-orange-500 transition-all duration-500 group">
                                <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-orange-500 group-hover:bg-white/20 group-hover:text-white transition-colors">
                                    <Layers className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-sm font-black text-slate-900 group-hover:text-white transition-colors leading-tight truncate">Unidades Técnicas</h4>
                                    <p className="text-[10px] text-slate-500 group-hover:text-orange-100 mt-1 font-bold uppercase tracking-tight">{stats?.unidades || 0} Registros</p>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FuncionariosDashboard;
