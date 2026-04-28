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
    const [summaryData, setSummaryData] = useState([]);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [copiedId, setCopiedId] = useState(null);

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
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <Users className="w-8 h-8 text-indigo-600" />
                        Usuarios Google Workspace
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Gestión Dinámica e Institucional.</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchSummary}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl shadow-lg hover:bg-slate-900 transition-all font-bold text-sm"
                    >
                        <BarChart3 className="w-4 h-4" />
                        Resumen
                    </button>
                    <label className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all cursor-pointer font-bold text-sm ${uploading ? 'opacity-50' : ''}`}>
                        {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {uploading ? 'Cargando...' : 'Cargar CSV'}
                        <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} disabled={uploading} />
                    </label>
                </div>
            </div>

            {/* Fila 1: Categorías de Personal */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 font-sans">
                {[
                    { label: 'Total', count: stats.total, icon: Users, color: 'blue', action: () => { setAuditFilter(''); setCurrentPage(1); } },
                    { label: 'Administrativos', count: stats.administrativos, icon: Briefcase, color: 'indigo' },
                    { label: 'Docentes', count: stats.docentes, icon: GraduationCap, color: 'amber' },
                    { label: 'Asistentes', count: stats.asistentes, icon: BookOpen, color: 'emerald' },
                    { label: 'Alumnos', count: stats.alumnos, icon: Users2, color: 'rose' },
                ].map((item, i) => (
                    <div key={i} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-all" onClick={item.action}>
                        <div className={`p-2 bg-${item.color}-50 rounded-lg text-${item.color}-600`}><item.icon className="w-4 h-4" /></div>
                        <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{item.label}</p>
                            <p className="text-sm font-black text-slate-800">{item.count?.toLocaleString()}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Fila 2: Casos Críticos (Auditoría) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
                <div className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${auditFilter === 'desuso' ? 'bg-rose-50 border-rose-200 shadow-lg shadow-rose-100' : 'bg-white border-slate-100 hover:border-rose-100'}`} onClick={() => { setAuditFilter('desuso'); setCurrentPage(1); }}>
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${auditFilter === 'desuso' ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-600'}`}><Clock className="w-5 h-5" /></div>
                        <div>
                            <p className="text-xs font-black text-slate-500 uppercase">En Desuso (+6 meses)</p>
                            <p className="text-2xl font-black text-rose-600">{stats.desuso?.toLocaleString()}</p>
                        </div>
                    </div>
                    {auditFilter === 'desuso' && <XCircle className="w-5 h-5 text-rose-400" onClick={(e) => { e.stopPropagation(); setAuditFilter(''); }} />}
                </div>
                <div className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${auditFilter === 'id_errors' ? 'bg-amber-50 border-amber-200 shadow-lg shadow-amber-100' : 'bg-white border-slate-100 hover:border-amber-100'}`} onClick={() => { setAuditFilter('id_errors'); setCurrentPage(1); }}>
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${auditFilter === 'id_errors' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-600'}`}><ShieldAlert className="w-5 h-5" /></div>
                        <div>
                            <p className="text-xs font-black text-slate-500 uppercase">Sin ID Empleado (RUT)</p>
                            <p className="text-2xl font-black text-amber-600">{stats.id_faltantes?.toLocaleString()}</p>
                        </div>
                    </div>
                    {auditFilter === 'id_errors' && <XCircle className="w-5 h-5 text-amber-400" onClick={(e) => { e.stopPropagation(); setAuditFilter(''); }} />}
                </div>
                <div className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${auditFilter === 'duplicates' ? 'bg-orange-50 border-orange-200 shadow-lg shadow-orange-100' : 'bg-white border-slate-100 hover:border-orange-100'}`} onClick={() => { setAuditFilter('duplicates'); setCurrentPage(1); }}>
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${auditFilter === 'duplicates' ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-600'}`}><AlertCircle className="w-5 h-5" /></div>
                        <div>
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">IDs Duplicados</p>
                            <p className="text-2xl font-black text-orange-600">{stats.id_duplicados?.toLocaleString()}</p>
                        </div>
                    </div>
                    {auditFilter === 'duplicates' && <XCircle className="w-5 h-5 text-orange-400" onClick={(e) => { e.stopPropagation(); setAuditFilter(''); }} />}
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                <div className="flex flex-col lg:flex-row gap-4 items-center">
                    <div className="flex-1 relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="Buscar por email, nombre o ID..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold shadow-sm" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
                    </div>

                    <div className="w-full lg:w-64">
                        <select className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold shadow-sm cursor-pointer" value={filterOrg} onChange={(e) => { setFilterOrg(e.target.value); setCurrentPage(1); }}>
                            <option value="">Todas las Unidades</option>
                            {orgUnits.map(unit => <option key={unit.id} value={unit.name}>{unit.name}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 h-[42px] cursor-pointer" onClick={() => { setExcludeAlumnos(!excludeAlumnos); setCurrentPage(1); }}>
                        <div className={`w-8 h-4 rounded-full relative transition-all ${excludeAlumnos ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${excludeAlumnos ? 'left-4.5' : 'left-0.5'}`} />
                        </div>
                        <span className="text-xs font-bold text-slate-600">Ocultar Alumnos</span>
                    </div>

                    <button onClick={() => setShowColumnPicker(!showColumnPicker)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${showColumnPicker ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-100 text-slate-600 hover:bg-slate-50'}`}>
                        <Filter className="w-4 h-4" /> Columnas
                    </button>

                    {showColumnPicker && (
                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50 animate-in fade-in zoom-in duration-200">
                            <div className="flex items-center justify-between mb-3 border-b pb-2">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mostrar Columnas</h4>
                                <X className="w-4 h-4 text-slate-300 cursor-pointer" onClick={() => setShowColumnPicker(false)} />
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                {COLUMNS.map(col => (
                                    <label key={col.key} className="flex items-center gap-3 cursor-pointer py-1">
                                        <input type="checkbox" checked={visibleColumns[col.key] || false} onChange={() => toggleColumn(col.key)} className="w-4 h-4 rounded border-slate-300 accent-indigo-600" />
                                        <span className="text-xs font-bold text-slate-600">{col.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative">
                {loading && <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 flex items-center justify-center"><RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" /></div>}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                {COLUMNS.filter(col => visibleColumns[col.key]).map(col => (
                                    <th key={col.key} className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">{col.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                            {users.map((user) => {
                                const inactive = isInactive(user.last_sign_in);
                                const isDuplicate = auditFilter === 'duplicates' || (stats.id_duplicados > 0 && user.employee_id && users.filter(u => u.employee_id === user.employee_id).length > 1);
                                return (
                                    <tr key={user.id} className={`transition-colors ${inactive ? 'bg-rose-50/30' : 'hover:bg-slate-50'}`}>
                                        {visibleColumns.first_name && <td className="px-6 py-4 text-sm font-bold text-slate-700">{user.first_name}</td>}
                                        {visibleColumns.last_name && <td className="px-6 py-4 text-sm font-bold text-slate-700">{user.last_name}</td>}
                                        {visibleColumns.email && (
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => handleCopy(user.email, user.id)} className={`p-2 rounded-xl transition-all shadow-sm ${copiedId === user.id ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-50 text-indigo-500 hover:scale-105'}`}>
                                                        {copiedId === user.id ? <Check className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
                                                    </button>
                                                    <span className="text-sm font-bold text-slate-600">{user.email}</span>
                                                </div>
                                            </td>
                                        )}
                                        {visibleColumns.employee_id && (
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-lg text-xs font-black ${!user.employee_id ? 'bg-amber-100 text-amber-700' : isDuplicate ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-slate-100 text-slate-600'}`}>
                                                    {user.employee_id || 'FALTA RUT'}
                                                </span>
                                            </td>
                                        )}
                                        {visibleColumns.org_unit_path && <td className="px-6 py-4 text-xs font-semibold text-slate-500">{(user.org_unit_path || '').split(' / ').pop()}</td>}
                                        {visibleColumns.status && <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${user.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>{user.status}</span></td>}
                                        {visibleColumns.last_sign_in && <td className={`px-6 py-4 text-xs font-bold ${inactive ? 'text-rose-600' : 'text-slate-400'}`}>{user.last_sign_in || 'NUNCA'}</td>}
                                        {visibleColumns.employee_title && <td className="px-6 py-4 text-xs text-slate-500">{user.employee_title || '—'}</td>}
                                        {visibleColumns.department && <td className="px-6 py-4 text-xs text-slate-500">{user.department || '—'}</td>}
                                        {visibleColumns.cost_center && <td className="px-6 py-4 text-xs text-slate-500">{user.cost_center || '—'}</td>}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 bg-slate-50/50 flex items-center justify-between border-t border-slate-100 font-sans">
                    <span className="text-xs font-bold text-slate-500">Página {currentPage} de {totalPages} ({totalCount.toLocaleString()} cuentas)</span>
                    <div className="flex items-center gap-2">
                        <button disabled={currentPage === 1 || loading} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                        <button disabled={currentPage === totalPages || loading} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>

            {/* Modal: Resumen Ejecutivo */}
            {showSummaryModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col border border-white/20">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                    <BarChart3 className="w-7 h-7 text-indigo-600" />
                                    Resumen por Establecimiento
                                </h2>
                                <p className="text-xs text-slate-500 mt-1 font-bold uppercase tracking-wider">Unidades Alimentadas dinámicamente desde el mantenedor.</p>
                            </div>
                            <button onClick={() => setShowSummaryModal(false)} className="p-3 hover:bg-slate-200 rounded-2xl transition-all">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 bg-white font-sans">
                            {loadingSummary ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin" />
                                    <p className="text-slate-500 font-bold">Consultando base de datos dinámica...</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-indigo-50/50">
                                                <th className="px-6 py-5 text-[10px] font-black text-indigo-600 uppercase tracking-widest rounded-l-2xl">Establecimiento / Unidad</th>
                                                <th className="px-4 py-5 text-[10px] font-black text-indigo-600 uppercase tracking-widest text-center">Total</th>
                                                <th className="px-4 py-5 text-[10px] font-black text-indigo-600 uppercase tracking-widest text-center">Adm.</th>
                                                <th className="px-4 py-5 text-[10px] font-black text-indigo-600 uppercase tracking-widest text-center">Docentes</th>
                                                <th className="px-4 py-5 text-[10px] font-black text-indigo-600 uppercase tracking-widest text-center">Asistentes</th>
                                                <th className="px-4 py-5 text-[10px] font-black text-indigo-600 uppercase tracking-widest text-center rounded-r-2xl">Alumnos</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {summaryData.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="p-2.5 bg-white border border-slate-100 rounded-xl shadow-sm group-hover:bg-indigo-50 transition-colors">
                                                                <Building2 className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                                                            </div>
                                                            <span className="text-sm font-black text-slate-700">{item.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <span className="px-3 py-1 bg-slate-800 text-white rounded-full text-xs font-black shadow-md">
                                                            {item.total.toLocaleString()}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-center text-sm font-bold text-slate-600">{item.adm.toLocaleString()}</td>
                                                    <td className="px-4 py-4 text-center text-sm font-bold text-slate-600">{item.doc.toLocaleString()}</td>
                                                    <td className="px-4 py-4 text-center text-sm font-bold text-slate-600">{item.asist.toLocaleString()}</td>
                                                    <td className="px-4 py-4 text-center text-sm font-bold text-slate-400 opacity-60 italic">{item.alum.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Settings2 className="w-4 h-4 text-slate-400" />
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    Las unidades mostradas arriba se gestionan desde el Mantenedor de Unidades Google.
                                </p>
                            </div>
                            <button onClick={() => setShowSummaryModal(false)} className="px-8 py-2.5 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
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
