import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { Search, Plus, Trash2, Info, Building2, Pencil, Loader2, FolderSearch, AlertCircle, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePermission } from '../../hooks/usePermission';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import Pagination from '../../components/common/Pagination';
import SortableHeader from '../../components/common/SortableHeader';
import ContractModal from '../../components/contracts/ContractModal';
import { BTN_PRIMARY, INPUT_FILTER, SELECT_FILTER, BTN_MOBILE_EDIT, TITLE_ICON_BOX } from './contractsUi';

const Contracts = () => {
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const { can } = usePermission();
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const navigate = useNavigate();

    // Lookups
    const [procesos, setProcesos] = useState([]);
    const [estados, setEstados] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [orientaciones, setOrientaciones] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [establecimientos, setEstablecimientos] = useState([]);
    const [tiposEstablecimiento, setTiposEstablecimiento] = useState([]);

    // Pagination & Search State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [ordering, setOrdering] = useState('vigente_first');
    const [errorMessage, setErrorMessage] = useState('');
    const debouncedSearchQuery = useDebouncedValue(searchQuery);

    // Filters
    const [filterCategoria, setFilterCategoria] = useState('');
    const [filterEstado, setFilterEstado] = useState('');
    const [filterOrientacion, setFilterOrientacion] = useState('');

    const [formData, setFormData] = useState({
        codigo_mercado_publico: '',
        descripcion: '',
        proceso: '',
        estado: '',
        categoria: '',
        orientacion: '',
        proveedor: '',
        fecha_adjudicacion: '',
        fecha_inicio: '',
        fecha_termino: '',
        tipo_oc: 'UNICA',
        nro_oc: '',
        cdp: '',
        proveedores_asociados: [],
        establecimientos: []
    });

    const fetchData = async (page = 1, size = pageSize, search = debouncedSearchQuery) => {
        setLoading(true);
        try {
            const params = {
                page,
                page_size: size,
                search,
                ordering: ordering === 'vigente_first' ? '-estado__nombre, -fecha_inicio' : ordering,
                ...(filterCategoria && { categoria: filterCategoria }),
                ...(filterEstado && { estado: filterEstado }),
                ...(filterOrientacion && { orientacion: filterOrientacion })
            };
            const response = await api.get('contratos/contratos/', { params });
            const data = response.data.results || (Array.isArray(response.data) ? response.data : []);
            setContracts(data);
            setTotalCount(response.data.count || data.length);
            setTotalPages(response.data.count ? Math.ceil(response.data.count / size) : 1);
            setCurrentPage(page);
        } catch (error) {
            console.error("Error fetching contracts:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLookups = async () => {
        try {
            const [procRes, estRes, catRes, oriRes, provRes, setupsRes, typesRes] = await Promise.all([
                api.get('contratos/procesos/'),
                api.get('contratos/estados/'),
                api.get('contratos/categorias/'),
                api.get('contratos/orientaciones/'),
                api.get('proveedores/'),
                api.get('establecimientos/', { params: { page_size: 1000, activo: true } }),
                api.get('tipos-establecimiento/')
            ]);
            setProcesos(procRes.data.results || procRes.data);
            setEstados(estRes.data.results || estRes.data);
            setCategorias(catRes.data.results || catRes.data);
            setOrientaciones(oriRes.data.results || oriRes.data);
            setProveedores(provRes.data.results || provRes.data);
            setEstablecimientos(setupsRes.data.results || setupsRes.data);
            setTiposEstablecimiento(typesRes.data.results || typesRes.data);
        } catch (error) {
            console.error("Error fetching lookups:", error);
        }
    };

    useEffect(() => {
        fetchData(1, pageSize, debouncedSearchQuery);
    }, [ordering, filterCategoria, filterEstado, filterOrientacion, pageSize, debouncedSearchQuery]);

    useEffect(() => {
        fetchLookups();
    }, []);

    const handleSearch = (query) => {
        setSearchQuery(query);
        setCurrentPage(1);
    };

    const handleSort = (newOrdering) => {
        setOrdering(newOrdering);
        setCurrentPage(1);
    };

    const handleNew = () => {
        setFormData({
            codigo_mercado_publico: '',
            descripcion: '',
            proceso: procesos[0]?.id || '',
            estado: estados[0]?.id || '',
            categoria: categorias[0]?.id || '',
            orientacion: '',
            proveedor: '',
            fecha_adjudicacion: '',
            fecha_inicio: '',
            fecha_termino: '',
            tipo_oc: 'UNICA',
            nro_oc: '',
            cdp: '',
            proveedores_asociados: [],
            establecimientos: []
        });
        setEditingId(null);
        setShowForm(true);
    };

    const handleEdit = (item) => {
        setFormData({
            codigo_mercado_publico: item.codigo_mercado_publico,
            descripcion: item.descripcion,
            proceso: item.proceso,
            estado: item.estado,
            categoria: item.categoria,
            orientacion: item.orientacion || '',
            proveedor: item.proveedor || '',
            fecha_adjudicacion: item.fecha_adjudicacion,
            fecha_inicio: item.fecha_inicio,
            fecha_termino: item.fecha_termino,
            tipo_oc: item.tipo_oc || 'UNICA',
            nro_oc: item.nro_oc || '',
            cdp: item.cdp || '',
            proveedores_asociados: item.proveedores_asociados || [],
            establecimientos: item.establecimientos || []
        });
        setEditingId(item.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Seguro que desea eliminar este contrato?")) return;
        try {
            await api.delete(`contratos/contratos/${id}/`);
            setErrorMessage('');
            fetchData(currentPage, pageSize, searchQuery);
        } catch (error) {
            setErrorMessage('Error al eliminar el contrato.');
        }
    };

    const handleSave = async (dataToSubmit) => {
        try {
            const finalData = { ...dataToSubmit };
            if (finalData.orientacion === '') delete finalData.orientacion;

            if (editingId) {
                await api.put(`contratos/contratos/${editingId}/`, finalData);
            } else {
                await api.post('contratos/contratos/', finalData);
            }
            setShowForm(false);
            setErrorMessage('');
            fetchData(currentPage, pageSize, searchQuery);
        } catch (error) {
            console.error(error);
            setErrorMessage('Error al guardar el contrato. Verifique los datos.');
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden">
            {/* Header Limpio */}
            <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                <div className="flex items-center gap-3">
                    <div className={TITLE_ICON_BOX}>
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase">
                            Contratos Vigentes
                        </h2>
                        <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-1.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                            Gestión de convenios y compras ({totalCount})
                        </p>
                    </div>
                </div>
                {can('contratos.add_contrato') && (
                    <button
                        onClick={handleNew}
                        className={BTN_PRIMARY}
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nuevo Contrato</span>
                    </button>
                )}
            </div>

            {errorMessage && (
                <div className="shrink-0 bg-rose-50 text-rose-600 text-[10px] font-bold uppercase p-3 rounded-xl border border-rose-100 flex gap-2 items-center">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                </div>
            )}

            <ContractModal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                onSave={handleSave}
                editingId={editingId}
                initialData={formData}
                lookups={{ procesos, estados, categorias, orientaciones, proveedores, establecimientos, tiposEstablecimiento }}
            />

            {/* Table Container con Filtros Integrados */}
            <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                {/* Search & Filters Bar */}
                <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 shrink-0">
                    <div className="flex flex-col md:flex-row flex-1 gap-3">
                        <div className="flex flex-row flex-1 gap-2">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                                <input
                                    type="text"
                                    placeholder="Buscar por código o descripción..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className={`${INPUT_FILTER} placeholder:text-slate-400`}
                                />
                            </div>
                            <div className="flex lg:hidden shrink-0">
                                <select
                                    value={pageSize}
                                    onChange={(e) => {
                                        const newSize = Number(e.target.value);
                                        setPageSize(newSize);
                                        setCurrentPage(1);
                                    }}
                                    className={`${SELECT_FILTER} w-[84px] pl-3 pr-7 min-w-0`}
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex flex-row gap-2">
                            <select
                                value={filterOrientacion}
                                onChange={(e) => setFilterOrientacion(e.target.value)}
                                className={`${SELECT_FILTER} min-w-[140px]`}
                            >
                                <option value="">Orientaciones</option>
                                {orientaciones.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                            </select>
                            <select
                                value={filterCategoria}
                                onChange={(e) => setFilterCategoria(e.target.value)}
                                className={`${SELECT_FILTER} min-w-[140px]`}
                            >
                                <option value="">Categorías</option>
                                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="hidden lg:flex items-center justify-end gap-2 shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Mostrar:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                const newSize = Number(e.target.value);
                                setPageSize(newSize);
                                setCurrentPage(1);
                            }}
                            className={`${SELECT_FILTER} w-[84px] pl-3 pr-7 min-w-0`}
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-12 h-full flex-1 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cargando Datos...</span>
                    </div>
                ) : (
                    <>
                        {/* Mobile Card List */}
                        <div className="block lg:hidden overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/30">
                            {contracts.map((item) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4 relative overflow-hidden group"
                                >
                                    <div
                                        onClick={() => navigate(`/contracts/${item.id}`)}
                                        className="flex justify-between items-start cursor-pointer group-hover:opacity-80 transition-all"
                                    >
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-medium text-blue-500 uppercase tracking-widest">{item.codigo_mercado_publico}</span>
                                            <h3 className="text-xs font-medium text-slate-700 uppercase leading-relaxed line-clamp-2">{item.descripcion}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition-all ${(item.estado_nombre?.toLowerCase() || '').includes('activo') || (item.estado_nombre?.toLowerCase() || '').includes('vigente') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-400'}`}>
                                                    {item.estado_nombre}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-50" onClick={() => navigate(`/contracts/${item.id}`)}>
                                        <div className="flex flex-col cursor-pointer">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Proveedores</span>
                                            <span className="text-[11px] font-medium text-slate-700 uppercase tracking-tighter truncate" title={item.proveedores_asociados?.map(p => p.proveedor_nombre).join(', ') || 'N/A'}>
                                                {item.proveedores_asociados?.length > 0 
                                                    ? item.proveedores_asociados.map(p => p.proveedor_nombre).join(', ') 
                                                    : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col text-right cursor-pointer">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Vencimiento</span>
                                            <span className="text-[11px] font-medium text-rose-500 uppercase tracking-tighter">{new Date(item.fecha_termino).toLocaleDateString('es-CL')}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-slate-50" onClick={e => e.stopPropagation()}>
                                        {can('contratos.change_contrato') && (
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className={BTN_MOBILE_EDIT}
                                            >
                                                <Pencil className="w-3.5 h-3.5" /> Editar
                                            </button>
                                        )}
                                        {can('contratos.delete_contrato') && (
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="flex items-center justify-center gap-2 bg-rose-50 text-rose-600 h-10 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" /> Borrar
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                            {contracts.length === 0 && (
                                <div className="flex flex-col items-center justify-center p-12 text-center h-full flex-1">
                                    <FolderSearch className="w-10 h-10 text-slate-200 mb-3" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No se encontraron registros</span>
                                </div>
                            )}
                        </div>

                        {/* Desktop Table List */}
                        <div className="hidden lg:block flex-1 overflow-auto custom-scrollbar bg-white">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                                    <tr>
                                        <SortableHeader label="Código / Referencia" sortKey="codigo_mercado_publico" currentOrdering={ordering} onSort={handleSort} />
                                        <SortableHeader label="Estado" sortKey="estado__nombre" currentOrdering={ordering} onSort={handleSort} />
                                        <SortableHeader label="Categoría / Proceso" sortKey="categoria__nombre" currentOrdering={ordering} onSort={handleSort} />
                                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left border-r border-slate-100">Proveedores Adjudicados</th>
                                        <SortableHeader label="Vencimiento" sortKey="fecha_termino" currentOrdering={ordering} onSort={handleSort} />
                                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-r border-slate-100">Plazo</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-sans">
                                    {contracts.map((item) => (
                                        <tr
                                            key={item.id}
                                            onClick={() => navigate(`/contracts/${item.id}`)}
                                            className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                                        >
                                            <td className="py-2 px-4 max-w-[300px]">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-medium text-blue-500 uppercase tracking-widest mb-0.5">{item.codigo_mercado_publico}</span>
                                                    <span className="font-medium text-slate-700 text-[11px] leading-tight break-words whitespace-normal" title={item.descripcion}>{item.descripcion}</span>
                                                </div>
                                            </td>
                                            <td className="py-2 px-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${(item.estado_nombre?.toLowerCase() || '').includes('activo') || (item.estado_nombre?.toLowerCase() || '').includes('vigente') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-400'}`}>
                                                    {item.estado_nombre || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="py-2 px-4">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[9px] font-black border border-blue-100 uppercase w-fit">
                                                        {item.categoria_nombre}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-normal">{item.proceso_nombre}</span>
                                                </div>
                                            </td>
                                            <td className="py-2 px-4">
                                                <div className="flex items-center gap-2 font-normal text-slate-500 text-[10px] uppercase tracking-tight">
                                                    <Building2 className="w-3 h-3 opacity-30 shrink-0" />
                                                    <div className="flex flex-col gap-0.5 truncate max-w-[200px]" title={item.proveedores_asociados?.map(p => p.proveedor_nombre).join(', ')}>
                                                        {item.proveedores_asociados?.length > 0 ? (
                                                            item.proveedores_asociados.map((p, idx) => (
                                                                <span key={idx} className="truncate">{p.proveedor_nombre}</span>
                                                            ))
                                                        ) : (
                                                            <span className="text-slate-300 italic text-[9px]">S/A</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-2 px-4 font-mono font-medium text-[11px] text-rose-500">
                                                {new Date(item.fecha_termino).toLocaleDateString('es-CL')}
                                            </td>
                                            <td className="py-2 px-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-blue-600 font-medium text-[11px]">{item.plazo_meses}</span>
                                                    <span className="text-[9px] font-medium text-slate-300 uppercase tracking-tighter">meses</span>
                                                </div>
                                            </td>
                                            <td className="py-2 px-4 text-right" onClick={e => e.stopPropagation()}>
                                                <div className="flex justify-end gap-1.5">
                                                    {can('contratos.change_contrato') && (
                                                        <button onClick={() => handleEdit(item)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors bg-white">
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {can('contratos.delete_contrato') && (
                                                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors bg-white">
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

            {/* Pagination Footer */}
            <div className="shrink-0 pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 pb-2">
                <div className="order-2 sm:order-1 flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Registro de Compras</span>
                    <div className="hidden sm:flex bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 items-center gap-2">
                        <Info className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">El plazo es estimado según vigencia digitalizada.</span>
                    </div>
                </div>
                <div className="order-1 sm:order-2 flex justify-center lg:justify-end">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={(p) => fetchData(p, pageSize, debouncedSearchQuery)}
                        totalCount={totalCount}
                    />
                </div>
            </div>
        </div>
    );
};

export default Contracts;
