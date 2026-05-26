import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit3, Trash2, Search, Power, X, Layers } from 'lucide-react';
import api from '../../api';
import { usePermission } from '../../hooks/usePermission';
import Pagination from '../../components/common/Pagination';
import FuncionariosPageHeader from './shared/FuncionariosPageHeader';
import { TableLoading, TableEmpty } from './shared/FuncionariosTableStates';
import {
    PAGE_LAYOUT, TABLE_PANEL, INPUT_FILTER, SELECT_FILTER, THEAD_TR, TH, TD, TD_MAIN,
    BTN_ICON_EDIT, BTN_ICON_DELETE, statusBadgeClass, countBadgeClass,
    MODAL_SHELL, MODAL_BACKDROP_LAYER, MODAL_PANEL, MODAL_HEADER, MODAL_HEADER_ICON,
    INPUT_FORM, SELECT_FORM, BTN_PRIMARY, BTN_SECONDARY,
} from './shared/funcionariosUi';

const Unidades = () => {
    const { can } = usePermission();
    const [unidades, setUnidades] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDepartamento, setFilterDepartamento] = useState('');
    const [formData, setFormData] = useState({ nombre: '', departamento: '', activo: true });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);

    useEffect(() => {
        fetchDepartamentos();
        fetchData(1);
    }, []);

    const fetchDepartamentos = async () => {
        try {
            const response = await api.get('departamentos/', { params: { nopaginate: true } });
            setDepartamentos(response.data.results || (Array.isArray(response.data) ? response.data : []));
        } catch (error) {
            console.error('Error fetching departamentos:', error);
        }
    };

    const fetchData = async (page = 1, search = searchTerm, depto = filterDepartamento, size = pageSize) => {
        setLoading(true);
        try {
            const params = { page, page_size: size };
            if (search) params.search = search;
            if (depto) params.departamento = depto;
            const response = await api.get('unidades/', { params });
            if (response.data.results) {
                setUnidades(response.data.results);
                setTotalPages(Math.ceil(response.data.count / size));
                setTotalResults(response.data.count);
            } else {
                setUnidades(response.data);
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

    const handleFilterDepto = (e) => {
        const value = e.target.value;
        setFilterDepartamento(value);
        fetchData(1, searchTerm, value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`unidades/${editingId}/`, formData);
            } else {
                await api.post('unidades/', formData);
            }
            fetchData(currentPage);
            handleCloseModal();
        } catch (error) {
            console.error('Error saving:', error);
            alert('Error al guardar');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar esta unidad?')) return;
        try {
            await api.delete(`unidades/${id}/`);
            fetchData(currentPage);
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Error al eliminar');
        }
    };

    const handleToggleActivo = async (item) => {
        if (!confirm(`¿Deseas ${item.activo ? 'desactivar' : 'activar'} esta unidad?`)) return;
        try {
            await api.patch(`unidades/${item.id}/`, { activo: !item.activo });
            fetchData(currentPage);
        } catch (error) {
            console.error('Error toggling status:', error);
        }
    };

    const handleEdit = (item) => {
        setFormData({ nombre: item.nombre, departamento: item.departamento, activo: item.activo });
        setEditingId(item.id);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingId(null);
        setFormData({ nombre: '', departamento: '', activo: true });
    };

    const openCreate = () => {
        setEditingId(null);
        setFormData({ nombre: '', departamento: '', activo: true });
        setShowModal(true);
    };

    return (
        <div className={PAGE_LAYOUT}>
            <FuncionariosPageHeader
                title="Unidades"
                titleIcon={Layers}
                subtitle={`Unidades operativas · ${totalResults} registros`}
                actionLabel="Nueva unidad"
                actionIcon={Plus}
                onAction={openCreate}
                showAction={can('funcionarios.add_unidad')}
            />

            <div className={TABLE_PANEL}>
                <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 bg-slate-50 border-b border-slate-200">
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input type="text" placeholder="Buscar..." value={searchTerm} onChange={handleSearch} className={INPUT_FILTER} />
                    </div>
                    <select value={filterDepartamento} onChange={handleFilterDepto} className={`${SELECT_FILTER} w-full sm:w-48`}>
                        <option value="">Todos los departamentos</option>
                        {departamentos.map((d) => (
                            <option key={d.id} value={d.id}>{d.nombre}</option>
                        ))}
                    </select>
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            const newSize = Number(e.target.value);
                            setPageSize(newSize);
                            fetchData(1, searchTerm, filterDepartamento, newSize);
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
                    ) : unidades.length === 0 ? (
                        <TableEmpty />
                    ) : (
                        <table className="w-full text-left border-collapse border-spacing-0 min-w-[1000px]">
                            <thead className="sticky top-0 z-10">
                                <tr className={THEAD_TR}>
                                    <th className={`${TH} w-28`}>Estado</th>
                                    <th className={TH}>Nombre</th>
                                    <th className={TH}>Departamento</th>
                                    <th className={TH}>Subdirección</th>
                                    <th className={`${TH} text-center w-24`}>Personal</th>
                                    <th className={`${TH} text-center w-24 border-r-0`}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {unidades.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className={TD}>
                                            <button type="button" onClick={() => handleToggleActivo(item)} className={statusBadgeClass(item.activo)}>
                                                <Power className="w-3 h-3 shrink-0" />
                                                {item.activo ? 'Activo' : 'Inactivo'}
                                            </button>
                                        </td>
                                        <td className={TD_MAIN}><span className="line-clamp-2 block">{item.nombre}</span></td>
                                        <td className={TD}><span className="line-clamp-2 block">{item.departamento_nombre || '—'}</span></td>
                                        <td className={TD}><span className="line-clamp-2 block">{item.subdireccion_nombre || '—'}</span></td>
                                        <td className={`${TD} text-center`}><span className={countBadgeClass}>{item.total_funcionarios || 0}</span></td>
                                        <td className="px-4 py-3 align-middle text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {can('funcionarios.change_unidad') && (
                                                    <button type="button" onClick={() => handleEdit(item)} className={BTN_ICON_EDIT} title="Editar">
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                {can('funcionarios.delete_unidad') && (
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
                            Mostrando {unidades.length} de {totalResults}
                        </span>
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => fetchData(page)} totalCount={totalResults} />
                    </div>
                )}
            </div>

            {showModal && createPortal(
                <div className={MODAL_SHELL}>
                    <div className={MODAL_BACKDROP_LAYER} onClick={handleCloseModal} aria-hidden />
                    <div className={MODAL_PANEL} onClick={(e) => e.stopPropagation()}>
                        <div className={MODAL_HEADER}>
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className={MODAL_HEADER_ICON}>
                                    <Layers className="w-4 h-4" />
                                </div>
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {editingId ? 'Editar unidad' : 'Nueva unidad'}
                                </h3>
                            </div>
                            <button type="button" onClick={handleCloseModal} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors shrink-0">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Departamento</label>
                                <select
                                    value={formData.departamento}
                                    onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                                    className={SELECT_FORM}
                                    required
                                >
                                    <option value="">Seleccionar...</option>
                                    {departamentos.map((d) => (
                                        <option key={d.id} value={d.id}>{d.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nombre</label>
                                <input type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className={INPUT_FORM} required />
                            </div>
                            <div className="flex gap-2 pt-2">
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

export default Unidades;
