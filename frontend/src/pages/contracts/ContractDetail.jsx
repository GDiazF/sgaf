import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api';
import {
    FileText,
    ArrowLeft,
    Calendar,
    Building2,
    Tag,
    Activity,
    Clock,
    Download,
    Plus,
    Trash2,
    Eye,
    X,
    Save,
    History,
    FileSearch,
    Info,
    ChevronRight,
    Search,
    ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ContractDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [contract, setContract] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('info'); // 'info', 'docs', 'history'

    // Document Upload State
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [previewDoc, setPreviewDoc] = useState(null);
    const [uploadFormData, setUploadFormData] = useState({
        nombre: '',
        archivo: null
    });

    const fetchContract = async () => {
        try {
            setLoading(true);
            const response = await api.get(`contratos/contratos/${id}/`);
            setContract(response.data);
        } catch (error) {
            console.error("Error fetching contract:", error);
            alert("Error al cargar el contrato.");
            navigate('/contracts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContract();
    }, [id]);

    const handleFileUpload = async (e) => {
        e.preventDefault();
        const data = new FormData();
        data.append('contrato', id);
        data.append('nombre', uploadFormData.nombre);
        data.append('archivo', uploadFormData.archivo);

        try {
            await api.post('contratos/documentos/', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setShowUploadModal(false);
            setUploadFormData({ nombre: '', archivo: null });
            fetchContract();
        } catch (error) {
            console.error(error);
            alert("Error al subir documento.");
        }
    };

    const handleDeleteDoc = async (docId) => {
        if (!window.confirm("¿Seguro que desea eliminar este documento?")) return;
        try {
            await api.delete(`contratos/documentos/${docId}/`);
            fetchContract();
        } catch (error) {
            console.error(error);
            alert("Error al eliminar.");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!contract) return null;

    return (
        <div className="space-y-6">
            {/* Breadcrumbs & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/contracts')}
                        className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-blue-600 shadow-sm border border-transparent hover:border-slate-100"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                            <Link to="/contracts" className="hover:text-blue-600">Contratos</Link>
                            <ChevronRight className="w-3 h-3" />
                            <span className="text-blue-600">Expediente Digital</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            {contract.codigo_mercado_publico}
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${contract.estado_nombre === 'VIGENTE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        contract.estado_nombre === 'TERMINADO' ? 'bg-slate-50 text-slate-500 border border-slate-100' :
                            'bg-blue-50 text-blue-600 border border-blue-100'
                        }`}>
                        {contract.estado_nombre}
                    </span>
                </div>
            </div>

            {/* Quick Stats Grid - Compact & Symmetrical */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { icon: <Building2 className="w-4 h-4" />, bg: 'bg-blue-50', text: 'text-blue-600', label: 'Proveedor Adjudicado', val: contract.proveedor_nombre || "No asignado" },
                    { icon: <Calendar className="w-4 h-4" />, bg: 'bg-indigo-50', text: 'text-indigo-600', label: 'Término de Vigencia', val: new Date(contract.fecha_termino).toLocaleDateString('es-CL') },
                    { icon: <Clock className="w-4 h-4" />, bg: 'bg-amber-50', text: 'text-amber-600', label: 'Duración de Contrato', val: `${contract.plazo_meses} Meses` },
                    { icon: <Tag className="w-4 h-4" />, bg: 'bg-purple-50', text: 'text-purple-600', label: 'Categoría de Servicio', val: contract.categoria_nombre }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between lg:h-28 hover:shadow-md transition-all border-b-2 border-b-transparent hover:border-b-blue-500">
                        <div className="flex items-center gap-2">
                            <div className={`p-2 ${stat.bg} ${stat.text} rounded-xl`}>
                                {stat.icon}
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{stat.label}</span>
                        </div>
                        <p className="font-black text-slate-800 truncate text-sm lg:text-base">{stat.val}</p>
                    </div>
                ))}
            </div>

            {/* Main Content Area - Monolithic squared container */}
            <div className="space-y-4">
                {/* Tab Navigation - Sidebar color matching */}
                <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-100 flex gap-1 self-start inline-flex">
                    {[
                        { id: 'info', label: 'General', icon: <Info className="w-4 h-4" /> },
                        { id: 'docs', label: 'Archivos', icon: <FileSearch className="w-4 h-4" />, count: contract.documentos?.length },
                        { id: 'history', label: 'Historial', icon: <History className="w-4 h-4" /> }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2.5 ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            {tab.icon}
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className={`px-1.5 py-0.5 rounded text-[9px] ${activeTab === tab.id ? 'bg-white/20' : 'bg-slate-100'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {activeTab === 'info' && (
                            <motion.div
                                key="info"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="p-6 lg:p-8"
                            >
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 space-y-8">
                                        <section>
                                            <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> Resumen del Contrato
                                            </h3>
                                            <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 relative">
                                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                                    <FileText className="w-16 h-16" />
                                                </div>
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Descripción General</label>
                                                <p className="text-slate-700 leading-relaxed font-bold text-sm italic">
                                                    "{contract.descripcion}"
                                                </p>
                                            </div>
                                        </section>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <section>
                                                <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Datos del Proceso</h3>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-50 shadow-sm">
                                                        <span className="text-[9px] text-slate-400 font-black uppercase">Tipo Proceso</span>
                                                        <span className="text-xs font-bold text-slate-800 bg-blue-50 px-2 py-0.5 rounded-md">{contract.proceso_nombre}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-50 shadow-sm">
                                                        <span className="text-[9px] text-slate-400 font-black uppercase">Orientación</span>
                                                        <span className="text-xs font-bold text-slate-800 bg-indigo-50 px-2 py-0.5 rounded-md">{contract.orientacion_nombre || "No definida"}</span>
                                                    </div>
                                                </div>
                                            </section>
                                            <section>
                                                <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Fechas Clave</h3>
                                                <div className="space-y-3">
                                                    {[
                                                        { label: 'Adjudicación', val: contract.fecha_adjudicacion, color: 'bg-emerald-50 text-emerald-700' },
                                                        { label: 'Inicio Vigencia', val: contract.fecha_inicio, color: 'bg-blue-50 text-blue-700' }
                                                    ].map((f, i) => (
                                                        <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-50 shadow-sm">
                                                            <span className="text-[9px] text-slate-400 font-black uppercase">{f.label}</span>
                                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${f.color} font-mono`}>
                                                                {new Date(f.val).toLocaleDateString('es-CL')}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
                                            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Activity className="w-3 h-3 text-blue-500" /> Metadata Técnica
                                            </h3>
                                            <div className="space-y-3">
                                                <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">ID Contrato</span>
                                                    <span className="text-xs font-mono font-black text-blue-600">ID-{id.padStart(5, '0')}</span>
                                                </div>
                                                <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Último Cambio</span>
                                                    <span className="text-[10px] font-bold text-slate-700">{new Date(contract.updated_at).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/10 relative overflow-hidden group">
                                            <div className="absolute -right-3 -bottom-3 opacity-10 transform scale-150 rotate-12 transition-transform group-hover:scale-175 group-hover:rotate-6">
                                                <ShieldCheck className="w-20 h-20" />
                                            </div>
                                            <h4 className="font-black text-[9px] uppercase tracking-[0.2em] mb-4 relative z-10 flex items-center gap-2 text-blue-100">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-pulse" /> Estado de Alerta
                                            </h4>
                                            <div className="space-y-3 relative z-10">
                                                <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
                                                    <div className="flex justify-between items-center mb-1.5">
                                                        <p className="text-[9px] font-black text-blue-50 tracking-widest">Ejecución Temporal</p>
                                                        <span className="text-[10px] font-black">45%</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                        <div className="h-full bg-white rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(255,255,255,0.4)]" style={{ width: '45%' }}></div>
                                                    </div>
                                                </div>
                                                <p className="text-[10px] font-bold text-blue-50 leading-relaxed opacity-90">
                                                    Contrato en ejecución normal según calendario.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'docs' && (
                            <motion.div
                                key="docs"
                                initial={{ opacity: 0, scale: 0.99 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.99 }}
                                className="p-6 lg:p-8 space-y-6"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800 tracking-tight">Expediente Documental</h3>
                                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">Gestión Centralizada</p>
                                    </div>
                                    <button
                                        onClick={() => setShowUploadModal(true)}
                                        className="flex items-center gap-2.5 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10 active:scale-95"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Adjuntar
                                    </button>
                                </div>

                                <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                    <table className="w-full text-left whitespace-nowrap">
                                        <thead>
                                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Documento</th>
                                                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                                                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {contract.documentos?.map(doc => (
                                                <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                                                <FileText className="w-4 h-4" />
                                                            </div>
                                                            <span className="font-bold text-slate-700 text-xs">{doc.nombre}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-[10px] font-black text-slate-400 bg-slate-100/50 px-2.5 py-1 rounded-md">
                                                            {new Date(doc.fecha_subida).toLocaleDateString('es-CL')}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right px-8">
                                                        <div className="flex justify-end gap-1.5">
                                                            {[
                                                                { icon: <Eye className="w-3.5 h-3.5" />, color: 'text-blue-500 hover:bg-blue-50', onClick: () => setPreviewDoc(doc) },
                                                                { icon: <Download className="w-3.5 h-3.5" />, color: 'text-emerald-500 hover:bg-emerald-50', onClick: () => window.open(doc.archivo) },
                                                                { icon: <Trash2 className="w-3.5 h-3.5" />, color: 'text-red-500 hover:bg-red-50', onClick: () => handleDeleteDoc(doc.id) }
                                                            ].map((act, i) => (
                                                                <button
                                                                    key={i}
                                                                    onClick={act.onClick}
                                                                    className={`p-1.5 rounded-lg transition-all ${act.color}`}
                                                                >
                                                                    {act.icon}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {(!contract.documentos || contract.documentos.length === 0) && (
                                        <div className="py-16 text-center">
                                            <FileSearch className="w-8 h-8 text-slate-100 mx-auto mb-4" />
                                            <p className="font-black text-slate-300 uppercase tracking-widest text-[10px]">Sin archivos</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'history' && (
                            <motion.div
                                key="history"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="p-6 lg:p-8"
                            >
                                <div className="max-w-2xl mx-auto py-6 relative">
                                    <div className="absolute left-5 top-0 bottom-0 w-[1px] bg-slate-100" />
                                    <div className="space-y-8">
                                        {contract.historial?.map((log, index) => (
                                            <div key={log.id} className="flex gap-6 relative">
                                                <div className={`w-10 h-10 rounded-xl border-4 border-white shadow flex items-center justify-center relative z-10 shrink-0 ${log.accion === 'CREACION' ? 'bg-emerald-500 text-white' :
                                                    log.accion === 'MODIFICACION' ? 'bg-blue-600 text-white' : 'bg-slate-400 text-white'
                                                    }`}>
                                                    {log.accion === 'CREACION' ? <Plus className="w-4 h-4 font-black" /> : <Activity className="w-4 h-4" />}
                                                </div>
                                                <div className="flex-1 pt-1 bg-white p-4 rounded-2xl border border-slate-50 shadow-sm">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="font-black text-slate-800 text-[10px] tracking-widest uppercase">{log.accion}</h4>
                                                        <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                                            {new Date(log.fecha).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mb-3 font-bold">{log.detalle}</p>
                                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase">
                                                        <Building2 className="w-3 h-3 text-slate-300" />
                                                        <span className="text-slate-600 uppercase tracking-tight">{log.usuario}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Upload Modal */}
            <AnimatePresence>
                {showUploadModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
                            onClick={() => setShowUploadModal(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 leading-none mb-1">Adjuntar Expediente</h3>
                                    <p className="text-xs text-slate-400 font-medium">Formatos aceptados: PDF, DOCX, Imágenes</p>
                                </div>
                                <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-white rounded-xl">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleFileUpload} className="p-8 space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 ml-1 uppercase tracking-wider">Nombre del Documento</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ej: Contrato Firmado, Resolución..."
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                        value={uploadFormData.nombre}
                                        onChange={e => setUploadFormData({ ...uploadFormData, nombre: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5 ">
                                    <label className="text-xs font-bold text-slate-600 ml-1 uppercase tracking-wider">Seleccionar Archivo</label>
                                    <div className="relative group/file">
                                        <div className="w-full p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-3 group-hover/file:border-blue-300 group-hover/file:bg-blue-50/30 transition-all cursor-pointer">
                                            <div className="p-3 bg-white rounded-2xl shadow-sm text-blue-500 group-hover/file:scale-110 transition-transform">
                                                <Plus className="w-6 h-6" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-slate-600">{uploadFormData.archivo ? uploadFormData.archivo.name : "Haga clic para buscar archivo"}</p>
                                                <p className="text-xs text-slate-400">Máximo 10MB</p>
                                            </div>
                                            <input
                                                type="file"
                                                required
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                onChange={e => setUploadFormData({ ...uploadFormData, archivo: e.target.files[0] })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowUploadModal(false)}
                                        className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-2xl transition-colors text-sm"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-8 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-500/30 transition-all flex items-center gap-2 transform active:scale-95 text-sm"
                                    >
                                        <Save className="w-4 h-4" />
                                        Subir Archivo
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Preview Modal */}
            <AnimatePresence>
                {previewDoc && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/80 backdrop-blur-md"
                            onClick={() => setPreviewDoc(null)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] overflow-hidden relative z-10 flex flex-col"
                        >
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-slate-800 leading-none mb-1.5 uppercase tracking-tight">{previewDoc.nombre}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <span className="text-blue-600">Documento de Contrato</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-200" />
                                            {contract.codigo_mercado_publico}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-red-500 hover:bg-white p-2 rounded-xl transition-all">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="flex-1 bg-slate-200/50 p-4">
                                <iframe
                                    src={previewDoc.archivo}
                                    className="w-full h-full rounded-2xl border border-slate-200 bg-white shadow-inner"
                                    title="PDF Preview"
                                />
                            </div>
                            <div className="p-5 border-t border-slate-100 flex justify-end bg-white gap-4">
                                <a
                                    href={previewDoc.archivo}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-6 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-bold text-sm transition-all"
                                >
                                    Abrir en pestaña nueva
                                </a>
                                <a
                                    href={previewDoc.archivo}
                                    download
                                    className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
                                >
                                    <Download className="w-4 h-4" />
                                    Descargar Original
                                </a>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ContractDetail;
