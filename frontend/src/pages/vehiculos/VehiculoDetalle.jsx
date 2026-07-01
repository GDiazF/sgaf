import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Save, Trash2, FileText, ShieldCheck, Calendar, 
    UploadCloud, CheckCircle2, AlertCircle, Clock, 
    FileIcon, ChevronRight, Info, Wrench, Download, Car, Fuel, Plus, TrendingUp
} from 'lucide-react';
import api from '../../api';

const MotionDiv = motion.div;
const FIELD_CLASS = 'no-global w-full !h-10 min-h-10 !text-[10px] font-bold bg-white border border-slate-200 px-3 rounded-xl outline-none focus:border-blue-500 uppercase transition-all shadow-sm placeholder:text-slate-300 box-border leading-none';
const LABEL_CLASS = 'block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1';
const SECTION_TITLE = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest';
const PRIMARY_BTN = 'bg-blue-600 hover:bg-blue-700 text-white h-10 px-5 rounded-xl font-black text-[10px] uppercase tracking-widest inline-flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50';
const DOC_ACTION_BTN = 'h-9 rounded-xl inline-flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95';

const VehiculoDetalle = ({ vehiculo, onClose, onUpdate }) => {
    const [activeTab, setActiveTab] = useState('info');
    const [submitting, setSubmitting] = useState(false);
    const [editingVehiculo, setEditingVehiculo] = useState({ ...vehiculo });
    const [documentos, setDocumentos] = useState(vehiculo.documentos || []);
    const [tiposDoc, setTiposDoc] = useState([]);
    const [tiposCombustible, setTiposCombustible] = useState([]);
    const [selectedTipoForUpload, setSelectedTipoForUpload] = useState(null);
    const [newImage, setNewImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(vehiculo.imagen || null);
    const [feedback, setFeedback] = useState(null);
    const [pendingDeleteDocId, setPendingDeleteDocId] = useState(null);
    
    // Document Upload State
    const [uploadData, setUploadData] = useState({
        archivo: null,
        fecha_vencimiento: '',
        observaciones: '',
        dias_aviso: ''
    });

    useEffect(() => {
        fetchTiposDoc();
        fetchTiposCombustible();
    }, []);

    const fetchTiposCombustible = async () => {
        try {
            const response = await api.get('vehiculos/tipos-combustible/');
            setTiposCombustible(response.data.results || response.data);
        } catch (error) { console.error(error); }
    };

    const fetchTiposDoc = async () => {
        try {
            const response = await api.get('vehiculos/tipos-documento/');
            setTiposDoc(response.data.results || response.data);
        } catch (error) {
            console.error("Error fetching document types:", error);
        }
    };

    const handleVehiculoChange = (e) => {
        const { name, value } = e.target;
        setEditingVehiculo(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setNewImage(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleUpdateVehiculo = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        
        const formData = new FormData();
        Object.keys(editingVehiculo).forEach(key => {
            if (editingVehiculo[key] !== null && key !== 'documentos' && key !== 'imagen') {
                formData.append(key, editingVehiculo[key]);
            }
        });
        
        if (newImage) {
            formData.append('imagen', newImage);
        }

        try {
            const response = await api.put(`vehiculos/flota/${vehiculo.id}/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onUpdate(response.data);
            setNewImage(null);
            setFeedback({ type: 'success', text: 'Información del vehículo actualizada.' });
        } catch (error) {
            console.error("Error updating vehicle:", error);
            setFeedback({ type: 'error', text: 'Error al actualizar la información.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!uploadData.archivo || !selectedTipoForUpload) {
            setFeedback({ type: 'error', text: 'Por favor seleccione un archivo y tipo.' });
            return;
        }

        setSubmitting(true);
        const formData = new FormData();
        formData.append('vehiculo', vehiculo.id);
        formData.append('tipo', selectedTipoForUpload.id);
        formData.append('archivo', uploadData.archivo);
        if (uploadData.fecha_vencimiento) {
            formData.append('fecha_vencimiento', uploadData.fecha_vencimiento);
        }
        formData.append('observaciones', uploadData.observaciones);
        if (uploadData.dias_aviso) {
            formData.append('dias_aviso', uploadData.dias_aviso);
        }

        try {
            const response = await api.post('vehiculos/documentos/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setDocumentos([...documentos, response.data]);
            setUploadData({
                archivo: null,
                fecha_vencimiento: '',
                observaciones: ''
            });
            setSelectedTipoForUpload(null);
            setFeedback({ type: 'success', text: 'Documento subido correctamente.' });
        } catch (error) {
            console.error("Error uploading document:", error);
            setFeedback({ type: 'error', text: 'Error al subir el documento.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteDocument = async (id) => {
        setPendingDeleteDocId(id);
    };

    const confirmDeleteDocument = async () => {
        if (!pendingDeleteDocId) return;
        try {
            await api.delete(`vehiculos/documentos/${pendingDeleteDocId}/`);
            setDocumentos(documentos.filter(d => d.id !== pendingDeleteDocId));
            setPendingDeleteDocId(null);
            setFeedback({ type: 'success', text: 'Documento eliminado correctamente.' });
        } catch (error) {
            console.error("Error deleting document:", error);
            setFeedback({ type: 'error', text: 'Error al eliminar el documento.' });
        }
    };

    const getStatusVencimiento = (fecha) => {
        if (!fecha) return { label: 'Vigencia no especificada', color: 'text-slate-400', bg: 'bg-slate-100', icon: Clock };
        const today = new Date();
        const venc = new Date(fecha);
        const diff = (venc - today) / (1000 * 60 * 60 * 24);
        
        if (diff < 0) return { label: 'VENCIDO', color: 'text-rose-600', bg: 'bg-rose-50', icon: AlertCircle };
        if (diff < 30) return { label: 'POR VENCER', color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock };
        return { label: 'VIGENTE', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 };
    };

    const getIcon = (name) => {
        const icons = {
            'FileText': FileText,
            'ShieldCheck': ShieldCheck,
            'Calendar': Calendar,
            'Wrench': Wrench,
            'Info': Info,
            'FileIcon': FileIcon
        };
        return icons[name] || FileText;
    };

    const getColorClasses = (color) => {
        const colors = {
            'blue': 'bg-blue-50 text-blue-600 border-blue-100',
            'emerald': 'bg-emerald-50 text-emerald-600 border-emerald-100',
            'indigo': 'bg-blue-50 text-blue-600 border-blue-100',
            'amber': 'bg-amber-50 text-amber-600 border-amber-100',
            'rose': 'bg-rose-50 text-rose-600 border-rose-100',
            'slate': 'bg-slate-50 text-slate-600 border-slate-100',
            'purple': 'bg-blue-50 text-blue-600 border-blue-100'
        };
        return colors[color] || colors.slate;
    };

    return (
        <>
        <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
        />
        <MotionDiv 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed inset-y-0 right-0 z-[10000] w-full sm:max-w-3xl xl:max-w-5xl bg-slate-50 flex flex-col overflow-hidden shadow-2xl border-l border-slate-200"
        >
            {/* Premium Header - Compact Dark Console Style with Background Image */}
            <div className="relative bg-slate-900 shrink-0 border-b border-slate-800 overflow-hidden">
                {imagePreview && (
                    <div className="absolute inset-0 z-0">
                        <img src={imagePreview} className="w-full h-full object-cover opacity-40 mix-blend-overlay" alt="Fondo Vehículo" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/60" />
                    </div>
                )}
                
                <div className="relative z-10 flex flex-col p-4 md:p-6 space-y-4">
                    <div className="flex justify-between items-start">
                        <button 
                            onClick={onClose}
                            className="group flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg text-slate-300 hover:text-white transition-all active:scale-95 border border-white/10"
                        >
                            <X className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Cerrar</span>
                        </button>

                        <div className="flex gap-2">
                            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-md text-[9px] font-black uppercase tracking-widest border border-emerald-500/20 flex items-center gap-1.5 backdrop-blur-md">
                                <CheckCircle2 className="w-3 h-3" /> Activo
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div>
                                <h2 className="text-base md:text-lg font-black text-white tracking-tight leading-none mb-1.5 uppercase">
                                    {vehiculo.marca} {vehiculo.modelo}
                                </h2>
                                <div className="flex items-center gap-2">
                                    <span className="bg-white/10 text-white px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border border-white/10">
                                        PATENTE: {vehiculo.patente}
                                    </span>
                                    <span className="text-slate-500 text-[8px] font-bold uppercase tracking-widest flex items-center gap-1">
                                        <ShieldCheck className="w-3 h-3 text-blue-400/70" /> SGAF
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex bg-slate-950/50 p-1 rounded-lg border border-white/5">
                            <button 
                                onClick={() => setActiveTab('info')}
                                className={`px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${activeTab === 'info' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <Info className="w-3 h-3" /> Técnica
                            </button>
                            <button 
                                onClick={() => setActiveTab('docs')}
                                className={`px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${activeTab === 'docs' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <FileText className="w-3 h-3" /> Documentos ({documentos.length})
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:px-6 md:pt-6 md:pb-8 custom-scrollbar w-full">
                <div className="w-full">
                    <AnimatePresence mode="wait">
                        {activeTab === 'info' ? (
                            <motion.div 
                                key="info"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                                    <div className="lg:col-span-4 flex flex-col gap-6">
                                        {/* Card de Foto con Subida */}
                                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center relative overflow-hidden group flex-1">
                                            <h3 className={`${SECTION_TITLE} mb-4 w-full text-left flex items-center gap-2`}>
                                                <TrendingUp className="w-4 h-4 text-emerald-500" /> Fotografía
                                            </h3>
                                            
                                            <div className="relative w-32 h-32 mb-4 mt-auto">
                                                <div className="w-full h-full rounded-full border-4 border-slate-50 overflow-hidden shadow-xl relative">
                                                    {imagePreview ? (
                                                        <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                                                    ) : (
                                                        <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                                                            <Car className="w-10 h-10 text-slate-200" />
                                                        </div>
                                                    )}
                                                </div>
                                                <label className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:bg-blue-700 transition-all hover:scale-110">
                                                    <Plus className="w-5 h-5" />
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                                </label>
                                            </div>
                                            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest px-4 leading-relaxed mt-auto">
                                                Sube una foto real de la unidad.
                                            </p>
                                        </div>

                                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center flex-1">
                                            <h3 className={`${SECTION_TITLE} mb-4 flex items-center gap-2`}>
                                                <Info className="w-4 h-4 text-blue-500" /> Resumen Técnico
                                            </h3>
                                        <div className="space-y-5">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Combustible</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Fuel className="w-4 h-4 text-amber-500" />
                                                    <span className="text-[11px] font-medium text-slate-700 uppercase tracking-tighter">{vehiculo.tipo_combustible || 'No definido'}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado Documental</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                    <span className="text-[11px] font-medium text-slate-700 uppercase tracking-tighter">{documentos.length} Documentos Cargados</span>
                                                </div>
                                            </div>
                                        </div>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-8 flex flex-col">
                                        <form onSubmit={handleUpdateVehiculo} className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col flex-1">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 content-start">
                                            <div className="space-y-1.5">
                                                <label className={LABEL_CLASS}>Marca</label>
                                                <input 
                                                    name="marca"
                                                    value={editingVehiculo.marca}
                                                    onChange={handleVehiculoChange}
                                                    className={FIELD_CLASS}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className={LABEL_CLASS}>Modelo</label>
                                                <input 
                                                    name="modelo"
                                                    value={editingVehiculo.modelo}
                                                    onChange={handleVehiculoChange}
                                                    className={FIELD_CLASS}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className={LABEL_CLASS}>Año</label>
                                                <input 
                                                    name="anio"
                                                    value={editingVehiculo.anio}
                                                    onChange={handleVehiculoChange}
                                                    className={FIELD_CLASS}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className={LABEL_CLASS}>Patente</label>
                                                <input 
                                                    name="patente"
                                                    value={editingVehiculo.patente}
                                                    onChange={handleVehiculoChange}
                                                    className={FIELD_CLASS}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className={LABEL_CLASS}>Tipo Combustible</label>
                                                <select 
                                                    name="tipo_combustible"
                                                    value={editingVehiculo.tipo_combustible || ''}
                                                    onChange={handleVehiculoChange}
                                                    className={`${FIELD_CLASS} font-black tracking-widest cursor-pointer appearance-none`}
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    {tiposCombustible.map(c => (
                                                        <option key={c.id} value={c.nombre}>{c.nombre}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className={LABEL_CLASS}>VIN / Chasis</label>
                                                <input 
                                                    name="nro_chasis"
                                                    value={editingVehiculo.nro_chasis || ''}
                                                    onChange={handleVehiculoChange}
                                                    className={FIELD_CLASS}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className={LABEL_CLASS}>Nro. Motor</label>
                                                <input 
                                                    name="nro_motor"
                                                    value={editingVehiculo.nro_motor || ''}
                                                    onChange={handleVehiculoChange}
                                                    className={FIELD_CLASS}
                                                />
                                            </div>
                                            </div>
                                            <div className="pt-6 mt-auto flex justify-end">
                                                <button 
                                                    type="submit" 
                                                    disabled={submitting}
                                                    className={PRIMARY_BTN}
                                                >
                                                    {submitting ? 'Guardando...' : <><Save className="w-4 h-4" /> Guardar Cambios</>}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="docs"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                {/* Grid de tarjetas por tipo */}
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                                    {tiposDoc.map(tipo => {
                                        // Buscar si este tipo ya tiene un documento cargado
                                        const docCargado = documentos.find(d => d.tipo === tipo.id);
                                        const status = docCargado ? getStatusVencimiento(docCargado.fecha_vencimiento) : null;
                                        const Icon = getIcon(tipo.icono);
                                        const colors = getColorClasses(tipo.color);

                                        return (
                                            <div 
                                                key={tipo.id}
                                                className={`relative overflow-hidden bg-white p-3 rounded-2xl border shadow-sm transition-all flex flex-col h-full ${docCargado ? 'border-slate-200' : 'border-dashed border-slate-300 opacity-80 hover:opacity-100'}`}
                                            >
                                                <div className="flex items-start justify-between gap-2 mb-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-inner shrink-0 ${colors}`}>
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    {docCargado ? (
                                                        <div className={`px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter flex items-center gap-1 ${status.bg} ${status.color}`}>
                                                            <status.icon className="w-3 h-3" /> {status.label}
                                                        </div>
                                                    ) : (
                                                        <div className="px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter bg-slate-100 text-slate-400">
                                                            Pendiente
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex-1">
                                                    <h4 className="text-[10px] font-medium text-slate-700 uppercase tracking-tighter mb-1 line-clamp-2">{tipo.nombre}</h4>
                                                    {docCargado ? (
                                                        <div className="space-y-0.5">
                                                            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-tighter flex items-center gap-1">
                                                                <Calendar className="w-3 h-3" /> Vencimiento: {docCargado.fecha_vencimiento || 'No expira'}
                                                            </p>
                                                            {docCargado.observaciones && (
                                                                <p className="text-[9px] font-medium text-slate-500 truncate">"{docCargado.observaciones}"</p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-tighter leading-relaxed">Este documento aún no ha sido cargado al sistema.</p>
                                                    )}
                                                </div>

                                                <div className="mt-3 flex items-center gap-2">
                                                    {docCargado ? (
                                                        <>
                                                            <a 
                                                                href={docCargado.archivo} 
                                                                target="_blank" 
                                                                rel="noreferrer"
                                                                className={`${DOC_ACTION_BTN} flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20`}
                                                            >
                                                                <Download className="w-4 h-4" /> Ver Archivo
                                                            </a>
                                                            <button 
                                                                onClick={() => handleDeleteDocument(docCargado.id)}
                                                                className="w-9 h-9 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button 
                                                            onClick={() => setSelectedTipoForUpload(tipo)}
                                                            className={`${DOC_ACTION_BTN} w-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-100`}
                                                        >
                                                            <Plus className="w-4 h-4" /> Cargar Ahora
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

        </MotionDiv>

        {/* Modal de Carga - Teletransportado vía Portal para cubrir viewport completo */}
        {createPortal(
            <AnimatePresence>
                {selectedTipoForUpload && (
                    <div className="fixed top-0 left-0 w-screen h-screen z-[10002] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedTipoForUpload(null)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                                <div>
                                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Cargar Documento</p>
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">{selectedTipoForUpload.nombre}</h3>
                                </div>
                                <button onClick={() => setSelectedTipoForUpload(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                            
                            <form onSubmit={handleFileUpload} className="p-5 space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className={LABEL_CLASS}>Fecha de Vencimiento</label>
                                        <input 
                                            type="date"
                                            value={uploadData.fecha_vencimiento}
                                            onChange={e => setUploadData({...uploadData, fecha_vencimiento: e.target.value})}
                                            className={FIELD_CLASS}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className={LABEL_CLASS}>Días Aviso Previo</label>
                                        <input 
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            placeholder={`Defecto: ${selectedTipoForUpload.dias_aviso_defecto || 15}`}
                                            value={uploadData.dias_aviso}
                                            onChange={e => setUploadData({...uploadData, dias_aviso: e.target.value})}
                                            className={FIELD_CLASS}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className={LABEL_CLASS}>Archivo</label>
                                    <div className="relative">
                                        <input 
                                            type="file"
                                            onChange={e => setUploadData({...uploadData, archivo: e.target.files[0]})}
                                            className="hidden"
                                            id="modal-file-upload"
                                            required
                                        />
                                        <label 
                                            htmlFor="modal-file-upload"
                                            className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-200 rounded-2xl hover:bg-blue-50/50 hover:border-blue-300 transition-all cursor-pointer group"
                                        >
                                            {uploadData.archivo ? (
                                                <div className="flex items-center gap-3">
                                                    <FileIcon className="w-8 h-8 text-blue-600" />
                                                    <span className="text-[10px] font-medium text-slate-600 truncate max-w-[200px] uppercase tracking-tighter">{uploadData.archivo.name}</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <UploadCloud className="w-10 h-10 text-slate-300 group-hover:text-blue-500 transition-colors mb-2" />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seleccionar Archivo</span>
                                                </>
                                            )}
                                        </label>
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={submitting}
                                    className={`${PRIMARY_BTN} w-full`}
                                >
                                    {submitting ? 'Subiendo...' : 'Vincular Documento'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>,
            document.body
        )}
        <AnimatePresence>
            {feedback && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[10001] text-[10px] font-bold uppercase p-3 rounded-xl border flex gap-2 items-center shadow-xl ${feedback.type === 'success' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}
                >
                    {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    {feedback.text}
                    <button type="button" onClick={() => setFeedback(null)} className="p-1 hover:bg-white/60 rounded-lg">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
        <AnimatePresence>
            {pendingDeleteDocId && (
                <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => setPendingDeleteDocId(null)}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 12 }}
                        className="relative z-10 bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full border border-slate-200"
                    >
                        <div className="bg-slate-50 border-b border-slate-100 p-4">
                            <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Confirmación</p>
                            <h3 className="text-sm font-bold text-slate-800 tracking-tight uppercase">Eliminar Documento</h3>
                        </div>
                        <div className="p-5">
                            <p className="text-xs font-medium text-slate-700 uppercase leading-relaxed">
                                ¿Está seguro de eliminar este documento?
                            </p>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button type="button" onClick={() => setPendingDeleteDocId(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shrink-0">
                                Cancelar
                            </button>
                            <button type="button" onClick={confirmDeleteDocument} className="bg-rose-600 hover:bg-rose-700 text-white h-10 min-h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-900/20 inline-flex items-center justify-center gap-2 shrink-0 active:scale-95 leading-none box-border">
                                <Trash2 className="w-4 h-4" />
                                Eliminar
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </>
);
};

export default VehiculoDetalle;

