import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Zap, Search, Plus, Edit2, Trash2, X, Save, Building2, FileText, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Pagination from '../../components/common/Pagination';
import FilterBar from '../../components/common/FilterBar';
import SortableHeader from '../../components/common/SortableHeader';
import ServiceModal from '../../components/services/ServiceModal';

const ServicesDashboard = () => {
    const [services, setServices] = useState([]);
    const [providers, setProviders] = useState([]);
    const [establishments, setEstablishments] = useState([]);
    const [docTypes, setDocTypes] = useState([]);

    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Pagination & Search State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [ordering, setOrdering] = useState('establecimiento__nombre');

    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        proveedor: '',
        establecimiento: '',
        numero_cliente: '',
        numero_servicio: '',
        tipo_documento: ''
    });

    const fetchData = async (page = 1, search = '', order = ordering) => {
        setLoading(true);
        try {
            const params = {
                page,
                search,
                ordering: order
            };

            const [servRes, provRes, estRes, docRes] = await Promise.all([
                api.get('servicios/', { params }),
                api.get('proveedores/'), // Potentially paginated, assume < 10 for now or needs SelectAsync
                api.get('establecimientos/'), // Potentially paginated
                api.get('tipos-documentos/')
            ]);

            // Handle Services Pagination
            setServices(servRes.data.results || []);
            setTotalCount(servRes.data.count || 0);
            setTotalPages(Math.ceil((servRes.data.count || 0) / 10));

            // Handle others (if they become paginated, we might need adjustments)
            setProviders(provRes.data.results || provRes.data);
            setEstablishments(estRes.data.results || estRes.data);
            setDocTypes(docRes.data.results || docRes.data);

        } catch (error) {
            console.error("Error fetching data:", error);
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

    const handleEdit = (item) => {
        setFormData({
            proveedor: item.proveedor,
            establecimiento: item.establecimiento,
            numero_cliente: item.numero_cliente,
            numero_servicio: item.numero_servicio || '',
            tipo_documento: item.tipo_documento || ''
        });
        setEditingId(item.id);
        setShowForm(true);
    };

    const handleNew = () => {
        setFormData({
            proveedor: '',
            establecimiento: '',
            numero_cliente: '',
            numero_servicio: '',
            tipo_documento: ''
        });
        setEditingId(null);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Seguro que desea eliminar este servicio?")) return;
        try {
            await api.delete(`servicios/${id}/`);
            fetchData(currentPage, searchQuery);
        } catch (error) {
            console.error(error);
            alert("Error al eliminar.");
        }
    };

    const handleSave = async (dataToSubmit) => {
        try {
            if (editingId) {
                await api.put(`servicios/${editingId}/`, dataToSubmit);
            } else {
                await api.post('servicios/', dataToSubmit);
            }
            setShowForm(false);
            fetchData(currentPage, searchQuery);
        } catch (error) {
            console.error(error);
            alert("Error al guardar.");
        }
    };

    // No client-side filtering
    const filteredData = services;

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Servicios Básicos</h2>
                    <p className="text-slate-500">Gestión de servicios y números de cliente por establecimiento.</p>
                </div>

                <div className="flex items-center gap-3">
                    <FilterBar onSearch={handleSearch} placeholder="Buscar por cliente, proveedor..." />
                    <button
                        onClick={handleNew}
                        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 font-medium whitespace-nowrap"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Nuevo Servicio</span>
                    </button>
                </div>
            </div>

            {/* Modal Form */}
            <ServiceModal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                onSave={handleSave}
                editingId={editingId}
                initialData={formData}
                lookups={{
                    providers,
                    establishments,
                    documentTypes: docTypes.map(d => ({ value: d.id, label: d.nombre }))
                }}
            />

            {/* Table List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <SortableHeader label="Establecimiento" sortKey="establecimiento__nombre" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="Proveedor / Servicio" sortKey="proveedor__nombre" currentOrdering={ordering} onSort={handleSort} />
                                <SortableHeader label="N° Cliente (ID)" sortKey="numero_cliente" currentOrdering={ordering} onSort={handleSort} />
                                <th className="p-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo Doc.</th>
                                <th className="p-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors text-xs">
                                    <td className="p-2.5">
                                        <div className="flex items-center gap-2 font-medium text-slate-900">
                                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                            {item.establecimiento_nombre}
                                        </div>
                                    </td>
                                    <td className="p-2.5">
                                        <div className="font-semibold text-blue-700">{item.proveedor_nombre}</div>
                                        {item.numero_servicio && <div className="text-[10px] text-slate-500">Serv: {item.numero_servicio}</div>}
                                    </td>
                                    <td className="p-2.5 font-mono text-slate-700 bg-slate-50/50 w-fit">
                                        #{item.numero_cliente}
                                    </td>
                                    <td className="p-2.5">
                                        {item.tipo_documento_nombre ? (
                                            <span className="flex items-center gap-1 text-[10px] font-medium text-slate-600">
                                                <FileText className="w-3 h-3" />
                                                {item.tipo_documento_nombre}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="p-2.5 text-right">
                                        <div className="flex justify-end gap-2">
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
                </div>
                {filteredData.length === 0 && !loading && (
                    <div className="p-12 text-center text-slate-400">
                        <Zap className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No se encontraron servicios registrados.</p>
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

export default ServicesDashboard;
