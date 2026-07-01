import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit3, Trash2, Search, Power, X, Users } from 'lucide-react';
import api from '../../api';
import { usePermission } from '../../hooks/usePermission';
import Pagination from '../../components/common/Pagination';
import FuncionariosPageHeader from './shared/FuncionariosPageHeader';
import { TableLoading, TableEmpty } from './shared/FuncionariosTableStates';
import {
    PAGE_LAYOUT, TABLE_PANEL, INPUT_FILTER, SELECT_FILTER, THEAD_TR, TH, TD, TD_MAIN,
    BTN_ICON_EDIT, BTN_ICON_DELETE, statusBadgeClass, countBadgeClass,
    MODAL_SHELL, MODAL_BACKDROP_LAYER, MODAL_PANEL_LG, MODAL_HEADER, MODAL_HEADER_ICON,
    INPUT_FORM, TEXTAREA_FORM, SELECT_FORM, BTN_PRIMARY, BTN_SECONDARY,
    MEMBER_ROW_SELECTED, MEMBER_ROW, CHECKBOX_FORM,
} from './shared/funcionariosUi';

const Grupos = () => {
    const { can } = usePermission();
    const [grupos, setGrupos] = useState([]);
    const [funcionarios, setFuncionarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        jefe: '',
        activo: true,
        funcionarios: [],
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);

    useEffect(() => {
        fetchFuncionarios();
        fetchData(1);
    }, []);

    const fetchFuncionarios = async () => {
        try {
            const response = await api.get('funcionarios/', { params: { nopaginate: true } });
            setFuncionarios(response.data.results || (Array.isArray(response.data) ? response.data : []));
        } catch (error) {
            console.error('Error fetching funcionarios:', error);
            setFuncionarios([]);
        }
    };

    const fetchData = async (page = 1, search = searchTerm, size = pageSize) => {
        setLoading(true);
        try {
            const params = { page, page_size: size };
            if (search) params.search = search;
            const response = await api.get('grupos/', { params });
            if (response.data.results) {
                setGrupos(response.data.results);
                setTotalPages(Math.ceil(response.data.count / size));
                setTotalResults(response.data.count);
            } else {
                setGrupos(response.data);
                setTotalPages(1);
                setTotalResults(response.data.length);
            }
            setCurrentPage(page);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        fetchData(1, value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`grupos/${editingId}/`, formData);
            } else {
                await api.post('grupos/', formData);
            }
            fetchData(currentPage);
            handleCloseModal();
        } catch (error) {
            console.error('Error saving:', error);
            alert('Error al guardar el grupo');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este grupo?')) return;
        try {
            await api.delete(`grupos/${id}/`);
            fetchData(currentPage);
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Error al eliminar el grupo');
        }
    };

    const handleToggleActivo = async (item) => {
        if (!confirm(`¿Deseas ${item.activo ? 'desactivar' : 'activar'} este grupo?`)) return;
        try {
            await api.patch(`grupos/${item.id}/`, { activo: !item.activo });
            fetchData(currentPage);
        } catch (error) {
            console.error('Error toggling status:', error);
        }
    };

    const handleEdit = (item) => {
        setFormData({
            nombre: item.nombre,
            descripcion: item.descripcion || '',
            jefe: item.jefe || '',
            activo: item.activo,
            funcionarios: item.funcionarios || [],
        });
        setEditingId(item.id);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingId(null);
        setFormData({ nombre: '', descripcion: '', jefe: '', activo: true, funcionarios: [] });
    };

    const openCreate = () => {
        setEditingId(null);
        setFormData({ nombre: '', descripcion: '', jefe: '', activo: true, funcionarios: [] });
        setShowModal(true);
    };

    const toggleMiembro = (id, checked) => {
        const newIds = checked
            ? [...formData.funcionarios, id]
            : formData.funcionarios.filter((fid) => fid !== id);
        const jefe = newIds.includes(formData.jefe) ? formData.jefe : '';
        setFormData({ ...formData, funcionarios: newIds, jefe });
    };

    return (
        <div className={PAGE_LAYOUT}>
            <FuncionariosPageHeader
                title="Grupos"
                titleIcon={Users}
                subtitle={`Equipos de trabajo · ${totalResults} registros`}
                actionLabel="Nuevo grupo"
                actionIcon={Plus}
                onAction={openCreate}
                showAction={can('funcionarios.add_grupo')}
            />

            <div className={TABLE_PANEL}>
                <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 bg-slate-50 border-b border-slate-200">
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input type="text" placeholder="Buscar..." value={searchTerm} onChange={handleSearch} className={INPUT_FILTER} />
                    </div>
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            const newSize = Number(e.target.value);
                            setPageSize(newSize);
                            fetchData(1, searchTerm, newSize);
                        }}
                        className={`${SELECT_FILTER} w-20 shrink-0`}
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>

                <div className="overflow-auto flex-1 bg-white custom-scrollbar">
                    {loading ? (
                        <TableLoading />
                    ) : grupos.length === 0 ? (
                        <TableEmpty />
                    ) : (
                        <table className="w-full text-left border-collapse border-spacing-0 min-w-[950px]">
                            <thead className="sticky top-0 z-10">
                                <tr className={THEAD_TR}>
                                    <th className={`${TH} w-28`}>Estado</th>
                                    <th className={TH}>Grupo</th>
                                    <th className={TH}>Descripción</th>
                                    <th className={`${TH} text-center w-24`}>Miembros</th>
                                    <th className={TH}>Jefe / líder</th>
                                    <th className={`${TH} text-center w-24 border-r-0`}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {grupos.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className={TD}>
                                            <button type="button" onClick={() => handleToggleActivo(item)} className={statusBadgeClass(item.activo)}>
                                                <Power className="w-3 h-3 shrink-0" />
                                                {item.activo ? 'Activo' : 'Inactivo'}
                                            </button>
                                        </td>
                                        <td className={TD_MAIN}><span className="line-clamp-2 block">{item.nombre}</span></td>
                                        <td className={TD}><span className="line-clamp-2 block">{item.descripcion || '—'}</span></td>
                                        <td className={`${TD} text-center`}>
                                            <span className={countBadgeClass}>{item.total_miembros || 0}</span>
                                        </td>
                                        <td className={TD}>
                                            <span className="line-clamp-2 block">{item.jefe_nombre || 'Sin asignar'}</span>
                                        </td>
                                        <td className="px-4 py-3 align-middle text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {can('funcionarios.change_grupo') && (
                                                    <button type="button" onClick={() => handleEdit(item)} className={BTN_ICON_EDIT} title="Editar">
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                {can('funcionarios.delete_grupo') && (
                                                    <button type="button" onClick={() => handleDelete(item.id)} className={BTN_ICON_DELETE} title="Eliminar">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {!loading && (
                    <div className="p-3 bg-slate-50 border-t border-slate-200 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            Mostrando {grupos.length} de {totalResults}
                        </span>
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => fetchData(page)} totalCount={totalResults} />
                    </div>
                )}
            </div>

            {showModal && createPortal(
                <div className={MODAL_SHELL}>
                    <div className={MODAL_BACKDROP_LAYER} onClick={handleCloseModal} aria-hidden />
                    <div className={MODAL_PANEL_LG} onClick={(e) => e.stopPropagation()}>
                        <div className={MODAL_HEADER}>
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className={MODAL_HEADER_ICON}>
                                    <Users className="w-4 h-4" />
                                </div>
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {editingId ? 'Editar grupo' : 'Nuevo grupo'}
                                </h3>
                            </div>
                            <button type="button" onClick={handleCloseModal} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors shrink-0">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                            <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nombre</label>
                                    <input type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className={INPUT_FORM} required />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Descripción</label>
                                    <textarea
                                        value={formData.descripcion}
                                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                        className={`${TEXTAREA_FORM} h-20`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                                        Miembros ({formData.funcionarios.length})
                                    </label>
                                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-2 max-h-40 overflow-y-auto custom-scrollbar space-y-1">
                                        {funcionarios.map((func) => {
                                            const selected = formData.funcionarios.includes(func.id);
                                            return (
                                                <label
                                                    key={func.id}
                                                    className={selected ? MEMBER_ROW_SELECTED : MEMBER_ROW}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selected}
                                                        onChange={(e) => toggleMiembro(func.id, e.target.checked)}
                                                        className={CHECKBOX_FORM}
                                                    />
                                                    <span className="text-[10px] font-medium text-slate-700 uppercase tracking-tighter">{func.nombre_funcionario}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                                {formData.funcionarios.length > 0 && (
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Jefe de grupo</label>
                                        <select
                                            value={formData.jefe}
                                            onChange={(e) => setFormData({ ...formData, jefe: e.target.value })}
                                            className={SELECT_FORM}
                                        >
                                            <option value="">Seleccionar...</option>
                                            {formData.funcionarios.map((fid) => {
                                                const f = funcionarios.find((func) => func.id === fid);
                                                return f ? <option key={fid} value={fid}>{f.nombre_funcionario}</option> : null;
                                            })}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className="p-4 border-t border-slate-100 flex gap-2 shrink-0">
                                <button type="button" onClick={handleCloseModal} className={`${BTN_SECONDARY} flex-1`}>Cancelar</button>
                                <button type="submit" className={`${BTN_PRIMARY} flex-1`}>Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Grupos;
