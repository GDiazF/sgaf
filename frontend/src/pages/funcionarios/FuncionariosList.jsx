import React, { useState, useEffect } from 'react';
import { Edit3, Power, Search, Plus, Trash2, Users } from 'lucide-react';
import api from '../../api';
import { usePermission } from '../../hooks/usePermission';
import FuncionarioModal from '../../components/funcionarios/FuncionarioModal';
import Pagination from '../../components/common/Pagination';
import FuncionariosPageHeader from './shared/FuncionariosPageHeader';
import { TableLoading, TableEmpty } from './shared/FuncionariosTableStates';
import {
    PAGE_LAYOUT, TABLE_PANEL, INPUT_FILTER, SELECT_FILTER, THEAD_TR, TH, TD, TD_MAIN,
    BTN_ICON_EDIT, BTN_ICON_DELETE, statusBadgeClass,
} from './shared/funcionariosUi';

const FuncionariosList = () => {
    const { can } = usePermission();
    const [funcionarios, setFuncionarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterEstado, setFilterEstado] = useState('all');
    const [filterSubdireccion, setFilterSubdireccion] = useState('');
    const [subdirecciones, setSubdirecciones] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    useEffect(() => {
        fetchSubdirecciones();
        fetchData(1);
    }, []);

    const fetchSubdirecciones = async () => {
        try {
            const response = await api.get('subdirecciones/', { params: { nopaginate: true } });
            setSubdirecciones(Array.isArray(response.data) ? response.data : (response.data.results || []));
        } catch (error) {
            console.error('Error fetching subdirecciones:', error);
        }
    };

    const fetchData = async (page = 1, search = searchTerm, estado = filterEstado, sub = filterSubdireccion, size = pageSize) => {
        setLoading(true);
        try {
            const params = { page, page_size: size, ordering: 'nombre_funcionario' };
            if (search) params.search = search;
            if (estado !== 'all') params.estado = estado === 'activo';
            if (sub) params.subdireccion = sub;

            const response = await api.get('funcionarios/', { params });
            if (response.data.results) {
                setFuncionarios(response.data.results);
                setTotalPages(Math.ceil(response.data.count / size));
                setTotalResults(response.data.count);
            } else {
                setFuncionarios(response.data);
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
        fetchData(1, value, filterEstado, filterSubdireccion);
    };

    const handleFilterEstado = (e) => {
        const value = e.target.value;
        setFilterEstado(value);
        fetchData(1, searchTerm, value, filterSubdireccion);
    };

    const handleFilterSubdireccion = (e) => {
        const value = e.target.value;
        setFilterSubdireccion(value);
        fetchData(1, searchTerm, filterEstado, value);
    };

    const handleToggleEstado = async (id) => {
        try {
            await api.post(`funcionarios/${id}/toggle_estado/`);
            fetchData(currentPage);
        } catch (error) {
            console.error('Error toggling estado:', error);
            alert('Error al cambiar estado');
        }
    };

    const handleCreate = () => {
        setSelectedId(null);
        setIsModalOpen(true);
    };

    const handleEdit = (id) => {
        setSelectedId(id);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este funcionario? Esta acción no se puede deshacer.')) return;
        try {
            await api.delete(`funcionarios/${id}/`);
            fetchData(currentPage);
        } catch (error) {
            console.error('Error deleting funcionario:', error);
            alert('Error al eliminar funcionario. Podría estar vinculado a otros registros.');
        }
    };

    return (
        <div className={PAGE_LAYOUT}>
            <FuncionariosPageHeader
                title="Funcionarios"
                titleIcon={Users}
                subtitle={`Directorio de personal · ${totalResults} registros`}
                actionLabel="Nuevo funcionario"
                actionIcon={Plus}
                onAction={handleCreate}
                showAction={can('funcionarios.add_funcionario')}
            />

            <div className={TABLE_PANEL}>
                <div className="shrink-0 flex flex-col lg:flex-row items-stretch lg:items-center gap-3 p-3 bg-slate-50 border-b border-slate-200">
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, rut o cargo..."
                            value={searchTerm}
                            onChange={handleSearch}
                            className={INPUT_FILTER}
                        />
                    </div>
                    <select value={filterEstado} onChange={handleFilterEstado} className={`${SELECT_FILTER} w-full sm:w-36`}>
                        <option value="all">Todos los estados</option>
                        <option value="activo">Activos</option>
                        <option value="inactivo">Inactivos</option>
                    </select>
                    <select value={filterSubdireccion} onChange={handleFilterSubdireccion} className={`${SELECT_FILTER} w-full sm:w-48`}>
                        <option value="">Todas las subdirecciones</option>
                        {subdirecciones.map((sub) => (
                            <option key={sub.id} value={sub.id}>{sub.nombre}</option>
                        ))}
                    </select>
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            const newSize = Number(e.target.value);
                            setPageSize(newSize);
                            fetchData(1, searchTerm, filterEstado, filterSubdireccion, newSize);
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
                    ) : funcionarios.length === 0 ? (
                        <TableEmpty />
                    ) : (
                        <table className="w-full text-left border-collapse border-spacing-0 min-w-[1200px]">
                            <thead className="sticky top-0 z-10">
                                <tr className={THEAD_TR}>
                                    <th className={`${TH} w-28`}>Estado</th>
                                    <th className={TH}>Nombre</th>
                                    <th className={`${TH} w-28`}>RUT</th>
                                    <th className={`${TH} text-center w-20`}>Anexo</th>
                                    <th className={`${TH} text-center w-24`}>Tel. público</th>
                                    <th className={TH}>Subdirección</th>
                                    <th className={TH}>Departamento</th>
                                    <th className={TH}>Cargo</th>
                                    <th className={`${TH} text-center w-24 border-r-0`}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {funcionarios.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className={TD}>
                                            <button type="button" onClick={() => handleToggleEstado(item.id)} className={statusBadgeClass(item.estado)}>
                                                <Power className="w-3 h-3 shrink-0" />
                                                {item.estado ? 'Activo' : 'Inactivo'}
                                            </button>
                                        </td>
                                        <td className={TD_MAIN}>
                                            <span className="line-clamp-2 block">{item.nombre_funcionario}</span>
                                        </td>
                                        <td className={TD}>{item.rut || '—'}</td>
                                        <td className={`${TD} text-center`}>{item.anexo || '—'}</td>
                                        <td className={`${TD} text-center`}>{item.numero_publico || '—'}</td>
                                        <td className={TD}>
                                            <span className="line-clamp-2 block">{item.subdireccion_nombre || '—'}</span>
                                        </td>
                                        <td className={TD}>
                                            <span className="line-clamp-2 block">{item.departamento_nombre || '—'}</span>
                                        </td>
                                        <td className={TD}>
                                            <span className="line-clamp-2 block">{item.cargo || '—'}</span>
                                        </td>
                                        <td className="px-4 py-3 align-middle text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {can('funcionarios.change_funcionario') && (
                                                    <button type="button" onClick={() => handleEdit(item.id)} className={BTN_ICON_EDIT} title="Editar">
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                {can('funcionarios.delete_funcionario') && (
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
                            Mostrando {funcionarios.length} de {totalResults}
                        </span>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={(page) => fetchData(page)}
                            totalCount={totalResults}
                        />
                    </div>
                )}
            </div>

            <FuncionarioModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={() => fetchData(currentPage)}
                funcionarioId={selectedId}
            />
        </div>
    );
};

export default FuncionariosList;
