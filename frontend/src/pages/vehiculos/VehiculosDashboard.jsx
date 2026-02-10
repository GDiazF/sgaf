import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Fuel, DollarSign, Activity, TrendingUp, Plus, ChevronRight, X, Save, Download, Calculator, Car, Trash2, Pencil, Sigma } from 'lucide-react';
import api from '../../api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

const VehiculosDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState(2025);
    const [registros, setRegistros] = useState([]);

    // Modal State
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [formData, setFormData] = useState({
        anio: 2025,
        mes: 1,
        numero_vehiculos: 2,
        kilometros_recorridos: '',
        gasto_bencina: '',
        gasto_peajes: '',
        gasto_seguros: ''
    });

    // Individual vehicle inputs state
    const [vehicleDetails, setVehicleDetails] = useState([]);
    const [showVehicleDetails, setShowVehicleDetails] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        fetchData();
    }, [year]);

    // Initialize vehicle details when modal opens or number of vehicles changes
    useEffect(() => {
        const num = parseInt(formData.numero_vehiculos) || 0;
        if (isModalOpen && num !== vehicleDetails.length && !editingRecord) {
            setVehicleDetails(prev => {
                const newDetails = [...prev];
                if (num > prev.length) {
                    for (let i = prev.length; i < num; i++) {
                        newDetails.push({ kms: '', fuel: '', tolls: '', insurance: '' });
                    }
                } else {
                    newDetails.splice(num);
                }
                return newDetails;
            });
        }
    }, [formData.numero_vehiculos, isModalOpen, editingRecord]);

    // Auto-calculate totals from vehicle details
    useEffect(() => {
        if (vehicleDetails.length > 0 && showVehicleDetails) {
            const totals = vehicleDetails.reduce((acc, curr) => ({
                kms: acc.kms + (parseInt(curr.kms) || 0),
                fuel: acc.fuel + (parseInt(curr.fuel) || 0),
                tolls: acc.tolls + (parseInt(curr.tolls) || 0),
                insurance: acc.insurance + (parseInt(curr.insurance) || 0),
            }), { kms: 0, fuel: 0, tolls: 0, insurance: 0 });

            setFormData(prev => ({
                ...prev,
                kilometros_recorridos: totals.kms === 0 ? '' : totals.kms,
                gasto_bencina: totals.fuel === 0 ? '' : totals.fuel,
                gasto_peajes: totals.tolls === 0 ? '' : totals.tolls,
                gasto_seguros: totals.insurance === 0 ? '' : totals.insurance
            }));
        }
    }, [vehicleDetails, showVehicleDetails]);

    const fetchData = async () => {
        try {
            const statsRes = await api.get(`vehiculos/registros/estadisticas_anuales/?anio=${year}`);
            const listRes = await api.get(`vehiculos/registros/?anio=${year}`);
            const sortedRegistros = listRes.data.sort((a, b) => a.mes - b.mes);

            setStats(statsRes.data);
            setRegistros(sortedRegistros);
        } catch (error) {
            console.error("Error fetching vehicle data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value === '' ? '' : parseInt(value)
        }));
    };

    const handleVehicleDetailChange = (index, field, value) => {
        setVehicleDetails(prev => {
            const newDetails = [...prev];
            newDetails[index] = {
                ...newDetails[index],
                [field]: value === '' ? '' : parseInt(value)
            };
            return newDetails;
        });
    };

    const handleOpenCreateModal = () => {
        setEditingRecord(null);
        setFormData({
            anio: year,
            mes: registros.length > 0 ? (registros[registros.length - 1].mes % 12) + 1 : 1,
            numero_vehiculos: 2,
            kilometros_recorridos: '',
            gasto_bencina: '',
            gasto_peajes: '',
            gasto_seguros: ''
        });
        setVehicleDetails([]);
        setShowVehicleDetails(false);
        setModalOpen(true);
    };

    const handleOpenEditModal = (registro) => {
        setEditingRecord(registro);
        setFormData({
            anio: registro.anio,
            mes: registro.mes,
            numero_vehiculos: registro.numero_vehiculos,
            kilometros_recorridos: registro.kilometros_recorridos,
            gasto_bencina: registro.gasto_bencina,
            gasto_peajes: registro.gasto_peajes,
            gasto_seguros: registro.gasto_seguros
        });
        setVehicleDetails([]);
        setShowVehicleDetails(false);
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const payload = {
            ...formData,
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

    const handleExportExcel = async () => {
        try {
            const response = await api.get(`vehiculos/registros/exportar_excel/?anio=${year}`, {
                responseType: 'blob',
            });
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `reporte_flota_${year}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error exporting excel:", error);
            alert("Error al descargar el archivo Excel.");
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

    const chartData = registros.map(r => ({
        mes: r.mes_nombre,
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
                    <p className="text-xs font-medium text-slate-500">Control Vehicular {year}</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-1.5 shadow-sm font-medium outline-none flex-1 sm:flex-none"
                    >
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                    </select>

                    <button
                        onClick={handleExportExcel}
                        className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-2 flex-1 sm:flex-none"
                    >
                        <Download className="w-4 h-4 text-emerald-600" />
                        Exportar
                    </button>

                    <button
                        onClick={handleOpenCreateModal}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-xl text-xs font-semibold shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2 flex-auto sm:flex-none"
                    >
                        <Plus className="w-4 h-4" /> Nuevo Registro
                    </button>
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
                            <span className="text-[9px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100 uppercase tracking-tighter">{registros.length} MESES</span>
                        </div>
                        <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar scroll-smooth">
                            <div className="min-w-[700px] lg:min-w-0">
                                <table className="w-full text-sm text-left border-collapse table-fixed">
                                    <thead className="sticky top-0 z-10 text-[10px] text-slate-500 uppercase bg-slate-50 border-b border-slate-100 shadow-sm">
                                        <tr>
                                            <th className="px-4 py-3 font-black w-[15%]">Mes</th>
                                            <th className="px-1 py-3 font-black text-center w-[5%]">UN</th>
                                            <th className="px-3 py-3 font-black text-right w-[30%]">KMS</th>
                                            <th className="px-3 py-3 font-black text-right w-[42%]">Desglose Gastos Detallado</th>
                                            <th className="px-3 py-3 font-black text-center w-[8%]"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {registros.map((registro) => {
                                            return (
                                                <tr key={registro.id} className="hover:bg-slate-50/80 transition-all duration-200 group h-[68px]">
                                                    <td className="px-4 py-1 font-medium text-slate-800 text-[14px] leading-tight truncate">
                                                        {windowWidth < 1440 ? registro.mes_nombre.substring(0, 3) : registro.mes_nombre}
                                                    </td>
                                                    <td className="px-1 py-1 text-center font-medium text-slate-400 text-[10px]">{registro.numero_vehiculos}</td>
                                                    <td className="px-3 py-1 text-right tabular-nums text-slate-600 font-medium text-[12px] tracking-tight leading-tight">{registro.kilometros_recorridos.toLocaleString()}</td>
                                                    <td className="px-3 py-1 text-right tabular-nums leading-tight">
                                                        <div className="flex flex-col items-end gap-1">
                                                            <div className="flex flex-wrap justify-end gap-x-6 text-[13px] font-medium tracking-tight w-full leading-none">
                                                                <div className="flex items-center">
                                                                    <span className="text-amber-600 font-mono">{formatCurrency(registro.gasto_bencina)}</span>
                                                                </div>
                                                                <div className="flex items-center">
                                                                    <span className="text-violet-500 font-mono">{formatCurrency(registro.gasto_peajes)}</span>
                                                                </div>
                                                                <div className="flex items-center">
                                                                    <span className="text-emerald-600 font-mono">{formatCurrency(registro.gasto_seguros)}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[15px] font-medium text-slate-900 border-t border-slate-100 pt-1 mt-0.5 leading-none">
                                                                <span className="text-[10px] text-slate-400 uppercase tracking-widest">Total:</span>
                                                                {formatCurrency(registro.gasto_bencina + registro.gasto_peajes + registro.gasto_seguros)}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-1 text-center">
                                                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => handleOpenEditModal(registro)} className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                                                            <button onClick={() => handleDelete(registro.id, registro.mes_nombre)} disabled={isDeleting} className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
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
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Año Fiscal</label>
                                        <input
                                            type="number"
                                            name="anio"
                                            value={formData.anio}
                                            onChange={handleInputChange}
                                            className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none font-bold text-slate-700 bg-slate-50 transition-all"
                                            required
                                            disabled={!!editingRecord}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Mes de Operación</label>
                                        <select
                                            name="mes"
                                            value={formData.mes}
                                            onChange={handleInputChange}
                                            className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none font-bold text-slate-700 bg-slate-50 transition-all appearance-none"
                                            disabled={!!editingRecord}
                                        >
                                            {Array.from({ length: 12 }, (_, i) => (
                                                <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('es-ES', { month: 'long' })}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-indigo-600 uppercase tracking-widest ml-1 flex items-center gap-2"><Car className="w-4 h-4" /> Flota Activa</label>
                                        <input type="number" name="numero_vehiculos" value={formData.numero_vehiculos} onChange={handleInputChange} className="w-full px-6 py-4 rounded-2xl border-2 border-indigo-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none font-black text-indigo-700 bg-indigo-50/30 transition-all" min="1" max="50" />
                                    </div>
                                </div>

                                {!editingRecord && (
                                    <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-[32px] shadow-xl shadow-slate-900/10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10"><Calculator className="w-6 h-6" /></div>
                                            <div><p className="text-lg font-bold text-white">Modo Inteligente</p><p className="text-xs text-white/50">Carga detallada por patente y vehículo.</p></div>
                                        </div>
                                        <button type="button" onClick={() => setShowVehicleDetails(!showVehicleDetails)} className={`px-6 py-3 rounded-2xl text-xs font-black transition-all shadow-lg ${showVehicleDetails ? 'bg-indigo-500 text-white shadow-indigo-500/30' : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'}`}>{showVehicleDetails ? 'ACTIVADO' : 'DESACTIVADO'}</button>
                                    </div>
                                )}

                                {showVehicleDetails && !editingRecord && (
                                    <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                                        {/* Running Totals Preview Bar */}
                                        <div className="grid grid-cols-4 gap-4 bg-indigo-50/50 p-4 rounded-3xl border border-indigo-100 shadow-sm">
                                            <div className="text-center">
                                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">Total KM</p>
                                                <p className="text-lg font-black text-indigo-700 font-mono tracking-tight">{formData.kilometros_recorridos || 0}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-tighter">Total Bencina</p>
                                                <p className="text-lg font-black text-amber-600 font-mono tracking-tight">{formatCurrency(formData.gasto_bencina || 0)}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] font-black text-violet-500 uppercase tracking-tighter">Total Peajes</p>
                                                <p className="text-lg font-black text-violet-600 font-mono tracking-tight">{formatCurrency(formData.gasto_peajes || 0)}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">Total Seguros</p>
                                                <p className="text-lg font-black text-emerald-600 font-mono tracking-tight">{formatCurrency(formData.gasto_seguros || 0)}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-slate-200 custom-scroll">
                                            <div className="grid grid-cols-12 gap-4 px-4 mb-2 sticky top-0 bg-white z-10 py-3 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                                                <div className="col-span-2">Vehículo</div><div className="col-span-3 text-center">KM</div><div className="col-span-2 text-center">Bencina</div><div className="col-span-2 text-center">Peajes</div><div className="col-span-3 text-center">Seguros</div>
                                            </div>
                                            {vehicleDetails.map((v, idx) => (
                                                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} key={idx} className="grid grid-cols-12 gap-4 items-center bg-slate-50/50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 rounded-2xl p-3 border border-slate-100 transition-all group">
                                                    <div className="col-span-2 flex items-center gap-3">
                                                        <span className="w-8 h-8 bg-white border border-slate-200 text-slate-400 text-xs font-black rounded-xl flex items-center justify-center shadow-sm group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">{idx + 1}</span>
                                                        <span className="text-xs font-black text-slate-500 tracking-tighter">MOV-{100 + idx}</span>
                                                    </div>
                                                    <div className="col-span-3"><input type="number" value={v.kms} onChange={(e) => handleVehicleDetailChange(idx, 'kms', e.target.value)} className="w-full px-4 py-2 bg-white rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none text-sm text-center font-bold" placeholder="0" /></div>
                                                    <div className="col-span-2"><input type="number" value={v.fuel} onChange={(e) => handleVehicleDetailChange(idx, 'fuel', e.target.value)} className="w-full px-4 py-2 bg-white rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none text-sm text-center font-bold" placeholder="0" /></div>
                                                    <div className="col-span-2"><input type="number" value={v.tolls} onChange={(e) => handleVehicleDetailChange(idx, 'tolls', e.target.value)} className="w-full px-4 py-2 bg-white rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none text-sm text-center font-bold" placeholder="0" /></div>
                                                    <div className="col-span-3"><input type="number" value={v.insurance} onChange={(e) => handleVehicleDetailChange(idx, 'insurance', e.target.value)} className="w-full px-4 py-2 bg-white rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none text-sm text-center font-bold" placeholder="0" /></div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {(editingRecord || !showVehicleDetails) && (
                                    <div className="space-y-8 animate-in fade-in duration-500">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Lectura de Odómetro Mensual</label>
                                            <div className="relative">
                                                <input type="number" name="kilometros_recorridos" value={formData.kilometros_recorridos} onChange={handleInputChange} className="w-full px-8 py-5 rounded-[24px] border-2 border-slate-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none font-black text-2xl text-slate-800 bg-slate-50 transition-all pr-20" placeholder="000,000" />
                                                <span className="absolute right-8 top-1/2 -translate-y-1/2 font-black text-slate-300">KM</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-amber-600 uppercase tracking-widest ml-1">Combustible</label>
                                                <div className="relative">
                                                    <input type="number" name="gasto_bencina" value={formData.gasto_bencina} onChange={handleInputChange} className="w-full px-6 py-4 rounded-2xl border-2 border-amber-100 focus:border-amber-500 outline-none font-bold text-slate-700 bg-amber-50/10 transition-all pl-10" />
                                                    <DollarSign className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-violet-600 uppercase tracking-widest ml-1">Peajes / TAG</label>
                                                <div className="relative">
                                                    <input type="number" name="gasto_peajes" value={formData.gasto_peajes} onChange={handleInputChange} className="w-full px-6 py-4 rounded-2xl border-2 border-violet-100 focus:border-violet-500 outline-none font-bold text-slate-700 bg-violet-50/10 transition-all pl-10" />
                                                    <DollarSign className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-violet-500" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-emerald-600 uppercase tracking-widest ml-1">Seguros / Otros</label>
                                                <div className="relative">
                                                    <input type="number" name="gasto_seguros" value={formData.gasto_seguros} onChange={handleInputChange} className="w-full px-6 py-4 rounded-2xl border-2 border-emerald-100 focus:border-emerald-500 outline-none font-bold text-slate-700 bg-emerald-50/10 transition-all pl-10" />
                                                    <DollarSign className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

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
            </AnimatePresence >
        </motion.div >
    );
};

export default VehiculosDashboard;
