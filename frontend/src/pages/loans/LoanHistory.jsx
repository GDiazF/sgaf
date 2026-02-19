import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Search, Calendar, FileText, CheckCircle, Clock, Filter, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Pagination from '../../components/common/Pagination';
import FilterBar from '../../components/common/FilterBar';
import SortableHeader from '../../components/common/SortableHeader';

const LoanHistory = () => {
    const navigate = useNavigate();
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);

    // Pagination & Search
    const [currentPage, setCurrentPage] = useState(1);
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
                ordering: order
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
            setTotalPages(Math.ceil((response.data.count || 0) / 10));
        } catch (error) {
            console.error("Error fetching history:", error);
            setLoans([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLoans(currentPage, searchQuery, statusFilter, ordering);
    }, [currentPage, statusFilter, ordering]);

    const handleSearch = (query) => {
        setSearchQuery(query);
        setCurrentPage(1);
        fetchLoans(1, query, statusFilter);
    };

    const handleStatusChange = (e) => {
        setStatusFilter(e.target.value);
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
        if (!dateString) return '-';
        const date = new Date(dateString);
        return (
            <div className="flex flex-col leading-tight">
                <span className="font-bold text-slate-700 text-[11px]">{date.toLocaleDateString('es-CL')}</span>
                <span className="text-[9px] text-slate-400 font-medium">
                    {date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs
                </span>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-6 pb-12 w-full">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/loans')}
                        className="flex items-center gap-1.5 text-slate-400 hover:text-blue-600 transition-colors text-[11px] font-black uppercase tracking-widest group"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                        Volver
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Historial de Préstamos</h2>
                        <p className="text-slate-500 font-medium text-xs mt-1.5">Registro completo de movimientos y activos.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setStatusFilter('active')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Activos
                    </button>
                    <button
                        onClick={() => setStatusFilter('returned')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === 'returned' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Devueltos
                    </button>
                </div>
            </div>

            {/* Refined Filter Bar */}
            <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center gap-2 mb-6">
                <div className="flex-1">
                    <FilterBar
                        onSearch={handleSearch}
                        placeholder="Buscar por llave, establecimiento o solicitante..."
                        inputClassName="!shadow-none"
                    />
                </div>
                <div className="flex items-center gap-2 px-4 py-2 border-l border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Ordenar:</span>
                    <select
                        value={ordering}
                        onChange={(e) => handleSort(e.target.value)}
                        className="bg-transparent text-[11px] font-black text-slate-700 focus:outline-none cursor-pointer hover:text-blue-600 transition-colors"
                    >
                        <option value="-fecha_prestamo">Recientes</option>
                        <option value="fecha_prestamo">Antiguos</option>
                        <option value="llave__nombre">Llave</option>
                        <option value="solicitante__nombre">Responsable</option>
                    </select>
                </div>
            </div>

            {/* Table Area */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="p-2.5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] pl-8">Estado</th>
                                <SortableHeader
                                    label="Llave / Establecimiento"
                                    sortKey="llave__nombre"
                                    currentOrdering={ordering}
                                    onSort={handleSort}
                                    className="p-2.5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]"
                                />
                                <SortableHeader
                                    label="Solicitante"
                                    sortKey="solicitante__nombre"
                                    currentOrdering={ordering}
                                    onSort={handleSort}
                                    className="p-2.5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]"
                                />
                                <SortableHeader
                                    label="Fecha Préstamo"
                                    sortKey="fecha_prestamo"
                                    currentOrdering={ordering}
                                    onSort={handleSort}
                                    className="p-2.5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]"
                                />
                                <SortableHeader
                                    label="Fecha Devolución"
                                    sortKey="fecha_devolucion"
                                    currentOrdering={ordering}
                                    onSort={handleSort}
                                    className="p-2.5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]"
                                />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loans.map((loan, idx) => (
                                <motion.tr
                                    key={loan.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    className="group hover:bg-slate-50/50 transition-colors"
                                >
                                    <td className="p-2.5 pl-8">
                                        {loan.fecha_devolucion ? (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-green-50 text-green-600 border border-green-100">
                                                <CheckCircle className="w-2.5 h-2.5" /> Devuelto
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100">
                                                <Clock className="w-2.5 h-2.5" /> Activo
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-2.5">
                                        <div className="font-bold text-slate-900 text-[11px] leading-tight">{loan.llave_obj?.nombre}</div>
                                        <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider mt-0">{loan.llave_obj?.establecimiento_nombre}</div>
                                    </td>
                                    <td className="p-2.5">
                                        <div className="text-[11px] font-bold text-slate-700 leading-tight">{loan.solicitante_obj?.nombre} {loan.solicitante_obj?.apellido}</div>
                                        <div className="text-[9px] text-slate-400 font-medium font-mono">ID: {loan.solicitante_obj?.rut}</div>
                                    </td>
                                    <td className="p-2.5">
                                        {formatDate(loan.fecha_prestamo)}
                                    </td>
                                    <td className="p-2.5">
                                        {formatDate(loan.fecha_devolucion)}
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {loans.length === 0 && !loading && (
                    <div className="p-20 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                            <FileText className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Sin resultados</h3>
                        <p className="text-sm text-slate-400">No se encontraron registros que coincidan con los filtros.</p>
                    </div>
                )}

                <div className="p-6 border-t border-slate-50 bg-slate-50/30">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        totalCount={totalCount}
                    />
                </div>
            </div>
        </div>
    );
};

export default LoanHistory;
