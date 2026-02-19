import React, { useState, useEffect } from 'react';
import { Users, Search, Edit2, Power, Filter, Phone, Plus, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import FuncionarioModal from '../../components/funcionarios/FuncionarioModal';
import Pagination from '../../components/common/Pagination';

const FuncionariosList = () => {
    const [funcionarios, setFuncionarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterEstado, setFilterEstado] = useState('all');
    const [filterSubdireccion, setFilterSubdireccion] = useState('');
    const [subdirecciones, setSubdirecciones] = useState([]);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
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

    const fetchData = async (page = 1, search = searchTerm, estado = filterEstado, sub = filterSubdireccion) => {
        setLoading(true);
        try {
            const params = {
                page,
                search,
                ordering: 'nombre_funcionario'
            };

            if (estado !== 'all') {
                params.estado = estado === 'activo';
            }
            if (sub) {
                params.subdireccion = sub;
            }

            const response = await api.get('funcionarios/', { params });

            if (response.data.results) {
                setFuncionarios(response.data.results);
                setTotalPages(Math.ceil(response.data.count / 10)); // Assuming PAGE_SIZE=10
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200/60 pb-6">
                <div className="flex flex-col gap-3">
                    <Link
                        to="/funcionarios"
                        className="flex items-center gap-2 text-slate-500 hover:text-sky-600 transition-colors w-fit group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-xs font-bold uppercase tracking-wider">Volver al Portal</span>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Funcionarios</h1>
                        <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                            Gestión de Capital Humano ({totalResults})
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleCreate}
                    className="group relative inline-flex items-center gap-2 px-6 py-3 bg-sky-600 text-white text-sm font-semibold rounded-xl overflow-hidden transition-all hover:bg-sky-700 hover:shadow-lg hover:shadow-sky-900/20 active:scale-95 shadow-xl shadow-sky-500/20"
                >
                    <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                    <span>Nuevo Funcionario</span>
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Nombre, RUT, anexo o cargo..."
                                value={searchTerm}
                                onChange={handleSearch}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                            />
                        </div>
                        <div className="relative">
                            <select
                                value={filterEstado}
                                onChange={handleFilterEstado}
                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 outline-none appearance-none"
                            >
                                <option value="all">Todos los estados</option>
                                <option value="activo">Solo activos</option>
                                <option value="inactivo">Solo inactivos</option>
                            </select>
                        </div>
                        <div className="relative">
                            <select
                                value={filterSubdireccion}
                                onChange={handleFilterSubdireccion}
                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 outline-none appearance-none"
                            >
                                <option value="">Todas las subdirecciones</option>
                                {subdirecciones.map(sub => (
                                    <option key={sub.id} value={sub.id}>{sub.nombre}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-10 h-10 rounded-full border-4 border-slate-100 border-t-sky-600 animate-spin"></div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando...</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap table-fixed">
                            <colgroup>
                                <col style={{ width: '120px' }} /> {/* Estado */}
                                <col style={{ width: '25%' }} />   {/* Nombre */}
                                <col style={{ width: '130px' }} /> {/* RUT */}
                                <col style={{ width: '100px' }} /> {/* Anexo */}
                                <col style={{ width: '20%' }} />   {/* Subdireccion */}
                                <col style={{ width: '15%' }} />   {/* Cargo */}
                                <col style={{ width: '100px' }} /> {/* Acciones */}
                            </colgroup>
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                    <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre</th>
                                    <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">RUT</th>
                                    <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Anexo</th>
                                    <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Subdirección</th>
                                    <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cargo</th>
                                    <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {funcionarios.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors text-xs">
                                        <td className="p-3">
                                            <button
                                                onClick={() => handleToggleEstado(item.id)}
                                                className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black transition-all ${item.estado ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'}`}
                                            >
                                                <Power className="w-3 h-3" />
                                                {item.estado ? 'ACTIVO' : 'INACTIVO'}
                                            </button>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-900 truncate" title={item.nombre_funcionario}>
                                                    {item.nombre_funcionario}
                                                </span>
                                                {item.departamento_nombre && (
                                                    <span className="text-[10px] text-slate-400 truncate w-full" title={item.departamento_nombre}>
                                                        {item.departamento_nombre}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3 text-slate-500 font-mono text-[11px]">{item.rut}</td>
                                        <td className="p-3 text-center">
                                            {item.anexo ? (
                                                <div className="flex flex-col items-center">
                                                    <span className="font-bold text-slate-700">{item.anexo}</span>
                                                    <span className="text-[9px] text-slate-400">{item.numero_publico}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-slate-600 truncate" title={item.subdireccion_nombre}>
                                            {item.subdireccion_nombre || '-'}
                                        </td>
                                        <td className="p-3 text-slate-500 truncate" title={item.cargo}>{item.cargo || '-'}</td>
                                        <td className="p-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => handleEdit(item.id)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-sky-600 hover:bg-sky-50 transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {funcionarios.length === 0 && (
                            <div className="py-12 text-center text-slate-400 font-medium text-xs italic">
                                No se encontraron funcionarios
                            </div>
                        )}
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50/30">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={(page) => fetchData(page)}
                        />
                    </div>
                )}
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
