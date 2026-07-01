import React, { useState, useEffect } from 'react';
import api from '../../api';
import { FileText, Search, Plus, Trash2, Calendar, Download, Hash, Pencil, FolderSearch, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Pagination from '../../components/common/Pagination';
import SortableHeader from '../../components/common/SortableHeader';
import AdquisicionModal from '../../components/services/AdquisicionModal';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import {
    BTN_PRIMARY,
    INPUT_FILTER,
    SELECT_FILTER,
    TITLE_ICON_BOX,
    BTN_ICON_EDIT,
    BTN_ICON_DELETE,
} from '../funcionarios/shared/funcionariosUi';

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
    const [pageSize, setPageSize] = useState(10);
    const [errorMessage, setErrorMessage] = useState('');
    const debouncedSearchQuery = useDebouncedValue(searchQuery);

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
        nro_oc: '',
        folio: ''
    };

    const [formData, setFormData] = useState(initialFormState);

    const fetchData = async (page = 1, search = searchQuery, order = ordering, size = pageSize) => {
        setLoading(true);
        try {
            const params = { page, search, ordering: order, sin_contrato: 'true', page_size: size };
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
            setTotalPages(Math.ceil((factRes.data.count || 0) / size));

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
        fetchData(currentPage, debouncedSearchQuery, ordering, pageSize);
    }, [currentPage, debouncedSearchQuery, ordering, pageSize]);

    const handleSearch = (query) => {
        setSearchQuery(query);
        setCurrentPage(1);
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
            nro_oc: item.nro_oc || '',
            folio: item.folio || ''
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
            setErrorMessage('');
            fetchData(currentPage, searchQuery, ordering, pageSize);
        } catch (error) {
            console.error(error);
            const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            setErrorMessage(`Error al guardar factura: ${detail}`);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Seguro que desea eliminar esta factura?")) return;
        try {
            await api.delete(`facturas-adquisicion/${id}/`);
            setErrorMessage('');
            fetchData(currentPage, searchQuery, ordering, pageSize);
        } catch (error) {
            console.error(error);
            setErrorMessage('Error al eliminar la factura.');
        }
    };

    const handleDownloadPDF = async (item) => {
        try {
            const response = await api.get(`facturas-adquisicion/${item.id}/generate_pdf/`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const rawFilename = item.nro_oc ? `RC ${item.nro_oc}.pdf` : `RC_Adquisicion_${item.folio || item.id}.pdf`;
            const filename = rawFilename.replace(/[/\\?%*:|"<>]/g, '-');
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Error downloading PDF:", error);
            setErrorMessage('Error al generar el PDF.');
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
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden w-full">
            {/* Cabecera Premium Estándar */}
            <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 border-b border-slate-200/60 pb-3 px-1">
                <div className="flex items-center gap-3">
                    <div className={TITLE_ICON_BOX}>
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase">
                            Facturas sin OC
                        </h2>
                        <div className="flex items-center gap-2 mt-1.5">
                            <p className="text-[10px] md:text-xs font-medium text-slate-500 uppercase tracking-wide">
                                Gestión integral de compras directas y adquisiciones sin servicio
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 self-end md:self-auto shrink-0">
                    <button
                        onClick={handleNew}
                        className={BTN_PRIMARY}
                    >
                        <Plus className="w-4 h-4" />
                        <span>Registrar Factura</span>
                    </button>
                </div>
            </div>

            {/* Barra de Filtros Unificada y Simétrica (h-10 / 40px) */}
            <div className="shrink-0 flex flex-col md:flex-row items-center gap-3 w-full bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="w-full md:w-80 lg:w-96 shrink-0 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por Folio, CDP o proveedor..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className={INPUT_FILTER}
                    />
                </div>

                {/* Selector de tamaño de página (h-10 unificado) */}
                <div className="flex items-center gap-2 ml-auto shrink-0 self-stretch md:self-auto justify-end">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mostrar:</span>
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            const newSize = Number(e.target.value);
                            setPageSize(newSize);
                            setCurrentPage(1);
                        }}
                        className={`${SELECT_FILTER} w-[84px]`}
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
            </div>

            {errorMessage && (
                <div className="shrink-0 bg-rose-50 text-rose-600 text-[10px] font-bold uppercase p-3 rounded-xl border border-rose-100 flex gap-2 items-center">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {errorMessage}
                </div>
            )}

            <AdquisicionModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSave={handleSave}
                editingId={editingId}
                initialData={formData}
                lookups={lookups}
            />

            {/* Table Container con Zero-Scroll */}
            <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                {/* Mobile Cards View */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-4 p-4 overflow-auto custom-scrollbar">
                    {facturas.map(item => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200 mb-2">
                                        {item.folio || `#${item.id}`}
                                    </span>
                                    <h3 className="font-medium text-slate-700 text-[11px] uppercase tracking-tighter leading-tight">{item.proveedor_nombre}</h3>
                                    <p className="text-[10px] font-medium text-slate-400 mt-1">{item.proveedor_rut}</p>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => handleDownloadPDF(item)}
                                    className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                </motion.button>
                            </div>

                            <div className="space-y-2 mb-4 flex-1">
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-slate-500 font-medium">Fecha:</span>
                                    <span className="font-medium text-slate-700">{formatDate(item.fecha_recepcion)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-slate-500 font-medium">CDP:</span>
                                    <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{item.cdp || '-'}</span>
                                </div>
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-slate-500 font-medium">Neto:</span>
                                    <span className="font-medium text-slate-700">{formatCurrency(item.total_neto)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[11px] pt-2 border-t border-slate-100">
                                    <span className="text-slate-700 font-medium">Total a Pagar:</span>
                                    <span className="font-medium text-slate-900 text-[11px]">{formatCurrency(item.total_pagar)}</span>
                                </div>
                            </div>

                            {/* Acciones */}
                            <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-slate-50">
                                <button
                                    onClick={() => handleEdit(item)}
                                    className="flex items-center justify-center gap-2 bg-blue-50 text-blue-700 h-10 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                                >
                                    <Pencil className="w-3.5 h-3.5" /> Editar
                                </button>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    className="flex items-center justify-center gap-2 bg-rose-50 text-rose-600 h-10 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Borrar
                                </button>
                            </div>
                        </motion.div>
                    ))}
                    {!loading && facturas.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-400 font-medium text-[11px] italic">
                            No se encontraron facturas
                        </div>
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block flex-1 overflow-auto custom-scrollbar bg-white">
                    <table className="w-full text-left whitespace-nowrap relative">
                        <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                            <tr>
                                <SortableHeader label="Folio" sortKey="id" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Fecha" sortKey="fecha_recepcion" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Proveedor" sortKey="proveedor__nombre" currentOrdering={ordering} onSort={handleSort} />
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-r border-slate-100">CDP / Detalle</th>
                                <SortableHeader label="Total" sortKey="total_pagar" currentOrdering={ordering} onSort={handleSort} className="text-right" />
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <AnimatePresence>
                                {facturas.map((item, index) => (
                                    <motion.tr
                                        key={item.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="hover:bg-blue-50/20 transition-all group"
                                    >
                                        <td className="px-4 py-2 border-r border-slate-50 text-[11px] font-medium text-slate-500 uppercase tracking-tighter whitespace-nowrap">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
                                                {item.folio || `#${item.id}`}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 border-r border-slate-50 text-[11px] font-medium text-slate-500 uppercase tracking-tighter whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                                                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                                </div>
                                                <span className="text-[11px] font-medium text-slate-700">{formatDate(item.fecha_recepcion)}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 border-r border-slate-50 text-[11px] font-medium text-slate-700 uppercase tracking-tighter">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-medium text-slate-700 uppercase tracking-tighter leading-tight">{item.proveedor_nombre}</span>
                                                <span className="text-[10px] font-medium text-slate-400 tracking-wider font-mono">{item.proveedor_rut}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 border-r border-slate-50 text-[11px] font-medium text-slate-500 uppercase tracking-tighter">
                                            <div className="flex flex-col gap-0.5 max-w-xs">
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    <Hash className="w-2.5 h-2.5 text-blue-500" />
                                                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0 rounded-md border border-blue-100 whitespace-nowrap uppercase">CDP: {item.cdp}</span>
                                                    {item.periodo && (
                                                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0 rounded-md border border-blue-100 whitespace-nowrap uppercase">{item.periodo}</span>
                                                    )}
                                                </div>
                                                <span className="text-[11px] text-slate-500 font-medium truncate" title={item.descripcion}>
                                                    {item.descripcion}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 border-r border-slate-50 text-right text-[11px] font-medium text-slate-700 uppercase tracking-tighter">
                                            <div className="text-[11px] font-medium text-slate-700 leading-none">{formatCurrency(item.total_pagar)}</div>
                                            <span className="text-[10px] font-medium text-slate-400">NET: {formatCurrency(item.total_neto)}</span>
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <div className="flex justify-end gap-1">
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => handleDownloadPDF(item)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Generar Recepción Conforme"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => handleEdit(item)}
                                                    className={BTN_ICON_EDIT}
                                                    title="Editar"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => handleDelete(item.id)}
                                                    className={BTN_ICON_DELETE}
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </motion.button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                    {!loading && facturas.length === 0 && (
                        <div className="py-20 text-center flex flex-col items-center gap-4">
                            <FolderSearch className="w-10 h-10 text-slate-200" />
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No hay facturas registradas</h3>
                        </div>
                    )}
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-200 shrink-0">
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
