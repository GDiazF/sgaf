import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Users, Upload, Search, Filter, CheckCircle2, XCircle, AlertCircle,
    MoreHorizontal, ChevronLeft, ChevronRight, FileSpreadsheet, Eye, EyeOff,
    Monitor, Calendar, Building2, Briefcase, RefreshCw, X, GraduationCap, UserX, Copy, Check,
    BookOpen, Award, Users2, ShieldAlert, Clock, BarChart3, PieChart, Settings2
} from 'lucide-react';
import api from '../../api';

const COLUMNS = [
    { key: 'first_name', label: 'Nombre', defaultHidden: false },
    { key: 'last_name', label: 'Apellido', defaultHidden: false },
    { key: 'email', label: 'Email', defaultHidden: false },
    { key: 'employee_id', label: 'ID Empleado', defaultHidden: false },
    { key: 'org_unit_path', label: 'Unidad Org.', defaultHidden: true },
    { key: 'status', label: 'Estado', defaultHidden: true },
    { key: 'last_sign_in', label: 'Último Inicio', defaultHidden: true },
    { key: 'employee_title', label: 'Cargo', defaultHidden: true },
    { key: 'department', label: 'Departamento', defaultHidden: true },
    { key: 'cost_center', label: 'Centro Costo', defaultHidden: true },
];

