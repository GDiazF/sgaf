import React, { useState, useEffect } from 'react';
import api from '../../api';
import { ShoppingBag, Search, Plus, Edit2, Trash2, Calendar, Building2, Briefcase, FileText, Download, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FilterBar from '../../components/common/FilterBar';
import Pagination from '../../components/common/Pagination';
import SortableHeader from '../../components/common/SortableHeader';
import AdquisicionModal from '../../components/services/AdquisicionModal';

const FacturasAdquisicionDashboard = () => {
    const [facturas, setFacturas] = useState([]);
    const [lookups, setLookups] = useState({
        establishments: [],
        providers: [],
        deliveryTypes: [],
        groups: []
    });
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Pagination & Search
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [ordering, setOrdering] = useState('-fecha_recepcion');

    const initialFormState = {
        cdp: '',
        descripcion: '',
        periodo: '',
        fecha_recepcion: new Date().toISOString().split('T')[0],
        tipo_entrega: '',
        proveedor: '',
        establecimientos: [],
        total_neto: '',
        iva: 0,
        total_pagar: 0,
        grupo_firmante: '',
        firmante: '',
        nro_factura: '',
        nro_oc: ''
    };

    const [formData, setFormData] = useState(initialFormState);

    const fetchData = async (page = 1, search = '', order = ordering) => {
        setLoading(true);
        try {
            const params = { page, search, ordering: order };
            const [factRes, estRes, provRes, delRes, grpRes, typRes] = await Promise.all([
                api.get('facturas-adquisicion/', { params }),
                api.get('establecimientos/', { params: { page_size: 1000, activo: true } }),
                api.get('proveedores/', { params: { page_size: 1000 } }),
                api.get('tipos-entrega/', { params: { page_size: 1000 } }),
                api.get('grupos/', { params: { page_size: 1000 } }),
                api.get('tipos-establecimiento/')
            ]);

            setFacturas(factRes.data.results || []);
            setTotalCount(factRes.data.count || 0);
            setTotalPages(Math.ceil((factRes.data.count || 0) / 10));

            setLookups({
                establishments: estRes.data.results || estRes.data,
                providers: provRes.data.results || provRes.data,
                deliveryTypes: delRes.data.results || delRes.data,
                groups: grpRes.data.results || grpRes.data,
                establishmentTypes: typRes.data.results || typRes.data
            });
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(currentPage, searchQuery, ordering);
    }, [currentPage, ordering, searchQuery]);

    const handleSearch = (query) => {
        setSearchQuery(query);
        setCurrentPage(1);
        fetchData(1, query);
    };

    const handleSort = (newOrder) => {
        setOrdering(newOrder);
        setCurrentPage(1);
    };

    const handleNew = () => {
        setFormData(initialFormState);
        setEditingId(null);
        setShowModal(true);
    };

    const handleEdit = (item) => {
        setFormData({
            cdp: item.cdp,
            periodo: item.periodo || '',
            descripcion: item.descripcion,
            fecha_recepcion: item.fecha_recepcion,
            tipo_entrega: item.tipo_entrega,
            proveedor: item.proveedor,
            establecimientos: item.establecimientos || [],
            total_neto: item.total_neto,
            iva: item.iva,
            total_pagar: item.total_pagar,
            grupo_firmante: item.grupo_firmante || '',
            firmante: item.firmante || '',
            nro_factura: item.nro_factura || '',
            nro_oc: item.nro_oc || ''
        });
        setEditingId(item.id);
        setShowModal(true);
    };

    const handleSave = async (data) => {
        try {
            const dataToSave = {
                ...data,
                total_neto: parseInt(data.total_neto) || 0,
                iva: parseInt(data.iva) || 0,
                total_pagar: parseInt(data.total_pagar) || 0,
                grupo_firmante: data.grupo_firmante || null,
                firmante: data.firmante || null
            };
            if (editingId) {
                await api.put(`facturas-adquisicion/${editingId}/`, dataToSave);
            } else {
                await api.post('facturas-adquisicion/', dataToSave);
            }
            setShowModal(false);
            fetchData(currentPage, searchQuery);
        } catch (error) {
            console.error(error);
            const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            alert("Error al guardar factura: " + detail);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Seguro que desea eliminar esta factura?")) return;
        try {
            await api.delete(`facturas-adquisicion/${id}/`);
            fetchData(currentPage, searchQuery);
        } catch (error) {
            console.error(error);
            alert("Error al eliminar.");
        }
    };

    const handleDownloadPDF = async (id) => {
        try {
            const response = await api.get(`facturas-adquisicion/${id}/generate_pdf/`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `RC_Adquisicion_${id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Error downloading PDF:", error);
            alert("Error al generar el PDF.");
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    };

    return (
        <div className="space-y-8">
            {/* Header section with Premium design */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
                            <ShoppingBag className="w-6 h-6 text-white" />
                        </div>
                        Facturas
                    </h1>
                    <p className="text-sm text-slate-500 font-medium ml-1">Gestión integral de compras directas y adquisiciones sin servicio</p>
                </div>

                <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={handleNew}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 group text-sm"
                >
                    <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                    Registrar Nueva Factura
                </motion.button>
            </div>

            {/* Filters bar matching Funcionarios style */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2">
                        <FilterBar onSearch={handleSearch} placeholder="Buscar por Folio, CDP, proveedor o total..." />
                    </div>
                </div>
            </div>

            <AdquisicionModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSave={handleSave}
                editingId={editingId}
                initialData={formData}
                lookups={lookups}
            />

            {/* Main Table with Premium Layout */}
            <div className="bg-white rounded-[1.5rem] shadow-lg shadow-slate-200/40 border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto overflow-y-hidden custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <SortableHeader label="Folio" sortKey="id" currentOrdering={ordering} onSort={handleSort} className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400" />
                                <SortableHeader label="Fecha" sortKey="fecha_recepcion" currentOrdering={ordering} onSort={handleSort} className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400" />
                                <SortableHeader label="Proveedor" sortKey="proveedor__nombre" currentOrdering={ordering} onSort={handleSort} className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400" />
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">CDP / Detalle</th>
                                <SortableHeader label="Total" sortKey="total_pagar" currentOrdering={ordering} onSort={handleSort} className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right" />
                                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            <AnimatePresence>
                                {facturas.map((item, index) => (
                                    <motion.tr
                                        key={item.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="hover:bg-blue-50/20 transition-all group"
                                    >
                                        <td className="p-4">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
                                                {item.folio || `#${item.id}`}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                                                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-700">{formatDate(item.fecha_recepcion)}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-800 leading-tight">{item.proveedor_nombre}</span>
                                                <span className="text-[9px] font-semibold text-slate-400 tracking-wider font-mono">{item.proveedor_rut}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-0.5 max-w-xs">
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    <Hash className="w-2.5 h-2.5 text-blue-500" />
                                                    <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0 rounded-md border border-blue-100 whitespace-nowrap">CDP: {item.cdp}</span>
                                                    {item.periodo && (
                                                        <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0 rounded-md border border-indigo-100 whitespace-nowrap">{item.periodo}</span>
                                                    )}
                                                </div>
                                                <span className="text-[11px] text-slate-500 font-medium truncate" title={`${item.descripcion}${item.periodo ? ` - ${item.periodo}` : ''}${item.establecimientos_detalle?.length > 0 ? ` - ${item.establecimientos_detalle.map(e => e.nombre).join(', ')}` : ''}`}>
                                                    {item.descripcion}
                                                    {item.periodo && !item.descripcion?.toLowerCase().includes(item.periodo.toLowerCase()) && (
                                                        <span className="text-slate-400"> - {item.periodo}</span>
                                                    )}
                                                    {item.establecimientos_detalle?.length > 0 && !item.descripcion?.toLowerCase().includes(item.establecimientos_detalle[0].nombre.toLowerCase()) && (
                                                        <span className="text-slate-300"> - {item.establecimientos_detalle.map(e => e.nombre).join(', ')}</span>
                                                    )}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="text-sm font-bold text-slate-900 leading-none">{formatCurrency(item.total_pagar)}</div>
                                            <span className="text-[10px] font-bold text-slate-400">Net: {formatCurrency(item.total_neto)}</span>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex justify-end gap-1">
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => handleDownloadPDF(item.id)}
                                                    className="p-2 text-blue-500 hover:bg-blue-100 rounded-xl transition-all"
                                                    title="Generar Recepción Conforme"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => handleEdit(item)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </motion.button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>

                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center gap-4">
                        <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                        <p className="text-sm font-bold text-slate-400 animate-pulse">Cargando adquisiciones...</p>
                    </div>
                ) : facturas.length === 0 && (
                    <div className="p-20 text-center flex flex-col items-center gap-4">
                        <div className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                            <ShoppingBag className="w-16 h-16 text-slate-200" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold text-slate-800">No hay adquisiciones registradas</h3>
                            <p className="text-slate-400 max-w-xs mx-auto">Comience registrando una nueva factura para gestionar sus compras directas.</p>
                        </div>
                        <button
                            onClick={handleNew}
                            className="mt-4 px-6 py-2.5 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all text-sm"
                        >
                            Registrar Mi Primera Factura
                        </button>
                    </div>
                )}

                <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={(p) => setCurrentPage(p)}
                        totalCount={totalCount}
                    />
                </div>
            </div>
        </div>
    );
};

export default FacturasAdquisicionDashboard;
