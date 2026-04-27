import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import api from '../../api';
import { Building, Search, Plus, Edit2, Trash2, X, Save, CheckCircle, XCircle, Power, Phone, Mail, FileDown, Layout, MapPin, UserCircle2, ChevronRight } from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import { motion, AnimatePresence } from 'framer-motion';
import Pagination from '../../components/common/Pagination';
import FilterBar from '../../components/common/FilterBar';
import SortableHeader from '../../components/common/SortableHeader';
import EstablishmentModal from '../../components/establishments/EstablishmentModal';
import EstablishmentPhonesModal from '../../components/establishments/EstablishmentPhonesModal';
import EstablishmentCardsView from '../../components/establishments/EstablishmentCardsView';
import EstablishmentMapModal from '../../components/establishments/EstablishmentMapModal';
import EstablishmentDetailModal from '../../components/establishments/EstablishmentDetailModal';

const Establishments = () => {
    const { can } = usePermission();
    const [establishments, setEstablishments] = useState([]);
    const [establishmentTypes, setEstablishmentTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingDirectory, setLoadingDirectory] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [isPhonesModalOpen, setIsPhonesModalOpen] = useState(false);
    const [selectedEstForPhones, setSelectedEstForPhones] = useState(null);
    const [allEstablishments, setAllEstablishments] = useState([]);

    // Pagination & Search State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [ordering, setOrdering] = useState('nombre');
    const [pageSize, setPageSize] = useState(10);

    const [editingId, setEditingId] = useState(null);
    const [isCardsViewOpen, setIsCardsViewOpen] = useState(false);
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [selectedEstForMap, setSelectedEstForMap] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedEstForDetail, setSelectedEstForDetail] = useState(null);

    const [filterType, setFilterType] = useState('');

    const [formData, setFormData] = useState({
        rbd: '',
        nombre: '',
        tipo: '',
        director: '',
        direccion: '',
        email: '',
        latitud: '',
        longitud: '',
        activo: true
    });


    const fetchData = async (page = 1, search = '', type = '', order = ordering) => {
        setLoading(true);
        try {
            const params = {
                page,
                page_size: pageSize,
                search,
                ...(type && { tipo: type }),
                ordering: order
            };
            const response = await api.get('establecimientos/', { params });

            // Handle Pagination
            setEstablishments(response.data.results || []);
            setTotalCount(response.data.count || 0);
            setTotalPages(Math.ceil((response.data.count || 0) / pageSize));

        } catch (error) {
            console.error("Error fetching establishments:", error);
            setEstablishments([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchTypes = async () => {
        try {
            const response = await api.get('tipos-establecimiento/');
            setEstablishmentTypes(response.data.results || response.data);
            // Si hay tipos, poner el primero como default para el form si es nuevo
            if ((response.data.results || response.data).length > 0) {
                setFormData(prev => ({ ...prev, tipo: (response.data.results || response.data)[0].id }));
            }
        } catch (error) {
            console.error("Error fetching types:", error);
        }
    };

    const fetchAllForDirectory = () => {
        if (allEstablishments.length === 0) {
            // In case it hasn't loaded yet
            const loadData = async () => {
                setLoadingDirectory(true);
                try {
                    const response = await api.get('establecimientos/', {
                        params: { page_size: 1000 }
                    });
                    setAllEstablishments(response.data.results || response.data);
                    setIsCardsViewOpen(true);
                } catch (error) {
                    console.error("Error fetching all establishments:", error);
                    alert("Error al cargar el directorio completo.");
                } finally {
                    setLoadingDirectory(false);
                }
            };
            loadData();
        } else {
            setIsCardsViewOpen(true);
        }
    };

    useEffect(() => {
        fetchTypes();
        // Fetch all establishments for map and directory on mount
        const loadAllData = async () => {
            try {
                const response = await api.get('establecimientos/', {
                    params: { page_size: 1000 }
                });
                setAllEstablishments(response.data.results || response.data);
            } catch (error) {
                console.error("Error fetching all establishments for map:", error);
            }
        };
        loadAllData();
    }, []);

    useEffect(() => {
        fetchData(currentPage, searchQuery, filterType, ordering);
    }, [currentPage, filterType, ordering, pageSize]);

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

    const handleOpenPhones = (item) => {
        setSelectedEstForPhones(item);
        setIsPhonesModalOpen(true);
    };

    const handleOpenMap = (item) => {
        setSelectedEstForMap(item);
        setIsMapModalOpen(true);
    };

    const handleOpenDetail = (item) => {
        setSelectedEstForDetail(item);
        setIsDetailModalOpen(true);
    };

    const handleExportExcel = () => {
        if (allEstablishments.length === 0) {
            alert("No hay datos para exportar.");
            return;
        }

        // Prepare data for Excel
        const exportData = allEstablishments.map(est => ({
            'RBD': est.rbd,
            'Nombre': est.nombre,
            'Tipo': est.tipo_nombre,
            'Director/a': est.director || 'No asignado',
            'Email': est.email || 'Sin email',
            'Dirección': est.direccion || 'Sin dirección',
            'Teléfonos': (est.telefonos || []).map(t => t.numero).join(', '),
            'Latitud': est.latitud || '',
            'Longitud': est.longitud || '',
            'Estado': est.activo ? 'Activo' : 'Inactivo'
        }));

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(exportData);

        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Establecimientos");

        // Download file
        XLSX.writeFile(wb, `Establecimientos_SLEP_${new Date().getFullYear()}.xlsx`);
    };

    const handleNew = () => {
        setFormData({
            rbd: '',
            nombre: '',
            tipo: establishmentTypes.length > 0 ? establishmentTypes[0].id : '',
            director: '',
            direccion: '',
            email: '',
            latitud: '',
            longitud: '',
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
            const formDataToSend = new FormData();
            Object.keys(dataToSubmit).forEach(key => {
                if (key === 'logo' && dataToSubmit[key] instanceof File) {
                    formDataToSend.append(key, dataToSubmit[key]);
                } else if (key !== 'logo' && key !== 'telefonos') {
                    formDataToSend.append(key, dataToSubmit[key]);
                }
            });

            if (editingId) {
                await api.put(`establecimientos/${editingId}/`, formDataToSend, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await api.post('establecimientos/', formDataToSend, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
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
        <div className="flex flex-col w-full lg:h-[calc(100vh-140px)] lg:overflow-hidden">
            <div className="shrink-0 mb-6 lg:mb-4 px-1">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight uppercase leading-none">Establecimientos</h2>
                        <p className="text-[10px] md:text-xs text-slate-500 font-normal mt-1">Gestión institucional de escuelas, liceos y jardines.</p>
                    </div>
                    {can('establecimientos.add_establecimiento') && (
                        <button
                            onClick={handleNew}
                            className="lg:hidden p-2.5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-transform"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row flex-1 gap-2">
                        <div className="relative w-full lg:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar establecimiento..."
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all shadow-sm"
                            />
                        </div>
                        <div className="flex gap-2">
                            <select
                                value={filterType}
                                onChange={handleFilterChange}
                                className="flex-1 sm:w-64 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                            >
                                <option value="">TODOS LOS TIPOS</option>
                                {establishmentTypes.map(t => (
                                    <option key={t.id} value={t.id}>{t.nombre.toUpperCase()}</option>
                                ))}
                            </select>
                            <select
                                value={pageSize}
                                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                                className="w-20 px-2 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm text-center"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportExcel}
                            className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl border border-emerald-100 font-semibold text-[10px] uppercase hover:bg-emerald-100 transition-colors"
                        >
                            <FileDown className="w-3.5 h-3.5" />
                            <span className="sm:inline uppercase">Excel</span>
                        </button>

                        {can('establecimientos.add_establecimiento') && (
                            <button
                                onClick={handleNew}
                                className="hidden lg:flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all font-semibold text-[10px] uppercase shadow-lg shadow-blue-600/20 active:scale-95"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Nuevo</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Form */}
            <EstablishmentModal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                onSave={handleSave}
                editingId={editingId}
                initialData={formData}
                establishmentTypes={establishmentTypes}
            />

            {/* Phones Modal */}
            <EstablishmentPhonesModal
                isOpen={isPhonesModalOpen}
                onClose={() => {
                    setIsPhonesModalOpen(false);
                    fetchData(currentPage, searchQuery, filterType, ordering);
                }}
                establishment={selectedEstForPhones}
            />

            {/* Directory Cards View */}
            <EstablishmentCardsView
                isOpen={isCardsViewOpen}
                onClose={() => setIsCardsViewOpen(false)}
                data={allEstablishments}
                establishmentTypes={establishmentTypes}
            />

            {/* Map Modal */}
            <EstablishmentMapModal
                isOpen={isMapModalOpen}
                onClose={() => setIsMapModalOpen(false)}
                establishment={selectedEstForMap}
                allEstablishments={allEstablishments}
            />

            {/* Detail Modal */}
            <EstablishmentDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                establishment={selectedEstForDetail}
                allEstablishments={allEstablishments}
            />

            {/* Mobile Cards View */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-4 mb-6">
                {filteredData.map(item => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {item.logo ? (
                                    <img src={item.logo} alt="" className="w-full h-full object-contain p-1" />
                                ) : (
                                    <Building className="w-6 h-6 text-slate-300" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-semibold text-slate-800 text-sm truncate uppercase leading-tight">{item.nombre}</h3>
                                <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-widest">{item.tipo_nombre} • RBD {item.rbd}</p>
                            </div>
                        </div>

                        <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                <UserCircle2 className="w-3.5 h-3.5" />
                                <span className="truncate">Dir: {item.director || 'No asignado'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 italic">
                                <MapPin className="w-3.5 h-3.5" />
                                <span className="truncate">{item.direccion || 'Sin dirección registrada'}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-auto pt-4 border-t border-slate-50">
                            {item.telefonos && item.telefonos.length > 0 ? (
                                <a
                                    href={`tel:${item.telefonos[0].numero}`}
                                    className="flex items-center justify-center gap-2 bg-blue-50 text-blue-700 py-2.5 rounded-xl font-semibold text-[10px] uppercase shadow-sm active:scale-95 transition-all"
                                >
                                    <Phone className="w-3.5 h-3.5" /> Tel.
                                </a>
                            ) : (
                                <button className="flex items-center justify-center gap-2 bg-slate-50 text-slate-400 py-2.5 rounded-xl font-semibold text-[10px] uppercase cursor-not-allowed">
                                    <Phone className="w-3.5 h-3.5" /> No
                                </button>
                            )}

                            <button
                                onClick={() => handleOpenMap(item)}
                                className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 py-2.5 rounded-xl font-semibold text-[10px] uppercase shadow-sm hover:bg-emerald-100 active:scale-95 transition-all"
                            >
                                <MapPin className="w-3.5 h-3.5" /> Mapa
                            </button>

                            <button
                                onClick={() => handleOpenDetail(item)}
                                className="flex items-center justify-center gap-2 bg-slate-50 text-slate-700 py-2.5 rounded-xl font-semibold text-[10px] uppercase shadow-sm hover:bg-slate-100 active:scale-95 transition-all"
                            >
                                <Layout className="w-3.5 h-3.5" /> Info
                            </button>
                        </div>

                    </motion.div>
                ))}
            </div>

            {/* Desktop Table List */}
            <div className="hidden lg:flex flex-1 flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-0">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                                <SortableHeader label="RBD" sortKey="rbd" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Nombre" sortKey="nombre" currentOrdering={ordering} onSort={handleSort} />
                                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                                <SortableHeader label="Director" sortKey="director" currentOrdering={ordering} onSort={handleSort} />
                                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                            {filteredData.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="py-1 px-4">
                                        <button
                                            onClick={() => handleStatusToggle(item.id, item.activo)}
                                            className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-semibold transition-all ${item.activo ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                        >
                                            <Power className="w-3 h-3" />
                                            {item.activo ? 'ACTIVO' : 'INACTIVO'}
                                        </button>
                                    </td>
                                    <td className="py-1 px-4 font-mono text-[11px] font-semibold text-slate-400">{item.rbd}</td>
                                    <td className="py-1 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:bg-white transition-colors">
                                                {item.logo ? <img src={item.logo} className="w-full h-full object-contain p-1" /> : <Building className="w-5 h-5 text-slate-300" />}
                                            </div>
                                            <span onClick={() => handleOpenDetail(item)} className="font-semibold text-slate-800 text-[12px] hover:text-blue-600 cursor-pointer">{item.nombre}</span>
                                        </div>
                                    </td>
                                    <td className="py-1 px-4">
                                        <span className="capitalize px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold uppercase border border-blue-100">
                                            {item.tipo_nombre}
                                        </span>
                                    </td>
                                    <td className="py-1 px-4 text-xs font-normal text-slate-600">{item.director || '-'}</td>
                                    <td className="py-1 px-4 text-right">
                                        <div className="flex justify-end items-center gap-1.5">
                                            <button onClick={() => handleOpenPhones(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Teléfonos"><Phone className="w-4 h-4" /></button>
                                            <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Editar"><Edit2 className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination for both views */}
            <div className="shrink-0 py-4 flex justify-center lg:justify-end">
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

export default Establishments;
