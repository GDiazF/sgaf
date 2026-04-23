import React, { useState } from 'react';
import BaseModal from '../common/BaseModal';
import { Lock, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../api';

const ChangePasswordModal = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        old_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async () => {
        setError('');

        if (!formData.old_password || !formData.new_password || !formData.confirm_password) {
            setError('Todos los campos son obligatorios.');
            return;
        }

        if (formData.new_password !== formData.confirm_password) {
            setError('La nueva contraseña y su confirmación no coinciden.');
            return;
        }

        if (formData.new_password.length < 6) {
            setError('La nueva contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setLoading(true);
        try {
            await api.post('auth/change-password/', {
                old_password: formData.old_password,
                new_password: formData.new_password
            });
            setSuccess(true);
            setFormData({ old_password: '', new_password: '', confirm_password: '' });
            setTimeout(() => {
                setSuccess(false);
                onClose();
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al actualizar la contraseña.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            onSave={handleSubmit}
            title="Cambiar Contraseña"
            subtitle="Actualice su credencial de acceso al sistema"
            icon={Lock}
            saveLabel={loading ? "Actualizando..." : "Actualizar Contraseña"}
            disabled={loading || success}
        >
            <div className="space-y-6">
                {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 animate-shake">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                        <p className="text-sm text-red-700 font-medium">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex gap-3 animate-in fade-in zoom-in duration-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        <p className="text-sm text-emerald-700 font-medium">Contraseña actualizada exitosamente.</p>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 ml-1">Contraseña Actual</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                            <input
                                type="password"
                                placeholder="••••••••"
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                value={formData.old_password}
                                onChange={e => setFormData({ ...formData, old_password: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Nueva Contraseña</label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                    value={formData.new_password}
                                    onChange={e => setFormData({ ...formData, new_password: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Confirmar Nueva Contraseña</label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                    value={formData.confirm_password}
                                    onChange={e => setFormData({ ...formData, confirm_password: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                        Por seguridad, use una contraseña robusta que no haya utilizado anteriormente. Una vez cambiada, se mantendrá su sesión activa.
                    </p>
                </div>
            </div>
        </BaseModal>
    );
};

export default ChangePasswordModal;
