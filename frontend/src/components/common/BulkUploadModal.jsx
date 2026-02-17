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
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden relative z-10"
                    >
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white/70 backdrop-blur-md">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20 text-white">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    {title}
                                </h3>
                            </div>
                            <button onClick={() => !uploading && onClose()} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="bg-blue-500/5 backdrop-blur-sm border border-blue-500/10 p-6 rounded-3xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                    <FileText className="w-16 h-16 text-blue-500" />
                                </div>
                                <div className="relative z-10">
                                    <p className="text-sm text-blue-900 font-bold leading-relaxed mb-1">
                                        {description || "Suba un archivo Excel para realizar la carga masiva."}
                                    </p>
                                    <p className="text-[10px] text-blue-700 font-black uppercase tracking-wider opacity-60">
                                        <span className="text-blue-500 mr-1.5 font-black">!</span>
                                        Si un solo registro falla, se cancela la carga completa.
                                    </p>
                                    {onDownloadTemplate && (
                                        <button
                                            onClick={onDownloadTemplate}
                                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center gap-2 w-fit"
                                        >
                                            <Save className="w-3.5 h-3.5" />
                                            Descargar Plantilla Excel
                                        </button>
                                    )}
                                </div>
                            </div>

                            {errors.length > 0 && (
                                <div className="bg-red-500/5 border border-red-500/10 p-6 rounded-3xl animate-in slide-in-from-top-2">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                        <h4 className="text-xs font-black text-red-700 uppercase tracking-widest">Inconsistencias Detectadas</h4>
                                    </div>
                                    <ul className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                        {errors.map((err, i) => (
                                            <li key={i} className="flex gap-3 text-xs font-bold text-red-900/70 p-3 bg-white/50 rounded-2xl border border-red-500/5">
                                                <span className="text-red-500 opacity-30 mt-0.5">•</span>
                                                {err}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="relative group/drop">
                                <div className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-[2.5rem] p-12 transition-all duration-500 overflow-hidden ${uploading ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/50 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 hover:shadow-2xl hover:shadow-emerald-500/5'}`}>
                                    {uploading ? (
                                        <div className="flex flex-col items-center gap-5">
                                            <div className="relative">
                                                <div className="w-16 h-16 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin" />
                                                <FileText className="absolute inset-0 m-auto w-6 h-6 text-emerald-500" />
                                            </div>
                                            <p className="text-sm font-black text-slate-800 uppercase tracking-widest animate-pulse">Procesando Archivo</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="p-5 bg-white rounded-3xl shadow-sm text-slate-300 mb-6 group-hover/drop:scale-110 group-hover/drop:text-emerald-500 group-hover/drop:shadow-xl group-hover/drop:shadow-emerald-500/10 transition-all duration-300">
                                                <FileText className="w-12 h-12" />
                                            </div>
                                            <div className="text-center group-hover/drop:translate-y-[-4px] transition-transform duration-300">
                                                <p className="text-sm font-black text-slate-700 mb-2">
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
                                className="px-6 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
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
