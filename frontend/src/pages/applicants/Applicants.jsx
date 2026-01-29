import React, { useState, useEffect } from 'react';
import api from '../../api';
import { UserPlus, Search, Edit2, Trash2, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Applicants = () => {
    const [applicants, setApplicants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        rut: '',
        nombre: '',
        apellido: '',
        telefono: '',
        email: ''
    });

    const fetchApplicants = async () => {
        try {
            const response = await api.get('solicitantes/');
            setApplicants(response.data);
        } catch (error) {
            console.error("Error fetching applicants:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplicants();
    }, []);

    const handleEdit = (app) => {
        setFormData({
            rut: app.rut,
            nombre: app.nombre,
            apellido: app.apellido,
            telefono: app.telefono,
            email: app.email
        });
        setEditingId(app.id);
        setShowForm(true);
    };

    const handleNew = () => {
        setFormData({ rut: '', nombre: '', apellido: '', telefono: '', email: '' });
        setEditingId(null);
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`solicitantes/${editingId}/`, formData);
            } else {
                await api.post('solicitantes/', formData);
            }
            setShowForm(false);
            fetchApplicants();
        } catch (error) {
            console.error(error);
            alert("Error al guardar solicitante. Verifique los datos.");
        }
    };

    const filteredApplicants = applicants.filter(app =>
        app.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.rut.includes(searchTerm)
    );

    return (
        <div>
            {/* Header with Search and Action */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Solicitantes</h2>
                    <p className="text-slate-500">Gestione el personal autorizado para retirar llaves.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar solicitante..."
                            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full md:w-64"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleNew}
                        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 font-medium"
                    >
                        <UserPlus className="w-5 h-5" />
                        <span className="hidden md:inline">Nuevo Solicitante</span>
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
                                    {editingId ? 'Editar Solicitante' : 'Registrar Nuevo Solicitante'}
                                </h3>
                                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">RUT</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                            value={formData.rut}
                                            onChange={e => setFormData({ ...formData, rut: e.target.value })}
                                            placeholder="12.345.678-9"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Email</label>
                                        <input
                                            type="email"
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="correo@ejemplo.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Nombre</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                            value={formData.nombre}
                                            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Apellido</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                            value={formData.apellido}
                                            onChange={e => setFormData({ ...formData, apellido: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-semibold text-slate-700">Teléfono</label>
                                        <input
                                            type="text"
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                            value={formData.telefono}
                                            onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                                            placeholder="+56 9 ..."
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3">
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
                                        Guardar Solicitante
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Solicitante</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">RUT</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Contacto</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredApplicants.map(app => (
                            <tr key={app.id} className="hover:bg-slate-50/80 transition-colors group">
                                <td className="p-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 text-white flex items-center justify-center font-bold text-lg shadow-md  shadow-blue-200">
                                            {app.nombre.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                                                {app.nombre} {app.apellido}
                                            </div>
                                            <div className="text-xs text-slate-400">Registrado recientemente</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-3 font-mono text-sm text-slate-600 bg-slate-50/50">{app.rut}</td>
                                <td className="p-3">
                                    <div className="text-sm text-slate-600 flex flex-col gap-1">
                                        <span className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                            {app.email || 'Sin email'}
                                        </span>
                                        <span className="flex items-center gap-2 opacity-75">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                            {app.telefono || 'Sin teléfono'}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-3 text-right">
                                    <button
                                        onClick={() => handleEdit(app)}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredApplicants.length === 0 && !loading && (
                    <div className="p-12 text-center text-slate-400">
                        <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No se encontraron resultados.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Applicants;
