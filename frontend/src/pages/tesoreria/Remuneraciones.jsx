import React, { useState } from 'react';
import { Upload, FileText, Download, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
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
        if (!file) {
            setError("Por favor selecciona un archivo primero.");
            return;
        }

        setLoading(true);
        setError(null);
        setMessage(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post(endpoint, formData, {
                responseType: 'blob', // Importante para recibir archivos binarios
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // Crear un enlace para descargar el archivo
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Extraer nombre del archivo del header si es posible, sino usar uno genérico
            const contentDisposition = response.headers['content-disposition'];
            let fileName = 'archivo_procesado.xlsx';
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/);
                if (fileNameMatch.length === 2)
                    fileName = fileNameMatch[1].replace(/"/g, ''); // remove quotes
            }

            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();

            setMessage("Archivo procesado y descargado correctamente.");
            setFile(null); // Reset file input
        } catch (err) {
            console.error("Error processing file:", err);
            setError("Hubo un error al procesar el archivo. Revisa el formato e intenta nuevamente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                        <FileText className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
                </div>
                <p className="text-sm text-slate-500">{description}</p>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 transition-colors hover:border-indigo-300 hover:bg-slate-50 group text-center cursor-pointer relative">
                        <input
                            type="file"
                            onChange={handleFileChange}
                            accept=".xlsx,.xls"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex flex-col items-center gap-2">
                            {file ? (
                                <>
                                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                                        <CheckCircle className="w-6 h-6" />
                                    </div>
                                    <p className="font-medium text-slate-900 truncate max-w-[200px]">{file.name}</p>
                                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                                </>
                            ) : (
                                <>
                                    <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                        <Upload className="w-6 h-6" />
                                    </div>
                                    <p className="font-medium text-slate-700">Haz clic para subir o arrastra aquí</p>
                                    <p className="text-xs text-slate-400">Sólo archivos Excel (.xlsx)</p>
                                </>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {message && (
                        <div className="p-3 bg-emerald-50 text-emerald-600 text-xs rounded-lg flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>{message}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={!file || loading}
                        className="w-full py-2.5 px-4 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Procesando...
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200/60 pb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Remuneraciones</h1>
                    <p className="text-slate-500 mt-2 text-sm">Panel de control para procesos de tesorería y remuneraciones.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FileUploader
                    title="Procesar Archivo Bancos"
                    description="Sube el archivo Excel de remuneraciones para generar el formato aceptado por el banco. Normaliza nombres, códigos y formatos."
                    endpoint="remuneraciones/procesar-banco/"
                    buttonLabel="Procesar y Descargar"
                />

                <FileUploader
                    title="Procesar Vale Vista"
                    description="Genera el archivo para pago mediante Vale Vista a partir del reporte de remuneraciones estándar."
                    endpoint="remuneraciones/procesar-vale-vista/"
                    buttonLabel="Procesar y Descargar"
                />
            </div>
        </div>
    );
};

export default RemuneracionesDashboard;
