import React, { useState, useEffect, useMemo, useDeferredValue, useCallback, useRef } from 'react';
import api from '../../api';
import { RefreshCw, Users, Search, Fingerprint, Settings, X, Save, Server, Columns, ChevronUp, ChevronDown, ArrowUpDown, Building2, CalendarClock, Shield, AlertTriangle, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const privilegeNames = {
    '0': 'Empleado',
    '2': 'Registrador',
    '6': 'Admin Sistema',
    '14': 'Super Administrador'
};

const normalizePrivilege = (priv) => {
    if (priv === undefined || priv === null) return '0';
    const val = String(priv).toLowerCase().trim();
    if (val === '0' || val === 'empleado') return '0';
    if (val === '2' || val.includes('registrar') || val.includes('registrador')) return '2';
    if (val === '6' || val.includes('administrado') || val.includes('admin')) return '6';
    if (val === '14' || val.includes('super')) return '14';
    return '0';
};

const UserRows = React.memo(({ users, columns, onEdit, privilegeNames, duplicateEmails }) => {
    return (
        <>
            {users.map((u, i) => {
                const isEmailDuplicate = u.email && duplicateEmails.includes(u.email.toLowerCase().trim());
                return (
                    <motion.tr 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i < 30 ? i * 0.01 : 0 }}
                        key={u.id || i} 
                        className={`hover:bg-slate-50/50 transition-colors border-b border-slate-100 ${isEmailDuplicate ? 'bg-amber-50/30' : ''}`}
                    >
                        {/* Celda Principal Destacada (Código) */}
                        <td className="px-4 py-2 border-r border-slate-50">
                            <button 
                                onClick={() => onEdit(u)}
                                className="text-indigo-600 hover:text-indigo-800 font-black text-[11px] uppercase tracking-tighter transition-colors flex items-center gap-1.5 focus:outline-none"
                                title="Haz clic para editar usuario"
                            >
                                <Settings className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span>{u.emp_code}</span>
                            </button>
                        </td>
                        <td className="px-4 py-2 border-r border-slate-50 text-[11px] font-medium text-slate-500 uppercase tracking-tighter whitespace-nowrap">{u.first_name}</td>
                        <td className="px-4 py-2 border-r border-slate-50 text-[11px] font-medium text-slate-500 uppercase tracking-tighter whitespace-nowrap">{u.last_name}</td>
                        {columns.map(col => (
                            <td key={col} className="px-4 py-2 border-r border-slate-50 text-[11px] font-medium text-slate-500 uppercase tracking-tighter whitespace-nowrap max-w-xs truncate" title={String(u[col] || '')}>
                                <div className="flex items-center gap-2">
                                    {col === 'email' && isEmailDuplicate && (
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Correo duplicado detectado" />
                                    )}
                                    <span className={col === 'email' && isEmailDuplicate ? 'text-amber-700 font-bold' : ''}>
                                        {col === 'dev_privilege' 
                                            ? privilegeNames[normalizePrivilege(u[col])] 
                                            : (u[col] !== null && u[col] !== undefined ? String(u[col]) : '-')}
                                    </span>
                                </div>
                            </td>
                        ))}
                    </motion.tr>
                );
            })}
            {users.length === 0 && (
                <tr>
                    <td colSpan={columns.length + 3} className="px-4 py-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        No se encontraron usuarios con esos filtros.
                    </td>
                </tr>
            )}
        </>
    );
});

