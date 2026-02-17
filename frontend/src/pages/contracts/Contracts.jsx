import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { FileText, Search, Plus, Edit2, Trash2, X, Save, Calendar, Tag, ShieldCheck, Info, Building2, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Pagination from '../../components/common/Pagination';
import FilterBar from '../../components/common/FilterBar';
import SortableHeader from '../../components/common/SortableHeader';
import ContractModal from '../../components/contracts/ContractModal';

const Contracts = () => {
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
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
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [ordering, setOrdering] = useState('vigente_first');

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
        establecimientos: []
    });

    const fetchData = async (page = 1) => {
        setLoading(true);
        try {
            const params = {
                page,
                search: searchQuery,
                ordering: ordering === 'vigente_first' ? '-estado__nombre, -fecha_inicio' : ordering,
                ...(filterCategoria && { categoria: filterCategoria }),
                ...(filterEstado && { estado: filterEstado }),
                ...(filterOrientacion && { orientacion: filterOrientacion })
            };
            const response = await api.get('contratos/contratos/', { params });
            setContracts(response.data.results || []);
            setTotalCount(response.data.count || 0);
            setTotalPages(Math.ceil((response.data.count || 0) / 10));
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
        fetchData(currentPage);
    }, [currentPage, ordering, filterCategoria, filterEstado, filterOrientacion]);

    useEffect(() => {
        fetchLookups();
    }, []);

    const handleSearch = (query) => {
        setSearchQuery(query);
        setCurrentPage(1);
        // Effect-less trigger if needed, but we rely on deps or manual call
        setTimeout(() => fetchData(1), 0);
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
            establecimientos: item.establecimientos || []
        });
        setEditingId(item.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Seguro que desea eliminar este contrato?")) return;
        try {
            await api.delete(`contratos/contratos/${id}/`);
            fetchData(currentPage);
        } catch (error) {
            alert("Error al eliminar.");
        }
    };

    const handleSave = async (dataToSubmit) => {
        try {
            const finalData = { ...dataToSubmit };
            if (finalData.orientacion === '') delete finalData.orientacion;
            if (finalData.proveedor === '') delete finalData.proveedor;

            if (editingId) {
                await api.put(`contratos/contratos/${editingId}/`, finalData);
            } else {
                await api.post('contratos/contratos/', finalData);
            }
            setShowForm(false);
            fetchData(currentPage);
        } catch (error) {
            console.error(error);
            alert("Error al guardar el contrato. Verifique los datos.");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="w-7 h-7 text-blue-600" />
                        Contratos y Licitaciones
                    </h2>
                    <p className="text-slate-500">Gestión de convenios y procesos de compra activos.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex gap-2 w-full md:w-auto">
                        <select
                            value={filterOrientacion}
                            onChange={(e) => setFilterOrientacion(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">Todas las orientaciones</option>
                            {orientaciones.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                        </select>
                        <select
                            value={filterCategoria}
                            onChange={(e) => setFilterCategoria(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                        >
                            <option value="">Todas las categorías</option>
                            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                    </div>
                    <FilterBar onSearch={handleSearch} placeholder="Buscar por código o desc..." />
                    <button
                        onClick={handleNew}
                        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 font-medium whitespace-nowrap"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Nuevo Contrato</span>
                    </button>
                </div>
            </div>

            {/* Modal Form */}
            <ContractModal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                onSave={handleSave}
                editingId={editingId}
                initialData={formData}
                lookups={{ procesos, estados, categorias, orientaciones, proveedores, establecimientos, tiposEstablecimiento }}
            />

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-500 tracking-wider">
                            <tr>
                                <SortableHeader label="Código MP" sortKey="codigo_mercado_publico" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Proveedor" sortKey="proveedor__nombre" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Orientación / Distribución" sortKey="orientacion__nombre" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Categoría / Proceso" sortKey="categoria__nombre" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Estado" sortKey="estado__nombre" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Inicio" sortKey="fecha_inicio" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Término" sortKey="fecha_termino" currentOrdering={ordering} onSort={handleSort} />
                                <th className="p-3 text-center">Plazo</th>
                                <th className="p-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {contracts.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors text-xs">
                                    <td className="p-3">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900 uppercase">{item.codigo_mercado_publico}</span>
                                            <span className="text-[10px] text-slate-400 truncate max-w-[150px]" title={item.descripcion}>{item.descripcion}</span>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-2 font-medium text-slate-700">
                                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                            {item.proveedor_nombre || <span className="text-slate-300 italic">No asignado</span>}
                                        </div>
                                    </td>
                                    <td className="p-3 font-medium text-slate-700">
                                        {item.orientacion_nombre || <span className="text-slate-300 italic">No asignada</span>}
                                    </td>
                                    <td className="p-3">
                                        <div className="space-y-1">
                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[9px] font-bold border border-blue-100 uppercase">
                                                {item.categoria_nombre}
                                            </span>
                                            <div className="text-[10px] text-slate-500">{item.proceso_nombre}</div>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${(item.estado_nombre?.toLowerCase() || '').includes('activo') || (item.estado_nombre?.toLowerCase() || '').includes('vigente') ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm' :
                                            (item.estado_nombre?.toLowerCase() || '').includes('termin') ? 'bg-slate-100 text-slate-500' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                            {item.estado_nombre || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-slate-600 font-medium">
                                        {new Date(item.fecha_inicio).toLocaleDateString('es-CL')}
                                    </td>
                                    <td className="p-3 text-slate-600 font-medium">
                                        {new Date(item.fecha_termino).toLocaleDateString('es-CL')}
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="text-blue-600 font-bold">{item.plazo_meses}</span>
                                            <span className="text-[9px] text-slate-400">meses</span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="flex justify-end gap-1.5">
                                            <button
                                                onClick={() => navigate(`/contracts/${item.id}`)}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                title="Ver Expediente Digital"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
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
                            ))}
                        </tbody>
                    </table>
                    {contracts.length === 0 && !loading && (
                        <div className="p-16 text-center text-slate-400 flex flex-col items-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <FileText className="w-8 h-8 opacity-20" />
                            </div>
                            <p className="font-medium">No se registraron contratos.</p>
                            <button onClick={handleNew} className="mt-4 text-blue-600 hover:underline text-sm font-bold">Registrar el primero</button>
                        </div>
                    )}
                </div>
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(p) => setCurrentPage(p)}
                    totalCount={totalCount}
                />
            </div>

            {/* Helper Info */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-4 items-start">
                <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                <div className="text-xs text-blue-700 leading-relaxed">
                    <p className="font-bold mb-1">Nota informativa:</p>
                    Este módulo permite el seguimiento manual de procesos de Mercado Público. El <strong>plazo</strong> es una estimación calculada automáticamente en base a las fechas de vigencia configuradas.
                </div>
            </div>
        </div>
    );
};

export default Contracts;
