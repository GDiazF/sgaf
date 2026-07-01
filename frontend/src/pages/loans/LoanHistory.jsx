import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Search, Calendar, FileText, CheckCircle2, Clock, Filter, ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Pagination from '../../components/common/Pagination';

const LoanHistory = () => {
    const navigate = useNavigate();
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);

    // Pagination, Page Size & Search
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, active, returned
    const [ordering, setOrdering] = useState('-fecha_prestamo');

    const fetchLoans = async (page = 1, search = searchQuery, status = statusFilter, order = ordering) => {
        setLoading(true);
        try {
            const params = {
                page,
                search,
                ordering: order,
                page_size: pageSize
            };

            // Map status filter to API params
            if (status === 'active') {
                params.fecha_devolucion__isnull = 'true';
            } else if (status === 'returned') {
                params.fecha_devolucion__isnull = 'false';
            }

            const response = await api.get('prestamos/', { params });

            setLoans(response.data.results || []);
            setTotalCount(response.data.count || 0);
            setTotalPages(Math.ceil((response.data.count || 0) / pageSize));
        } catch (error) {
            console.error("Error fetching history:", error);
            setLoans([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLoans(currentPage, searchQuery, statusFilter, ordering);
    }, [currentPage, searchQuery, statusFilter, ordering, pageSize]);

    const handleSearch = (query) => {
        setSearchQuery(query);
        setCurrentPage(1);
    };

    const handleStatusChange = (status) => {
        setStatusFilter(status);
        setCurrentPage(1);
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleSort = (newOrdering) => {
        setOrdering(newOrdering);
        setCurrentPage(1);
    };

    const formatDate = (dateString) => {
        if (!dateString) return <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">-</span>;
        const date = new Date(dateString);
        return (
            <div className="flex flex-col leading-tight select-none">
                <span className="font-semibold text-slate-700 text-xs">{date.toLocaleDateString('es-CL')}</span>
                <span className="text-[9px] text-slate-450 font-medium mt-0.5">
                    {date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs
                </span>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden">
            {/* Header Area */}
            <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/loans')}
                        className="p-1.5 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-650 active:scale-90 shrink-0"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase select-none">Historial de Préstamos</h2>
                        <div className="flex items-center gap-2 mt-1.5">
                            <p className="text-[10px] md:text-xs font-medium text-slate-500 uppercase ml-0 select-none">Registro completo de movimientos y activos.</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 select-none">
                    <button
                        type="button"
                        onClick={() => handleStatusChange('all')}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/10' : 'text-slate-400 hover:text-slate-650'}`}
                    >
                        Todos
                    </button>
                    <button
                        type="button"
                        onClick={() => handleStatusChange('active')}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === 'active' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/10' : 'text-slate-400 hover:text-indigo-600'}`}
                    >
                        Activos
                    </button>
                    <button
                        type="button"
                        onClick={() => handleStatusChange('returned')}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === 'returned' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/10' : 'text-slate-400 hover:text-emerald-600'}`}
                    >
                        Devueltos
                    </button>
                </div>
            </div>

            {/* Refined Filter Bar */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3 items-center shrink-0">
                <div className="relative flex-1 w-full shrink-0">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input 
                        type="text" 
                        placeholder="BUSCAR POR ACTIVO, ESTABLECIMIENTO O RESPONSABLE..."
                        className="no-global w-full h-10 text-[10px] font-bold bg-white border border-slate-200 pl-10 pr-4 rounded-xl outline-none focus:border-indigo-500 uppercase transition-all shadow-sm placeholder:text-slate-350"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
                    <div className="relative w-full sm:w-28 shrink-0">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase tracking-widest pointer-events-none z-10">Ver:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="no-global w-full text-[10px] font-black uppercase tracking-widest pl-11 pr-8 h-10 rounded-xl border border-slate-200 outline-none cursor-pointer appearance-none bg-white text-slate-700 focus:border-indigo-500 shadow-sm bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem_1rem] bg-[right_0.5rem_center] bg-no-repeat"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>

                    <div className="relative w-full sm:w-44 shrink-0">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase tracking-widest pointer-events-none z-10">Orden:</span>
                        <select
                            value={ordering}
                            onChange={(e) => handleSort(e.target.value)}
                            className="no-global w-full text-[10px] font-black uppercase tracking-widest pl-16 pr-8 h-10 rounded-xl border border-slate-200 outline-none cursor-pointer appearance-none bg-white text-slate-700 focus:border-indigo-500 shadow-sm bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem_1rem] bg-[right_0.5rem_center] bg-no-repeat"
                        >
                            <option value="-fecha_prestamo">RECIENTES</option>
                            <option value="fecha_prestamo">ANTIGUOS</option>
                            <option value="activo__nombre">ACTIVO</option>
                            <option value="solicitante__nombre">RESPONSABLE</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table Area (Zero-Scroll Internal Scroll) */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-0 relative">
                {loading ? (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-[99] flex flex-col items-center justify-center gap-3">
                        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest animate-pulse">Cargando historial de préstamos...</p>
                    </div>
                ) : loans.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center flex-grow select-none">
                        <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center mb-3">
                            <FileText className="w-6 h-6 text-slate-350" />
                        </div>
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Sin Resultados</h3>
                        <p className="text-slate-450 font-medium text-[10px] uppercase tracking-wide max-w-[280px] mt-1.5">No se encontraron registros que coincidan con los filtros de búsqueda.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-y-auto flex-grow custom-scrollbar">
                            <table className="w-full text-left border-collapse border-spacing-0">
                                <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                                    <tr className="border-b border-slate-200">
                                        <th className="py-2 pl-8 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 w-28">Estado</th>
                                        <th className="py-2 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">Activo / Establecimiento</th>
                                        <th className="py-2 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">Responsable</th>
                                        <th className="py-2 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">Observación</th>
                                        <th className="py-2 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">Fecha Préstamo</th>
                                        <th className="py-2 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">Fecha Devolución</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {loans.map((loan) => (
                                        <tr key={loan.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="py-1.5 pl-8">
                                                {loan.fecha_devolucion ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 select-none">
                                                        <CheckCircle2 className="w-2.5 h-2.5" /> Devuelto
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest bg-indigo-50 text-indigo-650 border border-indigo-100 select-none">
                                                        <Clock className="w-2.5 h-2.5" /> Activo
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-1.5 px-3">
                                                <div className="font-semibold text-slate-700 text-xs leading-tight uppercase">{loan.activo_obj?.nombre}</div>
                                                <div className="text-[9px] text-slate-400 font-medium uppercase tracking-wider mt-0.5 truncate">{loan.activo_obj?.establecimiento_nombre}</div>
                                            </td>
                                            <td className="py-1.5 px-3">
                                                <div className="text-xs font-semibold text-slate-700 leading-tight uppercase">{loan.solicitante_obj?.nombre} {loan.solicitante_obj?.apellido}</div>
                                                <div className="text-[9px] text-slate-400 font-medium font-mono mt-0.5 uppercase">RUT: {loan.solicitante_obj?.rut || 'Sin RUT'}</div>
                                            </td>
                                            <td className="py-1.5 px-3">
                                                <div className="text-[10px] text-slate-500 font-medium truncate max-w-[180px] uppercase" title={loan.observacion}>
                                                    {loan.observacion || '-'}
                                                </div>
                                            </td>
                                            <td className="py-1.5 px-3">
                                                {formatDate(loan.fecha_prestamo)}
                                            </td>
                                            <td className="py-1.5 px-3">
                                                {formatDate(loan.fecha_devolucion)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Bottom Pagination Bar */}
                        <div className="p-3 border-t border-slate-150 bg-slate-50/50 shrink-0">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                                totalCount={totalCount}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default LoanHistory;
