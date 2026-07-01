import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Fuel, DollarSign, Activity, TrendingUp, Plus, ChevronRight, X, Save, Download, Calculator, Car, Trash2, Pencil, Sigma, Settings, AlertCircle } from 'lucide-react';
import api from '../../api';
import VehiculoDetalle from './VehiculoDetalle';
import TipoDocumentoMantenedor from './TipoDocumentoMantenedor';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { usePermission } from '../../hooks/usePermission';
import { BTN_PRIMARY, BTN_SECONDARY, INPUT_FORM, PAGE_LAYOUT, SELECT_FILTER, TITLE_ICON_BOX } from '../funcionarios/shared/funcionariosUi';

const BTN_EXCEL = 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 h-10 min-h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all inline-flex items-center justify-center gap-2 shrink-0 active:scale-95 border border-emerald-100 leading-none box-border';
const BTN_ICON_EDIT = 'p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors';
const BTN_ICON_DELETE = 'p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors';
const FLOTA_INPUT = `${INPUT_FORM} !h-10 min-h-10 !text-[10px] box-border leading-none`;
const MotionDiv = motion.div;
const MotionButton = motion.button;

const VehiculosDashboard = () => {
    const [, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState(new Date().getFullYear());
    const [registros, setRegistros] = useState([]);
    const [flota, setFlota] = useState([]);
    const [viewMode, setViewMode] = useState('individual'); // 'individual' or 'general'
    const [selectedVehiculoFilter, setSelectedVehiculoFilter] = useState('all'); // 'all' or vehicle ID string/number
    const [selectedVehicles, setSelectedVehicles] = useState([]); // Array of IDs for filtering/export
    const [feedback, setFeedback] = useState(null);
    const [pendingDelete, setPendingDelete] = useState(null);
    const { can } = usePermission();
    const location = useLocation();

    // Modal State
    const [isModalOpen, setModalOpen] = useState(false);
    const [isFlotaModalOpen, setFlotaModalOpen] = useState(false);
    const [isExportModalOpen, setExportModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [isTipoMantenedorOpen, setIsTipoMantenedorOpen] = useState(false);
    const [selectedVehiculoForDetail, setSelectedVehiculoForDetail] = useState(null);
    const [formData, setFormData] = useState({
        anio: new Date().getFullYear(),
        mes: new Date().getMonth() + 1,
        vehiculo: '',
        kilometros_recorridos: '',
        km_inicial: '',
        km_final: '',
        gasto_bencina: '',
        gasto_peajes: '',
        gasto_seguros: ''
    });

    // Flota Form State
    const [flotaFormData, setFlotaFormData] = useState({ marca: '', modelo: '', patente: '' });
    const [submitting, setSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    // Aggregator Sub-Modal State
    const [isAggregatorOpen, setAggregatorOpen] = useState(false);
    const [aggregatorField, setAggregatorField] = useState(null); // 'gasto_bencina', etc.
    const [aggregatorValue, setAggregatorValue] = useState('');
    const [history, setHistory] = useState({
        gasto_bencina: [],
        gasto_peajes: [],
        gasto_seguros: []
    });

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        fetchData();
    // fetchData intentionally refreshes annual vehicle data for the selected year.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [year]);

    useEffect(() => {
        if (location.pathname === '/vehiculos/flota') {
            setFlotaModalOpen(true);
        }
    }, [location.pathname]);



    const fetchData = async () => {
        try {
            // Fetch Flota
            const flotaRes = await api.get('vehiculos/flota/');
            setFlota(flotaRes.data.results || flotaRes.data);

            const params = { anio: year };
            const statsRes = await api.get(`vehiculos/registros/estadisticas_anuales/`, { params });
            const listRes = await api.get(`vehiculos/registros/`, { params });

            setStats(statsRes.data);
            setRegistros(listRes.data.results || listRes.data);
        } catch (error) {
            console.error("Error fetching vehicle data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        const val = value === '' ? '' : parseInt(value, 10);

        setFormData(prev => {
            const nextData = {
                ...prev,
                [name]: val
            };

            // Cálculo automático: se dispara si cambia km_inicial o km_final
            if (name === 'km_inicial' || name === 'km_final') {
                const kIni = name === 'km_inicial' ? val : prev.km_inicial;
                const kFin = name === 'km_final' ? val : prev.km_final;

                // Solo calculamos si ambos campos tienen un valor numérico
                if (typeof kIni === 'number' && typeof kFin === 'number') {
                    nextData.kilometros_recorridos = kFin - kIni;
                } else {
                    nextData.kilometros_recorridos = '';
                }
            }

            return nextData;
        });
    };



    const handleAddAmount = (name) => {
        setAggregatorField(name);
        setAggregatorValue('');
        setAggregatorOpen(true);
    };

    const confirmAddition = () => {
        const value = parseInt(aggregatorValue);
        if (isNaN(value) || value <= 0) return;

        setFormData(prev => ({
            ...prev,
            [aggregatorField]: (parseInt(prev[aggregatorField]) || 0) + value
        }));

        setHistory(prev => ({
            ...prev,
            [aggregatorField]: [...prev[aggregatorField], value]
        }));

        setAggregatorOpen(false);
    };

    const removeAddition = (field, index) => {
        const valToRemove = history[field][index];
        setHistory(prev => ({
            ...prev,
            [field]: prev[field].filter((_, i) => i !== index)
        }));
        setFormData(prev => ({
            ...prev,
            [field]: Math.max(0, (parseInt(prev[field]) || 0) - valToRemove)
        }));
    };

    const handleOpenCreateModal = () => {
        setEditingRecord(null);
        setFormData({
            anio: year,
            mes: registros.length > 0 ? (registros[registros.length - 1].mes % 12) + 1 : new Date().getMonth() + 1,
            vehiculo: flota.length > 0 ? flota[0].id : '',
            kilometros_recorridos: '',
            km_inicial: '',
            km_final: '',
            gasto_bencina: '',
            gasto_peajes: '',
            gasto_seguros: ''
        });
        setHistory({
            gasto_bencina: [],
            gasto_peajes: [],
            gasto_seguros: []
        });
        setModalOpen(true);
    };

    const handleOpenEditModal = (registro) => {
        setEditingRecord(registro);
        setFormData({
            anio: registro.anio,
            mes: registro.mes,
            vehiculo: registro.vehiculo,
            kilometros_recorridos: registro.kilometros_recorridos,
            km_inicial: '',
            km_final: '',
            gasto_bencina: registro.gasto_bencina,
            gasto_peajes: registro.gasto_peajes,
            gasto_seguros: registro.gasto_seguros
        });
        setHistory({
            gasto_bencina: registro.gasto_bencina > 0 ? [registro.gasto_bencina] : [],
            gasto_peajes: registro.gasto_peajes > 0 ? [registro.gasto_peajes] : [],
            gasto_seguros: registro.gasto_seguros > 0 ? [registro.gasto_seguros] : []
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const restData = { ...formData };
        delete restData.km_inicial;
        delete restData.km_final;
        const payload = {
            ...restData,
            kilometros_recorridos: formData.kilometros_recorridos === '' ? 0 : formData.kilometros_recorridos,
            gasto_bencina: formData.gasto_bencina === '' ? 0 : formData.gasto_bencina,
            gasto_peajes: formData.gasto_peajes === '' ? 0 : formData.gasto_peajes,
            gasto_seguros: formData.gasto_seguros === '' ? 0 : formData.gasto_seguros,
            numero_vehiculos: formData.numero_vehiculos || 0
        };

        try {
            if (editingRecord) {
                await api.put(`vehiculos/registros/${editingRecord.id}/`, payload);
            } else {
                await api.post('vehiculos/registros/', payload);
            }
            setModalOpen(false);
            fetchData();
        } catch (error) {
            console.error("Error saving record:", error);
            setFeedback({ type: 'error', text: 'Error al guardar el registro. Verifique los datos o si ya existe un registro para este período.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id, mesNombre) => {
        setPendingDelete({ type: 'registro', id, label: `registro de ${mesNombre}` });
    };

    const confirmDelete = async () => {
        if (!pendingDelete) return;
        setIsDeleting(true);
        try {
            if (pendingDelete.type === 'registro') {
                await api.delete(`vehiculos/registros/${pendingDelete.id}/`);
            } else {
                await api.delete(`vehiculos/flota/${pendingDelete.id}/`);
            }
            setPendingDelete(null);
            fetchData();
        } catch (error) {
            console.error("Error deleting vehicle data:", error);
            setFeedback({ type: 'error', text: pendingDelete.type === 'registro' ? 'Error al intentar eliminar el registro.' : 'Error al eliminar el vehículo de la flota.' });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSaveFlota = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('vehiculos/flota/', flotaFormData);
            setFlotaFormData({ marca: '', modelo: '', patente: '' });
            fetchData();
        } catch (error) {
            console.error("Error saving flota:", error);
            setFeedback({ type: 'error', text: 'Error al guardar el vehículo en la flota.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteFlota = async (id) => {
        setPendingDelete({ type: 'flota', id, label: 'vehículo de la flota' });
    };

    const handleUpdateVehiculoInList = (updatedVehiculo) => {
        setFlota(prev => prev.map(v => v.id === updatedVehiculo.id ? updatedVehiculo : v));
        setSelectedVehiculoForDetail(updatedVehiculo);
    };

    const handleExportExcel = async (shouldSum = false) => {
        try {
            const params = { anio: year, sumar: shouldSum };
            // DRF QueryParams for list of IDs
            selectedVehicles.forEach(id => {
                params['vehiculos[]'] = params['vehiculos[]'] || [];
                params['vehiculos[]'].push(id);
            });

            // Note: Use URLSearchParams for correct array encoding in GET
            const searchParams = new URLSearchParams();
            searchParams.append('anio', year);
            searchParams.append('sumar', shouldSum);
            selectedVehicles.forEach(id => searchParams.append('vehiculos[]', id));

            const response = await api.get(`vehiculos/registros/exportar_excel/?${searchParams.toString()}`, {
                responseType: 'blob',
            });
            const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8-sig' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `reporte_flota.csv`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            setExportModalOpen(false);
        } catch (error) {
            console.error("Error exporting csv:", error);
            setFeedback({ type: 'error', text: 'Error al descargar el archivo CSV.' });
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: 'spring', stiffness: 100 }
        }
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700">
                    <p className="text-sm font-bold mb-1">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} className="text-xs" style={{ color: entry.color }}>
                            {entry.name}: {entry.name.includes('Gasto') ? formatCurrency(entry.value) : entry.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div></div>;

    const summedRegistros = Object.values(registros.reduce((acc, curr) => {
        const key = `${curr.anio}-${curr.mes}`;
        if (!acc[key]) {
            acc[key] = {
                ...curr,
                id: `sum-${key}`,
                kilometros_recorridos: 0,
                gasto_bencina: 0,
                gasto_peajes: 0,
                gasto_seguros: 0,
                vehiculo_detalle: { display_name: 'RESUMEN MENSUAL (SUMA)', patente: 'FLOTA' }
            };
        }
        acc[key].kilometros_recorridos += curr.kilometros_recorridos;
        acc[key].gasto_bencina += curr.gasto_bencina;
        acc[key].gasto_peajes += curr.gasto_peajes;
        acc[key].gasto_seguros += curr.gasto_seguros;
        return acc;
    }, {})).sort((a, b) => a.mes - b.mes);

    const filteredIndividualRegistros = selectedVehiculoFilter === 'all'
        ? registros
        : registros.filter(r => r.vehiculo === parseInt(selectedVehiculoFilter, 10));

    const displayRegistros = viewMode === 'general' ? summedRegistros : filteredIndividualRegistros;

    const dynamicStats = displayRegistros.reduce((acc, curr) => {
        acc.bencina += curr.gasto_bencina || 0;
        acc.kms += curr.kilometros_recorridos || 0;
        acc.seguros += curr.gasto_seguros || 0;
        acc.peajes += curr.gasto_peajes || 0;
        return acc;
    }, { bencina: 0, kms: 0, seguros: 0, peajes: 0 });

    const chartData = displayRegistros.map(r => ({
        mes: viewMode === 'general' ? r.mes_nombre : `${r.mes_nombre} (${r.vehiculo_detalle?.patente})`,
        gasto_bencina: r.gasto_bencina,
        gasto_peajes: r.gasto_peajes,
        gasto_seguros: r.gasto_seguros,
        kilometros: r.kilometros_recorridos
    }));

    const commonOverlays = (
        <>
            <AnimatePresence>
                {feedback && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[10001] bg-rose-50 text-rose-600 text-[10px] font-bold uppercase p-3 rounded-xl border border-rose-100 flex gap-2 items-center shadow-xl"
                    >
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {feedback.text}
                        <button type="button" onClick={() => setFeedback(null)} className="p-1 hover:bg-rose-100 rounded-lg">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {pendingDelete && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => setPendingDelete(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 12 }}
                            className="relative z-10 bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full border border-slate-200"
                        >
                            <div className="bg-slate-50 border-b border-slate-100 p-4">
                                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Confirmación</p>
                                <h3 className="text-sm font-bold text-slate-800 tracking-tight uppercase">Eliminar {pendingDelete.type === 'registro' ? 'Registro' : 'Vehículo'}</h3>
                            </div>
                            <div className="p-5">
                                <p className="text-xs font-medium text-slate-700 uppercase leading-relaxed">
                                    ¿Está seguro que desea eliminar el {pendingDelete.label}? Esta acción no se puede deshacer.
                                </p>
                            </div>
                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setPendingDelete(null)} className={BTN_SECONDARY}>
                                    Cancelar
                                </button>
                                <button type="button" onClick={confirmDelete} disabled={isDeleting} className="bg-rose-600 hover:bg-rose-700 text-white h-10 min-h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-900/20 inline-flex items-center justify-center gap-2 shrink-0 active:scale-95 leading-none box-border disabled:opacity-50">
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

    if (location.pathname === '/vehiculos/flota') {
        return (
            <motion.div
                className={PAGE_LAYOUT}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Header Flota */}
                <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className={TITLE_ICON_BOX}>
                                <Truck className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase">
                                GESTIÓN DE FLOTA VEHICULAR
                            </h2>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                            <p className="text-[10px] md:text-xs font-medium text-slate-500 uppercase">Control Técnico y Documental de Activos</p>
                            <button 
                                onClick={() => setIsTipoMantenedorOpen(true)}
                                className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all"
                            >
                                <Settings className="w-3 h-3" /> Configurar Tipos
                            </button>
                        </div>
                    </div>
                    <form onSubmit={handleSaveFlota} className="grid grid-cols-1 sm:grid-cols-[repeat(3,minmax(8.5rem,1fr))_auto] items-stretch gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 w-full lg:w-auto shadow-sm">
                        <input placeholder="MARCA" className={FLOTA_INPUT} value={flotaFormData.marca} onChange={e => setFlotaFormData({ ...flotaFormData, marca: e.target.value })} required />
                        <input placeholder="MODELO" className={FLOTA_INPUT} value={flotaFormData.modelo} onChange={e => setFlotaFormData({ ...flotaFormData, modelo: e.target.value })} required />
                        <input placeholder="PATENTE" className={FLOTA_INPUT} value={flotaFormData.patente} onChange={e => setFlotaFormData({ ...flotaFormData, patente: e.target.value.toUpperCase() })} required />
                        <button type="submit" disabled={submitting} className={BTN_PRIMARY}>
                            <Plus className="w-4 h-4" /> Agregar
                        </button>
                    </form>
                </div>

                {/* Grid de Vehículos */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {flota.map(v => {
                            const hasDocuments = v.documentos?.length > 0;
                            return (
                                <motion.div 
                                    key={v.id} 
                                    variants={itemVariants}
                                    whileHover={{ y: -4, shadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }}
                                    className="bg-white rounded-2xl shadow-sm border border-slate-200 group transition-all relative overflow-hidden flex flex-col cursor-pointer h-full"
                                    onClick={() => setSelectedVehiculoForDetail(v)}
                                >
                                    {/* Hero Image Section */}
                                    <div className="relative h-44 overflow-hidden">
                                        {v.imagen ? (
                                            <img src={v.imagen} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={v.patente} />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                                                <Car className="w-12 h-12 text-slate-200" />
                                            </div>
                                        )}
                                        
                                        {/* Glassmorphism Plate Label */}
                                        <div className="absolute top-4 left-4">
                                            <div className="bg-white/70 backdrop-blur-md border border-white/40 px-3 py-1.5 rounded-xl shadow-lg">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">{v.patente}</span>
                                            </div>
                                        </div>

                                        {/* Delete Button Overlay */}
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeleteFlota(v.id); }}
                                                className="w-9 h-9 bg-rose-500/20 hover:bg-rose-500 backdrop-blur-md text-white rounded-xl flex items-center justify-center transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Body Content */}
                                    <div className="p-5 flex-1 flex flex-col">
                                        <div className="mb-4">
                                            <h3 className="text-sm font-bold text-slate-800 tracking-tight leading-tight group-hover:text-blue-600 transition-colors uppercase line-clamp-1">
                                                {v.marca} {v.modelo}
                                            </h3>
                                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                                                <Fuel className="w-3 h-3 text-blue-400" /> {v.tipo_combustible || 'Sin definir'}
                                            </p>
                                        </div>

                                        <div className="mt-auto space-y-3">
                                            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                                                <span className="text-slate-400">Documentación</span>
                                                <span className={hasDocuments ? 'text-emerald-500' : 'text-slate-300'}>
                                                    {v.documentos?.length || 0} Archivos
                                                </span>
                                            </div>
                                            <div className="h-2 bg-slate-50 rounded-full overflow-hidden shadow-inner">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(100, (v.documentos?.length || 0) * 20)}%` }}
                                                    className={`h-full rounded-full ${hasDocuments ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-slate-200'}`}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-2">
                                                <div className="flex items-center gap-1 text-blue-600 font-black text-[9px] uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                                    Ver Ficha <ChevronRight className="w-3.5 h-3.5" />
                                                </div>
                                                {v.anio && (
                                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Año {v.anio}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                <AnimatePresence>
                    {selectedVehiculoForDetail && (
                        <VehiculoDetalle 
                            vehiculo={selectedVehiculoForDetail} 
                            onClose={() => setSelectedVehiculoForDetail(null)}
                            onUpdate={handleUpdateVehiculoInList}
                        />
                    )}
                </AnimatePresence>

                <TipoDocumentoMantenedor 
                    isOpen={isTipoMantenedorOpen}
                    onClose={() => setIsTipoMantenedorOpen(false)}
                />
                {commonOverlays}
            </motion.div>
        );
    }

    return (
        <motion.div
            className={PAGE_LAYOUT}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <div className="shrink-0 flex flex-col gap-3.5 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                <div className="space-y-0.5">
                    <div className="flex items-center gap-3">
                        <div className={TITLE_ICON_BOX}>
                            <Truck className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase">GESTIÓN DE FLOTA</h2>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                        <p className="text-[10px] md:text-xs font-medium text-slate-500 uppercase">Control Vehicular {year}</p>
                        <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold border border-blue-100 uppercase tracking-widest">
                            Vista: {viewMode === 'individual' ? 'Por Vehículo' : 'General (Sumado)'}
                        </span>
                    </div>
                </div>
                
                {/* Filtros agrupados en línea bajo el título */}
                <div className="flex flex-wrap items-center gap-2.5 w-full">
                    <select
                        value={viewMode === 'general' ? 'general' : selectedVehiculoFilter}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'general') {
                                setViewMode('general');
                                setSelectedVehiculoFilter('all');
                            } else {
                                setViewMode('individual');
                                setSelectedVehiculoFilter(val);
                            }
                        }}
                        className={`${SELECT_FILTER} w-full sm:w-64 shrink-0`}
                    >
                        <option value="general">GENERAL (FLOTA COMPLETA)</option>
                        <option value="all">TODOS LOS VEHÍCULOS (DETALLADO)</option>
                        <optgroup label="FILTRAR POR VEHÍCULO">
                            {flota.map(v => (
                                <option key={v.id} value={v.id}>
                                    {v.patente} - {v.marca} {v.modelo}
                                </option>
                            ))}
                        </optgroup>
                    </select>

                    <select
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className={`${SELECT_FILTER} w-full sm:w-28 shrink-0`}
                    >
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>

                    <button
                        onClick={() => setExportModalOpen(true)}
                        className={BTN_EXCEL}
                    >
                        <Download className="w-3.5 h-3.5 text-emerald-600" />
                        Exportar
                    </button>

                    {can('vehiculos.add_registromensual') && (
                        <button
                            onClick={handleOpenCreateModal}
                            className={`${BTN_PRIMARY} ml-auto`}
                        >
                            <Plus className="w-4 h-4" /> NUEVO REGISTRO
                        </button>
                    )}
                </div>
            </div>

            {/* KPI Cards - Estándar Rule 16 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <motion.div variants={itemVariants} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 transition-all hover:shadow-md group">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Fuel className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest line-clamp-1">COMBUSTIBLE</h3>
                        <p className="text-lg font-black text-slate-800 leading-none mt-1">{formatCurrency(dynamicStats.bencina)}</p>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 transition-all hover:shadow-md group">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Activity className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest line-clamp-1">KILOMETRAJE</h3>
                        <p className="text-lg font-black text-slate-800 leading-none mt-1">{dynamicStats.kms.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">km</span></p>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 transition-all hover:shadow-md group">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Sigma className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest line-clamp-1">SEGUROS</h3>
                        <p className="text-lg font-black text-slate-800 leading-none mt-1">{formatCurrency(dynamicStats.seguros)}</p>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 transition-all hover:shadow-md group">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest line-clamp-1">PEAJES</h3>
                        <p className="text-lg font-black text-slate-800 leading-none mt-1">{formatCurrency(dynamicStats.peajes)}</p>
                    </div>
                </motion.div>
            </div>

            {/* Main Content Area - Balanced 50/50 Split on Large Screens */}
            <div className="grid grid-cols-12 gap-4 flex-1 lg:min-h-0 lg:overflow-hidden mb-1">
                {/* Left: Charts */}
                <div className="col-span-12 lg:col-span-6 flex flex-col gap-4 lg:min-h-0">
                    <motion.div variants={itemVariants} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex-1 min-h-[300px] lg:min-h-0 overflow-hidden flex flex-col">
                        <h3 className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-2 leading-none">
                            <Activity className="w-4 h-4 text-blue-500" />
                            Gasto Mensual
                        </h3>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="mes"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 10 }}
                                        tickFormatter={(val) => windowWidth < 1280 ? val.substring(0, 3) : val}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(value) => `$${value / 1000}k`} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                                    <Bar dataKey="gasto_bencina" name="Bencina" fill="#fbbf24" radius={[4, 4, 0, 0]} stackId="a" />
                                    <Bar dataKey="gasto_peajes" name="Peajes" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
                                    <Bar dataKey="gasto_seguros" name="Seguros" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex-1 min-h-[300px] lg:min-h-0 overflow-hidden flex flex-col">
                        <h3 className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-2 leading-none">
                            <TrendingUp className="w-4 h-4 text-blue-500" />
                            Kilometraje
                        </h3>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorKms" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="mes"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 10 }}
                                        tickFormatter={(val) => windowWidth < 1280 ? val.substring(0, 3) : val}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="kilometros" name="Kms" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorKms)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>
                </div>

                {/* Right: Table */}
                <div className="col-span-12 lg:col-span-6 flex flex-col min-h-[500px] lg:min-h-0 pb-1">
                    <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 min-h-[500px] lg:min-h-0 flex flex-col">
                        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center whitespace-nowrap">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">REGISTROS {year}</h3>
                            <span className="text-[9px] font-black text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200 uppercase tracking-widest">{displayRegistros.length} FILAS</span>
                        </div>
                        <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar scroll-smooth bg-white">
                            <div className="min-w-[700px] lg:min-w-0">
                                <table className="w-full text-left border-collapse table-fixed">
                                    <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-sm">
                                        <tr>
                                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 w-[20%]">Mes / Vehículo</th>
                                            <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 text-right w-[20%]">KMS</th>
                                            <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 text-right w-[50%]">Gasto Detallado</th>
                                            <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-[10%]">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {displayRegistros.map((registro) => {
                                            return (
                                                <tr key={registro.id} className="hover:bg-slate-50/80 transition-all duration-200 group">
                                                    <td className="px-4 py-3 border-r border-slate-50 border-b border-slate-100">
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] font-medium text-slate-700 uppercase tracking-tight">{registro.mes_nombre}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{registro.vehiculo_detalle?.display_name || registro.vehiculo_detalle?.patente}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 border-r border-slate-50 border-b border-slate-100 text-right text-[11px] font-medium text-slate-600 uppercase tabular-nums tracking-tighter">
                                                        {registro.kilometros_recorridos.toLocaleString()} KM
                                                    </td>
                                                    <td className="px-3 py-3 border-r border-slate-50 border-b border-slate-100 text-right tabular-nums">
                                                        <div className="flex flex-col items-end gap-1">
                                                            <div className="flex flex-wrap justify-end gap-x-4 text-[12px] font-medium tracking-tight leading-none">
                                                                <span className="text-amber-600 font-mono" title="Bencina">{formatCurrency(registro.gasto_bencina)}</span>
                                                                <span className="text-blue-600 font-mono" title="Peajes">{formatCurrency(registro.gasto_peajes)}</span>
                                                                <span className="text-emerald-600 font-mono" title="Seguros">{formatCurrency(registro.gasto_seguros)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[14px] font-bold text-slate-900 border-t border-slate-100 pt-1 mt-0.5 leading-none">
                                                                <span className="text-[9px] text-slate-400 uppercase tracking-widest">Total:</span>
                                                                {formatCurrency(registro.gasto_bencina + registro.gasto_peajes + registro.gasto_seguros)}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 border-b border-slate-100 text-center align-middle">
                                                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {viewMode === 'individual' && can('vehiculos.change_registromensual') && (
                                                                <button onClick={() => handleOpenEditModal(registro)} className={BTN_ICON_EDIT}><Pencil className="w-3.5 h-3.5" /></button>
                                                            )}
                                                            {viewMode === 'individual' && can('vehiculos.delete_registromensual') && (
                                                                <button onClick={() => handleDelete(registro.id, registro.mes_nombre)} disabled={isDeleting} className={BTN_ICON_DELETE}><Trash2 className="w-3.5 h-3.5" /></button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Modal - Unchanged */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto" onClick={() => setModalOpen(false)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-white/20"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-slate-50 border-b border-slate-100 p-5 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                        {editingRecord ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">
                                            {editingRecord ? 'Editar Registro' : 'Nuevo Registro'}
                                        </h2>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">VehículosSLEP • {year}</p>
                                    </div>
                                </div>
                                <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors"><X className="w-4 h-4" /></button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Año Fiscal</label>
                                        <input
                                            name="anio"
                                            type="number"
                                            value={formData.anio}
                                            onChange={handleInputChange}
                                            className="w-full !h-10 text-[10px] font-bold !bg-white !border !border-slate-200 px-3 !rounded-xl outline-none focus:border-blue-500 uppercase transition-all shadow-sm placeholder:text-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            required
                                            disabled={!!editingRecord}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Mes de Operación</label>
                                        <select
                                            name="mes"
                                            value={formData.mes}
                                            onChange={handleInputChange}
                                            className="w-full !h-10 text-[10px] font-bold bg-white border border-slate-200 px-3 rounded-xl outline-none focus:border-blue-500 uppercase transition-all shadow-sm cursor-pointer"
                                            disabled={!!editingRecord}
                                        >
                                            {Array.from({ length: 12 }, (_, i) => (
                                                <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('es-ES', { month: 'long' })}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1.5"><Car className="w-3.5 h-3.5 text-slate-400" /> Vehículo</label>
                                        <select
                                            name="vehiculo"
                                            value={formData.vehiculo}
                                            onChange={handleInputChange}
                                            className="w-full !h-10 text-[10px] font-bold bg-white border border-slate-200 text-slate-700 px-3 rounded-xl outline-none focus:border-blue-500 uppercase transition-all shadow-sm cursor-pointer"
                                            required
                                            disabled={!!editingRecord}
                                        >
                                            <option value="">Seleccionar Vehículo...</option>
                                            {flota.map(v => (
                                                <option key={v.id} value={v.id}>{v.marca} {v.modelo} ({v.patente})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-5 animate-in fade-in duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Km Inicial del mes</label>
                                            <input
                                                name="km_inicial"
                                                type="number"
                                                value={formData.km_inicial}
                                                onChange={handleInputChange}
                                                className="w-full !h-10 text-[10px] font-bold !bg-white !border !border-slate-200 px-3 !rounded-xl outline-none focus:border-blue-500 uppercase transition-all shadow-sm placeholder:text-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                placeholder="Ej: 10500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Km Final del mes</label>
                                            <input
                                                name="km_final"
                                                type="number"
                                                value={formData.km_final}
                                                onChange={handleInputChange}
                                                className="w-full !h-10 text-[10px] font-bold !bg-white !border !border-slate-200 px-3 !rounded-xl outline-none focus:border-blue-500 uppercase transition-all shadow-sm placeholder:text-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                placeholder="Ej: 11000"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Odómetro Mensual</label>
                                            <div className="relative">
                                                <input
                                                    name="kilometros_recorridos"
                                                    value={formData.kilometros_recorridos}
                                                    onChange={handleInputChange}
                                                    className="w-full !h-10 text-[10px] font-bold bg-slate-50 border border-slate-200 px-3 rounded-xl outline-none transition-all shadow-sm placeholder:text-slate-300 pr-10 cursor-not-allowed"
                                                    placeholder="0"
                                                    readOnly
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">KM</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {['gasto_bencina', 'gasto_peajes', 'gasto_seguros'].map((field) => {
                                            const colors = {
                                                gasto_bencina: { text: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200', bgLight: 'bg-slate-50/50', icon: 'text-slate-400', btn: 'bg-slate-600', label: 'Combustible' },
                                                gasto_peajes: { text: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200', bgLight: 'bg-slate-50/50', icon: 'text-slate-400', btn: 'bg-slate-600', label: 'Peajes / TAG' },
                                                gasto_seguros: { text: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200', bgLight: 'bg-slate-50/50', icon: 'text-slate-400', btn: 'bg-slate-600', label: 'Seguros / Otros' }
                                            };
                                            const c = colors[field];
                                            return (
                                                <div key={field} className="space-y-1.5">
                                                    <div className="flex justify-between items-center px-1">
                                                        <label className={`text-[10px] font-black ${c.text} uppercase tracking-widest leading-none`}>{c.label}</label>
                                                        <button type="button" onClick={() => handleAddAmount(field)} className={`text-[8px] font-bold ${c.bg} ${c.text} px-2 py-0.5 rounded hover:${c.btn} hover:text-white transition-all flex items-center gap-1`}>
                                                            <Plus className="w-2.5 h-2.5" /> SUMAR
                                                        </button>
                                                    </div>

                                                    {/* Historial de adiciones */}
                                                    <div className="flex flex-wrap gap-1 min-h-[1.2rem] px-1 overflow-hidden">
                                                        {history[field].map((val, idx) => (
                                                            <motion.button
                                                                type="button"
                                                                initial={{ scale: 0.5, opacity: 0 }}
                                                                animate={{ scale: 1, opacity: 1 }}
                                                                whileHover={{ scale: 1.05, opacity: 0.8 }}
                                                                key={`${field}-${idx}`}
                                                                onClick={() => removeAddition(field, idx)}
                                                                className={`text-[8px] font-bold ${c.bg} ${c.text} px-1.5 py-0.5 rounded border ${c.border} cursor-pointer hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all flex items-center gap-1 group/chip`}
                                                                title="Haga clic para eliminar este monto"
                                                            >
                                                                +{val.toLocaleString()}
                                                                <X className="w-2 h-2 opacity-0 group-hover/chip:opacity-100" />
                                                            </motion.button>
                                                        ))}
                                                    </div>

                                                    <div className="relative">
                                                        <input
                                                            name={field}
                                                            type="number"
                                                            value={formData[field]}
                                                            onChange={handleInputChange}
                                                            placeholder="0"
                                                            className="w-full !h-10 text-[10px] font-bold !bg-white !border !border-slate-200 pl-10 pr-3 !rounded-xl outline-none focus:border-blue-500 transition-all shadow-sm placeholder:text-slate-355 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        />
                                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none">$</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                    <button type="button" onClick={() => setModalOpen(false)} className={BTN_SECONDARY}>Cancelar</button>
                                    <button type="submit" disabled={submitting} className={BTN_PRIMARY}>
                                        {submitting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white animate-spin rounded-full"></div> : (editingRecord ? 'Actualizar Registro' : 'Confirmar Registro')}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Aggregator Sub-Modal */}
            <AnimatePresence>
                {isAggregatorOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md" onClick={() => setAggregatorOpen(false)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/20"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center">
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <Calculator className="w-4 h-4 text-slate-400" />
                                    Sumar Monto
                                </h3>
                                <button onClick={() => setAggregatorOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="p-6 space-y-5 text-center">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Agregando a {aggregatorField?.replace('gasto_', '').toUpperCase()}</p>
                                    <div className="text-xs font-bold text-slate-400 flex justify-center gap-2">
                                        Subtotal: <span className="text-slate-900">{formatCurrency(formData[aggregatorField] || 0)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-center gap-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
                                    <span className="text-3xl font-black text-slate-300">$</span>
                                    <input
                                        autoFocus
                                        value={aggregatorValue}
                                        onChange={(e) => setAggregatorValue(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && confirmAddition()}
                                        placeholder="0"
                                        className="w-full text-left text-3xl font-black text-slate-900 outline-none placeholder-slate-200 bg-transparent uppercase"
                                    />
                                </div>
                                <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
                                    <button onClick={() => setAggregatorOpen(false)} className={BTN_SECONDARY}>Cancelar</button>
                                    <button onClick={confirmAddition} className={BTN_PRIMARY}>Sumar</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Flota Modal */}
            <AnimatePresence>
                {isFlotaModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setFlotaModalOpen(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <div className="bg-slate-50 border-b border-slate-100 p-5 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                        <Car className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">Mantenedor de Flota</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Gestionar Activos</p>
                                    </div>
                                </div>
                                <button onClick={() => setFlotaModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="p-6">
                                <form onSubmit={handleSaveFlota} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                                    <input placeholder="MARCA" className={FLOTA_INPUT} value={flotaFormData.marca} onChange={e => setFlotaFormData({ ...flotaFormData, marca: e.target.value })} required />
                                    <input placeholder="MODELO" className={FLOTA_INPUT} value={flotaFormData.modelo} onChange={e => setFlotaFormData({ ...flotaFormData, modelo: e.target.value })} required />
                                    <input placeholder="PATENTE" className={FLOTA_INPUT} value={flotaFormData.patente} onChange={e => setFlotaFormData({ ...flotaFormData, patente: e.target.value.toUpperCase() })} required />
                                    <button type="submit" disabled={submitting} className={`${BTN_PRIMARY} col-span-3`}>Agregar Vehículo</button>
                                </form>
                                <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                                    {flota.map(v => (
                                        <div key={v.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-blue-500 hover:bg-white transition-all group cursor-pointer" onClick={() => setSelectedVehiculoForDetail(v)}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                    <Car className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{v.marca} {v.modelo}</p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{v.patente}</p>
                                                        {v.documentos?.length > 0 && (
                                                            <span className="text-[8px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-md font-black border border-emerald-100 uppercase">DOCS</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all bg-blue-50 px-3 py-1.5 rounded-xl">
                                                    Controlar <ChevronRight className="w-3 h-3" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteFlota(v.id); }} className="text-slate-300 hover:text-red-500 transition-colors p-2"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <AnimatePresence>
                                {selectedVehiculoForDetail && (
                                    <VehiculoDetalle 
                                        vehiculo={selectedVehiculoForDetail} 
                                        onClose={() => setSelectedVehiculoForDetail(null)}
                                        onUpdate={handleUpdateVehiculoInList}
                                    />
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Custom Export Modal */}
            <AnimatePresence>
                {isExportModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setExportModalOpen(false)}>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 border-b border-slate-100">
                                <h3 className="text-xl font-black text-slate-800">Exportar Reporte</h3>
                                <p className="text-xs text-slate-400">Seleccione los vehículos y el formato de salida.</p>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Selección de Flota</label>
                                    <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                                        <div
                                            key="all"
                                            className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${selectedVehicles.length === 0 ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100'}`}
                                            onClick={() => setSelectedVehicles([])}
                                        >
                                            <div className={`w-4 h-4 rounded-full border-2 ${selectedVehicles.length === 0 ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`} />
                                            <span className="text-sm font-bold">Todos los Vehículos</span>
                                        </div>
                                        {flota.map(v => (
                                            <div
                                                key={v.id}
                                                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${selectedVehicles.includes(v.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100'}`}
                                                onClick={() => {
                                                    if (selectedVehicles.includes(v.id)) {
                                                        setSelectedVehicles(selectedVehicles.filter(i => i !== v.id));
                                                    } else {
                                                        setSelectedVehicles([...selectedVehicles, v.id]);
                                                    }
                                                }}
                                            >
                                                <div className={`w-4 h-4 rounded-full border-2 ${selectedVehicles.includes(v.id) ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`} />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold">{v.marca} {v.modelo}</span>
                                                    <span className="text-[9px] text-slate-400">{v.patente}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleExportExcel(false)}
                                        className="flex flex-col items-center justify-center p-4 bg-slate-50 border-2 border-slate-100 rounded-3xl hover:border-blue-500 transition-all group gap-2"
                                    >
                                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform"><Activity className="text-slate-400 group-hover:text-blue-600" /></div>
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">Detallado</span>
                                    </button>
                                    <button
                                        onClick={() => handleExportExcel(true)}
                                        className="flex flex-col items-center justify-center p-4 bg-slate-50 border-2 border-slate-100 rounded-3xl hover:border-emerald-500 transition-all group gap-2"
                                    >
                                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform"><Plus className="text-slate-400 group-hover:text-emerald-600" /></div>
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">Sumado</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {commonOverlays}
        </motion.div >
    );
};

export default VehiculosDashboard;
