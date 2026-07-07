import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import api from '../../api';
import {
    Building, Building2, Search, Plus, Edit3, Trash2, Phone, FileDown, Layout, MapPin,
    UserCircle2, FilterX, Loader2,
} from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import Pagination from '../../components/common/Pagination';
import SortableHeader from '../../components/common/SortableHeader';
import EstablishmentModal from '../../components/establishments/EstablishmentModal';
import EstablishmentPhonesModal from '../../components/establishments/EstablishmentPhonesModal';
import EstablishmentCardsView from '../../components/establishments/EstablishmentCardsView';
import EstablishmentMapModal from '../../components/establishments/EstablishmentMapModal';
import EstablishmentDetailModal from '../../components/establishments/EstablishmentDetailModal';
import { TableLoading, TableEmpty } from '../funcionarios/shared/FuncionariosTableStates';
import {
    PAGE_LAYOUT, TABLE_PANEL, THEAD_TR, TH, TD, TD_MAIN,
    BTN_SECONDARY, BTN_ICON_EDIT, BTN_ICON_DELETE, statusBadgeClass,
} from '../funcionarios/shared/funcionariosUi';
import { BTN_BLUE, BTN_EXCEL, INPUT_FILTER, SELECT_FILTER, TYPE_BADGE, TITLE_ICON_BOX } from './establishmentsUi';

