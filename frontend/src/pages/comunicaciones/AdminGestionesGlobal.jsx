import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Search, Filter, UserCircle, Calendar, ChevronDown, ChevronUp, FolderSearch } from 'lucide-react';
import { INPUT_FILTER, SELECT_FILTER, FOCUS_ICON, SORT_ACTIVE } from './comunicacionesUi';

const AdminGestionesGlobal = () => {
    const [gestiones, setGestiones] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [filterEstado, setFilterEstado] = useState('TODOS');
    
    // Ordenamiento
    const [sortConfig, setSortConfig] = useState({ key: 'fecha_creacion', direction: 'desc' });

    useEffect(() => {
        const fetchGestiones = async () => {
            try {
                // Obtenemos todas las gestiones
                const res = await api.get('ejecutivos/gestiones/?page_size=1000');
                // Dependiendo de si está paginado o no
                const data = res.data.results || res.data;
                setGestiones(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Error fetching gestiones', error);
            } finally {
                setLoading(false);
            }
        };
        fetchGestiones();
    }, []);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedData = React.useMemo(() => {
        let sortableItems = [...gestiones];
        
        // Primero filtramos
        if (filterEstado !== 'TODOS') {
            sortableItems = sortableItems.filter(g => g.estado === filterEstado);
        }
        
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            sortableItems = sortableItems.filter(g => 
                g.establecimiento_details?.nombre?.toLowerCase().includes(lowerSearch) ||
                g.ejecutivo_details?.nombre_funcionario?.toLowerCase().includes(lowerSearch) ||
                g.requerimiento?.toLowerCase().includes(lowerSearch) ||
                g.establecimiento_details?.rbd?.toString().includes(lowerSearch)
            );
        }

        // Luego ordenamos
        sortableItems.sort((a, b) => {
            let aValue, bValue;
            
            switch (sortConfig.key) {
                case 'establecimiento':
                    aValue = a.establecimiento_details?.nombre || '';
                    bValue = b.establecimiento_details?.nombre || '';
                    break;
                case 'rbd':
                    aValue = a.establecimiento_details?.rbd ?? '';
                    bValue = b.establecimiento_details?.rbd ?? '';
                    break;
                case 'ejecutivo':
                    aValue = a.ejecutivo_details?.nombre_funcionario || '';
                    bValue = b.ejecutivo_details?.nombre_funcionario || '';
                    break;
                case 'fecha_creacion':
                    aValue = new Date(a.fecha_creacion).getTime();
                    bValue = new Date(b.fecha_creacion).getTime();
                    break;
                case 'estado':
                    aValue = a.estado;
                    bValue = b.estado;
                    break;
                default:
                    aValue = a[sortConfig.key];
                    bValue = b[sortConfig.key];
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        
        return sortableItems;
    }, [gestiones, sortConfig, filterEstado, searchTerm]);

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <ChevronDown className="w-3 h-3 opacity-20" />;
        return sortConfig.direction === 'asc' ? <ChevronUp className={SORT_ACTIVE} /> : <ChevronDown className={SORT_ACTIVE} />;
    };

    return (
        <div className="flex flex-col h-full overflow-hidden gap-4">
            <div className="bg-white p-3 md:p-4 rounded-[1.5rem] shadow-sm border border-slate-200 shrink-0">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center w-full">
                    <div className="flex-1 w-full relative">
                        <div className="relative group">
                            <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 transition-colors pointer-events-none ${FOCUS_ICON}`} />
                            <input 
                                type="text" 
                                placeholder="Buscar por colegio, RBD, ejecutivo o requerimiento..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={INPUT_FILTER}
                            />
                        </div>
                    </div>
                    
                    <div className="w-full md:w-72">
                        <div className="relative group">
                            <Filter className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 transition-colors pointer-events-none ${FOCUS_ICON}`} />
                            <select 
                                value={filterEstado}
                                onChange={(e) => setFilterEstado(e.target.value)}
                                className={SELECT_FILTER}
                            >
                                <option value="TODOS">Todos los estados</option>
                                <option value="PENDIENTE">🔴 Pendientes</option>
                                <option value="EN_PROCESO">🟠 En Proceso</option>
                                <option value="RESPONDIDO">🔵 Respondidos</option>
                                <option value="CERRADO">🟢 Cerrados</option>
                            </select>
                            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left border-collapse border-spacing-0 min-w-[1000px]">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-200 select-none shadow-sm">
                                <th className="px-4 py-3 align-middle border-r border-slate-100 bg-slate-50 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSort('fecha_creacion')}>
                                    <div className="flex items-center gap-2">Fecha <SortIcon columnKey="fecha_creacion" /></div>
                                </th>
                                <th className="px-4 py-3 align-middle border-r border-slate-100 bg-slate-50 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSort('establecimiento')}>
                                    <div className="flex items-center gap-2">Establecimiento <SortIcon columnKey="establecimiento" /></div>
                                </th>
                                <th className="px-4 py-3 align-middle border-r border-slate-100 bg-slate-50 w-28 text-center cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSort('rbd')}>
                                    <div className="flex items-center justify-center gap-2">RBD <SortIcon columnKey="rbd" /></div>
                                </th>
                                <th className="px-4 py-3 align-middle border-r border-slate-100 bg-slate-50 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSort('ejecutivo')}>
                                    <div className="flex items-center gap-2">Ejecutivo <SortIcon columnKey="ejecutivo" /></div>
                                </th>
                                <th className="px-4 py-3 align-middle border-r border-slate-100 bg-slate-50">Requerimiento</th>
                                <th className="px-4 py-3 align-middle bg-slate-50 text-center cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSort('estado')}>
                                    <div className="flex items-center justify-center gap-2">Estado <SortIcon columnKey="estado" /></div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6">
                                        <div className="flex flex-col items-center justify-center py-12 text-center">
                                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Cargando gestiones...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : sortedData.length === 0 ? (
                                <tr>
                                    <td colSpan="6">
                                        <div className="flex flex-col items-center justify-center py-12 text-center">
                                            <FolderSearch className="w-10 h-10 text-slate-200 mb-3" />
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No se encontraron registros</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : sortedData.map(g => (
                                <tr key={g.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-4 py-3 align-middle border-r border-slate-50 whitespace-nowrap">
                                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium uppercase tracking-tighter">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            {new Date(g.fecha_creacion).toLocaleDateString('es-CL')}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 align-middle border-r border-slate-50 max-w-[220px]">
                                        <span className="text-[11px] font-medium text-slate-700 uppercase tracking-tighter line-clamp-2 block">
                                            {g.establecimiento_details?.nombre || '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 align-middle border-r border-slate-50 text-center whitespace-nowrap">
                                        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-tighter">
                                            {g.establecimiento_details?.rbd ?? '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 align-middle border-r border-slate-50">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <UserCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span className="text-[11px] font-medium text-slate-600 uppercase tracking-tighter truncate">
                                                {g.ejecutivo_details?.nombre_funcionario || 'Sin asignar'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 align-middle border-r border-slate-50">
                                        <p className="text-[11px] font-medium text-slate-700 line-clamp-1 uppercase tracking-tighter">{g.requerimiento}</p>
                                    </td>
                                    <td className="px-4 py-3 align-middle text-center whitespace-nowrap">
                                        <span className={`px-2 py-0.5 text-[9px] uppercase font-black tracking-tighter rounded-lg border ${
                                            g.estado === 'PENDIENTE' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                            g.estado === 'EN_PROCESO' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                            g.estado === 'RESPONDIDO' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                            'bg-emerald-50 text-emerald-600 border-emerald-100'
                                        }`}>
                                            {g.estado.replace('_', ' ')}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="bg-slate-50 border-t border-slate-200 py-2.5 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right shrink-0">
                    Mostrando {sortedData.length} gestiones
                </div>
            </div>
        </div>
    );
};

export default AdminGestionesGlobal;
