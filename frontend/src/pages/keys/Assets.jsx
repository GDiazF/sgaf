import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { Key, Search, Plus, Edit2, Trash2, X, Save, Building, Lock, Unlock, ArrowLeft } from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import { motion, AnimatePresence } from 'framer-motion';
import Pagination from '../../components/common/Pagination';
import FilterBar from '../../components/common/FilterBar';
import SortableHeader from '../../components/common/SortableHeader';
import AssetModal from '../../components/keys/AssetModal';

const Assets = () => {
    const navigate = useNavigate();
    const { can } = usePermission();
    const [assets, setAssets] = useState([]);
    const [establishments, setEstablishments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Pagination & Search
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [availabilityFilter, setAvailabilityFilter] = useState('all'); // 'all', 'available', 'in_use'
    const [ordering, setOrdering] = useState('nombre');

    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        tipo: 'LLAVE',
        nombre: '',
        codigo_inventario: '',
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

            if (availabilityFilter === 'available') {
                params.disponible = 'true';
            } else if (availabilityFilter === 'in_use') {
                params.disponible = 'false';
            }

            const [assetsRes, estRes] = await Promise.all([
                api.get('activos/', { params }),
                api.get('establecimientos/?page_size=1000') // Fetch all for Select
            ]);

            // Handle Pagination
            setAssets(assetsRes.data.results || []);
            setTotalCount(assetsRes.data.count || 0);
            setTotalPages(Math.ceil((assetsRes.data.count || 0) / 10));

            setEstablishments(estRes.data.results || estRes.data);

        } catch (error) {
            console.error("Error fetching data:", error);
            setAssets([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(currentPage, searchQuery, ordering);
    }, [currentPage, ordering, availabilityFilter]);

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

    const handleEdit = (asset) => {
        setFormData({
            tipo: asset.tipo || 'LLAVE',
            codigo_inventario: asset.codigo_inventario || '',
            nombre: asset.nombre,
            establecimiento: asset.establecimiento,
            ubicacion: asset.ubicacion
        });
        setEditingId(asset.id);
        setShowForm(true);
    };

    const handleNew = () => {
        setFormData({ tipo: 'LLAVE', codigo_inventario: '', nombre: '', establecimiento: '', ubicacion: '' });
        setEditingId(null);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Seguro que desea eliminar este activo?")) return;
        try {
            await api.delete(`activos/${id}/`);
            fetchData(currentPage, searchQuery);
        } catch (error) {
            console.error(error);
            alert("Error al eliminar. Puede que esté asociada a préstamos históricos.");
        }
    };

    const handleSave = async (dataToSubmit) => {
        try {
            if (editingId) {
                await api.put(`activos/${editingId}/`, dataToSubmit);
            } else {
                await api.post('activos/', dataToSubmit);
            }
            setShowForm(false);
            fetchData(currentPage, searchQuery);
        } catch (error) {
            console.error(error);
            alert("Error al guardar llave.");
        }
    };

    // No client-side filtering
    const filteredAssets = assets;

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
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Inventario de Activos</h2>
                    <p className="text-slate-500 font-medium text-xs mt-1.5">Registro y configuración de activos institucionales.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleNew}
                        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-500/10 font-black text-[11px] uppercase tracking-[0.1em] active:scale-95 whitespace-nowrap shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Activo
                    </button>
                </div>
            </div>

            {/* Refined Filter Bar */}
            <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center gap-2 mb-6">
                <div className="flex-1">
                    <FilterBar
                        onSearch={handleSearch}
                        placeholder="Buscar activo por nombre, código o establecimiento..."
                        inputClassName="!shadow-none"
                    />
                </div>
                <div className="flex items-center gap-2 px-4 py-2 border-l border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Estado:</span>
                    <select
                        value={availabilityFilter}
                        onChange={(e) => {
                            setAvailabilityFilter(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="bg-transparent text-[11px] font-black text-slate-700 focus:outline-none cursor-pointer hover:text-blue-600 transition-colors"
                    >
                        <option value="all">Todas</option>
                        <option value="available">Disponibles</option>
                        <option value="in_use">En uso</option>
                    </select>
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
            <AssetModal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                onSave={handleSave}
                editingId={editingId}
                initialData={formData}
                lookups={{ establishments }}
            />

            {/* Table List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="p-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest pl-8 w-24">Tipo</th>
                                <th className="p-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest pl-4">Identificación</th>
                                <th className="p-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Establecimiento</th>
                                <th className="p-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                                <th className="p-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right pr-8">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredAssets.map(asset => (
                                <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="p-2.5 pl-8">
                                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                            {asset.tipo}
                                        </span>
                                    </td>
                                    <td className="p-2.5 pl-4">
                                        <div className="flex flex-col justify-center">
                                            <p className="text-[13px] font-black text-slate-900 truncate">{asset.nombre}</p>
                                            {asset.codigo_inventario && (
                                                <p className="text-[10px] text-slate-500 font-mono mt-0.5">S/N: {asset.codigo_inventario}</p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-2.5">
                                        <p className="text-[11px] font-bold text-slate-600 truncate max-w-[200px]">{asset.establecimiento_nombre}</p>
                                    </td>
                                    <td className="p-2.5">
                                        {!asset.disponible ? (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100 w-fit">
                                                    En uso
                                                </span>
                                                <p className="text-[9px] text-slate-400 font-bold truncate max-w-[120px]">
                                                    {asset.solicitante_actual}
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
                                            {can('prestamo_llaves.change_activo') && (
                                                <button
                                                    onClick={() => handleEdit(asset)}
                                                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            {can('prestamo_llaves.delete_activo') && (
                                                <button onClick={() => handleDelete(asset.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredAssets.length === 0 && !loading && (
                        <div className="p-12 text-center text-slate-400">
                            <Key className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No se encontraron activos.</p>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50/30">
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

export default Assets;
