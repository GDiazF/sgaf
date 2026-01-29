import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Zap, Search, Plus, Edit2, Trash2, X, Save, Building2, FileText, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ServicesDashboard = () => {
    const [services, setServices] = useState([]);
    const [providers, setProviders] = useState([]);
    const [establishments, setEstablishments] = useState([]);
    const [docTypes, setDocTypes] = useState([]);

    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        proveedor: '',
        establecimiento: '',
        numero_cliente: '',
        numero_servicio: '',
        tipo_documento: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [servRes, provRes, estRes, docRes] = await Promise.all([
                api.get('servicios/'),
                api.get('proveedores/'),
                api.get('establecimientos/'),
                api.get('tipos-documentos/')
            ]);
            setServices(servRes.data);
            setProviders(provRes.data);
            setEstablishments(estRes.data);
            setDocTypes(docRes.data);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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
            fetchData();
        } catch (error) {
            console.error(error);
            alert("Error al eliminar.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                // Ensure empty strings are sent as null if needed, or handle in backend
            };

            if (editingId) {
                await api.put(`servicios/${editingId}/`, payload);
            } else {
                await api.post('servicios/', payload);
            }
            setShowForm(false);
            fetchData();
        } catch (error) {
            console.error(error);
            alert("Error al guardar.");
        }
    };

    const filteredData = services.filter(item =>
        item.numero_cliente.includes(searchTerm) ||
        item.proveedor_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.establecimiento_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Servicios Básicos</h2>
                    <p className="text-slate-500">Gestión de servicios y números de cliente por establecimiento.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por cliente, proveedor..."
                            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full md:w-64"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
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
            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                            onClick={() => setShowForm(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: "spring", duration: 0.5 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="text-lg font-bold text-slate-800">
                                    {editingId ? 'Editar Servicio' : 'Nuevo Servicio'}
                                </h3>
                                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-semibold text-slate-700">Proveedor</label>
                                        <select
                                            required
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none appearance-none"
                                            value={formData.proveedor}
                                            onChange={e => setFormData({ ...formData, proveedor: e.target.value })}
                                        >
                                            <option value="">Seleccione Proveedor...</option>
                                            {providers.map(p => (
                                                <option key={p.id} value={p.id}>{p.nombre} {p.rut ? `(${p.rut})` : ''}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-semibold text-slate-700">Establecimiento</label>
                                        <select
                                            required
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none appearance-none"
                                            value={formData.establecimiento}
                                            onChange={e => setFormData({ ...formData, establecimiento: e.target.value })}
                                        >
                                            <option value="">Seleccione Establecimiento...</option>
                                            {establishments.map(e => (
                                                <option key={e.id} value={e.id}>{e.nombre}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Número de Cliente (ID)</label>
                                        <div className="relative">
                                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                required
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                                value={formData.numero_cliente}
                                                onChange={e => setFormData({ ...formData, numero_cliente: e.target.value })}
                                                placeholder="Ej. 12345678"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Número de Servicio (Op.)</label>
                                        <input
                                            type="text"
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                            value={formData.numero_servicio}
                                            onChange={e => setFormData({ ...formData, numero_servicio: e.target.value })}
                                            placeholder="Opcional"
                                        />
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-semibold text-slate-700">Tipo Documento Habitual</label>
                                        <select
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none appearance-none"
                                            value={formData.tipo_documento}
                                            onChange={e => setFormData({ ...formData, tipo_documento: e.target.value })}
                                        >
                                            <option value="">Seleccione Tipo...</option>
                                            {docTypes.map(t => (
                                                <option key={t.id} value={t.id}>{t.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
                                    >
                                        <Save className="w-4 h-4" />
                                        Guardar
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Table List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Establecimiento</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Proveedor / Servicio</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">N° Cliente (ID)</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo Doc.</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredData.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3">
                                    <div className="flex items-center gap-2 font-medium text-slate-900">
                                        <Building2 className="w-4 h-4 text-slate-400" />
                                        {item.establecimiento_nombre}
                                    </div>
                                </td>
                                <td className="p-3">
                                    <div className="font-semibold text-blue-700">{item.proveedor_nombre}</div>
                                    {item.numero_servicio && <div className="text-xs text-slate-500">Serv: {item.numero_servicio}</div>}
                                </td>
                                <td className="p-3 font-mono text-sm text-slate-700 bg-slate-50/50 w-fit">
                                    #{item.numero_cliente}
                                </td>
                                <td className="p-3">
                                    {item.tipo_documento_nombre ? (
                                        <span className="flex items-center gap-1 text-xs font-medium text-slate-600">
                                            <FileText className="w-3 h-3" />
                                            {item.tipo_documento_nombre}
                                        </span>
                                    ) : '-'}
                                </td>
                                <td className="p-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredData.length === 0 && !loading && (
                    <div className="p-12 text-center text-slate-400">
                        <Zap className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No se encontraron servicios registrados.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ServicesDashboard;
