import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';

const ResetPassword = () => {
    const { uid, token } = useParams();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setIsLoading(true);

        try {
            await api.post('auth/password-reset-confirm/', {
                uid,
                token,
                new_password: password
            });
            setIsDone(true);
        } catch (err) {
            setError(err.response?.data?.error || 'El enlace es inválido o ha expirado.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="bg-slate-900 p-8 text-center text-white">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/5">
                        <Lock className="w-8 h-8 text-blue-400" />
                    </div>
                    <h1 className="text-xl font-black uppercase tracking-tight">Nueva Contraseña</h1>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Ingresa tu nueva clave de acceso</p>
                </div>

                <div className="p-8">
                    <AnimatePresence mode="wait">
                        {!isDone ? (
                            <motion.form
                                key="confirm"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                onSubmit={handleSubmit}
                                className="space-y-6"
                            >
                                {error && (
                                    <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-100 flex gap-2 items-center">
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nueva Contraseña</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-slate-900 transition-all outline-none font-bold text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Contraseña</label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-slate-900 transition-all outline-none font-bold text-sm"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-900/10 transition-all transform active:scale-95 disabled:opacity-70 flex items-center justify-center uppercase text-[11px] tracking-widest"
                                >
                                    {isLoading ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    ) : (
                                        "Actualizar Contraseña"
                                    )}
                                </button>
                            </motion.form>
                        ) : (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-4"
                            >
                                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-emerald-100 ring-8 ring-emerald-50/50">
                                    <CheckCircle2 className="w-10 h-10" />
                                </div>
                                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">¡Contraseña Actualizada!</h2>
                                <p className="text-sm text-slate-500 mt-4 leading-relaxed font-medium">
                                    Tu contraseña ha sido restablecida con éxito. Ya puedes iniciar sesión con tus nuevas credenciales.
                                </p>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="mt-8 bg-slate-900 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
                                >
                                    Ir al Inicio de Sesión
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default ResetPassword;
