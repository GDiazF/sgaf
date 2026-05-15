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
            borderColor: state.isFocused ? '#6366f1' : '#e2e8f0',
            boxShadow: state.isFocused ? '0 0 0 2px #c7d2fe' : 'none',
            borderRadius: '0.75rem',
            padding: '2px',
            backgroundColor: '#f8fafc',
            transition: 'all 0.2s',
            '&:hover': { borderColor: '#6366f1' }
        }),
        menu: (base) => ({
            ...base,
            borderRadius: '0.75rem',
            overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            zIndex: 50
        })
    };

    return (
        <>
            <div className="p-4 md:p-8 space-y-6 mx-auto h-full overflow-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Link to="/comunicaciones/ejecutivos" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">{establecimiento?.nombre}</h1>
                        <p className="text-sm text-slate-500">Gestión de Acompañamiento y Seguimiento</p>
                    </div>
                </div>
                <button 
                    onClick={() => {
                        setEditingId(null);
                        setForm({ requerimiento: '', descripcion: '', subdirecciones_requeridas: [], departamentos_requeridos: [], unidades_requeridas: [], estado: 'PENDIENTE', respuesta: '' });
                        setIsFormOpen(!isFormOpen);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Nueva Atención
                </button>
            </div>

            {/* Tabla de Gestiones */}
            <div className="bg-[#56a3e8] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden min-h-[600px]">
                <div className="overflow-x-auto h-full bg-white">
                    <table className="w-full text-left border-collapse border-spacing-0">
                        <thead className="sticky top-0 z-10 border-none">
                            <tr className="bg-[#56a3e8] text-white border-none">
                                <th className="px-4 py-5 text-center border-r border-[#3b93e2] w-12 first:rounded-tl-none border-t-0">#</th>
                                <th className="px-4 py-5 border-r border-[#3b93e2] w-32 border-t-0">Fecha</th>
                                <th className="px-4 py-5 border-r border-[#3b93e2] border-t-0">Requerimiento</th>
                                <th className="px-4 py-5 border-r border-[#3b93e2] border-t-0">Unidad</th>
                                <th className="px-4 py-5 border-r border-[#3b93e2] w-[30%] border-t-0">Respuesta / Avances</th>
                                <th className="px-4 py-5 text-center last:rounded-tr-none border-t-0">Estado / Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {gestiones.map((g, idx) => (
                                <React.Fragment key={g.id}>
                                    <tr className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setExpandedGestion(expandedGestion === g.id ? null : g.id)}>
                                        <td className="px-4 py-4 text-center border-r border-slate-200 font-bold text-slate-500">{gestiones.length - idx}</td>
                                        <td className="px-4 py-4 border-r border-slate-200">
                                            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                                                <Calendar className="w-4 h-4 text-slate-400" />
                                                {new Date(g.fecha).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 border-r border-slate-200">
                                            <p className="text-sm font-semibold text-slate-800">{g.requerimiento}</p>
                                        </td>
                                        <td className="px-4 py-4 border-r border-slate-200 text-sm text-slate-600">
                                            <div className="flex flex-col gap-1">
                                                {g.subdirecciones_detalles?.length > 0 && (
                                                    <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                                                        {g.subdirecciones_detalles.map(s => s.nombre).join(', ')}
                                                    </span>
                                                )}
                                                {g.departamentos_detalles?.length > 0 && (
                                                    <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                                                        {g.departamentos_detalles.map(d => d.nombre).join(', ')}
                                                    </span>
                                                )}
                                                {g.unidades_detalles?.length > 0 && (
                                                    <span className="text-xs font-semibold bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded border border-cyan-100">
                                                        {g.unidades_detalles.map(u => u.nombre).join(', ')}
                                                    </span>
                                                )}
                                                {(!g.subdirecciones_detalles?.length && !g.departamentos_detalles?.length && !g.unidades_detalles?.length) && (
                                                    <span className="text-slate-400 italic text-xs">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 border-r border-slate-200 text-sm text-slate-600">
                                            <div className="mb-2">
                                                {g.respuesta ? (
                                                    <div className="whitespace-pre-wrap">{g.respuesta}</div>
                                                ) : (
                                                    g.subtareas?.length > 0 ? (
                                                        <span className="text-indigo-500 font-medium italic flex items-center gap-1">
                                                            <Clock className="w-3.5 h-3.5" /> En seguimiento ({g.subtareas.length} pasos)
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 italic">Pendiente de atención</span>
                                                    )
                                                )}
                                            </div>
                                            {g.subtareas?.length > 0 && (
                                                <div className="mt-2 space-y-1">
                                                    {g.subtareas.map(sub => (
                                                        <div key={sub.id} className="flex items-start gap-1.5 text-xs text-slate-500">
                                                            <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${sub.completada ? 'text-emerald-500' : 'text-slate-300'}`} />
                                                            <span>{sub.titulo}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <select 
                                                    value={g.estado}
                                                    onChange={(e) => { e.stopPropagation(); handleStatusChange(g.id, e.target.value); }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className={`text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full border-none outline-none cursor-pointer appearance-none text-center ${
                                                        g.estado === 'PENDIENTE' ? 'bg-rose-100 text-rose-600' :
                                                        g.estado === 'EN_PROCESO' ? 'bg-amber-100 text-amber-600' :
                                                        g.estado === 'RESPONDIDO' ? 'bg-blue-100 text-blue-600' :
                                                        'bg-emerald-100 text-emerald-600'
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
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(g.id); }}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedGestion === g.id && (
                                        <tr className="bg-slate-50 border-b-2 border-indigo-100">
                                            <td colSpan="6" className="p-6">
                                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                                    <div className="lg:col-span-1">
                                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Descripción Completa</h4>
                                                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{g.descripcion || 'Sin descripción detallada.'}</p>
                                                    </div>
                                                    <div className="lg:col-span-1">
                                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Avances / Pasos</h4>
                                                        <div className="space-y-3">
                                                            <div className="space-y-2 max-h-40 overflow-auto pr-2">
                                                                {g.subtareas?.map(sub => (
                                                                    <div key={sub.id} onClick={(e) => { e.stopPropagation(); toggleSubtarea(sub); }} className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-100 p-1 rounded transition-colors">
                                                                        <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${sub.completada ? 'text-emerald-500' : 'text-slate-300'}`} />
                                                                        <span className={sub.completada ? 'line-through text-slate-400' : ''}>{sub.titulo}</span>
                                                                    </div>
                                                                ))}
                                                                {(!g.subtareas || g.subtareas.length === 0) && <p className="text-xs text-slate-400 italic">No hay pasos registrados.</p>}
                                                            </div>
                                                            <form onSubmit={(e) => { e.preventDefault(); handleAddPaso(g.id); }} className="flex gap-2">
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="Nuevo paso o avance..." 
                                                                    value={newPasos[g.id] || ''} 
                                                                    onChange={(e) => setNewPasos({...newPasos, [g.id]: e.target.value})}
                                                                    className="flex-1 text-sm bg-white border border-slate-200 px-3 py-1.5 rounded-lg outline-none focus:border-indigo-500"
                                                                />
                                                                <button type="submit" className="bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-indigo-200 transition-colors">Añadir</button>
                                                            </form>
                                                        </div>
                                                    </div>
                                                    <div className="lg:col-span-1">
                                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Historial de Cambios</h4>
                                                        <div className="space-y-2 max-h-40 overflow-auto">
                                                            {g.historial?.map(h => (
                                                                <div key={h.id} className="text-xs text-slate-600 flex items-start gap-2">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0"></div>
                                                                    <div>
                                                                        <span className="font-semibold">{h.usuario_nombre}:</span> {h.accion} - <span className="text-slate-400">{new Date(h.fecha).toLocaleString()}</span>
                                                                        <p className="text-slate-500 mt-0.5">{h.detalles}</p>
                                                                    </div>
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
                                                <Select options={subOptions} value={currentSelection.subdireccion} onChange={(selected) => setCurrentSelection({ subdireccion: selected, departamento: null, unidad: null })} placeholder="Seleccionar..." styles={selectStyles} isClearable />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5 pl-1">2. Departamento</label>
                                                    <Select isDisabled={!currentSelection.subdireccion} options={depOptions} value={currentSelection.departamento} onChange={(selected) => setCurrentSelection({ ...currentSelection, departamento: selected, unidad: null })} placeholder="Seleccionar..." styles={selectStyles} isClearable />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5 pl-1">3. Unidad</label>
                                                    <Select isDisabled={!currentSelection.departamento} options={uniOptions} value={currentSelection.unidad} onChange={(selected) => setCurrentSelection({ ...currentSelection, unidad: selected })} placeholder="Seleccionar..." styles={selectStyles} isClearable />
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
