import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api';
import { ArrowLeft, Plus, Calendar, Clock, CheckCircle2, ChevronDown, Save, Users, Building2, Edit3, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import Select from 'react-select';

const EstablecimientoGestion = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const [gestiones, setGestiones] = useState([]);
    const [establecimiento, setEstablecimiento] = useState(null);
    const [subdirecciones, setSubdirecciones] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [unidades, setUnidades] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({
        requerimiento: '',
        descripcion: '',
        subdirecciones_requeridas: [],
        departamentos_requeridos: [],
        unidades_requeridas: [],
        estado: 'PENDIENTE',
        respuesta: ''
    });

    const [currentSelection, setCurrentSelection] = useState({
        subdireccion: null,
        departamento: null,
        unidad: null
    });

    const [expandedGestion, setExpandedGestion] = useState(null);
    const [newPasos, setNewPasos] = useState({});

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resEst, resGest, resSub, resDep, resUni] = await Promise.all([
                api.get(`establecimientos/${id}/`),
                api.get(`ejecutivos/gestiones/?establecimiento=${id}&page_size=1000`),
                api.get('subdirecciones/?page_size=1000'),
                api.get('departamentos/?page_size=1000'),
                api.get('unidades/?page_size=1000')
            ]);
            setEstablecimiento(resEst.data);
            setGestiones(resGest.data.results || resGest.data || []);
            setSubdirecciones(resSub.data.results || resSub.data || []);
            setDepartamentos(resDep.data.results || resDep.data || []);
            setUnidades(resUni.data.results || resUni.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPaso = async (gestionId) => {
        const title = newPasos[gestionId];
        if (!title || !title.trim()) return;
        try {
            await api.post('ejecutivos/subtareas/', {
                gestion: gestionId,
                titulo: title,
                completada: false
            });
            setNewPasos({ ...newPasos, [gestionId]: '' });
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const toggleSubtarea = async (sub) => {
        try {
            await api.patch(`ejecutivos/subtareas/${sub.id}/`, {
                completada: !sub.completada
            });
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const handleEdit = (g) => {
        setEditingId(g.id);
        setForm({
            requerimiento: g.requerimiento,
            descripcion: g.descripcion,
            subdirecciones_requeridas: g.subdirecciones_requeridas || [],
            departamentos_requeridos: g.departamentos_requeridos || [],
            unidades_requeridas: g.unidades_requeridas || [],
            estado: g.estado,
            respuesta: g.respuesta || ''
        });
        setIsFormOpen(true);
        // Scroll to top or form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Validar que exista un ejecutivo
            let ejecutivoId = user?.funcionario_data?.id;
            
            // Si el admin está probando y no tiene funcionario, usar el primero asignado
            if (!ejecutivoId) {
                const asigRes = await api.get(`ejecutivos/asignaciones/?establecimiento=${id}`);
                const asignaciones = asigRes.data.results || asigRes.data || [];
                if (asignaciones.length > 0) {
                    ejecutivoId = asignaciones[0].funcionario;
                } else {
                    alert("No puedes crear la gestión: No tienes un perfil de funcionario asociado y este establecimiento tampoco tiene un ejecutivo asignado.");
                    return;
                }
            }

            const payload = {
                ...form,
                establecimiento: id,
                ejecutivo: ejecutivoId
            };

            if (editingId) {
                await api.put(`ejecutivos/gestiones/${editingId}/`, payload);
            } else {
                await api.post('ejecutivos/gestiones/', payload);
            }

            setIsFormOpen(false);
            setEditingId(null);
            setForm({ requerimiento: '', descripcion: '', subdirecciones_requeridas: [], departamentos_requeridos: [], unidades_requeridas: [], estado: 'PENDIENTE', respuesta: '' });
            setCurrentSelection({ subdireccion: null, departamento: null, unidad: null });
            fetchData();
        } catch (error) {
            console.error(error);
            alert("Error al guardar: " + (error.response?.data ? JSON.stringify(error.response.data) : error.message));
        }
    };

    const handleDelete = async (gestionId) => {
        if (!window.confirm('¿Está seguro de que desea eliminar esta atención? Esta acción no se puede deshacer.')) return;
        try {
            await api.delete(`ejecutivos/gestiones/${gestionId}/`);
            fetchData();
        } catch (error) {
            console.error(error);
            alert("Error al eliminar: " + (error.response?.data ? JSON.stringify(error.response.data) : error.message));
        }
    };

    const handleStatusChange = async (gestionId, newStatus) => {
        try {
            await api.patch(`ejecutivos/gestiones/${gestionId}/`, { estado: newStatus });
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const addUnit = () => {
        if (currentSelection.unidad) {
            if (!form.unidades_requeridas.includes(currentSelection.unidad.value)) {
                setForm({...form, unidades_requeridas: [...form.unidades_requeridas, currentSelection.unidad.value]});
            }
        } else if (currentSelection.departamento) {
            if (!form.departamentos_requeridos.includes(currentSelection.departamento.value)) {
                setForm({...form, departamentos_requeridos: [...form.departamentos_requeridos, currentSelection.departamento.value]});
            }
        } else if (currentSelection.subdireccion) {
            if (!form.subdirecciones_requeridas.includes(currentSelection.subdireccion.value)) {
                setForm({...form, subdirecciones_requeridas: [...form.subdirecciones_requeridas, currentSelection.subdireccion.value]});
            }
        }
        setCurrentSelection({ subdireccion: null, departamento: null, unidad: null });
    };

    const removeUnit = (type, id) => {
        if (type === 'sub') {
            setForm({...form, subdirecciones_requeridas: form.subdirecciones_requeridas.filter(i => i !== id)});
        } else if (type === 'dep') {
            setForm({...form, departamentos_requeridos: form.departamentos_requeridos.filter(i => i !== id)});
        } else if (type === 'uni') {
            setForm({...form, unidades_requeridas: form.unidades_requeridas.filter(i => i !== id)});
        }
    };

    if (loading) return <div className="p-8">Cargando...</div>;

    const subOptions = subdirecciones.map(s => ({ value: s.id, label: s.nombre }));
    const depOptions = currentSelection.subdireccion
        ? departamentos.filter(d => d.subdireccion === currentSelection.subdireccion.value).map(d => ({ value: d.id, label: d.nombre }))
        : [];
    const uniOptions = currentSelection.departamento
        ? unidades.filter(u => u.departamento === currentSelection.departamento.value).map(u => ({ value: u.id, label: u.nombre }))
        : [];
    const selectStyles = {
        control: (base, state) => ({
            ...base,
            minHeight: '42px',
            height: '42px',
            borderColor: state.isFocused ? '#6366f1' : '#e2e8f0',
            boxShadow: 'none',
            borderRadius: '0.85rem',
            backgroundColor: '#f8fafc',
            fontSize: '13px',
            fontWeight: '500',
            transition: 'all 0.2s',
            '&:hover': { borderColor: '#6366f1' }
        }),
        valueContainer: (base) => ({
            ...base,
            padding: '0 12px'
        }),
        input: (base) => ({
            ...base,
            margin: '0',
            padding: '0',
            background: 'transparent !important',
            border: 'none !important',
            boxShadow: 'none !important',
            outline: 'none !important'
        }),
        placeholder: (base) => ({
            ...base,
            color: '#94a3b8'
        }),
        singleValue: (base) => ({
            ...base,
            color: '#334155'
        }),
        menu: (base) => ({
            ...base,
            borderRadius: '1rem',
            overflow: 'hidden',
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
            border: '1px border-slate-100',
            zIndex: 50
        }),
        menuList: (base) => ({
            ...base,
            padding: '0',
            maxHeight: '350px'
        }),
        option: (base, state) => ({
            ...base,
            fontSize: '13px',
            padding: '10px 12px',
            backgroundColor: state.isSelected ? '#6366f1' : state.isFocused ? '#f1f5f9' : 'white',
            color: state.isSelected ? 'white' : '#334155',
            cursor: 'pointer',
            '&:active': { backgroundColor: '#818cf8' }
        })
    };

    return (
        <>
            <div className="p-2 md:p-4 space-y-3 mx-auto h-full overflow-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <div className="flex items-center gap-3">
                    <Link to="/comunicaciones/ejecutivos" className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                        <ArrowLeft className="w-4 h-4 text-slate-600" />
                    </Link>
                    <div className="space-y-0.5">
                        <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none">{establecimiento?.nombre}</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gestión de Acompañamiento y Seguimiento</p>
                    </div>
                </div>
                <button 
                    onClick={() => {
                        setEditingId(null);
                        setForm({ requerimiento: '', descripcion: '', subdirecciones_requeridas: [], departamentos_requeridos: [], unidades_requeridas: [], estado: 'PENDIENTE', respuesta: '' });
                        setIsFormOpen(!isFormOpen);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
                >
                    <Plus className="w-4 h-4" />
                    Nueva Atención
                </button>
            </div>

            {/* Tabla de Gestiones */}
            <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px]">
                <div className="overflow-x-auto h-full bg-white">
                    <table className="w-full text-left border-collapse border-spacing-0">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-200">
                                <th className="px-4 py-3 text-center border-r border-slate-100 w-12">#</th>
                                <th className="px-4 py-3 border-r border-slate-100 w-32">Fecha</th>
                                <th className="px-4 py-3 border-r border-slate-100">Requerimiento</th>
                                <th className="px-4 py-3 border-r border-slate-100">Unidad</th>
                                <th className="px-4 py-3 border-r border-slate-100 w-[30%]">Respuesta / Avances</th>
                                <th className="px-4 py-3 text-center">Estado / Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {gestiones.map((g, idx) => (
                                <React.Fragment key={g.id}>
                                    <tr className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => setExpandedGestion(expandedGestion === g.id ? null : g.id)}>
                                        <td className="px-4 py-2 border-r border-slate-50 text-center font-bold text-slate-400 text-[10px]">{gestiones.length - idx}</td>
                                        <td className="px-4 py-2 border-r border-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-tighter whitespace-nowrap">
                                            {new Date(g.fecha).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-2 border-r border-slate-50">
                                            <span className="text-[12px] font-black text-slate-700 uppercase leading-tight line-clamp-1">{g.requerimiento}</span>
                                        </td>
                                        <td className="px-4 py-2 border-r border-slate-50">
                                            <div className="flex flex-wrap gap-1">
                                                {g.unidades_detalles?.map(u => (
                                                    <span key={u.id} className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg border border-indigo-100 uppercase tracking-tighter">
                                                        {u.nombre}
                                                    </span>
                                                ))}
                                                {(!g.unidades_detalles?.length) && <span className="text-[9px] text-slate-300 italic uppercase font-bold">Gral</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 border-r border-slate-50">
                                            <p className="text-[11px] font-medium text-slate-600 line-clamp-1 uppercase leading-none">{g.respuesta || 'Sin respuesta'}</p>
                                            {g.subtareas?.length > 0 && (
                                                <div className="mt-1 space-y-0.5">
                                                    {g.subtareas.slice(0, 2).map(sub => (
                                                        <div key={sub.id} className="flex items-start gap-1 text-[9px] text-slate-400 font-bold uppercase leading-none">
                                                            <CheckCircle2 className={`w-3 h-3 flex-shrink-0 ${sub.completada ? 'text-emerald-500' : 'text-slate-300'}`} />
                                                            <span className="truncate">{sub.titulo}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <select 
                                                    value={g.estado}
                                                    onChange={(e) => { e.stopPropagation(); handleStatusChange(g.id, e.target.value); }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border-none outline-none cursor-pointer appearance-none text-center ${
                                                        g.estado === 'PENDIENTE' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                        g.estado === 'EN_PROCESO' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                        g.estado === 'RESPONDIDO' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                                        'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                    }`}
                                                >
                                                    <option value="PENDIENTE">Pendiente</option>
                                                    <option value="EN_PROCESO">En Proceso</option>
                                                    <option value="RESPONDIDO">Respondido</option>
                                                    <option value="CERRADO">Cerrado</option>
                                                </select>
                                                
                                                <div className="flex gap-1 ml-2">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleEdit(g); }}
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(g.id); }}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedGestion === g.id && (
                                        <tr className="bg-slate-50 border-b border-indigo-100/50 shadow-inner">
                                            <td colSpan="6" className="p-4 md:p-6">
                                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                                    <div className="lg:col-span-1">
                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Descripción Completa</h4>
                                                        <div className="bg-white p-4 rounded-xl border border-slate-100 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed uppercase shadow-sm">
                                                            {g.descripcion || 'Sin descripción detallada.'}
                                                        </div>
                                                    </div>
                                                    <div className="lg:col-span-1">
                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Avances / Pasos</h4>
                                                        <div className="space-y-3">
                                                            <div className="space-y-2 max-h-40 overflow-auto pr-2 custom-scrollbar">
                                                                {g.subtareas?.map(sub => (
                                                                    <div key={sub.id} onClick={(e) => { e.stopPropagation(); toggleSubtarea(sub); }} className="flex items-start gap-2 text-[11px] font-bold text-slate-600 cursor-pointer hover:bg-white p-2 rounded-lg transition-all border border-transparent hover:border-slate-100 uppercase">
                                                                        <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${sub.completada ? 'text-emerald-500' : 'text-slate-300'}`} />
                                                                        <span className={sub.completada ? 'line-through text-slate-300 font-medium' : ''}>{sub.titulo}</span>
                                                                    </div>
                                                                ))}
                                                                {(!g.subtareas || g.subtareas.length === 0) && <p className="text-[10px] text-slate-400 italic font-bold uppercase p-4 text-center">No hay pasos registrados</p>}
                                                            </div>
                                                            <form onSubmit={(e) => { e.preventDefault(); handleAddPaso(g.id); }} className="flex gap-2">
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="NUEVO PASO..." 
                                                                    value={newPasos[g.id] || ''} 
                                                                    onChange={(e) => setNewPasos({...newPasos, [g.id]: e.target.value.toUpperCase()})}
                                                                    className="flex-1 text-[10px] font-bold bg-white border border-slate-200 px-3 py-2 rounded-xl outline-none focus:border-indigo-500 uppercase"
                                                                />
                                                                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100">Añadir</button>
                                                            </form>
                                                        </div>
                                                    </div>
                                                    <div className="lg:col-span-1">
                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Historial de Cambios</h4>
                                                        <div className="space-y-2 max-h-48 overflow-auto custom-scrollbar pr-2">
                                                            {g.historial?.map(h => (
                                                                <div key={h.id} className="text-[10px] text-slate-500 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                                    <div className="flex justify-between items-center mb-1">
                                                                        <span className="font-black text-indigo-600 uppercase tracking-tighter">{h.usuario_nombre}</span>
                                                                        <span className="text-[9px] font-bold text-slate-400">{new Date(h.fecha).toLocaleString()}</span>
                                                                    </div>
                                                                    <p className="font-bold text-slate-700 uppercase tracking-tight">{h.accion}</p>
                                                                    <p className="text-slate-400 mt-1 italic leading-tight">{h.detalles}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

            {/* Slide-over Drawer para el Formulario (FUERA del div principal para ser realmente fixed al viewport) */}
            <AnimatePresence>
                {isFormOpen && (
                    <>
                        {/* Backdrop Overlay */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsFormOpen(false)}
                            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999]"
                        />

                        {/* Drawer Panel */}
                        <motion.div 
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 bottom-0 h-screen w-full max-w-2xl bg-slate-50 shadow-2xl z-[1000] flex flex-col border-l border-slate-200"
                        >
                            {/* Decorative Top Bar */}
                            <div className="h-1.5 w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 shrink-0" />
                            
                            <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center shadow-sm shrink-0">
                                <div>
                                    <h2 className="text-xl font-extrabold text-slate-800">{editingId ? 'Editar Atención' : 'Nueva Atención'}</h2>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                        <p className="text-xs font-bold text-indigo-600/70 uppercase tracking-wider">{establecimiento?.nombre}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsFormOpen(false)} 
                                    className="p-2 hover:bg-slate-100 rounded-xl transition-all group"
                                    title="Cerrar"
                                >
                                    <Plus className="w-6 h-6 rotate-45 text-slate-400 group-hover:text-rose-500 transition-colors" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Requerimiento o Asunto</label>
                                        <input required value={form.requerimiento} onChange={e => setForm({...form, requerimiento: e.target.value})} className="w-full bg-white border border-slate-200 text-slate-800 px-4 py-3 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium" placeholder="Ej: Solicitud urgente de contratación de personal" />
                                    </div>

                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                        <h3 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                                            <div className="p-1.5 bg-indigo-50 rounded-lg"><Users className="w-4 h-4 text-indigo-600" /></div>
                                            Destinatarios <span className="text-xs font-medium text-slate-400">(Opcional)</span>
                                        </h3>
                                        
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5 pl-1">1. Subdirección</label>
                                                <Select options={subOptions} value={currentSelection.subdireccion} onChange={(selected) => setCurrentSelection({ subdireccion: selected, departamento: null, unidad: null })} placeholder="Seleccionar..." styles={selectStyles} isClearable menuPortalTarget={document.body} menuPosition="fixed" />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5 pl-1">2. Departamento</label>
                                                    <Select isDisabled={!currentSelection.subdireccion} options={depOptions} value={currentSelection.departamento} onChange={(selected) => setCurrentSelection({ ...currentSelection, departamento: selected, unidad: null })} placeholder="Seleccionar..." styles={selectStyles} isClearable menuPortalTarget={document.body} menuPosition="fixed" />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5 pl-1">3. Unidad</label>
                                                    <Select isDisabled={!currentSelection.departamento} options={uniOptions} value={currentSelection.unidad} onChange={(selected) => setCurrentSelection({ ...currentSelection, unidad: selected })} placeholder="Seleccionar..." styles={selectStyles} isClearable menuPortalTarget={document.body} menuPosition="fixed" />
                                                </div>
                                            </div>
                                            
                                            <button type="button" onClick={addUnit} disabled={!currentSelection.subdireccion && !currentSelection.departamento && !currentSelection.unidad} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all shadow-md active:scale-95">
                                                <Plus className="w-4 h-4" /> Añadir a la lista
                                            </button>

                                            {(form.subdirecciones_requeridas.length > 0 || form.departamentos_requeridos.length > 0 || form.unidades_requeridas.length > 0) && (
                                                <div className="pt-4 mt-2 border-t border-slate-100">
                                                    <div className="flex flex-col gap-2">
                                                        {form.subdirecciones_requeridas.map(id => {
                                                            const s = subdirecciones.find(x => x.id === id);
                                                            return s ? (
                                                                <div key={`s-${id}`} className="flex items-center justify-between bg-indigo-50 p-2.5 rounded-xl border border-indigo-100">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                                                        <span className="text-xs font-bold text-indigo-700">{s.nombre}</span>
                                                                    </div>
                                                                    <button type="button" onClick={() => removeUnit('sub', id)} className="text-indigo-400 hover:text-indigo-700"><Plus className="w-4 h-4 rotate-45" /></button>
                                                                </div>
                                                            ) : null;
                                                        })}
                                                        {form.departamentos_requeridos.map(id => {
                                                            const d = departamentos.find(x => x.id === id);
                                                            return d ? (
                                                                <div key={`d-${id}`} className="flex items-center justify-between bg-blue-50 p-2.5 rounded-xl border border-blue-100">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                                        <span className="text-xs font-bold text-blue-700">{d.nombre}</span>
                                                                    </div>
                                                                    <button type="button" onClick={() => removeUnit('dep', id)} className="text-blue-400 hover:text-blue-700"><Plus className="w-4 h-4 rotate-45" /></button>
                                                                </div>
                                                            ) : null;
                                                        })}
                                                        {form.unidades_requeridas.map(id => {
                                                            const u = unidades.find(x => x.id === id);
                                                            return u ? (
                                                                <div key={`u-${id}`} className="flex items-center justify-between bg-cyan-50 p-2.5 rounded-xl border border-cyan-100">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                                                                        <span className="text-xs font-bold text-cyan-700">{u.nombre}</span>
                                                                    </div>
                                                                    <button type="button" onClick={() => removeUnit('uni', id)} className="text-cyan-400 hover:text-cyan-700"><Plus className="w-4 h-4 rotate-45" /></button>
                                                                </div>
                                                            ) : null;
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Descripción Detallada</label>
                                        <textarea value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} className="w-full bg-white border border-slate-200 text-slate-800 px-4 py-3 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all min-h-[140px] resize-none" placeholder="Explique los detalles completos..." />
                                    </div>
                                </div>
                                
                                <div className="flex flex-col gap-3 pt-4 mb-10">
                                    <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                        <Save className="w-5 h-5"/> {editingId ? 'Guardar Cambios' : 'Registrar Atención'}
                                    </button>
                                    <button type="button" onClick={() => setIsFormOpen(false)} className="w-full py-4 rounded-2xl text-slate-500 font-bold hover:bg-slate-100 transition-colors">
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default EstablecimientoGestion;
