import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Search, Plus, Download, Eye, Trash2, FilePlus, Edit3, X, Loader2, FilterX, FileStack,
} from 'lucide-react';
import api from '../../api';
import { usePermission as usePerm } from '../../hooks/usePermission';
import { TableLoading, TableEmpty } from '../funcionarios/shared/FuncionariosTableStates';
import {
    PAGE_LAYOUT, TABLE_PANEL, INPUT_FILTER, SELECT_FILTER, THEAD_TR, TH, TD, TD_MAIN,
    BTN_PRIMARY, BTN_SECONDARY, BTN_ICON_EDIT, BTN_ICON_DELETE, statusBadgeClass,
    MODAL_SHELL, MODAL_BACKDROP_LAYER, MODAL_PANEL_LG, MODAL_HEADER, MODAL_HEADER_ICON,
    INPUT_FORM, SELECT_FORM,
} from '../funcionarios/shared/funcionariosUi';
import {
    TITLE_ICON_BOX, TYPE_BADGE, FILTER_CHIP_ACTIVE, FILTER_CHIP, FILE_INPUT, CHECKBOX_FORM, CARD_HOVER,
} from './procedimientosUi';

const EMPTY_FORM = {
    titulo: '',
    descripcion: '',
    tipo: '',
    subdireccion: '',
    departamento: '',
    unidad: '',
    archivo: null,
    activo: true,
};

const CELL_TEXT = 'text-[11px] font-medium text-slate-600 normal-case leading-snug';
const CELL_TITLE = 'text-[11px] font-medium text-slate-800 normal-case leading-snug';

const DocActions = ({ doc, canChange, canDelete, onView, onEdit, onDelete, getFileUrl }) => (
    <div className="flex items-center gap-1 shrink-0">
        <button
            type="button"
            onClick={onView}
            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
            title="Ver"
        >
            <Eye className="w-3.5 h-3.5" />
        </button>
        <a
            href={getFileUrl(doc.archivo)}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors inline-flex"
            title="Descargar"
        >
            <Download className="w-3.5 h-3.5" />
        </a>
        {canChange && (
            <button type="button" onClick={onEdit} className={BTN_ICON_EDIT} title="Editar">
                <Edit3 className="w-3.5 h-3.5" />
            </button>
        )}
        {canDelete && (
            <button type="button" onClick={onDelete} className={BTN_ICON_DELETE} title="Eliminar">
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        )}
    </div>
);

const ProcedureMobileCard = ({ doc, canChange, canDelete, onView, onEdit, onDelete, getFileUrl }) => (
    <div className={`bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3 transition-all ${CARD_HOVER}`}>
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`${statusBadgeClass(doc.activo)} normal-case`}>{doc.activo ? 'Activo' : 'Borrador'}</span>
                    {doc.tipo_data?.nombre && (
                        <span className={TYPE_BADGE}>{doc.tipo_data.nombre}</span>
                    )}
                </div>
                <p className={`${CELL_TITLE} line-clamp-2`}>{doc.titulo}</p>
            </div>
            <DocActions
                doc={doc}
                canChange={canChange}
                canDelete={canDelete}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
                getFileUrl={getFileUrl}
            />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Subdirección</p>
                <p className={CELL_TEXT}>{doc.subdireccion_nombre || '—'}</p>
            </div>
            <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Departamento</p>
                <p className={CELL_TEXT}>{doc.departamento_nombre || '—'}</p>
            </div>
            <div className="sm:col-span-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Fecha</p>
                <p className={CELL_TEXT}>{new Date(doc.created_at).toLocaleDateString('es-CL')}</p>
            </div>
        </div>
    </div>
);

