import React, { useEffect, useState } from 'react';
import api from '../../api';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, User, Key as KeyIcon, CheckCircle, Search, Plus, Calendar, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Pagination from '../../components/common/Pagination';
import FilterBar from '../../components/common/FilterBar';
import ReturnLoanModal from '../../components/loans/ReturnLoanModal';

const Dashboard = () => {
    const navigate = useNavigate();
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [showReturnModal, setShowReturnModal] = useState(false);

    // Pagination & Search
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [totalKeys, setTotalKeys] = useState(0);
    const [ordering, setOrdering] = useState('-fecha_prestamo');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = async (page = 1, order = ordering) => {
        setLoading(true);
        try {
            const params = {
                page,
                search: searchQuery,
                active: 'true',
                ordering: order
            };
            const [loansRes, keysRes] = await Promise.all([
                api.get('prestamos/', { params }),
                api.get('llaves/')
            ]);

            setLoans(loansRes.data.results || []);
            setTotalCount(loansRes.data.count || 0);
            setTotalPages(Math.ceil((loansRes.data.count || 0) / 10));
            setTotalKeys(keysRes.data.count || 0);
        } catch (error) {
            console.error("Error fetching loans:", error);
            setLoans([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(currentPage, ordering);
    }, [currentPage, ordering, searchQuery]);

    const handleSearch = (query) => {
        setSearchQuery(query);
        setCurrentPage(1);
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

    return (
        <div className="flex flex-col gap-6 pb-12 w-full">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Gestión de Préstamos</h1>
                    <p className="text-slate-500 font-medium text-xs mt-1.5">Monitoreo y control de llaves institucionales en circulación.</p>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        to="/history"
                        className="flex items-center gap-2 bg-white text-slate-600 px-4 py-2 rounded-xl hover:bg-slate-50 transition-all border border-slate-200 font-bold text-[11px] uppercase tracking-wider shadow-sm active:scale-95"
                    >
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Historial
                    </Link>
                    <Link
                        to="/loans/new"
                        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-500/10 font-black text-[11px] uppercase tracking-[0.1em] active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Préstamo
                    </Link>
                </div>
            </div>

            {/* Structured Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-blue-200 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Préstamos Activos</span>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <KeyIcon className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-slate-900 leading-none">{totalCount}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Llaves fuera</span>
                    </div>
                </div>

                <div className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-slate-300 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Llaves</span>
                        <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center">
                            <KeyIcon className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-slate-900 leading-none">{totalKeys}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">En Inventario</span>
                    </div>
                </div>

                <Link to="/keys" className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-blue-500 transition-all hover:shadow-lg hover:shadow-blue-500/5">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">Gestión Inventario</span>
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-md">
                            <Plus className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-lg font-black text-slate-900 leading-none">Ir al Inventario</span>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                    </div>
                </Link>
            </div>

            {/* Refined Filter Bar */}
            <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center gap-2">
                <div className="flex-1">
                    <FilterBar
                        onSearch={handleSearch}
                        placeholder="Buscar préstamos activos por RUT, responsable o llave..."
                        inputClassName="!shadow-none"
                    />
                </div>
                <div className="flex items-center gap-2 px-4 py-2 border-l border-slate-100 md:border-l lg:border-l">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Ordenar:</span>
                    <select
                        value={ordering}
                        onChange={(e) => handleSort(e.target.value)}
                        className="bg-transparent text-[11px] font-black text-slate-700 focus:outline-none cursor-pointer hover:text-blue-600 transition-colors"
                    >
                        <option value="-fecha_prestamo">Recientes</option>
                        <option value="fecha_prestamo">Antiguos</option>
                        <option value="llave__nombre">Nombre Llave</option>
                        <option value="solicitante__nombre">Responsable</option>
                    </select>
                </div>
            </div>

            {/* Content Area */}
            <AnimatePresence mode="wait">
                {loans.length === 0 && !loading ? (
                    <motion.div
                        key="empty"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-12 rounded-[2rem] border border-slate-100 text-center flex flex-col items-center justify-center min-h-[300px]"
                    >
                        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                            <CheckCircle className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900">Todo en Orden</h3>
                        <p className="text-slate-400 font-medium text-xs max-w-[240px] mt-1">No hay llaves en circulación. Todo el inventario está bajo resguardo.</p>
                    </motion.div>
                ) : (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-6"
                    >
                        <ReturnLoanModal
                            isOpen={showReturnModal}
                            onClose={() => setShowReturnModal(false)}
                            onConfirm={handleConfirmReturn}
                            loanData={selectedLoan}
                        />

                        <div className="bg-white rounded-[1.5rem] border border-slate-200 overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="p-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest pl-6">Responsable</th>
                                            <th className="p-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Llave / Activo</th>
                                            <th className="p-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Desde</th>
                                            <th className="p-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right pr-6">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loans.map((loan, idx) => {
                                            const isInternal = !!loan.solicitante_obj?.funcionario;
                                            return (
                                                <tr key={loan.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="p-2.5 pl-6">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isInternal ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                                                <User className="w-3.5 h-3.5" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <p className="text-[13px] font-black text-slate-900 truncate">
                                                                        {loan.solicitante_obj?.nombre} {loan.solicitante_obj?.apellido}
                                                                    </p>
                                                                    <span className={`text-[7px] font-black px-1 py-0.5 rounded-md uppercase tracking-widest border ${isInternal ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                                                        {isInternal ? 'Personal' : 'Externo'}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[9px] text-slate-400 font-bold mt-0">{loan.solicitante_obj?.rut || 'Sin RUT'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-2.5">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                                                <KeyIcon className="w-3.5 h-3.5" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-[13px] font-bold text-slate-800 leading-tight">
                                                                    {loan.llave_obj?.nombre}
                                                                </p>
                                                                <p className="text-[8px] text-slate-400 font-black uppercase tracking-wider mt-0 truncate">
                                                                    {loan.llave_obj?.establecimiento_nombre}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-2.5">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                                                <Clock className="w-3.5 h-3.5" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-[13px] font-bold text-slate-800 capitalize">
                                                                    {new Date(loan.fecha_prestamo).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                                                                </p>
                                                                <p className="text-[9px] text-slate-400 font-bold">
                                                                    {new Date(loan.fecha_prestamo).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-2.5 text-right pr-6">
                                                        <button
                                                            onClick={() => handleReturnClick(loan)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-all font-black text-[9px] uppercase tracking-widest shadow-sm active:scale-95"
                                                        >
                                                            <CheckCircle className="w-3 h-3" />
                                                            <span className="hidden sm:inline">Devolver</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex justify-center mt-2">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                                totalCount={totalCount}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;
