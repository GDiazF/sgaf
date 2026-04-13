import React, { useState, useEffect } from 'react';
import {
    FileText, Search, Plus, Filter, Download, Eye,
    Trash2, FilePlus, Building2, MapPin, Edit2
} from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { usePermission as usePerm } from '../../hooks/usePermission';

const ProceduresDashboard = () => {
    const { can } = usePerm();
    const canAdd = can('procedimientos.add_procedimiento');
    const canDelete = can('procedimientos.delete_procedimiento');
    const canChange = can('procedimientos.change_procedimiento');

    const [procedures, setProcedures] = useState([]);
    const [types, setTypes] = useState([]);

    // Organizational data
    const [subdirecciones, setSubdirecciones] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [unidades, setUnidades] = useState([]);

    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form states
    const [formData, setFormData] = useState({
        titulo: '',
        descripcion: '',
        tipo: '',
        subdireccion: '',
        departamento: '',
        unidad: '',
        archivo: null
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [procRes, typeRes, subRes, depRes, uniRes] = await Promise.all([
                api.get('procedimientos/procedimientos/'),
                api.get('procedimientos/tipos/'),
                api.get('subdirecciones/'),
                api.get('departamentos/'),
                api.get('unidades/')
            ]);
            const data = procRes.data.results || procRes.data || [];
            console.log("Procedures fetched:", data);
            setProcedures(data);
            setTypes(typeRes.data.results || typeRes.data);
            setSubdirecciones(subRes.data.results || subRes.data);
            setDepartamentos(depRes.data.results || depRes.data);
            setUnidades(uniRes.data.results || uniRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filtered departments based on selected subdirection
    const filteredDeps = departamentos.filter(d => !formData.subdireccion || String(d.subdireccion) === String(formData.subdireccion));

    // Filtered units based on selected department
    const filteredUnis = unidades.filter(u => !formData.departamento || String(u.departamento) === String(formData.departamento));

    const filteredProcedures = procedures.filter(p => {
        const matchesSearch = p.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || (p.tipo && String(p.tipo) === String(filterType));
        return matchesSearch && matchesType;
    });

    const handleEdit = (doc) => {
        setFormData({
            titulo: doc.titulo,
            descripcion: doc.descripcion,
            tipo: doc.tipo,
            subdireccion: doc.subdireccion || '',
            departamento: doc.departamento || '',
            unidad: doc.unidad || '',
            archivo: null
        });
        setEditingId(doc.id);
        setIsModalOpen(true);
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!editingId && !formData.archivo) return alert('Debes seleccionar un archivo');
        if (!formData.tipo) return alert('Debes seleccionar un tipo de documento');

        setSubmitting(true);
        const data = new FormData();
        Object.keys(formData).forEach(key => {
            if (formData[key]) data.append(key, formData[key]);
        });

        try {
            if (editingId) {
                await api.patch(`procedimientos/procedimientos/${editingId}/`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await api.post('procedimientos/procedimientos/', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            setIsModalOpen(false);
            setEditingId(null);
            setFormData({ titulo: '', descripcion: '', tipo: '', subdireccion: '', departamento: '', unidad: '', archivo: null });
            fetchData();
        } catch (error) {
            console.error('Error saving:', error);
            alert('Error al guardar el documento');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este procedimiento?')) return;
        try {
            await api.delete(`procedimientos/procedimientos/${id}/`);
            fetchData();
        } catch (error) {
            alert('Error al eliminar');
        }
    };

    const hexToRgba = (hex, alpha) => {
        if (!hex) return `rgba(99,102,241,${alpha})`;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    };

    const getFileUrl = (url) => {
        if (!url) return '';
        // Si la URL viene absoluta del backend, le quitamos el dominio para que pase por el proxy de Vite
        return url.replace(/^https?:\/\/[^/]+/, '');
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-50/50 rounded-3xl border border-slate-200/60 overflow-hidden">

            {/* HEADER */}
            <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg shadow-indigo-200">
                        <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-lg font-black text-slate-900 leading-none truncate">Gestor de Documentos</h1>
                        <p className="text-[10px] md:text-xs text-slate-500 font-medium mt-1">Estructura Organizacional SLEP</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 md:flex-initial">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm w-full md:w-48 lg:w-64 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {canAdd && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 active:scale-95"
                        >
                            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Nuevo</span>
                        </button>
                    )}
                </div>
            </div>

            {/* TYPE BAR */}
            <div className="flex items-center gap-2 px-6 py-3 bg-white border-b border-slate-100 overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setFilterType('all')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${filterType === 'all' ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}
                >
                    Todos
                </button>
                {types.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setFilterType(t.id)}
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${String(filterType) === String(t.id) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                        {t.nombre}
                    </button>
                ))}
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-44 bg-white rounded-2xl border border-slate-100 animate-pulse" />
                        ))}
                    </div>
                ) : filteredProcedures.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {filteredProcedures.map(doc => {
                            const typeColor = doc.tipo_data?.color || '#6366f1';
                            return (
                                <div key={doc.id} className="group bg-white rounded-2xl border border-slate-200/60 p-4 hover:shadow-xl hover:shadow-slate-200/50 hover:border-indigo-200 transition-all duration-300 relative flex flex-col h-full">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div className="flex gap-1">
                                            {canChange && (
                                                <button
                                                    onClick={() => handleEdit(doc)}
                                                    className="opacity-100 sm:opacity-0 group-hover:opacity-100 text-slate-300 hover:text-indigo-600 transition-all p-1"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button
                                                    onClick={() => handleDelete(doc.id)}
                                                    className="opacity-100 sm:opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all p-1"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-sm leading-tight mb-2 group-hover:text-indigo-600 transition-colors">{doc.titulo}</h3>

                                    <div className="space-y-1.5 mb-4 flex-1">
                                        {/* Area Tags */}
                                        <div className="flex flex-wrap gap-1">
                                            {doc.subdireccion_nombre && (
                                                <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded flex items-center gap-1">
                                                    <Building2 className="w-2.5 h-2.5" /> {doc.subdireccion_nombre}
                                                </span>
                                            )}
                                            {doc.departamento_nombre && (
                                                <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded flex items-center gap-1">
                                                    <MapPin className="w-2.5 h-2.5" /> {doc.departamento_nombre}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed italic">
                                            "{doc.descripcion || 'Sin descripción.'}"
                                        </p>
                                    </div>

                                    <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-50">
                                        <span className="text-[10px] font-black text-slate-400">
                                            {new Date(doc.created_at).toLocaleDateString('es-CL')}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => { setSelectedDoc(doc); setIsViewerOpen(true); }}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-all"
                                                title="Previsualizar"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span className="hidden sm:inline">Ver</span>
                                            </button>
                                            <a
                                                href={getFileUrl(doc.archivo)} download target="_blank" rel="noopener noreferrer"
                                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                title="Descargar"
                                            >
                                                <Download className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <FilePlus className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">No hay documentos</h3>
                        <p className="text-sm text-slate-500 max-w-xs mx-auto">Prueba con otros términos o filtros.</p>
                    </div>
                )}
            </div>

            {/* MODAL UPLOAD */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
                    <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom md:zoom-in-95 duration-300">
                        <div className="px-6 md:px-8 py-5 md:py-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
                            <div>
                                <h3 className="font-black text-lg">{editingId ? 'Editar Documento' : 'Nuevo Documento'}</h3>
                                <p className="text-xs text-white/70">{editingId ? 'Actualiza la información' : 'Completa los campos requeridos'}</p>
                            </div>
                            <button onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="bg-white/10 p-2.5 rounded-full hover:bg-white/20 transition-colors">
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleFileUpload} className="p-8 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Título</label>
                                    <input required type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        placeholder="Ej: Manual de Uso de Vehículos"
                                        value={formData.titulo}
                                        onChange={e => setFormData({ ...formData, titulo: e.target.value })} />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tipo de Documento</label>
                                    <select required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.tipo}
                                        onChange={e => setFormData({ ...formData, tipo: e.target.value })}>
                                        <option value="">Seleccionar...</option>
                                        {types.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Subdirección</label>
                                    <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.subdireccion}
                                        onChange={e => setFormData({ ...formData, subdireccion: e.target.value, departamento: '', unidad: '' })}>
                                        <option value="">Todas las áreas</option>
                                        {subdirecciones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Departamento</label>
                                    <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                                        disabled={!formData.subdireccion}
                                        value={formData.departamento}
                                        onChange={e => setFormData({ ...formData, departamento: e.target.value, unidad: '' })}>
                                        <option value="">Cualquier Departamento</option>
                                        {filteredDeps.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Unidad (Opcional)</label>
                                    <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                                        disabled={!formData.departamento}
                                        value={formData.unidad}
                                        onChange={e => setFormData({ ...formData, unidad: e.target.value })}>
                                        <option value="">Sin unidad específica</option>
                                        {filteredUnis.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Descripción corta</label>
                                    <textarea className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none"
                                        placeholder="¿De qué trata este procedimiento?"
                                        value={formData.descripcion}
                                        onChange={e => setFormData({ ...formData, descripcion: e.target.value })} />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Archivo del Procedimiento</label>
                                    <div className="border-2 border-dashed border-slate-200 rounded-[2rem] p-4 text-center hover:border-indigo-400 transition-colors bg-slate-50/50">
                                        <input required type="file" className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-6 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white"
                                            onChange={e => setFormData({ ...formData, archivo: e.target.files[0] })} />
                                    </div>
                                </div>
                            </div>

                            <button type="submit" disabled={submitting}
                                className="w-full py-4 bg-indigo-600 text-white rounded-[2rem] font-black text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-[0.98] disabled:opacity-50 mt-4">
                                {submitting ? 'Procesando subida...' : 'Publicar Procedimiento'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* VIEWER MODAL */}
            {isViewerOpen && selectedDoc && (
                <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[150] flex flex-col items-center justify-end md:justify-start overflow-hidden">
                    {/* Header: Visible en Desktop, Oculto/Compacto en Móvil */}
                    <div className="hidden md:flex items-center justify-between py-4 px-6 w-full text-white bg-slate-900/50">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 bg-indigo-500 rounded-xl flex-shrink-0"><FileText className="w-5 h-5" /></div>
                            <div className="min-w-0">
                                <h3 className="font-bold truncate text-base">{selectedDoc.titulo}</h3>
                                <p className="text-[10px] text-white/50 uppercase tracking-widest truncate">{selectedDoc.subdireccion_nombre || 'General'}</p>
                            </div>
                        </div>
                        <button onClick={() => setIsViewerOpen(false)} className="bg-white/10 p-3 rounded-full hover:bg-white/20 transition-colors border border-white/10">
                            <Plus className="w-6 h-6 rotate-45" />
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="w-full h-full md:flex-1 bg-slate-800 relative flex flex-col">
                        {/* Mobile Overlay: Solo para celulares */}
                        <div className="md:hidden flex flex-col items-center justify-center h-full p-8 text-center text-white space-y-6">
                            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/40 animate-bounce">
                                <FileText className="w-10 h-10" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black mb-2 leading-tight">{selectedDoc.titulo}</h3>
                                <p className="text-sm text-slate-400">{selectedDoc.subdireccion_nombre || 'Procedimiento Institucional'}</p>
                            </div>
                            <div className="w-full space-y-3 pt-4">
                                <a
                                    href={getFileUrl(selectedDoc.archivo)}
                                    target="_blank" rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-3 w-full py-4 bg-indigo-600 rounded-2xl font-bold text-lg shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
                                >
                                    <Eye className="w-5 h-5" /> Abrir Documento
                                </a>
                                <button
                                    onClick={() => setIsViewerOpen(false)}
                                    className="w-full py-4 bg-slate-700/50 rounded-2xl font-bold text-slate-300 border border-slate-600"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>

                        {/* Desktop Iframe: Solo para pantallas grandes */}
                        <iframe
                            src={getFileUrl(selectedDoc.archivo)}
                            className="hidden md:block w-full h-full border-none bg-white md:rounded-t-[3rem]"
                            title={selectedDoc.titulo}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProceduresDashboard;
