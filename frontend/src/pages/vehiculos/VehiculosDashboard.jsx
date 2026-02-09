import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Fuel, DollarSign, Activity, TrendingUp, Plus, ChevronRight, X, Save, Download, Calculator, Car, Trash2 } from 'lucide-react';
import api from '../../api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

const VehiculosDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState(2025);
    const [registros, setRegistros] = useState([]);

    // Modal State
    const [isModalOpen, setModalOpen] = useState(false);
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

    useEffect(() => {
        fetchData();
    }, [year]);

    // Initialize vehicle details when modal opens or number of vehicles changes
    useEffect(() => {
        const num = parseInt(formData.numero_vehiculos) || 0;
        if (isModalOpen && num !== vehicleDetails.length) {
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
    }, [formData.numero_vehiculos, isModalOpen]);

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
            await api.post('vehiculos/registros/', payload);
            setModalOpen(false);
            fetchData();
            setFormData(prev => ({
                ...prev,
                mes: prev.mes < 12 ? prev.mes + 1 : 1,
                kilometros_recorridos: '',
                gasto_bencina: '',
                gasto_peajes: '',
                gasto_seguros: ''
            }));
            setVehicleDetails([]);
        } catch (error) {
            console.error("Error saving record:", error);
            alert("Error al guardar el registro. Verifique que no exista ya un registro para este mes y año.");
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
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
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
            className="flex flex-col h-[calc(100vh-100px)] gap-4 overflow-hidden"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header - Compact */}
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestión de Flota</h1>
                    <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
                        <Truck className="w-3 h-3 text-indigo-500" />
                        Control de Flota {year}
                    </p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-2 py-1.5 shadow-sm font-medium outline-none"
                    >
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                    </select>

                    <button
                        onClick={handleExportExcel}
                        className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                    >
                        <Download className="w-3.5 h-3.5 text-emerald-600" />
                        Exportar
                    </button>

                    <button
                        onClick={() => setModalOpen(true)}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg shadow-slate-900/10 transition-all flex items-center gap-1.5"
                    >
                        <Plus className="w-3.5 h-3.5" /> Nuevo Registro
                    </button>
                </div>
            </div>

            {/* KPI Cards - Compact Row */}
            <div className="grid grid-cols-4 gap-4">
                <motion.div variants={itemVariants} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="relative z-10">
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Combustible (Anual)</p>
                        <h3 className="text-lg font-black text-slate-900 leading-tight">
                            {formatCurrency(stats?.totales?.total_bencina || 0)}
                        </h3>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="relative z-10">
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Kilometraje Total</p>
                        <h3 className="text-lg font-black text-slate-900 leading-tight">
                            {(stats?.totales?.total_kms || 0).toLocaleString()} km
                        </h3>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="relative z-10">
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Seguros (Anual)</p>
                        <h3 className="text-lg font-black text-slate-900 leading-tight">
                            {formatCurrency(stats?.totales?.total_seguros || 0)}
                        </h3>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="relative z-10">
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Peajes (Anual)</p>
                        <h3 className="text-lg font-black text-slate-900 leading-tight">
                            {formatCurrency(stats?.totales?.total_peajes || 0)}
                        </h3>
                    </div>
                </motion.div>
            </div>

            {/* Middle Section: Charts & Small Table - Adjusted to fill remaining space */}
            <div className="grid grid-cols-12 gap-4 flex-1 min-h-0 overflow-hidden">
                {/* Left: Charts */}
                <div className="col-span-12 lg:col-span-5 flex flex-col gap-4 min-h-0">
                    <motion.div variants={itemVariants} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex-1 min-h-0">
                        <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1">
                            <Activity className="w-3.5 h-3.5 text-indigo-500" />
                            Gastos
                        </h3>
                        <div className="h-[calc(100%-24px)] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(value) => `$${value / 1000}k`} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="gasto_bencina" name="Bencina" fill="#fbbf24" radius={[2, 2, 0, 0]} stackId="a" />
                                    <Bar dataKey="gasto_peajes" name="Peajes" fill="#8b5cf6" radius={[2, 2, 0, 0]} stackId="a" />
                                    <Bar dataKey="gasto_seguros" name="Seguros" fill="#10b981" radius={[2, 2, 0, 0]} stackId="a" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex-1 min-h-0">
                        <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1">
                            <Truck className="w-3.5 h-3.5 text-blue-500" />
                            Distribución de Kilometraje
                        </h3>
                        <div className="h-[calc(100%-24px)] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorKms" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="kilometros" name="Kms" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorKms)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>
                </div>

                {/* Right: Table - Auto Scroll inside if needed, but should fit 12 rows */}
                <div className="col-span-12 lg:col-span-7 flex flex-col min-h-0">
                    <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
                        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-800">Registros Mensuales</h3>
                        </div>
                        <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-slate-200">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead className="text-[10px] text-slate-500 uppercase bg-slate-50/50 border-b border-slate-100 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-2 font-bold">Mes</th>
                                        <th className="px-4 py-2 font-bold text-center">Cant.</th>
                                        <th className="px-4 py-2 font-bold text-right">Kms</th>
                                        <th className="px-4 py-2 font-bold text-right">Bencina</th>
                                        <th className="px-4 py-2 font-bold text-right">Peajes</th>
                                        <th className="px-4 py-2 font-bold text-right">Seguros</th>
                                        <th className="px-4 py-2 font-bold text-center">Elim.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {registros.map((registro) => {
                                        return (
                                            <tr key={registro.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-2 font-bold text-slate-700">{registro.mes_nombre}</td>
                                                <td className="px-4 py-2 text-center">
                                                    <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                                        {registro.numero_vehiculos}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-right tabular-nums text-slate-600 font-medium">{registro.kilometros_recorridos.toLocaleString()}</td>
                                                <td className="px-4 py-2 text-right tabular-nums font-semibold text-amber-600">{formatCurrency(registro.gasto_bencina)}</td>
                                                <td className="px-4 py-2 text-right tabular-nums text-violet-600">{formatCurrency(registro.gasto_peajes)}</td>
                                                <td className="px-4 py-2 text-right tabular-nums text-emerald-600">{formatCurrency(registro.gasto_seguros)}</td>
                                                <td className="px-4 py-2 text-center">
                                                    <button
                                                        onClick={() => handleDelete(registro.id, registro.mes_nombre)}
                                                        disabled={isDeleting}
                                                        className="p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {registros.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-12 text-center text-slate-400 italic font-medium">
                                                Sin registros en este año.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* New Record Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden my-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Plus className="w-4 h-4 text-indigo-600" />
                                    Nuevo Registro
                                </h2>
                                <button
                                    onClick={() => setModalOpen(false)}
                                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1.5 rounded-full transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                                {/* Base Information */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Año</label>
                                        <input
                                            type="number"
                                            name="anio"
                                            value={formData.anio}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 bg-slate-50 text-xs"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Mes</label>
                                        <select
                                            name="mes"
                                            value={formData.mes}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 bg-slate-50 text-xs"
                                        >
                                            {Array.from({ length: 12 }, (_, i) => (
                                                <option key={i + 1} value={i + 1}>
                                                    {new Date(0, i).toLocaleString('es-ES', { month: 'long' })}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-indigo-600 uppercase flex items-center gap-1">
                                            <Car className="w-3 h-3" /> Cantidad Vehículos
                                        </label>
                                        <input
                                            type="number"
                                            name="numero_vehiculos"
                                            value={formData.numero_vehiculos}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-1.5 rounded-lg border border-indigo-200 focus:ring-1 focus:ring-indigo-500 font-bold text-slate-800 text-xs"
                                            min="1"
                                            max="30"
                                        />
                                    </div>
                                </div>

                                {/* Vehicle Entry Toggle & Info */}
                                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                                            <Calculator className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-800 leading-none">Carga por Vehículo</p>
                                            <p className="text-[10px] text-slate-500 mt-1">Calcula los totales ingresando por unidad.</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowVehicleDetails(!showVehicleDetails)}
                                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${showVehicleDetails ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-200 text-slate-600'}`}
                                    >
                                        {showVehicleDetails ? 'Activado' : 'Desactivado'}
                                    </button>
                                </div>

                                {/* Dynamic Vehicle Inputs */}
                                {showVehicleDetails && vehicleDetails.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200"
                                    >
                                        <div className="grid grid-cols-12 gap-3 px-2 mb-1 sticky top-0 bg-white z-10 py-1 border-b border-slate-100">
                                            <div className="col-span-2 text-[9px] font-black uppercase text-slate-400">Unidad</div>
                                            <div className="col-span-3 text-[9px] font-black uppercase text-slate-400 text-center">Kms</div>
                                            <div className="col-span-2 text-[9px] font-black uppercase text-slate-400 text-center">Fuel</div>
                                            <div className="col-span-2 text-[9px] font-black uppercase text-slate-400 text-center">Peajes</div>
                                            <div className="col-span-3 text-[9px] font-black uppercase text-slate-400 text-center">Seguros</div>
                                        </div>
                                        {vehicleDetails.map((v, idx) => (
                                            <div key={idx} className="grid grid-cols-12 gap-3 items-center bg-white hover:bg-slate-50/50 transition-colors rounded-lg p-1.5 border border-slate-100">
                                                <div className="col-span-2 flex items-center gap-2">
                                                    <span className="w-5 h-5 bg-slate-100 text-slate-500 text-[9px] font-bold rounded-full flex items-center justify-center">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-600">Unit</span>
                                                </div>
                                                <div className="col-span-3">
                                                    <input
                                                        type="number"
                                                        value={v.kms}
                                                        onChange={(e) => handleVehicleDetailChange(idx, 'kms', e.target.value)}
                                                        className="w-full px-2 py-1 rounded border border-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none text-[10px] font-medium text-center"
                                                        placeholder="0"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <input
                                                        type="number"
                                                        value={v.fuel}
                                                        onChange={(e) => handleVehicleDetailChange(idx, 'fuel', e.target.value)}
                                                        className="w-full px-2 py-1 rounded border border-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none text-[10px] font-medium text-center"
                                                        placeholder="$ 0"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <input
                                                        type="number"
                                                        value={v.tolls}
                                                        onChange={(e) => handleVehicleDetailChange(idx, 'tolls', e.target.value)}
                                                        className="w-full px-2 py-1 rounded border border-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none text-[10px] font-medium text-center"
                                                        placeholder="$ 0"
                                                    />
                                                </div>
                                                <div className="col-span-3">
                                                    <input
                                                        type="number"
                                                        value={v.insurance}
                                                        onChange={(e) => handleVehicleDetailChange(idx, 'insurance', e.target.value)}
                                                        className="w-full px-2 py-1 rounded border border-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none text-[10px] font-medium text-center"
                                                        placeholder="$ 0"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </motion.div>
                                )}

                                {/* Manual Totals Section (Old Way) - Compact */}
                                {!showVehicleDetails && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="space-y-3"
                                    >
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Kms Totales</label>
                                            <div className="relative">
                                                <Truck className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
                                                <input
                                                    type="number"
                                                    name="kilometros_recorridos"
                                                    value={formData.kilometros_recorridos}
                                                    onChange={handleInputChange}
                                                    className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 focus:ring-1 focus:ring-indigo-500 font-bold text-slate-700 text-xs"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-amber-600 uppercase tracking-tight text-center block">Bencina</label>
                                                <input
                                                    type="number"
                                                    name="gasto_bencina"
                                                    value={formData.gasto_bencina}
                                                    onChange={handleInputChange}
                                                    className="w-full px-3 py-1.5 rounded-lg border border-amber-200 focus:ring-1 focus:ring-amber-500 font-bold text-slate-700 text-xs text-center"
                                                    placeholder="$ 0"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-violet-600 uppercase tracking-tight text-center block">Peajes</label>
                                                <input
                                                    type="number"
                                                    name="gasto_peajes"
                                                    value={formData.gasto_peajes}
                                                    onChange={handleInputChange}
                                                    className="w-full px-3 py-1.5 rounded-lg border border-violet-200 focus:ring-1 focus:ring-violet-500 font-bold text-slate-700 text-xs text-center"
                                                    placeholder="$ 0"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight text-center block">Seguros</label>
                                                <input
                                                    type="number"
                                                    name="gasto_seguros"
                                                    value={formData.gasto_seguros}
                                                    onChange={handleInputChange}
                                                    className="w-full px-3 py-1.5 rounded-lg border border-emerald-200 focus:ring-1 focus:ring-emerald-500 font-bold text-slate-700 text-xs text-center"
                                                    placeholder="$ 0"
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Compact Summary Header (Only when active) */}
                                {showVehicleDetails && (
                                    <div className="grid grid-cols-4 gap-3">
                                        <div className="bg-slate-900 px-3 py-2 rounded-xl">
                                            <p className="text-[8px] font-bold text-indigo-300 uppercase">Kms</p>
                                            <h4 className="text-sm font-black text-white">{formData.kilometros_recorridos || 0}</h4>
                                        </div>
                                        <div className="bg-amber-500 px-3 py-2 rounded-xl">
                                            <p className="text-[8px] font-bold text-white uppercase">Bencina</p>
                                            <h4 className="text-sm font-black text-white">{formatCurrency(formData.gasto_bencina || 0)}</h4>
                                        </div>
                                        <div className="bg-violet-500 px-3 py-2 rounded-xl">
                                            <p className="text-[8px] font-bold text-white uppercase">Peajes</p>
                                            <h4 className="text-sm font-black text-white">{formatCurrency(formData.gasto_peajes || 0)}</h4>
                                        </div>
                                        <div className="bg-emerald-500 px-3 py-2 rounded-xl">
                                            <p className="text-[8px] font-bold text-white uppercase">Seguros</p>
                                            <h4 className="text-sm font-black text-white">{formatCurrency(formData.gasto_seguros || 0)}</h4>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setModalOpen(false)}
                                        className="px-4 py-2 rounded-lg text-slate-500 font-bold hover:bg-slate-100 transition-colors text-xs"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-slate-900/10 transition-all flex items-center gap-2 disabled:opacity-50 text-xs"
                                    >
                                        {submitting ? '...' : (
                                            <>
                                                <Save className="w-3.5 h-3.5" /> Guardar Todo
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default VehiculosDashboard;
