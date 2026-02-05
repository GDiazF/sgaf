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
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-emerald-600" />
                                {title}
                            </h3>
                            <button onClick={() => !uploading && onClose()} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                                <p className="text-sm text-blue-800 leading-relaxed">
                                    {description || "Suba un archivo Excel para realizar la carga masiva."}
                                    <strong> Importante:</strong> Si un solo registro tiene errores, la carga completa será cancelada para asegurar la consistencia.
                                </p>
                                {onDownloadTemplate && (
                                    <button
                                        onClick={onDownloadTemplate}
                                        className="mt-3 text-sm font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 underline"
                                    >
                                        <Save className="w-4 h-4" />
                                        Descargar Plantilla Excel
                                    </button>
                                )}
                            </div>

                            {errors.length > 0 && (
                                <div className="bg-red-50 border border-red-100 p-4 rounded-xl max-h-60 overflow-y-auto">
                                    <h4 className="text-sm font-bold text-red-800 mb-2">Se encontraron errores:</h4>
                                    <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                                        {errors.map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-10 hover:border-emerald-500 transition-colors bg-slate-50 relative">
                                {uploading ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
                                        <p className="text-sm font-medium text-slate-600">Procesando archivo...</p>
                                    </div>
                                ) : (
                                    <>
                                        <FileText className="w-12 h-12 text-slate-300 mb-4" />
                                        <p className="text-sm text-slate-500 mb-4 text-center">
                                            Arrastre su archivo Excel aquí o haga clic para seleccionar
                                        </p>
                                        <input
                                            type="file"
                                            accept=".xlsx, .xls"
                                            onChange={onUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <button className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
                                            Seleccionar Archivo
                                        </button>
                                    </>
                                )}
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
