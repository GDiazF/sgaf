import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit3, Trash2, Search, Power, X, Building2 } from 'lucide-react';
import api from '../../api';
import { usePermission } from '../../hooks/usePermission';
import Pagination from '../../components/common/Pagination';
import FuncionariosPageHeader from './shared/FuncionariosPageHeader';
import { TableLoading, TableEmpty } from './shared/FuncionariosTableStates';
import {
    PAGE_LAYOUT, TABLE_PANEL, INPUT_FILTER, SELECT_FILTER, THEAD_TR, TH, TD, TD_MAIN,
    BTN_ICON_EDIT, BTN_ICON_DELETE, statusBadgeClass, countBadgeClass,
    MODAL_SHELL, MODAL_BACKDROP_LAYER, MODAL_PANEL, MODAL_HEADER, MODAL_HEADER_ICON,
    INPUT_FORM, BTN_PRIMARY, BTN_SECONDARY,
} from './shared/funcionariosUi';

const Subdirecciones = () => {
    const { can } = usePermission();
    const [subdirecciones, setSubdirecciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({ nombre: '', piso: 1, activo: true });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);

    const fetchSubdirecciones = async (page = 1, search = searchTerm, size = pageSize) => {
        setLoading(true);
        try {
            const response = await api.get('subdirecciones/', {
                params: { page, search, page_size: size, ordering: 'nombre' },
            });
            if (response.data.results) {
                setSubdirecciones(response.data.results);
                setTotalPages(Math.ceil(response.data.count / size));
                setTotalResults(response.data.count);
            } else {
                setSubdirecciones(response.data);
                setTotalPages(1);
                setTotalResults(response.data.length);
            }
            setCurrentPage(page);
        } catch (error) {
            console.error('Error fetching subdirecciones:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubdirecciones(1);
    }, []);

    const handleSearch = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        fetchSubdirecciones(1, value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`subdirecciones/${editingId}/`, formData);
            } else {
                await api.post('subdirecciones/', formData);
            }
            fetchSubdirecciones(currentPage);
            handleCloseModal();
        } catch (error) {
            console.error('Error saving:', error);
            alert('Error al guardar');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar esta subdirección?')) return;
        try {
            await api.delete(`subdirecciones/${id}/`);
            fetchSubdirecciones(currentPage);
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Error al eliminar');
        }
    };

    const handleToggleActivo = async (item) => {
        const accion = item.activo ? 'desactivar' : 'activar';
        if (!confirm(`¿Deseas ${accion} esta subdirección?`)) return;
        try {
            await api.patch(`subdirecciones/${item.id}/`, { activo: !item.activo });
            fetchSubdirecciones(currentPage);
        } catch (error) {
            console.error('Error toggling status:', error);
        }
    };

    const handleEdit = (item) => {
        setFormData({ nombre: item.nombre, piso: item.piso, activo: item.activo });
        setEditingId(item.id);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingId(null);
        setFormData({ nombre: '', piso: 1, activo: true });
    };

    const openCreate = () => {
        setEditingId(null);
        setFormData({ nombre: '', piso: 1, activo: true });
        setShowModal(true);
    };

    return (
        <div className={PAGE_LAYOUT}>
            <FuncionariosPageHeader
                title="Subdirecciones"
                titleIcon={Building2}
                subtitle={`Estructura organizacional · ${totalResults} registros`}
                actionLabel="Nueva subdirección"
                actionIcon={Plus}
                onAction={openCreate}
                showAction={can('funcionarios.add_subdireccion')}
            />

            <div className={TABLE_PANEL}>
                <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 bg-slate-50 border-b border-slate-200">
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={handleSearch}
                            className={INPUT_FILTER}
                        />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hidden sm:inline">Mostrar</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                const newSize = Number(e.target.value);
                                setPageSize(newSize);
                                fetchSubdirecciones(1, searchTerm, newSize);
                            }}
                            className={`${SELECT_FILTER} w-20`}
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-auto flex-1 bg-white custom-scrollbar">
                    {loading ? (
                        <TableLoading />
                    ) : subdirecciones.length === 0 ? (
                        <TableEmpty />
                    ) : (
                        <table className="w-full text-left border-collapse border-spacing-0 min-w-[800px]">
                            <thead className="sticky top-0 z-10">
                                <tr className={THEAD_TR}>
                                    <th className={`${TH} w-28`}>Estado</th>
                                    <th className={TH}>Nombre</th>
                                    <th className={`${TH} text-center w-20`}>Piso</th>
                                    <th className={`${TH} text-center w-28`}>Deptos.</th>
                                    <th className={`${TH} text-center w-28`}>Personal</th>
                                    <th className={`${TH} text-center w-24 border-r-0`}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {subdirecciones.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className={TD}>
                                            <button type="button" onClick={() => handleToggleActivo(item)} className={statusBadgeClass(item.activo)}>
                                                <Power className="w-3 h-3 shrink-0" />
                                                {item.activo ? 'Activo' : 'Inactivo'}
                                            </button>
                                        </td>
                                        <td className={TD_MAIN}>
                                            <span className="line-clamp-2 block">{item.nombre}</span>
                                        </td>
                                        <td className={`${TD} text-center`}>{item.piso}</td>
                                        <td className={`${TD} text-center`}>
                                            <span className={countBadgeClass}>{item.total_departamentos || 0}</span>
                                        </td>
                                        <td className={`${TD} text-center`}>
                                            <span className={countBadgeClass}>{item.total_funcionarios || 0}</span>
                                        </td>
                                        <td className="px-4 py-3 align-middle text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {can('funcionarios.change_subdireccion') && (
                                                    <button type="button" onClick={() => handleEdit(item)} className={BTN_ICON_EDIT} title="Editar">
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                {can('funcionarios.delete_subdireccion') && (
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
                            Mostrando {subdirecciones.length} de {totalResults}
                        </span>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={(page) => fetchSubdirecciones(page)}
                            totalCount={totalResults}
                        />
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
                                    <Building2 className="w-4 h-4" />
                                </div>
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {editingId ? 'Editar subdirección' : 'Nueva subdirección'}
                                </h3>
                            </div>
                            <button type="button" onClick={handleCloseModal} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors shrink-0">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nombre</label>
                                <input
                                    type="text"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    className={INPUT_FORM}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Piso</label>
                                <input
                                    type="number"
                                    value={formData.piso}
                                    onChange={(e) => setFormData({ ...formData, piso: parseInt(e.target.value, 10) || 1 })}
                                    className={INPUT_FORM}
                                    min="1"
                                    required
                                />
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

export default Subdirecciones;