const ProceduresDashboard = () => {
    const { can } = usePerm();
    const canAdd = can('procedimientos.add_procedimiento');
    const canDelete = can('procedimientos.delete_procedimiento');
    const canChange = can('procedimientos.change_procedimiento');

    const [procedures, setProcedures] = useState([]);
    const [types, setTypes] = useState([]);
    const [subdirecciones, setSubdirecciones] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [unidades, setUnidades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterSubdireccion, setFilterSubdireccion] = useState('');
    const [filterDepartamento, setFilterDepartamento] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [formError, setFormError] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const ts = Date.now();
            const [procRes, typeRes, subRes, depRes, uniRes] = await Promise.all([
                api.get(`procedimientos/procedimientos/?_ts=${ts}`),
                api.get(`procedimientos/tipos/?_ts=${ts}`),
                api.get(`subdirecciones/?_ts=${ts}`),
                api.get(`departamentos/?_ts=${ts}`),
                api.get(`unidades/?_ts=${ts}`),
            ]);
            setProcedures(procRes.data.results || procRes.data || []);
            setTypes(typeRes.data.results || typeRes.data || []);
            setSubdirecciones(subRes.data.results || subRes.data || []);
            setDepartamentos(depRes.data.results || depRes.data || []);
            setUnidades(uniRes.data.results || uniRes.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredDeps = departamentos.filter(
        (d) => !formData.subdireccion || String(d.subdireccion) === String(formData.subdireccion)
    );
    const filteredUnis = unidades.filter(
        (u) => !formData.departamento || String(u.departamento) === String(formData.departamento)
    );
    const filterDeps = departamentos.filter(
        (d) => !filterSubdireccion || String(d.subdireccion) === String(filterSubdireccion)
    );

    const filteredProcedures = procedures.filter((p) => {
        const matchesSearch =
            (p.titulo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = !filterType || String(p.tipo) === String(filterType);
        const matchesSub = !filterSubdireccion || String(p.subdireccion) === String(filterSubdireccion);
        const matchesDep = !filterDepartamento || String(p.departamento) === String(filterDepartamento);
        let matchesStatus = true;
        if (filterStatus === 'active') matchesStatus = p.activo === true;
        if (filterStatus === 'inactive') matchesStatus = p.activo === false;
        return matchesSearch && matchesType && matchesSub && matchesDep && matchesStatus;
    });

    const clearFilters = () => {
        setFilterType('');
        setFilterStatus('all');
        setFilterSubdireccion('');
        setFilterDepartamento('');
        setSearchTerm('');
    };

    const openCreate = () => {
        setEditingId(null);
        setFormData(EMPTY_FORM);
        setFormError('');
        setIsModalOpen(true);
    };

    const handleEdit = (doc) => {
        setFormData({
            titulo: doc.titulo,
            descripcion: doc.descripcion || '',
            tipo: doc.tipo,
            subdireccion: doc.subdireccion || '',
            departamento: doc.departamento || '',
            unidad: doc.unidad || '',
            archivo: null,
            activo: doc.activo,
        });
        setEditingId(doc.id);
        setFormError('');
        setIsModalOpen(true);
    };

    const closeFormModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData(EMPTY_FORM);
        setFormError('');
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!editingId && !formData.archivo) {
            setFormError('Debes seleccionar un archivo.');
            return;
        }
        if (!formData.tipo) {
            setFormError('Debes seleccionar un tipo de documento.');
            return;
        }

        setSubmitting(true);
        const data = new FormData();
        Object.keys(formData).forEach((key) => {
            if (formData[key] !== null && formData[key] !== '') data.append(key, formData[key]);
        });

        try {
            if (editingId) {
                await api.patch(`procedimientos/procedimientos/${editingId}/`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                await api.post('procedimientos/procedimientos/', data, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }
            closeFormModal();
            await fetchData();
        } catch (error) {
            console.error('Error saving:', error);
            setFormError('Error al guardar el documento. Revisa los campos.');
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

    const getFileUrl = (url) => {
        if (!url) return '';
        return url.replace(/^https?:\/\/[^/]+/, '');
    };

    const docHandlers = (doc) => ({
        onView: () => { setSelectedDoc(doc); setIsViewerOpen(true); },
        onEdit: () => handleEdit(doc),
        onDelete: () => handleDelete(doc.id),
    });

    return (
        <div className={PAGE_LAYOUT}>
            <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className={TITLE_ICON_BOX}>
                        <FileStack className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase select-none">
                            Gestor de Documentos
                        </h2>
                        <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-1.5">
                            Procedimientos e instructivos institucionales
                        </p>
                    </div>
                </div>
                {canAdd && (
                    <button type="button" onClick={openCreate} className={BTN_PRIMARY}>
                        <Plus className="w-4 h-4 shrink-0" />
                        Nuevo documento
                    </button>
                )}
            </div>

            <div className={TABLE_PANEL}>
                <div className="shrink-0 flex flex-col gap-3 p-3 bg-slate-50 border-b border-slate-200">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
                        <div className="relative flex-1 min-w-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Buscar por título o descripción..."
                                className={INPUT_FILTER}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className={`${SELECT_FILTER} w-full lg:w-44`}
                        >
                            <option value="">Todos los tipos</option>
                            {types.map((t) => (
                                <option key={t.id} value={t.id}>{t.nombre}</option>
                            ))}
                        </select>
                        <select
                            value={filterSubdireccion}
                            onChange={(e) => {
                                setFilterSubdireccion(e.target.value);
                                setFilterDepartamento('');
                            }}
                            className={`${SELECT_FILTER} w-full lg:w-48`}
                        >
                            <option value="">Todas las subdirecciones</option>
                            {subdirecciones.map((s) => (
                                <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                        </select>
                        <select
                            value={filterDepartamento}
                            onChange={(e) => setFilterDepartamento(e.target.value)}
                            disabled={!filterSubdireccion}
                            className={`${SELECT_FILTER} w-full lg:w-48 disabled:opacity-50`}
                        >
                            <option value="">Todos los departamentos</option>
                            {filterDeps.map((d) => (
                                <option key={d.id} value={d.id}>{d.nombre}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0 self-center"
                            title="Limpiar filtros"
                        >
                            <FilterX className="w-4 h-4" />
                        </button>
                    </div>
                    {(canChange || canAdd) && (
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'all', label: 'Todos' },
                                { id: 'active', label: 'Activos' },
                                { id: 'inactive', label: 'Borrador' },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setFilterStatus(opt.id)}
                                    className={`h-9 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                        filterStatus === opt.id ? FILTER_CHIP_ACTIVE : FILTER_CHIP
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="overflow-auto flex-1 bg-white custom-scrollbar">
                    {loading ? (
                        <TableLoading />
                    ) : filteredProcedures.length === 0 ? (
                        <TableEmpty />
                    ) : (
                        <>
                            {/* Móvil y tablet: tarjetas */}
                            <div className="lg:hidden p-3 flex flex-col gap-3">
                                {filteredProcedures.map((doc) => {
                                    const h = docHandlers(doc);
                                    return (
                                        <ProcedureMobileCard
                                            key={doc.id}
                                            doc={doc}
                                            canChange={canChange}
                                            canDelete={canDelete}
                                            getFileUrl={getFileUrl}
                                            {...h}
                                        />
                                    );
                                })}
                            </div>

                            {/* Escritorio: tabla */}
                            <table className="hidden lg:table w-full text-left border-collapse border-spacing-0 min-w-[960px]">
                                <thead className="sticky top-0 z-10">
                                    <tr className={THEAD_TR}>
                                        <th className={`${TH} w-24 whitespace-nowrap`}>Estado</th>
                                        <th className={TH}>Título</th>
                                        <th className={`${TH} whitespace-nowrap`}>Tipo</th>
                                        <th className={TH}>Subdirección</th>
                                        <th className={TH}>Departamento</th>
                                        <th className={`${TH} w-28 whitespace-nowrap`}>Fecha</th>
                                        <th className={`${TH} text-center w-32 border-r-0 whitespace-nowrap`}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredProcedures.map((doc) => {
                                        const h = docHandlers(doc);
                                        return (
                                            <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className={`${TD} whitespace-nowrap`}>
                                                    <span className={`${statusBadgeClass(doc.activo)} normal-case`}>
                                                        {doc.activo ? 'Activo' : 'Borrador'}
                                                    </span>
                                                </td>
                                                <td className={TD_MAIN}>
                                                    <span className={`${CELL_TITLE} line-clamp-2 block`}>{doc.titulo}</span>
                                                </td>
                                                <td className={`${TD} whitespace-nowrap`}>
                                                    {doc.tipo_data?.nombre ? (
                                                        <span className={TYPE_BADGE}>{doc.tipo_data.nombre}</span>
                                                    ) : (
                                                        <span className={CELL_TEXT}>—</span>
                                                    )}
                                                </td>
                                                <td className={TD_MAIN}>
                                                    <span className={`${CELL_TEXT} line-clamp-2 block`}>{doc.subdireccion_nombre || '—'}</span>
                                                </td>
                                                <td className={TD_MAIN}>
                                                    <span className={`${CELL_TEXT} line-clamp-2 block`}>{doc.departamento_nombre || '—'}</span>
                                                </td>
                                                <td className={`${TD} whitespace-nowrap`}>
                                                    <span className={CELL_TEXT}>
                                                        {new Date(doc.created_at).toLocaleDateString('es-CL')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 align-middle text-center whitespace-nowrap">
                                                    <DocActions
                                                        doc={doc}
                                                        canChange={canChange}
                                                        canDelete={canDelete}
                                                        getFileUrl={getFileUrl}
                                                        {...h}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </>
                    )}
                </div>

                {!loading && (
                    <div className="p-3 bg-slate-50 border-t border-slate-200 shrink-0">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            Mostrando {filteredProcedures.length} de {procedures.length} documento{procedures.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                )}
            </div>

            {isModalOpen && createPortal(
                <div className={MODAL_SHELL}>
                    <div className={MODAL_BACKDROP_LAYER} onClick={closeFormModal} aria-hidden />
                    <div className={`${MODAL_PANEL_LG} max-w-3xl`} onClick={(e) => e.stopPropagation()}>
                        <div className={MODAL_HEADER}>
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className={MODAL_HEADER_ICON}>
                                    <FileStack className="w-4 h-4" />
                                </div>
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {editingId ? 'Editar documento' : 'Nuevo procedimiento'}
                                </h3>
                            </div>
                            <button type="button" onClick={closeFormModal} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors shrink-0">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleFileUpload} className="flex flex-col flex-1 min-h-0">
                            <div className="p-4 md:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                                {formError && (
                                    <div className="bg-rose-50 text-rose-600 text-[10px] font-bold uppercase p-3 rounded-xl border border-rose-100">
                                        {formError}
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                    <div className="md:col-span-8">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Título</label>
                                        <input
                                            required
                                            type="text"
                                            className={INPUT_FORM}
                                            placeholder="Ej: Manual de operaciones"
                                            value={formData.titulo}
                                            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                                        />
                                    </div>
                                    <div className="md:col-span-4">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Tipo</label>
                                        <select
                                            required
                                            className={SELECT_FORM}
                                            value={formData.tipo}
                                            onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                                        >
                                            <option value="">Seleccionar...</option>
                                            {types.map((t) => (
                                                <option key={t.id} value={t.id}>{t.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="md:col-span-12">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Descripción</label>
                                        <input
                                            type="text"
                                            className={INPUT_FORM}
                                            placeholder="Resumen del contenido..."
                                            value={formData.descripcion}
                                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                        />
                                    </div>
                                    <div className="md:col-span-4">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Subdirección</label>
                                        <select
                                            className={SELECT_FORM}
                                            value={formData.subdireccion}
                                            onChange={(e) => setFormData({ ...formData, subdireccion: e.target.value, departamento: '', unidad: '' })}
                                        >
                                            <option value="">General</option>
                                            {subdirecciones.map((s) => (
                                                <option key={s.id} value={s.id}>{s.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="md:col-span-4">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Departamento</label>
                                        <select
                                            className={SELECT_FORM}
                                            disabled={!formData.subdireccion}
                                            value={formData.departamento}
                                            onChange={(e) => setFormData({ ...formData, departamento: e.target.value, unidad: '' })}
                                        >
                                            <option value="">Cualquiera</option>
                                            {filteredDeps.map((d) => (
                                                <option key={d.id} value={d.id}>{d.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="md:col-span-4">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Unidad</label>
                                        <select
                                            className={SELECT_FORM}
                                            disabled={!formData.departamento}
                                            value={formData.unidad}
                                            onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                                        >
                                            <option value="">Cualquiera</option>
                                            {filteredUnis.map((u) => (
                                                <option key={u.id} value={u.id}>{u.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="md:col-span-6">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Archivo</label>
                                        <input
                                            required={!editingId}
                                            type="file"
                                            className={FILE_INPUT}
                                            onChange={(e) => setFormData({ ...formData, archivo: e.target.files[0] })}
                                        />
                                    </div>
                                    <div className="md:col-span-6 flex flex-col justify-end">
                                        <label className="flex items-center gap-3 h-10 px-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.activo}
                                                onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                                                className={CHECKBOX_FORM}
                                            />
                                            <span className="text-[10px] font-medium text-slate-600 uppercase tracking-tighter">
                                                Documento público (activo)
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 border-t border-slate-100 flex gap-2 shrink-0">
                                <button type="button" onClick={closeFormModal} className={`${BTN_SECONDARY} flex-1`}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={submitting} className={`${BTN_PRIMARY} flex-1`}>
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Plus className="w-4 h-4 shrink-0" />}
                                    {submitting ? 'Guardando...' : editingId ? 'Actualizar' : 'Publicar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {isViewerOpen && selectedDoc && createPortal(
                <div className={`${MODAL_SHELL} !items-stretch !p-0`}>
                    <div className={MODAL_BACKDROP_LAYER} onClick={() => setIsViewerOpen(false)} aria-hidden />
                    <div className="relative z-10 flex flex-col flex-1 min-h-0 w-full max-h-[100vh] bg-white md:max-w-[calc(100vw-2rem)] md:max-h-[90vh] md:mx-auto md:my-4 md:rounded-2xl md:border md:border-slate-200 md:shadow-2xl md:overflow-hidden">
                    <div className="shrink-0 bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[11px] font-medium text-slate-700 uppercase tracking-tighter line-clamp-1">
                                {selectedDoc.titulo}
                            </p>
                            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter">
                                {selectedDoc.subdireccion_nombre || 'General'}
                                {selectedDoc.departamento_nombre ? ` · ${selectedDoc.departamento_nombre}` : ''}
                            </p>
                            {selectedDoc.descripcion && (
                                <p className="text-[10px] font-medium text-slate-400 normal-case tracking-tight mt-1 line-clamp-2">
                                    {selectedDoc.descripcion}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <a
                                href={getFileUrl(selectedDoc.archivo)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={BTN_SECONDARY}
                            >
                                <Eye className="w-4 h-4" />
                                Abrir
                            </a>
                            <button type="button" onClick={() => setIsViewerOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 min-h-0 bg-white hidden md:block">
                        <iframe
                            src={getFileUrl(selectedDoc.archivo)}
                            className="w-full h-full border-none"
                            title={selectedDoc.titulo}
                        />
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center md:hidden bg-white">
                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mb-4">
                            Vista previa disponible en escritorio o abrir en nueva pestaña
                        </p>
                        <a
                            href={getFileUrl(selectedDoc.archivo)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={BTN_PRIMARY}
                        >
                            <Eye className="w-4 h-4" />
                            Abrir documento
                        </a>
                    </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ProceduresDashboard;
