import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Fuel, DollarSign, Activity, TrendingUp, Plus, ChevronRight, X, Save, Download, Calculator, Car, Trash2, Pencil, Sigma } from 'lucide-react';
import api from '../../api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { usePermission } from '../../hooks/usePermission';

const VehiculosDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState(new Date().getFullYear());
    const [registros, setRegistros] = useState([]);
    const [flota, setFlota] = useState([]);
    const [viewMode, setViewMode] = useState('individual'); // 'individual' or 'general'
    const [selectedVehicles, setSelectedVehicles] = useState([]); // Array of IDs for filtering/export
    const { can } = usePermission();

    // Modal State
    const [isModalOpen, setModalOpen] = useState(false);
    const [isFlotaModalOpen, setFlotaModalOpen] = useState(false);
    const [isExportModalOpen, setExportModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [formData, setFormData] = useState({
        anio: new Date().getFullYear(),
        mes: new Date().getMonth() + 1,
        vehiculo: '',
        kilometros_recorridos: '',
        km_inicial: '',
        km_final: '',
        gasto_bencina: '',
        gasto_peajes: '',
        gasto_seguros: ''
    });

    // Flota Form State
    const [flotaFormData, setFlotaFormData] = useState({ marca: '', modelo: '', patente: '' });
    const [submitting, setSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    // Aggregator Sub-Modal State
    const [isAggregatorOpen, setAggregatorOpen] = useState(false);
    const [aggregatorField, setAggregatorField] = useState(null); // 'gasto_bencina', etc.
    const [aggregatorValue, setAggregatorValue] = useState('');
    const [history, setHistory] = useState({
        gasto_bencina: [],
        gasto_peajes: [],
        gasto_seguros: []
    });

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        fetchData();
    }, [year]);



    const fetchData = async () => {
        try {
            // Fetch Flota
            const flotaRes = await api.get('vehiculos/flota/');
            setFlota(flotaRes.data.results || flotaRes.data);

            const params = { anio: year };
            const statsRes = await api.get(`vehiculos/registros/estadisticas_anuales/`, { params });
            const listRes = await api.get(`vehiculos/registros/`, { params });
            
            setStats(statsRes.data);
            setRegistros(listRes.data.results || listRes.data);
        } catch (error) {
            console.error("Error fetching vehicle data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        const val = value === '' ? '' : parseInt(value, 10);

        setFormData(prev => {
            const nextData = {
                ...prev,
                [name]: val
            };

            // Cálculo automático: se dispara si cambia km_inicial o km_final
            if (name === 'km_inicial' || name === 'km_final') {
                const kIni = name === 'km_inicial' ? val : prev.km_inicial;
                const kFin = name === 'km_final' ? val : prev.km_final;

                // Solo calculamos si ambos campos tienen un valor numérico
                if (typeof kIni === 'number' && typeof kFin === 'number') {
                    nextData.kilometros_recorridos = kFin - kIni;
                } else {
                    nextData.kilometros_recorridos = '';
                }
            }

            return nextData;
        });
    };



    const handleAddAmount = (name) => {
        setAggregatorField(name);
        setAggregatorValue('');
        setAggregatorOpen(true);
    };

    const confirmAddition = () => {
        const value = parseInt(aggregatorValue);
        if (isNaN(value) || value <= 0) return;

        setFormData(prev => ({
            ...prev,
            [aggregatorField]: (parseInt(prev[aggregatorField]) || 0) + value
        }));

        setHistory(prev => ({
            ...prev,
            [aggregatorField]: [...prev[aggregatorField], value]
        }));

        setAggregatorOpen(false);
    };

    const resetField = (name) => {
        setFormData({ ...formData, [name]: 0 });
        setHistory({ ...history, [name]: [] });
    };

    const removeAddition = (field, index) => {
        const valToRemove = history[field][index];
        setHistory(prev => ({
            ...prev,
            [field]: prev[field].filter((_, i) => i !== index)
        }));
        setFormData(prev => ({
            ...prev,
            [field]: Math.max(0, (parseInt(prev[field]) || 0) - valToRemove)
        }));
    };

    const handleOpenCreateModal = () => {
        setEditingRecord(null);
        setFormData({
            anio: year,
            mes: registros.length > 0 ? (registros[registros.length - 1].mes % 12) + 1 : new Date().getMonth() + 1,
            vehiculo: flota.length > 0 ? flota[0].id : '',
            kilometros_recorridos: '',
            km_inicial: '',
            km_final: '',
            gasto_bencina: '',
            gasto_peajes: '',
            gasto_seguros: ''
        });
        setHistory({
            gasto_bencina: [],
            gasto_peajes: [],
            gasto_seguros: []
        });
        setModalOpen(true);
    };

    const handleOpenEditModal = (registro) => {
        setEditingRecord(registro);
        setFormData({
            anio: registro.anio,
            mes: registro.mes,
            vehiculo: registro.vehiculo,
            kilometros_recorridos: registro.kilometros_recorridos,
            km_inicial: '',
            km_final: '',
            gasto_bencina: registro.gasto_bencina,
            gasto_peajes: registro.gasto_peajes,
            gasto_seguros: registro.gasto_seguros
        });
        setHistory({
            gasto_bencina: registro.gasto_bencina > 0 ? [registro.gasto_bencina] : [],
            gasto_peajes: registro.gasto_peajes > 0 ? [registro.gasto_peajes] : [],
            gasto_seguros: registro.gasto_seguros > 0 ? [registro.gasto_seguros] : []
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const { km_inicial, km_final, ...restData } = formData;
        const payload = {
            ...restData,
            kilometros_recorridos: formData.kilometros_recorridos === '' ? 0 : formData.kilometros_recorridos,
            gasto_bencina: formData.gasto_bencina === '' ? 0 : formData.gasto_bencina,
            gasto_peajes: formData.gasto_peajes === '' ? 0 : formData.gasto_peajes,
            gasto_seguros: formData.gasto_seguros === '' ? 0 : formData.gasto_seguros,
            numero_vehiculos: formData.numero_vehiculos || 0
        };

        try {
            if (editingRecord) {
                await api.put(`vehiculos/registros/${editingRecord.id}/`, payload);
            } else {
                await api.post('vehiculos/registros/', payload);
            }
            setModalOpen(false);
            fetchData();
        } catch (error) {
            console.error("Error saving record:", error);
            alert("Error al guardar el registro. Verifique los datos o si ya existe un registro para este período.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id, mesNombre) => {
        if (!window.confirm(`¿Está seguro que desea eliminar el registro de ${mesNombre}? Esta acción no se puede deshacer.`)) return;

        setIsDeleting(true);
        try {
            await api.delete(`vehiculos/registros/${id}/`);
            fetchData();
        } catch (error) {
            console.error("Error deleting record:", error);
            alert("Error al intentar eliminar el registro.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleExportExcel = async (shouldSum = false) => {
        try {
            const params = { anio: year, sumar: shouldSum };
            // DRF QueryParams for list of IDs
            selectedVehicles.forEach(id => {
                params['vehiculos[]'] = params['vehiculos[]'] || [];
                params['vehiculos[]'].push(id);
            });

            // Note: Use URLSearchParams for correct array encoding in GET
            const searchParams = new URLSearchParams();
            searchParams.append('anio', year);
            searchParams.append('sumar', shouldSum);
            selectedVehicles.forEach(id => searchParams.append('vehiculos[]', id));

            const response = await api.get(`vehiculos/registros/exportar_excel/?${searchParams.toString()}`, {
                responseType: 'blob',
            });
            const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8-sig' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `reporte_flota.csv`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            setExportModalOpen(false);
        } catch (error) {
            console.error("Error exporting csv:", error);
            alert("Error al descargar el archivo CSV.");
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
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

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700">
                    <p className="text-sm font-bold mb-1">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} className="text-xs" style={{ color: entry.color }}>
                            {entry.name}: {entry.name.includes('Gasto') ? formatCurrency(entry.value) : entry.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div></div>;

    const summedRegistros = Object.values(registros.reduce((acc, curr) => {
        const key = `${curr.anio}-${curr.mes}`;
        if (!acc[key]) {
            acc[key] = { 
                ...curr, 
                id: `sum-${key}`,
                kilometros_recorridos: 0, 
                gasto_bencina: 0, 
                gasto_peajes: 0, 
                gasto_seguros: 0, 
                vehiculo_detalle: { display_name: 'RESUMEN MENSUAL (SUMA)', patente: 'FLOTA' } 
            };
        }
        acc[key].kilometros_recorridos += curr.kilometros_recorridos;
        acc[key].gasto_bencina += curr.gasto_bencina;
        acc[key].gasto_peajes += curr.gasto_peajes;
        acc[key].gasto_seguros += curr.gasto_seguros;
        return acc;
    }, {})).sort((a, b) => a.mes - b.mes);

    const displayRegistros = viewMode === 'general' ? summedRegistros : registros;

    const chartData = (viewMode === 'general' ? summedRegistros : registros).map(r => ({
        mes: viewMode === 'general' ? r.mes_nombre : `${r.mes_nombre} (${r.vehiculo_detalle?.patente})`,
        gasto_bencina: r.gasto_bencina,
        gasto_peajes: r.gasto_peajes,
        gasto_seguros: r.gasto_seguros,
        kilometros: r.kilometros_recorridos
    }));

    return (
        <motion.div
            className="flex flex-col h-full lg:h-[calc(100vh-170px)] gap-4 lg:overflow-hidden pr-2"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-2 gap-2">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Gestión de Flota</h1>
                    <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-slate-500">Control Vehicular {year}</p>
                        <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold border border-indigo-100 uppercase">
                            Vista: {viewMode === 'individual' ? 'Por Vehículo' : 'General (Sumado)'}
                        </span>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button 
                            onClick={() => setViewMode('individual')}
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${viewMode === 'individual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            INDIVIDUAL
                        </button>
                        <button 
                            onClick={() => setViewMode('general')}
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${viewMode === 'general' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            GENERAL
                        </button>
                    </div>

                    <select
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className="bg-white border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-1.5 shadow-sm font-medium outline-none flex-1 sm:flex-none"
                    >
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>

                    <button
                        onClick={() => setFlotaModalOpen(true)}
                        className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-2 flex-1 sm:flex-none"
                    >
                        <Car className="w-4 h-4 text-indigo-500" />
                        Flota
                    </button>

                    <button
                        onClick={() => setExportModalOpen(true)}
                        className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-2 flex-1 sm:flex-none"
                    >
                        <Download className="w-4 h-4 text-emerald-600" />
                        Exportar
                    </button>

                    {can('vehiculos.add_registromensual') && (
                        <button
                            onClick={handleOpenCreateModal}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-xl text-xs font-semibold shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2 flex-auto sm:flex-none"
                        >
                            <Plus className="w-4 h-4" /> Nuevo Registro
                        </button>
                    )}
                </div>
            </div>

            {/* KPI Cards - Responsive Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <motion.div variants={itemVariants} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Combustible</p>
                    <h3 className="text-sm md:text-lg font-medium text-slate-900 font-mono tracking-tight">{formatCurrency(stats?.totales?.total_bencina || 0)}</h3>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Kilometraje</p>
                    <h3 className="text-sm md:text-lg font-medium text-slate-900 font-mono tracking-tight">{(stats?.totales?.total_kms || 0).toLocaleString()} <span className="text-[10px] font-bold text-slate-400 font-sans">km</span></h3>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Seguros</p>
                    <h3 className="text-sm md:text-lg font-medium text-slate-900 font-mono tracking-tight">{formatCurrency(stats?.totales?.total_seguros || 0)}</h3>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Peajes</p>
                    <h3 className="text-sm md:text-lg font-medium text-slate-900 font-mono tracking-tight">{formatCurrency(stats?.totales?.total_peajes || 0)}</h3>
                </motion.div>
            </div>

            {/* Main Content Area - Balanced 50/50 Split on Large Screens */}
            <div className="grid grid-cols-12 gap-4 flex-1 lg:min-h-0 lg:overflow-hidden mb-1">
                {/* Left: Charts */}
                <div className="col-span-12 lg:col-span-6 flex flex-col gap-4 lg:min-h-0">
                    <motion.div variants={itemVariants} className="bg-white p-4 rounded-[32px] border border-slate-100 shadow-sm flex-1 min-h-[300px] lg:min-h-0 overflow-hidden flex flex-col">
                        <h3 className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-2 leading-none">
                            <Activity className="w-4 h-4 text-indigo-500" />
                            Gasto Mensual
                        </h3>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="mes"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 10 }}
                                        tickFormatter={(val) => windowWidth < 1280 ? val.substring(0, 3) : val}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(value) => `$${value / 1000}k`} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                                    <Bar dataKey="gasto_bencina" name="Bencina" fill="#fbbf24" radius={[4, 4, 0, 0]} stackId="a" />
                                    <Bar dataKey="gasto_peajes" name="Peajes" fill="#8b5cf6" radius={[4, 4, 0, 0]} stackId="a" />
                                    <Bar dataKey="gasto_seguros" name="Seguros" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="bg-white p-4 rounded-[32px] border border-slate-100 shadow-sm flex-1 min-h-[300px] lg:min-h-0 overflow-hidden flex flex-col">
                        <h3 className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-2 leading-none">
                            <TrendingUp className="w-4 h-4 text-blue-500" />
                            Kilometraje
                        </h3>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorKms" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="mes"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 10 }}
                                        tickFormatter={(val) => windowWidth < 1280 ? val.substring(0, 3) : val}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="kilometros" name="Kms" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorKms)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>
                </div>

                {/* Right: Table */}
                <div className="col-span-12 lg:col-span-6 flex flex-col min-h-[500px] lg:min-h-0 pb-1">
                    <motion.div variants={itemVariants} className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full border-b-[6px] border-b-slate-900/5">
                        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center whitespace-nowrap">
                            <h3 className="text-sm font-bold text-slate-800">Registros {year}</h3>
                            <span className="text-[9px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100 uppercase tracking-tighter">{displayRegistros.length} REGISTROS</span>
                        </div>
                        <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar scroll-smooth">
                            <div className="min-w-[700px] lg:min-w-0">
                                <table className="w-full text-sm text-left border-collapse table-fixed">
                                    <thead className="sticky top-0 z-10 text-[10px] text-slate-500 uppercase bg-slate-50 border-b border-slate-100 shadow-sm">
                                        <tr>
                                            <th className="px-4 py-3 font-black w-[20%]">Mes / Vehículo</th>
                                            <th className="px-3 py-3 font-black text-right w-[20%]">KMS</th>
                                            <th className="px-3 py-3 font-black text-right w-[50%]">Gasto Detallado</th>
                                            <th className="px-3 py-3 font-black text-center w-[10%]"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {displayRegistros.map((registro) => {
                                            return (
                                                <tr key={registro.id} className="hover:bg-slate-50/80 transition-all duration-200 group">
                                                    <td className="px-4 py-3">
                                                       <div className="flex flex-col">
                                                            <span className="font-bold text-slate-800 text-[13px]">{registro.mes_nombre}</span>
                                                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">{registro.vehiculo_detalle?.display_name || registro.vehiculo_detalle?.patente}</span>
                                                       </div>
                                                    </td>
                                                    <td className="px-3 py-3 text-right tabular-nums text-slate-600 font-medium text-[12px] tracking-tight">{registro.kilometros_recorridos.toLocaleString()}</td>
                                                    <td className="px-3 py-3 text-right tabular-nums">
                                                        <div className="flex flex-col items-end gap-1">
                                                            <div className="flex flex-wrap justify-end gap-x-4 text-[12px] font-medium tracking-tight leading-none">
                                                                <span className="text-amber-600 font-mono" title="Bencina">{formatCurrency(registro.gasto_bencina)}</span>
                                                                <span className="text-violet-500 font-mono" title="Peajes">{formatCurrency(registro.gasto_peajes)}</span>
                                                                <span className="text-emerald-600 font-mono" title="Seguros">{formatCurrency(registro.gasto_seguros)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[14px] font-bold text-slate-900 border-t border-slate-100 pt-1 mt-0.5 leading-none">
                                                                <span className="text-[9px] text-slate-400 uppercase tracking-widest">Total:</span>
                                                                {formatCurrency(registro.gasto_bencina + registro.gasto_peajes + registro.gasto_seguros)}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {viewMode === 'individual' && can('vehiculos.change_registromensual') && (
                                                                <button onClick={() => handleOpenEditModal(registro)} className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                                                            )}
                                                            {viewMode === 'individual' && can('vehiculos.delete_registromensual') && (
                                                                <button onClick={() => handleDelete(registro.id, registro.mes_nombre)} disabled={isDeleting} className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Modal - Unchanged */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto" onClick={() => setModalOpen(false)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl overflow-hidden my-8 border border-white/20"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                                        {editingRecord ? <Pencil className="w-6 h-6 text-white" /> : <Plus className="w-6 h-6 text-white" />}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-800">
                                            {editingRecord ? 'Editar Registro' : 'Nuevo Registro'}
                                        </h2>
                                        <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">VehículosSLEP • {year}</p>
                                    </div>
                                </div>
                                <button onClick={() => setModalOpen(false)} className="text-slate-300 hover:text-slate-600 p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"><X className="w-6 h-6" /></button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                                    <div className="space-y-2 md:col-span-3">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Año Fiscal</label>
                                        <input
                                            type="number"
                                            name="anio"
                                            value={formData.anio}
                                            onChange={handleInputChange}
                                            className="w-full px-6 h-14 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none font-bold text-slate-700 bg-slate-50 transition-all"
                                            required
                                            disabled={!!editingRecord}
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-4">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Mes de Operación</label>
                                        <select
                                            name="mes"
                                            value={formData.mes}
                                            onChange={handleInputChange}
                                            className="w-full px-6 h-14 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none font-bold text-slate-700 bg-slate-50 transition-all"
                                            disabled={!!editingRecord}
                                        >
                                            {Array.from({ length: 12 }, (_, i) => (
                                                <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('es-ES', { month: 'long' })}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2 md:col-span-5">
                                        <label className="text-xs font-black text-indigo-600 uppercase tracking-widest ml-1 flex items-center gap-2"><Car className="w-4 h-4" /> Vehículo</label>
                                        <select
                                            name="vehiculo"
                                            value={formData.vehiculo}
                                            onChange={handleInputChange}
                                            className="w-full px-6 h-14 rounded-2xl border-2 border-indigo-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none font-black text-indigo-700 bg-indigo-50/30 transition-all"
                                            required
                                            disabled={!!editingRecord}
                                        >
                                            <option value="">Seleccionar Vehículo...</option>
                                            {flota.map(v => (
                                                <option key={v.id} value={v.id}>{v.marca} {v.modelo} ({v.patente})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-8 animate-in fade-in duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Km Inicial del mes</label>
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    name="km_inicial" 
                                                    value={formData.km_inicial} 
                                                    onChange={handleInputChange} 
                                                    className="w-full px-6 h-14 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold text-slate-700 bg-slate-50 transition-all" 
                                                    placeholder="Ej: 10500"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Km Final del mes</label>
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    name="km_final" 
                                                    value={formData.km_final} 
                                                    onChange={handleInputChange} 
                                                    className="w-full px-6 h-14 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold text-slate-700 bg-slate-50 transition-all" 
                                                    placeholder="Ej: 11000"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Lectura de Odómetro Mensual (Calculado)</label>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                name="kilometros_recorridos" 
                                                value={formData.kilometros_recorridos} 
                                                onChange={handleInputChange} 
                                                className="w-full px-8 py-5 rounded-[24px] border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none font-black text-2xl text-slate-900 bg-slate-100/50 transition-all pr-20" 
                                                placeholder="0"
                                                readOnly
                                            />
                                            <span className="absolute right-8 top-1/2 -translate-y-1/2 font-black text-slate-300">KM</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {['gasto_bencina', 'gasto_peajes', 'gasto_seguros'].map((field) => {
                                            const colors = {
                                                gasto_bencina: { text: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-100', bgLight: 'bg-amber-50/20', icon: 'text-amber-500', btn: 'bg-amber-600', label: 'Combustible' },
                                                gasto_peajes: { text: 'text-violet-600', bg: 'bg-violet-100', border: 'border-violet-100', bgLight: 'bg-violet-50/20', icon: 'text-violet-500', btn: 'bg-violet-600', label: 'Peajes / TAG' },
                                                gasto_seguros: { text: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-100', bgLight: 'bg-emerald-50/20', icon: 'text-emerald-500', btn: 'bg-emerald-600', label: 'Seguros / Otros' }
                                            };
                                            const c = colors[field];
                                            return (
                                                <div key={field} className="space-y-2">
                                                    <div className="flex justify-between items-center px-1">
                                                        <label className={`text-xs font-black ${c.text} uppercase tracking-widest leading-none`}>{c.label}</label>
                                                        <button type="button" onClick={() => handleAddAmount(field)} className={`text-[10px] font-black ${c.bg} ${c.text} px-2 py-0.5 rounded-lg hover:${c.btn} hover:text-white transition-all flex items-center gap-1`}>
                                                            <Plus className="w-3 h-3" /> AGREGAR
                                                        </button>
                                                    </div>
                                                    
                                                    {/* Historial de adiciones */}
                                                    <div className="flex flex-wrap gap-1 min-h-[1.5rem] px-1 overflow-hidden">
                                                        {history[field].map((val, idx) => (
                                                            <motion.button 
                                                                type="button"
                                                                initial={{ scale: 0.5, opacity: 0 }} 
                                                                animate={{ scale: 1, opacity: 1 }} 
                                                                whileHover={{ scale: 1.05, opacity: 0.8 }}
                                                                key={`${field}-${idx}`} 
                                                                onClick={() => removeAddition(field, idx)}
                                                                className={`text-[9px] font-bold ${c.bg} ${c.text} px-2 py-0.5 rounded-md border ${c.border} cursor-pointer hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all flex items-center gap-1 group/chip`}
                                                                title="Haga clic para eliminar este monto"
                                                            >
                                                                +{val.toLocaleString()}
                                                                <X className="w-2 h-2 opacity-0 group-hover/chip:opacity-100" />
                                                            </motion.button>
                                                        ))}
                                                    </div>

                                                    <div className={`flex items-center gap-2 w-full h-14 rounded-2xl border-2 ${c.border} ${c.bgLight} px-5 transition-all group`}>
                                                        <DollarSign className={`w-5 h-5 ${c.icon} shrink-0`} />
                                                        <input 
                                                            type="number" 
                                                            name={field} 
                                                            value={formData[field]} 
                                                            readOnly 
                                                            className="flex-1 bg-transparent border-none outline-none font-bold text-slate-700 cursor-not-allowed" 
                                                        />
                                                        <button 
                                                            type="button" 
                                                            onClick={() => resetField(field)} 
                                                            className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" 
                                                            title="Reiniciar a 0"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="pt-8 flex justify-end gap-4 border-t border-slate-100">
                                    <button type="button" onClick={() => setModalOpen(false)} className="px-8 py-4 rounded-2xl text-slate-400 font-black hover:text-slate-600 hover:bg-slate-100 transition-all text-sm tracking-widest uppercase">Cancelar</button>
                                    <button type="submit" disabled={submitting} className="bg-slate-900 hover:bg-black text-white px-12 py-4 rounded-2xl font-black text-sm shadow-2xl shadow-slate-900/20 transition-all active:scale-95 flex items-center gap-3 tracking-widest uppercase border-b-4 border-black">
                                        {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white animate-spin rounded-full"></div> : (editingRecord ? 'Actualizar Registro' : 'Confirmar Registro')}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Aggregator Sub-Modal */}
            <AnimatePresence>
                {isAggregatorOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md" onClick={() => setAggregatorOpen(false)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm overflow-hidden border border-white/20"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <Calculator className="w-4 h-4 text-indigo-500" />
                                    Sumar Monto
                                </h3>
                                <button onClick={() => setAggregatorOpen(false)} className="text-slate-300 hover:text-slate-500"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-8 space-y-6 text-center">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Agregando a {aggregatorField?.replace('gasto_', '').toUpperCase()}</p>
                                    <div className="text-xs font-bold text-slate-400 flex justify-center gap-2">
                                        Subtotal: <span className="text-slate-900">{formatCurrency(formData[aggregatorField] || 0)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-center gap-3 bg-slate-50 rounded-2xl p-6 border-2 border-dashed border-slate-100">
                                    <span className="text-4xl font-black text-slate-300">$</span>
                                    <input
                                        autoFocus
                                        type="number"
                                        value={aggregatorValue}
                                        onChange={(e) => setAggregatorValue(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && confirmAddition()}
                                        placeholder="0"
                                        className="w-full text-left text-5xl font-black text-slate-900 outline-none placeholder-slate-100 bg-transparent"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => setAggregatorOpen(false)} className="py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
                                    <button onClick={confirmAddition} className="py-4 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-900/20 hover:bg-black transition-all border-b-4 border-black active:scale-95">Sumar</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Flota Modal */}
            <AnimatePresence>
                {isFlotaModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setFlotaModalOpen(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Car className="text-indigo-600" /> Mantenedor de Flota</h3>
                                <button onClick={() => setFlotaModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
                            </div>
                            <div className="p-6">
                                <form onSubmit={handleSaveFlota} className="grid grid-cols-3 gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <input placeholder="Marca" className="px-3 py-2 border rounded-xl" value={flotaFormData.marca} onChange={e => setFlotaFormData({...flotaFormData, marca: e.target.value})} required />
                                    <input placeholder="Modelo" className="px-3 py-2 border rounded-xl" value={flotaFormData.modelo} onChange={e => setFlotaFormData({...flotaFormData, modelo: e.target.value})} required />
                                    <input placeholder="Patente" className="px-3 py-2 border rounded-xl" value={flotaFormData.patente} onChange={e => setFlotaFormData({...flotaFormData, patente: e.target.value.toUpperCase()})} required />
                                    <button type="submit" disabled={submitting} className="col-span-3 bg-indigo-600 text-white py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors uppercase text-xs tracking-widest">Agregar Vehículo</button>
                                </form>
                                <div className="max-h-[300px] overflow-y-auto space-y-2">
                                    {flota.map(v => (
                                        <div key={v.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors group">
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{v.marca} {v.modelo}</p>
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{v.patente}</p>
                                            </div>
                                            <button onClick={() => handleDeleteFlota(v.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Custom Export Modal */}
            <AnimatePresence>
                {isExportModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setExportModalOpen(false)}>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 border-b border-slate-100">
                                <h3 className="text-xl font-black text-slate-800">Exportar Reporte</h3>
                                <p className="text-xs text-slate-400">Seleccione los vehículos y el formato de salida.</p>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Selección de Flota</label>
                                    <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                                        <div 
                                            key="all" 
                                            className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${selectedVehicles.length === 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100'}`}
                                            onClick={() => setSelectedVehicles([])}
                                        >
                                            <div className={`w-4 h-4 rounded-full border-2 ${selectedVehicles.length === 0 ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`} />
                                            <span className="text-sm font-bold">Todos los Vehículos</span>
                                        </div>
                                        {flota.map(v => (
                                            <div 
                                                key={v.id} 
                                                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${selectedVehicles.includes(v.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100'}`}
                                                onClick={() => {
                                                    if(selectedVehicles.includes(v.id)) {
                                                        setSelectedVehicles(selectedVehicles.filter(i => i !== v.id));
                                                    } else {
                                                        setSelectedVehicles([...selectedVehicles, v.id]);
                                                    }
                                                }}
                                            >
                                                <div className={`w-4 h-4 rounded-full border-2 ${selectedVehicles.includes(v.id) ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`} />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold">{v.marca} {v.modelo}</span>
                                                    <span className="text-[9px] text-slate-400">{v.patente}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <button 
                                        onClick={() => handleExportExcel(false)}
                                        className="flex flex-col items-center justify-center p-4 bg-slate-50 border-2 border-slate-100 rounded-3xl hover:border-indigo-500 transition-all group gap-2"
                                    >
                                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform"><Activity className="text-slate-400 group-hover:text-indigo-600" /></div>
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">Detallado</span>
                                    </button>
                                    <button 
                                        onClick={() => handleExportExcel(true)}
                                        className="flex flex-col items-center justify-center p-4 bg-slate-50 border-2 border-slate-100 rounded-3xl hover:border-emerald-500 transition-all group gap-2"
                                    >
                                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform"><Plus className="text-slate-400 group-hover:text-emerald-600" /></div>
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">Sumado</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div >
    );
};

export default VehiculosDashboard;
