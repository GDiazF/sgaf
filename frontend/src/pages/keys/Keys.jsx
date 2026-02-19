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
                api.get('establecimientos/?page_size=1000') // Fetch all for Select
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
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                <div>
                    <button
                        onClick={() => navigate('/loans')}
                        className="flex items-center gap-1.5 text-slate-400 hover:text-blue-600 transition-colors mb-3 text-[11px] font-black uppercase tracking-widest group"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                        Volver al Panel
                    </button>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Inventario de Llaves</h2>
                    <p className="text-slate-500 font-medium text-xs mt-1.5">Registro y configuración de activos del establecimiento.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleNew}
                        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-500/10 font-black text-[11px] uppercase tracking-[0.1em] active:scale-95 whitespace-nowrap shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        Nueva Llave
                    </button>
                </div>
            </div>

            {/* Refined Filter Bar */}
            <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center gap-2 mb-6">
                <div className="flex-1">
                    <FilterBar
                        onSearch={handleSearch}
                        placeholder="Buscar llave por nombre o establecimiento..."
                        inputClassName="!shadow-none"
                    />
                </div>
                <div className="flex items-center gap-2 px-4 py-2 border-l border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Ordenar:</span>
                    <select
                        value={ordering}
                        onChange={(e) => handleSort(e.target.value)}
                        className="bg-transparent text-[11px] font-black text-slate-700 focus:outline-none cursor-pointer hover:text-blue-600 transition-colors"
                    >
                        <option value="nombre">Nombre (A-Z)</option>
                        <option value="-nombre">Nombre (Z-A)</option>
                        <option value="establecimiento__nombre">Establecimiento</option>
                    </select>
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
                            <th className="p-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest pl-8">Llave</th>
                            <th className="p-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Establecimiento</th>
                            <th className="p-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                            <th className="p-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right pr-8">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredKeys.map(key => (
                            <tr key={key.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="p-2.5 pl-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                            <Key className="w-3.5 h-3.5" />
                                        </div>
                                        <p className="text-[13px] font-black text-slate-900 truncate">{key.nombre}</p>
                                    </div>
                                </td>
                                <td className="p-2.5">
                                    <p className="text-[11px] font-bold text-slate-600">{key.establecimiento_nombre}</p>
                                </td>
                                <td className="p-2.5">
                                    {!key.disponible ? (
                                        <div className="flex flex-col gap-0.5">
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100 w-fit">
                                                En uso
                                            </span>
                                            <p className="text-[9px] text-slate-400 font-bold truncate max-w-[120px]">
                                                {key.solicitante_actual}
                                            </p>
                                        </div>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                                            Disponible
                                        </span>
                                    )}
                                </td>
                                <td className="p-2.5 text-right pr-8">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => handleEdit(key)}
                                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handleDelete(key.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
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
