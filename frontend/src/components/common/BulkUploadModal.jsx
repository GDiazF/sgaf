import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, X, Save } from 'lucide-react';

const BulkUploadModal = ({
    isOpen,
    onClose,
    title = "Carga Masiva",
    description,
    onUpload,
    onDownloadTemplate,
    uploading = false,
    errors = []
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                        onClick={() => !uploading && onClose()}
                    />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden relative z-10 border border-slate-200"
                    >
                        <div className="p-4 md:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur-md">
                            <div>
                                <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-3">
                                    <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-600">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    {title}
                                </h3>
                            </div>
                            <button onClick={() => !uploading && onClose()} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-5 space-y-5">
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-105 transition-transform">
                                    <FileText className="w-10 h-10 text-blue-500" />
                                </div>
                                <div className="relative z-10">
                                    <p className="text-[11px] text-blue-900 font-medium uppercase leading-relaxed mb-1">
                                        {description || "Suba un archivo Excel para realizar la carga masiva."}
                                    </p>
                                    <p className="text-[10px] text-blue-700 font-black uppercase tracking-wider opacity-60">
                                        <span className="text-blue-500 mr-1.5 font-black">!</span>
                                        Si un solo registro falla, se cancela la carga completa.
                                    </p>
                                    {onDownloadTemplate && (
                                        <button
                                            onClick={onDownloadTemplate}
                                            className="mt-4 px-5 h-10 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-all flex items-center gap-2 w-fit"
                                        >
                                            <Save className="w-4 h-4" />
                                            Descargar Plantilla Excel
                                        </button>
                                    )}
                                </div>
                            </div>

                            {errors.length > 0 && (
                                <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl animate-in slide-in-from-top-2">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                                        <h4 className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Inconsistencias Detectadas</h4>
                                    </div>
                                    <ul className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                        {errors.map((err, i) => (
                                            <li key={i} className="flex gap-3 text-[11px] font-medium text-rose-900/70 p-3 bg-white/60 rounded-xl border border-rose-100">
                                                <span className="text-rose-500 opacity-50 mt-0.5">•</span>
                                                {err}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="relative group/drop">
                                <div className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 transition-all duration-300 overflow-hidden ${uploading ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/50 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 hover:shadow-lg hover:shadow-emerald-500/5'}`}>
                                    {uploading ? (
                                        <div className="flex flex-col items-center gap-5">
                                            <div className="relative">
                                                <div className="w-10 h-10 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin" />
                                                <FileText className="absolute inset-0 m-auto w-4 h-4 text-emerald-500" />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest animate-pulse">Procesando Archivo</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="p-4 bg-white rounded-2xl shadow-sm text-slate-300 mb-4 group-hover/drop:scale-105 group-hover/drop:text-emerald-500 group-hover/drop:shadow-lg group-hover/drop:shadow-emerald-500/10 transition-all duration-300">
                                                <FileText className="w-8 h-8" />
                                            </div>
                                            <div className="text-center group-hover/drop:translate-y-[-4px] transition-transform duration-300">
                                                <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-2">
                                                    {onUpload ? "Arrastre su archivo Excel" : "No disponible"}
                                                </p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">o haga clic para seleccionar</p>
                                            </div>
                                            <input
                                                type="file"
                                                accept=".xlsx, .xls"
                                                onChange={onUpload}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                            />
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={onClose}
                                disabled={uploading}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-600 h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
                            >
                                Cerrar
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default BulkUploadModal;
