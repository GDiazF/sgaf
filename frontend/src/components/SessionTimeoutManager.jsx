import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, RefreshCw, LogOut } from 'lucide-react';

const SessionTimeoutManager = () => {
    const { logout, user } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(60);

    // TIEMPOS REALES (Cierre en 30 min, Aviso a los 29 min para que dure 1 min)
    const SESSION_TIME = 30 * 60 * 1000;
    const WARNING_TIME = 1 * 60 * 1000;

    const timeoutRef = useRef(null);
    const countdownRef = useRef(null);
    const lastActivityRef = useRef(Date.now());

    const startOrResetTimer = useCallback((sync = true) => {
        if (!user) return;

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);

        if (sync) {
            localStorage.setItem('lastActivity', Date.now().toString());
        }

        setShowModal(false);
        setSecondsLeft(Math.floor(WARNING_TIME / 1000));

        timeoutRef.current = setTimeout(() => {
            setShowModal(true);
        }, SESSION_TIME - WARNING_TIME);
    }, [user, SESSION_TIME, WARNING_TIME]);

    useEffect(() => {
        if (user) {
            startOrResetTimer(false);
        }
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [user, startOrResetTimer]);

    useEffect(() => {
        if (showModal) {
            countdownRef.current = setInterval(() => {
                setSecondsLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(countdownRef.current);
                        logout();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [showModal, logout]);

    useEffect(() => {
        if (!user) return;

        const handleActivity = () => {
            const now = Date.now();
            if (now - lastActivityRef.current > 2000 && !showModal) {
                lastActivityRef.current = now;
                startOrResetTimer(true);
            }
        };

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        events.forEach(ev => window.addEventListener(ev, handleActivity));
        return () => events.forEach(ev => window.removeEventListener(ev, handleActivity));
    }, [user, startOrResetTimer, showModal]);

    useEffect(() => {
        const handleSync = (e) => {
            if (e.key === 'lastActivity' && !showModal) {
                startOrResetTimer(false);
            }
        };
        window.addEventListener('storage', handleSync);
        return () => window.removeEventListener('storage', handleSync);
    }, [startOrResetTimer, showModal]);

    if (!user) return null;

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
                                onClick={() => startOrResetTimer(true)}
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
