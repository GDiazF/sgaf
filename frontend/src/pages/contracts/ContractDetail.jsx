import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import ContractModal from '../../components/contracts/ContractModal';
import ContractReceptionModal from '../../components/contracts/ContractReceptionModal';
import FormInput from '../../components/common/FormInput';
import {
    FileText, Building2, Clock, CheckCircle2, AlertCircle,
    Download, Trash2, Plus, Hash, Info,
    Users, TrendingUp, Activity, DollarSign, Pencil, X, ArrowLeft, Eye, History,
    FileSearch, FolderSearch, ShoppingBag, ChevronRight, Truck
} from 'lucide-react';
import ContratoServiciosTab from './ContratoServiciosTab';
import { usePermission } from '../../hooks/usePermission';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DOC_INPUT_CLASS =
    'no-global !w-full !h-10 !min-h-10 !text-[10px] !font-bold !bg-white !border !border-slate-200 !px-3 !py-0 !rounded-xl !outline-none focus:!border-blue-500 uppercase !transition-all !shadow-sm placeholder:!text-slate-300';

const DOC_LABEL_CLASS =
    '!block !text-[10px] !font-black !text-slate-500 !uppercase !tracking-widest !mb-1.5 !ml-1';

const BTN_PRIMARY =
    'bg-blue-600 hover:bg-blue-700 text-white h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2 shrink-0 active:scale-95';

const BTN_SECONDARY =
    'bg-slate-100 hover:bg-slate-200 text-slate-600 h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shrink-0';

const ModalPortal = ({ children }) => createPortal(children, document.body);

const ContractDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { can } = usePermission();
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
        establishmentTypes: [],
        procesos: [],
        estados: [],
        categorias: [],
        orientaciones: []
    });

    const fetchLookups = async () => {
        try {
            const [estRes, provRes, delRes, grpRes, typRes, procRes, estsRes, catRes, oriRes] = await Promise.all([
                api.get('establecimientos/', { params: { page_size: 1000, activo: true } }),
                api.get('proveedores/', { params: { page_size: 1000 } }),
                api.get('tipos-entrega/', { params: { page_size: 1000 } }),
                api.get('grupos/', { params: { page_size: 1000 } }),
                api.get('tipos-establecimiento/'),
                api.get('contratos/procesos/'),
                api.get('contratos/estados/'),
                api.get('contratos/categorias/'),
                api.get('contratos/orientaciones/')
            ]);
            setLookups({
                establishments: estRes.data.results || estRes.data,
                establecimientos: estRes.data.results || estRes.data,
                providers: provRes.data.results || provRes.data,
                proveedores: provRes.data.results || provRes.data,
                deliveryTypes: delRes.data.results || delRes.data,
                groups: grpRes.data.results || grpRes.data,
                establishmentTypes: typRes.data.results || typRes.data,
                tiposEstablecimiento: typRes.data.results || typRes.data,
                procesos: procRes.data.results || procRes.data,
                estados: estsRes.data.results || estsRes.data,
                categorias: catRes.data.results || catRes.data,
                orientaciones: oriRes.data.results || oriRes.data
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

    const handleCreateReception = async (formData, isSplit = false) => {
        try {
            if (editingRC) {
                await api.put(`facturas-adquisicion/${editingRC.id}/`, {
                    ...formData,
                    contrato: contract.id
                });
            } else {
                if (isSplit && formData.establecimientos && formData.establecimientos.length > 1) {
                    // Generar RCs individuales
                    let currentFolio = formData.folio || "";

                    for (const estId of formData.establecimientos) {
                        const estName = lookups.establishments.find(e => e.id === estId)?.nombre || '';

                        const singlePayload = {
                            ...formData,
                            establecimientos: [estId],
                            contrato: contract.id,
                            folio: currentFolio,
                            descripcion: formData.descripcion + (estName ? `\n- ${estName}` : '')
                        };

                        await api.post('facturas-adquisicion/', singlePayload);

                        // Increment folio if it ends with numbers
                        if (currentFolio) {
                            currentFolio = currentFolio.replace(/(\d+)(?!.*\d)/, (match) => {
                                const num = parseInt(match, 10) + 1;
                                return num.toString().padStart(match.length, '0');
                            });
                        }
                    }
                } else {
                    // Flujo normal (una sola RC)
                    await api.post('facturas-adquisicion/', {
                        ...formData,
                        contrato: contract.id
                    });
                }
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
        if (!contract?.fecha_inicio || (!contract?.fecha_termino && !contract?.plazo_meses)) {
            return { percentage: 0, monthsLeft: 0 };
        }

        const start = new Date(contract.fecha_inicio);
        let end;

        if (contract.fecha_termino) {
            end = new Date(contract.fecha_termino);
        } else {
            end = new Date(start);
            end.setMonth(start.getMonth() + contract.plazo_meses);
        }

        const now = new Date();
        const totalDuration = end.getTime() - start.getTime();

        if (totalDuration <= 0) return { percentage: 100, monthsLeft: 0 };

        const elapsed = now.getTime() - start.getTime();
        const percentage = Math.max(0, Math.min(Math.round((elapsed / totalDuration) * 100), 100));

        const diffTime = end.getTime() - now.getTime();
        const monthsLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44)));

        return { percentage, monthsLeft };
    };

    const { percentage: timePercentage, monthsLeft } = calculateTimeExecution();

    return (
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden">
            {/* Header & Tabs Area */}
            <div className="shrink-0 space-y-4">
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
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm border ${getStatusColor(contract.estado_nombre)}`}>
                            {contract.estado_nombre}
                        </span>
                        {can('contratos.change_contrato') && (
                            <button
                                onClick={() => setEditModalOpen(true)}
                                className={BTN_PRIMARY}
                            >
                                <Pencil className="w-4 h-4" />
                                Editar Contrato
                            </button>
                        )}
                    </div>
                </div>

                {/* Tab Header Strip */}
                <div className="flex items-center gap-1 p-1 bg-slate-100/50 rounded-2xl border border-slate-200/60 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'info', label: 'General', icon: <Info className="w-4 h-4" /> },
                        { id: 'providers', label: 'Proveedores', icon: <Building2 className="w-4 h-4" />, count: contract.proveedores_asociados?.length },
                        { id: 'servicios', label: 'Gestión de Contratos', icon: <Truck className="w-4 h-4" /> },
                        { id: 'receptions', label: 'Recepciones', icon: <ShoppingBag className="w-4 h-4" />, count: receptions?.length },
                        { id: 'docs', label: 'Archivos', icon: <FileSearch className="w-4 h-4" />, count: contract.documentos?.length },
                        { id: 'history', label: 'Historial', icon: <History className="w-4 h-4" />, count: history?.length }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-2 rounded-xl text-[12px] font-bold transition-all flex items-center gap-2.5 whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
                        >
                            <span className={activeTab === tab.id ? 'text-blue-600' : 'opacity-50'}>{tab.icon}</span>
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] ${activeTab === tab.id ? 'bg-blue-50 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {activeTab === 'info' && (
                            <motion.div
                                key="info"
                                initial={{ opacity: 0, scale: 0.99 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.99 }}
                                className="p-5 space-y-4"
                            >
                                {/* AREA SUPERIOR: Estadísticas y Gráfico */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                                    {/* Izquierda: 4 Stats en rejilla 2x2 */}
                                    <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-center transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/50">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Presupuesto Total</span>
                                            <p className="text-xl font-black text-slate-900 leading-none">{formatCurrency(contract.monto_total)}</p>
                                        </div>
                                        <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-center transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/50">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Monto Ejecutado</span>
                                            <p className="text-xl font-black text-slate-900 leading-none">{formatCurrency(contract.monto_ejecutado)}</p>
                                        </div>
                                        <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-center transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/50">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Disponible</span>
                                            <p className="text-xl font-black text-emerald-600 leading-none">{formatCurrency(contract.monto_restante)}</p>
                                        </div>
                                        <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-center transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/50">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Plazo Restante</span>
                                            <p className="text-xl font-black text-slate-900 leading-none">{monthsLeft} <span className="text-xs font-bold text-slate-400 uppercase">Meses</span></p>
                                        </div>
                                    </div>

                                    {/* Derecha: Gráfico Grande */}
                                    <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col h-[200px] lg:h-[210px]">
                                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                            <TrendingUp className="w-3.5 h-3.5 text-blue-600" /> Gráfico Histórico de Ejecución Mensual
                                        </h4>
                                        <div className="flex-1 min-h-0">
                                            {contract.gastos_mensuales?.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={contract.gastos_mensuales} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                                        <defs>
                                                            <linearGradient id="colorMonto" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                        <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} tickFormatter={(val) => `$${val / 1000000}M`} />
                                                        <Tooltip
                                                            content={({ active, payload, label }) => {
                                                                if (active && payload && payload.length) {
                                                                    return (
                                                                        <div className="bg-white p-3 rounded-xl shadow-2xl border border-slate-100">
                                                                            <p className="text-[8px] font-black uppercase text-slate-400 mb-1">{label}</p>
                                                                            <p className="text-[14px] font-black text-slate-900">{formatCurrency(payload[0].value)}</p>
                                                                        </div>
                                                                    );
                                                                }
                                                                return null;
                                                            }}
                                                        />
                                                        <Area type="monotone" dataKey="monto" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorMonto)" />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                                    <Activity className="w-8 h-8 opacity-20" />
                                                    <p className="text-[9px] font-black uppercase mt-3 opacity-40 italic tracking-widest">Sin registros de ejecución mensual</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* AREA INFERIOR: 3 Columnas Sincronizadas */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 px-1 mb-1">
                                        <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest shrink-0">Resumen del Contrato</h3>
                                        <p className="text-[11px] font-black text-blue-600 uppercase tracking-tight truncate leading-none">
                                            {contract.descripcion}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:h-[240px]">
                                        {/* Col 1: 4 ítems */}
                                        <div className="flex flex-col justify-between h-full space-y-2.5 lg:space-y-0">
                                            {[
                                                { label: 'Tipo de Proceso', val: contract.proceso_nombre },
                                                { label: 'Orientación', val: contract.orientacion_nombre || "No definida" },
                                                { label: 'Tipo de OC', val: contract.tipo_oc === 'UNICA' ? 'Única' : 'Múltiple' },
                                                { label: 'Nº de OC', val: contract.nro_oc || "No aplica" }
                                            ].map((item, i) => (
                                                <div key={i} className="flex justify-between items-center px-5 py-3.5 lg:py-0 bg-white rounded-2xl border border-slate-200 shadow-sm transition-all hover:border-blue-200 lg:h-[22%] min-h-[50px]">
                                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{item.label}</span>
                                                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{item.val}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Col 2: 3 ítems */}
                                        <div className="flex flex-col justify-between h-full space-y-3 lg:space-y-0">
                                            {[
                                                { label: 'Adjudicación', val: contract.fecha_adjudicacion },
                                                { label: 'Inicio Vigencia', val: contract.fecha_inicio },
                                                { label: 'Término Contractual', val: contract.fecha_termino }
                                            ].map((f, i) => (
                                                <div key={i} className="flex justify-between items-center px-6 lg:px-6 py-4 lg:py-0 bg-white rounded-2xl border border-slate-200 shadow-sm transition-all hover:border-blue-200 lg:h-[30%] min-h-[60px]">
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{f.label}</span>
                                                    <span className="text-[11px] font-mono font-black text-slate-800">{new Date(f.val).toLocaleDateString('es-CL')}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Col 3: 2 ítems Premium */}
                                        <div className="flex flex-col justify-between h-full space-y-3 lg:space-y-0">
                                            <div className="bg-emerald-600 p-5 lg:p-6 rounded-2xl shadow-xl shadow-emerald-600/20 flex flex-col justify-between transition-all hover:scale-[1.01] lg:h-[48%] min-h-[110px] relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                                    <DollarSign className="w-14 lg:w-16 h-14 lg:h-16 text-white" />
                                                </div>
                                                <div className="flex items-center gap-2 relative z-10">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                    <h4 className="text-[9px] font-black text-emerald-50 uppercase tracking-widest leading-none">Control Presupuestario</h4>
                                                </div>
                                                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 lg:p-5 border border-white/10 relative z-10 my-1">
                                                    <div className="flex justify-between items-center mb-2 lg:mb-2.5">
                                                        <span className="text-[10px] font-black text-white uppercase tracking-tight">Presupuesto</span>
                                                        <span className="text-sm font-black text-white">{executionPercentage}%</span>
                                                    </div>
                                                    <div className="w-full bg-emerald-900/30 rounded-full h-2.5 overflow-hidden">
                                                        <div className="bg-emerald-400 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, executionPercentage)}%` }} />
                                                    </div>
                                                </div>
                                                <p className="text-[9px] font-bold text-emerald-100/80 uppercase tracking-tight relative z-10 italic">
                                                    {formatCurrency(contract.monto_restante)} disponibles
                                                </p>
                                            </div>

                                            <div className="bg-blue-600 p-5 lg:p-6 rounded-2xl shadow-xl shadow-blue-600/20 flex flex-col justify-between transition-all hover:scale-[1.01] lg:h-[48%] min-h-[110px] relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                                    <Clock className="w-14 lg:w-16 h-14 lg:h-16 text-white" />
                                                </div>
                                                <div className="flex items-center gap-2 relative z-10">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-pulse" />
                                                    <h4 className="text-[9px] font-black text-blue-50 uppercase tracking-widest leading-none">Control de Plazos</h4>
                                                </div>
                                                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 lg:p-5 border border-white/10 relative z-10 my-1">
                                                    <div className="flex justify-between items-center mb-2 lg:mb-2.5">
                                                        <span className="text-[10px] font-black text-white uppercase tracking-tight">Tiempo</span>
                                                        <span className="text-sm font-black text-white">{timePercentage}%</span>
                                                    </div>
                                                    <div className="w-full bg-blue-900/30 rounded-full h-2.5 overflow-hidden">
                                                        <div className="bg-blue-300 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, timePercentage)}%` }} />
                                                    </div>
                                                </div>
                                                <p className="text-[9px] font-bold text-blue-100/80 uppercase tracking-tight relative z-10 italic">
                                                    {monthsLeft} meses restantes
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'providers' && (
                            <motion.div
                                key="providers"
                                initial={{ opacity: 0, scale: 0.99 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.99 }}
                                className="p-6 lg:p-8 space-y-6"
                            >
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Proveedores Adjudicados</h3>
                                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">Líneas de adjudicación y presupuestos individuales</p>
                                </div>

                                <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                    <table className="w-full text-left whitespace-nowrap">
                                        <thead className="bg-slate-50 border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Proveedor</th>
                                                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Monto Adjudicado</th>
                                                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Monto Ejecutado</th>
                                                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Disponible</th>
                                                <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Consumo</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {(contract.proveedores_asociados || []).map(p => {
                                                const provPercentage = p.monto_adjudicado > 0 ? Math.min(100, Math.round((p.monto_ejecutado / p.monto_adjudicado) * 100)) : 0;
                                                return (
                                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                                                                    <Building2 className="w-4 h-4" />
                                                                </div>
                                                                <span className="font-bold text-slate-700 text-xs">{p.proveedor_nombre}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-black text-slate-800">{formatCurrency(p.monto_adjudicado)}</td>
                                                        <td className="px-6 py-4 text-right font-black text-slate-600">
                                                            {formatCurrency(p.monto_ejecutado)}
                                                            {p.monto_consumido_previo > 0 && (
                                                                <div className="text-[9px] text-slate-400 italic font-medium">Incluye {formatCurrency(p.monto_consumido_previo)} previo</div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-black text-emerald-600">{formatCurrency(p.monto_restante)}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col gap-1 items-center">
                                                                <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                                    <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${provPercentage}%` }}></div>
                                                                </div>
                                                                <span className="text-[9px] font-black text-slate-500">{provPercentage}%</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    {(!contract.proveedores_asociados || contract.proveedores_asociados.length === 0) && (
                                        <div className="py-16 text-center">
                                            <Building2 className="w-8 h-8 text-slate-100 mx-auto mb-4" />
                                            <p className="font-black text-slate-300 uppercase tracking-widest text-[10px]">Sin proveedores asignados</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'servicios' && (
                            <motion.div
                                key="servicios"
                                initial={{ opacity: 0, scale: 0.99 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.99 }}
                                className="p-6 lg:p-8"
                            >
                                <ContratoServiciosTab contractId={contract.id} />
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
                                    {can('contratos.add_documentocontrato') && (
                                        <button
                                            onClick={() => setDocModalOpen(true)}
                                            className={BTN_PRIMARY}
                                        >
                                            <Plus className="w-4 h-4" />
                                            Adjuntar
                                        </button>
                                    )}
                                </div>

                                <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm max-h-[400px] overflow-y-auto custom-scrollbar">
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
                                                            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border border-blue-100">
                                                                <FileText className="w-4 h-4" />
                                                            </div>
                                                            <span className="font-medium text-slate-700 text-[11px] uppercase tracking-tighter">{doc.nombre}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter">
                                                            {new Date(doc.fecha_subida).toLocaleDateString('es-CL')}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-1.5">
                                                            <button
                                                                onClick={() => setPreviewDoc(doc)}
                                                                className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                                title="Ver documento"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => window.open(doc.archivo)}
                                                                className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                                title="Descargar documento"
                                                            >
                                                                <Download className="w-3.5 h-3.5" />
                                                            </button>
                                                            {can('contratos.delete_documentocontrato') && (
                                                                <button
                                                                    onClick={() => handleDeleteDoc(doc.id)}
                                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                                    title="Eliminar documento"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {(!contract.documentos || contract.documentos.length === 0) && (
                                        <div className="py-16 text-center">
                                            <FolderSearch className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                            <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Sin archivos</p>
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
                                    {can('servicios.add_recepcionconforme') && (
                                        <button
                                            onClick={() => setReceptionModalOpen(true)}
                                            className={BTN_PRIMARY}
                                        >
                                            <Plus className="w-4 h-4" />
                                            Nueva Recepción
                                        </button>
                                    )}
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
                                                            {can('servicios.change_recepcionconforme') && (
                                                                <button
                                                                    onClick={() => handleEditReception(rc)}
                                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                    title="Editar RC"
                                                                >
                                                                    <Pencil className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleDownloadPDF(rc)}
                                                                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-100 hover:bg-emerald-50 transition-all"
                                                                title="Descargar PDF"
                                                            >
                                                                <Download className="w-3.5 h-3.5" />
                                                            </button>
                                                            {can('servicios.delete_recepcionconforme') && (
                                                                <button
                                                                    onClick={() => handleDeleteReception(rc.id)}
                                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                                    title="Anular RC"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
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
                                className="p-6 lg:p-8 h-full flex flex-col"
                            >
                                <div className="space-y-4 flex flex-col flex-1 min-h-0">
                                    <div className="flex items-center justify-between shrink-0">
                                        <div>
                                            <h3 className="text-lg font-black text-slate-800 tracking-tight">Bitácora de Cambios</h3>
                                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">Auditoría completa del proceso</p>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm flex flex-col flex-1 min-h-0">
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
                                                    {history?.map((log) => (
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
            <ModalPortal>
            <AnimatePresence>
                {isDocModalOpen && (
                    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 overflow-hidden">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed top-0 left-0 w-screen h-screen bg-slate-900/60 backdrop-blur-sm z-[9998]"
                            onClick={() => setDocModalOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-lg w-full mx-4 relative z-[10000] border border-slate-200 flex flex-col max-h-[90vh]"
                        >
                            <div className="bg-slate-50 border-b border-slate-100 p-4 md:p-6 flex justify-between items-center shrink-0">
                                <div>
                                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Adjuntar Expediente</h3>
                                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">Formatos aceptados: PDF, DOCX, Imágenes</p>
                                </div>
                                <button onClick={() => setDocModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleFileUpload} className="p-4 md:p-6 space-y-5 overflow-y-auto custom-scrollbar">
                                <FormInput
                                    label="Nombre del Documento"
                                    required
                                    placeholder="Ej: Contrato Firmado, Resolución..."
                                    value={uploadFormData.nombre}
                                    onChange={e => setUploadFormData({ ...uploadFormData, nombre: e.target.value })}
                                    labelClassName={DOC_LABEL_CLASS}
                                    inputClassName={DOC_INPUT_CLASS}
                                />

                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                                        Seleccionar Archivo
                                    </label>
                                    <div className="relative group/file">
                                        <div className="w-full p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 group-hover/file:border-blue-200 group-hover/file:bg-blue-50/40 transition-colors cursor-pointer">
                                            <div className="p-2 bg-white rounded-xl border border-slate-100 text-slate-400 group-hover/file:text-blue-500 transition-colors">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] font-bold text-slate-700 uppercase tracking-tighter">{uploadFormData.archivo ? uploadFormData.archivo.name : "Haga clic para buscar archivo"}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Máximo 10MB · PDF, DOCX, IMG</p>
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

                                <div className="pt-2 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setDocModalOpen(false)}
                                        className={BTN_SECONDARY}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className={BTN_PRIMARY}
                                    >
                                        <Plus className="w-4 h-4" />
                                        Subir Archivo
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            </ModalPortal>

            {/* Preview Modal */}
            <ModalPortal>
            <AnimatePresence>
                {previewDoc && (
                    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 overflow-hidden">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed top-0 left-0 w-screen h-screen bg-slate-900/60 backdrop-blur-sm z-[9998]"
                            onClick={() => setPreviewDoc(null)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] overflow-hidden relative z-[10000] border border-slate-200 flex flex-col"
                        >
                            <div className="bg-slate-50 border-b border-slate-100 p-4 md:p-6 flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border border-blue-100 shrink-0">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-[10px] font-bold text-slate-800 leading-none mb-1.5 uppercase tracking-widest truncate">{previewDoc.nombre}</h3>
                                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter flex items-center gap-2">
                                            <span className="text-blue-600 font-bold">Documento de Contrato</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-200" />
                                            {contract.codigo_mercado_publico}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setPreviewDoc(null)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 bg-slate-200/50 p-4">
                                <iframe
                                    src={previewDoc.archivo}
                                    className="w-full h-full rounded-2xl border border-slate-200 bg-white shadow-inner"
                                    title="PDF Preview"
                                />
                            </div>
                            <div className="p-4 md:p-5 border-t border-slate-100 flex justify-end bg-white gap-2 shrink-0">
                                <a
                                    href={previewDoc.archivo}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={BTN_SECONDARY}
                                >
                                    Abrir en pestaña nueva
                                </a>
                                <a
                                    href={previewDoc.archivo}
                                    download
                                    className={BTN_PRIMARY}
                                >
                                    <Download className="w-4 h-4" />
                                    Descargar Original
                                </a>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            </ModalPortal>

            {
                isReceptionModalOpen && (
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
                )
            }

            {
                isEditModalOpen && (
                    <ContractModal
                        isOpen={isEditModalOpen}
                        onClose={() => setEditModalOpen(false)}
                        onSave={async (dataToSubmit) => {
                            try {
                                const finalData = { ...dataToSubmit };
                                if (finalData.orientacion === '') delete finalData.orientacion;
                                
                                await api.put(`contratos/contratos/${contract.id}/`, finalData);
                                setEditModalOpen(false);
                                fetchContract();
                            } catch (error) {
                                console.error(error);
                                alert("Error al actualizar el contrato.");
                            }
                        }}
                        editingId={contract.id}
                        initialData={contract}
                        lookups={lookups}
                    />
                )
            }
        </div >
    );
};

export default ContractDetail;
