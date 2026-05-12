import React, { useState, useEffect } from 'react';
import {
    FileText, Search, Plus, Filter, Download, Eye,
    Trash2, FilePlus, Building2, MapPin, Edit2, ChevronDown
} from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { usePermission as usePerm } from '../../hooks/usePermission';

const ProceduresDashboard = () => {
    // Force hide native select arrows globally for this component
    const selectStyle = {
        WebkitAppearance: 'none',
        MozAppearance: 'none',
        appearance: 'none'
    };

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
    const [filterType, setFilterType] = useState([]); 
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterSubdireccion, setFilterSubdireccion] = useState('');
    const [filterDepartamento, setFilterDepartamento] = useState('');

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
        archivo: null,
        activo: true
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            // Force non-cached request with timestamp
            const ts = new Date().getTime();
            const [procRes, typeRes, subRes, depRes, uniRes] = await Promise.all([
                api.get(`procedimientos/procedimientos/?_ts=${ts}`),
                api.get(`procedimientos/tipos/?_ts=${ts}`),
                api.get(`subdirecciones/?_ts=${ts}`),
                api.get(`departamentos/?_ts=${ts}`),
                api.get(`unidades/?_ts=${ts}`)
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
        const matchesSearch = (p.titulo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        // Multi-select types
        const matchesType = filterType.length === 0 || (p.tipo && filterType.includes(String(p.tipo)));
        
        // Organizational filters
        const matchesSub = !filterSubdireccion || String(p.subdireccion) === String(filterSubdireccion);
        const matchesDep = !filterDepartamento || String(p.departamento) === String(filterDepartamento);

        // Status filter (only for staff/editors)
        let matchesStatus = true;
        if (filterStatus === 'active') matchesStatus = p.activo === true;
        if (filterStatus === 'inactive') matchesStatus = p.activo === false;

        return matchesSearch && matchesType && matchesSub && matchesDep && matchesStatus;
    });

    const handleEdit = (doc) => {
        setFormData({
            titulo: doc.titulo,
            descripcion: doc.descripcion,
            tipo: doc.tipo,
            subdireccion: doc.subdireccion || '',
            departamento: doc.departamento || '',
            unidad: doc.unidad || '',
            archivo: null,
            activo: doc.activo
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
            setFormData({ titulo: '', descripcion: '', tipo: '', subdireccion: '', departamento: '', unidad: '', archivo: null, activo: true });
            alert('¡Procedimiento guardado con éxito!');
            await fetchData();
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
                        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            Gestor de Documentos
                        </h1>
                        <p className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block mt-1">
                            {filteredProcedures.length} documentos disponibles
                        </p>
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

            {/* FILTER BAR - Ultra Compact & Left Aligned */}
            <div className="bg-white border-b border-slate-100 shadow-sm z-20">
                <div className="px-4 py-2 flex items-center justify-between gap-4">
                    {/* Lado Izquierdo: Icono y Tipo */}
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Filter className="w-3.5 h-3.5" />
                        </div>
                        
                        <div className="relative">
                            <select 
                                style={selectStyle}
                                className="appearance-none w-[160px] px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer pr-8 overflow-hidden text-ellipsis whitespace-nowrap"
                                value={filterType[0] || ''}
                                onChange={(e) => setFilterType(e.target.value ? [e.target.value] : [])}
                            >
                                <option value="">TIPO: TODOS</option>
                                {types.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                            </select>
                        </div>

                        {/* Estructura Organizacional */}
                        <div className="relative">
                            <select 
                                style={selectStyle}
                                className="appearance-none w-[190px] px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer pr-8 overflow-hidden text-ellipsis whitespace-nowrap"
                                value={filterSubdireccion}
                                onChange={(e) => { setFilterSubdireccion(e.target.value); setFilterDepartamento(''); }}
                            >
                                <option value="">SUBDIRECCIÓN: TODAS</option>
                                {subdirecciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                        </div>

                        <div className="relative">
                            <select 
                                style={selectStyle}
                                className="appearance-none w-[190px] px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer pr-8 disabled:opacity-30 overflow-hidden text-ellipsis whitespace-nowrap"
                                disabled={!filterSubdireccion}
                                value={filterDepartamento}
                                onChange={(e) => setFilterDepartamento(e.target.value)}
                            >
                                <option value="">DEPARTAMENTO: TODOS</option>
                                {departamentos.filter(d => String(d.subdireccion) === String(filterSubdireccion)).map(d => (
                                    <option key={d.id} value={d.id}>{d.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={() => { setFilterType([]); setFilterStatus('all'); setFilterSubdireccion(''); setFilterDepartamento(''); setSearchTerm(''); }}
                            className="px-3 py-1.5 text-slate-400 hover:text-rose-500 text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            LIMPIAR
                        </button>
                    </div>

                    {/* Lado Derecho: Estado */}
                    <div className="flex items-center gap-3">
                        {(canChange || canAdd) && (
                            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200/50">
                                <button 
                                    onClick={() => setFilterStatus('all')}
                                    className={`px-2.5 py-1 rounded-md text-[9px] font-black transition-all ${filterStatus === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    TODO
                                </button>
                                <button 
                                    onClick={() => setFilterStatus('active')}
                                    className={`px-2.5 py-1 rounded-md text-[9px] font-black transition-all ${filterStatus === 'active' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    ACTIVOS
                                </button>
                                <button 
                                    onClick={() => setFilterStatus('inactive')}
                                    className={`px-2.5 py-1 rounded-md text-[9px] font-black transition-all ${filterStatus === 'inactive' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    BORRADOR
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>


            {/* MAIN CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-44 bg-white rounded-2xl border border-slate-100 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <>
                        {filteredProcedures.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {filteredProcedures.map(doc => {
                                    const typeColor = doc.tipo_data?.color || '#6366f1';
                                    return (
                                        <div key={doc.id} className="group bg-white rounded-2xl border border-slate-200/60 p-4 hover:shadow-xl hover:shadow-slate-200/50 hover:border-indigo-200 transition-all duration-300 relative flex flex-col h-full">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    {!doc.activo && (
                                                        <span className="text-[9px] font-black bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                            Inactivo
                                                        </span>
                                                    )}
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
                    </>
                )}
            </div>

            {/* MODAL UPLOAD */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
                        {/* Header Compacto */}
                        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-indigo-500 rounded-lg"><FilePlus className="w-4 h-4" /></div>
                                <h3 className="font-bold text-base">{editingId ? 'Editar Documento' : 'Nuevo Procedimiento'}</h3>
                            </div>
                            <button onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="text-slate-400 hover:text-white transition-colors">
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleFileUpload} className="p-6">
                            <div className="grid grid-cols-12 gap-5">
                                {/* Fila 1: Título y Tipo (8/12 y 4/12) */}
                                <div className="col-span-8">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Título del Documento</label>
                                    <input required type="text" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                        placeholder="Ej: Manual de Operaciones"
                                        value={formData.titulo}
                                        onChange={e => setFormData({ ...formData, titulo: e.target.value })} />
                                </div>
                                <div className="col-span-4">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tipo</label>
                                    <select required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                        value={formData.tipo}
                                        onChange={e => setFormData({ ...formData, tipo: e.target.value })}>
                                        <option value="">Seleccionar...</option>
                                        {types.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                    </select>
                                </div>

                                {/* Fila 2: Descripción (Full Width) */}
                                <div className="col-span-12">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Descripción Corta</label>
                                    <input type="text" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                        placeholder="Resumen del contenido..."
                                        value={formData.descripcion}
                                        onChange={e => setFormData({ ...formData, descripcion: e.target.value })} />
                                </div>

                                {/* Fila 3: Áreas (Simetría 1/3 cada una) */}
                                <div className="col-span-4">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Subdirección</label>
                                    <select className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        value={formData.subdireccion}
                                        onChange={e => setFormData({ ...formData, subdireccion: e.target.value, departamento: '', unidad: '' })}>
                                        <option value="">General</option>
                                        {subdirecciones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-4">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Departamento</label>
                                    <select className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none disabled:opacity-40"
                                        disabled={!formData.subdireccion}
                                        value={formData.departamento}
                                        onChange={e => setFormData({ ...formData, departamento: e.target.value, unidad: '' })}>
                                        <option value="">Cualquiera</option>
                                        {filteredDeps.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-4">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Unidad</label>
                                    <select className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none disabled:opacity-40"
                                        disabled={!formData.departamento}
                                        value={formData.unidad}
                                        onChange={e => setFormData({ ...formData, unidad: e.target.value })}>
                                        <option value="">Cualquiera</option>
                                        {filteredUnis.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                                    </select>
                                </div>

                                {/* Fila 4: Archivo y Visibilidad (50/50 Split) */}
                                <div className="col-span-6">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Archivo del Documento</label>
                                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 h-[42px]">
                                        <FilePlus className={`w-4 h-4 ${formData.archivo ? 'text-emerald-500' : 'text-slate-400'}`} />
                                        <input required={!editingId} type="file" className="text-[10px] w-full file:bg-indigo-600 file:text-white file:border-0 file:px-2 file:py-0.5 file:rounded-md file:mr-2 file:cursor-pointer"
                                            onChange={e => setFormData({ ...formData, archivo: e.target.files[0] })} />
                                    </div>
                                </div>

                                <div className="col-span-6">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Estado de Visibilidad</label>
                                    <div className="flex items-center justify-between px-4 bg-slate-900 border border-slate-800 rounded-xl h-[42px] shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${formData.activo ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-slate-500'}`} />
                                            <span className="text-[11px] font-bold text-white uppercase tracking-tighter">{formData.activo ? 'Público' : 'Borrador'}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, activo: !formData.activo })}
                                            className={`w-9 h-5 rounded-full transition-all relative ${formData.activo ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                        >
                                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${formData.activo ? 'left-4.5' : 'left-0.5'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Botones de Acción: Simetría Final */}
                            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
                                <button type="button" onClick={() => { setIsModalOpen(false); setEditingId(null); }} 
                                    className="px-6 py-2.5 text-slate-500 font-bold text-sm hover:bg-slate-100 rounded-xl transition-all">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="min-w-[180px] py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-[11px] hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest">
                                    {submitting ? 'Procesando...' : (editingId ? 'Actualizar' : 'Publicar Documento')}
                                </button>
                            </div>
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
