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
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                duration={{ duration: 0.5 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative"
            >
                {/* Decorative header */}
                <div className="bg-blue-600 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-white/10 backdrop-blur-sm"></div>
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="relative z-10 flex flex-col items-center"
                    >
                        {/* Modified for wide logo */}
                        <div className="mb-6 p-2 w-72 h-36 flex items-center justify-center">
                            <img src="/logo.png" alt="SLEP Logo" className="w-full h-full object-contain" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Bienvenido</h1>
                        <p className="text-blue-100 text-sm mt-1">Sistema de Gestión SLEP Iquique</p>
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
                                className="peer w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-600 focus:ring-0 outline-none transition-all placeholder-transparent text-slate-900 font-medium"
                                placeholder="Usuario"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                            <label
                                htmlFor="username"
                                className="absolute left-4 -top-2.5 bg-white px-2 text-xs font-semibold text-slate-500 transition-all 
                                peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-400 peer-placeholder-shown:top-3.5 peer-placeholder-shown:bg-transparent
                                peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-blue-600 peer-focus:bg-white pointer-events-none"
                            >
                                Usuario
                            </label>
                            <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 peer-focus:text-blue-600 transition-colors pointer-events-none" />
                        </div>

                        <div className="relative">
                            <input
                                type="password"
                                id="password"
                                className="peer w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-600 focus:ring-0 outline-none transition-all placeholder-transparent text-slate-900 font-medium"
                                placeholder="Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <label
                                htmlFor="password"
                                className="absolute left-4 -top-2.5 bg-white px-2 text-xs font-semibold text-slate-500 transition-all 
                                peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-400 peer-placeholder-shown:top-3.5 peer-placeholder-shown:bg-transparent
                                peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-blue-600 peer-focus:bg-white pointer-events-none"
                            >
                                Contraseña
                            </label>
                            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 peer-focus:text-blue-600 transition-colors pointer-events-none" />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center mt-4"
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
