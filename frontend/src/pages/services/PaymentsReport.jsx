import React, { useState, useEffect } from 'react';
import api from '../../api';
import { FileDown, Calendar, Building2, Zap, Search, Filter } from 'lucide-react';
import DateInput from '../../components/common/DateInput';
import Pagination from '../../components/common/Pagination';
import SortableHeader from '../../components/common/SortableHeader';

const PaymentsReport = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [establishments, setEstablishments] = useState([]);
    const [providers, setProviders] = useState([]);

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedEstablishment, setSelectedEstablishment] = useState('');
    const [selectedProvider, setSelectedProvider] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [ordering, setOrdering] = useState('-fecha_pago');

    const fetchData = async (page = 1, size = pageSize) => {
        setLoading(true);
        try {
            const params = {
                page,
                page_size: size,
                ordering: ordering,
                fecha_pago__gte: startDate,
                fecha_pago__lte: endDate,
                establecimiento: selectedEstablishment,
                servicio__proveedor: selectedProvider
            };

            const response = await api.get('registros-pagos/', { params });
            setPayments(response.data.results || []);
            setTotalCount(response.data.count || 0);
            setTotalPages(Math.ceil((response.data.count || 0) / size));
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
                setEstablishments(estRes.data.results || estRes.data);
                setProviders(provRes.data.results || provRes.data);
            } catch (error) {
                console.error("Error fetching lookups:", error);
            }
        };
        fetchLookups();
    }, []);

    useEffect(() => {
        fetchData(currentPage, pageSize);
    }, [currentPage, pageSize, ordering, startDate, endDate, selectedEstablishment, selectedProvider]);

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
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Reporte de Consumos</h2>
                    <p className="text-slate-500 text-sm">Consulta histórica de pagos y facturación corporativa.</p>
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 font-bold"
                >
                    <FileDown className="w-5 h-5" />
                    <span>Descargar Excel</span>
                </button>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Fecha Inicio</label>
                        <DateInput value={startDate} onChange={setStartDate} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Fecha Fin</label>
                        <DateInput value={endDate} onChange={setEndDate} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Establecimiento</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select
                                value={selectedEstablishment}
                                onChange={(e) => { setSelectedEstablishment(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
                            >
                                <option value="">Todos los Jardines</option>
                                {establishments.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Proveedor</label>
                        <div className="relative">
                            <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select
                                value={selectedProvider}
                                onChange={(e) => { setSelectedProvider(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
                            >
                                <option value="">Todos los Proveedores</option>
                                {providers.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors" onClick={() => setOrdering(ordering === 'fecha_pago' ? '-fecha_pago' : 'fecha_pago')}>
                                    Fecha Pago {ordering.includes('fecha_pago') && (ordering.startsWith('-') ? '↓' : '↑')}
                                </th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Establecimiento</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Proveedor</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Nro Cliente</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">Monto Total</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="6" className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : payments.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400 italic text-sm">
                                        No se encontraron registros para los filtros seleccionados.
                                    </td>
                                </tr>
                            ) : (
                                payments.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 text-xs font-bold text-slate-700">
                                            {p.fecha_pago ? p.fecha_pago.split('-').reverse().join('/') : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-bold text-slate-700">{p.establecimiento_nombre}</div>
                                            <div className="text-[10px] text-slate-400 font-medium">RBD: {establishments?.find(e => e.id === p.establecimiento)?.rbd || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-bold text-slate-700">{p.servicio_proveedor_nombre}</div>
                                            <div className="text-[10px] text-slate-400 font-medium">{p.nro_servicio_factura ? `Fact. Corp: ${p.nro_servicio_factura}` : 'Fact. Individual'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono font-bold text-blue-600">
                                            {p.servicio_numero_cliente}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-black text-slate-800 text-right">
                                            {formatCurrency(p.monto_total)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {p.recepcion_conforme ? (
                                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-tight">Con RC</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-tight">Pendiente</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalCount={totalCount}
                    pageSize={pageSize}
                    onPageSizeChange={setPageSize}
                />
            </div>
        </div>
    );
};

export default PaymentsReport;
