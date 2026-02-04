import React, { useState, useEffect } from 'react';
import api from '../../api';
import { UserPlus, Search, Edit2, Trash2, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Pagination from '../../components/common/Pagination';
import FilterBar from '../../components/common/FilterBar';
import ApplicantModal from '../../components/applicants/ApplicantModal';

const Applicants = () => {
    const [applicants, setApplicants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Pagination & Search
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');

    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        rut: '',
        nombre: '',
        apellido: '',
        telefono: '',
        email: ''
    });

    const fetchApplicants = async (page = 1, search = '') => {
        setLoading(true);
        try {
            const params = { page, search };
            const response = await api.get('solicitantes/', { params });

            // Handle Pagination
            setApplicants(response.data.results || []);
            setTotalCount(response.data.count || 0);
            setTotalPages(Math.ceil((response.data.count || 0) / 10));

        } catch (error) {
            console.error("Error fetching applicants:", error);
            setApplicants([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplicants(currentPage, searchQuery);
    }, [currentPage]);

    const handleSearch = (query) => {
        setSearchQuery(query);
        setCurrentPage(1);
        fetchApplicants(1, query);
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

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

    const handleSave = async (dataToSubmit) => {
        try {
            if (editingId) {
                await api.put(`solicitantes/${editingId}/`, dataToSubmit);
            } else {
                await api.post('solicitantes/', dataToSubmit);
            }
            setShowForm(false);
            fetchApplicants(currentPage, searchQuery);
        } catch (error) {
            console.error(error);
            alert("Error al guardar solicitante. Verifique los datos.");
        }
    };

    // No client-side filtering
    const filteredApplicants = applicants;

    return (
        <div>
            {/* Header with Search and Action */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Solicitantes</h2>
                    <p className="text-slate-500">Gestione el personal autorizado para retirar llaves.</p>
                </div>

                <div className="flex items-center gap-3">
                    <FilterBar onSearch={handleSearch} placeholder="Buscar solicitante..." />
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
            <ApplicantModal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                onSave={handleSave}
                editingId={editingId}
                initialData={formData}
            />

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="p-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Solicitante</th>
                            <th className="p-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">RUT</th>
                            <th className="p-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Contacto</th>
                            <th className="p-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredApplicants.map(app => (
                            <tr key={app.id} className="hover:bg-slate-50/80 transition-colors group text-xs">
                                <td className="p-2.5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 text-white flex items-center justify-center font-bold text-sm shadow-sm  shadow-blue-200">
                                            {app.nombre.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                                                {app.nombre} {app.apellido}
                                            </div>
                                            <div className="text-[10px] text-slate-400">Registrado recientemente</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-2.5 font-mono text-xs text-slate-600 bg-slate-50/50">{app.rut}</td>
                                <td className="p-2.5">
                                    <div className="text-xs text-slate-600 flex flex-col gap-1">
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
                                <td className="p-2.5 text-right">
                                    <button
                                        onClick={() => handleEdit(app)}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
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

export default Applicants;
