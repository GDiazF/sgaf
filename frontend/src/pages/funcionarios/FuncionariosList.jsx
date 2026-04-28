import React, { useState, useEffect } from 'react';
import { Users, Search, Edit2, Power, Filter, Phone, Plus, ArrowLeft, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import { usePermission } from '../../hooks/usePermission';
import FuncionarioModal from '../../components/funcionarios/FuncionarioModal';
import Pagination from '../../components/common/Pagination';

const FuncionariosList = () => {
    const { can } = usePermission();
    const [funcionarios, setFuncionarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterEstado, setFilterEstado] = useState('all');
    const [filterSubdireccion, setFilterSubdireccion] = useState('');
    const [subdirecciones, setSubdirecciones] = useState([]);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    useEffect(() => {
        fetchSubdirecciones();
        fetchData(1);
    }, []);

    const fetchSubdirecciones = async () => {
        try {
            const response = await api.get('subdirecciones/', { params: { nopaginate: true } });
            setSubdirecciones(Array.isArray(response.data) ? response.data : (response.data.results || []));
        } catch (error) {
            console.error('Error fetching subdirecciones:', error);
        }
    };

    const fetchData = async (page = 1, search = searchTerm, estado = filterEstado, sub = filterSubdireccion, size = pageSize) => {
        setLoading(true);
        try {
            const params = {
                page,
                page_size: size,
                ordering: 'nombre_funcionario'
            };

            if (search) params.search = search;
            if (estado !== 'all') {
                params.estado = estado === 'activo';
            }
            if (sub) {
                params.subdireccion = sub;
            }

            const response = await api.get('funcionarios/', { params });

            if (response.data.results) {
                setFuncionarios(response.data.results);
                setTotalPages(Math.ceil(response.data.count / size));
                setTotalResults(response.data.count);
            } else {
                setFuncionarios(response.data);
                setTotalPages(1);
                setTotalResults(response.data.length);
            }
            setCurrentPage(page);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        fetchData(1, value, filterEstado, filterSubdireccion);
    };

    const handleFilterEstado = (e) => {
        const value = e.target.value;
        setFilterEstado(value);
        fetchData(1, searchTerm, value, filterSubdireccion);
    };

    const handleFilterSubdireccion = (e) => {
        const value = e.target.value;
        setFilterSubdireccion(value);
        fetchData(1, searchTerm, filterEstado, value);
    };

    const handleToggleEstado = async (id) => {
        try {
            await api.post(`funcionarios/${id}/toggle_estado/`);
            fetchData(currentPage);
        } catch (error) {
            console.error('Error toggling estado:', error);
            alert('Error al cambiar estado');
        }
    };

    const handleCreate = () => {
        setSelectedId(null);
        setIsModalOpen(true);
    };

    const handleEdit = (id) => {
        setSelectedId(id);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este funcionario? Esta acción no se puede deshacer.')) return;
        try {
            await api.delete(`funcionarios/${id}/`);
            fetchData(currentPage);
        } catch (error) {
            console.error('Error deleting funcionario:', error);
            alert('Error al eliminar funcionario. Podría estar vinculado a otros registros.');
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden">
            <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 border-b border-slate-200/60 pb-4">
                <div className="flex flex-col gap-3">
                    <Link
                        to="/funcionarios"
                        className="flex items-center gap-2 text-slate-500 hover:text-sky-600 transition-colors w-fit group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-xs font-bold uppercase tracking-wider">Volver al Portal</span>
                    </Link>
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight uppercase leading-none">Funcionarios</h2>
                        <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                            Gestionar Funcionarios ({totalResults})
                        </p>
                    </div>
                </div>
                {can('funcionarios.add_funcionario') && (
                    <button
                        onClick={handleCreate}
                        className="group relative inline-flex items-center gap-2 px-6 py-3 bg-sky-600 text-white text-sm font-semibold rounded-xl overflow-hidden transition-all hover:bg-sky-700 hover:shadow-lg hover:shadow-sky-900/20 active:scale-95 shadow-xl shadow-sky-500/20"
                    >
                        <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                        <span>Nuevo Funcionario</span>
                    </button>
                )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3 sm:gap-4 shrink-0">
                    <div className="flex flex-col md:grid md:grid-cols-12 gap-3 sm:gap-4">
                        {/* Buscador y selector de página (en la misma línea en móvil) */}
                        <div className="flex flex-row items-center gap-2 md:col-span-5">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    value={searchTerm}
                                    onChange={handleSearch}
                                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <div className="flex items-center gap-2 shrink-0 md:hidden">
                                <select
                                    value={pageSize}
                                    onChange={(e) => {
                                        const newSize = Number(e.target.value);
                                        setPageSize(newSize);
                                        fetchData(1, searchTerm, filterEstado, filterSubdireccion, newSize);
                                    }}
                                    className="w-[70px] px-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 focus:ring-2 focus:ring-sky-500 outline-none transition-all pr-8 appearance-none"
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>
                        </div>

                        {/* Filtros de Estado y Subdirección */}
                        <div className="grid grid-cols-2 md:col-span-5 gap-2">
                            <div className="relative">
                                <select
                                    value={filterEstado}
                                    onChange={handleFilterEstado}
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] focus:ring-2 focus:ring-sky-500 outline-none appearance-none"
                                >
                                    <option value="all">Estado</option>
                                    <option value="activo">Activos</option>
                                    <option value="inactivo">Inactivos</option>
                                </select>
                            </div>
                            <div className="relative">
                                <select
                                    value={filterSubdireccion}
                                    onChange={handleFilterSubdireccion}
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] focus:ring-2 focus:ring-sky-500 outline-none appearance-none"
                                >
                                    <option value="">Subdirección</option>
                                    {subdirecciones.map(sub => (
                                        <option key={sub.id} value={sub.id}>{sub.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Selector de página (solo desktop) */}
                        <div className="hidden md:flex md:col-span-2 items-center justify-end gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Mostrar:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    const newSize = Number(e.target.value);
                                    setPageSize(newSize);
                                    fetchData(1, searchTerm, filterEstado, filterSubdireccion, newSize);
                                }}
                                className="w-[80px] px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 focus:ring-2 focus:ring-sky-500 outline-none transition-all pr-8 appearance-none"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center flex-1 gap-4">
                        <div className="w-10 h-10 rounded-full border-4 border-slate-100 border-t-sky-600 animate-spin"></div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando...</span>
                    </div>
                ) : (
                    <>
                        {/* Mobile Card List */}
                        <div className="block lg:hidden overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/30">
                            {funcionarios.map((item) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4 relative overflow-hidden group"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col gap-1 pr-12">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.cargo || 'Funcionario'}</span>
                                            <h3 className="text-sm font-bold text-slate-900 leading-tight">{item.nombre_funcionario}</h3>
                                            <span className="text-[11px] font-mono font-medium text-slate-500">{item.rut}</span>
                                        </div>
                                        <div className="absolute top-4 right-4">
                                            <button
                                                onClick={() => handleToggleEstado(item.id)}
                                                className={`p-2 rounded-xl transition-all ${item.estado ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}
                                            >
                                                <Power className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-50">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Subdirección</span>
                                            <span className="text-[11px] font-semibold text-slate-700 truncate">{item.subdireccion_nombre || '-'}</span>
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Anexo</span>
                                            <span className="text-[11px] font-black text-blue-600">{item.anexo || '-'}</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        {can('funcionarios.change_funcionario') && (
                                            <button
                                                onClick={() => handleEdit(item.id)}
                                                className="flex-1 flex items-center justify-center gap-2 bg-slate-50 text-slate-700 py-2.5 rounded-xl font-bold text-[10px] uppercase shadow-sm active:scale-95 transition-all"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" /> Editar
                                            </button>
                                        )}
                                        {can('funcionarios.delete_funcionario') && (
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="flex items-center justify-center p-2.5 bg-rose-50 text-rose-600 rounded-xl active:scale-95 transition-all border border-rose-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                            {funcionarios.length === 0 && (
                                <div className="py-20 text-center text-slate-400 font-medium text-xs italic">
                                    No se encontraron funcionarios
                                </div>
                            )}
                        </div>

                        {/* Desktop Table view */}
                        <div className="hidden lg:block flex-1 overflow-auto custom-scrollbar">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</th>
                                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">RUT</th>
                                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Anexo</th>
                                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Subdirección</th>
                                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cargo</th>
                                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-sans">
                                    {funcionarios.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="py-1 px-4">
                                                <button
                                                    onClick={() => handleToggleEstado(item.id)}
                                                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold transition-all ${item.estado ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
                                                >
                                                    <Power className="w-3 h-3" />
                                                    {item.estado ? 'ACTIVO' : 'INACTIVO'}
                                                </button>
                                            </td>
                                            <td className="py-1 px-4">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-800 text-[12px] uppercase">{item.nombre_funcionario}</span>
                                                    {item.departamento_nombre && (
                                                        <span className="text-[9px] text-slate-400 font-normal italic leading-none mt-0.5">
                                                            {item.departamento_nombre}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-1 px-4 text-slate-500 font-mono font-bold text-[11px]">{item.rut}</td>
                                            <td className="py-1 px-4 text-center">
                                                {item.anexo ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-700 text-[11px]">{item.anexo}</span>
                                                        <span className="text-[9px] text-slate-400 font-medium">{item.numero_publico}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>
                                            <td className="py-1 px-4">
                                                <span className="capitalize px-2 py-1 bg-slate-50 text-slate-500 rounded-md text-[10px] font-bold uppercase border border-slate-100 truncate max-w-[150px] inline-block">
                                                    {item.subdireccion_nombre || '-'}
                                                </span>
                                            </td>
                                            <td className="py-1 px-4">
                                                <span className="capitalize px-2 py-1 bg-slate-50 text-slate-400 rounded-md text-[10px] font-bold uppercase border border-slate-100 truncate max-w-[120px] inline-block">
                                                    {item.cargo || '-'}
                                                </span>
                                            </td>
                                            <td className="py-1 px-4 text-right">
                                                <div className="flex justify-end gap-1.5">
                                                    {can('funcionarios.change_funcionario') && (
                                                        <button
                                                            onClick={() => handleEdit(item.id)}
                                                            className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
                                                            title="Editar"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {can('funcionarios.delete_funcionario') && (
                                                        <button
                                                            onClick={() => handleDelete(item.id)}
                                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {funcionarios.length === 0 && (
                                <div className="py-20 text-center text-slate-400 font-medium text-xs italic">
                                    No se encontraron funcionarios
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            <div className="shrink-0 pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 pb-2">
                <div className="order-2 sm:order-1">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Gestionar Funcionarios</span>
                </div>
                <div className="order-1 sm:order-2 flex justify-center lg:justify-end">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={(page) => fetchData(page)}
                        totalCount={totalResults}
                    />
                </div>
            </div>

            <FuncionarioModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={() => fetchData(currentPage)}
                funcionarioId={selectedId}
            />
        </div>
    );
};

export default FuncionariosList;
