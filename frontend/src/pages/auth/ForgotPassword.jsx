import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await api.post('auth/password-reset-request/', { email });
            setIsSent(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Ocurrió un error. Inténtalo de nuevo.');
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
                <div className="bg-slate-900 p-8 text-center text-white relative">
                    <button
                        onClick={() => navigate('/login')}
                        className="absolute left-6 top-8 text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/5">
                        <Mail className="w-8 h-8 text-blue-400" />
                    </div>
                    <h1 className="text-xl font-black uppercase tracking-tight">Recuperar Acceso</h1>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Ingresa tu correo institucional</p>
                </div>

                <div className="p-8">
                    <AnimatePresence mode="wait">
                        {!isSent ? (
                            <motion.form
                                key="request"
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

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            placeholder="ejemplo@slep-iquique.cl"
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-slate-900 transition-all outline-none font-bold text-sm"
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
                                        "Enviar Instrucciones"
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
                                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">¡Correo Enviado!</h2>
                                <p className="text-sm text-slate-500 mt-4 leading-relaxed font-medium">
                                    Si el correo <strong>{email}</strong> está registrado, recibirás un enlace para restablecer tu contraseña en unos minutos.
                                </p>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="mt-8 text-blue-600 font-black uppercase text-[10px] tracking-widest hover:text-blue-700 transition-colors"
                                >
                                    Regresar al Inicio de Sesión
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default ForgotPassword;
