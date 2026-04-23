import React, { useState, useEffect } from 'react';
import {
    Shield, ShieldCheck, ShieldAlert, RefreshCw,
    User, Mail, Search, AlertCircle, CheckCircle2,
    ToggleLeft, ToggleRight, Trash2, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';

const SecurityManagement = () => {
    const [globalConfig, setGlobalConfig] = useState({ force_mfa_all: false });
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [configRes, usersRes] = await Promise.all([
                api.get('admin/security/config/'),
                api.get('admin/security/mfa-users/')
            ]);
            setGlobalConfig(configRes.data);
            setUsers(usersRes.data);
        } catch (err) {
            setError('Error al cargar datos de seguridad');
        } finally {
            setLoading(false);
        }
    };

    const handleGlobalToggle = async () => {
        const newValue = !globalConfig.force_mfa_all;
        try {
            await api.post('admin/security/config/', { force_mfa_all: newValue });
            setGlobalConfig({ force_mfa_all: newValue });
            setSuccess(`MFA ${newValue ? 'forzado globalmente' : 'opcional globalmente'}`);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Error al actualizar configuración global');
        }
    };

    const handleUserAction = async (userId, action) => {
        try {
            await api.post('admin/security/mfa-users/', { user_id: userId, action });
            setSuccess('Acción realizada correctamente');
            fetchData(); // Recargar lista
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Error al realizar acción sobre el usuario');
        }
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Gestión de Seguridad MFA</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Control de acceso y autenticación de doble factor</p>
                </div>

                {/* Global Switch Card */}
                <div className={`p-4 rounded-3xl border-2 transition-all duration-300 flex items-center gap-4 ${globalConfig.force_mfa_all ? 'bg-blue-50 border-blue-100 shadow-lg shadow-blue-500/10' : 'bg-white border-slate-100'}`}>
                    <div className={`p-3 rounded-2xl ${globalConfig.force_mfa_all ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">MFA Global Obligatorio</p>
                        <p className="text-sm font-black text-slate-800 uppercase">{globalConfig.force_mfa_all ? 'Activado' : 'Desactivado'}</p>
                    </div>
                    <button onClick={handleGlobalToggle} className="ml-4 transition-transform active:scale-90">
                        {globalConfig.force_mfa_all ? <ToggleRight className="w-12 h-12 text-blue-600" /> : <ToggleLeft className="w-12 h-12 text-slate-300" />}
                    </button>
                </div>
            </div>

            {/* Notifications */}
            <AnimatePresence>
                {(error || success) && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`p-4 rounded-2xl flex items-center gap-3 ${error ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}
                    >
                        {error ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                        <span className="text-xs font-bold uppercase tracking-wide">{error || success}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* User List */}
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30">
                    <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-slate-400" />
                        <h3 className="font-black text-slate-700 uppercase text-sm tracking-widest">Usuarios del Sistema</h3>
                    </div>
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por usuario o email..."
                            className="w-full pl-11 pr-4 py-2.5 bg-white border-2 border-slate-100 rounded-2xl focus:border-blue-600 outline-none transition-all text-xs font-bold"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                <th className="px-6 py-4">Usuario</th>
                                <th className="px-6 py-4">Estado MFA</th>
                                <th className="px-6 py-4">Obligatoriedad</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center">
                                        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Cargando usuarios...</p>
                                    </td>
                                </tr>
                            ) : filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold">
                                                {user.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-700 uppercase tracking-tight">{user.username}</p>
                                                <p className="text-[10px] text-slate-400 font-bold lowercase">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {user.mfa_enabled ? (
                                                <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase border border-emerald-100">
                                                    <ShieldCheck className="w-3 h-3" /> {user.mfa_method}
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-400 rounded-full text-[9px] font-black uppercase border border-slate-200">
                                                    <ShieldAlert className="w-3 h-3" /> Inactivo
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleUserAction(user.id, user.mfa_enforced ? 'UNENFORCE' : 'ENFORCE')}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${user.mfa_enforced ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:border-blue-600'}`}
                                        >
                                            {user.mfa_enforced ? 'Obligatorio' : 'Opcional'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('¿Deseas resetear el MFA de este usuario? Deberá configurarlo nuevamente.')) {
                                                        handleUserAction(user.id, 'RESET');
                                                    }
                                                }}
                                                className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all group/btn"
                                                title="Resetear MFA"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SecurityManagement;
