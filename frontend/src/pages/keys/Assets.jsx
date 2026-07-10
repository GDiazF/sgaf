import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { Key, Search, Plus, Edit2, Trash2, X, Save, Building, Lock, Unlock, ArrowLeft, RefreshCw } from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import Pagination from '../../components/common/Pagination';
import AssetModal from '../../components/keys/AssetModal';

const Assets = () => {
    const navigate = useNavigate();
    const { can } = usePermission();
    const [assets, setAssets] = useState([]);
    const [establishments, setEstablishments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Pagination, Page Size & Search
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
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
                ordering: order,
                page_size: pageSize
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
            setTotalPages(Math.ceil((assetsRes.data.count || 0) / pageSize));

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
    }, [currentPage, ordering, availabilityFilter, pageSize]);

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
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden">
            {/* Header Area */}
            <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                <div>
                    <button
                        type="button"
                        onClick={() => navigate('/loans')}
                        className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-650 transition-colors mb-2 text-[10px] font-black uppercase tracking-widest group"
                    >
                        <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                        <span>Volver al Panel</span>
                    </button>
                    <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase">Inventario de Activos</h2>
                    <div className="flex items-center gap-2 mt-1.5">
                        <p className="text-[10px] md:text-xs font-medium text-slate-500 uppercase ml-0">Registro y configuración de activos institucionales.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={handleNew}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 shrink-0 active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nuevo Activo</span>
                    </button>
                </div>
            </div>

            {/* Refined Filter Bar */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3 items-center shrink-0">
                <div className="relative flex-1 w-full shrink-0">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input 
                        type="text" 
                        placeholder="BUSCAR ACTIVO POR NOMBRE, CÓDIGO O ESTABLECIMIENTO..."
                        className="no-global w-full h-10 text-[10px] font-bold bg-white border border-slate-200 pl-10 pr-4 rounded-xl outline-none focus:border-indigo-500 uppercase transition-all shadow-sm placeholder:text-slate-350"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
                    {/* Filtro Cantidad de Registros (page_size) */}
                    <div className="relative w-full sm:w-28 shrink-0">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase tracking-widest pointer-events-none z-10">Ver:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="no-global w-full text-[10px] font-black uppercase tracking-widest pl-11 pr-8 h-10 rounded-xl border border-slate-200 outline-none cursor-pointer appearance-none bg-white text-slate-700 focus:border-indigo-500 shadow-sm bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem_1rem] bg-[right_0.5rem_center] bg-no-repeat"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>

                    <div className="relative w-full sm:w-44 shrink-0">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase tracking-widest pointer-events-none z-10">Estado:</span>
                        <select
                            value={availabilityFilter}
                            onChange={(e) => {
                                setAvailabilityFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="no-global w-full text-[10px] font-black uppercase tracking-widest pl-16 pr-8 h-10 rounded-xl border border-slate-200 outline-none cursor-pointer appearance-none bg-white text-slate-700 focus:border-indigo-500 shadow-sm bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem_1rem] bg-[right_0.5rem_center] bg-no-repeat"
                        >
                            <option value="all">TODAS</option>
                            <option value="available">DISPONIBLES</option>
                            <option value="in_use">EN USO</option>
                        </select>
                    </div>
                    
                    <div className="relative w-full sm:w-48 shrink-0">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase tracking-widest pointer-events-none z-10">Orden:</span>
                        <select
                            value={ordering}
                            onChange={(e) => handleSort(e.target.value)}
                            className="no-global w-full text-[10px] font-black uppercase tracking-widest pl-16 pr-8 h-10 rounded-xl border border-slate-200 outline-none cursor-pointer appearance-none bg-white text-slate-700 focus:border-indigo-500 shadow-sm bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem_1rem] bg-[right_0.5rem_center] bg-no-repeat"
                        >
                            <option value="nombre">NOMBRE (A-Z)</option>
                            <option value="-nombre">NOMBRE (Z-A)</option>
                            <option value="establecimiento__nombre">ESTABLECIMIENTO</option>
                        </select>
                    </div>
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

            {/* Table List (Zero-Scroll) */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-0 relative">
                {loading ? (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-[99] flex flex-col items-center justify-center gap-3">
                        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest animate-pulse">Cargando inventario de activos...</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                            <table className="w-full text-left border-collapse border-spacing-0">
                                <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                                    <tr className="border-b border-slate-200">
                                        <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest pl-8 w-28 bg-slate-50">Tipo</th>
                                        <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest pl-4 bg-slate-50">Identificación</th>
                                        <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">Establecimiento</th>
                                        <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">Estado</th>
                                        <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right pr-8 bg-slate-50">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {filteredAssets.map(asset => (
                                        <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="p-3 pl-8">
                                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-250">
                                                    {asset.tipo_nombre || asset.tipo}
                                                </span>
                                            </td>
                                            <td className="p-3 pl-4">
                                                <div className="flex flex-col justify-center">
                                                    <p className="text-xs font-semibold text-slate-700 truncate uppercase">{asset.nombre}</p>
                                                    {asset.codigo_inventario && (
                                                        <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase">S/N: {asset.codigo_inventario}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <p className="text-[11px] font-medium text-slate-500 truncate max-w-[220px] uppercase">{asset.establecimiento_nombre}</p>
                                            </td>
                                            <td className="p-3">
                                                {!asset.disponible ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100 w-fit">
                                                            En uso
                                                        </span>
                                                        <p className="text-[8px] text-slate-400 font-medium uppercase truncate max-w-[120px] mt-0.5">
                                                            {asset.solicitante_actual}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                        Disponible
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3 text-right pr-8">
                                                <div className="flex justify-end gap-1.5">
                                                    {can('prestamo_llaves.change_activo') && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEdit(asset)}
                                                            className="p-1.5 text-slate-400 hover:text-indigo-650 hover:bg-slate-100 rounded-lg transition-all active:scale-90"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {can('prestamo_llaves.delete_activo') && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleDelete(asset.id)} 
                                                            className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-slate-100 rounded-lg transition-all active:scale-90"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredAssets.length === 0 && (
                                <div className="p-12 text-center text-slate-400">
                                    <Key className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No se encontraron activos registrados.</p>
                                </div>
                            )}
                        </div>
                        <div className="p-3 border-t border-slate-150 bg-slate-50/50 shrink-0">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                                totalCount={totalCount}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Assets;
