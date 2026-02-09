import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Plus, Edit2, Trash2, Search, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../api';

const Departamentos = () => {
    const [departamentos, setDepartamentos] = useState([]);
    const [subdirecciones, setSubdirecciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({ nombre: '', subdireccion: '', activo: true });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [deptRes, subRes] = await Promise.all([
                api.get('departamentos/'),
                api.get('subdirecciones/')
            ]);
            setDepartamentos(Array.isArray(deptRes.data) ? deptRes.data : (deptRes.data.results || []));
            setSubdirecciones(Array.isArray(subRes.data) ? subRes.data : (subRes.data.results || []));
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
                await api.put(`departamentos/${editingId}/`, formData);
            } else {
                await api.post('departamentos/', formData);
            }
            fetchData();
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
            fetchData();
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Error al eliminar');
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

    const filteredData = departamentos.filter(item =>
        item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.subdireccion_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex flex-col gap-4">
                    <Link
                        to="/funcionarios"
                        className="flex items-center gap-2 text-gray-500 hover:text-green-600 transition-colors w-fit group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium">Volver a Funcionarios</span>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <Briefcase className="w-8 h-8 text-green-600" />
                            Departamentos
                        </h1>
                        <p className="text-gray-600 mt-1">Gestión de departamentos</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg shadow-green-500/30 transition-all flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Departamento
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
                <div className="mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar departamento..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subdirección</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidades</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Funcionarios</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredData.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-semibold text-gray-900">{item.nombre}</td>
                                        <td className="px-6 py-4 text-gray-600">{item.subdireccion_nombre}</td>
                                        <td className="px-6 py-4 text-gray-600">{item.total_unidades || 0}</td>
                                        <td className="px-6 py-4 text-gray-600">{item.total_funcionarios || 0}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {item.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800">
                                                <Edit2 className="w-5 h-5 inline" />
                                            </button>
                                            <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800">
                                                <Trash2 className="w-5 h-5 inline" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-xl p-6 w-full max-w-md"
                    >
                        <h2 className="text-2xl font-bold mb-4">{editingId ? 'Editar' : 'Nuevo'} Departamento</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subdirección</label>
                                <select
                                    value={formData.subdireccion}
                                    onChange={(e) => setFormData({ ...formData, subdireccion: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    required
                                >
                                    <option value="">Seleccionar...</option>
                                    {subdirecciones.map(sub => (
                                        <option key={sub.id} value={sub.id}>{sub.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    required
                                />
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={formData.activo}
                                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                />
                                <label className="ml-2 text-sm font-medium text-gray-700">Activo</label>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default Departamentos;
