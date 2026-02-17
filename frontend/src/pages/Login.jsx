import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await login(username, password);
            navigate('/');
        } catch (err) {
            setError('Credenciales inválidas. Intente nuevamente.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                duration={{ duration: 0.5 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative"
            >
                {/* Decorative header */}
                <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="relative z-10 flex flex-col items-center"
                    >
                        {/* Modified for wide logo */}
                        <div className="mb-6 p-2 w-72 h-36 flex items-center justify-center bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                            <img src="/logo.png" alt="SLEP Logo" className="w-full h-full object-contain" />
                        </div>
                        <h1 className="text-2xl font-black text-white tracking-tight">Bienvenido</h1>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Sistema de Gestión SLEP Iquique</p>
                    </motion.div>
                </div>

                <div className="p-8 pt-10">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2 border border-red-100"
                            >
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </motion.div>
                        )}

                        <div className="relative">
                            <input
                                type="text"
                                id="username"
                                className="peer w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl !focus:border-slate-900 !focus:ring-[6px] !focus:ring-slate-900/5 outline-none transition-all placeholder:text-transparent text-slate-900 font-bold text-sm"
                                placeholder=" "
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                            <label
                                htmlFor="username"
                                className="absolute left-4 -top-2 bg-white px-2 text-[8px] font-black text-slate-400 uppercase tracking-widest transition-all 
                                peer-placeholder-shown:text-[11px] peer-placeholder-shown:text-slate-400 peer-placeholder-shown:top-3.5 peer-placeholder-shown:bg-transparent peer-placeholder-shown:font-bold
                                peer-focus:-top-2 peer-focus:text-[8px] peer-focus:text-slate-900 peer-focus:bg-white pointer-events-none"
                            >
                                Usuario
                            </label>
                            <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 peer-focus:text-slate-900 transition-colors pointer-events-none" />
                        </div>

                        <div className="relative">
                            <input
                                type="password"
                                id="password"
                                className="peer w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl !focus:border-slate-900 !focus:ring-[6px] !focus:ring-slate-900/5 outline-none transition-all placeholder:text-transparent text-slate-900 font-bold text-sm"
                                placeholder=" "
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <label
                                htmlFor="password"
                                className="absolute left-4 -top-2 bg-white px-2 text-[8px] font-black text-slate-400 uppercase tracking-widest transition-all 
                                peer-placeholder-shown:text-[11px] peer-placeholder-shown:text-slate-400 peer-placeholder-shown:top-3.5 peer-placeholder-shown:bg-transparent peer-placeholder-shown:font-bold
                                peer-focus:-top-2 peer-focus:text-[8px] peer-focus:text-slate-900 peer-focus:bg-white pointer-events-none"
                            >
                                Contraseña
                            </label>
                            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 peer-focus:text-slate-900 transition-colors pointer-events-none" />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 rounded-xl shadow-xl shadow-slate-900/10 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center mt-4 uppercase text-[11px] tracking-widest"
                        >
                            {isLoading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                "Iniciar Sesión"
                            )}
                        </button>
                    </form>
                </div>

                <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                    <p className="text-xs text-slate-400">© 2026 SLEP Iquique. Todos los derechos reservados.</p>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
