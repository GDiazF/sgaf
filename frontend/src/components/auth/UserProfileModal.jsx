import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import BaseModal from '../common/BaseModal';
import {
    User, Mail, Shield, Camera, Lock, KeyRound,
    AlertCircle, CheckCircle2, UserCircle2,
    IdCard, Briefcase, Building2, MapPin, BadgeCheck,
    Smartphone, QrCode, ArrowLeft, RefreshCw, XCircle
} from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { QRCodeCanvas } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';

const UserProfileModal = ({ isOpen, onClose }) => {
    const { user, checkUserStatus } = useAuth();

    // UI States
    const [view, setView] = useState('INFO'); // 'INFO', 'PASSWORD', 'MFA_CHOOSE', 'MFA_TOTP', 'MFA_EMAIL'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Password State
    const [passwordData, setPasswordData] = useState({
        old_password: '',
        new_password: '',
        confirm_password: ''
    });

    const location = useLocation();

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setView('INFO');
            setError('');
            setSuccess('');
            setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
        }
    }, [isOpen]);

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('avatar', file);
        setLoading(true);
        setError('');
        try {
            await api.post('auth/avatar/', formData);
            await checkUserStatus();
            setSuccess('Foto de perfil actualizada.');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('No se pudo subir la imagen.');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async () => {
        setError('');
        if (!passwordData.old_password || !passwordData.new_password || !passwordData.confirm_password) {
            setError('Todos los campos son obligatorios.');
            return;
        }
        if (passwordData.new_password !== passwordData.confirm_password) {
            setError('Las nuevas contraseñas no coinciden.');
            return;
        }
        setLoading(true);
        try {
            await api.post('auth/change-password/', {
                old_password: passwordData.old_password,
                new_password: passwordData.new_password
            });
            setSuccess('Contraseña actualizada correctamente.');
            setView('INFO');
            setTimeout(() => setSuccess(''), 5000);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al actualizar contraseña.');
        } finally {
            setLoading(false);
        }
    };

    // MFA Methods

    const InfoItem = ({ icon: Icon, label, value, colorClass = "text-blue-500", bgClass = "bg-blue-50" }) => (
        <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm transition-all group">
            <div className={`p-2 ${bgClass} ${colorClass} rounded-lg`}>
                <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
                <p className="text-[11px] font-bold text-slate-700 truncate">{value || 'No especificado'}</p>
            </div>
        </div>
    );

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Detalles del Perfil"
            subtitle="Información de cuenta y seguridad"
            icon={UserCircle2}
            maxWidth="max-w-lg"
            footer={
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-[11px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-900 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onClose}
                        className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Actualizar
                    </button>
                </div>
            }
        >
            <div className="space-y-4 py-2">
                {/* Header Profile */}
                <div className="flex items-center gap-4 px-1 pb-4 border-b border-slate-50">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-2xl border-2 border-white shadow-lg overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-2xl text-white font-black ring-1 ring-slate-100">
                            {user?.avatar ? (
                                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                (user?.funcionario_data?.nombre_funcionario || user?.username)?.charAt(0).toUpperCase()
                            )}
                        </div>
                        <label className="absolute -bottom-1 -right-1 p-1 bg-white text-blue-600 rounded-lg shadow-lg cursor-pointer hover:bg-slate-50 border border-slate-100">
                            <Camera className="w-3 h-3" />
                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={loading} />
                        </label>
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-black text-slate-800 tracking-tight leading-tight uppercase truncate">
                            {user?.funcionario_data?.nombre_funcionario || user?.username}
                        </h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">@{user?.username}</p>
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[8px] uppercase font-black tracking-widest border border-blue-100">
                            {user?.is_superuser ? 'ADMINISTRADOR' : (user?.groups?.[0]?.toUpperCase() || 'USUARIO')}
                        </div>
                    </div>
                </div>

                {/* Feedback */}
                {(error || success) && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-3 rounded-2xl flex gap-2.5 items-center ${error ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}
                    >
                        {error ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        <p className="text-xs font-bold">{error || success}</p>
                    </motion.div>
                )}

                <AnimatePresence mode="wait">
                    {view === 'INFO' && (
                        <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2 px-1">
                            <InfoItem icon={IdCard} label="RUT / RUN" value={user?.funcionario_data?.rut} />
                            <InfoItem icon={Briefcase} label="Cargo" value={user?.funcionario_data?.cargo} colorClass="text-emerald-500" bgClass="bg-emerald-50" />
                            <InfoItem icon={Mail} label="E-MAIL" value={user?.email} />
                            <InfoItem icon={Building2} label="Departamento" value={user?.funcionario_data?.departamento} colorClass="text-purple-500" bgClass="bg-purple-50" />
                            <InfoItem icon={MapPin} label="UNIDAD" value={user?.funcionario_data?.unidad} colorClass="text-orange-500" bgClass="bg-orange-50" />

                            <button
                                onClick={() => setView('PASSWORD')}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95 mt-1"
                            >
                                <Lock className="w-3.5 h-3.5" />
                                Cambiar Contraseña
                            </button>
                        </motion.div>
                    )}

                    {view === 'PASSWORD' && (
                        <motion.div key="pass" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <button onClick={() => setView('INFO')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                    <ArrowLeft className="w-4 h-4 text-slate-500" />
                                </button>
                                <h4 className="font-black text-slate-800 uppercase text-xs">Cambio de Contraseña</h4>
                            </div>
                            <div className="space-y-3">
                                <input
                                    type="password"
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-slate-900 outline-none transition-all text-sm font-bold"
                                    placeholder="Contraseña Actual"
                                    value={passwordData.old_password}
                                    onChange={e => setPasswordData({ ...passwordData, old_password: e.target.value })}
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="password"
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-slate-900 outline-none transition-all text-sm font-bold"
                                        placeholder="Nueva Clave"
                                        value={passwordData.new_password}
                                        onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                    />
                                    <input
                                        type="password"
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-slate-900 outline-none transition-all text-sm font-bold"
                                        placeholder="Repetir Nueva"
                                        value={passwordData.confirm_password}
                                        onChange={e => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                    />
                                </div>
                                <button
                                    onClick={handlePasswordSubmit}
                                    disabled={loading}
                                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50"
                                >
                                    {loading ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : "Guardar Nueva Clave"}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </BaseModal>
    );
};

export default UserProfileModal;
