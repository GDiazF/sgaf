import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Paperclip, X, Loader2, FilePlus } from 'lucide-react';
import api from '../../api';
import { BTN_BLUE, INPUT_FORM, SELECT_FORM, TEXTAREA_FORM, FILE_CHIP, TITLE_ICON_BOX } from './ticketsUi';

const PRIORITIES = ['BAJA', 'MEDIA', 'ALTA'];

const PRIORITY_ACTIVE = {
    BAJA: 'bg-slate-100 border-slate-300 text-slate-700',
    MEDIA: 'bg-blue-50 border-blue-200 text-blue-600',
    ALTA: 'bg-amber-50 border-amber-200 text-amber-600',
};

const TicketForm = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [formError, setFormError] = useState('');

    const [formData, setFormData] = useState({
        titulo: '',
        descripcion: '',
        area_destino: null,
        categoria: '',
        prioridad: 'BAJA',
    });
    const [files, setFiles] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const catsRes = await api.get('tickets/categorias/');
                setCategories(catsRes.data.results || catsRes.data);
            } catch (error) {
                console.error('Error fetching form data:', error);
            }
        };
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setLoading(true);
        try {
            const res = await api.post('tickets/tickets/', formData);
            navigate(`/tickets/${res.data.id}`);
        } catch (error) {
            console.error('Error creating ticket:', error);
            const msg = error.response?.data
                ? (typeof error.response.data === 'string'
                    ? error.response.data
                    : Object.values(error.response.data).flat().join(' '))
                : 'Error al crear el ticket. Revisa los campos.';
            setFormError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files);
        setFiles((prev) => [...prev, ...newFiles]);
    };

    const removeFile = (index) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden">
            <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                <div className="flex items-start gap-3 min-w-0">
                    <Link
                        to="/tickets"
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors shrink-0 h-10 w-10 flex items-center justify-center"
                        title="Volver"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className={TITLE_ICON_BOX}>
                            <FilePlus className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase select-none">
                            Nueva Solicitud
                        </h2>
                        <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-1.5">
                            Describe el problema con el mayor detalle posible
                        </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col flex-1 min-h-0 overflow-hidden">
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                    <div className="overflow-y-auto flex-1 p-4 md:p-6 custom-scrollbar">
                        {formError && (
                            <div className="mb-4 bg-rose-50 text-rose-600 text-[10px] font-bold uppercase p-3 rounded-xl border border-rose-100">
                                {formError}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                                    Asunto / Título
                                </label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ej: No puedo acceder al sistema de remuneraciones"
                                    className={INPUT_FORM}
                                    value={formData.titulo}
                                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                                    Categoría
                                </label>
                                <select
                                    required
                                    className={SELECT_FORM}
                                    value={formData.categoria}
                                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                                >
                                    <option value="">Selecciona categoría...</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                                    Prioridad inicial
                                </label>
                                <div className="flex gap-2">
                                    {PRIORITIES.map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, prioridad: p })}
                                            className={`flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                                formData.prioridad === p
                                                    ? PRIORITY_ACTIVE[p]
                                                    : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                                    Descripción del problema
                                </label>
                                <textarea
                                    required
                                    rows={6}
                                    placeholder="Escribe aquí los detalles..."
                                    className={TEXTAREA_FORM}
                                    value={formData.descripcion}
                                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                                    Adjuntos (opcional)
                                </label>
                                <label className="flex items-center justify-center gap-2 h-10 px-4 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl cursor-pointer transition-all border border-dashed border-slate-200 w-full md:w-auto">
                                    <Paperclip className="w-4 h-4 shrink-0" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Subir archivos</span>
                                    <input type="file" multiple className="hidden" onChange={handleFileChange} />
                                </label>
                                {files.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {files.map((file, i) => (
                                            <div
                                                key={`${file.name}-${i}`}
                                                className={FILE_CHIP}
                                            >
                                                <span className="truncate max-w-[140px]">{file.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(i)}
                                                    className="p-0.5 hover:bg-blue-100 rounded transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="shrink-0 p-4 md:px-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter max-w-md leading-relaxed">
                            Al enviar, se notificará al equipo de soporte y recibirás actualizaciones por correo.
                        </p>
                        <button
                            disabled={loading}
                            type="submit"
                            className={`${BTN_BLUE} sm:ml-auto`}
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4" />
                            )}
                            {loading ? 'Enviando...' : 'Enviar solicitud'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TicketForm;
