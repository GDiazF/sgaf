import React, { useState, useEffect } from 'react';
import { Users, Search, Edit2, Power, Filter, Phone, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import FuncionarioModal from '../../components/funcionarios/FuncionarioModal';

const FuncionariosList = () => {
    const [funcionarios, setFuncionarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterEstado, setFilterEstado] = useState('all');
    const [filterSubdireccion, setFilterSubdireccion] = useState('');
    const [subdirecciones, setSubdirecciones] = useState([]);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [funcRes, subRes] = await Promise.all([
                api.get('funcionarios/'),
                api.get('subdirecciones/')
            ]);
            setFuncionarios(Array.isArray(funcRes.data) ? funcRes.data : (funcRes.data.results || []));
            setSubdirecciones(Array.isArray(subRes.data) ? subRes.data : (subRes.data.results || []));
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleEstado = async (id) => {
        try {
            await api.post(`funcionarios/${id}/toggle_estado/`);
            fetchData();
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

    const filteredData = funcionarios.filter(item => {
        const matchesSearch =
            item.nombre_funcionario.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.rut.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.anexo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.cargo?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesEstado =
            filterEstado === 'all' ||
            (filterEstado === 'activo' && item.estado) ||
            (filterEstado === 'inactivo' && !item.estado);

        const matchesSubdireccion =
            !filterSubdireccion ||
            item.subdireccion == filterSubdireccion;

        return matchesSearch && matchesEstado && matchesSubdireccion;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Lista de Funcionarios</h1>
                    <p className="text-gray-600">Gestiona y consulta la información del personal</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Funcionario
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-xl shadow-md p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, RUT, anexo o cargo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <select
                            value={filterEstado}
                            onChange={(e) => setFilterEstado(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">Todos los estados</option>
                            <option value="activo">Solo activos</option>
                            <option value="inactivo">Solo inactivos</option>
                        </select>
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <select
                            value={filterSubdireccion}
                            onChange={(e) => setFilterSubdireccion(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Todas las subdirecciones</option>
                            {subdirecciones.map(sub => (
                                <option key={sub.id} value={sub.id}>{sub.nombre}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RUT</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Anexo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subdirección</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cargo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredData.map((item) => (
                                    <motion.tr
                                        key={item.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="hover:bg-gray-50"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-900">{item.nombre_funcionario}</div>
                                            {item.departamento_nombre && (
                                                <div className="text-sm text-gray-500">{item.departamento_nombre}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-mono text-sm">{item.rut}</td>
                                        <td className="px-6 py-4">
                                            {item.anexo ? (
                                                <div>
                                                    <div className="font-semibold text-gray-900">{item.anexo}</div>
                                                    <div className="text-xs text-gray-500">{item.numero_publico}</div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 text-sm">
                                            {item.subdireccion_nombre || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 text-sm">{item.cargo || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.estado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {item.estado ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => handleEdit(item.id)}
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleToggleEstado(item.id)}
                                                className={`${item.estado ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                                                title={item.estado ? 'Desactivar' : 'Activar'}
                                            >
                                                <Power className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredData.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                No se encontraron funcionarios
                            </div>
                        )}
                    </div>
                )}
            </div>

            <FuncionarioModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={fetchData}
                funcionarioId={selectedId}
            />
        </div>
    );
};

export default FuncionariosList;
