import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, ShieldCheck, Cpu, Code2 } from 'lucide-react';

import { APP_DEVELOPER, APP_RELEASE_DATE } from '../../version';

const AboutModal = ({ isOpen, onClose, version }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
                    >
                        {/* Header Image/Pattern */}
                        <div className="h-32 bg-gradient-to-br from-blue-600 to-indigo-800 relative flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute top-0 left-0 w-20 h-20 border-4 border-white rounded-full -translate-x-1/2 -translate-y-1/2" />
                                <div className="absolute bottom-0 right-0 w-32 h-32 border-8 border-white rounded-full translate-x-1/3 translate-y-1/3" />
                            </div>
                            <img src="/logo.png" alt="Logo" className="h-16 relative z-10 brightness-0 invert" />
                        </div>

                        {/* Content */}
                        <div className="p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">SGAF</h2>
                                    <p className="text-slate-500 font-medium">Sistema de Gestión Administrativa y Financiera</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                                        <Cpu className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">Versión del Sistema</p>
                                        <p className="text-sm text-slate-600 font-mono">v{version}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                                        <Code2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">Desarrollado por</p>
                                        <p className="text-sm text-slate-600 leading-relaxed">
                                            {APP_DEVELOPER}
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-1 font-mono">Lanzamiento: {APP_RELEASE_DATE}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">Estado</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Producción Estable</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                                    © {new Date().getFullYear()} SLEP IQUIQUE - Reservados todos los derechos
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AboutModal;
