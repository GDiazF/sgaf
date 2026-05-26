import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie } from 'recharts';
import { TrendingUp, Users, Building2, Landmark, RefreshCw, Layers, AlertCircle, Clock, CheckCircle2, LayoutDashboard, History, ChevronDown } from 'lucide-react';
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
        // Creamos una promesa de 600ms para asegurar un feedback visual agradable al usuario
        const delayPromise = new Promise(resolve => setTimeout(resolve, 600));
        
        try {
            if (module === 'reservas') {
                let query = `?type=${resourceType}`;
                if (selectedRecurso) query += `&recurso_id=${selectedRecurso}`;
                if (selectedSub) query += `&subdireccion_id=${selectedSub}`;
                if (selectedDept) query += `&departamento_id=${selectedDept}`;
                if (selectedUnit) query += `&unidad_id=${selectedUnit}`;

                const [resRanking, resTime] = await Promise.all([
                    api.get('insights/main/reservations_ranking/' + query),
                    api.get('insights/main/activity_time/' + query),
                    delayPromise // Espera en paralelo el retardo visual mínimo
                ]);

                setRankingData(resRanking.data.main_ranking);
                setRankingTitle(resRanking.data.title);
                setTimeData(resTime.data);
            } else {
                let query = `?`;
                if (selectedSub) query += `subdireccion_id=${selectedSub}&`;
                if (selectedDept) query += `departamento_id=${selectedDept}&`;
                if (selectedUnit) query += `unidad_id=${selectedUnit}`;
                
                const [res] = await Promise.all([
                    api.get('insights/main/tickets_summary/' + query),
                    delayPromise // Espera en paralelo el retardo visual mínimo
                ]);
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

    // Recarga todo en paralelo (catálogos de filtros + métricas de gráficos)
    const handleReloadAll = async () => {
        setRefreshing(true);
        const delayPromise = new Promise(resolve => setTimeout(resolve, 600));
        try {
            await Promise.all([
                fetchInitialData(),
                fetchData(),
                delayPromise
            ]);
        } catch (error) {
            console.error('Error reloading all data:', error);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchInitialData(); }, []);
    useEffect(() => { fetchData(); }, [module, resourceType, selectedRecurso, selectedSub, selectedDept, selectedUnit]);

    const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4'];

    // pl-9 (36px) proporciona un gap perfecto y elegante de 8px desde el borde derecho del icono (en 28px)
    const SELECT_CLASSES = "bg-transparent border-none outline-none text-xs font-semibold text-slate-700 w-full cursor-pointer appearance-none no-global h-full py-0 pl-9 pr-7";

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-150px)] items-center justify-center bg-white rounded-2xl border border-slate-200 m-2 lg:m-3">
                <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Sincronizando Indicadores...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-150px)] overflow-hidden m-2 lg:m-3 gap-4">
            {/* Header y Selector de Módulo */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 lg:px-6 lg:py-4 rounded-2xl border border-slate-200 shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Panel de Inteligencia</h2>
                        <p className="text-slate-500 text-[10px] font-medium mt-0.5">Análisis profundo de la gestión por áreas</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="bg-slate-100 p-1 rounded-xl flex gap-1 h-9 items-center shrink-0">
                        <button 
                            onClick={() => setModule('reservas')}
                            className={`px-4 h-7 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${module === 'reservas' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Reservas
                        </button>
                        <button 
                            onClick={() => setModule('tickets')}
                            className={`px-4 h-7 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${module === 'tickets' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Tickets
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            setSelectedSub(''); setSelectedDept(''); setSelectedUnit('');
                            setResourceType(''); setSelectedRecurso('');
                        }}
                        className="h-9 px-4 rounded-xl text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-colors shrink-0"
                    >
                        Limpiar Filtros
                    </button>

                    {/* Llama a handleReloadAll para una actualización integral y visible */}
                    <button 
                        onClick={handleReloadAll} 
                        className={`h-9 w-9 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center transition active:scale-95 shrink-0`}
                    >
                        <RefreshCw className={`w-4 h-4 text-slate-500 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
                    </button>
                </div>
            </div>

            {/* BARRA DE FILTROS AVANZADA */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm shrink-0">
                <div className="flex flex-wrap items-center gap-4">
                    {module === 'reservas' && (
                        <>
                            {/* Selector de Vista (Rankings / Tendencia) */}
                            <div className="bg-slate-100 p-1 rounded-xl flex gap-1 h-9 items-center shrink-0">
                                <button
                                    onClick={() => setViewMode('ranking')}
                                    className={`flex items-center gap-1.5 px-3 h-7 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${viewMode === 'ranking' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <LayoutDashboard className="w-3.5 h-3.5" />
                                    Rankings
                                </button>
                                <button
                                    onClick={() => setViewMode('time')}
                                    className={`flex items-center gap-1.5 px-3 h-7 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${viewMode === 'time' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <History className="w-3.5 h-3.5" />
                                    Tendencias
                                </button>
                            </div>

                            <div className="w-px h-6 bg-slate-200 mx-1 shrink-0" />

                            {/* Selector de Tipo de Recurso */}
                            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl shrink-0 h-9">
                                {['', 'SALA', 'VEHICULO'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => { setResourceType(t); setSelectedRecurso(''); }}
                                        className={`px-3 h-7 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${resourceType === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        {t || 'Todo'}
                                    </button>
                                ))}
                            </div>

                            <div className="w-px h-6 bg-slate-200 mx-1 shrink-0" />

                            {/* Recurso Específico */}
                            <div className="relative flex items-center bg-slate-50 h-9 rounded-xl border border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all w-48 shrink-0">
                                <Layers className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                                <select 
                                    value={selectedRecurso} 
                                    onChange={(e) => setSelectedRecurso(e.target.value)} 
                                    className={SELECT_CLASSES}
                                >
                                    <option value="">Recurso Específico...</option>
                                    {recursos.filter(r => !resourceType || r.tipo === resourceType).map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                </select>
                                <ChevronDown className="absolute right-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                            </div>
                        </>
                    )}

                    {/* Organizaciones (Subdirección, Departamento, Unidad) */}
                    <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[200px]">
                        <div className="relative flex items-center bg-slate-50 h-9 rounded-xl border border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all flex-1 min-w-[180px]">
                            <Landmark className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                            <select 
                                value={selectedSub} 
                                onChange={(e) => { setSelectedSub(e.target.value); setSelectedDept(''); setSelectedUnit(''); }} 
                                className={SELECT_CLASSES}
                            >
                                <option value="">Toda la Subdirección...</option>
                                {subs.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                            <ChevronDown className="absolute right-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        </div>

                        <div className="relative flex items-center bg-slate-50 h-9 rounded-xl border border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all flex-1 min-w-[180px]">
                            <Building2 className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                            <select 
                                value={selectedDept} 
                                onChange={(e) => { setSelectedDept(e.target.value); setSelectedUnit(''); }} 
                                className={SELECT_CLASSES}
                            >
                                <option value="">Todo el Depto...</option>
                                {depts.filter(d => !selectedSub || d.subdireccion === parseInt(selectedSub)).map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                            </select>
                            <ChevronDown className="absolute right-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        </div>

                        <div className="relative flex items-center bg-slate-50 h-9 rounded-xl border border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all flex-1 min-w-[180px]">
                            <Users className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                            <select 
                                value={selectedUnit} 
                                onChange={(e) => setSelectedUnit(e.target.value)} 
                                className={SELECT_CLASSES}
                            >
                                <option value="">Toda la Unidad...</option>
                                {units.filter(u => !selectedDept || u.departamento === parseInt(selectedDept)).map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                            </select>
                            <ChevronDown className="absolute right-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            {/* VISTA Y CHARTS (SCROLL AISLADO) */}
            <div className="flex-1 overflow-auto custom-scrollbar bg-slate-50 rounded-2xl border border-slate-200 p-4 min-h-0 flex flex-col gap-4">
                {module === 'reservas' ? (
                    <AnimatePresence mode="wait">
                        {viewMode === 'ranking' ? (
                            <motion.div key="ranking" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[400px]">
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2.5">
                                        <Landmark className="w-4 h-4 text-indigo-500" /> {rankingTitle}
                                    </h3>
                                    <div className="flex-1 min-h-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={rankingData} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="label" type="category" axisLine={false} tickLine={false} width={130} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} />
                                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                                                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
                                                    {rankingData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[400px]">
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2.5">
                                        <Building2 className="w-4 h-4 text-emerald-500" /> Distribución Relativa
                                    </h3>
                                    <div className="flex-1 min-h-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={rankingData} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} label={({ name, percent }) => `${name.substring(0, 10)}... ${(percent * 100).toFixed(0)}%`}>
                                                    {rankingData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div key="time" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-[400px]">
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                                    <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
                                        <TrendingUp className="w-4 h-4" />
                                    </div>
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Tendencia de Actividad</h3>
                                </div>
                                <div className="flex-1 min-h-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={timeData}>
                                            <defs><linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} dy={8} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} />
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }} />
                                            <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" animationDuration={1000} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                ) : (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Categorías */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[300px]">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                        <Layers className="w-3.5 h-3.5" />
                                    </div>
                                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Por Categoría</h3>
                                </div>
                                <div className="flex-1 min-h-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={ticketStats?.by_category} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2} label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}>
                                                {ticketStats?.by_category?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Estados */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[300px]">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                    </div>
                                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estado de Solicitudes</h3>
                                </div>
                                <div className="flex-1 min-h-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={ticketStats?.by_status} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="label" tick={{ fontSize: 9, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} dy={8} />
                                            <YAxis tick={{ fontSize: 9, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                                            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={32}>
                                                {ticketStats?.by_status?.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Prioridades */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[300px]">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                    </div>
                                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nivel de Prioridad</h3>
                                </div>
                                <div className="flex-1 min-h-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={ticketStats?.by_priority} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={0} outerRadius={75}>
                                                {ticketStats?.by_priority?.map((entry, i) => (
                                                    <Cell key={i} fill={entry.label === 'CRITICA' ? '#ef4444' : entry.label === 'ALTA' ? '#f97316' : entry.label === 'MEDIA' ? '#3b82f6' : '#94a3b8'} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* Áreas de Demanda */}
                            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[380px]">
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                        <Building2 className="w-4 h-4" />
                                    </div>
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Departamentos con mayor Demanda</h3>
                                </div>
                                <div className="flex-1 min-h-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={ticketStats?.by_department} layout="vertical" margin={{ left: 10 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#f1f5f9" />
                                            <XAxis type="number" tick={{ fontSize: 9, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                            <YAxis dataKey="label" type="category" width={160} tick={{ fontSize: 10, fontWeight: 600, fill: '#475569' }} axisLine={false} tickLine={false} />
                                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                                            <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={16} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Tiempos de Resolución */}
                            <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[380px]">
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Resolución Promedio (Horas)</h3>
                                </div>
                                <div className="flex-1 min-h-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={ticketStats?.avg_time_by_priority} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="label" tick={{ fontSize: 9, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} dy={8} />
                                            <YAxis tick={{ fontSize: 9, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} formatter={(value) => [`${value} hrs`, 'Promedio']} />
                                            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={32}>
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
        </div>
    );
};

export default InsightsDashboard;
