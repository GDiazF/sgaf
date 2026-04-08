import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api';
import { Shield, Plus, Search, Edit2, Trash2, X, Save, Check, Loader2, ChevronDown, ChevronRight, Layout, Info, ShieldAlert, Power } from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import { motion, AnimatePresence } from 'framer-motion';
import { groupPermissions, getFriendlyPermName } from '../../utils/permissionUtils';
import SortableHeader from '../../components/common/SortableHeader';
import Pagination from '../../components/common/Pagination';

const RolesManagement = () => {
    const { can } = usePermission();
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [roleName, setRoleName] = useState('');
    const [selectedPermissions, setSelectedPermissions] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [ordering, setOrdering] = useState('name');
    const [currentPage, setCurrentPage] = useState(1);

    // Accordion state for permissions
    const [expandedGroups, setExpandedGroups] = useState({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [rolesRes, permsRes] = await Promise.all([
                api.get('admin/roles/'),
                api.get('admin/permissions/')
            ]);

            setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : rolesRes.data.results || []);
            setPermissions(Array.isArray(permsRes.data) ? permsRes.data : permsRes.data.results || []);
        } catch (error) {
            console.error("Error fetching admin data:", error);
        } finally {
            setLoading(false);
        }
    };

    const groupedPermissions = useMemo(() => groupPermissions(permissions), [permissions]);

    const handleEdit = (role) => {
        setEditingId(role.id);
        setRoleName(role.name);
        setSelectedPermissions(role.permissions);
        setIsModalOpen(true);
    };

    const handleNew = () => {
        setEditingId(null);
        setRoleName('');
        setSelectedPermissions([]);
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!roleName) return;
        setSaving(true);
        try {
            const data = { name: roleName, permissions: selectedPermissions };
            if (editingId) {
                await api.put(`admin/roles/${editingId}/`, data);
            } else {
                await api.post('admin/roles/', data);
            }
            await fetchData();
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving role:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Está seguro de eliminar este rol?")) return;
        try {
            await api.delete(`admin/roles/${id}/`);
            await fetchData();
        } catch (error) {
            console.error("Error deleting role:", error);
        }
    };

    const togglePermission = (permId) => {
        setSelectedPermissions(prev =>
            prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
        );
    };

    const toggleSelectAll = (modulePerms) => {
        const permIds = modulePerms.map(p => p.id);
        const allSelected = permIds.every(id => selectedPermissions.includes(id));

        if (allSelected) {
            setSelectedPermissions(prev => prev.filter(id => !permIds.includes(id)));
        } else {
            setSelectedPermissions(prev => Array.from(new Set([...prev, ...permIds])));
        }
    };

    const toggleAccordion = (module) => {
        setExpandedGroups(prev => ({ ...prev, [module]: !prev[module] }));
    };

    const handleSort = (newOrdering) => {
        setOrdering(newOrdering);
    };

    const filteredRoles = useMemo(() => {
        let result = roles.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
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
    }, [roles, searchQuery, ordering]);

    const rolesPerPage = 8;
    const paginatedRoles = useMemo(() => {
        const start = (currentPage - 1) * rolesPerPage;
        return filteredRoles.slice(start, start + rolesPerPage);
    }, [filteredRoles, currentPage]);

    const totalPages = Math.ceil(filteredRoles.length / rolesPerPage);

    if (!can('auth.view_group')) return <div className="p-10 text-center font-bold text-slate-400">Acceso denegado.</div>;

    return (
        <div className="p-6 lg:p-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50/30">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Roles del Sistema</h2>
                    <p className="text-slate-500 text-sm">Grupos y permisos predefinidos.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar rol..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm transition-all focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                    </div>

                    {can('auth.add_group') && (
                        <button
                            onClick={handleNew}
                            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 font-medium whitespace-nowrap"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Nuevo Rol</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Table View */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <colgroup>
                            <col style={{ width: '60px' }} />  {/* Icon */}
                            <col style={{ width: '40%' }} />   {/* Nombre */}
                            <col style={{ width: '40%' }} />   {/* Permisos */}
                            <col style={{ width: '120px' }} /> {/* Acciones */}
                        </colgroup>
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider"></th>
                                <SortableHeader label="Nombre del Rol" sortKey="name" currentOrdering={ordering} onSort={handleSort} />
                                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Total Permisos</th>
                                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="p-12 text-center text-slate-400">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
                                        Cargando roles...
                                    </td>
                                </tr>
                            ) : paginatedRoles.map(role => (
                                <tr key={role.id} className="hover:bg-slate-50 transition-colors text-xs">
                                    <td className="p-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center">
                                            <Shield className="w-4 h-4" />
                                        </div>
                                    </td>
                                    <td className="p-3 font-semibold text-slate-900 uppercase tracking-tight">{role.name}</td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-slate-600">{role.permissions.length}</span>
                                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500"
                                                    style={{ width: `${Math.min((role.permissions.length / permissions.length) * 100, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            {can('auth.change_group') && (
                                                <button
                                                    onClick={() => handleEdit(role)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            {can('auth.delete_group') && (
                                                <button
                                                    onClick={() => handleDelete(role.id)}
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

                    {!loading && filteredRoles.length === 0 && (
                        <div className="p-12 text-center text-slate-400">
                            <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No se encontraron roles.</p>
                        </div>
                    )}

                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalCount={filteredRoles.length}
                    />
                </div>
            </div>

            {/* Modal Refinement */}
            <AnimatePresence>
                {isModalOpen && (
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
                                        <Layout className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800">
                                            {editingId ? 'Editar Definición de Rol' : 'Nuevo Rol de Sistema'}
                                        </h3>
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Matriz de Permisos</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                                <div className="max-w-xl">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Nombre del Rol</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Encargado de Activos"
                                        value={roleName}
                                        onChange={(e) => setRoleName(e.target.value)}
                                        className="w-full px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold placeholder:text-slate-300 focus:bg-white focus:border-blue-500 outline-none transition-all uppercase"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Info className="w-4 h-4 text-blue-500" />
                                            Configuración de Privilegios por Módulo
                                        </h4>
                                        <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                            {selectedPermissions.length} SELECCIONADOS
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2">
                                        {Object.entries(groupedPermissions).map(([module, perms]) => (
                                            <div key={module} className="bg-slate-50/50 border border-slate-100 rounded-2xl overflow-hidden">
                                                <div className="w-full flex items-center justify-between p-4 hover:bg-white transition-all group">
                                                    <button
                                                        onClick={() => toggleAccordion(module)}
                                                        className="flex flex-1 items-center gap-3"
                                                    >
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${expandedGroups[module] ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-300 border border-slate-100'}`}>
                                                            {expandedGroups[module] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                        </div>
                                                        <span className="font-bold text-[11px] text-slate-700 uppercase tracking-widest">{module}</span>
                                                    </button>

                                                    <div className="flex items-center gap-4">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); toggleSelectAll(perms); }}
                                                            className="text-[9px] font-black text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 transition-all active:scale-95"
                                                        >
                                                            {perms.every(p => selectedPermissions.includes(p.id)) ? 'DESMARCAR TODO' : 'MARCAR TODO'}
                                                        </button>
                                                        <span className="text-[10px] font-bold text-slate-400 min-w-[40px] text-right">
                                                            {perms.filter(p => selectedPermissions.includes(p.id)).length} de {perms.length} activos
                                                        </span>
                                                    </div>
                                                </div>

                                                <AnimatePresence>
                                                    {expandedGroups[module] && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden bg-white/40 border-t border-slate-100"
                                                        >
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-white border-t border-slate-100">
                                                                {perms.map(perm => (
                                                                    <label
                                                                        key={perm.id}
                                                                        className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer group/item ${selectedPermissions.includes(perm.id)
                                                                            ? 'bg-blue-50/50 border-blue-200 shadow-sm'
                                                                            : 'bg-white border-slate-100 hover:border-blue-100 hover:bg-slate-50/50'
                                                                            }`}
                                                                    >
                                                                        <div className="relative flex items-center mt-0.5">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={selectedPermissions.includes(perm.id)}
                                                                                onChange={() => togglePermission(perm.id)}
                                                                                className="peer appearance-none w-5 h-5 border-2 border-slate-200 rounded-lg checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer"
                                                                            />
                                                                            <Check className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-all pointer-events-none" />
                                                                        </div>
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <span className={`text-[11px] font-bold transition-colors ${selectedPermissions.includes(perm.id) ? 'text-blue-900' : 'text-slate-700'}`}>
                                                                                {getFriendlyPermName(perm)}
                                                                            </span>
                                                                            <span className="text-[9px] font-medium text-slate-400 group-hover/item:text-slate-500 transition-colors uppercase tracking-tight">
                                                                                CÓDIGO: {perm.codename}
                                                                            </span>
                                                                        </div>
                                                                    </label>
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
                                    Asignar este rol a los usuarios les concederá todos los permisos seleccionados arriba de forma inmediata.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-6 py-2.5 rounded-xl text-slate-500 font-bold hover:bg-slate-100 transition-all text-xs"
                                    >
                                        Descartar
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving || !roleName}
                                        className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 active:scale-95 disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        EFECTUAR CAMBIOS
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

export default RolesManagement;
