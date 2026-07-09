import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';
import { AlertCircle, FileDown, Building2, FileText, Loader2, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import Pagination from '../../components/common/Pagination';
import SortableHeader from '../../components/common/SortableHeader';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { INPUT_FILTER, LOADER_SPIN, PAGE_LAYOUT, SELECT_FILTER, TABLE_PANEL, THEAD_TR, TITLE_ICON_BOX } from '../funcionarios/shared/funcionariosUi';

const FILTER_LABEL = 'block text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1';
const DATE_FILTER = 'no-global w-full min-w-0 h-10 text-[10px] font-bold bg-white border border-slate-200 px-3 rounded-xl outline-none focus:border-blue-500 uppercase transition-all shadow-sm cursor-pointer text-slate-700';
const BTN_EXCEL = 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 h-10 min-h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all inline-flex items-center justify-center gap-2 shrink-0 active:scale-95 border border-emerald-100 leading-none box-border';
const TABLE_TD = 'px-4 py-2 border-r border-slate-50 text-[11px] font-medium text-slate-500 uppercase tracking-tighter';
const TABLE_TD_MAIN = 'px-4 py-2 border-r border-slate-50 text-[11px] font-medium text-slate-700 uppercase tracking-tighter';
const STATUS_BADGE = 'px-2 py-0.5 rounded-lg text-[9px] font-black border uppercase tracking-tighter';
const MotionDiv = motion.div;

const PaymentsReport = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
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
    const debouncedSearchTerm = useDebouncedValue(searchTerm);

    const fetchData = useCallback(async (page = 1, size = pageSize, search = debouncedSearchTerm) => {
        setLoading(true);
        setErrorMessage('');
        try {
            const params = {
                page,
                page_size: size,
                ordering: ordering,
            };

            if (startDate) params.fecha_pago__gte = startDate;
            if (endDate) params.fecha_pago__lte = endDate;
            if (selectedEstablishment) {
                if (selectedEstablishment === 'JARDINES') {
                    params.establecimiento__tipo__area_gestion = 'JARDIN';
                } else if (selectedEstablishment === 'COLEGIOS') {
                    params.establecimiento__tipo__area_gestion = 'ESTABLECIMIENTO';
                } else {
                    params.establecimiento = selectedEstablishment;
                }
            }
            if (selectedProvider) params.servicio__proveedor = selectedProvider;
            if (search) params.search = search;

            const response = await api.get('registros-pagos/', { params });
            const data = response.data.results || response.data || [];
            const count = response.data.count || (Array.isArray(data) ? data.length : 0);

            setPayments(Array.isArray(data) ? data : []);
            setTotalCount(count);
            setTotalPages(Math.max(1, Math.ceil(count / size)));
        } catch (error) {
            console.error("Error fetching report data:", error);
            setErrorMessage('No se pudieron cargar los registros del reporte.');
        } finally {
            setLoading(false);
        }
    }, [debouncedSearchTerm, endDate, ordering, pageSize, selectedEstablishment, selectedProvider, startDate]);

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
        fetchData(currentPage, pageSize, debouncedSearchTerm);
    }, [currentPage, pageSize, debouncedSearchTerm, fetchData]);

    const handleExport = async () => {
        setErrorMessage('');
        try {
            const params = {
                servicio__proveedor: selectedProvider
            };
            if (startDate) params.fecha_pago__gte = startDate;
            if (endDate) params.fecha_pago__lte = endDate;
            if (selectedEstablishment) {
                if (selectedEstablishment === 'JARDINES') {
                    params.establecimiento__tipo__area_gestion = 'JARDIN';
                } else if (selectedEstablishment === 'COLEGIOS') {
                    params.establecimiento__tipo__area_gestion = 'ESTABLECIMIENTO';
                } else {
                    params.establecimiento = selectedEstablishment;
                }
            }
            if (debouncedSearchTerm) params.search = debouncedSearchTerm;
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
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error exporting excel:", error);
            setErrorMessage('No se pudo descargar el reporte en Excel.');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount || 0);
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return date.split('-').reverse().join('/');
    };

    return (
        <div className={PAGE_LAYOUT}>
            {/* Contenedor Superior (Cabecera Estándar - Sección 1 y 4 de UI) */}
            <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                <div>
                    <div className="flex items-center gap-3">
                        <div className={TITLE_ICON_BOX}>
                            <FileText className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase">REPORTE CONSUMOS</h2>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                        <p className="text-[10px] md:text-xs font-medium text-slate-500 ml-0">CONSULTA HISTÓRICA DE CONSUMOS, FACTURACIÓN Y PAGOS CORPORATIVOS.</p>
                    </div>
                </div>
                <button
                    onClick={handleExport}
                    className={BTN_EXCEL}
                >
                    <FileDown className="w-4 h-4" />
                    DESCARGAR EXCEL
                </button>
            </div>

            {/* Barra de Filtros en Una Sola Fila Unificada (Sección 9 y 20 de UI) */}
            <div className="shrink-0 w-full bg-slate-50 p-2.5 md:p-3 rounded-xl border border-slate-200">
                <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-12 gap-2 md:gap-3 items-end">
                    
                    {/* Buscador de Texto (Perfectamente Alineado) */}
                    <div className="space-y-1 col-span-2 md:col-span-3 lg:col-span-3">
                        <label className={FILTER_LABEL}>BUSCAR</label>
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                name="search"
                                placeholder="CLIENTE, FACTURA O JARDÍN..."
                                className={INPUT_FILTER}
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            />
                        </div>
                    </div>

                    {/* Selector Desde (Native Input para evitar desalineación de DateInput) */}
                    <div className="space-y-1 col-span-1 md:col-span-1 lg:col-span-2 min-w-0">
                        <label className={FILTER_LABEL}>DESDE</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                            className={DATE_FILTER}
                        />
                    </div>

                    {/* Selector Hasta (Native Input para evitar desalineación de DateInput) */}
                    <div className="space-y-1 col-span-1 md:col-span-1 lg:col-span-2 min-w-0">
                        <label className={FILTER_LABEL}>HASTA</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                            className={DATE_FILTER}
                        />
                    </div>

                    {/* Selector Establecimiento */}
                    <div className="space-y-1 col-span-1 md:col-span-2 lg:col-span-2 min-w-0">
                        <label className={FILTER_LABEL}>ESTABLEC.</label>
                        <select
                            value={selectedEstablishment}
                            onChange={(e) => { setSelectedEstablishment(e.target.value); setCurrentPage(1); }}
                            className={`${SELECT_FILTER} w-full min-w-0`}
                        >
                            <option value="">TODOS</option>
                            <option value="JARDINES">TODOS LOS JARDINES</option>
                            <option value="COLEGIOS">TODOS LOS COLEGIOS</option>
                            {establishments.map(e => <option key={e.id} value={e.id}>{e.nombre.toUpperCase()}</option>)}
                        </select>
                    </div>

                    {/* Selector Proveedor */}
                    <div className="space-y-1 col-span-1 md:col-span-2 lg:col-span-2 min-w-0">
                        <label className={FILTER_LABEL}>PROVEEDOR</label>
                        <select
                            value={selectedProvider}
                            onChange={(e) => { setSelectedProvider(e.target.value); setCurrentPage(1); }}
                            className={`${SELECT_FILTER} w-full min-w-0`}
                        >
                            <option value="">TODOS LOS PROVEEDORES</option>
                            {providers.map(p => <option key={p.id} value={p.id}>{p.nombre.toUpperCase()}</option>)}
                        </select>
                    </div>

                    {/* Selector Registros */}
                    <div className="space-y-1 col-span-1 md:col-span-1 lg:col-span-1 min-w-0">
                        <label className={FILTER_LABEL}>REG.</label>
                        <select
                            value={pageSize}
                            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                            className={`${SELECT_FILTER} w-full min-w-0`}
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>

                </div>
            </div>

            {errorMessage && (
                <div className="shrink-0 bg-rose-50 text-rose-600 text-[10px] font-bold uppercase p-3 rounded-xl border border-rose-100 flex gap-2 items-center">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {errorMessage}
                </div>
            )}

            {/* Results Table con Zero-Scroll (Strict UI Section 4 - Sin Negritas Molestas) */}
            <div className={`${TABLE_PANEL} bg-white`}>
                
                {/* Mobile Cards View */}
                <div className="lg:hidden p-3 flex flex-col gap-3 overflow-auto custom-scrollbar">
                    {loading && payments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 h-full flex-1 gap-3">
                            <Loader2 className={LOADER_SPIN} />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cargando Datos...</span>
                        </div>
                    ) : payments.map(p => (
                        <MotionDiv
                            key={p.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3 hover:border-blue-200/60 transition-all"
                        >
                            <div className="flex justify-between items-start gap-3">
                                <div className="space-y-1 min-w-0">
                                    <h3 className="font-medium text-slate-800 text-[12px] leading-tight uppercase line-clamp-2">{p.establecimiento_nombre}</h3>
                                    <p className="text-[9px] font-medium text-blue-600 uppercase tracking-widest line-clamp-1">{p.servicio_proveedor_nombre}</p>
                                </div>
                                <span className={`${STATUS_BADGE} shrink-0 ${p.recepcion_conforme ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                    {p.recepcion_conforme ? 'Con RC' : 'Pendiente'}
                                </span>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-slate-500 font-medium">Fecha de Pago:</span>
                                    <span className="font-medium text-slate-700">{formatDate(p.fecha_pago)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-slate-500 font-medium">N° Cliente:</span>
                                    <span className="font-mono text-blue-600 font-medium bg-blue-50/50 px-1.5 py-0.5 rounded border border-blue-100">{p.servicio_numero_cliente || '-'}</span>
                                </div>
                                {p.consumo !== null && p.consumo !== undefined && (
                                    <div className="flex justify-between items-center text-[11px]">
                                        <span className="text-slate-500 font-medium">Consumo:</span>
                                        <span className="font-medium text-blue-600 bg-blue-50/80 px-1.5 py-0.5 rounded border border-blue-100">{p.consumo} {p.servicio_unidad_medida || ''}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-slate-500 font-medium">Documento:</span>
                                    <span className="text-slate-600 font-medium">{p.nro_servicio_factura || 'Fact. Individual'}</span>
                                </div>
                                <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                                    <span className="text-slate-600 font-medium uppercase text-[10px] tracking-wider text-right">Monto Total:</span>
                                    <span className="font-medium text-slate-900 text-sm">{formatCurrency(p.monto_total)}</span>
                                </div>
                            </div>
                        </MotionDiv>
                    ))}
                    {!loading && payments.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-12 text-center h-full flex-1">
                            <Building2 className="w-10 h-10 text-slate-200 mb-3" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No se encontraron registros</span>
                        </div>
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block flex-1 overflow-auto bg-white custom-scrollbar">
                    <table className="w-full text-left border-collapse border-spacing-0 relative">
                        <thead className="sticky top-0 z-10">
                            <tr className={THEAD_TR}>
                                <SortableHeader
                                    label="Fecha Pago"
                                    sortKey="fecha_pago"
                                    currentOrdering={ordering}
                                    onSort={() => {
                                        setOrdering((prev) => (prev === 'fecha_pago' ? '-fecha_pago' : 'fecha_pago'));
                                        setCurrentPage(1);
                                    }}
                                    className="px-4 py-3 border-r border-slate-100"
                                />
                                <th className="px-4 py-3 border-r border-slate-100">Establecimiento</th>
                                <th className="px-4 py-3 border-r border-slate-100">Proveedor</th>
                                <th className="px-4 py-3 border-r border-slate-100 text-center">Nro Cliente</th>
                                <th className="px-4 py-3 border-r border-slate-100 text-center">Consumo</th>
                                <th className="px-4 py-3 border-r border-slate-100 text-right">Monto Total</th>
                                <th className="px-4 py-3 text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && payments.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-4 py-12">
                                        <div className="flex flex-col items-center justify-center p-12 h-full flex-1 gap-3">
                                            <Loader2 className={LOADER_SPIN} />
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cargando Datos...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                payments.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className={`${TABLE_TD} whitespace-nowrap`}>
                                            {formatDate(p.fecha_pago)}
                                        </td>
                                        <td className={TABLE_TD_MAIN}>
                                            <span className="block truncate max-w-[260px]" title={p.establecimiento_nombre}>{p.establecimiento_nombre || '-'}</span>
                                        </td>
                                        <td className={`${TABLE_TD} whitespace-nowrap`} title={p.servicio_proveedor_nombre}>
                                            <span className="block truncate max-w-[180px]">{p.servicio_proveedor_nombre || '-'}</span>
                                        </td>
                                        <td className={`${TABLE_TD} text-center font-mono text-blue-600`}>
                                            {p.servicio_numero_cliente || '-'}
                                        </td>
                                        <td className="px-4 py-2 border-r border-slate-50 text-center">
                                            {p.consumo !== null && p.consumo !== undefined ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 font-medium text-[10px] border border-blue-100 uppercase tracking-tighter">
                                                    {p.consumo} {p.servicio_unidad_medida || ''}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-2 border-r border-slate-50 text-right">
                                            <span className="text-[11px] font-medium text-slate-700 leading-none">{formatCurrency(p.monto_total)}</span>
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <span className={`${STATUS_BADGE} ${p.recepcion_conforme ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                {p.recepcion_conforme ? 'Con RC' : 'Pendiente'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                            {payments.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="7" className="px-4 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center p-12 text-center h-full flex-1">
                                            <Building2 className="w-10 h-10 text-slate-200 mb-3" />
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No se encontraron registros</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Paginación Fijo (Sección 10) */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 shrink-0">
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
