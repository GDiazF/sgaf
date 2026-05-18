import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Search, Filter, Building2, UserCircle, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

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
        return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-indigo-600" /> : <ChevronDown className="w-3 h-3 text-indigo-600" />;
    };

    return (
        <div className="space-y-4">
            <div className="bg-white p-3 md:p-4 rounded-[1.5rem] shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex-1 w-full relative">
                        <div className="relative group">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Buscar por colegio, RBD, ejecutivo o requerimiento..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-700 pl-10 pr-4 py-2.5 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all font-medium"
                            />
                        </div>
                    </div>
                    
                    <div className="w-full md:w-72">
                        <div className="relative group">
                            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                            <select 
                                value={filterEstado}
                                onChange={(e) => setFilterEstado(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-700 pl-10 pr-10 py-2.5 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 appearance-none transition-all font-medium cursor-pointer"
                            >
                                <option value="TODOS">Todos los estados</option>
                                <option value="PENDIENTE">🔴 Pendientes</option>
                                <option value="EN_PROCESO">🟠 En Proceso</option>
                                <option value="RESPONDIDO">🔵 Respondidos</option>
                                <option value="CERRADO">🟢 Cerrados</option>
                            </select>
                            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col" style={{ maxHeight: '75vh' }}>
                <div className="overflow-auto flex-1 relative">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-400 font-black select-none shadow-sm">
                                <th className="px-6 py-3 cursor-pointer hover:bg-slate-100 transition-colors bg-slate-50" onClick={() => handleSort('fecha_creacion')}>
                                    <div className="flex items-center gap-2">Fecha <SortIcon columnKey="fecha_creacion" /></div>
                                </th>
                                <th className="px-6 py-3 cursor-pointer hover:bg-slate-100 transition-colors bg-slate-50" onClick={() => handleSort('establecimiento')}>
                                    <div className="flex items-center gap-2">Establecimiento <SortIcon columnKey="establecimiento" /></div>
                                </th>
                                <th className="px-6 py-3 cursor-pointer hover:bg-slate-100 transition-colors bg-slate-50" onClick={() => handleSort('ejecutivo')}>
                                    <div className="flex items-center gap-2">Ejecutivo Asignado <SortIcon columnKey="ejecutivo" /></div>
                                </th>
                                <th className="px-6 py-3 w-1/4 bg-slate-50">Requerimiento</th>
                                <th className="px-6 py-3 cursor-pointer hover:bg-slate-100 transition-colors bg-slate-50" onClick={() => handleSort('estado')}>
                                    <div className="flex items-center gap-2 justify-center">Estado <SortIcon columnKey="estado" /></div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="5" className="text-center py-12 text-slate-400 font-medium">Cargando gestiones...</td></tr>
                            ) : sortedData.length === 0 ? (
                                <tr><td colSpan="5" className="text-center py-12 text-slate-400 font-medium italic">No se encontraron gestiones.</td></tr>
                            ) : sortedData.map(g => (
                                <tr key={g.id} className="hover:bg-indigo-50/20 transition-colors">
                                    <td className="px-6 py-1.5 whitespace-nowrap">
                                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold uppercase">
                                            <Calendar className="w-3.5 h-3.5 text-slate-300" />
                                            {new Date(g.fecha_creacion).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-1.5">
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-700 text-[11px] uppercase truncate max-w-[200px] leading-none">{g.establecimiento_details?.nombre}</span>
                                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-1 opacity-70">RBD: {g.establecimiento_details?.rbd}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 flex-shrink-0">
                                                <UserCircle className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-[11px] font-bold text-slate-600 uppercase leading-none">{g.ejecutivo_details?.nombre_funcionario || 'Sin Asignar'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-1.5">
                                        <p className="text-[11px] font-medium text-slate-700 line-clamp-1 uppercase leading-none">{g.requerimiento}</p>
                                    </td>
                                    <td className="px-6 py-1.5 text-center whitespace-nowrap">
                                        <span className={`px-2 py-0.5 text-[9px] uppercase font-black tracking-widest rounded-lg border ${
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
                <div className="bg-slate-50 border-t border-slate-200 p-4 text-xs font-semibold text-slate-500 text-right">
                    Mostrando {sortedData.length} gestiones
                </div>
            </div>
        </div>
    );
};

export default AdminGestionesGlobal;
