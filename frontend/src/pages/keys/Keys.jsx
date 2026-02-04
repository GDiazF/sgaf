import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { Key, Search, Plus, Edit2, Trash2, X, Save, Building, Lock, Unlock, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Pagination from '../../components/common/Pagination';
import FilterBar from '../../components/common/FilterBar';
import SortableHeader from '../../components/common/SortableHeader';
import KeyModal from '../../components/keys/KeyModal';

const Keys = () => {
    const navigate = useNavigate();
    const [keys, setKeys] = useState([]);
    const [establishments, setEstablishments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Pagination & Search
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [ordering, setOrdering] = useState('nombre');

    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        nombre: '',
        establecimiento: '',
        ubicacion: ''
    });

    const fetchData = async (page = 1, search = '', order = ordering) => {
        setLoading(true);
        try {
            const params = {
                page,
                search,
                ordering: order
            };

            const [keysRes, estRes] = await Promise.all([
                api.get('llaves/', { params }),
                api.get('establecimientos/') // Assuming this dropdown doesn't need pagination yet or we fetch all for Select
            ]);

            // Handle Pagination
            setKeys(keysRes.data.results || []);
            setTotalCount(keysRes.data.count || 0);
            setTotalPages(Math.ceil((keysRes.data.count || 0) / 10));

            setEstablishments(estRes.data.results || estRes.data);

        } catch (error) {
            console.error("Error fetching data:", error);
            setKeys([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(currentPage, searchQuery, ordering);
    }, [currentPage, ordering]);

    const handleSearch = (query) => {
        setSearchQuery(query);
        setCurrentPage(1);
        fetchData(1, query);
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleSort = (newOrdering) => {
        setOrdering(newOrdering);
        setCurrentPage(1);
    };

    const handleEdit = (key) => {
        setFormData({
            nombre: key.nombre,
            establecimiento: key.establecimiento,
            ubicacion: key.ubicacion
        });
        setEditingId(key.id);
        setShowForm(true);
    };

    const handleNew = () => {
        setFormData({ nombre: '', establecimiento: '', ubicacion: '' });
        setEditingId(null);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Seguro que desea eliminar esta llave?")) return;
        try {
            await api.delete(`llaves/${id}/`);
            fetchData(currentPage, searchQuery);
        } catch (error) {
            console.error(error);
            alert("Error al eliminar. Puede que esté asociada a préstamos históricos.");
        }
    };

    const handleSave = async (dataToSubmit) => {
        try {
            if (editingId) {
                await api.put(`llaves/${editingId}/`, dataToSubmit);
            } else {
                await api.post('llaves/', dataToSubmit);
            }
            setShowForm(false);
            fetchData(currentPage, searchQuery);
        } catch (error) {
            console.error(error);
            alert("Error al guardar llave.");
        }
    };

    // No client-side filtering
    const filteredKeys = keys;

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <button
                        onClick={() => navigate('/loans')}
                        className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors mb-2 text-sm font-medium group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Volver al Panel
                    </button>
                    <h2 className="text-2xl font-bold text-slate-800">Inventario de Llaves</h2>
                    <p className="text-slate-500">Gestione y organice las llaves de los establecimientos.</p>
                </div>

                <div className="flex items-center gap-3">
                    <FilterBar onSearch={handleSearch} placeholder="Buscar llave..." />
                    <button
                        onClick={handleNew}
                        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 font-medium"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="hidden md:inline">Nueva Llave</span>
                    </button>
                </div>
            </div>

            {/* Modal Form */}
            <KeyModal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                onSave={handleSave}
                editingId={editingId}
                initialData={formData}
                lookups={{ establishments }}
            />

            {/* Table List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="p-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                            <SortableHeader label="Nombre Llave" sortKey="nombre" currentOrdering={ordering} onSort={handleSort} />
                            <SortableHeader label="Establecimiento" sortKey="establecimiento__nombre" currentOrdering={ordering} onSort={handleSort} />
                            <th className="p-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Ubicación</th>
                            <th className="p-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredKeys.map(key => (
                            <tr key={key.id} className="hover:bg-slate-50 transition-colors text-xs">
                                <td className="p-2.5">
                                    {key.disponible ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800">
                                            <Unlock className="w-3 h-3" /> Disponible
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800">
                                            <Lock className="w-3 h-3" /> En Préstamo
                                        </span>
                                    )}
                                </td>
                                <td className="p-2.5 font-semibold text-slate-900">{key.nombre}</td>
                                <td className="p-2.5 text-slate-600">{key.establecimiento_nombre}</td>
                                <td className="p-2.5 text-slate-500">{key.ubicacion || '-'}</td>
                                <td className="p-2.5 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleEdit(key)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handleDelete(key.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredKeys.length === 0 && !loading && (
                    <div className="p-12 text-center text-slate-400">
                        <Key className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No se encontraron llaves.</p>
                    </div>
                )}
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    totalCount={totalCount}
                />
            </div>
        </div>
    );
};

export default Keys;
