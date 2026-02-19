import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plus, Edit2, Trash2, Search, ArrowLeft, CheckCircle2, XCircle, Power } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import Pagination from '../../components/common/Pagination';

const Grupos = () => {
    const [grupos, setGrupos] = useState([]);
    const [funcionarios, setFuncionarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        jefe: '',
        activo: true,
        funcionarios: []
    });

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
            const [grpRes, funcRes] = await Promise.all([
                api.get('grupos/', {
                    params: {
                        page,
                        search,
                        ordering: 'nombre'
                    }
                }),
                api.get('funcionarios/', { params: { activos: true, nopaginate: true } })
            ]);

            if (grpRes.data.results) {
                setGrupos(grpRes.data.results);
                setTotalPages(Math.ceil(grpRes.data.count / 10));
                setTotalResults(grpRes.data.count);
            } else {
                setGrupos(grpRes.data);
                setTotalPages(1);
                setTotalResults(grpRes.data.length);
            }

            setFuncionarios(Array.isArray(funcRes.data) ? funcRes.data : (funcRes.data.results || []));
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
                await api.put(`grupos/${editingId}/`, formData);
            } else {
                await api.post('grupos/', formData);
            }
            fetchData(currentPage);
            handleCloseModal();
        } catch (error) {
            console.error('Error saving:', error);
            alert('Error al guardar el grupo');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este grupo?')) return;
        try {
            await api.delete(`grupos/${id}/`);
            fetchData(currentPage);
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Error al eliminar el grupo');
        }
    };

    const handleToggleActivo = async (item) => {
        try {
            await api.patch(`grupos/${item.id}/`, { activo: !item.activo });
            fetchData(currentPage);
        } catch (error) {
            console.error('Error toggling status:', error);
        }
    };

    const handleEdit = (item) => {
        setFormData({
            nombre: item.nombre,
            descripcion: item.descripcion || '',
            jefe: item.jefe || '',
            activo: item.activo,
            funcionarios: item.funcionarios || []
        });
        setEditingId(item.id);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingId(null);
        setFormData({ nombre: '', descripcion: '', jefe: '', activo: true, funcionarios: [] });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200/60 pb-6">
                <div className="flex flex-col gap-3">
                    <Link
                        to="/funcionarios"
                        className="flex items-center gap-2 text-slate-500 hover:text-orange-600 transition-colors w-fit group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-xs font-bold uppercase tracking-wider">Volver al Portal</span>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Grupos</h1>
                        <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                            Gestión de Firmantes y Equipos ({totalResults})
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="group relative inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white text-sm font-semibold rounded-xl overflow-hidden transition-all hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-900/20 active:scale-95 shadow-xl shadow-orange-500/20"
                >
                    <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                    <span>Nuevo Grupo</span>
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
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-10 h-10 rounded-full border-4 border-slate-100 border-t-orange-500 animate-spin"></div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando...</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap table-fixed">
                            <colgroup>
                                <col style={{ width: '120px' }} /> {/* Estado */}
                                <col style={{ width: '40%' }} />   {/* Grupo */}
                                <col style={{ width: '100px' }} /> {/* Miembros */}
                                <col style={{ width: '30%' }} />   {/* Jefe */}
                                <col style={{ width: '100px' }} /> {/* Acciones */}
                            </colgroup>
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                    <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Grupo</th>
                                    <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Miembros</th>
                                    <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jefe / Líder</th>
                                    <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {grupos.map((item) => (
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
                                        <td className="p-3">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-900 truncate" title={item.nombre}>{item.nombre}</span>
                                                {item.descripcion && (
                                                    <span className="text-[10px] text-slate-400 truncate w-full" title={item.descripcion}>
                                                        {item.descripcion}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded-md font-bold border border-orange-100">
                                                {item.total_miembros || 0}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            {item.jefe_nombre ? (
                                                <div className="flex items-center gap-1.5 text-slate-600 truncate" title={item.jefe_nombre}>
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                                                    <span className="truncate">{item.jefe_nombre}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-slate-400">
                                                    <XCircle className="w-3 h-3 flex-shrink-0" />
                                                    <span>Sin Jefe</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-orange-600 hover:bg-orange-50 transition-colors"
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
                        {grupos.length === 0 && (
                            <div className="py-12 text-center text-slate-400 font-medium text-xs italic">
                                No se encontraron grupos
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
                                    {editingId ? 'Editar' : 'Nuevo'} Grupo
                                </h2>
                                <p className="text-sm font-medium text-slate-500">Gestión de equipos y roles</p>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8 pt-4 space-y-6">
                                <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1 custom-scrollbar">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nombre del Grupo</label>
                                            <input
                                                type="text"
                                                value={formData.nombre}
                                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all outline-none"
                                                placeholder="Ej: Grupo de Firmantes"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Descripción</label>
                                            <textarea
                                                value={formData.descripcion}
                                                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all outline-none resize-none h-20"
                                                placeholder="Propósito del grupo..."
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
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                            </div>
                                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Estado Activo</span>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between ml-1">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Miembros ({formData.funcionarios.length})</label>
                                                <span className="text-[10px] text-slate-400 italic">Clic para seleccionar</span>
                                            </div>
                                            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-2 max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
                                                {funcionarios.map(func => (
                                                    <label key={func.id} className={`flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer group ${formData.funcionarios.includes(func.id) ? 'bg-orange-50 border border-orange-100' : 'hover:bg-white border border-transparent'}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.funcionarios.includes(func.id)}
                                                            onChange={(e) => {
                                                                const newIds = e.target.checked
                                                                    ? [...formData.funcionarios, func.id]
                                                                    : formData.funcionarios.filter(id => id !== func.id);
                                                                setFormData({ ...formData, funcionarios: newIds });
                                                            }}
                                                            className="sr-only"
                                                        />
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${formData.funcionarios.includes(func.id) ? 'bg-orange-500 border-orange-500' : 'bg-white border-slate-300'}`}>
                                                            {formData.funcionarios.includes(func.id) && <Plus className="w-3 h-3 text-white rotate-45" />}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className={`text-[11px] font-bold ${formData.funcionarios.includes(func.id) ? 'text-orange-700' : 'text-slate-700'}`}>{func.nombre_funcionario}</span>
                                                            <span className="text-[9px] text-slate-400 uppercase tracking-tighter">{func.cargo || 'Funcionario'}</span>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {formData.funcionarios.length > 0 && (
                                            <div>
                                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Jefe de Grupo</label>
                                                <select
                                                    value={formData.jefe}
                                                    onChange={(e) => setFormData({ ...formData, jefe: e.target.value })}
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all outline-none appearance-none"
                                                >
                                                    <option value="">Seleccionar Jefe...</option>
                                                    {formData.funcionarios.map(fid => {
                                                        const f = funcionarios.find(func => func.id === fid);
                                                        return f ? <option key={fid} value={fid}>{f.nombre_funcionario}</option> : null;
                                                    })}
                                                </select>
                                                <p className="text-[10px] text-slate-400 mt-1 ml-1 italic">Solo miembros seleccionados arriba pueden ser jefes.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4 bg-white border-t border-slate-100 mt-auto">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 text-sm font-bold rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-3 bg-orange-500 text-white text-sm font-bold rounded-2xl hover:bg-orange-600 shadow-lg shadow-orange-500/30 transition-all active:scale-95"
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

export default Grupos;
