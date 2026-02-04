import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Building, Search, Plus, Edit2, Trash2, X, Save, CheckCircle, XCircle, Power } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Pagination from '../../components/common/Pagination';
import FilterBar from '../../components/common/FilterBar';
import SortableHeader from '../../components/common/SortableHeader';
import EstablishmentModal from '../../components/establishments/EstablishmentModal';

const TIPOS = [
    { value: 'SALA_CUNA', label: 'Sala Cuna' },
    { value: 'JARDIN_INFANTIL', label: 'Jardín Infantil' },
    { value: 'ESCUELA', label: 'Escuela' },
    { value: 'LICEO', label: 'Liceo' },
    { value: 'CENTRO_CAPACITACION', label: 'Centro de Capacitación' },
    { value: 'ADMINISTRACION', label: 'Administración' },
];

const Establishments = () => {
    const [establishments, setEstablishments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Pagination & Search State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [ordering, setOrdering] = useState('nombre');

    const [editingId, setEditingId] = useState(null);

    const [filterType, setFilterType] = useState('');

    const [formData, setFormData] = useState({
        rbd: '',
        nombre: '',
        tipo: 'escuela',
        director: '',
        direccion: '',
        email: '',
        activo: true
    });


    const fetchData = async (page = 1, search = '', type = '', order = ordering) => {
        setLoading(true);
        try {
            const params = {
                page,
                search,
                ...(type && { tipo: type }),
                ordering: order
            };
            const response = await api.get('establecimientos/', { params });

            // Handle Pagination
            setEstablishments(response.data.results || []);
            setTotalCount(response.data.count || 0);
            setTotalPages(Math.ceil((response.data.count || 0) / 10)); // Assuming page_size=10

        } catch (error) {
            console.error("Error fetching establishments:", error);
            setEstablishments([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(currentPage, searchQuery, filterType, ordering);
    }, [currentPage, filterType, ordering]); // Refetch when Page, Filter or Ordering changes

    const handleSearch = (query) => {
        setSearchQuery(query);
        setCurrentPage(1);
        fetchData(1, query, filterType, ordering);
    };

    const handleFilterChange = (e) => {
        setFilterType(e.target.value);
        setCurrentPage(1);
        // Effect will trigger fetch
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleSort = (newOrdering) => {
        setOrdering(newOrdering);
        setCurrentPage(1);
    };

    const handleEdit = (item) => {
        setFormData(item);
        setEditingId(item.id);
        setShowForm(true);
    };

    const handleNew = () => {
        setFormData({
            rbd: '',
            nombre: '',
            tipo: 'escuela',
            director: '',
            direccion: '',
            email: '',
            activo: true
        });
        setEditingId(null);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Seguro que desea eliminar este establecimiento?")) return;
        try {
            await api.delete(`establecimientos/${id}/`);
            fetchData(currentPage, searchQuery, filterType, ordering);
        } catch (error) {
            console.error(error);
            alert("Error al eliminar.");
        }
    };

    const handleStatusToggle = async (id, currentStatus) => {
        try {
            await api.patch(`establecimientos/${id}/`, { activo: !currentStatus });
            // Optimistic update difficult with pagination refresh, simpler to just refetch or partial update
            // Let's refetch to be safe and consistent
            fetchData(currentPage, searchQuery, filterType, ordering);
        } catch (error) {
            console.error(error);
            alert("Error al actualizar estado.");
        }
    };

    const handleSave = async (dataToSubmit) => {
        try {
            if (editingId) {
                await api.put(`establecimientos/${editingId}/`, dataToSubmit);
            } else {
                await api.post('establecimientos/', dataToSubmit);
            }
            setShowForm(false);
            fetchData(currentPage, searchQuery, filterType, ordering);
        } catch (error) {
            console.error(error);
            alert("Error al guardar.");
        }
    };

    // No client-side filtering
    const filteredData = establishments;

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Establecimientos</h2>
                    <p className="text-slate-500">Gestión de escuelas, liceos y jardines.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <select
                        value={filterType}
                        onChange={handleFilterChange}
                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                    >
                        <option value="">Todos los tipos</option>
                        {TIPOS.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>

                    <FilterBar onSearch={handleSearch} placeholder="Buscar por nombre o RBD..." />

                    <button
                        onClick={handleNew}
                        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 font-medium whitespace-nowrap"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Nuevo</span>
                    </button>
                </div>
            </div>

            {/* Modal Form */}
            <EstablishmentModal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                onSave={handleSave}
                editingId={editingId}
                initialData={formData}
            />

            {/* Table List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="p-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                <SortableHeader label="RBD" sortKey="rbd" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Nombre" sortKey="nombre" currentOrdering={ordering} onSort={handleSort} />
                                <th className="p-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                                <SortableHeader label="Director" sortKey="director" currentOrdering={ordering} onSort={handleSort} />
                                <th className="p-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                                <th className="p-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors text-xs">
                                    <td className="p-2.5">
                                        <button
                                            onClick={() => handleStatusToggle(item.id, item.activo)}
                                            className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold transition-all ${item.activo ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                        >
                                            <Power className="w-3 h-3" />
                                            {item.activo ? 'ACTIVO' : 'INACTIVO'}
                                        </button>
                                    </td>
                                    <td className="p-2.5 font-mono text-slate-600 font-semibold">{item.rbd}</td>
                                    <td className="p-2.5 font-medium text-slate-900">{item.nombre}</td>
                                    <td className="p-2.5">
                                        <span className="capitalize px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-medium border border-blue-100">
                                            {item.tipo}
                                        </span>
                                    </td>
                                    <td className="p-2.5 text-slate-600">{item.director || '-'}</td>
                                    <td className="p-2.5 text-slate-600">{item.email || '-'}</td>
                                    <td className="p-2.5 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleEdit(item)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredData.length === 0 && !loading && (
                        <div className="p-12 text-center text-slate-400">
                            <Building className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No se encontraron establecimientos.</p>
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
        </div>
    );
};

export default Establishments;
