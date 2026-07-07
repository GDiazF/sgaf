import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Cpu, Code2, ShieldCheck } from 'lucide-react';

import { APP_DEVELOPER, APP_RELEASE_DATE } from '../../version';
import {
    MODAL_SHELL,
    MODAL_BACKDROP_LAYER,
    BTN_SECONDARY,
    statusBadgeClass,
} from '../../pages/funcionarios/shared/funcionariosUi';

const InfoBox = ({ icon: Icon, label, value, subValue }) => (
    <div className="flex gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 min-h-[3.75rem]">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border border-blue-100 bg-blue-50 text-blue-600">
            <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                {label}
            </span>
            <div className="text-[10px] font-medium text-slate-700 uppercase tracking-tight leading-snug break-words mt-1">
                {value || '—'}
            </div>
            {subValue ? (
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tight mt-0.5">
                    {subValue}
                </p>
            ) : (
                <span className="mt-0.5 block min-h-[0.875rem]" aria-hidden />
            )}
        </div>
    </div>
);

const AboutModal = ({ isOpen, onClose, version }) => {
    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className={MODAL_SHELL}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={MODAL_BACKDROP_LAYER}
                        onClick={onClose}
                        aria-hidden
                    />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 12 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 12 }}
                        transition={{ type: 'spring', damping: 26, stiffness: 340 }}
                        className="relative z-10 bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-md border border-slate-200 max-h-[90vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="shrink-0 px-5 py-4 bg-slate-900 flex justify-between items-center gap-2 shadow-lg shadow-slate-900/30">
                            <p className="text-xs font-bold text-white uppercase tracking-widest">
                                Acerca del sistema SGAF
                            </p>
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors shrink-0"
                                aria-label="Cerrar"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="shrink-0 px-4 pt-5 pb-1 text-xs font-medium text-slate-500 uppercase tracking-widest text-center leading-snug">
                            Sistema de Gestión Administrativa y Financiera
                        </p>

                        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4 pt-2 space-y-3 min-h-0">
                            <InfoBox icon={Cpu} label="Versión" value={`v${version}`} />
                            <InfoBox
                                icon={Code2}
                                label="Desarrollado por"
                                value={APP_DEVELOPER}
                                subValue={`Lanzamiento ${APP_RELEASE_DATE}`}
                            />
                            <InfoBox
                                icon={ShieldCheck}
                                label="Estado"
                                value={
                                    <span className={statusBadgeClass(true)}>
                                        Producción estable
                                    </span>
                                }
                            />
                        </div>

                        <div className="shrink-0 px-4 py-3 border-t border-slate-100 bg-slate-50/80 space-y-3">
                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest text-center leading-snug">
                                © {new Date().getFullYear()} SLEP Iquique
                            </p>
                            <button type="button" onClick={onClose} className={`${BTN_SECONDARY} w-full`}>
                                Cerrar
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default AboutModal;
