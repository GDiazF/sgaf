import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Building2, Briefcase, Layers, TrendingUp, ArrowRight, Plus, Activity, UserCheck, UserX } from 'lucide-react';
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
            const response = await api.get('funcionarios/estadisticas/');
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: 'spring', stiffness: 100 }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-4 border-slate-200"></div>
                    <div className="w-12 h-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin absolute top-0 left-0"></div>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            className="flex flex-col gap-8 pb-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <div className="flex justify-between items-end border-b border-slate-200/60 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Portal de Personal</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Gestión Institucional y Recursos Humanos
                    </p>
                </div>
                <Link
                    to="/funcionarios/list"
                    className="group relative inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white text-sm font-semibold rounded-xl overflow-hidden transition-all hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 active:scale-95"
                >
                    <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                    <span>Ir a Lista</span>
                </Link>
            </div>

            {/* Top Section: Overview & Main Action */}
            <div className="grid grid-cols-12 gap-8">
                {/* Stats Card */}
                <div className="col-span-12 lg:col-span-4">
                    <motion.div
                        variants={itemVariants}
                        className="h-full bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-500/20 group flex flex-col justify-between"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                            <Users className="w-32 h-32 transform rotate-12 translate-x-8 -translate-y-8" />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-2 text-indigo-200 mb-2">
                                <Activity className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-widest">Nómina Total</span>
                            </div>
                            <div className="text-6xl font-black tracking-tighter mb-8">
                                {stats?.total || 0}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
                                    <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase mb-1">
                                        <UserCheck className="w-3 h-3" /> Activos
                                    </div>
                                    <div className="text-2xl font-bold">{stats?.activos || 0}</div>
                                </div>
                                <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/5">
                                    <div className="flex items-center gap-2 text-rose-300 text-xs font-bold uppercase mb-1">
                                        <UserX className="w-3 h-3" /> Inactivos
                                    </div>
                                    <div className="text-2xl font-bold text-white/80">{stats?.inactivos || 0}</div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Main Action / Directory Card */}
                <div className="col-span-12 lg:col-span-8">
                    <motion.div variants={itemVariants} className="h-full">
                        <Link to="/funcionarios/list" className="block group h-full">
                            <div className="h-full bg-white rounded-[2rem] p-10 border border-slate-100 shadow-md hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 relative overflow-hidden flex flex-col justify-center">
                                <div className="absolute inset-0 bg-gradient-to-r from-slate-50 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="relative flex justify-between items-center z-10">
                                    <div className="max-w-xl">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider mb-4">
                                            <Briefcase className="w-3 h-3" />
                                            Directorio Principal
                                        </div>
                                        <h2 className="text-4xl font-bold text-slate-900 mb-4 group-hover:text-indigo-600 transition-colors">
                                            Gestionar Funcionarios
                                        </h2>
                                        <p className="text-slate-500 text-lg leading-relaxed">
                                            Accede al listado completo de personal. Aquí podrás buscar, filtrar, editar perfiles y gestionar toda la información contractual de manera centralizada.
                                        </p>
                                    </div>
                                    <div className="hidden lg:flex w-24 h-24 rounded-3xl bg-indigo-50 items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 text-indigo-600 shadow-sm">
                                        <ArrowRight className="w-8 h-8" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                </div>
            </div>

            {/* Bottom Section: Structure Cards Ordered & Aligned */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <Link to="/funcionarios/subdirecciones" className="group">
                    <motion.div
                        variants={itemVariants}
                        whileHover={{ y: -5 }}
                        className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-violet-200/50 transition-all h-full relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-16 h-16 bg-violet-50 rounded-bl-[2rem] transition-colors group-hover:bg-violet-100"></div>
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4 group-hover:bg-violet-600 group-hover:text-white transition-all shadow-sm">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 mb-1">Subdirecciones</h4>
                            <p className="text-xs text-slate-500 mb-4 font-medium italic">Estructura Estratégica</p>
                            <div className="flex items-center justify-between mt-auto">
                                <span className="text-3xl font-black text-slate-800 tracking-tight">{stats?.subdirecciones || 0}</span>
                                <div className="flex items-center gap-1.5 text-violet-600 text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0">
                                    Ver <ArrowRight className="w-3 h-3" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </Link>

                <Link to="/funcionarios/departamentos" className="group">
                    <motion.div
                        variants={itemVariants}
                        whileHover={{ y: -5 }}
                        className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-200/50 transition-all h-full relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-[2rem] transition-colors group-hover:bg-blue-100"></div>
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                <Briefcase className="w-6 h-6" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 mb-1">Departamentos</h4>
                            <p className="text-xs text-slate-500 mb-4 font-medium italic">Gestión Táctica</p>
                            <div className="flex items-center justify-between mt-auto">
                                <span className="text-3xl font-black text-slate-800 tracking-tight">{stats?.departamentos || 0}</span>
                                <div className="flex items-center gap-1.5 text-blue-600 text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0">
                                    Ver <ArrowRight className="w-3 h-3" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </Link>

                <Link to="/funcionarios/unidades" className="group">
                    <motion.div
                        variants={itemVariants}
                        whileHover={{ y: -5 }}
                        className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-amber-200/50 transition-all h-full relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-bl-[2rem] transition-colors group-hover:bg-amber-100"></div>
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-sm">
                                <Layers className="w-6 h-6" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 mb-1">Unidades</h4>
                            <p className="text-xs text-slate-500 mb-4 font-medium italic">Nivel Operativo</p>
                            <div className="flex items-center justify-between mt-auto">
                                <span className="text-3xl font-black text-slate-800 tracking-tight">{stats?.unidades || 0}</span>
                                <div className="flex items-center gap-1.5 text-amber-600 text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0">
                                    Ver <ArrowRight className="w-3 h-3" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </Link>

                <Link to="/funcionarios/grupos" className="group">
                    <motion.div
                        variants={itemVariants}
                        whileHover={{ y: -5 }}
                        className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-orange-200/50 transition-all h-full relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-16 h-16 bg-orange-50 rounded-bl-[2rem] transition-colors group-hover:bg-orange-100"></div>
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4 group-hover:bg-orange-600 group-hover:text-white transition-all shadow-sm">
                                <Users className="w-6 h-6" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 mb-1">Grupos</h4>
                            <p className="text-xs text-slate-500 mb-4 font-medium italic">Firmas y Organización</p>
                            <div className="flex items-center justify-between mt-auto">
                                <span className="text-3xl font-black text-slate-800 tracking-tight">{stats?.grupos || 0}</span>
                                <div className="flex items-center gap-1.5 text-orange-600 text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0">
                                    Ver <ArrowRight className="w-3 h-3" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </Link>
            </div>
        </motion.div>
    );
};

export default FuncionariosDashboard;
