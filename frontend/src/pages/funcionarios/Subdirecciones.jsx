import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Plus, Edit2, Trash2, Search, ArrowLeft, Power } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import { usePermission } from '../../hooks/usePermission';
import Pagination from '../../components/common/Pagination';
import Portal from '../../components/common/Portal';

const Subdirecciones = () => {
    const { can } = usePermission();
    const [subdirecciones, setSubdirecciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({ nombre: '', piso: 1, activo: true });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);

    useEffect(() => {
        fetchSubdirecciones(1);
    }, []);

    const fetchSubdirecciones = async (page = 1, search = searchTerm, size = pageSize) => {
        setLoading(true);
        try {
            const response = await api.get('subdirecciones/', {
                params: {
                    page,
                    search,
                    page_size: size,
                    ordering: 'nombre'
                }
            });

            if (response.data.results) {
                setSubdirecciones(response.data.results);
                setTotalPages(Math.ceil(response.data.count / size));
                setTotalResults(response.data.count);
            } else {
                setSubdirecciones(response.data);
                setTotalPages(1);
                setTotalResults(response.data.length);
            }
            setCurrentPage(page);
        } catch (error) {
            console.error('Error fetching subdirecciones:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        fetchSubdirecciones(1, value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`subdirecciones/${editingId}/`, formData);
            } else {
                await api.post('subdirecciones/', formData);
            }
            fetchSubdirecciones(currentPage);
            handleCloseModal();
        } catch (error) {
            console.error('Error saving:', error);
            alert('Error al guardar');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar esta subdirección?')) return;
        try {
            await api.delete(`subdirecciones/${id}/`);
            fetchSubdirecciones(currentPage);
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Error al eliminar');
        }
    };

    const handleToggleActivo = async (item) => {
        try {
            await api.patch(`subdirecciones/${item.id}/`, { activo: !item.activo });
            fetchSubdirecciones(currentPage);
        } catch (error) {
            console.error('Error toggling status:', error);
        }
    };

    const handleEdit = (item) => {
        setFormData({ nombre: item.nombre, piso: item.piso, activo: item.activo });
        setEditingId(item.id);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingId(null);
        setFormData({ nombre: '', piso: 1, activo: true });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden">
            <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 border-b border-slate-200/60 pb-4">
                <div className="flex flex-col gap-3">
                    <Link
                        to="/funcionarios"
                        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors w-fit group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-xs font-bold uppercase tracking-wider">Volver al Portal</span>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Subdirecciones</h1>
                        <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                            Estructura Organizacional ({totalResults})
                        </p>
                    </div>
                </div>
                {can('funcionarios.add_subdireccion') && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="group relative inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl overflow-hidden transition-all hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-900/20 active:scale-95 shadow-xl shadow-indigo-500/20"
                    >
                        <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                        <span>Nueva Subdirección</span>
                    </button>
                )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-row justify-between items-center gap-3 shrink-0">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={handleSearch}
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="hidden sm:inline text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mostrar:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                const newSize = Number(e.target.value);
                                setPageSize(newSize);
                                fetchSubdirecciones(1, searchTerm, newSize);
                            }}
                            className="w-[70px] sm:w-[80px] px-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 focus:ring-2 focus:ring-sky-500 outline-none transition-all pr-8 appearance-none"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center flex-1 gap-4">
                        <div className="w-10 h-10 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin"></div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando...</span>
                    </div>
                ) : (
                    <>
                        {/* Mobile Card List */}
                        <div className="block lg:hidden overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/30">
                            {subdirecciones.map((item) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4 relative overflow-hidden group"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col gap-1 pr-12">
                                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Nivel Estratégico</span>
                                            <h3 className="text-sm font-bold text-slate-900 leading-tight">{item.nombre}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500 uppercase">PISO {item.piso}</span>
                                            </div>
                                        </div>
                                        <div className="absolute top-4 right-4">
                                            <button
                                                onClick={() => handleToggleActivo(item)}
                                                className={`p-2 rounded-xl transition-all ${item.activo ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}
                                            >
                                                <Power className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-50">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Departamentos</span>
                                            <span className="text-xs font-black text-indigo-600">{item.total_departamentos || 0}</span>
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Personal Total</span>
                                            <span className="text-xs font-black text-violet-600">{item.total_funcionarios || 0}</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        {can('funcionarios.change_subdireccion') && (
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="flex-1 flex items-center justify-center gap-2 bg-slate-50 text-slate-700 py-2.5 rounded-xl font-bold text-[10px] uppercase shadow-sm active:scale-95 transition-all"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" /> Editar
                                            </button>
                                        )}
                                        {can('funcionarios.delete_subdireccion') && (
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
                            {subdirecciones.length === 0 && (
                                <div className="py-20 text-center text-slate-400 font-medium text-xs italic">
                                    No se encontraron subdirecciones
                                </div>
                            )}
                        </div>

                        {/* Desktop Table List */}
                        <div className="hidden lg:block flex-1 overflow-auto custom-scrollbar">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</th>
                                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Piso</th>
                                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Departamentos</th>
                                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Personal</th>
                                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-sans">
                                    {subdirecciones.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="py-1 px-4">
                                                <button
                                                    onClick={() => handleToggleActivo(item)}
                                                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold transition-all ${item.activo ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                                >
                                                    <Power className="w-3 h-3" />
                                                    {item.activo ? 'ACTIVO' : 'INACTIVO'}
                                                </button>
                                            </td>
                                            <td className="py-1 px-4">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-800 text-[12px] uppercase">
                                                        {item.nombre}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-1 px-4 text-center font-mono font-bold text-[11px] text-slate-400">
                                                {item.piso}
                                            </td>
                                            <td className="py-1 px-4 text-center">
                                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[10px] font-bold uppercase border border-indigo-100">
                                                    {item.total_departamentos || 0}
                                                </span>
                                            </td>
                                            <td className="py-1 px-4 text-center">
                                                <span className="px-2 py-0.5 bg-violet-50 text-violet-600 rounded-md text-[10px] font-bold uppercase border border-violet-100">
                                                    {item.total_funcionarios || 0}
                                                </span>
                                            </td>
                                            <td className="py-1 px-4 text-right">
                                                <div className="flex justify-end gap-1.5">
                                                    {can('funcionarios.change_subdireccion') && (
                                                        <button
                                                            onClick={() => handleEdit(item)}
                                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                            title="Editar"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {can('funcionarios.delete_subdireccion') && (
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
                            {subdirecciones.length === 0 && (
                                <div className="py-20 text-center text-slate-400 font-medium text-xs italic">
                                    No se encontraron subdirecciones
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            <div className="shrink-0 pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 pb-2">
                <div className="order-2 sm:order-1">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Estructura Organizacional</span>
                </div>
                <div className="order-1 sm:order-2 flex justify-center lg:justify-end">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={(page) => fetchSubdirecciones(page)}
                        totalCount={totalResults}
                    />
                </div>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <Portal>
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
                            >
                                <div className="p-4 pb-2">
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                                        {editingId ? 'Editar' : 'Nueva'} Subdirección
                                    </h2>
                                    <p className="text-sm font-medium text-slate-500">Completa la información estratégica</p>
                                </div>

                                <form onSubmit={handleSubmit} className="p-4 pt-2 space-y-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nombre de la Subdirección</label>
                                            <input
                                                type="text"
                                                value={formData.nombre}
                                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                                                placeholder="Ej: Subdirección de Finanzas"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Ubicación (Piso)</label>
                                            <input
                                                type="number"
                                                value={formData.piso}
                                                onChange={(e) => setFormData({ ...formData, piso: parseInt(e.target.value) })}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                                                min="1"
                                                required
                                            />
                                        </div>
                                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                                            <div className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.activo}
                                                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                            </div>
                                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Estado Activo</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={handleCloseModal}
                                            className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 text-sm font-bold rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
                                        >
                                            Guardar
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    </Portal>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Subdirecciones;
