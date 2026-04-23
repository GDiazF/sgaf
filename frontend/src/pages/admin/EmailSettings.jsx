import React, { useState, useEffect } from 'react';
import {
    Mail, Server, Shield, Key, Save, RefreshCw,
    CheckCircle2, AlertCircle, Eye, EyeOff, Send,
    Bell, Settings2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';

const EmailSettings = () => {
    const [config, setConfig] = useState({
        smtp_host: '',
        smtp_port: 587,
        smtp_user: '',
        smtp_password: '',
        smtp_use_tls: true,
        smtp_use_ssl: false,
        default_from_email: '',
        reservas_admin_email: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [status, setStatus] = useState(null);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const response = await api.get('admin/email/config/');
            setConfig(prev => ({ ...prev, ...response.data, smtp_password: '' }));
        } catch (error) {
            console.error("Error fetching email config:", error);
            showStatus('error', 'Error al cargar la configuración.');
        } finally {
            setLoading(false);
        }
    };

    const showStatus = (type, message) => {
        setStatus({ type, message });
        setTimeout(() => setStatus(null), 5000);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setConfig(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            const dataToSave = { ...config };
            if (!dataToSave.smtp_password) {
                delete dataToSave.smtp_password;
            }

            await api.post('admin/email/config/', dataToSave);
            showStatus('success', 'Configuración actualizada correctamente.');
            if (config.smtp_password) {
                setConfig(prev => ({ ...prev, smtp_password: '' }));
            }
        } catch (error) {
            console.error("Error saving email config:", error);
            showStatus('error', 'Error al guardar la configuración.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center space-y-4 bg-slate-50">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando...</p>
            </div>
        );
    }

    return (
        <div className="w-full px-4 md:px-8 py-6 space-y-6 min-h-screen bg-slate-50/30">
            {/* Header - Responsive adjustments */}
            <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="p-2.5 md:p-3 bg-blue-600 text-white rounded-xl md:rounded-2xl shadow-lg shadow-blue-500/20">
                        <Mail className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div>
                        <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight uppercase">Configuración de Correo</h1>
                        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gestión de SMTP y Notificaciones</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
                    <AnimatePresence>
                        {status && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-3 md:px-4 py-2 rounded-xl border text-[9px] md:text-[10px] font-bold uppercase tracking-wider ${status.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}
                            >
                                {status.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <AlertCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                                {status.message}
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all disabled:opacity-50 shadow-lg shadow-slate-900/10"
                    >
                        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span className="hidden sm:inline">Guardar Cambios</span>
                        <span className="sm:hidden">Guardar</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                {/* SMTP Server Configuration - Left Column */}
                <section className="bg-white rounded-2xl md:rounded-[2rem] border border-slate-200 shadow-sm p-5 md:p-8 flex flex-col h-full">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Server className="w-5 h-5" />
                        </div>
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Servidor de Salida (SMTP)</h2>
                    </div>

                    <div className="flex-1 space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="space-y-1.5 md:space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Host del Servidor</label>
                                <div className="relative">
                                    <Server className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        name="smtp_host"
                                        value={config.smtp_host}
                                        onChange={handleChange}
                                        placeholder="smtp.gmail.com"
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:bg-white transition-all outline-none text-xs font-semibold text-slate-700"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5 md:space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Puerto</label>
                                <div className="relative">
                                    <Settings2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="number"
                                        name="smtp_port"
                                        value={config.smtp_port}
                                        onChange={handleChange}
                                        placeholder="587"
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:bg-white transition-all outline-none text-xs font-semibold text-slate-700"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5 md:space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Usuario / Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="email"
                                    name="smtp_user"
                                    value={config.smtp_user}
                                    onChange={handleChange}
                                    placeholder="ejemplo@gmail.com"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:bg-white transition-all outline-none text-xs font-semibold text-slate-700"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 md:space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Contraseña SMTP</label>
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="smtp_password"
                                    value={config.smtp_password}
                                    onChange={handleChange}
                                    placeholder="••••••••••••"
                                    className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:bg-white transition-all outline-none text-xs font-semibold text-slate-700"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-lg transition-colors text-slate-400"
                                >
                                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                            <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider ml-1">Solo para cambiar la actual.</p>
                        </div>
                    </div>
                </section>

                {/* Sending Configuration - Right Column */}
                <section className="bg-white rounded-2xl md:rounded-[2rem] border border-slate-200 shadow-sm p-5 md:p-8 flex flex-col h-full">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Send className="w-5 h-5" />
                        </div>
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Opciones de Envío y Notificación</h2>
                    </div>

                    <div className="flex-1 space-y-5">
                        <div className="space-y-1.5 md:space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Identidad Remitente</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    name="default_from_email"
                                    value={config.default_from_email}
                                    onChange={handleChange}
                                    placeholder="SLEP Iquique <noreply@slepiquique.cl>"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white transition-all outline-none text-xs font-semibold text-slate-700"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 md:space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email Sistema Reservas</label>
                            <div className="relative">
                                <Bell className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="email"
                                    name="reservas_admin_email"
                                    value={config.reservas_admin_email}
                                    onChange={handleChange}
                                    placeholder="soporte@slepiquique.cl"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white transition-all outline-none text-xs font-semibold text-slate-700"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <label className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${config.smtp_use_tls ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                <div className="flex items-center gap-2.5">
                                    <Shield className={`w-4 h-4 ${config.smtp_use_tls ? 'text-blue-600' : 'text-slate-400'}`} />
                                    <span className="text-[10px] font-bold uppercase">TLS (Port 587)</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={config.smtp_use_tls}
                                    onChange={(e) => setConfig({ ...config, smtp_use_tls: e.target.checked })}
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                            </label>

                            <label className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${config.smtp_use_ssl ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                <div className="flex items-center gap-2.5">
                                    <Shield className={`w-4 h-4 ${config.smtp_use_ssl ? 'text-blue-600' : 'text-slate-400'}`} />
                                    <span className="text-[10px] font-bold uppercase">SSL (Port 465)</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={config.smtp_use_ssl}
                                    onChange={(e) => setConfig({ ...config, smtp_use_ssl: e.target.checked })}
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                            </label>
                        </div>
                    </div>

                    <div className="mt-5 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                        <p className="text-[9px] font-bold text-indigo-600 leading-relaxed uppercase tracking-wider text-center">
                            Ajustes generales para el despacho y recepción de avisos del sistema.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default EmailSettings;
