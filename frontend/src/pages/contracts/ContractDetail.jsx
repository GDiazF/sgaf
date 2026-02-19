import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import ContractModal from '../../components/contracts/ContractModal';
import ContractReceptionModal from '../../components/contracts/ContractReceptionModal';
import FormInput from '../../components/common/FormInput';
import {
    FileText, Calendar, Building2, User, Clock, CheckCircle2, AlertCircle,
    Upload, Download, Trash2, Plus, ArrowRight, Shield, Globe, Hash, Info,
    Users, TrendingUp, Activity, DollarSign, Pencil, X, ArrowLeft, Eye, History,
    FileSearch, ShieldCheck, ShoppingBag, ChevronRight, Tag
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ContractDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [contract, setContract] = useState(null);
    const [loading, setLoading] = useState(true);
    const [receptions, setReceptions] = useState([]);
    const [history, setHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('info'); // 'info', 'docs', 'receptions', 'history'

    // Modal controls
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isDocModalOpen, setDocModalOpen] = useState(false); // Renamed from showUploadModal
    const [isReceptionModalOpen, setReceptionModalOpen] = useState(false); // Renamed from showAdquisicionModal
    const [editingRC, setEditingRC] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'periodo', direction: 'desc' });

    // Document Upload State
    const [previewDoc, setPreviewDoc] = useState(null);
    const [uploadFormData, setUploadFormData] = useState({
        nombre: '',
        archivo: null
    });

    // Recepciones State
    const [lookups, setLookups] = useState({
        establishments: [],
        providers: [],
        deliveryTypes: [],
        groups: [],
        establishmentTypes: []
    });

    const fetchLookups = async () => {
        try {
            const [estRes, provRes, delRes, grpRes, typRes] = await Promise.all([
                api.get('establecimientos/', { params: { page_size: 1000, activo: true } }),
                api.get('proveedores/', { params: { page_size: 1000 } }),
                api.get('tipos-entrega/', { params: { page_size: 1000 } }),
                api.get('grupos/', { params: { page_size: 1000 } }),
                api.get('tipos-establecimiento/')
            ]);
            setLookups({
                establishments: estRes.data.results || estRes.data,
                providers: provRes.data.results || provRes.data,
                deliveryTypes: delRes.data.results || delRes.data,
                groups: grpRes.data.results || grpRes.data,
                establishmentTypes: typRes.data.results || typRes.data
            });
        } catch (error) {
            console.error("Error fetching lookups:", error);
        }
    };

    const fetchContract = async () => {
        try {
            setLoading(true);
            const response = await api.get(`contratos/contratos/${id}/`);
            setContract(response.data);
            setReceptions(response.data.recepciones || []);
            setHistory(response.data.historial || []);
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
        fetchLookups();
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
            setDocModalOpen(false);
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

    const handleCreateReception = async (formData) => {
        try {
            if (editingRC) {
                await api.put(`facturas-adquisicion/${editingRC.id}/`, {
                    ...formData,
                    contrato: contract.id
                });
            } else {
                await api.post('facturas-adquisicion/', {
                    ...formData,
                    contrato: contract.id
                });
            }
            setReceptionModalOpen(false);
            setEditingRC(null);
            fetchContract();
        } catch (error) {
            console.error(error);
            alert("Error al procesar la recepción.");
        }
    };

    const handleEditReception = (rc) => {
        setEditingRC(rc);
        setReceptionModalOpen(true);
    };

    const handleDeleteReception = async (rcId) => {
        if (!window.confirm("¿Está seguro que desea eliminar (anular) esta recepción? El presupuesto se restaurará.")) return;
        try {
            await api.delete(`facturas-adquisicion/${rcId}/`);
            fetchContract();
        } catch (error) {
            console.error(error);
            alert("Error al eliminar la recepción.");
        }
    };

    const handleDownloadPDF = async (rc) => {
        try {
            const response = await api.get(`facturas-adquisicion/${rc.id}/generate_pdf/`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const oc = rc.nro_oc || contract.nro_oc;
            const rawFilename = oc ? `RC ${oc}.pdf` : `RC ${rc.folio || rc.id}.pdf`;
            const filename = rawFilename.replace(/[/\\?%*:|"<>]/g, '-');
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Error downloading PDF:", error);
            alert("Error al generar el PDF.");
        }
    };

    const handleSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const sortedReceptions = [...receptions].sort((a, b) => {
        if (!sortConfig.key) return 0;

        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) return <TrendingUp className="w-2.5 h-2.5 opacity-20" />;
        return sortConfig.direction === 'asc'
            ? <TrendingUp className="w-2.5 h-2.5 text-blue-600 rotate-180 transition-transform" />
            : <TrendingUp className="w-2.5 h-2.5 text-blue-600 transition-transform" />;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!contract) return null;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const getStatusColor = (status) => {
        switch (status?.toUpperCase()) {
            case 'VIGENTE':
            case 'ACTIVO':
                return 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm shadow-emerald-500/5';
            case 'FINALIZADO': return 'bg-slate-50 text-slate-700 border-slate-100';
            case 'PENDIENTE': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'CADUCADO': return 'bg-red-50 text-red-700 border-red-100';
            default: return 'bg-slate-50 text-slate-700 border-slate-100';
        }
    };

    const executionPercentage = contract?.monto_total > 0
        ? Math.min(Math.round((contract.monto_ejecutado / contract.monto_total) * 100), 100)
        : 0;

    const calculateTimeExecution = () => {
        if (!contract?.fecha_inicio || !contract?.plazo_meses) return { percentage: 0, monthsLeft: 0 };
        const start = new Date(contract.fecha_inicio);
        const now = new Date();
        const end = new Date(start);
        end.setMonth(start.getMonth() + contract.plazo_meses);
        const totalDuration = end.getTime() - start.getTime();
        const elapsed = now.getTime() - start.getTime();
        const percentage = Math.min(Math.round((elapsed / totalDuration) * 100), 100);
        const monthsLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
        return { percentage, monthsLeft };
    };

    const { percentage: timePercentage, monthsLeft } = calculateTimeExecution();

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

            {/* Dashboard Top Section: Stats Grid + Execution Chart */}
            <div className="grid grid-cols-12 gap-6">
                {/* 2x2 Stats Grid */}
                <div className="col-span-12 lg:col-span-5 grid grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><DollarSign className="w-4 h-4" /></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Presupuesto<br />Total</span>
                        </div>
                        <p className="text-xl font-black text-slate-900 mt-4">{formatCurrency(contract.monto_total)}</p>
                    </div>

                    <div className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-50 rounded-xl text-amber-600"><Activity className="w-4 h-4" /></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Monto<br />Ejecutado</span>
                        </div>
                        <div className="mt-4">
                            <p className="text-xl font-black text-slate-900 leading-none">{formatCurrency(contract.monto_ejecutado)}</p>
                            <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className="bg-amber-500 h-full rounded-full transition-all duration-1000"
                                    style={{ width: `${executionPercentage}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><CheckCircle2 className="w-4 h-4" /></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Presupuesto<br />Disponible</span>
                        </div>
                        <p className="text-xl font-black text-slate-900 mt-4">{formatCurrency(contract.monto_restante)}</p>
                    </div>

                    <div className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><Clock className="w-4 h-4" /></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Duración del<br />Contrato</span>
                        </div>
                        <p className="text-xl font-black text-slate-900 mt-4">{contract.plazo_meses} <span className="text-[10px] font-bold text-slate-400 uppercase">Meses</span></p>
                    </div>
                </div>

                {/* Execution Chart - Adjacent to the stats */}
                <div className="col-span-12 lg:col-span-7">
                    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm h-full flex flex-col">
                        <h3 className="text-xs font-black text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-widest">
                            <TrendingUp className="w-4 h-4 text-indigo-500" />
                            Curva de Ejecución Mensual
                        </h3>
                        <div className="flex-1 min-h-[160px] w-full">
                            {contract.gastos_mensuales?.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={contract.gastos_mensuales} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorMonto" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="mes"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                                            tickFormatter={(val) => `$${val / 1000000}M`}
                                        />
                                        <Tooltip
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700">
                                                            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">{label}</p>
                                                            <p className="text-sm font-bold">{formatCurrency(payload[0].value)}</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="monto"
                                            stroke="#6366f1"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorMonto)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3 border-2 border-dashed border-slate-50 rounded-2xl">
                                    <TrendingUp className="w-8 h-8 opacity-20" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Sin datos de ejecución aún</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Unified Tabs & Content */}
            <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[500px]">
                {/* Tab Header Strip */}
                <div className="flex items-center gap-1 p-2 bg-slate-50/50 border-b border-slate-100 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'info', label: 'General', icon: <Info className="w-4 h-4" /> },
                        { id: 'receptions', label: 'Recepciones', icon: <ShoppingBag className="w-4 h-4" />, count: receptions?.length },
                        { id: 'docs', label: 'Archivos', icon: <FileSearch className="w-4 h-4" />, count: contract.documentos?.length },
                        { id: 'history', label: 'Historial', icon: <History className="w-4 h-4" />, count: history?.length }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-2.5 rounded-2xl text-[13px] font-bold transition-all flex items-center gap-2.5 whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
                        >
                            <span className={activeTab === tab.id ? 'text-blue-600' : 'opacity-50'}>{tab.icon}</span>
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] ${activeTab === tab.id ? 'bg-blue-50 text-blue-600' : 'bg-slate-200/50 text-slate-500'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-hidden">
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
                                                    <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-50 shadow-sm">
                                                        <span className="text-[9px] text-slate-400 font-black uppercase">Tipo OC</span>
                                                        <span className="text-xs font-bold text-slate-800 bg-amber-50 px-2 py-0.5 rounded-md">{contract.tipo_oc === 'UNICA' ? 'Única' : 'Múltiple'}</span>
                                                    </div>
                                                    {contract.tipo_oc === 'UNICA' && contract.nro_oc && (
                                                        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-50 shadow-sm">
                                                            <span className="text-[9px] text-slate-400 font-black uppercase">Nº OC</span>
                                                            <span className="text-xs font-mono font-bold text-blue-700">{contract.nro_oc}</span>
                                                        </div>
                                                    )}
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

                                    <div className="space-y-4 flex flex-col">
                                        {/* Metadata Card (Neutral) */}
                                        <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm relative overflow-hidden flex-1 flex flex-col justify-center">
                                            <div className="absolute -right-2 -top-2 opacity-[0.03] transform rotate-12">
                                                <Activity className="w-24 h-24" />
                                            </div>
                                            <h4 className="font-black text-[9px] uppercase tracking-[0.2em] mb-4 text-slate-400 flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" /> Resumen Técnico
                                            </h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-3 bg-slate-50/50 rounded-2xl border border-slate-100">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">ID Mercado Público</span>
                                                    <span className="text-[11px] font-mono font-black text-blue-600 truncate block">{contract.codigo_mercado_publico || 'N/A'}</span>
                                                </div>
                                                <div className="p-3 bg-slate-50/50 rounded-2xl border border-slate-100">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Última Edición</span>
                                                    <span className="text-[10px] font-bold text-slate-700 block text-ellipsis overflow-hidden whitespace-nowrap">
                                                        {new Date(contract.updated_at).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Budget Execution Card (Green) */}
                                        <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-[32px] p-6 text-white shadow-lg shadow-emerald-500/10 relative overflow-hidden group flex-1 flex flex-col justify-center">
                                            <div className="absolute -right-3 -bottom-3 opacity-10 transform scale-150 rotate-12 transition-transform group-hover:scale-175 group-hover:rotate-6">
                                                <DollarSign className="w-20 h-20" />
                                            </div>
                                            <h4 className="font-black text-[9px] uppercase tracking-[0.2em] mb-4 relative z-10 flex items-center gap-2 text-emerald-100">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" /> Control Presupuestario
                                            </h4>
                                            <div className="space-y-3 relative z-10">
                                                <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
                                                    <div className="flex justify-between items-center mb-1.5">
                                                        <p className="text-[9px] font-black text-emerald-50 tracking-widest">Presupuesto Ejecutado</p>
                                                        <span className="text-[10px] font-black">{executionPercentage}%</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-emerald-400 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                                                            style={{ width: `${executionPercentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <p className="text-[10px] font-bold text-emerald-50 leading-relaxed opacity-90">
                                                    Quedan {formatCurrency(contract.monto_restante)} disponibles.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Time Execution Card (Blue) */}
                                        <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[32px] p-6 text-white shadow-lg shadow-blue-500/10 relative overflow-hidden group flex-1 flex flex-col justify-center">
                                            <div className="absolute -right-3 -bottom-3 opacity-10 transform scale-150 rotate-12 transition-transform group-hover:scale-175 group-hover:rotate-6">
                                                <Clock className="w-20 h-20" />
                                            </div>
                                            <h4 className="font-black text-[9px] uppercase tracking-[0.2em] mb-4 relative z-10 flex items-center gap-2 text-blue-100">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-pulse" /> Control de Plazos
                                            </h4>
                                            <div className="space-y-3 relative z-10">
                                                <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
                                                    <div className="flex justify-between items-center mb-1.5">
                                                        <p className="text-[9px] font-black text-blue-50 tracking-widest">Ejecución de Tiempo</p>
                                                        <span className="text-[10px] font-black">{timePercentage}%</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-400 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(96,165,250,0.4)]"
                                                            style={{ width: `${timePercentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <p className="text-[10px] font-bold text-blue-50 leading-relaxed opacity-90">
                                                    {monthsLeft > 0
                                                        ? `Quedan ${monthsLeft} meses de vigencia.`
                                                        : "Contrato cumplió su plazo."}
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
                                        onClick={() => setDocModalOpen(true)}
                                        className="flex items-center gap-2.5 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10 active:scale-95"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Adjuntar
                                    </button>
                                </div>

                                <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm max-h-[400px] overflow-y-auto">
                                    <table className="w-full text-left whitespace-nowrap relative">
                                        <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
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

                        {activeTab === 'receptions' && (
                            <motion.div
                                key="receptions"
                                initial={{ opacity: 0, scale: 0.99 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.99 }}
                                className="p-6 lg:p-8 space-y-6"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800 tracking-tight">Recepciones Conformes relacionadas</h3>
                                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">Control de entregas y facturación</p>
                                    </div>
                                    <button
                                        onClick={() => setReceptionModalOpen(true)}
                                        className="flex items-center gap-2.5 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10 active:scale-95"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Nueva Recepción
                                    </button>
                                </div>

                                <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                    <table className="w-full text-left whitespace-nowrap">
                                        <thead className="bg-slate-50 border-b border-slate-100">
                                            <tr>
                                                <th
                                                    className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/50 transition-colors"
                                                    onClick={() => handleSort('folio')}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        Folio / OC <SortIcon column="folio" />
                                                    </div>
                                                </th>
                                                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Glosa / Concepto</th>
                                                <th
                                                    className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/50 transition-colors"
                                                    onClick={() => handleSort('total_pagar')}
                                                >
                                                    <div className="flex items-center justify-end gap-2">
                                                        Total RC <SortIcon column="total_pagar" />
                                                    </div>
                                                </th>
                                                <th
                                                    className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/50 transition-colors"
                                                    onClick={() => handleSort('periodo')}
                                                >
                                                    <div className="flex items-center justify-center gap-2">
                                                        Periodo / Fecha <SortIcon column="periodo" />
                                                    </div>
                                                </th>
                                                <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {sortedReceptions.map((rc) => (
                                                <tr key={rc.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-4 py-4">
                                                        <div className="space-y-1">
                                                            <div className="text-[11px] font-black text-slate-900">{rc.folio}</div>
                                                            <div className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5">
                                                                <Hash className="w-2.5 h-2.5" />
                                                                {rc.nro_oc || contract.nro_oc || 'SIN OC'}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="space-y-1 max-w-xs">
                                                            <div className="text-[11px] font-bold text-slate-700 truncate" title={rc.descripcion}>{rc.descripcion}</div>
                                                            <div className="text-[9px] text-slate-400 font-medium italic">
                                                                {rc.periodo ? (() => {
                                                                    const [year, month] = rc.periodo.split('-');
                                                                    const date = new Date(year, month - 1, 1);
                                                                    return date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }).toUpperCase();
                                                                })() : 'Sin periodo'}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        <div className="text-[11px] font-black text-slate-900">{formatCurrency(rc.total_pagar)}</div>
                                                        <div className="text-[9px] font-bold text-slate-400">{new Date(rc.fecha_recepcion).toLocaleDateString('es-CL')}</div>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div className="text-[11px] font-black text-slate-900">{rc.fecha_recepcion}</div>
                                                            <div className="flex justify-center">
                                                                {rc.nro_factura ? (
                                                                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase flex items-center gap-1">
                                                                        <CheckCircle2 className="w-2 h-2" /> RC
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[8px] font-black uppercase flex items-center gap-1">
                                                                        <AlertCircle className="w-2 h-2" /> PEND
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center justify-center gap-2 transition-all">
                                                            <button
                                                                onClick={() => handleEditReception(rc)}
                                                                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 transition-all"
                                                                title="Editar RC"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDownloadPDF(rc)}
                                                                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-100 hover:bg-emerald-50 transition-all"
                                                                title="Descargar PDF"
                                                            >
                                                                <Download className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteReception(rc.id)}
                                                                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all"
                                                                title="Anular RC"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {(!receptions || receptions.length === 0) && (
                                        <div className="py-16 text-center">
                                            <ShoppingBag className="w-8 h-8 text-slate-100 mx-auto mb-4" />
                                            <p className="font-black text-slate-300 uppercase tracking-widest text-[10px]">Sin recepciones registradas</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'history' && (
                            <motion.div
                                key="history"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="p-6 lg:p-8"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-black text-slate-800 tracking-tight">Bitácora de Cambios</h3>
                                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">Auditoría completa del proceso</p>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm flex flex-col h-[500px]">
                                        <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
                                            <table className="w-full text-left">
                                                <thead className="sticky top-0 z-20 bg-slate-50 border-b border-slate-100">
                                                    <tr>
                                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest w-1/4">Momento / Acción</th>
                                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest w-2/4">Detalle de la Operación</th>
                                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest w-1/4 text-right">Usuario</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {history?.map((log, index) => (
                                                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                                            <td className="px-6 py-4 align-top">
                                                                <div className="flex flex-col gap-1.5">
                                                                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md self-start">
                                                                        {new Date(log.fecha).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                                                                    </span>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`w-2 h-2 rounded-full ${log.accion === 'CREACION' ? 'bg-emerald-500' :
                                                                            log.accion === 'MODIFICACION' ? 'bg-blue-500' :
                                                                                log.accion.includes('ELIMINACION') ? 'bg-red-500' : 'bg-slate-400'
                                                                            }`} />
                                                                        <span className="text-[9px] font-black text-slate-700 uppercase tracking-wider">{log.accion}</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 align-top">
                                                                <p className="text-xs text-slate-600 font-bold leading-relaxed max-w-xl whitespace-pre-wrap">
                                                                    {log.detalle}
                                                                </p>
                                                            </td>
                                                            <td className="px-6 py-4 align-top text-right">
                                                                <div className="flex items-center justify-end gap-1.5 text-[9px] font-black text-slate-400 uppercase">
                                                                    <Users className="w-3 h-3 text-slate-300" />
                                                                    <span className="text-slate-600">{log.usuario}</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {(!history || history.length === 0) && (
                                                <div className="py-16 text-center">
                                                    <History className="w-8 h-8 text-slate-100 mx-auto mb-4" />
                                                    <p className="font-black text-slate-300 uppercase tracking-widest text-[10px]">Sin registros en bitácora</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Upload Modal */}
            <AnimatePresence>
                {isDocModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
                            onClick={() => setDocModalOpen(false)}
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
                                <button onClick={() => setDocModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-white rounded-xl">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleFileUpload} className="p-8 space-y-6">
                                <FormInput
                                    label="Nombre del Documento"
                                    icon={<FileText />}
                                    required
                                    placeholder="Ej: Contrato Firmado, Resolución..."
                                    value={uploadFormData.nombre}
                                    onChange={e => setUploadFormData({ ...uploadFormData, nombre: e.target.value })}
                                />

                                <div className="space-y-2">
                                    <label className="form-label">
                                        <Plus className="w-3.5 h-3.5 text-blue-500" /> Seleccionar Archivo
                                    </label>
                                    <div className="relative group/file">
                                        <div className="w-full p-8 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-3 group-hover/file:border-blue-400 group-hover/file:bg-blue-50/50 group-hover/file:shadow-xl group-hover/file:shadow-blue-500/5 transition-all cursor-pointer backdrop-blur-sm">
                                            <div className="p-3 bg-white rounded-2xl shadow-sm text-blue-500 group-hover/file:scale-110 group-hover/file:bg-blue-500 group-hover/file:text-white transition-all duration-300">
                                                <Plus className="w-6 h-6" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-black text-slate-700">{uploadFormData.archivo ? uploadFormData.archivo.name : "Haga clic para buscar archivo"}</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mt-1">Máximo 10MB • PDF, DOCX, IMG</p>
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
                                        onClick={() => setDocModalOpen(false)}
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

            {isReceptionModalOpen && (
                <ContractReceptionModal
                    isOpen={isReceptionModalOpen}
                    onClose={() => {
                        setReceptionModalOpen(false);
                        setEditingRC(null);
                    }}
                    onSave={handleCreateReception}
                    contract={contract}
                    lookups={lookups}
                    editingRC={editingRC}
                />
            )}

            {isEditModalOpen && (
                <ContractModal
                    isOpen={isEditModalOpen}
                    onClose={() => setEditModalOpen(false)}
                    onSave={() => {
                        setEditModalOpen(false);
                        fetchContract();
                    }}
                    contract={contract}
                    lookups={lookups}
                />
            )}
        </div>
    );
};

export default ContractDetail;
