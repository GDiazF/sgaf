import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import api from '../../api';
import { Building, Search, Plus, Edit2, Trash2, X, Save, CheckCircle, XCircle, Power, Phone, Mail, FileDown, Layout, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Pagination from '../../components/common/Pagination';
import FilterBar from '../../components/common/FilterBar';
import SortableHeader from '../../components/common/SortableHeader';
import EstablishmentModal from '../../components/establishments/EstablishmentModal';
import EstablishmentPhonesModal from '../../components/establishments/EstablishmentPhonesModal';
import EstablishmentCardsView from '../../components/establishments/EstablishmentCardsView';
import EstablishmentMapModal from '../../components/establishments/EstablishmentMapModal';

const Establishments = () => {
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

    const [editingId, setEditingId] = useState(null);
    const [isCardsViewOpen, setIsCardsViewOpen] = useState(false);
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [selectedEstForMap, setSelectedEstForMap] = useState(null);

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
    }, [currentPage, filterType, ordering]);

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
                        {establishmentTypes.map(t => (
                            <option key={t.id} value={t.id}>{t.nombre}</option>
                        ))}
                    </select>

                    <FilterBar onSearch={handleSearch} placeholder="Buscar por nombre o RBD..." />

                    <div className="flex gap-2">
                        <button
                            onClick={fetchAllForDirectory}
                            className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/30 font-bold whitespace-nowrap disabled:opacity-50"
                            disabled={loadingDirectory}
                        >
                            <Layout className="w-5 h-5" />
                            <span>{loadingDirectory ? 'Cargando...' : 'Directorio'}</span>
                        </button>

                        <button
                            onClick={handleExportExcel}
                            className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/30 font-medium whitespace-nowrap"
                        >
                            <FileDown className="w-5 h-5" />
                            <span>Exportar Excel</span>
                        </button>

                        <button
                            onClick={handleNew}
                            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 font-medium whitespace-nowrap"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Nuevo</span>
                        </button>
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

            {/* Table List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap table-fixed">
                        <colgroup>
                            <col style={{ width: '110px' }} /> {/* Estado */}
                            <col style={{ width: '80px' }} />  {/* RBD */}
                            <col style={{ width: '25%' }} />   {/* Nombre */}
                            <col style={{ width: '130px' }} /> {/* Tipo */}
                            <col style={{ width: '15%' }} />   {/* Director */}
                            <col style={{ width: '25%' }} />   {/* Email */}
                            <col style={{ width: '180px' }} /> {/* Teléfonos */}
                            <col style={{ width: '100px' }} /> {/* Acciones */}
                        </colgroup>
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="p-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                <SortableHeader label="RBD" sortKey="rbd" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Nombre" sortKey="nombre" currentOrdering={ordering} onSort={handleSort} />
                                <th className="p-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                                <SortableHeader label="Director" sortKey="director" currentOrdering={ordering} onSort={handleSort} />
                                <th className="p-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                                <th className="p-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Teléfonos</th>
                                <th className="p-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.map(item => {
                                const principalPhone = item.telefonos?.find(p => p.es_principal) || item.telefonos?.[0];
                                const hasMorePhones = item.telefonos?.length > 1;

                                return (
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
                                        <td className="p-2.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white shadow-sm overflow-hidden flex-shrink-0 flex items-center justify-center">
                                                    {item.logo ? (
                                                        <img src={item.logo} alt={item.nombre} className="w-full h-full object-contain p-1.5" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-[10px]">
                                                            {item.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="font-medium text-slate-900 truncate" title={item.nombre}>{item.nombre}</span>
                                            </div>
                                        </td>
                                        <td className="p-2.5">
                                            <span className="capitalize px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-medium border border-blue-100">
                                                {item.tipo_nombre}
                                            </span>
                                        </td>
                                        <td className="p-2.5 text-slate-600 truncate" title={item.director || ''}>{item.director || '-'}</td>
                                        <td className="p-2.5">
                                            {item.email ? (
                                                <a
                                                    href={`mailto:${item.email}`}
                                                    className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors group"
                                                    title={item.email}
                                                >
                                                    <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                                                        <Mail className="w-3.5 h-3.5" />
                                                    </div>
                                                    <span className="font-medium truncate">{item.email}</span>
                                                </a>
                                            ) : (
                                                <span className="text-slate-300 italic">No registrado</span>
                                            )}
                                        </td>
                                        <td className="p-2.5">
                                            {principalPhone ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-slate-900 tracking-tight">{principalPhone.numero}</span>
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{principalPhone.etiqueta}</span>
                                                    </div>
                                                    {item.telefonos.length > 1 && (
                                                        <button
                                                            onClick={() => handleOpenPhones(item)}
                                                            className="flex items-center justify-center px-1.5 h-5 rounded-lg bg-blue-600 text-white text-[9px] font-black hover:bg-blue-700 transition-all shadow-sm shadow-blue-100 border border-blue-500 whitespace-nowrap"
                                                            title="Ver todos los teléfonos"
                                                        >
                                                            +{item.telefonos.length - 1} MÁS
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 italic">Sin teléfonos</span>
                                            )}
                                        </td>
                                        <td className="p-2.5 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenMap(item)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                    title="Ver Ubicación en Mapa"
                                                >
                                                    <MapPin className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenPhones(item)}
                                                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                    title="Gestionar Teléfonos"
                                                >
                                                    <Phone className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => handleEdit(item)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
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
        </div >
    );
};

export default Establishments;
