import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import api from '../../api';
import { ArrowLeft, Plus, CheckCircle2, Edit3, Trash2, Loader2, FolderSearch } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import GestionAtencionDrawer from '../../components/comunicaciones/GestionAtencionDrawer';
import GestionSeguimientoPanel from '../../components/comunicaciones/GestionSeguimientoPanel';
import { BTN_PRIMARY, BTN_SECONDARY, LOADER_SPIN } from '../funcionarios/shared/funcionariosUi';

const EMPTY_FORM = {
    requerimiento: '',
    descripcion: '',
    subdirecciones_requeridas: [],
    departamentos_requeridos: [],
    unidades_requeridas: [],
    estado: 'PENDIENTE',
    respuesta: '',
};

const isFinalizada = (gestion) => gestion?.estado === 'RESPONDIDO';
const canManagePasos = (gestion) => !['CERRADO', 'RESPONDIDO'].includes(gestion?.estado);

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
    const [form, setForm] = useState(EMPTY_FORM);
    const [formError, setFormError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pageError, setPageError] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    const [expandedGestion, setExpandedGestion] = useState(null);
    const [newPasos, setNewPasos] = useState({});

    useEffect(() => {
        fetchData();
    // fetchData intentionally refreshes all lookup data for the current establishment id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const handleAddPaso = async (gestion) => {
        if (!canManagePasos(gestion)) {
            setPageError(gestion.estado === 'CERRADO'
                ? 'Para agregar pasos debes cambiar la atención a pendiente o en proceso.'
                : 'La atención respondida finalizó su ciclo y no permite nuevos pasos.');
            return;
        }
        const title = newPasos[gestion.id];
        if (!title || !title.trim()) return;
        try {
            await api.post('ejecutivos/subtareas/', {
                gestion: gestion.id,
                titulo: title,
                completada: false
            });
            setNewPasos({ ...newPasos, [gestion.id]: '' });
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const toggleSubtarea = async (sub, gestion) => {
        if (!canManagePasos(gestion)) {
            setPageError(gestion.estado === 'CERRADO'
                ? 'Para modificar pasos debes cambiar la atención a pendiente o en proceso.'
                : 'La atención respondida finalizó su ciclo y no permite cambios.');
            return;
        }
        try {
            await api.patch(`ejecutivos/subtareas/${sub.id}/`, {
                completada: !sub.completada
            });
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const closeDrawer = () => {
        setIsFormOpen(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
        setFormError('');
        setIsSubmitting(false);
    };

    const openNewDrawer = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setFormError('');
        setIsFormOpen(true);
    };

    const handleEdit = (g) => {
        if (isFinalizada(g)) {
            setPageError('La atención respondida finalizó su ciclo y no permite edición.');
            return;
        }
        const toIds = (arr) => (arr || []).map((item) => (typeof item === 'object' ? item.id : item));
        setEditingId(g.id);
        setForm({
            requerimiento: g.requerimiento || '',
            descripcion: g.descripcion || '',
            subdirecciones_requeridas: toIds(g.subdirecciones_requeridas),
            departamentos_requeridos: toIds(g.departamentos_requeridos),
            unidades_requeridas: toIds(g.unidades_requeridas),
            estado: g.estado || 'PENDIENTE',
            respuesta: g.respuesta || '',
        });
        setFormError('');
        setIsFormOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setIsSubmitting(true);
        try {
            let ejecutivoId = user?.funcionario_data?.id;

            if (!ejecutivoId) {
                const asigRes = await api.get(`ejecutivos/asignaciones/?establecimiento=${id}&page_size=100`);
                const asignaciones = asigRes.data.results || asigRes.data || [];
                if (asignaciones.length > 0) {
                    ejecutivoId = asignaciones[0].funcionario;
                } else {
                    setFormError('No puedes registrar la atención: falta perfil de funcionario o ejecutivo asignado al establecimiento.');
                    return;
                }
            }

            const payload = {
                ...form,
                establecimiento: Number(id),
                ejecutivo: ejecutivoId,
            };

            if (editingId) {
                await api.put(`ejecutivos/gestiones/${editingId}/`, payload);
            } else {
                await api.post('ejecutivos/gestiones/', payload);
            }

            closeDrawer();
            fetchData();
        } catch (error) {
            console.error(error);
            const detail = error.response?.data;
            const msg = typeof detail === 'string'
                ? detail
                : detail
                    ? Object.entries(detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' · ')
                    : error.message;
            setFormError(`Error al guardar: ${msg}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (gestion) => {
        if (isFinalizada(gestion)) {
            setPageError('La atención respondida finalizó su ciclo y no permite eliminación.');
            return;
        }
        setConfirmDeleteId(gestion.id);
    };

    const confirmDelete = async () => {
        if (!confirmDeleteId) return;
        setPageError('');
        try {
            await api.delete(`ejecutivos/gestiones/${confirmDeleteId}/`);
            setConfirmDeleteId(null);
            fetchData();
        } catch (error) {
            console.error(error);
            setPageError(`Error al eliminar: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
        }
    };

    const handleStatusChange = async (gestion, newStatus) => {
        if (isFinalizada(gestion)) {
            setPageError('La atención respondida finalizó su ciclo y no permite cambios de estado.');
            return;
        }
        try {
            await api.patch(`ejecutivos/gestiones/${gestion.id}/`, { estado: newStatus });
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return (
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden">
            <div className="flex flex-col items-center justify-center flex-1 gap-3">
                <Loader2 className={LOADER_SPIN} />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest select-none">Cargando Datos...</span>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden">
            <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                <div className="flex items-start gap-3 min-w-0">
                    <Link
                        to="/comunicaciones/ejecutivos"
                        className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors shrink-0 mt-0.5"
                        title="Volver"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div className="min-w-0">
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase select-none line-clamp-2">
                            {establecimiento?.nombre}
                        </h2>
                        <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-1.5 ml-0 select-none">
                            Gestión de Acompañamiento y Seguimiento
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={openNewDrawer}
                    className={BTN_PRIMARY}
                >
                    <Plus className="w-4 h-4" />
                    Nueva Atención
                </button>
            </div>

            {pageError && (
                <div className="shrink-0 bg-rose-50 text-rose-600 text-[10px] font-bold uppercase p-3 rounded-xl border border-rose-100">
                    {pageError}
                </div>
            )}

            <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="overflow-auto flex-1 min-h-0 bg-white custom-scrollbar">
                    <table className="w-full text-left border-collapse border-spacing-0">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-200 shadow-sm select-none">
                                <th className="px-4 py-3 text-center align-middle border-r border-slate-100 w-12 bg-slate-50">#</th>
                                <th className="px-4 py-3 align-middle border-r border-slate-100 w-32 bg-slate-50">Fecha</th>
                                <th className="px-4 py-3 align-middle border-r border-slate-100 bg-slate-50">Requerimiento</th>
                                <th className="px-4 py-3 align-middle border-r border-slate-100 bg-slate-50">Unidad</th>
                                <th className="px-4 py-3 align-middle border-r border-slate-100 w-[30%] bg-slate-50">Respuesta / Avances</th>
                                <th className="px-4 py-3 text-center align-middle bg-slate-50">Estado / Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {gestiones.length === 0 ? (
                                <tr>
                                    <td colSpan="6">
                                        <div className="flex flex-col items-center justify-center p-12 text-center">
                                            <FolderSearch className="w-10 h-10 text-slate-200 mb-3" />
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
                                                No se encontraron registros
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ) : gestiones.map((g, idx) => (
                                <React.Fragment key={g.id}>
                                    <tr
                                        className={`transition-colors group cursor-pointer ${
                                            expandedGestion === g.id
                                                ? 'bg-blue-50/40 border-l-2 border-l-blue-500'
                                                : 'hover:bg-slate-50/50'
                                        }`}
                                        onClick={() => setExpandedGestion(expandedGestion === g.id ? null : g.id)}
                                    >
                                        <td className="px-4 py-3 align-middle border-r border-slate-50 text-center text-[11px] font-medium text-slate-400">{gestiones.length - idx}</td>
                                        <td className="px-4 py-3 align-middle border-r border-slate-50 text-[11px] font-medium text-slate-500 uppercase tracking-tighter whitespace-nowrap">
                                            {new Date(g.fecha).toLocaleDateString('es-CL')}
                                        </td>
                                        <td className="px-4 py-3 align-middle border-r border-slate-50">
                                            <span className="block text-[11px] font-medium text-slate-700 uppercase tracking-tighter line-clamp-1 leading-snug">
                                                {g.requerimiento}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 align-middle border-r border-slate-50">
                                            <div className="flex flex-wrap items-center gap-1">
                                                {g.unidades_detalles?.map(u => (
                                                    <span key={u.id} className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg border border-blue-100 uppercase tracking-tighter">
                                                        {u.nombre}
                                                    </span>
                                                ))}
                                                {(!g.unidades_detalles?.length) && (
                                                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-tighter">Gral</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-middle border-r border-slate-50">
                                            <div className="flex flex-col justify-center gap-1 min-h-0">
                                                <p className="text-[11px] font-medium text-slate-500 line-clamp-1 uppercase tracking-tighter leading-snug">{g.respuesta || 'Sin respuesta'}</p>
                                                {g.subtareas?.length > 0 && (
                                                    <div className="space-y-0.5">
                                                        {g.subtareas.slice(0, 2).map(sub => (
                                                            <div key={sub.id} className="flex items-center gap-1 text-[9px] text-slate-400 font-medium uppercase leading-snug">
                                                                <CheckCircle2 className={`w-3 h-3 flex-shrink-0 ${sub.completada ? 'text-emerald-500' : 'text-slate-300'}`} />
                                                                <span className="truncate">{sub.titulo}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-middle text-center">
                                            <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                <select
                                                    value={g.estado}
                                                    onChange={(e) => handleStatusChange(g, e.target.value)}
                                                    disabled={isFinalizada(g)}
                                                    className={`no-global text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-lg border outline-none appearance-none text-center transition-all disabled:cursor-not-allowed disabled:opacity-70 ${
                                                        g.estado === 'PENDIENTE' ? 'bg-rose-50/50 text-rose-600 border-rose-100 hover:bg-rose-50' :
                                                        g.estado === 'EN_PROCESO' ? 'bg-amber-50/50 text-amber-600 border-amber-100 hover:bg-amber-50' :
                                                        g.estado === 'RESPONDIDO' ? 'bg-blue-50/50 text-blue-600 border-blue-100 hover:bg-blue-50' :
                                                        'bg-emerald-50/50 text-emerald-600 border-emerald-100 hover:bg-emerald-50'
                                                    }`}
                                                >
                                                    <option value="PENDIENTE">Pendiente</option>
                                                    <option value="EN_PROCESO">En Proceso</option>
                                                    <option value="RESPONDIDO">Respondido</option>
                                                    <option value="CERRADO">Cerrado</option>
                                                </select>

                                                <div className="flex gap-1 ml-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEdit(g)}
                                                        disabled={isFinalizada(g)}
                                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400"
                                                        title="Editar"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(g)}
                                                        disabled={isFinalizada(g)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedGestion === g.id && (
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <td colSpan="6" className="p-0">
                                                <GestionSeguimientoPanel
                                                    gestion={g}
                                                    newPaso={newPasos[g.id] || ''}
                                                    onNewPasoChange={(value) => setNewPasos({ ...newPasos, [g.id]: value })}
                                                    onAddPaso={() => handleAddPaso(g)}
                                                    onToggleSubtarea={toggleSubtarea}
                                                    canEditPasos={canManagePasos(g)}
                                                    lockedReason={g.estado === 'CERRADO'
                                                        ? 'Atención cerrada: cambia el estado a pendiente o en proceso para agregar pasos.'
                                                        : g.estado === 'RESPONDIDO'
                                                            ? 'Atención respondida: ciclo finalizado, no permite cambios.'
                                                            : ''}
                                                />
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-200 shrink-0">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest select-none">
                        {gestiones.length} atención{gestiones.length !== 1 ? 'es' : ''} registrada{gestiones.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            <GestionAtencionDrawer
                isOpen={isFormOpen}
                onClose={closeDrawer}
                editingId={editingId}
                establecimientoNombre={establecimiento?.nombre}
                form={form}
                setForm={setForm}
                onSubmit={handleSubmit}
                subdirecciones={subdirecciones}
                departamentos={departamentos}
                unidades={unidades}
                formError={formError}
                isSubmitting={isSubmitting}
            />
            {typeof document !== 'undefined' && createPortal(
                confirmDeleteId && (
                    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 overflow-hidden">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)} />
                        <div className="relative z-10 bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full border border-slate-200">
                            <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center">
                                <div>
                                    <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Confirmación</p>
                                    <h3 className="text-sm font-bold text-slate-800 tracking-tight uppercase">Eliminar Atención</h3>
                                </div>
                            </div>
                            <div className="p-5">
                                <p className="text-xs font-medium text-slate-700 uppercase leading-relaxed">
                                    ¿Está seguro de que desea eliminar esta atención? Esta acción no se puede deshacer.
                                </p>
                            </div>
                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setConfirmDeleteId(null)} className={BTN_SECONDARY}>
                                    Cancelar
                                </button>
                                <button type="button" onClick={confirmDelete} className="bg-rose-600 hover:bg-rose-700 text-white h-10 min-h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-900/20 inline-flex items-center justify-center gap-2 shrink-0 active:scale-95 leading-none box-border">
                                    <Trash2 className="w-4 h-4" />
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                ),
                document.body
            )}
        </div>
    );
};

export default EstablecimientoGestion;
