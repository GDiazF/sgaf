import React, { useState, useEffect, useMemo, useDeferredValue, useCallback, useRef } from 'react';
import api from '../../api';
import { RefreshCw, Users, UserPlus, Search, Fingerprint, Settings, X, Save, Server, Columns, ChevronUp, ChevronDown, ArrowUpDown, Building2, CalendarClock, Filter, Shield, AlertTriangle } from 'lucide-react';
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
                        className={`hover:bg-blue-50/50 transition-colors ${isEmailDuplicate ? 'bg-amber-50/30' : ''}`}
                    >
                        <td className="px-6 py-3 font-medium">
                            <button 
                                onClick={() => onEdit(u)}
                                className="text-blue-600 hover:text-blue-800 hover:underline font-bold transition-colors focus:outline-none flex items-center gap-1.5"
                                title="Haz clic para editar usuario"
                            >
                                <Settings className="w-3.5 h-3.5 opacity-50" />
                                {u.emp_code}
                            </button>
                        </td>
                        <td className="px-6 py-3 text-slate-600 font-medium">{u.first_name}</td>
                        <td className="px-6 py-3 text-slate-600 font-medium">{u.last_name}</td>
                        {columns.map(col => (
                            <td key={col} className="px-6 py-3 text-slate-600 max-w-xs truncate" title={String(u[col] || '')}>
                                <div className="flex items-center gap-2">
                                    {col === 'email' && isEmailDuplicate && (
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Correo duplicado detectado" />
                                    )}
                                    <span className={col === 'email' && isEmailDuplicate ? 'text-amber-700 font-semibold' : ''}>
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
                    <td colSpan={columns.length + 3} className="px-6 py-8 text-center text-slate-500">
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
            className={`px-6 py-4 font-semibold text-slate-600 bg-slate-50 cursor-pointer select-none hover:bg-slate-100 transition-colors ${alignCenter ? 'text-center' : 'text-left'}`}
            onClick={() => requestSort(sortKey)}
        >
            <div className={`flex items-center gap-2 ${alignCenter ? 'justify-center' : 'justify-start'}`}>
                {title}
                {sortConfig.key === sortKey ? (
                    sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-500" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
                ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100" />
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

            const response = await api.post('biometrico/usuarios/add/', payload);
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
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 w-full relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <Fingerprint className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
                        Sincronización Biométrico
                    </h1>
                    <p className="text-slate-500 text-xs md:text-sm mt-1">Conexión directa con el sistema de control de asistencia.</p>
                </div>
                <div className="flex flex-row items-stretch gap-3 w-full md:w-auto">
                    <button 
                        onClick={() => setIsAddOpen(true)}
                        className="flex-1 md:flex-none flex justify-center items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-emerald-600/20 text-sm"
                        title="Agregar nuevo usuario"
                    >
                        <UserPlus className="w-5 h-5" />
                        <span className="font-bold">Nuevo Usuario</span>
                    </button>

                    <button
                        onClick={() => setIsConfigOpen(true)}
                        className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 rounded-xl transition-all shadow-sm flex items-center justify-center"
                        title="Configurar Conexión"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                    <button
                        onClick={fetchBiometricData}
                        disabled={loading}
                        className="flex-1 md:flex-none flex justify-center items-center gap-2 px-4 md:px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-600/20 text-sm"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? 'Sincronizando...' : 'Extraer Datos'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-3">
                    <span className="font-medium">{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Tarjeta Usuarios */}
                <div 
                    onClick={() => { setViewMode('usuarios'); setSearchTerm(''); setShowUserColumnSelector(false); setSortConfig({ key: null, direction: 'asc' }); }}
                    className={`p-6 rounded-2xl shadow-sm border transition-all cursor-pointer flex items-center gap-4 ${viewMode === 'usuarios' ? 'bg-blue-50/50 border-blue-300 ring-4 ring-blue-500/10' : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-blue-200'}`}
                >
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${viewMode === 'usuarios' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                        <Users className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Usuarios</p>
                        <p className="text-3xl font-bold text-slate-800">{data.usuarios.length}</p>
                    </div>
                </div>

                {/* Tarjeta Terminales */}
                <div 
                    onClick={() => { setViewMode('areas'); setSearchTerm(''); setShowColumnSelector(false); setSortConfig({ key: null, direction: 'asc' }); }}
                    className={`p-6 rounded-2xl shadow-sm border transition-all cursor-pointer flex items-center gap-4 ${viewMode === 'areas' ? 'bg-emerald-50/50 border-emerald-300 ring-4 ring-emerald-500/10' : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-emerald-200'}`}
                >
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${viewMode === 'areas' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        <Server className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Terminales</p>
                        <p className="text-3xl font-bold text-slate-800">{Object.keys(data.areas).length}</p>
                    </div>
                </div>

                {/* Tarjeta Establecimientos */}
                <div 
                    onClick={() => { setViewMode('establecimientos'); setSearchTerm(''); setSortConfig({ key: null, direction: 'asc' }); }}
                    className={`p-6 rounded-2xl shadow-sm border transition-all cursor-pointer flex items-center gap-4 ${viewMode === 'establecimientos' ? 'bg-indigo-50/50 border-indigo-300 ring-4 ring-indigo-500/10' : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-indigo-200'}`}
                >
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${viewMode === 'establecimientos' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                        <Building2 className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Establecimientos</p>
                        <p className="text-3xl font-bold text-slate-800">{data.establecimientos ? data.establecimientos.length : 0}</p>
                    </div>
                </div>
            </div>

            {/* TABLA USUARIOS */}
            {(data.usuarios.length > 0 || Object.keys(data.areas).length > 0) && viewMode === 'usuarios' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    
                    <div className="p-4 md:p-6 border-b border-slate-100 bg-white">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                            {/* Titulo y Buscador */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
                                <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2 shrink-0">
                                    <div className="p-2 bg-blue-50 rounded-lg">
                                        <Users className="w-5 h-5 text-blue-600" />
                                    </div>
                                    Usuarios
                                </h2>
                                
                                <div className="relative flex-1 sm:w-80">
                                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por nombre, RUT o correo..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400"
                                    />
                                </div>
                            </div>
                                       {/* Controles y Filtros */}
                            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                                
                                {/* Filtro Área */}
                                {uniqueAreas.length > 0 && (
                                    <div className="relative flex-1 sm:flex-none min-w-[160px]">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <Building2 className="w-4 h-4 text-slate-400" />
                                        </div>
                                        <select 
                                            className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 hover:border-slate-300 transition-all appearance-none cursor-pointer"
                                            value={areaFilter}
                                            onChange={(e) => setAreaFilter(e.target.value)}
                                        >
                                            <option value="">Todas las Áreas</option>
                                            {uniqueAreas.map(a => <option key={a} value={a}>{a}</option>)}
                                        </select>
                                    </div>
                                )}
                                
                                {/* Filtro Privilegio */}
                                <div className="relative flex-1 sm:flex-none min-w-[160px]">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <Shield className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <select 
                                        className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 hover:border-slate-300 transition-all appearance-none cursor-pointer"
                                        value={privilegeFilter}
                                        onChange={(e) => setPrivilegeFilter(e.target.value)}
                                    >
                                        <option value="">Todos los Cargos</option>
                                        <option value="0">Empleado</option>
                                        <option value="2">Registrador</option>
                                        <option value="6">Admin Sistema</option>
                                        <option value="14">Super Admin</option>
                                    </select>
                                </div>

                                {/* Botón Duplicados */}
                                <button 
                                    onClick={() => setShowOnlyDuplicateEmails(!showOnlyDuplicateEmails)}
                                    className={`relative group flex items-center justify-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-bold transition-all ${showOnlyDuplicateEmails ? 'bg-amber-500 border-amber-600 text-white shadow-lg shadow-amber-500/20' : 'bg-white border-slate-200 text-slate-600 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 shadow-sm'}`}
                                >
                                    <AlertTriangle className={`w-4 h-4 ${showOnlyDuplicateEmails ? 'text-white' : 'text-amber-500'}`} />
                                    <span>Duplicados</span>
                                    {duplicateEmails.length > 0 && (
                                        <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black border-2 ${showOnlyDuplicateEmails ? 'bg-white text-amber-600 border-amber-400' : 'bg-rose-500 text-white border-white shadow-sm'}`}>
                                            {duplicateEmails.length}
                                        </span>
                                    )}
                                </button>

                                {/* Selector de Columnas */}
                                <div className="relative" ref={columnSelectorRef}>
                                    <button 
                                        onClick={() => setShowUserColumnSelector(!showUserColumnSelector)}
                                        className={`flex items-center justify-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-bold transition-all ${showUserColumnSelector ? 'bg-slate-800 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`}
                                    >
                                        <Columns className="w-4 h-4" />
                                        <span>Columnas</span>
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
                                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ver/Ocultar Columnas</span>
                                                    <button onClick={() => setShowUserColumnSelector(false)} className="text-slate-400 hover:text-slate-600">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="max-h-72 overflow-y-auto p-2 space-y-0.5 sidebar-scrollbar">
                                                    {availableUserColumns.map(col => (
                                                        <label key={col} className="flex items-center gap-3 px-3 py-2 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors group">
                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${userSelectedColumns.includes(col) ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300 group-hover:border-blue-400'}`}>
                                                                {userSelectedColumns.includes(col) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                            </div>
                                                            <input 
                                                                type="checkbox" 
                                                                className="hidden"
                                                                checked={userSelectedColumns.includes(col)}
                                                                onChange={() => toggleUserColumn(col)}
                                                            />
                                                            <span className={`text-sm ${userSelectedColumns.includes(col) ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>{col}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-[600px] sidebar-scrollbar">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                <tr className="group">
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
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50 relative">
                        <h2 className="font-bold text-slate-700 flex items-center gap-2">
                            <Server className="w-5 h-5 text-emerald-500" /> Listado de Terminales
                        </h2>
                        
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                            <div className="relative w-full sm:w-auto">
                                <button 
                                    onClick={() => setShowColumnSelector(!showColumnSelector)}
                                    className={`flex items-center justify-center gap-2 px-3 py-2 border rounded-xl text-sm font-medium transition-all w-full sm:w-auto ${showColumnSelector ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`}
                                >
                                    <Columns className="w-4 h-4" />
                                    Columnas
                                </button>

                                {/* Selector de Columnas Popup */}
                                <AnimatePresence>
                                    {showColumnSelector && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className="absolute right-0 sm:right-0 left-0 sm:left-auto top-full mt-2 w-full sm:w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2"
                                        >
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide px-3 py-2 border-b border-slate-100 mb-2">
                                                Mostrar Datos Raw
                                            </div>
                                            <div className="max-h-60 overflow-y-auto sidebar-scrollbar px-1 space-y-1">
                                                {availableColumns.map(col => (
                                                    <label key={col} className="flex items-center gap-3 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedColumns.includes(col)}
                                                            onChange={() => toggleColumn(col)}
                                                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                        />
                                                        <span className="text-sm text-slate-700 truncate" title={col}>{col}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="relative w-full sm:flex-1 md:flex-none">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar terminal..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full sm:w-64 pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto max-h-[600px] sidebar-scrollbar">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                <tr className="group">
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
                                        className="hover:bg-emerald-50/50 transition-colors"
                                    >
                                        <td className="px-6 py-3 font-bold text-slate-700 bg-white sticky left-0 z-0 shadow-[1px_0_0_0_#f1f5f9]">{name}</td>
                                        <td className="px-6 py-3 text-center">
                                            {(() => {
                                                const stateValue = String(areaData.terminal_state || areaData.state || '').toLowerCase();
                                                const isOnline = stateValue.includes('state1') || stateValue === '1';
                                                
                                                if (!stateValue || stateValue === 'undefined') return <span className="text-slate-400 text-xs">-</span>;

                                                return isOnline ? (
                                                    <div className="flex justify-center" title="Conectado">
                                                        <span className="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] border-2 border-emerald-100 animate-pulse"></span>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-center" title="Desconectado">
                                                        <span className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)] border-2 border-red-100"></span>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        {selectedColumns.map(col => (
                                            <td key={col} className="px-6 py-3 text-slate-500 font-mono text-xs max-w-xs truncate" title={String(areaData[col] || '')}>
                                                {areaData[col] !== null && areaData[col] !== undefined ? String(areaData[col]) : '-'}
                                            </td>
                                        ))}
                                    </motion.tr>
                                ))}
                                {filteredAreas.length === 0 && (
                                    <tr>
                                        <td colSpan={selectedColumns.length + 2} className="px-6 py-8 text-center text-slate-500">
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
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
                        <h2 className="font-bold text-slate-700 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-indigo-500" /> Base de Datos de Establecimientos
                        </h2>
                        <div className="relative w-full md:w-auto">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar establecimiento..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full md:w-64 pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto max-h-[600px] sidebar-scrollbar">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                <tr className="group">
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
                                        className="hover:bg-indigo-50/50 transition-colors"
                                    >
                                        <td className="px-6 py-4 font-bold text-slate-700">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-mono">{e.area_code}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-medium">{e.area_name}</td>
                                        <td className="px-6 py-4 text-slate-500">
                                            <div className="flex items-center gap-2 text-xs">
                                                <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
                                                {new Date(e.last_sync).toLocaleString()}
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                                {filteredEstablecimientos.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-8 text-center text-slate-500">
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsConfigOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                    <Settings className="w-5 h-5 text-blue-600" />
                                    Configuración de Conexión
                                </h3>
                                <button onClick={() => setIsConfigOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <form onSubmit={handleSaveConfig} className="p-6 space-y-4">
                                {configMsg && (
                                    <div className={`p-3 rounded-lg text-sm font-medium ${configMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                        {configMsg.text}
                                    </div>
                                )}
                                
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">URL del Sistema Biométrico</label>
                                    <input
                                        type="url"
                                        required
                                        value={configData.url}
                                        onChange={(e) => setConfigData({...configData, url: e.target.value})}
                                        placeholder="http://52.2.77.197:8081"
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Usuario Administrador</label>
                                    <input
                                        type="text"
                                        required
                                        value={configData.username}
                                        onChange={(e) => setConfigData({...configData, username: e.target.value})}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Contraseña Administrador</label>
                                    <input
                                        type="password"
                                        required
                                        value={configData.password}
                                        onChange={(e) => setConfigData({...configData, password: e.target.value})}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                    />
                                </div>

                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsConfigOpen(false)}
                                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors text-sm"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={savingConfig}
                                        className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-md shadow-blue-600/20 disabled:opacity-70 text-sm"
                                    >
                                        <Save className="w-4 h-4" />
                                        {savingConfig ? 'Guardando...' : 'Guardar Cambios'}
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setEditingUser(null)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-blue-600" />
                                    Editar Perfil Biométrico
                                </h3>
                                <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                                {editMsg && (
                                    <div className={`p-3 rounded-lg text-sm font-medium ${editMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                        {editMsg.text}
                                    </div>
                                )}
                                
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">ID (No editable)</label>
                                    <input
                                        type="text"
                                        disabled
                                        value={editFormData.emp_code || ''}
                                        className="w-full px-4 py-2 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl focus:outline-none transition-all text-sm cursor-not-allowed"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nombres</label>
                                    <input
                                        type="text"
                                        required
                                        value={editFormData.first_name || ''}
                                        onChange={(e) => setEditFormData({...editFormData, first_name: e.target.value})}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Apellidos</label>
                                    <input
                                        type="text"
                                        value={editFormData.last_name || ''}
                                        onChange={(e) => setEditFormData({...editFormData, last_name: e.target.value})}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Correo Electrónico</label>
                                    <input
                                        type="email"
                                        value={editFormData.email || ''}
                                        onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                    />
                                </div>
                                
                                <div className="space-y-1.5 border-t border-slate-100 pt-3 mt-3">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Privilegio de Dispositivo</label>
                                    <select
                                        value={editFormData.dev_privilege !== undefined ? String(editFormData.dev_privilege) : '0'}
                                        onChange={(e) => setEditFormData({...editFormData, dev_privilege: e.target.value})}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm bg-white cursor-pointer"
                                    >
                                        <option value="0">Empleado</option>
                                        <option value="2">Registrador</option>
                                        <option value="6">Admin Sistema</option>
                                        <option value="14">Super Administrador</option>
                                    </select>
                                </div>
                                
                                <div className="space-y-1.5 border-t border-slate-100 pt-3 mt-3">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex justify-between items-center">
                                        <span>Áreas / Establecimientos</span>
                                        <span className="text-slate-400 font-normal">{(editFormData.area_list || []).length} seleccionados</span>
                                    </label>

                                    {/* BUSCADOR DE ÁREAS */}
                                    <div className="relative mb-2">
                                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type="text"
                                            placeholder="Buscar establecimiento..."
                                            value={areaSearchTerm}
                                            onChange={(e) => setAreaSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-300 bg-white"
                                        />
                                    </div>

                                    <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2 sidebar-scrollbar">
                                        {data.establecimientos
                                            .filter(est => est.area_name.toLowerCase().includes(deferredAreaSearch.toLowerCase()))
                                            .map(est => (
                                                <label key={est.area_code} className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer hover:bg-slate-100 p-1.5 rounded transition-colors">
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
                                                        className="rounded border-slate-300 w-4 h-4 text-blue-600 focus:ring-blue-500 transition-shadow"
                                                    />
                                                    <span className="flex-1 truncate">{est.area_name}</span>
                                                </label>
                                            ))
                                        }
                                        {data.establecimientos.filter(est => est.area_name.toLowerCase().includes(areaSearchTerm.toLowerCase())).length === 0 && (
                                            <div className="text-center py-4 text-slate-400 text-xs italic">
                                                No se encontraron establecimientos
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setEditingUser(null)}
                                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors text-sm"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={savingUser}
                                        className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-md shadow-blue-600/20 disabled:opacity-70 text-sm"
                                    >
                                        <Save className="w-4 h-4" />
                                        {savingUser ? 'Guardando...' : 'Guardar Cambios'}
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
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
                        >
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md">
                                        <UserPlus className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold leading-none mb-1">Agregar Usuario</h3>
                                        <p className="text-blue-100 text-xs">Registrar nuevo personal en BioTime</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsAddOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleAddUser} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto sidebar-scrollbar">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">RUT / Código *</label>
                                        <input 
                                            required
                                            type="text"
                                            placeholder="Ej: 12345678"
                                            value={addFormData.emp_code}
                                            onChange={(e) => setAddFormData({...addFormData, emp_code: e.target.value})}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Email</label>
                                        <input 
                                            type="email"
                                            placeholder="correo@ejemplo.cl"
                                            value={addFormData.email}
                                            onChange={(e) => setAddFormData({...addFormData, email: e.target.value})}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nombre *</label>
                                        <input 
                                            required
                                            type="text"
                                            value={addFormData.first_name}
                                            onChange={(e) => setAddFormData({...addFormData, first_name: e.target.value})}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Apellido</label>
                                        <input 
                                            type="text"
                                            value={addFormData.last_name}
                                            onChange={(e) => setAddFormData({...addFormData, last_name: e.target.value})}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Privilegio de Dispositivo</label>
                                    <select
                                        value={addFormData.dev_privilege}
                                        onChange={(e) => setAddFormData({...addFormData, dev_privilege: e.target.value})}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm bg-white cursor-pointer"
                                    >
                                        <option value="0">Empleado</option>
                                        <option value="2">Registrador</option>
                                        <option value="6">Admin Sistema</option>
                                        <option value="14">Super Administrador</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex justify-between items-center">
                                        <span>Áreas / Establecimientos</span>
                                        <span className="text-slate-400 font-normal">{addFormData.area_list.length} seleccionados</span>
                                    </label>
                                    
                                    <div className="relative mb-2">
                                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type="text"
                                            placeholder="Buscar establecimiento..."
                                            value={areaSearchTerm}
                                            onChange={(e) => setAreaSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-300 bg-white"
                                        />
                                    </div>

                                    <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2 sidebar-scrollbar">
                                        {data.establecimientos
                                            .filter(est => est.area_name.toLowerCase().includes(deferredAreaSearch.toLowerCase()))
                                            .map(est => (
                                                <label key={est.area_code} className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer hover:bg-slate-100 p-1.5 rounded transition-colors">
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
                                                        className="rounded border-slate-300 w-4 h-4 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="flex-1 truncate">{est.area_name}</span>
                                                </label>
                                            ))
                                        }
                                    </div>
                                </div>

                                {addMsg && (
                                    <div className={`p-4 rounded-2xl text-sm font-medium flex items-center gap-3 ${addMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                                        <div className={`w-2 h-2 rounded-full ${addMsg.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
                                        {addMsg.text}
                                    </div>
                                )}

                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddOpen(false)}
                                        className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={addingUser}
                                        className={`px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 flex items-center gap-2 transition-all ${addingUser ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700 hover:scale-105 active:scale-95'}`}
                                    >
                                        {addingUser ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        {addingUser ? 'Creando...' : 'Crear Usuario'}
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
