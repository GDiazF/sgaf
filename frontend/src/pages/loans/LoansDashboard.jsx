import React, { useEffect, useState } from 'react';
import api from '../../api';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Box as KeyIcon, ChevronRight, Clock, User, Building, Calendar, ArrowRight, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import Pagination from '../../components/common/Pagination';
import ReturnLoanModal from '../../components/loans/ReturnLoanModal';
import TransferModal from '../../components/loans/TransferModal';

const Dashboard = () => {
    const navigate = useNavigate();
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const { can } = usePermission();

    // Pagination, Page Size & Search
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [totalAssets, setTotalAssets] = useState(0);
    const [ordering, setOrdering] = useState('-fecha_prestamo');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = async (page = 1, order = ordering) => {
        setLoading(true);
        try {
            const params = {
                page,
                search: searchQuery,
                active: 'true',
                ordering: order,
                page_size: pageSize
            };
            const [loansRes, assetsRes] = await Promise.all([
                api.get('prestamos/', { params }),
                api.get('activos/')
            ]);

            setLoans(loansRes.data.results || []);
            setTotalCount(loansRes.data.count || 0);
            setTotalPages(Math.ceil((loansRes.data.count || 0) / pageSize));
            setTotalAssets(assetsRes.data.count || 0);
        } catch (error) {
            console.error("Error fetching loans:", error);
            setLoans([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(currentPage, ordering);
    }, [currentPage, ordering, searchQuery, pageSize]);

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

    const handleTransferClick = (loan) => {
        setSelectedLoan(loan);
        setShowTransferModal(true);
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

    const filteredLoans = loans;

    return (
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden">
            {/* Header Area */}
            <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                <div>
                    <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase select-none">Gestión de Préstamos</h2>
                    <div className="flex items-center gap-2 mt-1.5">
                        <p className="text-[10px] md:text-xs font-medium text-slate-500 uppercase ml-0 select-none">Monitoreo y control de activos institucionales en circulación.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => navigate('/history')}
                        className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-650 px-5 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 shrink-0"
                    >
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Historial</span>
                    </button>
                    {can('prestamo_llaves.add_prestamo') && (
                        <button
                            type="button"
                            onClick={() => navigate('/loans/new')}
                            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 shrink-0 active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Nuevo Préstamo</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Structured Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0 select-none">
                {can('prestamo_llaves.add_prestamo') && (
                    <button 
                        onClick={() => navigate('/loans/new')} 
                        className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between group hover:border-indigo-500 hover:shadow-md transition-all text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100 group-hover:scale-110 transition-transform">
                                <Plus className="w-4 h-4" />
                            </div>
                            <div>
                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Acción Rápida</span>
                                <span className="block text-xs font-black text-slate-700 uppercase tracking-tight mt-0.5">Nuevo Préstamo</span>
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                    </button>
                )}

                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3 hover:shadow-md transition-all">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center shrink-0 border border-slate-200">
                        <KeyIcon className="w-4 h-4" />
                    </div>
                    <div>
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Activos</span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className="text-lg font-black text-slate-800 leading-none">{totalAssets}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">En Inventario</span>
                        </div>
                    </div>
                </div>

                {can('prestamo_llaves.view_activo') && (
                    <button 
                        onClick={() => navigate('/keys')} 
                        className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between group hover:border-indigo-500 hover:shadow-md transition-all text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100 group-hover:scale-110 transition-transform">
                                <KeyIcon className="w-4 h-4" />
                            </div>
                            <div>
                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Gestión Inventario</span>
                                <span className="block text-xs font-black text-slate-700 uppercase tracking-tight mt-0.5">Ir al Inventario</span>
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                    </button>
                )}
            </div>

            {/* Refined Filter Bar */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3 items-center shrink-0">
                <div className="relative flex-1 w-full shrink-0">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input 
                        type="text" 
                        placeholder="BUSCAR PRÉSTAMOS ACTIVOS POR RUT, RESPONSABLE O ACTIVO..."
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
                            <option value="activo__nombre">NOMBRE ACTIVO</option>
                            <option value="solicitante__nombre">RESPONSABLE</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-0 relative">
                {loading ? (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-[99] flex flex-col items-center justify-center gap-3">
                        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest animate-pulse">Cargando préstamos activos...</p>
                    </div>
                ) : filteredLoans.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center flex-grow select-none">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 flex items-center justify-center mb-3">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Todo en Orden</h3>
                        <p className="text-slate-450 font-medium text-[10px] uppercase tracking-wide max-w-[280px] mt-1.5">No hay activos en circulación. Todo el inventario está bajo resguardo.</p>
                    </div>
                ) : (
                    <>
                        <ReturnLoanModal
                            isOpen={showReturnModal}
                            onClose={() => setShowReturnModal(false)}
                            onConfirm={handleConfirmReturn}
                            loanData={selectedLoan}
                        />

                        <TransferModal
                            isOpen={showTransferModal}
                            onClose={() => setShowTransferModal(false)}
                            loan={selectedLoan}
                            onTransferSuccess={() => fetchData(currentPage, ordering)}
                        />

                        {/* Loans Table (Zero-Scroll Internal Scroll) */}
                        <div className="overflow-y-auto flex-grow custom-scrollbar">
                            <table className="w-full text-left border-collapse border-spacing-0">
                                <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                                    <tr className="border-b border-slate-200">
                                        <th className="px-6 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">Responsable</th>
                                        <th className="px-6 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">Llave / Activo</th>
                                        <th className="px-6 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">Desde</th>
                                        <th className="px-6 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right pr-8 bg-slate-50">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {filteredLoans.map((loan) => {
                                        const isInternal = !!loan.solicitante_obj?.funcionario;
                                        return (
                                            <tr key={loan.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="py-1.5 pl-6">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${isInternal ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                                            <User className="w-3 h-3" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <p className="text-xs font-semibold text-slate-700 truncate capitalize">
                                                                    {loan.solicitante_obj?.nombre} {loan.solicitante_obj?.apellido}
                                                                </p>
                                                                <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border ${isInternal ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-500 border-slate-150'}`}>
                                                                    {isInternal ? 'Personal' : 'Externo'}
                                                                </span>
                                                            </div>
                                                            <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase">{loan.solicitante_obj?.rut || 'Sin RUT'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-1.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-200 shrink-0">
                                                            <KeyIcon className="w-3 h-3" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-semibold text-slate-700 leading-tight uppercase">
                                                                {loan.activo_obj?.nombre}
                                                            </p>
                                                            <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider mt-0.5 truncate">
                                                                {loan.activo_obj?.establecimiento_nombre}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-1.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-200 shrink-0">
                                                            <Clock className="w-3 h-3" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-semibold text-slate-700 capitalize">
                                                                {new Date(loan.fecha_prestamo).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                                                            </p>
                                                            <p className="text-[9px] text-slate-450 font-medium mt-0.5">
                                                                {new Date(loan.fecha_prestamo).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-1.5 text-right pr-8">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTransferClick(loan)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all font-bold text-[9px] uppercase tracking-widest active:scale-95 shadow-sm"
                                                            title="Traspasar Responsabilidad"
                                                        >
                                                            <ArrowRight className="w-3 h-3" />
                                                            <span>Traspasar</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleReturnClick(loan)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-xl hover:bg-emerald-600 hover:border-emerald-600 hover:shadow-emerald-100 border border-slate-900 transition-all font-bold text-[9px] uppercase tracking-widest shadow-lg shadow-slate-900/10 active:scale-95"
                                                        >
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            <span>Devolver</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
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

export default Dashboard;
