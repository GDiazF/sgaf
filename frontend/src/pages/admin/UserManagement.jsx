import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api';
import { Users, Search, Edit2, Shield, ShieldCheck, X, Save, AlertCircle, Check, Loader2, ChevronDown, ChevronRight, UserCircle2, Mail, BadgeCheck, Activity, Trash2, Power, User, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePermission } from '../../hooks/usePermission';
import { groupPermissions, getFriendlyPermName } from '../../utils/permissionUtils';
import Pagination from '../../components/common/Pagination';
import SortableHeader from '../../components/common/SortableHeader';
import { formatRut, validateRut } from '../../utils/rutValidator';


const UserManagement = () => {
    const { can } = usePermission();
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [ordering, setOrdering] = useState('username');
    const [currentPage, setCurrentPage] = useState(1);

    // Accordion state for permissions
    const [expandedGroups, setExpandedGroups] = useState({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, rolesRes, permsRes] = await Promise.all([
                api.get('admin/users/'),
                api.get('admin/roles/'),
                api.get('admin/permissions/')
            ]);

            // Filter out superusers from the frontend management list
            const nonSuperUsers = (Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.results || [])
                .filter(u => !u.is_superuser);

            setUsers(nonSuperUsers);
            setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : rolesRes.data.results || []);
            setPermissions(Array.isArray(permsRes.data) ? permsRes.data : permsRes.data.results || []);
        } catch (error) {
            console.error("Error fetching admin data:", error);
        } finally {
            setLoading(false);
        }
    };

    const groupedPermissions = useMemo(() => groupPermissions(permissions), [permissions]);

    const handleEdit = (user) => {
        setSelectedUser({
            ...user,
            password: '',
            rut: user.funcionario_data?.rut || ''
        });
        setIsModalOpen(true);
    };

    const handleNew = () => {
        setSelectedUser({
            username: '',
            email: '',
            first_name: '',
            last_name: '',
            is_active: true,
            password: '',
            rut: '',
            groups: [],
            user_permissions: []
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            // Clean payload
            const { funcionario_data, is_superuser, ...cleanData } = selectedUser;

            // Only include password if it's not empty
            const payload = { ...cleanData };
            if (!payload.password) delete payload.password;

            if (selectedUser.id) {
                await api.patch(`admin/users/${selectedUser.id}/`, payload);
            } else {
                await api.post('admin/users/', payload);
            }
            await fetchData();
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving user:", error);
            alert("Error al guardar usuario. Verifique los datos e intente nuevamente.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Está seguro de eliminar este usuario?")) return;
        try {
            await api.delete(`admin/users/${id}/`);
            await fetchData();
        } catch (error) {
            console.error("Error deleting user:", error);
            alert("No se pudo eliminar el usuario.");
        }
    };

    const toggleUserStatus = async (user) => {
        try {
            await api.patch(`admin/users/${user.id}/`, {
                is_active: !user.is_active
            });
            await fetchData();
        } catch (error) {
            console.error("Error toggling user status:", error);
            alert("No se pudo cambiar el estado del usuario.");
        }
    };

    const toggleGroup = (groupName) => {
        const newGroups = selectedUser.groups.includes(groupName)
            ? selectedUser.groups.filter(g => g !== groupName)
            : [...selectedUser.groups, groupName];
        setSelectedUser({ ...selectedUser, groups: newGroups });
    };

    const togglePermission = (permId) => {
        const newPerms = selectedUser.user_permissions.includes(permId)
            ? selectedUser.user_permissions.filter(p => p !== permId)
            : [...selectedUser.user_permissions, permId];
        setSelectedUser({ ...selectedUser, user_permissions: newPerms });
    };

    const handleRutChange = (e) => {
        const formatted = formatRut(e.target.value);
        setSelectedUser({ ...selectedUser, rut: formatted });
    };

    const toggleSelectAll = (modulePerms) => {
        const permIds = modulePerms.map(p => p.id);
        const allSelected = permIds.every(id => selectedUser.user_permissions.includes(id));

        let newPerms;
        if (allSelected) {
            newPerms = selectedUser.user_permissions.filter(id => !permIds.includes(id));
        } else {
            newPerms = Array.from(new Set([...selectedUser.user_permissions, ...permIds]));
        }
        setSelectedUser({ ...selectedUser, user_permissions: newPerms });
    };

    const toggleAccordion = (module) => {
        setExpandedGroups(prev => ({ ...prev, [module]: !prev[module] }));
    };

    const handleSort = (newOrdering) => {
        setOrdering(newOrdering);
    };

    const filteredUsers = useMemo(() => {
        let result = users.filter(u =>
            u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.funcionario_data?.nombre_funcionario || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.funcionario_data?.rut || '').toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (ordering) {
            const isDesc = ordering.startsWith('-');
            const key = isDesc ? ordering.substring(1) : ordering;
            result.sort((a, b) => {
                const valA = (a[key] || '').toString().toLowerCase();
                const valB = (b[key] || '').toString().toLowerCase();
                if (valA < valB) return isDesc ? 1 : -1;
                if (valA > valB) return isDesc ? -1 : 1;
                return 0;
            });
        }
        return result;
    }, [users, searchQuery, ordering]);

    const usersPerPage = 10;
    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * usersPerPage;
        return filteredUsers.slice(start, start + usersPerPage);
    }, [filteredUsers, currentPage]);

    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

    if (!can('auth.view_user')) return <div className="p-10 text-center font-bold text-slate-400">Acceso denegado.</div>;

    return (
        <div className="p-6 lg:p-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50/30">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Usuarios y Permisos</h2>
                    <p className="text-slate-500 text-sm">Administración de acceso al sistema.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar usuario..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm transition-all focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                    </div>

                    {can('auth.add_user') && (
                        <button
                            onClick={handleNew}
                            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 font-medium whitespace-nowrap"
                        >
                            <UserPlus className="w-5 h-5" />
                            <span>Nuevo Usuario</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                <SortableHeader label="Usuario" sortKey="username" currentOrdering={ordering} onSort={handleSort} />
                                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Funcionario Vinculado / RUT</th>
                                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Roles</th>
                                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-slate-400">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
                                        Cargando usuarios...
                                    </td>
                                </tr>
                            ) : paginatedUsers.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50 transition-colors text-xs">
                                    <td className="p-3">
                                        <button
                                            onClick={() => toggleUserStatus(user)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black transition-all hover:scale-105 active:scale-95 ${user.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                            title={user.is_active ? 'Desactivar Cuenta' : 'Activar Cuenta'}
                                        >
                                            <Power className="w-3 h-3" />
                                            {user.is_active ? 'ACTIVO' : 'INACTIVO'}
                                        </button>
                                    </td>
                                    <td className="p-3 font-semibold text-slate-900">{user.username}</td>
                                    <td className="p-3 text-slate-600">
                                        <div className="flex flex-col">
                                            {user.funcionario_data ? (
                                                <>
                                                    <span className="font-bold text-slate-900">{user.funcionario_data.nombre_funcionario}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono">{user.funcionario_data.rut}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-slate-900">{user.first_name || user.last_name ? `${user.first_name} ${user.last_name}` : <span className="text-slate-300 italic">Sin nombre</span>}</span>
                                                    <span className="text-[10px] text-slate-300 italic">No vinculado a funcionario</span>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-3 text-slate-600">{user.email || <span className="text-slate-300 italic">Sin email</span>}</td>
                                    <td className="p-3">
                                        <div className="flex flex-wrap gap-1">
                                            {user.groups.length > 0 ? user.groups.map(g => (
                                                <span key={g} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[9px] font-bold border border-blue-100">
                                                    {g}
                                                </span>
                                            )) : <span className="text-[10px] text-slate-400">Sin roles</span>}
                                        </div>
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            {can('auth.change_user') && (
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                    title="Editar Acceso"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            {can('auth.delete_user') && (
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {!loading && filteredUsers.length === 0 && (
                        <div className="p-12 text-center text-slate-400">
                            <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No se encontraron usuarios.</p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/30">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalCount={filteredUsers.length}
                    />
                </div>
            </div>

            {/* Modal Refinement */}
            <AnimatePresence>
                {isModalOpen && selectedUser && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative bg-white w-full max-w-5xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-slate-200"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                                        <ShieldCheck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800">
                                            {selectedUser.id ? 'Refinar Permisos de Usuario' : 'Nuevo Usuario'}
                                        </h3>
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Configuración de Seguridad</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-10">
                                {/* Top Section: Basic Info & Roles */}
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-8">
                                        {/* Row 0: Headers */}
                                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2 flex items-center gap-2">
                                            <User className="w-3.5 h-3.5" /> Identificación
                                        </h4>
                                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2 flex items-center gap-2">
                                            <UserCircle2 className="w-3.5 h-3.5" /> Datos Personales
                                        </h4>
                                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2 flex items-center gap-2">
                                            <Shield className="w-3.5 h-3.5" /> Seguridad
                                        </h4>

                                        {/* Row 1: First field of each category */}
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight ml-1 text-blue-600">RUT Funcionario</label>
                                            <input
                                                type="text"
                                                placeholder="12345678-9"
                                                value={selectedUser.rut || ''}
                                                onChange={handleRutChange}
                                                className="w-full px-4 py-2 bg-blue-50/50 border border-blue-100 rounded-xl text-xs font-mono font-bold focus:border-blue-500 outline-none uppercase"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight ml-1">Nombre</label>
                                                <input
                                                    type="text"
                                                    value={selectedUser.first_name || ''}
                                                    onChange={(e) => setSelectedUser({ ...selectedUser, first_name: e.target.value })}
                                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:border-blue-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight ml-1">Apellido</label>
                                                <input
                                                    type="text"
                                                    value={selectedUser.last_name || ''}
                                                    onChange={(e) => setSelectedUser({ ...selectedUser, last_name: e.target.value })}
                                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:border-blue-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight ml-1">
                                                {selectedUser.id ? 'Cambiar Contraseña' : 'Contraseña'}
                                            </label>
                                            <input
                                                type="password"
                                                placeholder={selectedUser.id ? "Mantener actual..." : "Establecer..."}
                                                value={selectedUser.password || ''}
                                                onChange={(e) => setSelectedUser({ ...selectedUser, password: e.target.value })}
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-blue-500 outline-none"
                                            />
                                        </div>

                                        {/* Row 2: Second field of each category */}
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight ml-1">Username</label>
                                            <input
                                                type="text"
                                                value={selectedUser.username}
                                                autoComplete="off"
                                                disabled={!!selectedUser.id}
                                                onChange={(e) => setSelectedUser({ ...selectedUser, username: e.target.value })}
                                                className={`w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:border-blue-500 outline-none ${selectedUser.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight ml-1">Email</label>
                                            <input
                                                type="email"
                                                value={selectedUser.email || ''}
                                                onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:border-blue-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight ml-1">Estado de la Cuenta</label>
                                            <div className="w-full px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between min-h-[38px]">
                                                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                                                    {selectedUser.is_active ? 'Activa' : 'Inactiva'}
                                                </span>
                                                <label htmlFor="user-active-toggle" className="relative cursor-pointer">
                                                    <input
                                                        id="user-active-toggle"
                                                        type="checkbox"
                                                        className="sr-only"
                                                        checked={selectedUser.is_active}
                                                        onChange={(e) => setSelectedUser({ ...selectedUser, is_active: e.target.checked })}
                                                    />
                                                    <div className={`w-10 h-5 rounded-full transition-all duration-300 ${selectedUser.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                                    <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-all duration-300 transform ${selectedUser.is_active ? 'translate-x-5' : ''} shadow-sm`} />
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Roles Section - Full Width */}
                                    <div className="space-y-4 pt-2">
                                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Roles Asignados</h4>
                                        <div className="max-w-xl">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight ml-1 mb-1.5 block">Seleccionar Roles (Mantenga Ctrl para múltiples)</label>
                                            <select
                                                multiple
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 outline-none min-h-[100px] transition-all"
                                                value={selectedUser.groups}
                                                onChange={(e) => {
                                                    const options = Array.from(e.target.selectedOptions, option => option.value);
                                                    setSelectedUser({ ...selectedUser, groups: options });
                                                }}
                                            >
                                                {roles.map(role => (
                                                    <option key={role.id} value={role.name} className="py-2 px-1 rounded-lg mb-1 checked:bg-blue-600 checked:text-white">
                                                        {role.name.toUpperCase()}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-[9px] text-slate-400 mt-2 italic ml-1">
                                                Los roles definen los permisos base del usuario. Puede seleccionar uno o varios.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Section: Permissions Overrides */}
                                <div className="space-y-6 pt-10 border-t border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Activity className="w-4 h-4 text-blue-500" />
                                                Permisos Individuales (Overrides)
                                            </h4>
                                            <p className="text-[10px] text-slate-400 font-medium mt-1">Configure permisos específicos adicionales a los roles seleccionados.</p>
                                        </div>
                                        <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                            {selectedUser.user_permissions.length} Permisos activos
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {Object.entries(groupedPermissions).map(([module, perms]) => (
                                            <div key={module} className="bg-slate-50/50 border border-slate-100 rounded-3xl overflow-hidden flex flex-col">
                                                <button
                                                    onClick={() => toggleAccordion(module)}
                                                    className="w-full flex items-center justify-between p-4 hover:bg-white transition-all group border-b border-transparent data-[expanded=true]:border-slate-100"
                                                    data-expanded={expandedGroups[module]}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${expandedGroups[module] ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-300 border border-slate-100'}`}>
                                                            {expandedGroups[module] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                        </div>
                                                        <span className="font-bold text-[11px] text-slate-700 uppercase tracking-widest">{module}</span>
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); toggleSelectAll(perms); }}
                                                            className="text-[9px] font-black text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 transition-all active:scale-95"
                                                        >
                                                            {perms.every(p => selectedUser.user_permissions.includes(p.id)) ? 'LIMPIAR' : 'TODOS'}
                                                        </button>
                                                        <span className="text-[10px] font-bold text-slate-400 min-w-[30px] text-right">
                                                            {perms.filter(p => selectedUser.user_permissions.includes(p.id)).length}/{perms.length}
                                                        </span>
                                                    </div>
                                                </button>

                                                <AnimatePresence>
                                                    {expandedGroups[module] && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="p-4 grid grid-cols-1 gap-1.5 bg-white/40">
                                                                {perms.map(perm => (
                                                                    <button
                                                                        key={perm.id}
                                                                        type="button"
                                                                        onClick={() => togglePermission(perm.id)}
                                                                        className={`flex items-center gap-2.5 p-2 rounded-xl text-left transition-all border ${selectedUser.user_permissions.includes(perm.id) ? 'bg-blue-600 text-white border-blue-700 shadow-sm' : 'bg-white text-slate-500 border-slate-100 hover:border-blue-200'}`}
                                                                    >
                                                                        <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${selectedUser.user_permissions.includes(perm.id) ? 'bg-white/20 text-white' : 'bg-slate-100'}`}>
                                                                            {selectedUser.user_permissions.includes(perm.id) && <Check className="w-2.5 h-2.5" />}
                                                                        </div>
                                                                        <span className="text-[10px] font-bold truncate leading-tight">{getFriendlyPermName(perm)}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                                <p className="text-[9px] font-bold text-slate-400 max-w-sm uppercase leading-relaxed tracking-wider">
                                    Los permisos individuales se suman a los roles otorgados. El usuario deberá reiniciar su sesión para aplicar cambios mayores.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-6 py-2.5 rounded-xl text-slate-500 font-bold hover:bg-slate-100 transition-all text-xs"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 active:scale-95 disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Guardar Cambios
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UserManagement;
