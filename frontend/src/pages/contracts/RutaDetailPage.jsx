import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    MapPin, Truck, ArrowLeft, Plus, Building2, 
    Calendar, DollarSign, Loader2, AlertCircle, 
    CheckCircle2, ArrowRight, FileText, X, Save,
    Clock, Info, ChevronRight, Settings, Trash2
} from 'lucide-react';
import api from '../../api';

const RutaDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [ruta, setRuta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Generation Modal state
    const [isGenModalOpen, setIsGenModalOpen] = useState(false);
    const [genData, setGenData] = useState({
        mes: new Date().getMonth() + 1,
        anio: new Date().getFullYear()
    });
    const [generating, setGenerating] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get(`contratos/rutas/${id}/`);
            setRuta(res.data);
        } catch (err) {
            console.error("Error fetching ruta detail:", err);
            setError("No se pudo cargar la información de la ruta.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const handleGeneratePeriod = async (e) => {
        e.preventDefault();
        setGenerating(true);
        try {
            await api.post(`contratos/rutas/${id}/generar-periodo/`, genData);
            setIsGenModalOpen(false);
            fetchData();
        } catch (err) {
            console.error("Error generating period:", err);
            alert(err.response?.data?.error || "Error al generar el periodo.");
        } finally {
            setGenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-170px)]">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Cargando Ruta...</p>
            </div>
        );
    }

    if (error || !ruta) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-170px)] text-center px-4">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-slate-800">Error de Carga</h2>
                <p className="text-slate-500 mt-2 max-w-md">{error}</p>
                <button onClick={() => navigate(-1)} className="mt-6 text-indigo-600 font-bold flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Volver atrás
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-170px)] gap-6 overflow-hidden animate-in fade-in duration-500">
            {/* Header */}
            <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200/60 pb-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <Link to={`/contracts/servicios/${ruta.servicio}`} className="hover:text-indigo-600">Servicio</Link>
                        <ChevronRight className="w-3 h-3" />
                        <span className="text-slate-800">Configuración de Ruta</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                            <MapPin className="w-5 h-5" />
                        </div>
                        {ruta.nombre}
                    </h1>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button 
                        onClick={() => setIsGenModalOpen(true)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-indigo-100 active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        NUEVO PERIODO DE COBRO
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
                {/* Info Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Card: Proveedor & Valor */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Información de Pago</p>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                                    <Truck className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">{ruta.proveedor_nombre}</p>
                                    <p className="text-[10px] font-bold text-indigo-600 uppercase">Proveedor Asignado</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Valor por ruta (diaria)</p>
                            <p className="text-2xl font-black text-slate-800">${new Intl.NumberFormat('es-CL').format(ruta.valor_diario)}</p>
                        </div>
                    </div>

                    {/* Card: Configuración de Periodo */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Reglas de Periodo</p>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                <span className="text-xs font-bold text-slate-500 uppercase">Día de Inicio</span>
                                <span className="text-sm font-black text-slate-700 bg-indigo-50 px-3 py-1 rounded-lg">Cada {ruta.dia_inicio_periodo}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                <span className="text-xs font-bold text-slate-500 uppercase">Día de Término</span>
                                <span className="text-sm font-black text-slate-700 bg-indigo-50 px-3 py-1 rounded-lg">Cada {ruta.dia_fin_periodo}</span>
                            </div>
                            <div className="pt-2 flex flex-col gap-2">
                                <div className={`flex items-center gap-2 text-[10px] font-bold ${ruta.incluir_fines_semana ? 'text-emerald-600' : 'text-slate-300'}`}>
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Incluye Fines de Semana
                                </div>
                                <div className={`flex items-center gap-2 text-[10px] font-bold ${ruta.excluir_feriados ? 'text-emerald-600' : 'text-slate-300'}`}>
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Excluye Feriados Nacionales
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card: Establecimientos */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col h-full">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Establecimientos Beneficiarios</p>
                        <div className="flex flex-wrap gap-2 overflow-y-auto max-h-32 custom-scrollbar">
                            {ruta.establecimientos_detalle?.map(est => (
                                <span key={est.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold border border-slate-200">
                                    <Building2 className="w-3 h-3" />
                                    {est.nombre}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Periodos List Area */}
                <div className="space-y-4">
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-500" />
                        Historial de Periodos de Cobro
                    </h2>

                    {(!ruta.periodos || ruta.periodos.length === 0) ? (
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] py-16 flex flex-col items-center justify-center text-center">
                            <Calendar className="w-12 h-12 text-slate-200 mb-3" />
                            <h3 className="text-base font-bold text-slate-500 uppercase">Sin periodos generados</h3>
                            <p className="text-slate-400 text-xs mt-1">Haz clic en "Nuevo Periodo" para comenzar el control de este mes.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {ruta.periodos.map(periodo => (
                                <motion.div 
                                    key={periodo.id}
                                    whileHover={{ y: -4 }}
                                    className="bg-white border border-slate-200 rounded-[28px] p-5 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${periodo.estado === 'CERRADO' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {periodo.estado}
                                        </span>
                                    </div>
                                    
                                    <h4 className="text-base font-black text-slate-800 mb-1">{periodo.nombre_estandarizado}</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">
                                        {new Date(periodo.fecha_inicio).toLocaleDateString()} - {new Date(periodo.fecha_fin).toLocaleDateString()}
                                    </p>

                                    <Link 
                                        to={`/contracts/periodo/${periodo.id}`}
                                        className="w-full flex items-center justify-between p-3 bg-slate-50 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all group/btn"
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-widest">Abrir Calendario</span>
                                        <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Generación de Periodo */}
            <AnimatePresence>
                {isGenModalOpen && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsGenModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden">
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                        <Plus className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Nuevo Periodo</h2>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Generar fechas automáticamente</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsGenModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleGeneratePeriod} className="p-8 space-y-6">
                                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
                                    <Info className="w-5 h-5 text-amber-500 shrink-0" />
                                    <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                                        El sistema calculará automáticamente el rango de fechas (ej: {ruta.dia_inicio_periodo} al {ruta.dia_fin_periodo}) basado en el mes seleccionado.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Mes</label>
                                        <select 
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                                            value={genData.mes}
                                            onChange={e => setGenData({...genData, mes: e.target.value})}
                                        >
                                            <option value="1">Enero</option>
                                            <option value="2">Febrero</option>
                                            <option value="3">Marzo</option>
                                            <option value="4">Abril</option>
                                            <option value="5">Mayo</option>
                                            <option value="6">Junio</option>
                                            <option value="7">Julio</option>
                                            <option value="8">Agosto</option>
                                            <option value="9">Septiembre</option>
                                            <option value="10">Octubre</option>
                                            <option value="11">Noviembre</option>
                                            <option value="12">Diciembre</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Año</label>
                                        <input 
                                            type="number" 
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                                            value={genData.anio}
                                            onChange={e => setGenData({...genData, anio: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <button 
                                    disabled={generating}
                                    type="submit"
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[24px] font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    GENERAR PERIODO
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RutaDetailPage;
