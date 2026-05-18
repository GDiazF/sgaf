import React, { useState, useEffect } from 'react';
import api from '../../api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { LayoutDashboard, Clock, CheckCircle2, AlertCircle, Percent, Timer } from 'lucide-react';

const MonitoreoKPI = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchKPI = async () => {
            try {
                const res = await api.get('ejecutivos/gestiones/kpi_dashboard/');
                setStats(res.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchKPI();
    }, []);

    if (loading) return <div className="text-slate-500 font-medium p-4">Cargando métricas...</div>;
    if (!stats) return null;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-3 mb-2">
                        <LayoutDashboard className="w-5 h-5 text-indigo-500" />
                        <h3 className="text-xs font-bold text-slate-500 uppercase">Total Gestiones</h3>
                    </div>
                    <p className="text-3xl font-black text-slate-800">{stats.totales.total}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-3 mb-2">
                        <AlertCircle className="w-5 h-5 text-rose-500" />
                        <h3 className="text-xs font-bold text-slate-500 uppercase">Pendientes</h3>
                    </div>
                    <p className="text-3xl font-black text-rose-600">{stats.totales.pendientes}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-3 mb-2">
                        <Clock className="w-5 h-5 text-amber-500" />
                        <h3 className="text-xs font-bold text-slate-500 uppercase">En Proceso</h3>
                    </div>
                    <p className="text-3xl font-black text-amber-600">{stats.totales.en_proceso}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-3 mb-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <h3 className="text-xs font-bold text-slate-500 uppercase">Cerradas</h3>
                    </div>
                    <p className="text-3xl font-black text-emerald-600">{stats.totales.cerradas}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-3 mb-2">
                        <Percent className="w-5 h-5 text-blue-500" />
                        <h3 className="text-xs font-bold text-slate-500 uppercase">Tasa Resolución</h3>
                    </div>
                    <p className="text-3xl font-black text-blue-600">{stats.tasa_resolucion}%</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-3 mb-2">
                        <Timer className="w-5 h-5 text-purple-500" />
                        <h3 className="text-xs font-bold text-slate-500 uppercase">T. Promedio Cierre</h3>
                    </div>
                    <p className="text-3xl font-black text-purple-600">{stats.tiempo_promedio} <span className="text-sm font-medium">días</span></p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wider">Tendencia de Gestiones Nuevas (Últimos 7 días)</h3>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.tendencia} margin={{ left: 0, right: 20 }}>
                                <defs>
                                    <linearGradient id="colorTendencia" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Area type="monotone" dataKey="value" stroke="#6366f1" fillOpacity={1} fill="url(#colorTendencia)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wider">Top Unidades Más Requeridas</h3>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.by_unidad} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#f1f5f9" />
                                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <YAxis dataKey="label" type="category" width={150} tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} />
                                <Bar dataKey="value" fill="#ec4899" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wider">Carga de Trabajo Activa (Pendiente + En Proceso)</h3>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.carga_activa} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#f1f5f9" />
                                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <YAxis dataKey="label" type="category" width={150} tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} />
                                <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wider">Top Establecimientos Demandantes</h3>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.by_establecimiento} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#f1f5f9" />
                                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <YAxis dataKey="label" type="category" width={150} tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} />
                                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MonitoreoKPI;