const UsuariosGoogleDashboard = () => {
    const [users, setUsers] = useState([]);
    const [orgUnits, setOrgUnits] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState({
        administrativos: 0, docentes: 0, asistentes: 0, alumnos: 0,
        desuso: 0, id_faltantes: 0, id_duplicados: 0, total: 0
    });
    const [lastUpload, setLastUpload] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterOrg, setFilterOrg] = useState('');
    const [auditFilter, setAuditFilter] = useState('');
    const [excludeAlumnos, setExcludeAlumnos] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [visibleColumns, setVisibleColumns] = useState(
        COLUMNS.reduce((acc, col) => ({ ...acc, [col.key]: !col.defaultHidden }), {})
    );
    const [showColumnPicker, setShowColumnPicker] = useState(false);
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [copiedId, setCopiedId] = useState(null);

    // Estados corregidos para evitar el colapso del modal de resumen
    const [summaryData, setSummaryData] = useState([]);
    const [loadingSummary, setLoadingSummary] = useState(false);

    const pageSize = 10;

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page: currentPage,
                search: searchTerm,
                org_unit_path__icontains: filterOrg || undefined,
                exclude_alumnos: excludeAlumnos ? 'true' : 'false',
                audit: auditFilter || undefined
            };
            const [usersRes, logRes, statsRes, orgRes] = await Promise.all([
                api.get('usuarios-google/usuarios/', { params }),
                api.get('usuarios-google/usuarios/last_upload/'),
                api.get('usuarios-google/usuarios/stats/'),
                api.get('usuarios-google/unidades/')
            ]);

            if (usersRes.data.results) {
                setUsers(usersRes.data.results);
                setTotalCount(usersRes.data.count);
            } else if (Array.isArray(usersRes.data)) {
                setUsers(usersRes.data);
                setTotalCount(usersRes.data.length);
            }

            setLastUpload(logRes.data);
            setStats(statsRes.data);
            setOrgUnits(orgRes.data.results || orgRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchTerm, filterOrg, excludeAlumnos, auditFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleReloadAll = async () => {
        setRefreshing(true);
        const delayPromise = new Promise(resolve => setTimeout(resolve, 600));
        try {
            await Promise.all([
                fetchData(),
                delayPromise
            ]);
        } catch (error) {
            console.error('Error reloading all data:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        setUploading(true);
        try {
            await api.post('usuarios-google/usuarios/upload_csv/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setCurrentPage(1);
            fetchData();
        } catch (error) {
            alert('Error al cargar el archivo CSV.');
        } finally {
            setUploading(false);
            e.target.value = null;
        }
    };

    const fetchSummary = async () => {
        setLoadingSummary(true);
        setShowSummaryModal(true);
        try {
            const res = await api.get('usuarios-google/usuarios/summary_by_org/');
            setSummaryData(res.data);
        } catch (error) {
            console.error('Error fetching summary:', error);
        } finally {
            setLoadingSummary(false);
        }
    };

    const handleCopy = (email, id) => {
        navigator.clipboard.writeText(email);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const isInactive = (lastSignIn) => {
        if (!lastSignIn || lastSignIn.toLowerCase().includes('never') || lastSignIn.trim() === '') return true;
        try {
            const lastDate = new Date(lastSignIn);
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            return lastDate < sixMonthsAgo;
        } catch (e) { return false; }
    };

    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const toggleColumn = (key) => setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));

    return (
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden">
            {/* Contenedor Superior (Cabecera) - Se alinea al ras sin iconos decorativos (Punto 1 y 2) */}
            <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                <div>
                    <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase">Usuarios Google Workspace</h2>
                    <div className="flex items-center gap-2 mt-1.5">
                        <p className="text-[10px] md:text-xs font-medium text-slate-500 uppercase ml-0">Gestión Dinámica e Institucional.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* Botón Resumen con Color Índigo Corporativo Suave, tipografía premium font-bold a text-[10px] (10px exactos) */}
                    <button
                        onClick={fetchSummary}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm"
                    >
                        <BarChart3 className="w-4 h-4" />
                        Resumen
                    </button>
                    {/* Botón Cargar CSV con tipografía premium font-black a text-[10px] (10px exactos) */}
                    <label className={`bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
                        {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {uploading ? 'Cargando...' : 'Cargar CSV'}
                        <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} disabled={uploading} />
                    </label>
                    <button 
                        onClick={handleReloadAll} 
                        className="h-8 w-8 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center transition active:scale-95 shrink-0"
                        title="Recargar datos"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Fila 1: Tarjetas KPI Estandarizadas (Punto 16 de la Guía) */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 shrink-0 font-sans">
                {[
                    { label: 'Total Cuentas', count: stats.total, icon: Users, action: () => { setAuditFilter(''); setCurrentPage(1); } },
                    { label: 'Administrativos', count: stats.administrativos, icon: Briefcase },
                    { label: 'Docentes', count: stats.docentes, icon: GraduationCap },
                    { label: 'Asistentes', count: stats.asistentes, icon: BookOpen },
                    { label: 'Alumnos', count: stats.alumnos, icon: Users2 },
                ].map((item, i) => (
                    <div key={i} className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md group cursor-pointer" onClick={item.action}>
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <item.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest line-clamp-1">{item.label}</h3>
                            <p className="text-lg font-bold text-slate-800 leading-none mt-1">{item.count?.toLocaleString()}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Fila 2: Casos Críticos de Auditoría (Punto 16 de la Guía) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0 font-sans">
                {[
                    { label: 'En Desuso (+6 meses)', count: stats.desuso, icon: Clock, filter: 'desuso', color: 'rose' },
                    { label: 'Sin ID Empleado (RUT)', count: stats.id_faltantes, icon: ShieldAlert, filter: 'id_errors', color: 'amber' },
                    { label: 'IDs Duplicados', count: stats.id_duplicados, icon: AlertCircle, filter: 'duplicates', color: 'orange' },
                ].map((item, idx) => {
                    const isSelected = auditFilter === item.filter;
                    return (
                        <div 
                            key={idx}
                            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group hover:shadow-md ${isSelected ? `bg-${item.color}-50/50 border-${item.color}-200 shadow-sm shadow-${item.color}-100/50` : 'bg-white border-slate-100'}`} 
                            onClick={() => { setAuditFilter(isSelected ? '' : item.filter); setCurrentPage(1); }}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${isSelected ? `bg-${item.color}-600 text-white shadow-lg` : `bg-${item.color}-50 text-${item.color}-600`}`}>
                                    <item.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">{item.label}</h3>
                                    <p className="text-lg font-bold text-slate-800 leading-none mt-1">{item.count?.toLocaleString()}</p>
                                </div>
                            </div>
                            {isSelected && <XCircle className="w-4 h-4 text-slate-400 hover:text-slate-600" onClick={(e) => { e.stopPropagation(); setAuditFilter(''); }} />}
                        </div>
                    );
                })}
            </div>

            {/* Barra de Filtros Estandarizada (Punto 9 de la Guía) */}
            <div className="flex flex-col lg:flex-row items-center gap-3 w-full bg-slate-50 p-3 rounded-xl border border-slate-200 shrink-0">
                {/* Buscador de Texto (Punto 3 y 9) */}
                <div className="relative flex-1 w-full shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input 
                        type="text" 
                        placeholder="BUSCAR POR EMAIL, NOMBRE O ID..." 
                        className="no-global w-full h-10 text-[10px] font-bold bg-white border border-slate-200 pl-10 pr-4 rounded-xl outline-none focus:border-indigo-500 uppercase transition-all shadow-sm placeholder:text-slate-300" 
                        value={searchTerm} 
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                    />
                </div>

                {/* Selector de Unidades Orgánicas (Punto 3 y 9) */}
                <div className="relative flex items-center w-full lg:w-64 shrink-0">
                    <Building2 className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    <select 
                        className="no-global w-full text-[10px] font-black bg-white border border-slate-200 pl-9 pr-8 h-10 rounded-xl outline-none cursor-pointer appearance-none text-slate-700 focus:border-indigo-500 uppercase tracking-widest transition-all shadow-sm bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem_1rem] bg-[right_0.5rem_center] bg-no-repeat" 
                        value={filterOrg} 
                        onChange={(e) => { setFilterOrg(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="">TODAS LAS UNIDADES</option>
                        {orgUnits.map(unit => <option key={unit.id} value={unit.name}>{unit.name}</option>)}
                    </select>
                </div>

                <div className="flex items-center gap-2 bg-white border border-slate-200 px-4 h-10 rounded-xl cursor-pointer shrink-0" onClick={() => { setExcludeAlumnos(!excludeAlumnos); setCurrentPage(1); }}>
                    <div className={`w-8 h-4 rounded-full relative transition-all ${excludeAlumnos ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${excludeAlumnos ? 'left-4.5' : 'left-0.5'}`} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Ocultar Alumnos</span>
                </div>

                <button onClick={() => setShowColumnPicker(!showColumnPicker)} className={`flex items-center gap-2 px-4 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm shrink-0 ${showColumnPicker ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-650 hover:bg-slate-50'}`}>
                    <Filter className="w-4 h-4" /> Columnas
                </button>

                {showColumnPicker && (
                    <div className="absolute right-4 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-3 border-b pb-2">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Mostrar Columnas</h4>
                            <X className="w-4 h-4 text-slate-300 cursor-pointer" onClick={() => setShowColumnPicker(false)} />
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                            {COLUMNS.map(col => (
                                <label key={col.key} className="flex items-center gap-3 cursor-pointer py-1">
                                    <input type="checkbox" checked={visibleColumns[col.key] || false} onChange={() => toggleColumn(col.key)} className="w-4 h-4 rounded border-slate-300 accent-indigo-600" />
                                    <span className="text-[10px] font-bold text-slate-600 uppercase">{col.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Contenedor Principal de la Tabla (Zero-Scroll con scroll interno y sticky head) (Punto 4 de la Guía) */}
            <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-0 relative">
                {loading && <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 flex items-center justify-center"><RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" /></div>}
                
                {/* Envoltorio con scroll y custom-scrollbar */}
                <div className="overflow-auto flex-1 bg-white custom-scrollbar">
                    <table className="w-full text-left border-collapse border-spacing-0">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200">
                                {COLUMNS.filter(col => visibleColumns[col.key]).map(col => (
                                    <th key={col.key} className="px-4 py-3 border-r border-slate-100">{col.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                            {users.map((user) => {
                                const inactive = isInactive(user.last_sign_in);
                                const isDuplicate = auditFilter === 'duplicates' || (stats.id_duplicados > 0 && user.employee_id && users.filter(u => u.employee_id === user.employee_id).length > 1);
                                return (
                                    <tr key={user.id} className={`transition-colors ${inactive ? 'bg-rose-50/30' : 'hover:bg-slate-50/50'}`}>
                                        {visibleColumns.first_name && <td className="px-4 py-2 border-r border-slate-50 text-[11px] font-medium text-slate-500 uppercase tracking-tighter whitespace-nowrap">{user.first_name}</td>}
                                        {visibleColumns.last_name && <td className="px-4 py-2 border-r border-slate-50 text-[11px] font-medium text-slate-500 uppercase tracking-tighter whitespace-nowrap">{user.last_name}</td>}
                                        {visibleColumns.email && (
                                            <td className="px-4 py-2 border-r border-slate-50">
                                                <div className="flex items-center gap-2">
                                                    {/* Botón de copiar estandarizado a p-1.5, rounded-lg y font-bold (Punto 2 y 6) */}
                                                    <button 
                                                        onClick={() => handleCopy(user.email, user.id)} 
                                                        className={`p-1.5 rounded-lg transition-all shadow-sm ${copiedId === user.id ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-50 text-indigo-500 hover:scale-105 hover:bg-indigo-100/50'}`}
                                                    >
                                                        {copiedId === user.id ? <Check className="w-3.5 h-3.5" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                                                    </button>
                                                    <span className="text-[11px] font-bold text-slate-650 tracking-tighter whitespace-nowrap">{user.email}</span>
                                                </div>
                                            </td>
                                        )}
                                        {visibleColumns.employee_id && (
                                            <td className="px-4 py-2 border-r border-slate-50">
                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${!user.employee_id ? 'bg-amber-100 text-amber-700' : isDuplicate ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-slate-100 text-slate-600'}`}>
                                                    {user.employee_id || 'FALTA RUT'}
                                                </span>
                                            </td>
                                        )}
                                        {visibleColumns.org_unit_path && <td className="px-4 py-2 border-r border-slate-50 text-[10px] font-medium text-slate-500 uppercase tracking-tighter whitespace-nowrap">{(user.org_unit_path || '').split(' / ').pop()}</td>}
                                        {visibleColumns.status && <td className="px-4 py-2 border-r border-slate-50"><span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase ${user.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>{user.status}</span></td>}
                                        {visibleColumns.last_sign_in && <td className={`px-4 py-2 border-r border-slate-50 text-[10px] font-medium tracking-tighter whitespace-nowrap ${inactive ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>{user.last_sign_in || 'NUNCA'}</td>}
                                        {visibleColumns.employee_title && <td className="px-4 py-2 border-r border-slate-50 text-[10px] text-slate-500 uppercase tracking-tighter whitespace-nowrap">{user.employee_title || '—'}</td>}
                                        {visibleColumns.department && <td className="px-4 py-2 border-r border-slate-50 text-[10px] text-slate-500 uppercase tracking-tighter whitespace-nowrap">{user.department || '—'}</td>}
                                        {visibleColumns.cost_center && <td className="px-4 py-2 text-[10px] text-slate-500 uppercase tracking-tighter whitespace-nowrap">{user.cost_center || '—'}</td>}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer Paginación Fijo (Punto 10 de la Guía) */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 shrink-0 font-sans flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Página {currentPage} de {totalPages} ({totalCount.toLocaleString()} cuentas)</span>
                    <div className="flex items-center gap-1">
                        <button disabled={currentPage === 1 || loading} onClick={() => setCurrentPage(prev => prev - 1)} className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-50"><ChevronLeft className="w-3.5 h-3.5" /></button>
                        <button disabled={currentPage === totalPages || loading} onClick={() => setCurrentPage(prev => prev + 1)} className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-50"><ChevronRight className="w-3.5 h-3.5" /></button>
                    </div>
                </div>
            </div>

            {/* Modal: Resumen Ejecutivo con tabla interna scrollable e inmune (Punto 7 y 4 de la Guía) */}
            {showSummaryModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-100">
                        {/* Cabecera del Modal sin iconos decorativos (Punto 1) */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                            <div>
                                <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase">
                                    Resumen por Establecimiento
                                </h2>
                                <p className="text-[10px] text-slate-500 mt-1.5 font-bold uppercase tracking-wider">Unidades alimentadas dinámicamente desde el mantenedor.</p>
                            </div>
                            <button onClick={() => setShowSummaryModal(false)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Contenedor del scroll interno del modal */}
                        <div className="flex-1 overflow-y-auto p-6 bg-white font-sans custom-scrollbar max-h-[50vh]">
                            {loadingSummary ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin" />
                                    <p className="text-slate-500 font-bold">Consultando base de datos dinámica...</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                    <table className="w-full text-left border-collapse border-spacing-0">
                                        <thead className="sticky top-0 z-10">
                                            <tr className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200">
                                                <th className="px-4 py-3 border-r border-slate-100">Establecimiento / Unidad</th>
                                                <th className="px-4 py-3 border-r border-slate-100 text-center">Total</th>
                                                <th className="px-4 py-3 border-r border-slate-100 text-center">Adm.</th>
                                                <th className="px-4 py-3 border-r border-slate-100 text-center">Docentes</th>
                                                <th className="px-4 py-3 border-r border-slate-100 text-center">Asistentes</th>
                                                <th className="px-4 py-3 text-center">Alumnos</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {summaryData.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-4 py-2 border-r border-slate-50">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-1.5 bg-white border border-slate-100 rounded-lg shadow-sm group-hover:bg-indigo-50 transition-colors shrink-0">
                                                                <Building2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                                                            </div>
                                                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tighter">{item.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 border-r border-slate-50 text-center">
                                                        <span className="px-2 py-0.5 bg-slate-800 text-white rounded-lg text-[9px] font-bold shadow-sm">
                                                            {item.total.toLocaleString()}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2 border-r border-slate-50 text-center text-[11px] font-medium text-slate-500 uppercase">{item.adm.toLocaleString()}</td>
                                                    <td className="px-4 py-2 border-r border-slate-50 text-center text-[11px] font-medium text-slate-500 uppercase">{item.doc.toLocaleString()}</td>
                                                    <td className="px-4 py-2 border-r border-slate-50 text-center text-[11px] font-medium text-slate-500 uppercase">{item.asist.toLocaleString()}</td>
                                                    <td className="px-4 py-2 text-center text-[11px] font-medium text-slate-400 opacity-60 italic">{item.alum.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Footer del modal estandarizado con botón secundario coloreado y font-bold a text-[10px] (10px exactos) */}
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <Settings2 className="w-4 h-4 text-slate-400" />
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    Las unidades mostradas arriba se gestionan desde el Mantenedor de Unidades Google.
                                </p>
                            </div>
                            <button onClick={() => setShowSummaryModal(false)} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsuariosGoogleDashboard;
