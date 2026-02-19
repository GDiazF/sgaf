import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Plus, Edit2, Trash2, Search, ArrowLeft, Power } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import Pagination from '../../components/common/Pagination';

const Departamentos = () => {
    const [departamentos, setDepartamentos] = useState([]);
    const [subdirecciones, setSubdirecciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({ nombre: '', subdireccion: '', activo: true });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);

    useEffect(() => {
        fetchData(1);
    }, []);

    const fetchData = async (page = 1, search = searchTerm) => {
        setLoading(true);
        try {
            const [deptRes, subRes] = await Promise.all([
                api.get('departamentos/', {
                    params: {
                        page,
                        search,
                        ordering: 'nombre'
                    }
                }),
                api.get('subdirecciones/', { params: { nopaginate: true } })
            ]);

            if (deptRes.data.results) {
                setDepartamentos(deptRes.data.results);
                setTotalPages(Math.ceil(deptRes.data.count / 10)); // Assuming PAGE_SIZE=10
                setTotalResults(deptRes.data.count);
            } else {
                setDepartamentos(deptRes.data);
                setTotalPages(1);
                setTotalResults(deptRes.data.length);
            }

            setSubdirecciones(Array.isArray(subRes.data) ? subRes.data : (subRes.data.results || []));
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
        fetchData(1, value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`departamentos/${editingId}/`, formData);
            } else {
                await api.post('departamentos/', formData);
            }
            fetchData(currentPage);
            handleCloseModal();
        } catch (error) {
            console.error('Error saving:', error);
            alert('Error al guardar');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este departamento?')) return;
        try {
            await api.delete(`departamentos/${id}/`);
            fetchData(currentPage);
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Error al eliminar');
        }
    };

    const handleToggleActivo = async (item) => {
        try {
            await api.patch(`departamentos/${item.id}/`, { activo: !item.activo });
            fetchData(currentPage);
        } catch (error) {
            console.error('Error toggling status:', error);
        }
    };

    const handleEdit = (item) => {
        setFormData({ nombre: item.nombre, subdireccion: item.subdireccion, activo: item.activo });
        setEditingId(item.id);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingId(null);
        setFormData({ nombre: '', subdireccion: '', activo: true });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200/60 pb-6">
                <div className="flex flex-col gap-3">
                    <Link
                        to="/funcionarios"
                        className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors w-fit group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-xs font-bold uppercase tracking-wider">Volver al Portal</span>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Departamentos</h1>
                        <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Gestión Táctica Organizacional ({totalResults})
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="group relative inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white text-sm font-semibold rounded-xl overflow-hidden transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-900/20 active:scale-95 shadow-xl shadow-emerald-500/20"
                >
                    <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                    <span>Nuevo Departamento</span>
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre..."
                            value={searchTerm}
                            onChange={handleSearch}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-10 h-10 rounded-full border-4 border-slate-100 border-t-emerald-600 animate-spin"></div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando...</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap table-fixed">
                            <colgroup>
                                <col style={{ width: '120px' }} /> {/* Estado */}
                                <col style={{ width: '30%' }} />   {/* Nombre */}
                                <col style={{ width: '30%' }} />   {/* Subdireccion */}
                                <col style={{ width: '130px' }} /> {/* Unidades */}
                                <col style={{ width: '130px' }} /> {/* Funcianarios */}
                                <col style={{ width: '100px' }} /> {/* Acciones */}
                            </colgroup>
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                    <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre</th>
                                    <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Subdirección</th>
                                    <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Unidades</th>
                                    <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Personal</th>
                                    <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {departamentos.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors text-xs">
                                        <td className="p-3">
                                            <button
                                                onClick={() => handleToggleActivo(item)}
                                                className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black transition-all ${item.activo ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                            >
                                                <Power className="w-3 h-3" />
                                                {item.activo ? 'ACTIVO' : 'INACTIVO'}
                                            </button>
                                        </td>
                                        <td className="p-3 font-semibold text-slate-900 truncate" title={item.nombre}>{item.nombre}</td>
                                        <td className="p-3 text-slate-600 truncate" title={item.subdireccion_nombre}>{item.subdireccion_nombre}</td>
                                        <td className="p-3 text-center">
                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-bold border border-blue-100">
                                                {item.total_unidades || 0}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-md font-bold border border-violet-100">
                                                {item.total_funcionarios || 0}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {departamentos.length === 0 && (
                            <div className="py-12 text-center text-slate-400 font-medium text-xs italic">
                                No se encontraron departamentos
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

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
                        >
                            <div className="p-8 pb-4">
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                                    {editingId ? 'Editar' : 'Nuevo'} Departamento
                                </h2>
                                <p className="text-sm font-medium text-slate-500">Gestión de estructura táctica</p>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8 pt-4 space-y-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Subdirección Superior</label>
                                        <select
                                            value={formData.subdireccion}
                                            onChange={(e) => setFormData({ ...formData, subdireccion: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none appearance-none"
                                            required
                                        >
                                            <option value="">Seleccionar...</option>
                                            {subdirecciones.map(sub => (
                                                <option key={sub.id} value={sub.id}>{sub.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nombre del Departamento</label>
                                        <input
                                            type="text"
                                            value={formData.nombre}
                                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
                                            placeholder="Ej: Departamento de Contabilidad"
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
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
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
                                        className="flex-1 px-6 py-3 bg-emerald-600 text-white text-sm font-bold rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
                                    >
                                        Guardar
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Departamentos;
