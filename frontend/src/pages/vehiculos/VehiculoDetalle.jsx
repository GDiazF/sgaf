import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Save, Trash2, FileText, ShieldCheck, Calendar, 
    UploadCloud, CheckCircle2, AlertCircle, Clock, 
    FileIcon, ChevronRight, Info, Wrench, Download, Car, Fuel, Plus, TrendingUp
} from 'lucide-react';
import api from '../../api';

const VehiculoDetalle = ({ vehiculo, onClose, onUpdate }) => {
    const [activeTab, setActiveTab] = useState('info');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [editingVehiculo, setEditingVehiculo] = useState({ ...vehiculo });
    const [documentos, setDocumentos] = useState(vehiculo.documentos || []);
    const [tiposDoc, setTiposDoc] = useState([]);
    const [tiposCombustible, setTiposCombustible] = useState([]);
    const [selectedTipoForUpload, setSelectedTipoForUpload] = useState(null);
    const [newImage, setNewImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(vehiculo.imagen || null);
    
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
        } finally {
            setLoading(false);
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
            alert("Información del vehículo actualizada.");
        } catch (error) {
            console.error("Error updating vehicle:", error);
            alert("Error al actualizar la información.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!uploadData.archivo || !selectedTipoForUpload) {
            alert("Por favor seleccione un archivo y tipo.");
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
            alert("Documento subido correctamente.");
        } catch (error) {
            console.error("Error uploading document:", error);
            alert("Error al subir el documento.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteDocument = async (id) => {
        if (!window.confirm("¿Está seguro de eliminar este documento?")) return;
        try {
            await api.delete(`vehiculos/documentos/${id}/`);
            setDocumentos(documentos.filter(d => d.id !== id));
        } catch (error) {
            console.error("Error deleting document:", error);
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
            'indigo': 'bg-indigo-50 text-indigo-600 border-indigo-100',
            'amber': 'bg-amber-50 text-amber-600 border-amber-100',
            'rose': 'bg-rose-50 text-rose-600 border-rose-100',
            'slate': 'bg-slate-50 text-slate-600 border-slate-100',
            'purple': 'bg-purple-50 text-purple-600 border-purple-100'
        };
        return colors[color] || colors.slate;
    };

    return (
        <>
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute inset-0 z-30 bg-slate-50 flex flex-col overflow-hidden"
        >
            {/* Premium Header */}
            <div className="relative h-56 md:h-64 bg-slate-900 overflow-hidden shrink-0">
                {/* Background Image / Gradient */}
                {imagePreview ? (
                    <div className="absolute inset-0">
                        <img src={imagePreview} className="w-full h-full object-cover opacity-40 scale-105 blur-sm" alt="Vehículo" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                    </div>
                ) : (
                    <div className="absolute inset-0 opacity-20">
                        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500 rounded-full blur-[100px]" />
                        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500 rounded-full blur-[100px]" />
                    </div>
                )}
                
                <div className="relative h-full flex flex-col justify-between p-6 md:p-10">
                    <div className="flex justify-between items-start">
                        <button 
                            onClick={onClose}
                            className="group flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl text-white transition-all active:scale-95 border border-white/10"
                        >
                            <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                            <span className="text-xs font-black uppercase tracking-widest">Cerrar Ficha</span>
                        </button>

                        <div className="flex gap-2">
                            <span className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 backdrop-blur-md">
                                Activo
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 md:w-28 md:h-28 bg-white/10 backdrop-blur-xl rounded-[2.5rem] border border-white/20 flex items-center justify-center shadow-2xl overflow-hidden group">
                                {imagePreview ? (
                                    <img src={imagePreview} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Foto Vehículo" />
                                ) : (
                                    <Car className="w-10 h-10 md:w-12 md:h-12 text-white" />
                                )}
                            </div>
                            <div>
                                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-none mb-3">
                                    {vehiculo.marca} {vehiculo.modelo}
                                </h2>
                                <div className="flex items-center gap-3">
                                    <span className="bg-white text-slate-900 px-4 py-1.5 rounded-xl text-xs font-black tracking-[0.2em] shadow-lg">
                                        {vehiculo.patente}
                                    </span>
                                    <span className="text-white/40 text-[11px] font-bold uppercase tracking-widest bg-white/5 px-3 py-1 rounded-lg backdrop-blur-sm">
                                        Sistema de Gestión de Activos
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex bg-white/5 backdrop-blur-md p-1.5 rounded-2xl border border-white/10">
                            <button 
                                onClick={() => setActiveTab('info')}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'info' ? 'bg-white text-slate-900 shadow-xl' : 'text-white/60 hover:text-white'}`}
                            >
                                Ficha Técnica
                            </button>
                            <button 
                                onClick={() => setActiveTab('docs')}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'docs' ? 'bg-white text-slate-900 shadow-xl' : 'text-white/60 hover:text-white'}`}
                            >
                                Documentos ({documentos.length})
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:px-4 md:pt-4 md:pb-8 custom-scrollbar w-full">
                <div className="w-full">
                    <AnimatePresence mode="wait">
                        {activeTab === 'info' ? (
                            <motion.div 
                                key="info"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="grid grid-cols-1 lg:grid-cols-12 gap-8"
                            >
                                <div className="lg:col-span-4 space-y-6">
                                    {/* Card de Foto con Subida */}
                                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center text-center relative overflow-hidden group">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 w-full text-left flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-emerald-500" /> Fotografía Oficial
                                        </h3>
                                        
                                        <div className="relative w-48 h-48 mb-6">
                                            <div className="w-full h-full rounded-full border-4 border-slate-50 overflow-hidden shadow-2xl relative">
                                                {imagePreview ? (
                                                    <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                                                ) : (
                                                    <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                                                        <Car className="w-16 h-16 text-slate-200" />
                                                    </div>
                                                )}
                                            </div>
                                            <label className="absolute bottom-2 right-2 w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xl cursor-pointer hover:bg-indigo-700 transition-all hover:scale-110">
                                                <Plus className="w-6 h-6" />
                                                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                            </label>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-8 leading-relaxed">
                                            Haz que tu flota luzca espectacular subiendo una foto real de la unidad.
                                        </p>
                                    </div>

                                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                            <Info className="w-4 h-4 text-indigo-500" /> Resumen Técnico
                                        </h3>
                                        <div className="space-y-6">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Combustible</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Fuel className="w-4 h-4 text-amber-500" />
                                                    <span className="font-bold text-slate-700">{vehiculo.tipo_combustible || 'No definido'}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado Documental</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                    <span className="font-bold text-slate-700">{documentos.length} Documentos Cargados</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:col-span-8">
                                    <form onSubmit={handleUpdateVehiculo} className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Marca</label>
                                                <input 
                                                    name="marca"
                                                    value={editingVehiculo.marca}
                                                    onChange={handleVehiculoChange}
                                                    className="w-full px-5 h-12 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modelo</label>
                                                <input 
                                                    name="modelo"
                                                    value={editingVehiculo.modelo}
                                                    onChange={handleVehiculoChange}
                                                    className="w-full px-5 h-12 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Año</label>
                                                <input 
                                                    type="number"
                                                    name="anio"
                                                    value={editingVehiculo.anio}
                                                    onChange={handleVehiculoChange}
                                                    className="w-full px-5 h-12 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Patente</label>
                                                <input 
                                                    name="patente"
                                                    value={editingVehiculo.patente}
                                                    onChange={handleVehiculoChange}
                                                    className="w-full px-5 h-12 bg-indigo-50 border border-indigo-100 rounded-xl font-black text-indigo-700 outline-none uppercase"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo Combustible</label>
                                                <select 
                                                    name="tipo_combustible"
                                                    value={editingVehiculo.tipo_combustible || ''}
                                                    onChange={handleVehiculoChange}
                                                    className="w-full px-5 h-12 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all appearance-none"
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    {tiposCombustible.map(c => (
                                                        <option key={c.id} value={c.nombre}>{c.nombre}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">VIN / Chasis</label>
                                                <input 
                                                    name="nro_chasis"
                                                    value={editingVehiculo.nro_chasis || ''}
                                                    onChange={handleVehiculoChange}
                                                    className="w-full px-5 h-12 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nro. Motor</label>
                                                <input 
                                                    name="nro_motor"
                                                    value={editingVehiculo.nro_motor || ''}
                                                    onChange={handleVehiculoChange}
                                                    className="w-full px-5 h-12 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="pt-4 flex justify-end">
                                            <button 
                                                type="submit" 
                                                disabled={submitting}
                                                className="bg-slate-900 hover:bg-black text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 shadow-xl transition-all active:scale-95"
                                            >
                                                {submitting ? 'Guardando...' : <><Save className="w-5 h-5" /> Guardar Cambios</>}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="docs"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-8"
                            >
                                {/* Grid de tarjetas por tipo */}
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {tiposDoc.map(tipo => {
                                        // Buscar si este tipo ya tiene un documento cargado
                                        const docCargado = documentos.find(d => d.tipo === tipo.id);
                                        const status = docCargado ? getStatusVencimiento(docCargado.fecha_vencimiento) : null;
                                        const Icon = getIcon(tipo.icono);
                                        const colors = getColorClasses(tipo.color);

                                        return (
                                            <div 
                                                key={tipo.id}
                                                className={`relative overflow-hidden bg-white p-6 rounded-[2.5rem] border shadow-sm transition-all flex flex-col h-full ${docCargado ? 'border-slate-100' : 'border-dashed border-slate-200 opacity-80 hover:opacity-100'}`}
                                            >
                                                <div className="flex items-start justify-between mb-6">
                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${colors}`}>
                                                        <Icon className="w-7 h-7" />
                                                    </div>
                                                    {docCargado ? (
                                                        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${status.bg} ${status.color}`}>
                                                            <status.icon className="w-3.5 h-3.5" /> {status.label}
                                                        </div>
                                                    ) : (
                                                        <div className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-400">
                                                            Pendiente
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex-1">
                                                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-1">{tipo.nombre}</h4>
                                                    {docCargado ? (
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                                <Calendar className="w-3 h-3" /> Vencimiento: {docCargado.fecha_vencimiento || 'No expira'}
                                                            </p>
                                                            {docCargado.observaciones && (
                                                                <p className="text-[10px] text-slate-500 italic truncate">"{docCargado.observaciones}"</p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="text-[10px] font-medium text-slate-400">Este documento aún no ha sido cargado al sistema.</p>
                                                    )}
                                                </div>

                                                <div className="mt-8 flex items-center gap-2">
                                                    {docCargado ? (
                                                        <>
                                                            <a 
                                                                href={docCargado.archivo} 
                                                                target="_blank" 
                                                                rel="noreferrer"
                                                                className="flex-1 bg-slate-900 hover:bg-black text-white h-11 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                                                            >
                                                                <Download className="w-4 h-4" /> Ver Archivo
                                                            </a>
                                                            <button 
                                                                onClick={() => handleDeleteDocument(docCargado.id)}
                                                                className="w-11 h-11 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl flex items-center justify-center transition-all active:scale-95"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button 
                                                            onClick={() => setSelectedTipoForUpload(tipo)}
                                                            className="w-full bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white h-11 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border border-indigo-100"
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

        </motion.div>

        {/* Modal de Carga - Fuera del motion.div para evitar problemas de posicionamiento fixed */}
        <AnimatePresence>
            {selectedTipoForUpload && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
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
                        className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
                    >
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1">Cargar Documento</p>
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{selectedTipoForUpload.nombre}</h3>
                            </div>
                            <button onClick={() => setSelectedTipoForUpload(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleFileUpload} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha de Vencimiento</label>
                                    <input 
                                        type="date"
                                        value={uploadData.fecha_vencimiento}
                                        onChange={e => setUploadData({...uploadData, fecha_vencimiento: e.target.value})}
                                        className="w-full px-4 h-12 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Días Aviso Previo</label>
                                    <input 
                                        type="number"
                                        placeholder={`Defecto: ${selectedTipoForUpload.dias_aviso_defecto || 15}`}
                                        value={uploadData.dias_aviso}
                                        onChange={e => setUploadData({...uploadData, dias_aviso: e.target.value})}
                                        className="w-full px-4 h-12 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Archivo</label>
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
                                        className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl hover:bg-indigo-50/50 hover:border-indigo-300 transition-all cursor-pointer group"
                                    >
                                        {uploadData.archivo ? (
                                            <div className="flex items-center gap-3">
                                                <FileIcon className="w-8 h-8 text-indigo-600" />
                                                <span className="text-xs font-bold text-slate-600 truncate max-w-[200px]">{uploadData.archivo.name}</span>
                                            </div>
                                        ) : (
                                            <>
                                                <UploadCloud className="w-10 h-10 text-slate-300 group-hover:text-indigo-500 transition-colors mb-2" />
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seleccionar Archivo</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={submitting}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-200 transition-all active:scale-95"
                            >
                                {submitting ? 'Subiendo...' : 'Vincular Documento'}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </>
);
};

export default VehiculoDetalle;

