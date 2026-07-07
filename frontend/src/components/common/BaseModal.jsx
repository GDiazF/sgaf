import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';
import Portal from './Portal';

const MotionDiv = motion.div;

const BaseModal = ({
    isOpen,
    onClose,
    onSave,
    title,
    subtitle,
    icon: Icon,
    children,
    maxWidth = 'max-w-2xl',
    saveLabel = 'Guardar Cambios',
    loading = false
}) => {
    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <Portal>
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
                        <MotionDiv
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm w-full h-full"
                            style={{ top: 0, left: 0, right: 0, bottom: 0 }}
                            onClick={onClose}
                        />

                        <MotionDiv
                            initial={{ scale: 0.95, opacity: 0, y: 15 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 15 }}
                            transition={{ type: "spring", damping: 25, stiffness: 350 }}
                            className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} overflow-hidden relative z-10 border border-slate-200 flex flex-col max-h-[90vh] min-w-0`}
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur-sm shrink-0">
                                <div className="flex items-center gap-2.5">
                                    {Icon && (
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                                            <Icon className="w-4 h-4" />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">{title}</h3>
                                        {subtitle && <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{subtitle}</p>}
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-5 overflow-y-auto overflow-x-hidden custom-scrollbar flex-grow min-h-0 min-w-0">
                                {children}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={onSave}
                                    disabled={loading}
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center gap-1.5 text-[10px] uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                                >
                                    {loading ? (
                                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Save className="w-3.5 h-3.5" />
                                    )}
                                    <span>{saveLabel}</span>
                                </button>
                            </div>
                        </MotionDiv>
                    </div>
                </Portal>
            )}
        </AnimatePresence>
    );
};

export default BaseModal;
