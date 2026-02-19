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
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Solicitantes</h2>
                    <p className="text-slate-500 font-medium text-xs mt-1.5">Gestione el personal autorizado para retirar llaves.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleNew}
                        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-500/10 font-black text-[11px] uppercase tracking-[0.1em] active:scale-95 whitespace-nowrap shrink-0"
                    >
                        <UserPlus className="w-4 h-4" />
                        Nuevo Solicitante
                    </button>
                </div>
            </div>

            {/* Refined Filter Bar */}
            <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center gap-2 mb-6">
                <div className="flex-1">
                    <FilterBar
                        onSearch={handleSearch}
                        placeholder="Buscar solicitante por nombre, RUT o email..."
                        inputClassName="!shadow-none"
                    />
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

            {/* Table Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="p-2 text-[9px] font-black text-slate-400 uppercase tracking-widest pl-8">Solicitante</th>
                            <th className="p-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">RUT</th>
                            <th className="p-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Contacto</th>
                            <th className="p-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right pr-8">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {applicants.map(app => (
                            <tr key={app.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="p-1.5 pl-8">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-black text-[10px]">
                                            {app.nombre.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-extrabold text-slate-900 text-[12px] leading-none">
                                                {app.nombre} {app.apellido}
                                            </div>
                                            <div className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">Autorizado</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-1.5 px-3">
                                    <span className="font-mono text-[10px] text-slate-600 font-bold">{app.rut}</span>
                                </td>
                                <td className="p-1.5">
                                    <div className="text-[10px] text-slate-600 flex flex-col leading-tight">
                                        <span className="font-medium truncate max-w-[150px]">{app.email || 'Sin email'}</span>
                                        <span className="text-[9px] text-slate-400 font-bold">{app.telefono || 'Sin tfno'}</span>
                                    </div>
                                </td>
                                <td className="p-1.5 text-right pr-8">
                                    <button
                                        onClick={() => handleEdit(app)}
                                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
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
