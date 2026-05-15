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
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-end">
                    <div className="flex-1 w-full relative">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Buscar Gestión</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Buscar por colegio, RBD, ejecutivo o requerimiento..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 pl-10 pr-4 py-2.5 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                            />
                        </div>
                    </div>
                    
                    <div className="w-full md:w-64">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Filtrar por Estado</label>
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select 
                                value={filterEstado}
                                onChange={(e) => setFilterEstado(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 pl-10 pr-4 py-2.5 rounded-xl outline-none focus:border-indigo-500 appearance-none"
                            >
                                <option value="TODOS">Todos los estados</option>
                                <option value="PENDIENTE">Pendientes</option>
                                <option value="EN_PROCESO">En Proceso</option>
                                <option value="RESPONDIDO">Respondidos</option>
                                <option value="CERRADO">Cerrados</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col" style={{ maxHeight: '75vh' }}>
                <div className="overflow-auto flex-1 relative">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-widest text-slate-500 font-bold select-none shadow-sm">
                                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors bg-slate-50" onClick={() => handleSort('fecha_creacion')}>
                                    <div className="flex items-center gap-2">Fecha <SortIcon columnKey="fecha_creacion" /></div>
                                </th>
                                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors bg-slate-50" onClick={() => handleSort('establecimiento')}>
                                    <div className="flex items-center gap-2">Establecimiento <SortIcon columnKey="establecimiento" /></div>
                                </th>
                                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors bg-slate-50" onClick={() => handleSort('ejecutivo')}>
                                    <div className="flex items-center gap-2">Ejecutivo Asignado <SortIcon columnKey="ejecutivo" /></div>
                                </th>
                                <th className="px-6 py-4 w-1/4 bg-slate-50">Requerimiento</th>
                                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors bg-slate-50" onClick={() => handleSort('estado')}>
                                    <div className="flex items-center gap-2 justify-center">Estado <SortIcon columnKey="estado" /></div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="5" className="text-center py-12 text-slate-400 font-medium">Cargando gestiones...</td></tr>
                            ) : sortedData.length === 0 ? (
                                <tr><td colSpan="5" className="text-center py-12 text-slate-400 font-medium">No se encontraron gestiones con los filtros actuales.</td></tr>
                            ) : sortedData.map(g => (
                                <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                            {new Date(g.fecha_creacion).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-700 text-sm">{g.establecimiento_details?.nombre}</span>
                                            <span className="text-xs text-slate-400 font-semibold">RBD: {g.establecimiento_details?.rbd}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                                                <UserCircle className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-semibold text-slate-600">{g.ejecutivo_details?.nombre_funcionario || 'Sin Asignar'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-slate-800 line-clamp-2">{g.requerimiento}</p>
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                        <span className={`px-3 py-1.5 text-[10px] uppercase font-black tracking-widest rounded-full ${
                                            g.estado === 'PENDIENTE' ? 'bg-rose-100 text-rose-600' :
                                            g.estado === 'EN_PROCESO' ? 'bg-amber-100 text-amber-600' :
                                            g.estado === 'RESPONDIDO' ? 'bg-blue-100 text-blue-600' :
                                            'bg-emerald-100 text-emerald-600'
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
