import React, { useEffect, useState } from 'react';
import api from '../../api';
import { Link } from 'react-router-dom';
import { Clock, User, Key as KeyIcon, CheckCircle, Search, AlertCircle } from 'lucide-react';
import Pagination from '../../components/common/Pagination';
import SortableHeader from '../../components/common/SortableHeader';
import FilterBar from '../../components/common/FilterBar';
import ReturnLoanModal from '../../components/loans/ReturnLoanModal';

const Dashboard = () => {
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [showReturnModal, setShowReturnModal] = useState(false);

    // Pagination & Search
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [ordering, setOrdering] = useState('-fecha_prestamo');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = async (page = 1, order = ordering) => {
        setLoading(true);
        try {
            const params = {
                page,
                search: searchQuery, // Use searchQuery from state
                active: 'true',
                ordering: order
            };
            const response = await api.get('prestamos/', { params });

            // Handle Pagination
            setLoans(response.data.results || []);
            setTotalCount(response.data.count || 0);
            setTotalPages(Math.ceil((response.data.count || 0) / 10)); // Assuming page_size 10
        } catch (error) {
            console.error("Error fetching loans:", error);
            setLoans([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(currentPage, ordering);
    }, [currentPage, ordering, searchQuery]); // Added searchQuery to dependencies

    const handleSearch = (query) => {
        setSearchQuery(query);
        setCurrentPage(1);
        // No need to call fetchData here, useEffect will react to searchQuery change
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleSort = (newOrdering) => {
        setOrdering(newOrdering);
        setCurrentPage(1);
    };

    const handleReturnClick = (loan) => {
        setSelectedLoan(loan);
        setShowReturnModal(true);
    };

    const handleConfirmReturn = async (id) => {
        try {
            await api.post(`prestamos/${id}/devolver/`);
            setShowReturnModal(false);
            fetchData(currentPage, ordering);
        } catch (error) {
            alert("Error al devolver la llave");
            console.error(error);
        }
    };

    if (loading && currentPage === 1) return (
        <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div>
            {/* Stats / Header Area */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
                    <h3 className="text-white/80 font-medium mb-1">Total Activos</h3>
                    <div className="text-4xl font-bold">{totalCount}</div>
                    <div className="flex items-center gap-1 text-sm text-blue-100 mt-2">
                        <KeyIcon className="w-4 h-4" />
                        <span>Llaves prestadas actualmente</span>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-slate-500 font-medium mb-1">Fecha</h3>
                        <div className="text-2xl font-bold text-slate-800">{new Date().toLocaleDateString('es-CL')}</div>
                    </div>
                    <Clock className="w-10 h-10 text-blue-100" />
                </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                <div className="space-y-4 flex-1">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
                        Panel de Préstamos
                    </h2>
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                        <div className="w-full md:max-w-md">
                            <FilterBar onSearch={handleSearch} placeholder="Buscar por llave o solicitante..." />
                        </div>
                        <select
                            value={ordering}
                            onChange={(e) => handleSort(e.target.value)}
                            className="w-full md:w-auto flex-shrink-0 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="-fecha_prestamo">Más recientes primero</option>
                            <option value="fecha_prestamo">Más antiguos primero</option>
                            <option value="llave__nombre">Llave (A-Z)</option>
                            <option value="-llave__nombre">Llave (Z-A)</option>
                            <option value="solicitante__nombre">Solicitante (A-Z)</option>
                        </select>
                    </div>
                </div>

                <Link
                    to="/keys"
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 font-medium whitespace-nowrap"
                >
                    <KeyIcon className="w-5 h-5" />
                    <span>Gestionar Inventario</span>
                </Link>
            </div>

            {loans.length === 0 && !loading ? (
                <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-100 text-center">
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Todo en orden</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">No hay llaves prestadas en este momento (según los criterios de búsqueda).</p>
                </div>
            ) : (
                <>
                    <ReturnLoanModal
                        isOpen={showReturnModal}
                        onClose={() => setShowReturnModal(false)}
                        onConfirm={handleConfirmReturn}
                        loanData={selectedLoan}
                    />
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
                        {loans.map((loan) => (
                            <div key={loan.id} className="group bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-blue-100 transition-all duration-300 flex flex-col justify-between overflow-hidden">
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                            {loan.llave_obj?.nombre}
                                        </h3>
                                        <span className="relative flex h-3 w-3 mt-1">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 mb-6 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                        {loan.llave_obj?.establecimiento_nombre}
                                    </p>

                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                <User className="w-4 h-4 text-slate-500" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Solicitante</p>
                                                <p className="text-sm font-semibold text-slate-700">{loan.solicitante_obj?.nombre} {loan.solicitante_obj?.apellido}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                <Clock className="w-4 h-4 text-slate-500" />
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">Fecha Préstamo</div>
                                                <p className="text-sm font-semibold text-slate-700">
                                                    {new Date(loan.fecha_prestamo).toLocaleDateString('es-CL')}
                                                    <span className="text-slate-400 font-normal ml-1">
                                                        {new Date(loan.fecha_prestamo).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50 border-t border-slate-100 group-hover:bg-blue-50/30 transition-colors">
                                    <button
                                        onClick={() => handleReturnClick(loan)}
                                        className="w-full py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-800 hover:text-white hover:border-slate-800 transition-all font-medium text-sm flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        Registrar Devolución
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        totalCount={totalCount}
                    />
                </>
            )}
        </div>
    );
};

export default Dashboard;
