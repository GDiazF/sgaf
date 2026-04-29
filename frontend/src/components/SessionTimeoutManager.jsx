import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, RefreshCw, LogOut } from 'lucide-react';

const SessionTimeoutManager = () => {
    const { logout, user } = useAuth();
    const location = useLocation();
    const [showModal, setShowModal] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(60);

    // TIEMPOS REALES (Cierre en 30 min, Aviso a los 29 min)
    const SESSION_TIME = 30 * 60 * 1000;
    const WARNING_TIME = 1 * 60 * 1000;

    // Rutas donde NO aplica el timeout
    const publicPaths = ['/login', '/forgot-password', '/reset-password', '/reservas-externas'];
    const isPublic = publicPaths.some(p => location.pathname.startsWith(p));

    const lastActivityRef = useRef(Date.now());

    // 1. Registro de actividad (solo si está logueado y no en ruta pública)
    const updateActivity = () => {
        if (!user || showModal || isPublic) return;
        const now = Date.now();
        // Prevenir excesivas escrituras, solo registrar cada 1 segundo
        if (now - lastActivityRef.current > 1000) {
            lastActivityRef.current = now;
            localStorage.setItem('lastActivity', now.toString());
        }
    };

    useEffect(() => {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        events.forEach(ev => window.addEventListener(ev, updateActivity));
        return () => events.forEach(ev => window.removeEventListener(ev, updateActivity));
    }, [user, showModal, isPublic]);

    // 2. Sincronización entre diferentes pestañas de SGAF
    useEffect(() => {
        const handleSync = (e) => {
            if (e.key === 'lastActivity' && !showModal) {
                lastActivityRef.current = parseInt(e.newValue || Date.now().toString());
            }
        };
        window.addEventListener('storage', handleSync);
        return () => window.removeEventListener('storage', handleSync);
    }, [showModal]);

    // 3. El Reloj Real (Resistente a suspensiones de PC)
    useEffect(() => {
        if (!user || isPublic) {
            setShowModal(false);
            return;
        }

        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = now - lastActivityRef.current;
            
            if (elapsed >= SESSION_TIME) {
                clearInterval(interval);
                logout(); // Cierre instantáneo si ya pasó el tiempo (ej. PC suspendido)
            } else if (elapsed >= SESSION_TIME - WARNING_TIME) {
                if (!showModal) setShowModal(true);
                // Calcula los segundos exactos restantes basados en el reloj real
                const remaining = Math.max(0, Math.ceil((SESSION_TIME - elapsed) / 1000));
                setSecondsLeft(remaining);
            } else {
                if (showModal) setShowModal(false);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [user, isPublic, showModal, logout]);

    const handleKeepAlive = () => {
        setShowModal(false);
        const now = Date.now();
        lastActivityRef.current = now;
        localStorage.setItem('lastActivity', now.toString());
    };

    if (!user || isPublic) return null;

    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sc = s % 60;
        return `${m}:${sc.toString().padStart(2, '0')}`;
    };

    return (
        <AnimatePresence>
            {showModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 text-center border border-slate-100" >
                        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mx-auto mb-4 border border-amber-100">
                            <Clock className="w-6 h-6 animate-pulse" />
                        </div>

                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1">¿Sigues ahí?</h3>
                        <p className="text-[9px] font-bold text-slate-400 mb-4 uppercase tracking-tighter">Tu sesión expirará por inactividad</p>

                        <div className="bg-slate-50 py-3 rounded-2xl border border-slate-100 mb-6">
                            <span className="text-3xl font-black text-blue-600 tabular-nums tracking-tighter">{formatTime(secondsLeft)}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleKeepAlive}
                                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                            >
                                <RefreshCw className="w-3 h-3" /> Mantener
                            </button>
                            <button
                                onClick={logout}
                                className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                            >
                                <LogOut className="w-3 h-3" /> Salir
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SessionTimeoutManager;