const EstablishmentMobileCard = ({
    item, canChange, canDelete, onDetail, onPhones, onMap, onEdit, onDelete, onToggleStatus,
}) => {
    const StatusControl = canChange ? 'button' : 'span';
    return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3 hover:border-blue-200/60 transition-all">
        <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                {item.logo ? (
                    <img src={item.logo} alt="" className="w-full h-full object-contain p-1" />
                ) : (
                    <Building2 className="w-5 h-5 text-slate-300" />
                )}
            </div>
            <div className="min-w-0 flex-1">
                <button
                    type="button"
                    onClick={() => onDetail(item)}
                    className="text-[11px] font-medium text-slate-700 uppercase tracking-tighter line-clamp-2 text-left hover:text-blue-600 transition-colors"
                >
                    {item.nombre}
                </button>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-1">
                    {item.tipo_nombre} · RBD {item.rbd}
                </p>
                <StatusControl
                    type={canChange ? 'button' : undefined}
                    onClick={canChange ? () => onToggleStatus(item.id, item.activo) : undefined}
                    className={`${statusBadgeClass(item.activo)} mt-2 ${!canChange ? 'cursor-default' : ''}`}
                >
                    {item.activo ? 'Activo' : 'Inactivo'}
                </StatusControl>
            </div>
        </div>
        <div className="space-y-1.5 text-[10px] font-medium text-slate-500 uppercase tracking-tighter">
            <p className="flex items-center gap-2 truncate">
                <UserCircle2 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                {item.director || 'Sin director/a'}
            </p>
            <p className="flex items-center gap-2 truncate">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                {item.direccion || 'Sin dirección'}
            </p>
        </div>
        <div className="flex flex-wrap items-center gap-1 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => onPhones(item)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Teléfonos">
                <Phone className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => onMap(item)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Mapa">
                <MapPin className="w-3.5 h-3.5" />
            </button>
            {canChange && (
                <button type="button" onClick={() => onEdit(item)} className={BTN_ICON_EDIT} title="Editar">
                    <Edit3 className="w-3.5 h-3.5" />
                </button>
            )}
            {canDelete && (
                <button type="button" onClick={() => onDelete(item.id)} className={BTN_ICON_DELETE} title="Eliminar">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    </div>
    );
};

const Establishments = () => {
    const { can } = usePermission();
    const canAdd = can('establecimientos.add_establecimiento');
    const canChange = can('establecimientos.change_establecimiento');
    const canDelete = can('establecimientos.delete_establecimiento');

    const [establishments, setEstablishments] = useState([]);
    const [establishmentTypes, setEstablishmentTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingDirectory, setLoadingDirectory] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [isPhonesModalOpen, setIsPhonesModalOpen] = useState(false);
    const [selectedEstForPhones, setSelectedEstForPhones] = useState(null);
    const [allEstablishments, setAllEstablishments] = useState([]);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [ordering, setOrdering] = useState('nombre');
    const [pageSize, setPageSize] = useState(10);
    const debouncedSearchQuery = useDebouncedValue(searchQuery);

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
        url_web: '',
        latitud: '',
        longitud: '',
        activo: true,
    });

    const fetchData = async (page = 1, search = '', type = '', order = ordering) => {
        setLoading(true);
        try {
            const params = {
                page,
                page_size: pageSize,
                search,
                ...(type && { tipo: type }),
                ordering: order,
            };
            const response = await api.get('establecimientos/', { params });
            setEstablishments(response.data.results || []);
            setTotalCount(response.data.count || 0);
            setTotalPages(Math.ceil((response.data.count || 0) / pageSize));
        } catch (error) {
            console.error('Error fetching establishments:', error);
            setEstablishments([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchTypes = async () => {
        try {
            const response = await api.get('tipos-establecimiento/');
            setEstablishmentTypes(response.data.results || response.data);
            if ((response.data.results || response.data).length > 0) {
                setFormData(prev => ({ ...prev, tipo: (response.data.results || response.data)[0].id }));
            }
        } catch (error) {
            console.error('Error fetching types:', error);
        }
    };

    const fetchAllForDirectory = () => {
        if (allEstablishments.length === 0) {
            const loadData = async () => {
                setLoadingDirectory(true);
                try {
                    const response = await api.get('establecimientos/', { params: { page_size: 1000 } });
                    setAllEstablishments(response.data.results || response.data);
                    setIsCardsViewOpen(true);
                } catch (error) {
                    console.error('Error fetching all establishments:', error);
                    alert('Error al cargar el directorio completo.');
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
        const loadAllData = async () => {
            try {
                const response = await api.get('establecimientos/', { params: { page_size: 1000 } });
                setAllEstablishments(response.data.results || response.data);
            } catch (error) {
                console.error('Error fetching all establishments for map:', error);
            }
        };
        loadAllData();
    }, []);

    useEffect(() => {
        fetchData(currentPage, debouncedSearchQuery, filterType, ordering);
    }, [currentPage, debouncedSearchQuery, filterType, ordering, pageSize]);

    const handleSearch = (query) => {
        setSearchQuery(query);
        setCurrentPage(1);
    };

    const handleFilterChange = (e) => {
        setFilterType(e.target.value);
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setSearchQuery('');
        setFilterType('');
        setCurrentPage(1);
    };

    const handlePageChange = (page) => setCurrentPage(page);

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
        setSelectedEstForMap(item || null);
        setIsMapModalOpen(true);
    };

    const handleOpenDetail = (item) => {
        setSelectedEstForDetail(item);
        setIsDetailModalOpen(true);
    };

    const handleExportExcel = () => {
        if (allEstablishments.length === 0) {
            alert('No hay datos para exportar.');
            return;
        }
        const exportData = allEstablishments.map(est => ({
            RBD: est.rbd,
            Nombre: est.nombre,
            Tipo: est.tipo_nombre,
            'Director/a': est.director || 'No asignado',
            Email: est.email || 'Sin email',
            Dirección: est.direccion || 'Sin dirección',
            Teléfonos: (est.telefonos || []).map(t => t.numero).join(', '),
            Latitud: est.latitud || '',
            Longitud: est.longitud || '',
            Estado: est.activo ? 'Activo' : 'Inactivo',
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Establecimientos');
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
            url_web: '',
            latitud: '',
            longitud: '',
            activo: true,
        });
        setEditingId(null);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Seguro que desea eliminar este establecimiento?')) return;
        try {
            await api.delete(`establecimientos/${id}/`);
            fetchData(currentPage, searchQuery, filterType, ordering);
        } catch (error) {
            console.error(error);
            alert('Error al eliminar.');
        }
    };

    const handleStatusToggle = async (id, currentStatus) => {
        try {
            await api.patch(`establecimientos/${id}/`, { activo: !currentStatus });
            fetchData(currentPage, searchQuery, filterType, ordering);
        } catch (error) {
            console.error(error);
            alert('Error al actualizar estado.');
        }
    };

    const handleSave = async (dataToSubmit) => {
        try {
            const formDataToSend = new FormData();
            Object.keys(dataToSubmit).forEach(key => {
                const value = dataToSubmit[key];
                if (key === 'logo') {
                    if (value instanceof File) formDataToSend.append(key, value);
                } else if (['latitud', 'longitud', 'rbd'].includes(key)) {
                    if (value !== '' && value !== null && value !== undefined) {
                        formDataToSend.append(key, value);
                    }
                } else if (key !== 'telefonos' && key !== 'telefonos_detalle') {
                    formDataToSend.append(key, value === null ? '' : value);
                }
            });

            if (editingId) {
                await api.patch(`establecimientos/${editingId}/`, formDataToSend, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                await api.post('establecimientos/', formDataToSend, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }
            setShowForm(false);
            fetchData(currentPage, searchQuery, filterType, ordering);
        } catch (error) {
            console.error('Error saving establishment:', error.response?.data || error);
            const errorMsg = error.response?.data
                ? Object.entries(error.response.data).map(([k, v]) => `${k}: ${v}`).join('\n')
                : 'Error al guardar.';
            alert('Error al guardar:\n' + errorMsg);
        }
    };

    const filteredData = establishments;
    const sortTh = `${TH} cursor-pointer hover:bg-slate-100/80 transition-colors`;

    return (
        <div className={PAGE_LAYOUT}>
            <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className={TITLE_ICON_BOX}>
                        <Building className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase">
                            Establecimientos
                        </h2>
                        <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-1.5">
                            Gestión institucional de escuelas, liceos y jardines
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <button
                        type="button"
                        onClick={fetchAllForDirectory}
                        disabled={loadingDirectory}
                        className={BTN_SECONDARY}
                    >
                        {loadingDirectory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layout className="w-4 h-4 shrink-0" />}
                        Directorio
                    </button>
                    <button type="button" onClick={() => handleOpenMap(null)} className={BTN_SECONDARY}>
                        <MapPin className="w-4 h-4 shrink-0" />
                        Mapa
                    </button>
                    <button type="button" onClick={handleExportExcel} className={BTN_EXCEL}>
                        <FileDown className="w-4 h-4 shrink-0" />
                        Excel
                    </button>
                    {canAdd && (
                        <button type="button" onClick={handleNew} className={BTN_BLUE}>
                            <Plus className="w-4 h-4 shrink-0" />
                            Nuevo
                        </button>
                    )}
                </div>
            </div>

            <EstablishmentModal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                onSave={handleSave}
                editingId={editingId}
                initialData={formData}
                establishmentTypes={establishmentTypes}
            />

            <EstablishmentPhonesModal
                isOpen={isPhonesModalOpen}
                onClose={() => {
                    setIsPhonesModalOpen(false);
                    fetchData(currentPage, searchQuery, filterType, ordering);
                }}
                establishment={selectedEstForPhones}
            />

            <EstablishmentCardsView
                isOpen={isCardsViewOpen}
                onClose={() => setIsCardsViewOpen(false)}
                data={allEstablishments}
                establishmentTypes={establishmentTypes}
            />

            <EstablishmentMapModal
                isOpen={isMapModalOpen}
                onClose={() => setIsMapModalOpen(false)}
                establishment={selectedEstForMap}
                allEstablishments={allEstablishments}
            />

            <EstablishmentDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                establishment={selectedEstForDetail}
                allEstablishments={allEstablishments}
            />

            <div className={TABLE_PANEL}>
                <div className="shrink-0 flex flex-col lg:flex-row items-stretch lg:items-center gap-3 p-3 bg-slate-50 border-b border-slate-200">
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Buscar establecimiento..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className={INPUT_FILTER}
                        />
                    </div>
                    <select
                        value={filterType}
                        onChange={handleFilterChange}
                        className={`${SELECT_FILTER} w-full lg:w-52`}
                    >
                        <option value="">Todos los tipos</option>
                        {establishmentTypes.map(t => (
                            <option key={t.id} value={t.id}>{t.nombre}</option>
                        ))}
                    </select>
                    <select
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                        className={`${SELECT_FILTER} w-full lg:w-28`}
                        title="Registros por página"
                    >
                        <option value={10}>10 / pág.</option>
                        <option value={20}>20 / pág.</option>
                        <option value={50}>50 / pág.</option>
                        <option value={100}>100 / pág.</option>
                    </select>
                    <button
                        type="button"
                        onClick={clearFilters}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0 self-center"
                        title="Limpiar filtros"
                    >
                        <FilterX className="w-4 h-4" />
                    </button>
                </div>

                <div className="overflow-auto flex-1 bg-white custom-scrollbar min-h-0">
                    {loading ? (
                        <TableLoading />
                    ) : filteredData.length === 0 ? (
                        <TableEmpty />
                    ) : (
                        <>
                            <div className="lg:hidden p-3 flex flex-col gap-3">
                                {filteredData.map(item => (
                                    <EstablishmentMobileCard
                                        key={item.id}
                                        item={item}
                                        canChange={canChange}
                                        canDelete={canDelete}
                                        onDetail={handleOpenDetail}
                                        onPhones={handleOpenPhones}
                                        onMap={handleOpenMap}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                        onToggleStatus={handleStatusToggle}
                                    />
                                ))}
                            </div>

                            <div className="hidden lg:block overflow-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse border-spacing-0">
                                    <thead className="sticky top-0 z-10">
                                        <tr className={THEAD_TR}>
                                            <th className={`${TH} text-center w-28`}>Estado</th>
                                            <SortableHeader
                                                label="RBD"
                                                sortKey="rbd"
                                                currentOrdering={ordering}
                                                onSort={handleSort}
                                                className={sortTh}
                                            />
                                            <SortableHeader
                                                label="Nombre"
                                                sortKey="nombre"
                                                currentOrdering={ordering}
                                                onSort={handleSort}
                                                className={sortTh}
                                            />
                                            <th className={TH}>Tipo</th>
                                            <SortableHeader
                                                label="Director"
                                                sortKey="director"
                                                currentOrdering={ordering}
                                                onSort={handleSort}
                                                className={sortTh}
                                            />
                                            <th className={`${TH} text-center border-r-0`}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredData.map(item => (
                                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className={TD}>
                                                    {canChange ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStatusToggle(item.id, item.activo)}
                                                            className={statusBadgeClass(item.activo)}
                                                        >
                                                            {item.activo ? 'Activo' : 'Inactivo'}
                                                        </button>
                                                    ) : (
                                                        <span className={`${statusBadgeClass(item.activo)} cursor-default`}>
                                                            {item.activo ? 'Activo' : 'Inactivo'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className={`${TD} font-mono normal-case`}>{item.rbd}</td>
                                                <td className={TD_MAIN}>
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                                                            {item.logo ? (
                                                                <img src={item.logo} alt="" className="w-full h-full object-contain p-1" />
                                                            ) : (
                                                                <Building2 className="w-4 h-4 text-slate-300" />
                                                            )}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenDetail(item)}
                                                            className="text-left hover:text-blue-600 transition-colors line-clamp-1"
                                                        >
                                                            {item.nombre}
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className={TD}>
                                                    <span className={TYPE_BADGE}>{item.tipo_nombre}</span>
                                                </td>
                                                <td className={`${TD} normal-case`}>{item.director || '—'}</td>
                                                <td className="px-4 py-3 align-middle text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenPhones(item)}
                                                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Teléfonos"
                                                        >
                                                            <Phone className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenMap(item)}
                                                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Mapa"
                                                        >
                                                            <MapPin className="w-3.5 h-3.5" />
                                                        </button>
                                                        {canChange && (
                                                            <button type="button" onClick={() => handleEdit(item)} className={BTN_ICON_EDIT} title="Editar">
                                                                <Edit3 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        {canDelete && (
                                                            <button type="button" onClick={() => handleDelete(item.id)} className={BTN_ICON_DELETE} title="Eliminar">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                {!loading && filteredData.length > 0 && totalPages > 1 && (
                    <div className="p-3 bg-slate-50 border-t border-slate-200 shrink-0">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                            totalCount={totalCount}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Establishments;
