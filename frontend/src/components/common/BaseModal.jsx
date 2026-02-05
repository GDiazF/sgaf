import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';

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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md w-full h-full"
                        style={{ top: 0, left: 0, right: 0, bottom: 0 }}
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className={`bg-white rounded-3xl shadow-2xl w-full ${maxWidth} overflow-hidden relative z-10 border border-slate-200 flex flex-col max-h-[90vh]`}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white shrink-0">
                            <div className="flex items-center gap-3">
                                {Icon && (
                                    <div className="p-2.5 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">{title}</h3>
                                    {subtitle && <p className="text-xs text-slate-400 font-medium">{subtitle}</p>}
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-grow">
                            {children}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50/30 flex justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={onSave}
                                disabled={loading}
                                className="px-8 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-500/30 transition-all flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Save className="w-5 h-5 text-blue-200" />
                                )}
                                {saveLabel}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default BaseModal;
