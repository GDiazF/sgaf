import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Building, Search, Plus, Edit2, Trash2, X, Save, CheckCircle, XCircle, Power } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Establishments = () => {
    const [establishments, setEstablishments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        rbd: '',
        nombre: '',
        tipo: 'escuela',
        director: '',
        direccion: '',
        email: '',
        activo: true
    });

    const TIPOS = [
        { value: 'escuela', label: 'Escuela' },
        { value: 'jardin', label: 'Jardín' },
        { value: 'liceo', label: 'Liceo' },
        { value: 'colegio', label: 'Colegio' },
        { value: 'centro_laboral', label: 'Centro Laboral' }
    ];

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await api.get('establecimientos/');
            setEstablishments(response.data);
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
        setFormData(item);
        setEditingId(item.id);
        setShowForm(true);
    };

    const handleNew = () => {
        setFormData({
            rbd: '',
            nombre: '',
            tipo: 'escuela',
            director: '',
            direccion: '',
            email: '',
            activo: true
        });
        setEditingId(null);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Seguro que desea eliminar este establecimiento?")) return;
        try {
            await api.delete(`establecimientos/${id}/`);
            fetchData();
        } catch (error) {
            console.error(error);
            alert("Error al eliminar.");
        }
    };

    const handleStatusToggle = async (id, currentStatus) => {
        try {
            await api.patch(`establecimientos/${id}/`, { activo: !currentStatus });
            // Optimistic update
            setEstablishments(prev => prev.map(est =>
                est.id === id ? { ...est, activo: !currentStatus } : est
            ));
        } catch (error) {
            console.error(error);
            alert("Error al actualizar estado.");
            fetchData(); // Revert on error
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`establecimientos/${editingId}/`, formData);
            } else {
                await api.post('establecimientos/', formData);
            }
            setShowForm(false);
            fetchData();
        } catch (error) {
            console.error(error);
            alert("Error al guardar.");
        }
    };

    const filteredData = establishments.filter(item =>
        item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.rbd.toString().includes(searchTerm)
    );

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Establecimientos</h2>
                    <p className="text-slate-500">Gestión de escuelas, liceos y jardines.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o RBD..."
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
                        <span>Nuevo</span>
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
                                    {editingId ? 'Editar Establecimiento' : 'Nuevo Establecimiento'}
                                </h3>
                                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">RBD</label>
                                        <input
                                            type="number"
                                            required
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                            value={formData.rbd}
                                            onChange={e => setFormData({ ...formData, rbd: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Nombre</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                            value={formData.nombre}
                                            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Tipo</label>
                                        <select
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none appearance-none"
                                            value={formData.tipo}
                                            onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                                        >
                                            {TIPOS.map(t => (
                                                <option key={t.value} value={t.value}>{t.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Director(a)</label>
                                        <input
                                            type="text"
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                            value={formData.director}
                                            onChange={e => setFormData({ ...formData, director: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Email</label>
                                        <input
                                            type="email"
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-semibold text-slate-700">Dirección</label>
                                        <input
                                            type="text"
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                            value={formData.direccion}
                                            onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, activo: !formData.activo })}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.activo ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.activo ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                            <span className="text-sm font-medium text-slate-700">
                                                {formData.activo ? 'Establecimiento Activo' : 'Establecimiento Inactivo'}
                                            </span>
                                        </div>
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
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">RBD</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Director</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredData.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3">
                                    <button
                                        onClick={() => handleStatusToggle(item.id, item.activo)}
                                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all ${item.activo ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                    >
                                        <Power className="w-3 h-3" />
                                        {item.activo ? 'ACTIVO' : 'INACTIVO'}
                                    </button>
                                </td>
                                <td className="p-3 font-mono text-slate-600 font-semibold">{item.rbd}</td>
                                <td className="p-3 font-medium text-slate-900">{item.nombre}</td>
                                <td className="p-3">
                                    <span className="capitalize px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium border border-blue-100">
                                        {item.tipo}
                                    </span>
                                </td>
                                <td className="p-3 text-slate-600">{item.director || '-'}</td>
                                <td className="p-3 text-slate-600">{item.email || '-'}</td>
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
                        <Building className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No se encontraron establecimientos.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Establishments;
