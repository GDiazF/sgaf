import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, X, Download } from 'lucide-react';

const DocumentViewerModal = ({
    isOpen,
    onClose,
    title,
    subtitle,
    documentType = "Documento",
    fileUrl
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed top-0 left-0 w-screen h-screen bg-slate-900/60 backdrop-blur-sm z-[9998]"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] overflow-hidden relative z-[10000] border border-slate-200 flex flex-col"
                    >
                        <div className="bg-slate-50 border-b border-slate-100 p-4 md:p-6 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border border-blue-100 shrink-0">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-[10px] font-bold text-slate-800 leading-none mb-1.5 uppercase tracking-widest truncate">{title}</h3>
                                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter flex items-center gap-2">
                                        <span className="text-blue-600 font-bold">{documentType}</span>
                                        {subtitle && (
                                            <>
                                                <span className="w-1 h-1 rounded-full bg-slate-200" />
                                                <span>{subtitle}</span>
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 bg-slate-200/50 p-4">
                            <iframe
                                src={fileUrl}
                                className="w-full h-full rounded-2xl border border-slate-200 bg-white shadow-inner"
                                title="PDF Preview"
                            />
                        </div>
                        <div className="p-4 md:p-5 border-t border-slate-100 flex justify-end bg-white gap-2 shrink-0">
                            <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition-all uppercase tracking-wider"
                            >
                                Abrir en pestaña nueva
                            </a>
                            <a
                                href={fileUrl}
                                download
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all uppercase tracking-wider"
                            >
                                <Download className="w-4 h-4" />
                                Descargar Original
                            </a>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default DocumentViewerModal;
