import React, { useState, useEffect } from 'react';
import api from '../../api';
import { FileDown, Calendar, Building2, Zap, Search, Filter, Hash, CreditCard, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DateInput from '../../components/common/DateInput';
import Pagination from '../../components/common/Pagination';
import SortableHeader from '../../components/common/SortableHeader';

const PaymentsReport = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [establishments, setEstablishments] = useState([]);
    const [providers, setProviders] = useState([]);

    // Filters
    const [startDate, setStartDate] = useState(`${new Date().getFullYear()}-01-01`);
    const [endDate, setEndDate] = useState('');
    const [selectedEstablishment, setSelectedEstablishment] = useState('');
    const [selectedProvider, setSelectedProvider] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [ordering, setOrdering] = useState('-fecha_pago');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async (page = 1, size = pageSize) => {
        setLoading(true);
        try {
            const params = {
                page,
                page_size: size,
                ordering: ordering,
            };

            if (startDate) params.fecha_pago__gte = startDate;
            if (endDate) params.fecha_pago__lte = endDate;
            if (selectedEstablishment) params.establecimiento = selectedEstablishment;
            if (selectedProvider) params.servicio__proveedor = selectedProvider;
            if (searchTerm) params.search = searchTerm;

            const response = await api.get('registros-pagos/', { params });
            const data = response.data.results || response.data || [];
            const count = response.data.count || (Array.isArray(data) ? data.length : 0);

            setPayments(Array.isArray(data) ? data : []);
            setTotalCount(count);
            setTotalPages(Math.ceil(count / size));
        } catch (error) {
            console.error("Error fetching report data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchLookups = async () => {
            try {
                const [estRes, provRes] = await Promise.all([
                    api.get('establecimientos/', { params: { page_size: 1000 } }),
                    api.get('proveedores/', { params: { page_size: 1000 } })
                ]);
                const estData = estRes.data.results || estRes.data || [];
                const provData = provRes.data.results || provRes.data || [];
                setEstablishments(Array.isArray(estData) ? estData : []);
                setProviders(Array.isArray(provData) ? provData : []);
            } catch (error) {
                console.error("Error fetching lookups:", error);
            }
        };
        fetchLookups();
    }, []);

    useEffect(() => {
        fetchData(currentPage, pageSize);
    }, [currentPage, pageSize, ordering, startDate, endDate, selectedEstablishment, selectedProvider, searchTerm]);

    const handleExport = async () => {
        try {
            const params = {
                fecha_inicio: startDate,
                fecha_fin: endDate,
                establecimiento: selectedEstablishment,
                servicio__proveedor: selectedProvider
            };
            const response = await api.get('registros-pagos/export_excel/', {
                params,
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `reporte_consumos_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Error exporting excel:", error);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
    };

    return (
        <div className="flex flex-col w-full lg:h-[calc(100vh-140px)] lg:overflow-hidden">
            {/* Header section with Premium design */}
            <div className="shrink-0 mb-6 lg:mb-4 px-1">
                <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight uppercase leading-none">Reporte Consumos</h2>
                        <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-1.5 flex items-center gap-1.5 uppercase tracking-wide">
                            Consulta histórica de pagos y facturación corporativa.
                        </p>
                    </div>

                    <button
                        onClick={handleExport}
                        className="group relative inline-flex items-center justify-center p-2.5 lg:px-5 lg:py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-[14px] lg:rounded-xl overflow-hidden transition-all hover:bg-emerald-700 active:scale-95 shadow-lg shadow-emerald-500/20 shrink-0"
                    >
                        <FileDown className="w-5 h-5 lg:w-4 lg:h-4 lg:mr-2" />
                        <span className="hidden lg:inline">Descargar Excel</span>
                    </button>
                </div>

                {/* Search & Filters compact bar */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 lg:p-4 mb-4">
                    <div className="flex flex-col gap-4">
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por Nro Cliente, Factura o Nombre de Jardín..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all uppercase placeholder:normal-case"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            />
                        </div>

                        {/* Filters Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            <div className="space-y-1 col-span-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Desde</label>
                                <DateInput value={startDate} onChange={setStartDate} className="!py-1.5 !text-[11px]" />
                            </div>
                            <div className="space-y-1 col-span-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Hasta</label>
                                <DateInput value={endDate} onChange={setEndDate} className="!py-1.5 !text-[11px]" />
                            </div>
                            <div className="space-y-1 col-span-2 md:col-span-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Establecimiento</label>
                                <select
                                    value={selectedEstablishment}
                                    onChange={(e) => { setSelectedEstablishment(e.target.value); setCurrentPage(1); }}
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer"
                                >
                                    <option value="">TODOS LOS JARDINES</option>
                                    {establishments.map(e => <option key={e.id} value={e.id}>{e.nombre.toUpperCase()}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1 col-span-2 md:col-span-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Proveedor</label>
                                <select
                                    value={selectedProvider}
                                    onChange={(e) => { setSelectedProvider(e.target.value); setCurrentPage(1); }}
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer"
                                >
                                    <option value="">TODOS LOS PROVEEDORES</option>
                                    {providers.map(p => <option key={p.id} value={p.id}>{p.nombre.toUpperCase()}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1 col-span-2 md:col-span-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Registros</label>
                                <select
                                    value={pageSize}
                                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer"
                                >
                                    <option value={10}>10 REGISTROS</option>
                                    <option value={20}>20 REGISTROS</option>
                                    <option value={50}>50 REGISTROS</option>
                                    <option value={100}>100 REGISTROS</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Table con Zero-Scroll */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                {/* Mobile Cards View */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-4 p-4 overflow-auto custom-scrollbar">
                    {payments.map(p => (
                        <motion.div
                            key={p.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="space-y-0.5">
                                    <h3 className="font-bold text-slate-800 text-[13px] leading-tight uppercase">{p.establecimiento_nombre}</h3>
                                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{p.servicio_proveedor_nombre}</p>
                                </div>
                                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight ${p.recepcion_conforme ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                                    {p.recepcion_conforme ? 'Con RC' : 'Pendiente'}
                                </span>
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-slate-500 font-medium">Fecha de Pago:</span>
                                    <span className="font-bold text-slate-700">{p.fecha_pago ? p.fecha_pago.split('-').reverse().join('/') : '-'}</span>
                                </div>
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-slate-500 font-medium">N° Cliente:</span>
                                    <span className="font-mono text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">{p.servicio_numero_cliente}</span>
                                </div>
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-slate-500 font-medium">Documento:</span>
                                    <span className="text-slate-600 font-semibold">{p.nro_servicio_factura || 'Fact. Individual'}</span>
                                </div>
                                <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                                    <span className="text-slate-700 font-bold uppercase text-[10px] tracking-wider text-right">Monto Total:</span>
                                    <span className="font-black text-slate-900 text-sm">{formatCurrency(p.monto_total)}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                    {!loading && payments.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-400 font-bold text-sm italic">
                            No se encontraron registros
                        </div>
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left whitespace-nowrap relative">
                        <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                            <tr>
                                <SortableHeader label="Fecha Pago" sortKey="fecha_pago" currentOrdering={ordering} onSort={(k) => setOrdering(ordering === 'fecha_pago' ? '-fecha_pago' : 'fecha_pago')} className="px-4 py-3 text-xs font-semibold text-slate-500 tracking-wider uppercase" />
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 tracking-wider uppercase">Establecimiento</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 tracking-wider uppercase">Proveedor</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 tracking-wider uppercase text-center">Nro Cliente</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 tracking-wider uppercase text-right">Monto Total</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 tracking-wider uppercase text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && payments.length === 0 ? (
                                Array(10).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="6" className="px-6 py-4"><div className="h-4 bg-slate-50 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : (
                                payments.map((p) => (
                                    <tr key={p.id} className="hover:bg-blue-50/20 transition-all group">
                                        <td className="px-6 py-4 text-xs font-bold text-slate-600 tracking-tighter">
                                            {p.fecha_pago ? p.fecha_pago.split('-').reverse().join('/') : '-'}
                                        </td>
                                        <td className="px-4 py-1">
                                            <span className="text-xs font-semibold text-slate-800 uppercase leading-tight truncate max-w-[200px]" title={p.establecimiento_nombre}>{p.establecimiento_nombre}</span>
                                        </td>
                                        <td className="px-4 py-1">
                                            <span className="text-xs font-medium text-slate-600 uppercase truncate max-w-[150px]" title={p.servicio_proveedor_nombre}>{p.servicio_proveedor_nombre}</span>
                                        </td>
                                        <td className="px-4 py-1 text-center font-mono text-[10px] text-blue-600 font-bold">{p.servicio_numero_cliente}</td>
                                        <td className="px-4 py-1 text-right">
                                            <span className="text-[12px] font-bold text-slate-900 leading-none">{formatCurrency(p.monto_total)}</span>
                                        </td>
                                        <td className="px-4 py-1 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight border ${p.recepcion_conforme ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                {p.recepcion_conforme ? 'Con RC' : 'Pendiente'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 bg-slate-50/50 border-t border-slate-200 shrink-0">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalCount={totalCount}
                    />
                </div>
            </div>
        </div>
    );
};

export default PaymentsReport;