const BiometricoDashboard = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({ usuarios: [], areas: {}, establecimientos: [] });
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('usuarios'); // 'usuarios' | 'areas' | 'establecimientos'

    // Config Modal State
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [configData, setConfigData] = useState({ url: '', username: '', password: '' });
    const [savingConfig, setSavingConfig] = useState(false);
    const [configMsg, setConfigMsg] = useState(null);

    // Dynamic Columns State (Areas)
    const [selectedColumns, setSelectedColumns] = useState([]);
    const [showColumnSelector, setShowColumnSelector] = useState(false);

    // Dynamic Columns State (Usuarios)
    const [userSelectedColumns, setUserSelectedColumns] = useState([]);
    const [showUserColumnSelector, setShowUserColumnSelector] = useState(false);

    // Filters (Usuarios)
    const [areaFilter, setAreaFilter] = useState('');
    const [privilegeFilter, setPrivilegeFilter] = useState('');

    // Edit User Modal State
    const [editingUser, setEditingUser] = useState(null);
    const [editFormData, setEditFormData] = useState({});
    const [areaSearchTerm, setAreaSearchTerm] = useState('');
    const deferredAreaSearch = useDeferredValue(areaSearchTerm);
    const [savingUser, setSavingUser] = useState(false);
    const [editMsg, setEditMsg] = useState(null);

    // Add User Modal State
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [addFormData, setAddFormData] = useState({
        emp_code: '',
        first_name: '',
        last_name: '',
        email: '',
        dev_privilege: '0',
        area_list: []
    });
    const [addingUser, setAddingUser] = useState(false);
    const [addMsg, setAddMsg] = useState(null);

    const privilegeNames = useMemo(() => ({
        '0': 'Empleado',
        '2': 'Registrador',
        '6': 'Admin Sistema',
        '14': 'Super Administrador'
    }), []);

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [showOnlyDuplicateEmails, setShowOnlyDuplicateEmails] = useState(false);

    // Duplicate Emails Calculation
    const duplicateEmails = useMemo(() => {
        const counts = {};
        data.usuarios.forEach(u => {
            if (u.email && u.email.trim()) {
                const email = u.email.toLowerCase().trim();
                counts[email] = (counts[email] || 0) + 1;
            }
        });
        return Object.keys(counts).filter(email => counts[email] > 1);
    }, [data.usuarios]);

    // Click Outside for Column Selector
    const columnSelectorRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target)) {
                setShowUserColumnSelector(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const SortableHeader = ({ title, sortKey, alignCenter = false }) => (
        <th 
            className={`px-4 py-3 border-r border-slate-100 text-[10px] font-black uppercase tracking-widest bg-slate-50 cursor-pointer select-none hover:bg-slate-200 transition-colors text-slate-400 ${alignCenter ? 'text-center' : 'text-left'}`}
            onClick={() => requestSort(sortKey)}
        >
            <div className={`flex items-center gap-1.5 ${alignCenter ? 'justify-center' : 'justify-start'}`}>
                <span>{title}</span>
                {sortConfig.key === sortKey ? (
                    sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-indigo-600" /> : <ChevronDown className="w-3 h-3 text-indigo-600" />
                ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover:text-indigo-400" />
                )}
            </div>
        </th>
    );

    const availableColumns = Array.from(new Set(
        Object.values(data.areas).flatMap(area => Object.keys(area))
    )).sort();

    const availableUserColumns = Array.from(new Set(
        data.usuarios.flatMap(u => Object.keys(u))
    )).filter(c => !['emp_code', 'first_name', 'last_name'].includes(c)).sort();

    // Unique values for filters
    const uniqueAreas = data.establecimientos ? Array.from(new Set(data.establecimientos.map(e => e.area_name).filter(Boolean))).sort() : [];

    useEffect(() => {
        if (availableColumns.length > 0 && selectedColumns.length === 0) {
            const defaults = ['alias', 'terminal_name', 'sn', 'ip_address', 'state', 'id'];
            const initial = availableColumns.filter(c => defaults.includes(c));
            if (initial.length === 0) initial.push(...availableColumns.slice(0, 4));
            setSelectedColumns(initial);
        }
    }, [data.areas]);

    useEffect(() => {
        if (availableUserColumns.length > 0 && userSelectedColumns.length === 0) {
            const defaults = ['email', 'employee_area'];
            const initial = availableUserColumns.filter(c => defaults.includes(c));
            if (initial.length === 0) initial.push(...availableUserColumns.slice(0, 2));
            setUserSelectedColumns(initial);
        }
    }, [data.usuarios]);

    const toggleColumn = (col) => {
        setSelectedColumns(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
    };

    const toggleUserColumn = (col) => {
        setUserSelectedColumns(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
    };

    const fetchLocalData = async () => {
        try {
            const response = await api.get('biometrico/local-data/');
            setData(response.data.data);
        } catch (err) {
            console.error("Error cargando datos locales:", err);
        }
    };

    useEffect(() => {
        fetchLocalData();
    }, []);

    const fetchBiometricData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('biometrico/sync/');
            setData(response.data.data);
            setSearchTerm('');
            setSortConfig({ key: null, direction: 'asc' });
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Error al conectar con el sistema biométrico. Verifica la configuración.');
        } finally {
            setLoading(false);
        }
    };

    const fetchConfig = async () => {
        try {
            const res = await api.get('biometrico/config/');
            setConfigData(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (isConfigOpen) {
            fetchConfig();
            setConfigMsg(null);
        }
    }, [isConfigOpen]);

    const handleSaveConfig = async (e) => {
        e.preventDefault();
        setSavingConfig(true);
        setConfigMsg(null);
        try {
            await api.put('biometrico/config/', configData);
            setConfigMsg({ type: 'success', text: 'Configuración guardada exitosamente.' });
            setTimeout(() => setIsConfigOpen(false), 1500);
        } catch (err) {
            setConfigMsg({ type: 'error', text: 'Error al guardar la configuración.' });
        } finally {
            setSavingConfig(false);
        }
    };

    const handleOpenEdit = useCallback((u) => {
        // Determinar las áreas previas
        let selectedAreaCodes = [];
        if (Array.isArray(u.area)) {
            selectedAreaCodes = u.area.map(a => a.toString());
        } else if (typeof u.area === 'string') {
            selectedAreaCodes = u.area.split(',').map(a => a.trim());
        } else if (u.employee_area) {
            const currentAreaNames = u.employee_area.split(',').map(s => s.trim());
            selectedAreaCodes = data.establecimientos
                .filter(est => currentAreaNames.includes(est.area_name))
                .map(est => est.area_code.toString());
        }

        setEditingUser(u);
        setEditFormData({
            ...u,
            area_list: selectedAreaCodes,
            dev_privilege: normalizePrivilege(u.dev_privilege)
        });
        setAreaSearchTerm('');
        setEditMsg(null);
    }, [data.establecimientos]);

    const handleAddUser = async (e) => {
        if (e) e.preventDefault();
        setAddingUser(true);
        setAddMsg(null);

        try {
            // Preparar el nombre de las áreas para guardar en el raw_data local
            const newEmployeeAreaNames = addFormData.area_list
                .map(code => {
                    const est = data.establecimientos.find(e => e.area_code.toString() === code.toString());
                    return est ? est.area_name : null;
                })
                .filter(Boolean)
                .join(', ');

            const payload = {
                ...addFormData,
                employee_area: newEmployeeAreaNames,
                area: addFormData.area_list
            };

            await api.post('biometrico/usuarios/add/', payload);
            setAddMsg({ type: 'success', text: 'Usuario creado exitosamente.' });
            
            // Recargar datos locales para ver el nuevo usuario
            fetchLocalData();

            setTimeout(() => {
                setIsAddOpen(false);
                setAddMsg(null);
                setAddFormData({
                    emp_code: '',
                    first_name: '',
                    last_name: '',
                    email: '',
                    dev_privilege: '0',
                    area_list: []
                });
            }, 1500);
        } catch (err) {
            console.error(err);
            setAddMsg({ 
                type: 'error', 
                text: err.response?.data?.message || 'Error al conectar con el servidor biométrico.' 
            });
        } finally {
            setAddingUser(false);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setSavingUser(true);
        setEditMsg(null);
        try {
            // Reconstruimos el texto de áreas para la tabla local
            const newEmployeeAreaNames = data.establecimientos
                .filter(est => (editFormData.area_list || []).includes(est.area_code.toString()))
                .map(est => est.area_name)
                .join(',');

            // Enviamos el payload con los campos modificados
            const payload = {
                emp_code: editFormData.emp_code,
                first_name: editFormData.first_name,
                last_name: editFormData.last_name,
                email: editFormData.email,
                area: editFormData.area_list,
                employee_area: newEmployeeAreaNames,
                dev_privilege: parseInt(editFormData.dev_privilege || '0', 10)
            };
            
            await api.put(`biometrico/usuarios/${editingUser.id}/`, payload);
            
            // Actualizamos la tabla localmente sin volver a consultar
            setData(prev => {
                const newData = { ...prev };
                newData.usuarios = newData.usuarios.map(u => {
                    if (u.id === editingUser.id) {
                        return { ...u, ...payload };
                    }
                    return u;
                });
                return newData;
            });
            
            setEditMsg({ type: 'success', text: 'Usuario actualizado exitosamente en el Biométrico.' });
            setTimeout(() => {
                setEditingUser(null);
                setEditMsg(null);
                setAreaSearchTerm('');
            }, 1500);
        } catch (err) {
            console.error(err);
            setEditMsg({ type: 'error', text: err.response?.data?.message || 'Error al guardar. Verifica la conexión con el servidor biométrico.' });
        } finally {
            setSavingUser(false);
        }
    };

    const filteredUsers = useMemo(() => {
        let result = data.usuarios.filter(u => {
            // Text Search across fixed and selected columns
            const inCols = userSelectedColumns.some(col => String(u[col] || '').toLowerCase().includes(searchTerm.toLowerCase()));
            const inFixed = ['emp_code', 'first_name', 'last_name'].some(col => String(u[col] || '').toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesSearch = inCols || inFixed || searchTerm === '';

            // Dropdown filters
            const uArea = String(u.employee_area || '');

            // Un usuario puede pertenecer a múltiples áreas separadas por coma, así que usamos includes()
            const matchesArea = areaFilter === '' || uArea.toLowerCase().includes(areaFilter.toLowerCase());

            // Privilegio de dispositivo
            const uPrivilege = normalizePrivilege(u.dev_privilege);
            const matchesPrivilege = privilegeFilter === '' || uPrivilege === privilegeFilter;

            const matchesDuplicateEmail = !showOnlyDuplicateEmails || (u.email && duplicateEmails.includes(u.email.toLowerCase().trim()));

            return matchesSearch && matchesArea && matchesPrivilege && matchesDuplicateEmail;
        });

        if (sortConfig.key !== null) {
            result.sort((a, b) => {
                const aVal = String(a[sortConfig.key] || '').toLowerCase();
                const bVal = String(b[sortConfig.key] || '').toLowerCase();
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [data.usuarios, searchTerm, sortConfig, userSelectedColumns, areaFilter, privilegeFilter, showOnlyDuplicateEmails, duplicateEmails]);

    const filteredAreas = useMemo(() => {
        let result = Object.entries(data.areas).filter(([name, areaData]) => {
            const inName = name.toLowerCase().includes(searchTerm.toLowerCase());
            const inCols = selectedColumns.some(col => String(areaData[col] || '').toLowerCase().includes(searchTerm.toLowerCase()));
            return inName || inCols;
        });

        if (sortConfig.key !== null) {
            result.sort((a, b) => {
                let aVal = '';
                let bVal = '';

                if (sortConfig.key === '_name_') {
                    aVal = String(a[0]).toLowerCase();
                    bVal = String(b[0]).toLowerCase();
                } else if (sortConfig.key === '_state_') {
                    const sA = String(a[1].terminal_state || a[1].state || '').toLowerCase();
                    const sB = String(b[1].terminal_state || b[1].state || '').toLowerCase();
                    aVal = (sA.includes('state1') || sA === '1') ? '1' : '0';
                    bVal = (sB.includes('state1') || sB === '1') ? '1' : '0';
                } else {
                    aVal = String(a[1][sortConfig.key] || '').toLowerCase();
                    bVal = String(b[1][sortConfig.key] || '').toLowerCase();
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [data.areas, searchTerm, selectedColumns, sortConfig]);

    const filteredEstablecimientos = useMemo(() => {
        if (!data.establecimientos) return [];
        let result = data.establecimientos.filter(e => 
            (e.area_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (e.area_code || '').toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (sortConfig.key !== null) {
            result.sort((a, b) => {
                const aVal = String(a[sortConfig.key] || '').toLowerCase();
                const bVal = String(b[sortConfig.key] || '').toLowerCase();
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [data.establecimientos, searchTerm, sortConfig]);

    return (
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden">
            {/* Contenedor Superior (Cabecera) - Sin iconos en el título (Punto 1 y 2) */}
            <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                <div>
                    <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase">Sincronización Biométrico</h2>
                    <div className="flex items-center gap-2 mt-1.5">
                        <p className="text-[10px] md:text-xs font-medium text-slate-500 uppercase ml-0">Conexión directa con el sistema de control de asistencia.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button 
                        onClick={() => setIsAddOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
                        title="Agregar nuevo usuario"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nuevo Usuario</span>
                    </button>

                    <button
                        onClick={() => setIsConfigOpen(true)}
                        className="h-8 w-8 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center transition active:scale-95 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 shrink-0"
                        title="Configurar Conexión"
                    >
                        <Settings className="w-3.5 h-3.5" />
                    </button>
                    
                    <button
                        onClick={fetchBiometricData}
                        disabled={loading}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        <span>{loading ? 'Sincronizando...' : 'Extraer Datos'}</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-rose-50 text-rose-600 text-[10px] font-bold uppercase p-3 rounded-xl border border-rose-100 flex gap-2 items-center shrink-0">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    <span>{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
                {/* Tarjeta Usuarios */}
                <div 
                    onClick={() => { setViewMode('usuarios'); setSearchTerm(''); setShowUserColumnSelector(false); setSortConfig({ key: null, direction: 'asc' }); }}
                    className={`bg-white p-4 rounded-2xl shadow-sm border transition-all cursor-pointer flex items-center gap-4 group ${viewMode === 'usuarios' ? 'bg-indigo-50/50 border-indigo-300 ring-4 ring-indigo-500/10' : 'border-slate-100 hover:bg-slate-50 hover:border-indigo-200'}`}
                >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${viewMode === 'usuarios' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest line-clamp-1">Usuarios</h3>
                        <p className="text-lg font-black text-slate-800 leading-none mt-1">{data.usuarios.length}</p>
                    </div>
                </div>

                {/* Tarjeta Terminales */}
                <div 
                    onClick={() => { setViewMode('areas'); setSearchTerm(''); setShowColumnSelector(false); setSortConfig({ key: null, direction: 'asc' }); }}
                    className={`bg-white p-4 rounded-2xl shadow-sm border transition-all cursor-pointer flex items-center gap-4 group ${viewMode === 'areas' ? 'bg-emerald-50/50 border-emerald-300 ring-4 ring-emerald-500/10' : 'border-slate-100 hover:bg-slate-50 hover:border-emerald-200'}`}
                >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${viewMode === 'areas' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        <Server className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest line-clamp-1">Terminales</h3>
                        <p className="text-lg font-black text-slate-800 leading-none mt-1">{Object.keys(data.areas).length}</p>
                    </div>
                </div>

                {/* Tarjeta Establecimientos */}
                <div 
                    onClick={() => { setViewMode('establecimientos'); setSearchTerm(''); setSortConfig({ key: null, direction: 'asc' }); }}
                    className={`bg-white p-4 rounded-2xl shadow-sm border transition-all cursor-pointer flex items-center gap-4 group ${viewMode === 'establecimientos' ? 'bg-indigo-50/50 border-indigo-300 ring-4 ring-indigo-500/10' : 'border-slate-100 hover:bg-slate-50 hover:border-indigo-200'}`}
                >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${viewMode === 'establecimientos' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                        <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest line-clamp-1">Establecimientos</h3>
                        <p className="text-lg font-black text-slate-800 leading-none mt-1">{data.establecimientos ? data.establecimientos.length : 0}</p>
                    </div>
                </div>
            </div>

            {/* TABLA USUARIOS */}
            {(data.usuarios.length > 0 || Object.keys(data.areas).length > 0) && viewMode === 'usuarios' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-0 relative">
                    <AnimatePresence>
                        {loading && (
                            <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-[999] flex items-center justify-center">
                                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                            </div>
                        )}
                    </AnimatePresence>

                    <div className="p-3 bg-slate-50 border-b border-slate-200 shrink-0 flex flex-col lg:flex-row items-center gap-3 w-full">
                        {/* Buscador de Texto (Punto 3 y 9) */}
                        <div className="relative flex-1 w-full shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                            <input 
                                type="text" 
                                placeholder="BUSCAR POR NOMBRE, RUT O CORREO..." 
                                className="no-global w-full h-10 text-[10px] font-bold bg-white border border-slate-200 pl-10 pr-4 rounded-xl outline-none focus:border-indigo-500 uppercase transition-all shadow-sm placeholder:text-slate-300" 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                            />
                        </div>

                        {/* Selector de Unidades Orgánicas (Punto 3 y 9) */}
                        {uniqueAreas.length > 0 && (
                            <div className="relative w-full lg:w-48 shrink-0">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none z-10" />
                                <select 
                                    className="no-global w-full text-[10px] font-black uppercase tracking-widest pl-9 pr-8 h-10 rounded-xl border border-slate-200 outline-none cursor-pointer appearance-none bg-white text-slate-700 focus:border-indigo-500 shadow-sm bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem_1rem] bg-[right_0.5rem_center] bg-no-repeat" 
                                    value={areaFilter}
                                    onChange={(e) => setAreaFilter(e.target.value)}
                                >
                                    <option value="">TODAS LAS ÁREAS</option>
                                    {uniqueAreas.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>
                        )}

                        {/* Selector de Privilegios */}
                        <div className="relative w-full lg:w-48 shrink-0">
                            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none z-10" />
                            <select 
                                className="no-global w-full text-[10px] font-black uppercase tracking-widest pl-9 pr-8 h-10 rounded-xl border border-slate-200 outline-none cursor-pointer appearance-none bg-white text-slate-700 focus:border-indigo-500 shadow-sm bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem_1rem] bg-[right_0.5rem_center] bg-no-repeat" 
                                value={privilegeFilter}
                                onChange={(e) => setPrivilegeFilter(e.target.value)}
                            >
                                <option value="">TODOS LOS CARGOS</option>
                                <option value="0">EMPLEADO</option>
                                <option value="2">REGISTRADOR</option>
                                <option value="6">ADMIN SISTEMA</option>
                                <option value="14">SUPER ADMIN</option>
                            </select>
                        </div>

                        {/* Botón Duplicados */}
                        <button 
                            onClick={() => setShowOnlyDuplicateEmails(!showOnlyDuplicateEmails)}
                            className={`flex items-center justify-center gap-2 px-4 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm shrink-0 whitespace-nowrap ${showOnlyDuplicateEmails ? 'bg-amber-500 border border-amber-600 text-white shadow-lg shadow-amber-500/20' : 'bg-white border border-slate-200 text-slate-650 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700'}`}
                        >
                            <AlertTriangle className={`w-4 h-4 ${showOnlyDuplicateEmails ? 'text-white' : 'text-amber-500'}`} />
                            <span>DUPLICADOS</span>
                            {duplicateEmails.length > 0 && (
                                <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black border-2 ${showOnlyDuplicateEmails ? 'bg-white text-amber-600 border-amber-400' : 'bg-rose-500 text-white border-white shadow-sm'}`}>
                                    {duplicateEmails.length}
                                </span>
                            )}
                        </button>

                        {/* Botón Columnas */}
                        <div className="relative shrink-0" ref={columnSelectorRef}>
                            <button 
                                onClick={() => setShowUserColumnSelector(!showUserColumnSelector)}
                                className={`flex items-center justify-center gap-2 px-4 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm shrink-0 bg-white border border-slate-200 text-slate-650 hover:bg-slate-50`}
                            >
                                <Columns className="w-4 h-4" />
                                <span>COLUMNAS</span>
                            </button>

                            <AnimatePresence>
                                {showUserColumnSelector && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                        className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[60] overflow-hidden"
                                    >
                                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ver/Ocultar Columnas</span>
                                            <button onClick={() => setShowUserColumnSelector(false)} className="text-slate-400 hover:text-slate-600">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="max-h-72 overflow-y-auto p-2 space-y-0.5 custom-scrollbar bg-white">
                                            {availableUserColumns.map(col => (
                                                <label key={col} className="flex items-center gap-3 px-3 py-2 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors group">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={userSelectedColumns.includes(col)}
                                                        onChange={() => toggleUserColumn(col)}
                                                        className="w-4 h-4 rounded border-slate-300 accent-indigo-600"
                                                    />
                                                    <span className={`text-[10px] font-bold uppercase ${userSelectedColumns.includes(col) ? 'text-slate-900' : 'text-slate-500'}`}>{col}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="overflow-auto flex-1 bg-white custom-scrollbar">
                        <table className="w-full text-left border-collapse border-spacing-0">
                            <thead className="sticky top-0 z-10 shadow-sm">
                                <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-200">
                                    <SortableHeader title="Código" sortKey="emp_code" />
                                    <SortableHeader title="Nombre" sortKey="first_name" />
                                    <SortableHeader title="Apellido" sortKey="last_name" />
                                    {userSelectedColumns.map(col => (
                                        <SortableHeader key={col} title={col} sortKey={col} />
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <UserRows 
                                    users={filteredUsers}
                                    columns={userSelectedColumns}
                                    privilegeNames={privilegeNames}
                                    onEdit={handleOpenEdit}
                                    duplicateEmails={duplicateEmails}
                                />
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            {/* TABLA TERMINALES */}
            {(data.usuarios.length > 0 || Object.keys(data.areas).length > 0) && viewMode === 'areas' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-0 relative">
                    <div className="p-3 bg-slate-50 border-b border-slate-200 shrink-0 flex flex-col lg:flex-row items-center gap-3 w-full">
                        <div className="relative flex-1 w-full shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                            <input 
                                type="text" 
                                placeholder="BUSCAR TERMINAL..." 
                                className="no-global w-full h-10 text-[10px] font-bold bg-white border border-slate-200 pl-10 pr-4 rounded-xl outline-none focus:border-indigo-500 uppercase transition-all shadow-sm placeholder:text-slate-300" 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                            />
                        </div>

                        {/* Botón Columnas */}
                        <div className="relative shrink-0">
                            <button 
                                onClick={() => setShowColumnSelector(!showColumnSelector)}
                                className={`flex items-center justify-center gap-2 px-4 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm shrink-0 bg-white border border-slate-200 text-slate-650 hover:bg-slate-50`}
                            >
                                <Columns className="w-4 h-4" />
                                <span>COLUMNAS</span>
                            </button>

                            <AnimatePresence>
                                {showColumnSelector && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-2 overflow-hidden"
                                    >
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wide px-3 py-2 border-b border-slate-100 mb-2">
                                            Mostrar Datos Raw
                                        </div>
                                        <div className="max-h-60 overflow-y-auto custom-scrollbar px-1 space-y-1 bg-white">
                                            {availableColumns.map(col => (
                                                <label key={col} className="flex items-center gap-3 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedColumns.includes(col)}
                                                        onChange={() => toggleColumn(col)}
                                                        className="w-4 h-4 rounded border-slate-300 accent-indigo-600"
                                                    />
                                                    <span className="text-[10px] font-bold text-slate-700 truncate uppercase" title={col}>{col}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                    
                    <div className="overflow-auto flex-1 bg-white custom-scrollbar">
                        <table className="w-full text-left border-collapse border-spacing-0">
                            <thead className="sticky top-0 z-10 shadow-sm">
                                <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-200">
                                    <SortableHeader title="Nombre (Inferido)" sortKey="_name_" />
                                    <SortableHeader title="Estado" sortKey="_state_" alignCenter={true} />
                                    {selectedColumns.map(col => (
                                        <SortableHeader key={col} title={col} sortKey={col} />
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredAreas.map(([name, areaData], i) => (
                                    <motion.tr 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: i < 30 ? i * 0.01 : 0 }}
                                        key={name || i} 
                                        className="hover:bg-slate-50/50 transition-colors border-b border-slate-100"
                                    >
                                        <td className="px-4 py-2 border-r border-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-tighter whitespace-nowrap bg-white sticky left-0 z-0 shadow-[1px_0_0_0_#f1f5f9]">{name}</td>
                                        <td className="px-4 py-2 border-r border-slate-50 text-center text-[11px]">
                                            {(() => {
                                                const stateValue = String(areaData.terminal_state || areaData.state || '').toLowerCase();
                                                const isOnline = stateValue.includes('state1') || stateValue === '1';
                                                
                                                if (!stateValue || stateValue === 'undefined') return <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">-</span>;

                                                return isOnline ? (
                                                    <div className="flex justify-center" title="Conectado">
                                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)] border border-emerald-100 animate-pulse"></span>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-center" title="Desconectado">
                                                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.7)] border border-rose-100"></span>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        {selectedColumns.map(col => (
                                            <td key={col} className="px-4 py-2 border-r border-slate-50 text-[11px] font-medium text-slate-500 uppercase tracking-tighter whitespace-nowrap max-w-xs truncate" title={String(areaData[col] || '')}>
                                                {areaData[col] !== null && areaData[col] !== undefined ? String(areaData[col]) : '-'}
                                            </td>
                                        ))}
                                    </motion.tr>
                                ))}
                                {filteredAreas.length === 0 && (
                                    <tr>
                                        <td colSpan={selectedColumns.length + 2} className="px-4 py-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            No se encontraron terminales que coincidan con la búsqueda.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            {/* TABLA ESTABLECIMIENTOS */}
            {data.establecimientos && data.establecimientos.length > 0 && viewMode === 'establecimientos' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-0 relative">
                    <div className="p-3 bg-slate-50 border-b border-slate-200 shrink-0 flex flex-col lg:flex-row items-center gap-3 w-full">
                        <div className="relative flex-1 w-full shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                            <input 
                                type="text" 
                                placeholder="BUSCAR ESTABLECIMIENTO..." 
                                className="no-global w-full h-10 text-[10px] font-bold bg-white border border-slate-200 pl-10 pr-4 rounded-xl outline-none focus:border-indigo-500 uppercase transition-all shadow-sm placeholder:text-slate-300" 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                            />
                        </div>
                    </div>
                    
                    <div className="overflow-auto flex-1 bg-white custom-scrollbar">
                        <table className="w-full text-left border-collapse border-spacing-0">
                            <thead className="sticky top-0 z-10 shadow-sm">
                                <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-200">
                                    <SortableHeader title="Código Único" sortKey="area_code" />
                                    <SortableHeader title="Nombre del Establecimiento" sortKey="area_name" />
                                    <SortableHeader title="Última Sincronización" sortKey="last_sync" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredEstablecimientos.map((e, i) => (
                                    <motion.tr 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: i < 30 ? i * 0.01 : 0 }}
                                        key={e.area_code || i} 
                                        className="hover:bg-slate-50/50 transition-colors border-b border-slate-100"
                                    >
                                        <td className="px-4 py-2 border-r border-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-tighter whitespace-nowrap">
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono border border-slate-200">{e.area_code}</span>
                                        </td>
                                        <td className="px-4 py-2 border-r border-slate-50 text-[11px] font-semibold text-slate-655 uppercase tracking-tighter whitespace-nowrap">{e.area_name}</td>
                                        <td className="px-4 py-2 text-[11px] font-medium text-slate-500 uppercase tracking-tighter whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <CalendarClock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <span>{new Date(e.last_sync).toLocaleString('es-CL')}</span>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                                {filteredEstablecimientos.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="px-4 py-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            No se encontraron establecimientos que coincidan con la búsqueda.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            {/* Config Modal */}
            <AnimatePresence>
                {isConfigOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsConfigOpen(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999]"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col z-[10000]"
                        >
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                                <h2 className="text-lg font-bold text-slate-800 tracking-tight leading-none uppercase">
                                    Configuración de Conexión
                                </h2>
                                <button onClick={() => setIsConfigOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <form onSubmit={handleSaveConfig} className="p-6 space-y-4">
                                {configMsg && (
                                    <div className={`p-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${configMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                        {configMsg.text}
                                    </div>
                                )}
                                
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">URL del Sistema Biométrico</label>
                                    <input
                                        type="url"
                                        required
                                        value={configData.url}
                                        onChange={(e) => setConfigData({...configData, url: e.target.value})}
                                        placeholder="http://52.2.77.197:8081"
                                        className="no-global w-full h-10 text-[10px] font-bold bg-white border border-slate-200 px-3 rounded-xl outline-none focus:border-indigo-500 uppercase transition-all shadow-sm placeholder:text-slate-300"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Usuario Administrador</label>
                                    <input
                                        type="text"
                                        required
                                        value={configData.username}
                                        onChange={(e) => setConfigData({...configData, username: e.target.value})}
                                        className="no-global w-full h-10 text-[10px] font-bold bg-white border border-slate-200 px-3 rounded-xl outline-none focus:border-indigo-500 uppercase transition-all shadow-sm placeholder:text-slate-300"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Contraseña Administrador</label>
                                    <input
                                        type="password"
                                        required
                                        value={configData.password}
                                        onChange={(e) => setConfigData({...configData, password: e.target.value})}
                                        className="no-global w-full h-10 text-[10px] font-bold bg-white border border-slate-200 px-3 rounded-xl outline-none focus:border-indigo-500 transition-all shadow-sm"
                                    />
                                </div>

                                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsConfigOpen(false)}
                                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={savingConfig}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
                                    >
                                        <Save className="w-4 h-4" />
                                        <span>{savingConfig ? 'Guardando...' : 'Guardar Cambios'}</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit User Modal */}
            <AnimatePresence>
                {editingUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setEditingUser(null)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999]"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col z-[10000]"
                        >
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                                <h2 className="text-lg font-bold text-slate-800 tracking-tight leading-none uppercase">
                                    Editar Perfil Biométrico
                                </h2>
                                <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
                                {editMsg && (
                                    <div className={`p-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${editMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                        {editMsg.text}
                                    </div>
                                )}
                                
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">ID (No editable)</label>
                                    <input
                                        type="text"
                                        disabled
                                        value={editFormData.emp_code || ''}
                                        className="no-global w-full h-10 text-[10px] font-bold bg-slate-100 border border-slate-200 px-3 rounded-xl outline-none text-slate-400 cursor-not-allowed uppercase"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nombres</label>
                                    <input
                                        type="text"
                                        required
                                        value={editFormData.first_name || ''}
                                        onChange={(e) => setEditFormData({...editFormData, first_name: e.target.value})}
                                        className="no-global w-full h-10 text-[10px] font-bold bg-white border border-slate-200 px-3 rounded-xl outline-none focus:border-indigo-500 uppercase transition-all shadow-sm placeholder:text-slate-300"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Apellidos</label>
                                    <input
                                        type="text"
                                        value={editFormData.last_name || ''}
                                        onChange={(e) => setEditFormData({...editFormData, last_name: e.target.value})}
                                        className="no-global w-full h-10 text-[10px] font-bold bg-white border border-slate-200 px-3 rounded-xl outline-none focus:border-indigo-500 uppercase transition-all shadow-sm placeholder:text-slate-300"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Correo Electrónico</label>
                                    <input
                                        type="email"
                                        value={editFormData.email || ''}
                                        onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                                        className="no-global w-full h-10 text-[10px] font-bold bg-white border border-slate-200 px-3 rounded-xl outline-none focus:border-indigo-500 uppercase transition-all shadow-sm placeholder:text-slate-300"
                                    />
                                </div>
                                
                                <div className="space-y-1.5 border-t border-slate-100 pt-3 mt-3">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Privilegio de Dispositivo</label>
                                    <select
                                        value={editFormData.dev_privilege !== undefined ? String(editFormData.dev_privilege) : '0'}
                                        onChange={(e) => setEditFormData({...editFormData, dev_privilege: e.target.value})}
                                        className="no-global w-full text-[10px] font-black uppercase tracking-widest px-3 h-10 rounded-xl border border-slate-200 outline-none cursor-pointer appearance-none bg-white text-slate-700 focus:border-indigo-500 shadow-sm bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem_1rem] bg-[right_0.5rem_center] bg-no-repeat"
                                    >
                                        <option value="0">EMPLEADO</option>
                                        <option value="2">REGISTRADOR</option>
                                        <option value="6">ADMIN SISTEMA</option>
                                        <option value="14">SUPER ADMINISTRADOR</option>
                                    </select>
                                </div>
                                
                                <div className="space-y-1.5 border-t border-slate-100 pt-3 mt-3">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1 flex justify-between items-center">
                                        <span>Áreas / Establecimientos</span>
                                        <span className="text-slate-400 font-normal">{(editFormData.area_list || []).length} seleccionados</span>
                                    </label>

                                    {/* BUSCADOR DE ÁREAS */}
                                    <div className="relative mb-2">
                                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type="text"
                                            placeholder="BUSCAR ESTABLECIMIENTO..."
                                            value={areaSearchTerm}
                                            onChange={(e) => setAreaSearchTerm(e.target.value)}
                                            className="no-global w-full pl-9 pr-4 h-8 bg-white border border-slate-200 rounded-lg text-[9px] font-bold text-slate-700 uppercase focus:border-indigo-500 outline-none transition-all shadow-sm placeholder:text-slate-300"
                                        />
                                    </div>

                                    <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2 custom-scrollbar">
                                        {data.establecimientos
                                            .filter(est => est.area_name.toLowerCase().includes(deferredAreaSearch.toLowerCase()))
                                            .map(est => (
                                                <label key={est.area_code} className="flex items-center gap-3 text-[10px] font-bold text-slate-655 uppercase tracking-tight cursor-pointer hover:bg-slate-100 p-1.5 rounded transition-colors">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={(editFormData.area_list || []).includes(est.area_code.toString())}
                                                        onChange={(e) => {
                                                            const current = editFormData.area_list || [];
                                                            const newAreas = e.target.checked 
                                                                ? [...current, est.area_code.toString()]
                                                                : current.filter(c => c !== est.area_code.toString());
                                                            setEditFormData({...editFormData, area_list: newAreas});
                                                        }}
                                                        className="w-4 h-4 rounded border-slate-300 accent-indigo-600"
                                                    />
                                                    <span className="flex-1 truncate">{est.area_name}</span>
                                                </label>
                                            ))
                                        }
                                        {data.establecimientos.filter(est => est.area_name.toLowerCase().includes(areaSearchTerm.toLowerCase())).length === 0 && (
                                            <div className="text-center py-4 text-slate-400 text-[10px] font-bold uppercase tracking-widest italic">
                                                No se encontraron establecimientos
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setEditingUser(null)}
                                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={savingUser}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
                                    >
                                        <Save className="w-4 h-4" />
                                        <span>{savingUser ? 'Guardando...' : 'Guardar Cambios'}</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL AGREGAR USUARIO */}
            <AnimatePresence>
                {isAddOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAddOpen(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999]"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col z-[10000]"
                        >
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                                <h2 className="text-lg font-bold text-slate-800 tracking-tight leading-none uppercase">
                                    Agregar Usuario Biométrico
                                </h2>
                                <button onClick={() => setIsAddOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleAddUser} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">RUT / Código *</label>
                                        <input 
                                            required
                                            type="text"
                                            placeholder="Ej: 12345678"
                                            value={addFormData.emp_code}
                                            onChange={(e) => setAddFormData({...addFormData, emp_code: e.target.value})}
                                            className="no-global w-full h-10 text-[10px] font-bold bg-white border border-slate-200 px-3 rounded-xl outline-none focus:border-indigo-500 uppercase transition-all shadow-sm placeholder:text-slate-300"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Email</label>
                                        <input 
                                            type="email"
                                            placeholder="correo@ejemplo.cl"
                                            value={addFormData.email}
                                            onChange={(e) => setAddFormData({...addFormData, email: e.target.value})}
                                            className="no-global w-full h-10 text-[10px] font-bold bg-white border border-slate-200 px-3 rounded-xl outline-none focus:border-indigo-500 uppercase transition-all shadow-sm placeholder:text-slate-300"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nombre *</label>
                                        <input 
                                            required
                                            type="text"
                                            value={addFormData.first_name}
                                            onChange={(e) => setAddFormData({...addFormData, first_name: e.target.value})}
                                            className="no-global w-full h-10 text-[10px] font-bold bg-white border border-slate-200 px-3 rounded-xl outline-none focus:border-indigo-500 uppercase transition-all shadow-sm placeholder:text-slate-300"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Apellido</label>
                                        <input 
                                            type="text"
                                            value={addFormData.last_name}
                                            onChange={(e) => setAddFormData({...addFormData, last_name: e.target.value})}
                                            className="no-global w-full h-10 text-[10px] font-bold bg-white border border-slate-200 px-3 rounded-xl outline-none focus:border-indigo-500 uppercase transition-all shadow-sm placeholder:text-slate-300"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Privilegio de Dispositivo</label>
                                    <select
                                        value={addFormData.dev_privilege}
                                        onChange={(e) => setAddFormData({...addFormData, dev_privilege: e.target.value})}
                                        className="no-global w-full text-[10px] font-black uppercase tracking-widest px-3 h-10 rounded-xl border border-slate-200 outline-none cursor-pointer appearance-none bg-white text-slate-700 focus:border-indigo-500 shadow-sm bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem_1rem] bg-[right_0.5rem_center] bg-no-repeat"
                                    >
                                        <option value="0">EMPLEADO</option>
                                        <option value="2">REGISTRADOR</option>
                                        <option value="6">ADMIN SISTEMA</option>
                                        <option value="14">SUPER ADMINISTRADOR</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1 flex justify-between items-center">
                                        <span>Áreas / Establecimientos</span>
                                        <span className="text-slate-400 font-normal">{addFormData.area_list.length} seleccionados</span>
                                    </label>
                                    
                                    <div className="relative mb-2">
                                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type="text"
                                            placeholder="BUSCAR ESTABLECIMIENTO..."
                                            value={areaSearchTerm}
                                            onChange={(e) => setAreaSearchTerm(e.target.value)}
                                            className="no-global w-full pl-9 pr-4 h-8 bg-white border border-slate-200 rounded-lg text-[9px] font-bold text-slate-700 uppercase focus:border-indigo-500 outline-none transition-all shadow-sm placeholder:text-slate-300"
                                        />
                                    </div>

                                    <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2 custom-scrollbar">
                                        {data.establecimientos
                                            .filter(est => est.area_name.toLowerCase().includes(deferredAreaSearch.toLowerCase()))
                                            .map(est => (
                                                <label key={est.area_code} className="flex items-center gap-3 text-[10px] font-bold text-slate-655 uppercase tracking-tight cursor-pointer hover:bg-slate-100 p-1.5 rounded transition-colors">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={addFormData.area_list.includes(est.area_code.toString())}
                                                        onChange={(e) => {
                                                            const current = addFormData.area_list;
                                                            const newAreas = e.target.checked 
                                                                ? [...current, est.area_code.toString()]
                                                                : current.filter(c => c !== est.area_code.toString());
                                                            setAddFormData({...addFormData, area_list: newAreas});
                                                        }}
                                                        className="w-4 h-4 rounded border-slate-300 accent-indigo-600"
                                                    />
                                                    <span className="flex-1 truncate">{est.area_name}</span>
                                                </label>
                                            ))
                                        }
                                    </div>
                                </div>

                                {addMsg && (
                                    <div className="p-4 rounded-xl text-[10px] font-bold uppercase tracking-widest border flex items-center gap-3 bg-emerald-50 text-emerald-700 border-emerald-100">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span>{addMsg.text}</span>
                                    </div>
                                )}

                                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddOpen(false)}
                                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={addingUser}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
                                    >
                                        {addingUser ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        <span>{addingUser ? 'Creando...' : 'Crear Usuario'}</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BiometricoDashboard;
