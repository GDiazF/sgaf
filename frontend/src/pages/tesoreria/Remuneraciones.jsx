import React, { useState } from 'react';
import { Upload, FileText, Download, AlertCircle, CheckCircle, Loader2, Clock } from 'lucide-react';
import api from '../../api';

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
            // Si es la versión vieja de un solo archivo, backend podría esperar 'file'
            // Pero mi nueva vista espera 'files'
            formData.append('file', f);
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[480px]">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 h-[140px] flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                        <FileText className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg leading-tight">{title}</h3>
                </div>
                <p className="text-sm text-slate-500 line-clamp-2">{description}</p>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between">
                <form onSubmit={handleSubmit} className="h-full flex flex-col justify-between space-y-4">
                    <div className="flex-1 border-2 border-dashed border-slate-200 rounded-xl p-6 transition-colors hover:border-indigo-300 hover:bg-slate-50 group text-center cursor-pointer relative flex flex-col items-center justify-center">
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
                                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                                        <CheckCircle className="w-6 h-6" />
                                    </div>
                                    <p className="font-medium text-slate-900 truncate max-w-[200px]">
                                        {isMultiple ? `${filesCount} archivos` : file.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {isMultiple
                                            ? `Total: ${(file.reduce((acc, f) => acc + f.size, 0) / 1024).toFixed(1)} KB`
                                            : `${(file.size / 1024).toFixed(1)} KB`
                                        }
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                        <Upload className="w-6 h-6" />
                                    </div>
                                    <p className="font-medium text-slate-700">Subir archivos</p>
                                    <p className="text-xs text-slate-400 px-4">
                                        {isTesoreriaBanco ? 'Selecciona uno o más PDFs' : 'Sólo archivos Excel (.xlsx)'}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="h-[75px] flex flex-col justify-end">
                        {error && (
                            <div className="p-2 bg-red-50 text-red-600 text-[10px] rounded-lg flex items-start gap-2">
                                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                <span className="line-clamp-2">{error}</span>
                            </div>
                        )}

                        {message && (
                            <div className="p-2 bg-emerald-50 text-emerald-600 text-[10px] rounded-lg flex items-start gap-2">
                                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                <span className="line-clamp-2">{message}</span>
                            </div>
                        )}

                        {loading && (
                            <div className="p-2 bg-indigo-50 text-indigo-600 text-[10px] rounded-lg flex flex-col gap-1">
                                <span className="font-bold flex items-center gap-1.5 animate-pulse">
                                    <Clock className="w-3 h-3" /> Tiempo estimado: ~{getEstimatedTime()} seg.
                                </span>
                                <span className="opacity-70">Esto depende del número de páginas y la complejidad de los archivos.</span>
                            </div>
                        )}

                        {!error && !message && !loading && <div className="h-full" />}
                    </div>

                    <button
                        type="submit"
                        disabled={filesCount === 0 || loading}
                        className="w-full py-2.5 px-4 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2 mt-auto"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>{isMultiple ? `Procesando ${filesCount} archivos...` : 'Procesando archivo...'}</span>
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
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200/60 pb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Remuneraciones</h1>
                    <p className="text-slate-500 mt-2 text-sm">Panel de control para procesos de tesorería y remuneraciones.</p>
                </div>
            </div>

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
    );
};

export default RemuneracionesDashboard;
