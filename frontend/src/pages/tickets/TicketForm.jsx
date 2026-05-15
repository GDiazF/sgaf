import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Send, Paperclip, AlertCircle, HelpCircle, X, Building, Landmark } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../api';

const TicketForm = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    
    // Data lists
    const [categories, setCategories] = useState([]);
    
    
    const [formData, setFormData] = useState({
        titulo: '',
        descripcion: '',
        area_destino: null, 
        categoria: '',
        prioridad: 'BAJA'
    });
    const [files, setFiles] = useState([]);

    // Sync with User Profile (Unused now as departments are removed)
    useEffect(() => {
        // No auto-assignment to department
    }, [user]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const catsRes = await api.get('tickets/categorias/');
                setCategories(catsRes.data.results || catsRes.data);
            } catch (error) {
                console.error("Error fetching form data:", error);
            }
        };
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('tickets/tickets/', formData);
            navigate(`/tickets/${res.data.id}`);
        } catch (error) {
            console.error("Error creating ticket:", error);
            alert("Error al crear el ticket. Revisa los campos.");
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files);
        setFiles([...files, ...newFiles]);
    };

    const removeFile = (index) => {
        setFiles(files.filter((_, i) => i !== index));
    };


    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <button 
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors font-bold text-sm group"
            >
                <div className="p-2 rounded-xl bg-white border border-slate-100 group-hover:border-slate-200 shadow-sm">
                    <ArrowLeft className="w-4 h-4" />
                </div>
                Volver a la Mesa de Ayuda
            </button>

            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="p-8 md:p-12 border-b border-slate-50 bg-slate-50/30">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                            <HelpCircle className="w-6 h-6" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Nueva Solicitud</h2>
                    </div>
                    <p className="text-slate-500 font-medium">Describe tu problema lo más detallado posible para ayudarte mejor.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Title */}
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Asunto / Título</label>
                            <input 
                                required
                                type="text"
                                placeholder="Ej: No puedo acceder al sistema de remuneraciones"
                                className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 rounded-2xl text-sm transition-all outline-none font-bold"
                                value={formData.titulo}
                                onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                            />
                        </div>


                        {/* Category */}
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Categoría</label>
                            <select 
                                required
                                className="w-full px-6 py-3 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 rounded-2xl text-sm transition-all outline-none font-bold cursor-pointer"
                                value={formData.categoria}
                                onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                            >
                                <option value="">Selecciona categoría...</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                                ))}
                            </select>
                        </div>

                        {/* Priority */}
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Prioridad (Inicial)</label>
                            <div className="flex gap-2">
                                {['BAJA', 'MEDIA', 'ALTA'].map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setFormData({...formData, prioridad: p})}
                                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${formData.prioridad === p ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Attachments UI */}
                        <div className="md:col-span-2 space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Adjuntos (Opcional)</label>
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 px-6 py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-2xl cursor-pointer transition-all border-2 border-dashed border-slate-200 group flex-1">
                                        <Paperclip className="w-4 h-4 group-hover:text-indigo-600" />
                                        <span className="text-[11px] font-black uppercase tracking-widest">Subir Archivos</span>
                                        <input type="file" multiple className="hidden" onChange={handleFileChange} />
                                    </label>
                                </div>
                            </div>
                            
                            {/* File list */}
                            <div className="flex flex-wrap gap-2">
                                {files.map((file, i) => (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        key={i} 
                                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold border border-indigo-100"
                                    >
                                        <span className="truncate max-w-[100px]">{file.name}</span>
                                        <button type="button" onClick={() => removeFile(i)} className="p-0.5 hover:bg-indigo-200 rounded-full transition-colors">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Descripción del Problema</label>
                            <textarea 
                                required
                                rows={6}
                                placeholder="Escribe aquí los detalles..."
                                className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 rounded-[2rem] text-sm transition-all outline-none font-medium"
                                value={formData.descripcion}
                                onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                            ></textarea>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6">
                        <div className="flex items-center gap-3 text-slate-400">
                            <div className="p-2 bg-slate-50 rounded-xl">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <p className="text-[11px] font-medium max-w-xs leading-tight">
                                Al enviar este ticket, se notificará al equipo de soporte correspondiente y recibirás actualizaciones por correo.
                            </p>
                        </div>

                        <button 
                            disabled={loading}
                            type="submit"
                            className="w-full md:w-auto flex items-center justify-center gap-3 px-10 py-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-[2rem] font-black shadow-2xl shadow-indigo-200 transition-all active:scale-95 group"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                    Enviar Solicitud
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TicketForm;
