import React, { useState } from 'react';
import { Upload, FileText, Download, AlertCircle, CheckCircle, Loader2, Clock, DollarSign } from 'lucide-react';
import api from '../../api';
import {
    TITLE_ICON_BOX, ICON_BOX_SM, BTN_SUBMIT_FULL, DROPZONE, LOADING_BANNER,
} from './tesoreriaUi';

const FileUploader = ({ title, description, endpoint, buttonLabel }) => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setFile(e.target.files[0]);
            setMessage(null);
            setError(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Manejar tanto file (v1) como files (v2 multiple)
        const isMultiple = Array.isArray(file);
        const filesToUpload = isMultiple ? file : [file];

        if (filesToUpload.length === 0 || !filesToUpload[0]) {
            setError("Por favor selecciona al menos un archivo.");
            return;
        }

        setLoading(true);
        setError(null);
        setMessage(null);

        const formData = new FormData();
        filesToUpload.forEach(f => {
            formData.append('files', f); // Usamos 'files' para el backend
        });

        try {
            const response = await api.post(endpoint, formData, {
                responseType: 'blob',
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            const contentDisposition = response.headers['content-disposition'];
            let fileName = 'archivo_procesado.xlsx';
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/);
                if (fileNameMatch && fileNameMatch.length === 2)
                    fileName = fileNameMatch[1].replace(/"/g, '');
            }

            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();

            setMessage("Archivos procesados y descargados correctamente.");
        } catch (err) {
            console.error("Error processing file:", err);
            setError("Hubo un error al procesar. Revisa el formato e intenta nuevamente.");
        } finally {
            setLoading(false);
        }
    };

    const isTesoreriaBanco = endpoint.includes('tesoreria/procesar-banco');
    const isMultiple = Array.isArray(file);
    const filesCount = isMultiple ? file.length : (file ? 1 : 0);

    const getEstimatedTime = () => {
        if (!file) return 0;
        const filesToUpload = Array.isArray(file) ? file : [file];
        const totalSize = filesToUpload.reduce((acc, f) => acc + f.size, 0);
        const count = filesToUpload.length;
        // Estimación empírica: ~2 segundos base + ~1 seg cada 500KB
        // pdfplumber es algo lento extrayendo texto.
        const est = Math.ceil(2 + (count * 1) + (totalSize / (512 * 1024)));
        return est;
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[450px] group hover:shadow-md hover:border-slate-300 transition-all duration-300">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 h-[105px] flex items-center gap-3.5 shrink-0">
                <div className={`${ICON_BOX_SM} group-hover:scale-105 transition-transform`}>
                    <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 text-[13px] uppercase tracking-tight leading-none mb-1.5">{title}</h3>
                    <p className="text-[10px] text-slate-450 font-semibold uppercase tracking-wide leading-tight line-clamp-2">{description}</p>
                </div>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between min-h-0 bg-white">
                <form onSubmit={handleSubmit} className="flex-grow flex flex-col justify-between min-h-0">
                    <div className={DROPZONE}>
                        <input
                            type="file"
                            onChange={(e) => {
                                if (isTesoreriaBanco) {
                                    setFile(Array.from(e.target.files));
                                } else {
                                    setFile(e.target.files[0]);
                                }
                                setMessage(null);
                                setError(null);
                            }}
                            multiple={isTesoreriaBanco}
                            accept={isTesoreriaBanco ? ".pdf" : ".xlsx,.xls"}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex flex-col items-center gap-2">
                            {filesCount > 0 ? (
                                <>
                                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 flex items-center justify-center mb-1">
                                        <CheckCircle className="w-5 h-5 animate-pulse" />
                                    </div>
                                    <p className="font-bold text-slate-700 text-[11px] truncate max-w-[200px] uppercase">
                                        {isMultiple ? `${filesCount} archivos` : file.name}
                                    </p>
                                    <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">
                                        {isMultiple
                                            ? `Total: ${(file.reduce((acc, f) => acc + f.size, 0) / 1024).toFixed(1)} KB`
                                            : `${(file.size / 1024).toFixed(1)} KB`
                                        }
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl border border-slate-200 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                                        <Upload className="w-5 h-5" />
                                    </div>
                                    <p className="font-black text-slate-700 text-[10px] uppercase tracking-widest">Subir archivos</p>
                                    <p className="text-[9px] text-slate-400 px-4 font-medium uppercase tracking-wide">
                                        {isTesoreriaBanco ? 'Selecciona uno o más PDFs' : 'Sólo archivos Excel (.xlsx)'}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="h-[65px] flex flex-col justify-center my-2 shrink-0">
                        {error && (
                            <div className="p-2 bg-rose-50 text-rose-600 text-[9px] font-bold uppercase tracking-wider rounded-xl flex items-start gap-2 border border-rose-100">
                                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                <span className="line-clamp-2 leading-tight">{error}</span>
                            </div>
                        )}

                        {message && (
                            <div className="p-2 bg-emerald-50 text-emerald-600 text-[9px] font-bold uppercase tracking-wider rounded-xl flex items-start gap-2 border border-emerald-100">
                                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                <span className="line-clamp-2 leading-tight">{message}</span>
                            </div>
                        )}

                        {loading && (
                            <div className={LOADING_BANNER}>
                                <span className="font-black flex items-center gap-1.5 animate-pulse">
                                    <Clock className="w-3 h-3" /> Tiempo estimado: ~{getEstimatedTime()} seg.
                                </span>
                                <span className="opacity-70 text-[8px] font-medium leading-none">pdfplumber está extrayendo y procesando el texto...</span>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={filesCount === 0 || loading}
                        className={BTN_SUBMIT_FULL}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>{isMultiple ? `Procesando ${filesCount} archivos...` : 'Procesando...'}</span>
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                {buttonLabel}
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

const RemuneracionesDashboard = () => {
    return (
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden">
            {/* Header */}
            <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className={TITLE_ICON_BOX}>
                        <DollarSign className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase select-none">Remuneraciones</h2>
                        <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-1.5 uppercase select-none">
                            Panel de control para procesos de tesorería y remuneraciones
                        </p>
                    </div>
                </div>
            </div>

            {/* Grid Container (Zero-Scroll Internal Scroll) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FileUploader
                        title="Procesar Archivo Bancos"
                        description="Sube el archivo Excel de remuneraciones para generar el formato aceptado por el banco. Normaliza nombres, códigos y formatos."
                        endpoint="remuneraciones/procesar-banco/"
                        buttonLabel="Procesar Excel"
                    />

                    <FileUploader
                        title="Planilla Asignación Familiar (PDF)"
                        description="Sube múltiples comprobantes PDF de asignación familiar. Genera un Excel con una hoja por cada archivo procesado."
                        endpoint="tesoreria/procesar-banco/"
                        buttonLabel="Procesar PDFs"
                    />

                    <FileUploader
                        title="Procesar Vale Vista"
                        description="Genera el archivo para pago mediante Vale Vista a partir del reporte de remuneraciones estándar."
                        endpoint="remuneraciones/procesar-vale-vista/"
                        buttonLabel="Procesar Vale Vista"
                    />
                </div>
            </div>
        </div>
    );
};

export default RemuneracionesDashboard;
