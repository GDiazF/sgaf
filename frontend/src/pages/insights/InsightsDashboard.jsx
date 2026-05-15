import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie } from 'recharts';
import { TrendingUp, Users, Building2, Landmark, Filter, RefreshCw, Calendar, ArrowRight, LayoutDashboard, History, CheckCircle2, ChevronRight, Layers, AlertCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';

const InsightsDashboard = () => {
    // Datos y Estado
    const [rankingData, setRankingData] = useState([]);
    const [rankingTitle, setRankingTitle] = useState('Resumen por Subdirección');
    const [timeData, setTimeData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState('ranking');
    const [module, setModule] = useState('reservas'); // 'reservas' o 'tickets'

    // Datos Tickets
    const [ticketStats, setTicketStats] = useState(null);

    // Listas para Filtros
    const [recursos, setRecursos] = useState([]);
    const [subs, setSubs] = useState([]);
    const [depts, setDepts] = useState([]);
    const [units, setUnits] = useState([]);

    // Filtros Seleccionados
    const [resourceType, setResourceType] = useState('');
    const [selectedRecurso, setSelectedRecurso] = useState('');
    const [selectedSub, setSelectedSub] = useState('');
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedUnit, setSelectedUnit] = useState('');

    const fetchData = async () => {
        setRefreshing(true);
        try {
            if (module === 'reservas') {
                let query = `?type=${resourceType}`;
                if (selectedRecurso) query += `&recurso_id=${selectedRecurso}`;
                if (selectedSub) query += `&subdireccion_id=${selectedSub}`;
                if (selectedDept) query += `&departamento_id=${selectedDept}`;
                if (selectedUnit) query += `&unidad_id=${selectedUnit}`;

                const [resRanking, resTime] = await Promise.all([
                    api.get(`insights/main/reservations_ranking/${query}`),
                    api.get(`insights/main/activity_time/${query}`)
                ]);

                setRankingData(resRanking.data.main_ranking);
                setRankingTitle(resRanking.data.title);
                setTimeData(resTime.data);
            } else {
                let query = `?`;
                if (selectedSub) query += `subdireccion_id=${selectedSub}&`;
                if (selectedDept) query += `departamento_id=${selectedDept}&`;
                if (selectedUnit) query += `unidad_id=${selectedUnit}`;
                const res = await api.get(`insights/main/tickets_summary/${query}`);
                setTicketStats(res.data);
            }
        } catch (error) {
            console.error('Error fetching insights:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };


    const fetchInitialData = async () => {
        try {
            const [r, s, d, u] = await Promise.all([
                api.get('reservas/recursos/'),
                api.get('subdirecciones/'),
                api.get('departamentos/'),
                api.get('unidades/')
            ]);
            setRecursos(r.data.results || r.data);
            setSubs(s.data.results || s.data);
            setDepts(d.data.results || d.data);
            setUnits(u.data.results || u.data);
        } catch (error) {
            console.error('Error fetching dynamic filters:', error);
        }
    };

    useEffect(() => { fetchInitialData(); }, []);
    useEffect(() => { fetchData(); }, [module, resourceType, selectedRecurso, selectedSub, selectedDept, selectedUnit]);

    const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4'];

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Sincronizando Indicadores...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Header y Selector de Módulo */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Panel de Inteligencia</h2>
                        <p className="text-slate-500 font-medium">Análisis profundo de la gestión por áreas</p>
                    </div>
                    
                    <div className="bg-slate-100 p-1.5 rounded-[1.5rem] flex gap-1 h-fit">
                        <button 
                            onClick={() => setModule('reservas')}
                            className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${module === 'reservas' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Reservas
                        </button>
                        <button 
                            onClick={() => setModule('tickets')}
                            className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${module === 'tickets' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Tickets
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            setSelectedSub(''); setSelectedDept(''); setSelectedUnit('');
                            setResourceType(''); setSelectedRecurso('');
                        }}
                        className="bg-white px-4 py-2 rounded-xl text-xs font-bold text-red-500 border border-red-50 hover:bg-red-50 transition-colors"
                    >
                        Limpiar Filtros
                    </button>
                    <button onClick={fetchData} className={`p-3 bg-white rounded-xl shadow-sm border border-slate-100 ${refreshing ? 'animate-spin' : ''}`}>
                        <RefreshCw className="w-5 h-5 text-indigo-600" />
                    </button>
                </div>
            </div>

            {/* BARRA DE FILTROS AVANZADA */}
            <div className="bg-white p-4 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100">
                <div className="flex flex-wrap items-center gap-4">
                    {module === 'reservas' && (
                        <>
                            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl">
                                {['', 'SALA', 'VEHICULO'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => { setResourceType(t); setSelectedRecurso(''); }}
                                        className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${resourceType === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                                    >
                                        {t || 'Todo'}
                                    </button>
                                ))}
                            </div>

                            <div className="w-px h-8 bg-slate-100 mx-2" />

                            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-transparent focus-within:border-indigo-100 transition-all">
                                <Layers className="w-4 h-4 text-slate-400" />
                                <select value={selectedRecurso} onChange={(e) => setSelectedRecurso(e.target.value)} className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 min-w-[140px] cursor-pointer">
                                    <option value="">Recurso Específico...</option>
                                    {recursos.filter(r => !resourceType || r.tipo === resourceType).map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                </select>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-200" />
                        </>
                    )}

                    <div className="flex flex-wrap items-center gap-3 flex-1">
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-transparent focus-within:border-indigo-100 transition-all">
                            <Landmark className="w-4 h-4 text-slate-400" />
                            <select value={selectedSub} onChange={(e) => { setSelectedSub(e.target.value); setSelectedDept(''); setSelectedUnit(''); }} className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 min-w-[140px] cursor-pointer">
                                <option value="">Toda la Subdirección...</option>
                                {subs.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-transparent focus-within:border-indigo-100 transition-all">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            <select value={selectedDept} onChange={(e) => { setSelectedDept(e.target.value); setSelectedUnit(''); }} className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 min-w-[140px] cursor-pointer">
                                <option value="">Todo el Depto...</option>
                                {depts.filter(d => !selectedSub || d.subdireccion === parseInt(selectedSub)).map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-transparent focus-within:border-indigo-100 transition-all">
                            <Users className="w-4 h-4 text-slate-400" />
                            <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 min-w-[140px] cursor-pointer">
                                <option value="">Toda la Unidad...</option>
                                {units.filter(u => !selectedDept || u.departamento === parseInt(selectedDept)).map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {module === 'reservas' ? (
                <>
                    <div className="flex justify-center">
                        <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 flex gap-1">
                            <button
                                onClick={() => setViewMode('ranking')}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${viewMode === 'ranking' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                Rankings de Consumo
                            </button>
                            <button
                                onClick={() => setViewMode('time')}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${viewMode === 'time' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                            >
                                <History className="w-4 h-4" />
                                Tendencia Temporal
                            </button>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {viewMode === 'ranking' ? (
                            <motion.div key="ranking" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter mb-8 flex items-center gap-3">
                                            <Landmark className="w-5 h-5 text-indigo-600" /> {rankingTitle}
                                        </h3>
                                        <div className="h-[400px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={rankingData} layout="vertical">
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                                    <XAxis type="number" hide />
                                                    <YAxis dataKey="label" type="category" axisLine={false} tickLine={false} width={140} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none' }} />
                                                    <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                                                        {rankingData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter mb-8 flex items-center gap-3">
                                            <Building2 className="w-5 h-5 text-emerald-500" /> Distribución Relativa
                                        </h3>
                                        <div className="h-[400px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={rankingData} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} label={({ name, percent }) => `${name.substring(0, 10)}... ${(percent * 100).toFixed(0)}%`}>
                                                        {rankingData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />)}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div key="time" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                                <div className="flex items-center gap-3 mb-10">
                                    <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-100">
                                        <TrendingUp className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Tendencia de Actividad</h3>
                                </div>
                                <div className="h-[450px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={timeData}>
                                            <defs><linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                                            <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)' }} />
                                            <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" animationDuration={2000} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Categorías */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <Layers className="w-4 h-4" />
                                </div>
                                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Por Categoría</h3>
                            </div>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={ticketStats?.by_category} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}>
                                            {ticketStats?.by_category?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Estados */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Estado de Solicitudes</h3>
                            </div>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={ticketStats?.by_status} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="label" tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                                        <YAxis tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                                            {ticketStats?.by_status?.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Prioridades */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                                    <AlertCircle className="w-4 h-4" />
                                </div>
                                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Nivel de Prioridad</h3>
                            </div>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={ticketStats?.by_priority} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={0} outerRadius={90}>
                                            {ticketStats?.by_priority?.map((entry, i) => (
                                                <Cell key={i} fill={entry.label === 'CRITICA' ? '#ef4444' : entry.label === 'ALTA' ? '#f97316' : entry.label === 'MEDIA' ? '#3b82f6' : '#94a3b8'} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Áreas de Demanda */}
                        <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
                                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Departamentos que más Solicitan Soporte</h3>
                            </div>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={ticketStats?.by_department} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#f1f5f9" />
                                        <XAxis type="number" tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <YAxis dataKey="label" type="category" width={180} tick={{ fontSize: 11, fontWeight: 600, fill: '#475569' }} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                        <Bar dataKey="value" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Tiempos de Resolución */}
                        <div className="lg:col-span-1 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
                                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Resolución (Horas)</h3>
                            </div>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={ticketStats?.avg_time_by_priority} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="label" tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                                        <YAxis tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} formatter={(value) => [`${value} hrs`, 'Promedio']} />
                                        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                                            {ticketStats?.avg_time_by_priority?.map((entry, i) => (
                                                <Cell key={i} fill={entry.label === 'CRITICA' ? '#ef4444' : entry.label === 'ALTA' ? '#f97316' : entry.label === 'MEDIA' ? '#3b82f6' : '#94a3b8'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default InsightsDashboard;
