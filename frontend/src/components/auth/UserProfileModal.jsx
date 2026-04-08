import React, { useState } from 'react';
import BaseModal from '../common/BaseModal';
import {
    User, Mail, Shield, Camera, Lock, KeyRound,
    AlertCircle, CheckCircle2, UserCircle2,
    IdCard, Briefcase, Building2, MapPin, BadgeCheck
} from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

const UserProfileModal = ({ isOpen, onClose }) => {
    const { user, checkUserStatus } = useAuth();
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordData, setPasswordData] = useState({
        old_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Reset state when modal closes
    React.useEffect(() => {
        if (!isOpen) {
            setIsChangingPassword(false);
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
            setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
            setIsChangingPassword(false);
            setTimeout(() => setSuccess(''), 5000);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al actualizar contraseña.');
            setLoading(false);
        } finally {
            setLoading(false);
        }
    };

    const InfoItem = ({ icon: Icon, label, value, colorClass = "text-blue-500", bgClass = "bg-blue-50" }) => (
        <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm transition-all duration-300 group">
            <div className={`p-2 ${bgClass} ${colorClass} rounded-lg`}>
                <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
                <p className="text-sm font-medium text-slate-600 break-words">{value || 'No especificado'}</p>
            </div>
        </div>
    );

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            onSave={isChangingPassword ? handlePasswordSubmit : null}
            title="Detalles del Perfil"
            subtitle="Información de cuenta y seguridad"
            icon={UserCircle2}
            saveLabel={loading ? "Guardando..." : "Actualizar"}
            showCancel={true}
            cancelLabel={isChangingPassword ? "Regresar" : "Cerrar"}
            onCancel={isChangingPassword ? () => setIsChangingPassword(false) : onClose}
            hideFooter={!isChangingPassword}
            maxWidth="max-w-2xl"
        >
            <div className="space-y-3 py-0.5">
                {/* Compact Header */}
                <div className="flex items-center gap-5 px-1 pb-3 border-b border-slate-50">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-2xl border-2 border-white shadow-xl overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-4xl text-white font-medium transition-all duration-500 ring-1 ring-slate-100">
                            {user?.avatar ? (
                                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                user?.username?.charAt(0).toUpperCase()
                            )}
                        </div>
                        <label className="absolute -bottom-1 -right-1 p-1.5 bg-white text-blue-600 rounded-lg shadow-lg cursor-pointer hover:bg-slate-50 transition-all border border-slate-100">
                            <Camera className="w-3.5 h-3.5" />
                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={loading} />
                        </label>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-slate-700">
                                {user?.funcionario_data?.nombre_funcionario || (user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username)}
                            </h3>
                            {user?.is_superuser && <BadgeCheck className="w-5 h-5 text-blue-500" />}
                        </div>
                        <p className="text-xs font-medium text-slate-400">@{user?.username}</p>
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] uppercase font-semibold">
                            {user?.is_superuser ? 'Super Administrador' : (user?.groups?.[0] || 'Usuario Sistema')}
                        </div>
                    </div>
                </div>

                {/* Status Alerts */}
                {(error || success) && (
                    <div className={`p-3 rounded-xl flex gap-2.5 animate-in fade-in slide-in-from-top-1 duration-300 ${error ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                        {error ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                        <p className="text-xs font-medium">{error || success}</p>
                    </div>
                )}

                {!isChangingPassword ? (
                    <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-300">
                        <div className="col-span-1">
                            <InfoItem icon={IdCard} label="RUT / RUN" value={user?.funcionario_data?.rut} />
                        </div>
                        <div className="col-span-1">
                            <InfoItem icon={Mail} label="E-Mail" value={user?.email} />
                        </div>

                        <div className="col-span-1">
                            <InfoItem icon={Briefcase} label="Cargo" value={user?.funcionario_data?.cargo} colorClass="text-emerald-500" bgClass="bg-emerald-50" />
                        </div>
                        <div className="col-span-1">
                            <InfoItem icon={Building2} label="Departamento" value={user?.funcionario_data?.departamento} colorClass="text-indigo-500" bgClass="bg-indigo-50" />
                        </div>

                        <div className="col-span-2">
                            <InfoItem icon={MapPin} label="Unidad" value={user?.funcionario_data?.unidad} colorClass="text-orange-500" bgClass="bg-orange-50" />
                        </div>

                        <div className="col-span-2 pt-2">
                            <button
                                onClick={() => setIsChangingPassword(true)}
                                className="w-full flex items-center justify-center gap-2.5 p-3.5 bg-slate-800 text-white rounded-xl font-medium text-sm hover:bg-slate-700 transition-all shadow-lg active:scale-[0.99]"
                            >
                                <Lock className="w-4 h-4" />
                                Cambiar Contraseña
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in duration-300 py-1">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Clave Actual</label>
                                <input
                                    type="password"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                    placeholder="••••••••"
                                    value={passwordData.old_password}
                                    onChange={e => setPasswordData({ ...passwordData, old_password: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nueva Clave</label>
                                    <input
                                        type="password"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                        placeholder="••••••••"
                                        value={passwordData.new_password}
                                        onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Confirmar</label>
                                    <input
                                        type="password"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                        placeholder="••••••••"
                                        value={passwordData.confirm_password}
                                        onChange={e => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </BaseModal>
    );
};

export default UserProfileModal;
