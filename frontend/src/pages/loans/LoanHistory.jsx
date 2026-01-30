import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Search, Calendar, FileText, CheckCircle, Clock } from 'lucide-react';
import Pagination from '../../components/common/Pagination';
import FilterBar from '../../components/common/FilterBar';

const LoanHistory = () => {
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);

    // Pagination & Search
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, active, returned

    const fetchLoans = async (page = 1, search = '', status = 'all') => {
        setLoading(true);
        try {
            const params = { page, search };

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
        fetchLoans(currentPage, searchQuery, statusFilter);
    }, [currentPage, statusFilter]);

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

    const filteredLoans = loans; // Filtering is now server-side

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return `${date.toLocaleDateString('es-CL')} ${date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Historial de Préstamos</h2>
                    <p className="text-slate-500">Registro completo de movimientos de llaves.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <select
                        value={statusFilter}
                        onChange={handleStatusChange}
                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="active">Activos (Prestados)</option>
                        <option value="returned">Devueltos</option>
                    </select>
                    <div className="w-full md:w-64">
                        <FilterBar onSearch={handleSearch} placeholder="Buscar por llave, solicitante..." />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Llave / Establecimiento</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Solicitante</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Préstamo</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Devolución</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredLoans.map(loan => (
                            <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3">
                                    {loan.fecha_devolucion ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            <CheckCircle className="w-3 h-3" /> Devuelto
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            <Clock className="w-3 h-3" /> Activo
                                        </span>
                                    )}
                                </td>
                                <td className="p-5">
                                    <div className="font-semibold text-slate-900">{loan.llave_obj?.nombre}</div>
                                    <div className="text-xs text-slate-500">{loan.llave_obj?.establecimiento_nombre}</div>
                                </td>
                                <td className="p-5">
                                    <div className="text-slate-900">{loan.solicitante_obj?.nombre} {loan.solicitante_obj?.apellido}</div>
                                    <div className="text-xs text-slate-500">{loan.solicitante_obj?.rut}</div>
                                </td>
                                <td className="p-5 text-sm text-slate-600">
                                    {formatDate(loan.fecha_prestamo)}
                                </td>
                                <td className="p-5 text-sm text-slate-600">
                                    {formatDate(loan.fecha_devolucion)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredLoans.length === 0 && !loading && (
                    <div className="p-12 text-center text-slate-400">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No se encontraron registros.</p>
                    </div>
                )}
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    totalCount={totalCount}
                />
            </div>
        </div>
    );
};

export default LoanHistory;
