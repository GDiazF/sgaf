import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Activity, DollarSign, Building2, FileText, Zap, TrendingUp } from 'lucide-react';
import api from '../../api';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

/** Período de consumo = mes calendario anterior a la fecha de vencimiento (ej. vence 22-may → período abril). */
const getServicePeriod = (payment) => {
    const dateStr = payment.fecha_vencimiento || payment.fecha_emision || payment.fecha_pago;
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month) return null;
    const vencimiento = new Date(year, month - 1, day || 1);
    vencimiento.setMonth(vencimiento.getMonth() - 1);
    return { year: vencimiento.getFullYear(), month: vencimiento.getMonth() };
};

const ServiceDetailModal = ({ isOpen, onClose, service }) => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    useEffect(() => {
        if (isOpen && service?.id) {
            const loadPayments = async () => {
                setLoading(true);
                try {
                    const res = await api.get('registros-pagos/', {
                        params: { servicio: service.id, page_size: 1000 }
                    });
                    const fetchedPayments = res.data.results || res.data || [];
                    setPayments(fetchedPayments);

                    // Set default selected year to the most recent payment's year, or current year
                    const availableYears = fetchedPayments.map(p => getServicePeriod(p)?.year ?? null).filter(Boolean);

                    if (availableYears.length > 0) {
                        const maxYear = Math.max(...availableYears);
                        setSelectedYear(maxYear);
                    } else {
                        setSelectedYear(new Date().getFullYear());
                    }
                } catch (e) {
                    console.error("Error loading service payments:", e);
                } finally {
                    setLoading(false);
                }
            };
            loadPayments();
        }
    }, [isOpen, service?.id]);

    if (!isOpen || !service) return null;

    // Detect available years dynamically
    const availableYears = Array.from(new Set(
        payments.map(p => getServicePeriod(p)?.year ?? null).filter(Boolean)
    )).sort((a, b) => b - a);

    if (availableYears.length === 0) {
        availableYears.push(new Date().getFullYear());
    }

    // Filter payments for chosen year
    const yearlyPayments = payments.filter(p => getServicePeriod(p)?.year === selectedYear);

    // Formatting utilities
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    // Build Recharts data for the 12 months
    const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const chartData = MONTH_NAMES.map((name, index) => {
        const monthlyPayments = yearlyPayments.filter(p => getServicePeriod(p)?.month === index);

        const totalConsumo = monthlyPayments.reduce((sum, p) => sum + (parseFloat(p.consumo) || 0), 0);
        const totalMonto = monthlyPayments.reduce((sum, p) => sum + (parseInt(p.monto_total) || 0), 0);

        return {
            name,
            'Consumo': totalConsumo,
            'Monto': totalMonto,
            hasConsumo: totalConsumo > 0
        };
    });

    const totalYearlyConsumption = yearlyPayments.reduce((sum, p) => sum + (parseFloat(p.consumo) || 0), 0);
    const totalYearlySpent = yearlyPayments.reduce((sum, p) => sum + (parseInt(p.monto_total) || 0), 0);

    // Custom Tooltip for the chart
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-left space-y-1 backdrop-blur-md">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{data.name} {selectedYear}</p>
                    <div className="space-y-0.5">
                        {service.unidad_medida && (
                            <p className="text-[11px] font-medium text-blue-300">
                                Consumo: <span className="text-white">{data.Consumo.toFixed(1)} {service.unidad_medida}</span>
                            </p>
                        )}
                        <p className="text-[11px] font-medium text-blue-300">
                            Costo Total: <span className="text-white">{formatCurrency(data.Monto)}</span>
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
                {/* Backdrop Click-Close handler */}
                <div className="absolute inset-0" onClick={onClose} />

                {/* Modal Container (Strict Standard: rounded-2xl, max-w-3xl) */}
                <motion.div
                    initial={{ scale: 0.97, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.97, opacity: 0, y: 10 }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] md:max-h-[720px] overflow-hidden relative z-10 flex flex-col border border-slate-100 mx-4"
                >
                    {/* Header (Strict Standard: bg-slate-50, p-4 md:p-6) */}
                    <div className="p-4 md:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 gap-3 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-900/20 shrink-0">
                                <Zap className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold uppercase tracking-wide mb-0.5 text-[8px] border border-slate-300/20">
                                    {service.tipo_documento_nombre || 'Servicio'}
                                </span>
                                <h3 className="text-[11px] md:text-[12px] font-bold text-slate-800 uppercase tracking-tight leading-none truncate">
                                    {service.proveedor_nombre}
                                </h3>
                                <p className="text-[10px] font-mono font-bold text-blue-600 mt-0.5 flex items-center gap-1.5">
                                    Nº CLIENTE: #{service.numero_cliente}
                                    {service.numero_servicio && <span className="text-slate-400">| MEDIDOR: {service.numero_servicio}</span>}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between shrink-0">
                            {/* Selector de Año Premium Simétrico */}
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                    className="no-global w-[105px] h-9 pl-3 pr-8 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 focus:border-blue-500 outline-none transition-all shadow-sm cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem_1rem] bg-[right_0.5rem_center] bg-no-repeat appearance-none"
                                >
                                    {availableYears.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Close Button X (Strict Standard) */}
                            <button 
                                onClick={onClose} 
                                className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors"
                                aria-label="Cerrar modal"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Body (Strict Standard: p-4 md:p-6) */}
                    <div className="p-4 md:p-5 overflow-y-auto flex-1 custom-scrollbar space-y-5">
                        {/* Service Metadata Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center gap-2.5">
                                <div className="w-8.5 h-8.5 rounded-lg bg-white border border-slate-200/60 text-slate-500 flex items-center justify-center shrink-0">
                                    <Building2 className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Establecimiento</p>
                                    <p className="text-[10px] font-bold text-slate-700 truncate">{service.establecimiento_nombre}</p>
                                </div>
                            </div>
                            
                            {service.unidad_medida ? (
                                <div className="bg-blue-50/20 border border-blue-100/50 p-3 rounded-xl flex items-center gap-2.5">
                                    <div className="w-8.5 h-8.5 rounded-lg bg-white border border-blue-100/30 text-blue-600 flex items-center justify-center shrink-0">
                                        <Activity className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-bold text-blue-400 uppercase tracking-widest leading-none mb-0.5">Consumo Total {selectedYear}</p>
                                        <p className="text-[10px] font-bold text-blue-700">
                                            {totalYearlyConsumption.toFixed(1)} {service.unidad_medida}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center gap-2.5">
                                    <div className="w-8.5 h-8.5 rounded-lg bg-white border border-slate-200/60 text-slate-400 flex items-center justify-center shrink-0">
                                        <Activity className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Medición</p>
                                        <p className="text-[10px] font-bold text-slate-500">Costo Fijo / Sin Métrica</p>
                                    </div>
                                </div>
                            )}

                            <div className="bg-blue-50/20 border border-blue-100/50 p-3 rounded-xl flex items-center gap-2.5">
                                <div className="w-8.5 h-8.5 rounded-lg bg-white border border-blue-100/30 text-blue-600 flex items-center justify-center shrink-0">
                                    <DollarSign className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[8px] font-bold text-blue-400 uppercase tracking-widest leading-none mb-0.5">Gasto Anual {selectedYear}</p>
                                    <p className="text-[10px] font-bold text-blue-700">{formatCurrency(totalYearlySpent)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Chart Area */}
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-sm">
                            <div className="flex justify-between items-center">
                                <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-0">
                                    <TrendingUp className="w-3.5 h-3.5 text-blue-500" /> Historial Mensual (por período de vencimiento)
                                </h4>
                                {service.unidad_medida ? (
                                    <span className="text-[8px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">
                                        Consumos ({service.unidad_medida})
                                    </span>
                                ) : (
                                    <span className="text-[8px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">
                                        Gasto Facturado ($)
                                    </span>
                                )}
                            </div>

                            {loading ? (
                                <div className="h-[210px] flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                </div>
                            ) : totalYearlySpent === 0 ? (
                                <div className="h-[210px] flex flex-col items-center justify-center text-slate-400 italic text-[10px] gap-1.5">
                                    <Zap className="w-6 h-6 text-slate-200" />
                                    No hay consumos o pagos registrados para el año {selectedYear}
                                </div>
                            ) : (
                                <div className="w-full h-[210px] mt-1">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} margin={{ top: 15, right: 5, left: -25, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F8FAFC" />
                                            <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="#94A3B8" fontSize={9} fontWeight={600} />
                                            <YAxis tickLine={false} axisLine={false} stroke="#94A3B8" fontSize={9} fontWeight={600} />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
                                            <Bar dataKey={service.unidad_medida ? "Consumo" : "Monto"} radius={[4, 4, 0, 0]}>
                                                {chartData.map((entry, index) => (
                                                    <Cell 
                                                        key={`cell-${index}`} 
                                                        fill={service.unidad_medida ? "url(#colorConsumo)" : "url(#colorMonto)"} 
                                                    />
                                                ))}
                                            </Bar>
                                            <defs>
                                                <linearGradient id="colorConsumo" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.9}/>
                                                    <stop offset="95%" stopColor="#60A5FA" stopOpacity={0.25}/>
                                                </linearGradient>
                                                <linearGradient id="colorMonto" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.9}/>
                                                    <stop offset="95%" stopColor="#34D399" stopOpacity={0.25}/>
                                                </linearGradient>
                                            </defs>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        {/* Payments Detail Table */}
                        <div className="space-y-2">
                            <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-0">
                                <FileText className="w-3.5 h-3.5 text-blue-500" /> Registro Detallado de Boletas ({selectedYear})
                            </h4>

                            <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-sm">
                                <div className="max-h-[220px] overflow-y-auto custom-scrollbar relative">
                                    <table className="w-full text-left border-collapse border-spacing-0 relative">
                                        <thead className="sticky top-0 z-10 border-b border-slate-200 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            <tr>
                                                <th className="px-3 py-2 bg-slate-50">N° Documento</th>
                                                <th className="px-3 py-2 text-center bg-slate-50">F. Venc.</th>
                                                <th className="px-3 py-2 text-center bg-slate-50">Consumo</th>
                                                <th className="px-3 py-2 text-right bg-slate-50">Monto</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-[11px] font-medium text-slate-600">
                                            {yearlyPayments.map(p => (
                                                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-3 py-2 font-mono text-slate-700 font-medium">{p.nro_documento}</td>
                                                    <td className="px-3 py-2 text-center text-slate-500">{formatDate(p.fecha_vencimiento)}</td>
                                                    <td className="px-3 py-2 text-center">
                                                        {p.consumo !== null && p.consumo !== undefined ? (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50/80 text-blue-600 font-bold text-[9px]">
                                                                {p.consumo} {service.unidad_medida}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-slate-700 font-medium">{formatCurrency(p.monto_total)}</td>
                                                </tr>
                                            ))}
                                            {yearlyPayments.length === 0 && (
                                                <tr>
                                                    <td colSpan="4" className="px-3 py-6 text-center text-slate-400 font-medium italic bg-white">
                                                        Ninguna boleta registrada para este año
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ServiceDetailModal;
