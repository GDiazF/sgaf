import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plus, Edit2, Trash2, Search, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../api';

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
        es_firmante: false,
        activo: true,
        funcionarios: []
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [grpRes, funcRes] = await Promise.all([
                api.get('grupos/'),
                api.get('funcionarios/?activos=true')
            ]);
            setGrupos(Array.isArray(grpRes.data) ? grpRes.data : (grpRes.data.results || []));
            setFuncionarios(Array.isArray(funcRes.data) ? funcRes.data : (funcRes.data.results || []));
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`grupos/${editingId}/`, formData);
            } else {
                await api.post('grupos/', formData);
            }
            fetchData();
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
            fetchData();
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Error al eliminar el grupo');
        }
    };

    const handleEdit = (item) => {
        setFormData({
            nombre: item.nombre,
            descripcion: item.descripcion || '',
            es_firmante: item.es_firmante,
            activo: item.activo,
            funcionarios: item.funcionarios || []
        });
        setEditingId(item.id);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingId(null);
        setFormData({ nombre: '', descripcion: '', es_firmante: false, activo: true, funcionarios: [] });
    };

    const filteredData = grupos.filter(item =>
        item.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-col gap-2">
                    <Link
                        to="/funcionarios"
                        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors w-fit group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium">Volver a Portal de Personal</span>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-sm">
                                <Users className="w-6 h-6" />
                            </div>
                            Grupos de Funcionarios
                        </h1>
                        <p className="text-slate-500 mt-1">Gestión de grupos para firmas y organización.</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2 active:scale-95"
                >
                    <Plus className="w-5 h-5 font-bold" />
                    Nuevo Grupo
                </button>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar grupo por nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-100 border-t-indigo-600"></div>
                        <p className="text-slate-500 font-medium">Cargando grupos...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre del Grupo</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Miembros</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Es Firmante</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Estado</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredData.length > 0 ? (
                                    filteredData.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800 text-sm">{item.nombre}</span>
                                                    {item.descripcion && (
                                                        <span className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.descripcion}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-bold text-slate-700">{item.total_miembros || 0}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {item.es_firmante ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                                                        <CheckCircle2 className="w-3 h-3" /> SÍ
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                                                        <XCircle className="w-3 h-3" /> NO
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${item.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                    {item.activo ? 'ACTIVO' : 'INACTIVO'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEdit(item)}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                        title="Editar Grupo"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                        title="Eliminar Grupo"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-slate-400 italic">
                                            No se encontraron grupos.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[8rem] -z-0 opacity-50"></div>

                        <div className="relative z-10">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6">{editingId ? 'Editar' : 'Nuevo'} Grupo</h2>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-indigo-600 ml-1 uppercase tracking-tight">Nombre del Grupo</label>
                                    <input
                                        type="text"
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-sm transition-all"
                                        placeholder="Ej: Firmantes Centrales"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-indigo-600 ml-1 uppercase tracking-tight">Descripción</label>
                                    <textarea
                                        value={formData.descripcion}
                                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-sm transition-all resize-none h-24"
                                        placeholder="Breve descripción del propósito del grupo..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <label className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer hover:border-indigo-200 transition-all select-none group relative">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">¿Es Firmante?</span>
                                            <input
                                                type="checkbox"
                                                checked={formData.es_firmante}
                                                onChange={(e) => setFormData({ ...formData, es_firmante: e.target.checked })}
                                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-400 leading-tight">Marque si este grupo puede firmar RCs.</p>
                                    </label>

                                    <label className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer hover:border-emerald-200 transition-all select-none group relative">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estado Activo</span>
                                            <input
                                                type="checkbox"
                                                checked={formData.activo}
                                                onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                                                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-400 leading-tight">Marque para habilitar el grupo en el sistema.</p>
                                    </label>
                                </div>

                                <div className="space-y-1.5 pt-2">
                                    <label className="text-xs font-bold text-indigo-600 ml-1 uppercase tracking-tight">Seleccionar Miembros ({formData.funcionarios.length})</label>
                                    <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
                                        {funcionarios.map(func => (
                                            <label key={func.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-xl transition-colors cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.funcionarios.includes(func.id)}
                                                    onChange={(e) => {
                                                        const newIds = e.target.checked
                                                            ? [...formData.funcionarios, func.id]
                                                            : formData.funcionarios.filter(id => id !== func.id);
                                                        setFormData({ ...formData, funcionarios: newIds });
                                                    }}
                                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{func.nombre_funcionario}</span>
                                                    <span className="text-[10px] text-slate-400 uppercase tracking-tighter">{func.cargo || 'Funcionario'}</span>
                                                </div>
                                            </label>
                                        ))}
                                        {funcionarios.length === 0 && (
                                            <p className="text-xs text-slate-400 italic text-center py-4">No hay funcionarios activos disponibles.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all active:scale-95"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
                                    >
                                        Guardar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default Grupos;
