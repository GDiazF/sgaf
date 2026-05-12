import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Truck, ArrowLeft, Plus, MapPin, Building2, 
    Calendar, DollarSign, Loader2, AlertCircle, 
    CheckCircle2, ArrowRight, FileText, X, Save, Check,
    Clock, User, Info, MoreVertical, Edit2, Trash2, 
    Settings, ChevronDown, ChevronUp, ExternalLink, Pencil, ChevronRight, History, RefreshCw, ShieldCheck, Shield, Search, Filter,
    Calculator, FileSpreadsheet, Target, ArrowUp, ArrowDown, LayoutGrid, Coffee, Flag
} from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import * as XLSX from 'xlsx';
import { format, eachDayOfInterval, parseISO, isWeekend } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../../api';

// --- Sub-component: DiaCelda (Moved from PeriodoDetallePage) ---
const DiaCelda = ({ fecha, isTrabajado, isFeriado, isFinDeSemana, onClick, disabled }) => {
    let bgColor = "bg-white border-slate-200";
    let textColor = "text-slate-700";

    // PRIORIDAD 1: Días bloqueados por regla (Gris o Amarillo)
    if (isFeriado) {
        bgColor = "bg-amber-50 border-amber-200 opacity-80";
        textColor = "text-amber-700 line-through font-bold";
    } else if (isFinDeSemana) {
        bgColor = "bg-slate-50 border-slate-200";
        textColor = "text-slate-500";
    } 
    // PRIORIDAD 2: Estado de asistencia en días válidos
    else if (!isTrabajado) {
        bgColor = "bg-red-50 border-red-200";
        textColor = "text-red-700 font-medium";
    } else {
        bgColor = "bg-emerald-50 border-emerald-200";
        textColor = "text-emerald-700 font-medium";
    }

    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => onClick(fecha)}
            className={`
                flex flex-col items-center justify-center p-2.5 border rounded-xl 
                transition-all duration-200 shadow-sm
                ${bgColor} ${textColor}
                ${disabled ? 'cursor-not-allowed opacity-75' : 'hover:-translate-y-0.5 cursor-pointer active:scale-95'}
            `}
        >
            <span className="text-[8px] font-black uppercase tracking-widest mb-1 opacity-50">
                {format(fecha, 'EEE', { locale: es })}
            </span>
            <span className="text-sm font-black">
                {format(fecha, 'd')}
            </span>
        </button>
    );
};

// --- Sub-component: PeriodoCalendarioModal ---
const PeriodoCalendarioModal = ({ periodoId, onClose }) => {
    const { can } = usePermission();
    const [loading, setLoading] = useState(true);
    const [loadingTotal, setLoadingTotal] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [feriados, setFeriados] = useState([]);
    const [calendario, setCalendario] = useState(null);
    const [totalData, setTotalData] = useState(null);
    const [diasGrid, setDiasGrid] = useState([]);

    const fetchCalendario = useCallback(async () => {
        try {
            const res = await api.get(`contratos/periodos/${periodoId}/calendario/`);
            setCalendario(res.data);
            return res.data;
        } catch (error) {
            console.error("Error fetching calendario:", error);
            return null;
        }
    }, [periodoId]);

    const fetchTotal = useCallback(async () => {
        setLoadingTotal(true);
        try {
            const res = await api.get(`contratos/periodos/${periodoId}/total/`);
            setTotalData(res.data);
        } catch (error) {
            console.error("Error fetching total:", error);
        } finally {
            setLoadingTotal(false);
        }
    }, [periodoId]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                const feriadosRes = await api.get('contratos/feriados/');
                // Como quitamos la paginación en el backend, la data viene directo en el array o en results si fuera el caso
                const listaFeriados = Array.isArray(feriadosRes.data) ? feriadosRes.data : (feriadosRes.data.results || []);
                setFeriados(listaFeriados.map(f => f.fecha));
                const cal = await fetchCalendario();
                if (cal) {
                    const start = parseISO(cal.fecha_inicio);
                    const end = parseISO(cal.fecha_fin);
                    setDiasGrid(eachDayOfInterval({ start, end }));
                }
                await fetchTotal();
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [fetchCalendario, fetchTotal]);

    const handleToggleDia = async (fechaDate) => {
        if (!can('contratos.change_ausenciaruta')) return;
        if (calendario?.estado === 'CERRADO') return;
        const fechaStr = format(fechaDate, 'yyyy-MM-dd');
        const isCurrentlyAusente = calendario.ausencias.includes(fechaStr);
        
        // Optimistic update
        setCalendario(prev => ({
            ...prev,
            ausencias: isCurrentlyAusente ? prev.ausencias.filter(d => d !== fechaStr) : [...prev.ausencias, fechaStr]
        }));

        try {
            await api.post(`contratos/periodos/${periodoId}/toggle-dia/`, { fecha: fechaStr });
            await fetchTotal();
        } catch (error) {
            alert("Error al actualizar asistencia.");
            fetchCalendario(); // Revert
        }
    };

    const handleCerrarPeriodo = async () => {
        if (!can('contratos.change_ausenciaruta')) return;
        if (!window.confirm("¿Confirmas el cierre definitivo de este periodo? No se podrán realizar más cambios.")) return;
        setIsClosing(true);
        try {
            await api.post(`contratos/periodos/${periodoId}/cerrar/`);
            await fetchCalendario();
            await fetchTotal();
        } catch (error) {
            alert("Error al cerrar periodo.");
        } finally {
            setIsClosing(false);
        }
    };

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
    );

    return (
        <div className="flex flex-col h-full max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 backdrop-blur-md sticky top-0 z-10">
                <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-500" />
                        Control de Asistencia - {calendario?.nombre_estandarizado || 'Periodo'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        Rango: {calendario ? `${format(parseISO(calendario.fecha_inicio), 'dd/MM/yyyy')} - ${format(parseISO(calendario.fecha_fin), 'dd/MM/yyyy')}` : 'Cargando...'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => { fetchCalendario(); fetchTotal(); }} className="p-2 hover:bg-white rounded-xl text-slate-400 border border-transparent hover:border-slate-200 transition-all"><RefreshCw className="w-4 h-4" /></button>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl text-slate-400 border border-transparent hover:border-slate-200 transition-all"><X className="w-5 h-5" /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Calendar Grid */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calendario Mensual</h4>
                            <div className="flex items-center gap-4 text-[9px] font-bold text-slate-400">
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-100 border border-emerald-300" /> Realizado</div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-100 border border-red-300" /> Ausencia</div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-100 border border-amber-300" /> Feriado</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5">
                            {calendario && diasGrid.map(dia => {
                                const fStr = format(dia, 'yyyy-MM-dd');
                                const isFinSem = isWeekend(dia);
                                const isFeriado = feriados.includes(fStr);
                                const isAus = (calendario.ausencias || []).includes(fStr);
                                
                                // Disable if closed OR if it's a weekend and not included OR if it's a holiday and excluded
                                const isDisabled = calendario.estado === 'CERRADO' || 
                                                 (!calendario.regla.incluir_fines_semana && isFinSem) ||
                                                 (calendario.regla.excluir_feriados && isFeriado);

                                return (
                                    <DiaCelda 
                                        key={fStr}
                                        fecha={dia}
                                        isTrabajado={!isAus}
                                        isFeriado={isFeriado && calendario.regla.excluir_feriados}
                                        isFinDeSemana={isFinSem && !calendario.regla.incluir_fines_semana}
                                        disabled={isDisabled}
                                        onClick={handleToggleDia}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {/* Summary Sidebar */}
                    <div className="space-y-4">
                        <div className="bg-slate-50/50 border border-slate-100 p-6 rounded-[28px] shadow-sm">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Resumen de Pago</h4>
                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between items-center text-xs font-bold">
                                    <span className="text-slate-400">Días Hábiles:</span>
                                    <span className="text-slate-800">{totalData?.dias_base}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-bold text-red-500">
                                    <span className="text-slate-400">Inasistencias:</span>
                                    <span>-{totalData?.ausencias}</span>
                                </div>
                                <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-sm font-black">
                                    <span className="text-slate-600">Días a Pagar:</span>
                                    <span className="text-indigo-600">{totalData?.dias_cobrar}</span>
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center shadow-sm">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Monto Estimado</p>
                                <p className="text-xl font-black text-slate-800">
                                    {loadingTotal ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : `$${new Intl.NumberFormat('es-CL').format(totalData?.total || 0)}`}
                                </p>
                            </div>
                        </div>

                        {calendario?.estado !== 'CERRADO' && (
                            <button 
                                onClick={handleCerrarPeriodo}
                                disabled={isClosing || !calendario}
                                className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-[24px] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200 flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                {isClosing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                                Guardar y Congelar Periodo
                            </button>
                        )}
                        {calendario?.estado === 'CERRADO' && (
                            <div className="w-full py-4 bg-slate-100 text-slate-400 rounded-[24px] font-black text-[10px] uppercase tracking-widest text-center border border-slate-200">
                                Periodo Finalizado
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---
const ServicioDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { can } = usePermission();
    const [servicio, setServicio] = useState(null);
    const [contrato, setContrato] = useState(null);
    const [rutas, setRutas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProvider, setSelectedProvider] = useState('all');
    const [selectedRutasTable, setSelectedRutasTable] = useState([]);

    // UX State: Panels & Modals
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [panelView, setPanelView] = useState('management'); // 'info', 'management', or 'contract'
    const [activePeriodId, setActivePeriodId] = useState(null);

    // Modal de Nueva Ruta
    const [isRutaModalOpen, setIsRutaModalOpen] = useState(false);
    const [rutaFormData, setRutaFormData] = useState({
        nombre: '', proveedor: '', establecimientos: [], valor_diario: '', itinerario: '', dia_inicio_periodo: 21, dia_fin_periodo: 20,
        incluir_fines_semana: false, excluir_feriados: true
    });
    const [creatingRuta, setCreatingRuta] = useState(false);
    const [searchTermEst, setSearchTermEst] = useState('');

    // Modal de Edición de Ruta
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editRutaData, setEditRutaData] = useState(null);
    const [updatingRuta, setUpdatingRuta] = useState(false);
    const [searchTermEditEst, setSearchTermEditEst] = useState('');

    // Modal de Nuevo Periodo
    const [isPeriodoModalOpen, setIsPeriodoModalOpen] = useState(false);
    const [periodoData, setPeriodoData] = useState({ mes: new Date().getMonth() + 1, anio: new Date().getFullYear() });
    const [creatingPeriodo, setCreatingPeriodo] = useState(false);



    // Gestión Masiva
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkPeriodoData, setBulkPeriodoData] = useState({ mes: new Date().getMonth() + 1, anio: new Date().getFullYear() });
    const [creatingBulk, setCreatingBulk] = useState(false);

    // Acta de Conformidad
    const [isActaModalOpen, setIsActaModalOpen] = useState(false);
    const [isConsolidadoModalOpen, setIsConsolidadoModalOpen] = useState(false);
    const [isBulkAsistenciaModalOpen, setIsBulkAsistenciaModalOpen] = useState(false);
    const [isBulkRouteModalOpen, setIsBulkRouteModalOpen] = useState(false);
    const [generatingActa, setGeneratingActa] = useState(false);
    const [actaSelection, setActaSelection] = useState({
        rutas: [],
        periodos: [],
        establecimientos: []
    });

    const [sortConfig, setSortConfig] = useState({ key: 'nombre', direction: 'asc' });

    const [gruposPreset, setGruposPreset] = useState([]);
    const [isSavingPreset, setIsSavingPreset] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');
    const [showSavePresetInput, setShowSavePresetInput] = useState(false);

    const closeActaModal = () => {
        setIsActaModalOpen(false);
        setActaSelection({
            rutas: [],
            periodos: [],
            establecimientos: []
        });
        setShowSavePresetInput(false);
        setNewPresetName('');
    };

    const handleGenerateActa = async () => {
        if (actaSelection.rutas.length === 0 || actaSelection.periodos.length === 0 || actaSelection.establecimientos.length === 0) {
            alert("Por favor selecciona al menos una ruta, un periodo y un establecimiento.");
            return;
        }

        setGeneratingActa(true);
        try {
            const response = await api.post(`contratos/servicios/${id}/generar_acta_conformidad/`, {
                ruta_ids: actaSelection.rutas,
                periodo_ids: actaSelection.periodos,
                est_ids: actaSelection.establecimientos
            }, { responseType: 'blob' });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Acta_Conformidad_${id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            closeActaModal();
        } catch (error) {
            console.error("Error generating Acta:", error);
            alert("Error al generar el acta de conformidad.");
        } finally {
            setGeneratingActa(false);
        }
    };

    const handleSavePreset = async () => {
        if (!newPresetName.trim()) {
            alert("Ingresa un nombre para el grupo.");
            return;
        }
        setIsSavingPreset(true);
        try {
            await api.post('contratos/grupos-preset/', {
                nombre: newPresetName,
                servicio: id,
                rutas: actaSelection.rutas
            });
            setNewPresetName('');
            setShowSavePresetInput(false);
            fetchGruposPreset();
        } catch (error) {
            console.error("Error saving preset:", error);
            alert("Error al guardar el grupo.");
        } finally {
            setIsSavingPreset(false);
        }
    };

    const handleApplyPreset = (grupo) => {
        setActaSelection({
            ...actaSelection,
            rutas: grupo.rutas
        });
    };

    const handleDeletePreset = async (e, gid) => {
        e.stopPropagation();
        if (!confirm("¿Eliminar este grupo?")) return;
        try {
            await api.delete(`contratos/grupos-preset/${gid}/`);
            fetchGruposPreset();
        } catch (error) {
            alert("Error al eliminar.");
        }
    };

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get(`contratos/servicios/${id}/`);
            setServicio(res.data);
            
            const rutasRes = await api.get(`contratos/rutas/?servicio=${id}`);
            const rutasData = (rutasRes.data.results || rutasRes.data).map(r => ({
                ...r,
                // Sort periods: newest first
                periodos: (r.periodos || []).sort((a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio))
            }));
            setRutas(rutasData);

            const contratoRes = await api.get(`contratos/contratos/${res.data.contrato}/`);
            setContrato(contratoRes.data);

            if (selectedRoute) {
                const refreshed = rutasData.find(r => r.id === selectedRoute.id);
                if (refreshed) setSelectedRoute(refreshed);
            }
        } catch (err) {
            setError("No se pudo cargar la información del servicio.");
        } finally {
            setLoading(false);
        }
    }, [id, selectedRoute]);

    const fetchGruposPreset = useCallback(async () => {
        try {
            const res = await api.get(`contratos/grupos-preset/?servicio=${id}`);
            // Handle both paginated (results) and direct array responses
            const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setGruposPreset(data);
        } catch (error) {
            console.error("Error fetching presets:", error);
            setGruposPreset([]); // Safety fallback
        }
    }, [id]);

    // Sincronizar selección de establecimientos con rutas actuales
    useEffect(() => {
        if (!isActaModalOpen) return;
        
        // Obtener todos los IDs válidos de las rutas seleccionadas
        const validEstIds = rutas
            .filter(r => actaSelection.rutas.includes(r.id))
            .flatMap(r => r.establecimientos || []);
        
        // Filtrar la selección actual para quitar los que ya no pertenecen a ninguna ruta marcada
        const filteredEsts = actaSelection.establecimientos.filter(id => validEstIds.includes(id));
        
        if (filteredEsts.length !== actaSelection.establecimientos.length) {
            setActaSelection(prev => ({
                ...prev,
                establecimientos: filteredEsts
            }));
        }
    }, [actaSelection.rutas, rutas, isActaModalOpen, actaSelection.establecimientos.length]);

    useEffect(() => {
        fetchData();
        fetchGruposPreset();
    }, [id, fetchGruposPreset]);

    const openRoutePanel = (ruta, view = 'management') => {
        setSelectedRoute(ruta);
        setPanelView(view);
        setIsPanelOpen(true);
    };

    const handleCreateRuta = async (e) => {
        e.preventDefault();
        setCreatingRuta(true);
        try {
            await api.post('contratos/rutas/', { ...rutaFormData, servicio: id });
            setIsRutaModalOpen(false);
            setRutaFormData({ nombre: '', proveedor: '', establecimientos: [], valor_diario: '', itinerario: '', dia_inicio_periodo: 21, dia_fin_periodo: 20, incluir_fines_semana: false, excluir_feriados: true });
            fetchData();
        } catch (err) {
            alert("Error al crear ruta.");
        } finally {
            setCreatingRuta(false);
        }
    };

    const handleDeleteRuta = async (rutaId) => {
        if (!window.confirm("¿Está seguro de eliminar esta ruta? Esta acción eliminará también todos sus periodos de cobro asociados.")) return;
        try {
            await api.delete(`contratos/rutas/${rutaId}/`);
            fetchData();
        } catch (err) {
            alert("Error al eliminar la ruta.");
        }
    };

    const handleUpdateRuta = async (e) => {
        e.preventDefault();
        setUpdatingRuta(true);
        try {
            await api.put(`contratos/rutas/${editRutaData.id}/`, editRutaData);
            setIsEditModalOpen(false);
            fetchData();
        } catch (err) {
            alert("Error al actualizar la ruta. Verifique los datos.");
        } finally {
            setUpdatingRuta(false);
        }
    };

    const openEditRutaModal = (ruta) => {
        const pa = contrato?.proveedores_asociados.find(p => p.proveedor === parseInt(ruta.proveedor));
        const validEstIds = pa ? pa.establecimientos_detalle.map(e => e.id) : [];
        
        setEditRutaData({
            ...ruta,
            proveedor: ruta.proveedor.toString(),
            // Filtrar para asegurar que solo queden establecimientos que el proveedor todavía tiene asignados
            establecimientos: (ruta.establecimientos || []).filter(id => validEstIds.includes(id)),
            itinerario: ruta.itinerario || '',
            incluir_fines_semana: ruta.incluir_fines_semana ?? false,
            excluir_feriados: ruta.excluir_feriados ?? true
        });
        setIsEditModalOpen(true);
    };

    const handleGeneratePeriod = async (e) => {
        e.preventDefault();
        setCreatingPeriodo(true);
        try {
            await api.post(`contratos/rutas/${selectedRoute.id}/generar-periodo/`, periodoData);
            setIsPeriodoModalOpen(false);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || "Error al generar periodo.");
        } finally {
            setCreatingPeriodo(false);
        }
    };

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedRutas = useMemo(() => {
        let sortableItems = [...rutas.filter(r => {
            const matchesSearch = r.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                r.proveedor_nombre?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesProvider = selectedProvider === 'all' || r.proveedor === parseInt(selectedProvider);
            return matchesSearch && matchesProvider;
        })];
        
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];
                
                // Handle provider name which is nested or in read_only field
                if (sortConfig.key === 'proveedor_nombre') {
                    aVal = a.proveedor_nombre;
                    bVal = b.proveedor_nombre;
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [rutas, searchTerm, selectedProvider, sortConfig]);

    const handleBulkCreatePeriod = async (e) => {
        e.preventDefault();
        setCreatingBulk(true);
        try {
            const res = await api.post('contratos/rutas/bulk-generar-periodo/', {
                ruta_ids: selectedRutasTable,
                ...bulkPeriodoData
            });
            alert(`Éxito: ${res.data.created} periodos creados. Ignorados: ${res.data.skipped} (ya existían o error).`);
            setIsBulkModalOpen(false);
            setSelectedRutasTable([]);
            fetchData();
        } catch (err) {
            alert("Error al generar periodos masivos.");
        } finally {
            setCreatingBulk(false);
        }
    };

    const availableEsts = contrato?.proveedores_asociados.find(
        pa => pa.proveedor === parseInt(rutaFormData.proveedor)
    )?.establecimientos_detalle || [];

    if (loading && !servicio) return (
        <div className="flex h-[calc(100vh-170px)] items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
    );

    return (
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden animate-in fade-in duration-500 px-1">
            {/* Standard Header */}
            <div className="shrink-0 flex flex-row justify-between items-end gap-3 border-b border-slate-200/60 pb-3">
                <div>
                    <Link to="/contracts/servicios" className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 hover:text-indigo-600 transition-colors group">
                        <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-0.5" />
                        Volver a Gestión de Contratos
                    </Link>
                    <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5 leading-none uppercase">
                        <Truck className="w-6 h-6 text-indigo-500" />
                        {servicio?.nombre}
                    </h2>
                    <p className="text-[10px] font-medium text-slate-500 mt-2 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                        Control operativo y gestión de periodos ({rutas.length} rutas)
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => { setPanelView('contract'); setIsPanelOpen(true); }} 
                        className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm group"
                    >
                        <Info className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Información de Contrato</span>
                    </button>
                    <button 
                        onClick={() => setIsConsolidadoModalOpen(true)} 
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95 group"
                    >
                        <Calculator className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Consolidado de Pagos</span>
                    </button>
                    {can('contratos.add_rutatransporte') && (
                        <button 
                            onClick={() => setIsRutaModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-lg shadow-slate-200 active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                            Nueva Ruta
                        </button>
                    )}
                </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden relative flex flex-col min-h-0">
                {/* Search Bar & Mass Actions */}
                <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 shrink-0">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="relative w-80">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Buscar ruta..."
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all uppercase placeholder:text-slate-300"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="w-64">
                            <select 
                                value={selectedProvider} 
                                onChange={(e) => {
                                    setSelectedProvider(e.target.value);
                                    setSelectedRutasTable([]);
                                }}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all uppercase cursor-pointer truncate"
                            >
                                <option value="all">Proveedor: TODOS</option>
                                {contrato?.proveedores_asociados.map(p => (
                                    <option key={p.id} value={p.proveedor}>{p.proveedor_nombre}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <AnimatePresence>
                            {selectedRutasTable.length > 0 && can('contratos.add_periodocobro') && (
                                <motion.button 
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    onClick={(e) => { e.stopPropagation(); setIsBulkModalOpen(true); }}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95 group"
                                >
                                    <Calendar className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Abrir Periodos ({selectedRutasTable.length})</span>
                                </motion.button>
                            )}
                        </AnimatePresence>
                        
                        {can('contratos.change_ausenciaruta') && (
                            <button 
                                onClick={() => setIsBulkAsistenciaModalOpen(true)} 
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl hover:bg-amber-500 hover:text-white transition-all group shadow-sm active:scale-95"
                            >
                                <LayoutGrid className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Gestión de Asistencia</span>
                            </button>
                        )}

                        {can('contratos.change_rutatransporte') && (
                            <button 
                                onClick={() => setIsBulkRouteModalOpen(true)} 
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-600 hover:text-white transition-all group shadow-sm active:scale-95"
                            >
                                <Settings className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Config. Masiva</span>
                            </button>
                        )}
                        
                        <button 
                            onClick={() => setIsActaModalOpen(true)}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl hover:bg-indigo-600 hover:text-white transition-all group shadow-sm active:scale-95"
                        >
                            <FileText className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Acta de Conformidad</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full border-collapse">
                        <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                            <tr>
                                <th className="py-2 px-4 text-center w-10">
                                     <input 
                                         type="checkbox" 
                                         className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                         checked={sortedRutas.length > 0 && selectedRutasTable.length === sortedRutas.length}
                                         onChange={(e) => {
                                             if (e.target.checked) setSelectedRutasTable(sortedRutas.map(r => r.id));
                                             else setSelectedRutasTable([]);
                                         }}
                                     />
                                 </th>
                                 <th className="py-2 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-widest w-12 text-center">Ficha</th>
                                 <th 
                                     className="text-left py-2 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors"
                                     onClick={() => requestSort('nombre')}
                                 >
                                     <div className="flex items-center gap-1">
                                         Nombre de Ruta
                                         {sortConfig.key === 'nombre' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                     </div>
                                 </th>
                                 <th 
                                     className="text-left py-2 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors"
                                     onClick={() => requestSort('itinerario')}
                                 >
                                     <div className="flex items-center gap-1">
                                         Detalle del Trayecto
                                         {sortConfig.key === 'itinerario' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                     </div>
                                 </th>
                                 <th 
                                     className="text-left py-2 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors"
                                     onClick={() => requestSort('proveedor_nombre')}
                                 >
                                     <div className="flex items-center gap-1">
                                         Proveedor
                                         {sortConfig.key === 'proveedor_nombre' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                     </div>
                                 </th>
                                 <th 
                                     className="text-right py-2 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-widest w-32 cursor-pointer hover:text-indigo-600 transition-colors"
                                     onClick={() => requestSort('valor_diario')}
                                 >
                                     <div className="flex items-center justify-end gap-1">
                                         Valor Diario
                                         {sortConfig.key === 'valor_diario' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                     </div>
                                 </th>
                                 <th className="text-center py-2 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-widest w-24">Acciones</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-50 font-sans">
                             {sortedRutas.map(ruta => (
                                <tr 
                                    key={ruta.id} 
                                    onClick={() => openRoutePanel(ruta, 'management')}
                                    className={`hover:bg-indigo-50/40 transition-colors group cursor-pointer ${selectedRutasTable.includes(ruta.id) ? 'bg-indigo-50/60' : (selectedRoute?.id === ruta.id ? 'bg-indigo-50/60' : '')}`}
                                >
                                    <td className="py-2 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            checked={selectedRutasTable.includes(ruta.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedRutasTable([...selectedRutasTable, ruta.id]);
                                                else setSelectedRutasTable(selectedRutasTable.filter(id => id !== ruta.id));
                                            }}
                                        />
                                    </td>
                                    <td className="py-1.5 px-6 text-center" onClick={(e) => { e.stopPropagation(); openRoutePanel(ruta, 'info'); }}>
                                        <button 
                                            onClick={() => openRoutePanel(ruta, 'info')}
                                            className="p-1 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-indigo-100"
                                            title="Ver Ficha Técnica"
                                        >
                                            <Info className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                    <td className="py-1.5 px-6"><div className="flex items-center gap-2.5"><div className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${selectedRoute?.id === ruta.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-100 group-hover:bg-white group-hover:text-indigo-600 group-hover:border-indigo-100'}`}><MapPin className="w-3 h-3" /></div><span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight">{ruta.nombre}</span></div></td>
                                    <td className="py-1.5 px-6">
                                        <div className="max-w-[250px]">
                                            <p className="text-[9px] font-bold text-slate-500 uppercase truncate italic">
                                                {ruta.itinerario || 'SIN DETALLE TÉCNICO'}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="py-1.5 px-6"><span className="text-[9px] font-bold text-slate-500 uppercase">{ruta.proveedor_nombre}</span></td>
                                    <td className="py-1.5 px-6 text-right font-mono text-[10px] font-black text-slate-800">${new Intl.NumberFormat('es-CL').format(ruta.valor_diario)}</td>
                                    <td className="py-1.5 px-6 text-right" onClick={e => e.stopPropagation()}>
                                        <div className="flex justify-center gap-1">
                                            {can('contratos.change_rutatransporte') && (
                                                <button onClick={() => openEditRutaModal(ruta)} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-indigo-100 rounded-lg shadow-sm transition-all">
                                                    <Pencil className="w-3 h-3" />
                                                </button>
                                            )}
                                            {can('contratos.delete_rutatransporte') && (
                                                <button onClick={() => handleDeleteRuta(ruta.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-white border border-transparent hover:border-red-100 rounded-lg shadow-sm transition-all">
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Overlaid Drawer (Route Info, Contract Info & Periods) */}
                <AnimatePresence>
                    {isPanelOpen && (
                        <>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPanelOpen(false)} className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] z-20" />
                            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="absolute top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col z-30 border-l border-slate-200">
                                <div className="p-5 border-b border-slate-100 bg-slate-50/80 backdrop-blur-md flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 ${panelView === 'contract' ? 'bg-amber-500' : 'bg-indigo-600'} rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200`}>
                                            {panelView === 'info' ? <Info className="w-5 h-5" /> : panelView === 'contract' ? <Shield className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
                                        </div>
                                        <div><h3 className="text-sm font-black text-slate-800 uppercase tracking-tight truncate max-w-[200px]">{panelView === 'contract' ? 'Detalles del Contrato' : selectedRoute?.nombre}</h3><p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{panelView === 'info' ? 'Ficha Técnica' : panelView === 'contract' ? 'Información Legal' : 'Gestión de Operaciones'}</p></div>
                                    </div>
                                    <button onClick={() => setIsPanelOpen(false)} className="p-2 hover:bg-white rounded-xl text-slate-400 transition-colors border border-transparent hover:border-slate-100"><X className="w-5 h-5" /></button>
                                </div>
                                <div className="flex flex-col h-full overflow-hidden">
                                    {panelView === 'contract' ? (
                                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                                            {/* Financial Overview Card */}
                                            <div className="bg-slate-900 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                                    <Calculator className="w-24 h-24" />
                                                </div>
                                                <div className="relative z-10">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Ejecución Presupuestaria</p>
                                                    <div className="flex items-end justify-between mb-4">
                                                        <div>
                                                            <p className="text-3xl font-black tracking-tighter">${new Intl.NumberFormat('es-CL').format(contrato?.monto_ejecutado)}</p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Consumido de ${new Intl.NumberFormat('es-CL').format(contrato?.monto_total)}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-lg font-black text-emerald-400">
                                                                {contrato?.monto_total > 0 ? Math.round((contrato?.monto_ejecutado / contrato?.monto_total) * 100) : 0}%
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Progress Bar */}
                                                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mb-6">
                                                        <motion.div 
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${contrato?.monto_total > 0 ? (contrato?.monto_ejecutado / contrato?.monto_total) * 100 : 0}%` }}
                                                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Disponible</p>
                                                            <p className="text-sm font-black text-emerald-400">${new Intl.NumberFormat('es-CL').format(contrato?.monto_restante)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Gasto Mensual Prom.</p>
                                                            <p className="text-sm font-black text-indigo-300">${new Intl.NumberFormat('es-CL').format(Math.round(contrato?.monto_total / (contrato?.plazo_meses || 1)))}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Contract Metadata */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nº CDP</p>
                                                    <p className="text-[11px] font-black text-slate-700 uppercase">{contrato?.cdp || 'Sin Asignar'}</p>
                                                </div>
                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nº Orden Compra</p>
                                                    <p className="text-[11px] font-black text-slate-700 uppercase">{contrato?.nro_oc || 'Sin Asignar'}</p>
                                                </div>
                                            </div>

                                            {/* Timeline */}
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Vigencia del Contrato</h4>
                                                <div className="relative">
                                                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-100" />
                                                    <div className="space-y-6 relative">
                                                        <div className="flex gap-4 items-start">
                                                            <div className="w-8 h-8 rounded-full bg-white border-2 border-indigo-500 flex items-center justify-center shrink-0 z-10 shadow-sm"><Calendar className="w-3.5 h-3.5 text-indigo-500" /></div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-700 uppercase leading-none">Fecha de Inicio</p>
                                                                <p className="text-[11px] font-bold text-slate-500 mt-1.5">{contrato?.fecha_inicio ? new Date(contrato.fecha_inicio).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase() : 'N/A'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-4 items-start">
                                                            <div className="w-8 h-8 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center shrink-0 z-10 shadow-sm"><Clock className="w-3.5 h-3.5 text-slate-400" /></div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-700 uppercase leading-none">Plazo de Ejecución</p>
                                                                <p className="text-[11px] font-bold text-slate-500 mt-1.5">{contrato?.plazo_meses} Meses de Operación</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-4 items-start">
                                                            <div className="w-8 h-8 rounded-full bg-white border-2 border-rose-500 flex items-center justify-center shrink-0 z-10 shadow-sm"><Target className="w-3.5 h-3.5 text-rose-500" /></div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-700 uppercase leading-none">Fecha de Término</p>
                                                                <p className="text-[11px] font-bold text-slate-500 mt-1.5">{contrato?.fecha_termino ? new Date(contrato.fecha_termino).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase() : 'N/A'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Details Section */}
                                            <div className="space-y-4 pt-4">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Clasificación Técnica</h4>
                                                <div className="grid grid-cols-1 gap-3">
                                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Categoría</span>
                                                        <span className="text-[10px] font-black text-slate-700 uppercase">{contrato?.categoria_nombre}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Proceso</span>
                                                        <span className="text-[10px] font-black text-slate-700 uppercase">{contrato?.proceso_nombre}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Orientación</span>
                                                        <span className="text-[10px] font-black text-slate-700 uppercase">{contrato?.orientacion_nombre}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Description */}
                                            <div className="space-y-3">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Descripción del Servicio</h4>
                                                <div className="p-5 bg-indigo-50/30 rounded-3xl border border-indigo-100/50">
                                                    <p className="text-[11px] font-medium text-slate-600 leading-relaxed italic">"{contrato?.descripcion}"</p>
                                                </div>
                                            </div>

                                            {/* Providers Detailed Breakdown */}
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Proveedores Adjudicados ({contrato?.proveedores_asociados.length})</h4>
                                                <div className="space-y-3">
                                                    {contrato?.proveedores_asociados.map(pa => (
                                                        <div key={pa.id} className="p-4 bg-white rounded-3xl border border-slate-100 shadow-sm group hover:border-indigo-200 transition-all">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                                                                        <Building2 className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                                                                    </div>
                                                                    <span className="text-[11px] font-black text-slate-700 uppercase truncate max-w-[180px]">{pa.proveedor_nombre}</span>
                                                                </div>
                                                                <span className="text-[11px] font-black text-indigo-600">${new Intl.NumberFormat('es-CL').format(pa.monto_adjudicado)}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">
                                                                <span>Restante: ${new Intl.NumberFormat('es-CL').format(pa.monto_restante)}</span>
                                                                <span className="text-emerald-500">{pa.monto_adjudicado > 0 ? Math.round((pa.monto_ejecutado / pa.monto_adjudicado) * 100) : 0}% Ejecutado</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Info Seccion (Fija) */}
                                            <div className="p-6 space-y-6 shrink-0 border-b border-slate-100/60 bg-slate-50/30">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Corte de Pago</p><p className="text-xs font-black text-slate-700">{selectedRoute?.dia_inicio_periodo} - {selectedRoute?.dia_fin_periodo}</p></div>
                                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Valor Diario</p><p className="text-xs font-black text-indigo-600">${new Intl.NumberFormat('es-CL').format(selectedRoute?.valor_diario || 0)}</p></div>
                                                </div>

                                                {panelView === 'management' && (
                                                    <div className="flex items-center justify-between px-1">
                                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><History className="w-3.5 h-3.5" /> Historial de Periodos</h4>
                                                        {can('contratos.add_periodocobro') && (
                                                            <button onClick={() => setIsPeriodoModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"><Plus className="w-3 h-3" /> Generar</button>
                                                        )}
                                                    </div>
                                                )}
                                                {panelView === 'info' && (
                                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1"><Building2 className="w-3.5 h-3.5" /> Establecimientos ({selectedRoute?.establecimientos_detalle?.length})</h4>
                                                )}
                                            </div>

                                            {/* Lista Scrolleable (Periodos o Establecimientos) */}
                                            <div className="flex-1 overflow-y-auto p-6 pt-2 custom-scrollbar">
                                                {panelView === 'management' && (
                                                    <div className="space-y-2.5">
                                                        {selectedRoute?.periodos.map(periodo => (
                                                            <button key={periodo.id} onClick={() => setActivePeriodId(periodo.id)} className="w-full flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl hover:border-indigo-300 hover:shadow-lg transition-all group/p text-left">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-2 h-2 rounded-full ${periodo.estado === 'CERRADO' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.4)]'}`} />
                                                                    <div><p className="text-[10px] font-black text-slate-700 uppercase tracking-tight leading-none">{periodo.nombre_estandarizado}</p><p className="text-[8px] text-slate-400 mt-1.5 font-bold uppercase tracking-widest">Estado: {periodo.estado}</p></div>
                                                                </div>
                                                                <ArrowRight className="w-3.5 h-3.5 text-slate-200 group-hover/p:text-indigo-600 group-hover/p:translate-x-1 transition-all" />
                                                            </button>
                                                        ))}
                                                        {selectedRoute?.periodos.length === 0 && (
                                                            <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-[32px]"><Clock className="w-8 h-8 text-slate-200 mx-auto mb-3" /><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No hay periodos generados</p></div>
                                                        )}
                                                    </div>
                                                )}

                                                {panelView === 'info' && (
                                                    <div className="space-y-6">
                                                        {/* Ficha Técnica Detallada */}
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Fines de Semana</p>
                                                                <p className={`text-[10px] font-black uppercase ${selectedRoute?.incluir_fines_semana ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                                    {selectedRoute?.incluir_fines_semana ? 'Incluidos' : 'Excluidos'}
                                                                </p>
                                                            </div>
                                                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Días Feriados</p>
                                                                <p className={`text-[10px] font-black uppercase ${selectedRoute?.excluir_feriados ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                                    {selectedRoute?.excluir_feriados ? 'Excluidos' : 'Incluidos'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Itinerario / Trayecto */}
                                                        <div className="p-5 bg-indigo-50/30 border border-indigo-100/50 rounded-[32px]">
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <div className="p-1.5 bg-white rounded-lg text-indigo-600 shadow-sm"><Truck className="w-3.5 h-3.5" /></div>
                                                                <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Detalle del Itinerario</h5>
                                                            </div>
                                                            <p className="text-[11px] font-medium text-slate-600 leading-relaxed italic px-1">
                                                                {selectedRoute?.itinerario || 'No se ha definido un detalle técnico del trayecto para esta ruta operativa.'}
                                                            </p>
                                                        </div>

                                                        {/* Listado de Establecimientos */}
                                                        <div className="space-y-3 pt-2">
                                                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1"><Building2 className="w-3.5 h-3.5" /> Establecimientos ({selectedRoute?.establecimientos_detalle?.length})</h4>
                                                            <div className="flex flex-wrap gap-2">
                                                                {selectedRoute?.establecimientos_detalle?.map(est => (
                                                                    <div key={est.id} className="px-4 py-2.5 bg-white text-[10px] font-bold text-slate-600 rounded-xl border border-slate-100 uppercase tracking-tight shadow-sm flex items-center gap-2">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                                                        {est.nombre}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* Calendar Modal (NEW UX) */}
            <AnimatePresence>
                {activePeriodId && (
                    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActivePeriodId(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden min-h-[500px]">
                            <PeriodoCalendarioModal periodoId={activePeriodId} onClose={() => { setActivePeriodId(null); fetchData(); }} />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Bulk Assistance Modal */}
            <AnimatePresence>
                {isBulkAsistenciaModalOpen && (
                    <BulkAsistenciaModal 
                        isOpen={isBulkAsistenciaModalOpen} 
                        onClose={() => setIsBulkAsistenciaModalOpen(false)}
                        rutas={rutas}
                        onUpdate={fetchData}
                    />
                )}
            </AnimatePresence>

            {/* Bulk Route Settings Modal */}
            <AnimatePresence>
                {isBulkRouteModalOpen && (
                    <BulkRouteSettingsModal
                        isOpen={isBulkRouteModalOpen}
                        onClose={() => setIsBulkRouteModalOpen(false)}
                        rutas={rutas}
                        onUpdate={fetchData}
                    />
                )}
            </AnimatePresence>

            {/* Other Modals (Create Route, Generate Period, Info) */}
            <AnimatePresence>

                {isConsolidadoModalOpen && (
                    <ConsolidadoModal
                        isOpen={isConsolidadoModalOpen}
                        onClose={() => setIsConsolidadoModalOpen(false)}
                        rutas={rutas}
                    />
                )}

                {isRutaModalOpen && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRutaModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden p-8 flex flex-col">
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-8">Nueva Ruta Operativa</h2>
                            <form onSubmit={handleCreateRuta} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Nombre</label><input required type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={rutaFormData.nombre} onChange={e => setRutaFormData({...rutaFormData, nombre: e.target.value})} /></div>
                                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Proveedor</label><select required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={rutaFormData.proveedor} onChange={e => setRutaFormData({...rutaFormData, proveedor: e.target.value, establecimientos: []})}><option value="">Seleccionar proveedor...</option>{contrato?.proveedores_asociados.map(pa => (<option key={pa.proveedor} value={pa.proveedor}>{pa.proveedor_nombre}</option>))}</select></div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Establecimientos ({rutaFormData.establecimientos.length} seleccionados)</label>
                                        <div className="flex gap-3">
                                            <button type="button" onClick={() => setRutaFormData({...rutaFormData, establecimientos: availableEsts.map(e => e.id)})} className="text-[9px] font-black text-indigo-600 uppercase hover:underline">Todos</button>
                                            <button type="button" onClick={() => setRutaFormData({...rutaFormData, establecimientos: []})} className="text-[9px] font-black text-slate-400 uppercase hover:underline">Limpiar</button>
                                        </div>
                                    </div>
                                    <div className="relative mb-2">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                        <input 
                                            type="text" 
                                            placeholder="Buscar establecimiento..." 
                                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold"
                                            value={searchTermEst}
                                            onChange={e => setSearchTermEst(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-4 rounded-3xl border border-slate-200 max-h-48 overflow-y-auto custom-scrollbar">
                                        {availableEsts.filter(est => est.nombre.toLowerCase().includes(searchTermEst.toLowerCase())).map(est => (
                                            <label key={est.id} className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-100 cursor-pointer text-[10px] font-bold text-slate-600 transition-all hover:border-indigo-100 hover:bg-indigo-50/20">
                                                <input type="checkbox" className="w-3.5 h-3.5 rounded text-indigo-600" checked={rutaFormData.establecimientos.includes(est.id)} onChange={e => { const newEsts = e.target.checked ? [...rutaFormData.establecimientos, est.id] : rutaFormData.establecimientos.filter(id => id !== est.id); setRutaFormData({...rutaFormData, establecimientos: newEsts}); }} /> 
                                                <span className="truncate">{est.nombre}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Itinerario / Trayecto (Detalle para el Acta)</label>
                                    <textarea 
                                        placeholder="Ej: Iquique - Los Verdes - Chipana. Describa los puntos clave de la ruta."
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-bold min-h-[80px] resize-none"
                                        value={rutaFormData.itinerario}
                                        onChange={e => setRutaFormData({...rutaFormData, itinerario: e.target.value})}
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Valor Diario</label><input required type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black" value={rutaFormData.valor_diario} onChange={e => setRutaFormData({...rutaFormData, valor_diario: e.target.value})} /></div>
                                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Día Inicio</label><input required type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={rutaFormData.dia_inicio_periodo} onChange={e => setRutaFormData({...rutaFormData, dia_inicio_periodo: e.target.value})} /></div>
                                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Día Fin</label><input required type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={rutaFormData.dia_fin_periodo} onChange={e => setRutaFormData({...rutaFormData, dia_fin_periodo: e.target.value})} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer group transition-all hover:bg-white hover:border-indigo-100">
                                        <input type="checkbox" className="w-4 h-4 rounded text-indigo-600" checked={!rutaFormData.incluir_fines_semana} onChange={e => setRutaFormData({...rutaFormData, incluir_fines_semana: !e.target.checked})} />
                                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight group-hover:text-indigo-600">Excluir Fines de Semana</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer group transition-all hover:bg-white hover:border-indigo-100">
                                        <input type="checkbox" className="w-4 h-4 rounded text-indigo-600" checked={rutaFormData.excluir_feriados} onChange={e => setRutaFormData({...rutaFormData, excluir_feriados: e.target.checked})} />
                                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight group-hover:text-indigo-600">Excluir Feriados</span>
                                    </label>
                                </div>
                                <div className="flex gap-4"><button type="button" onClick={() => setIsRutaModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-3xl font-black text-[10px] uppercase tracking-widest">Cancelar</button><button disabled={creatingRuta} type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl">{creatingRuta ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar Ruta'}</button></div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {isEditModalOpen && editRutaData && (
                    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden p-8 flex flex-col">
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-8">Editar Ruta Operativa</h2>
                            <form onSubmit={handleUpdateRuta} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Nombre</label><input required type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={editRutaData.nombre} onChange={e => setEditRutaData({...editRutaData, nombre: e.target.value})} /></div>
                                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Proveedor</label><select required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={editRutaData.proveedor} onChange={e => setEditRutaData({...editRutaData, proveedor: e.target.value, establecimientos: []})}><option value="">Seleccionar proveedor...</option>{contrato?.proveedores_asociados.map(pa => (<option key={pa.proveedor} value={pa.proveedor}>{pa.proveedor_nombre}</option>))}</select></div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Establecimientos ({editRutaData.establecimientos.length} seleccionados)</label>
                                        <div className="flex gap-3">
                                            <button type="button" onClick={() => {
                                                const pa = contrato?.proveedores_asociados.find(p => p.proveedor === parseInt(editRutaData.proveedor));
                                                if (pa) setEditRutaData({...editRutaData, establecimientos: pa.establecimientos_detalle.map(e => e.id)});
                                            }} className="text-[9px] font-black text-indigo-600 uppercase hover:underline">Todos</button>
                                            <button type="button" onClick={() => setEditRutaData({...editRutaData, establecimientos: []})} className="text-[9px] font-black text-slate-400 uppercase hover:underline">Limpiar</button>
                                        </div>
                                    </div>
                                    <div className="relative mb-2">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                        <input 
                                            type="text" 
                                            placeholder="Buscar establecimiento..." 
                                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold"
                                            value={searchTermEditEst}
                                            onChange={e => setSearchTermEditEst(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-4 rounded-3xl border border-slate-200 max-h-48 overflow-y-auto custom-scrollbar">
                                        {(contrato?.proveedores_asociados.find(pa => pa.proveedor === parseInt(editRutaData.proveedor))?.establecimientos_detalle || [])
                                          .filter(est => est.nombre.toLowerCase().includes(searchTermEditEst.toLowerCase()))
                                          .map(est => (
                                            <label key={est.id} className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-100 cursor-pointer text-[10px] font-bold text-slate-600 transition-all hover:border-indigo-100 hover:bg-indigo-50/20">
                                                <input type="checkbox" className="w-3.5 h-3.5 rounded text-indigo-600" checked={editRutaData.establecimientos.includes(est.id)} onChange={e => {
                                                    const newEsts = e.target.checked ? [...editRutaData.establecimientos, est.id] : editRutaData.establecimientos.filter(id => id !== est.id);
                                                    setEditRutaData({...editRutaData, establecimientos: newEsts});
                                                }} /> 
                                                <span className="truncate">{est.nombre}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Itinerario / Trayecto (Detalle para el Acta)</label>
                                    <textarea 
                                        placeholder="Ej: Iquique - Los Verdes - Chipana. Describa los puntos clave de la ruta."
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-bold min-h-[80px] resize-none"
                                        value={editRutaData.itinerario}
                                        onChange={e => setEditRutaData({...editRutaData, itinerario: e.target.value})}
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Valor Diario</label><input required type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black" value={editRutaData.valor_diario} onChange={e => setEditRutaData({...editRutaData, valor_diario: e.target.value})} /></div>
                                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Día Inicio</label><input required type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={editRutaData.dia_inicio_periodo} onChange={e => setEditRutaData({...editRutaData, dia_inicio_periodo: e.target.value})} /></div>
                                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Día Fin</label><input required type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={editRutaData.dia_fin_periodo} onChange={e => setEditRutaData({...editRutaData, dia_fin_periodo: e.target.value})} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer group transition-all hover:bg-white hover:border-indigo-100">
                                        <input type="checkbox" className="w-4 h-4 rounded text-indigo-600" checked={!editRutaData.incluir_fines_semana} onChange={e => setEditRutaData({...editRutaData, incluir_fines_semana: !e.target.checked})} />
                                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight group-hover:text-indigo-600">Excluir Fines de Semana</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer group transition-all hover:bg-white hover:border-indigo-100">
                                        <input type="checkbox" className="w-4 h-4 rounded text-indigo-600" checked={editRutaData.excluir_feriados} onChange={e => setEditRutaData({...editRutaData, excluir_feriados: e.target.checked})} />
                                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight group-hover:text-indigo-600">Excluir Feriados</span>
                                    </label>
                                </div>
                                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3 items-start">
                                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-[9px] font-bold text-amber-700 leading-relaxed uppercase tracking-tight">Atención: Los cambios solo afectarán a los periodos que aún se encuentren ABIERTOS. Los periodos CERRADOS mantendrán sus fechas y montos originales.</p>
                                </div>
                                <div className="flex gap-4"><button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-3xl font-black text-[10px] uppercase tracking-widest">Cancelar</button><button disabled={updatingRuta} type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl">{updatingRuta ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Actualizar Ruta'}</button></div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isPeriodoModalOpen && (
                    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPeriodoModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Generar Periodo</h2>
                                <button onClick={() => setIsPeriodoModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                            
                            <form onSubmit={handleGeneratePeriod} className="space-y-6 text-left">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Mes del Periodo</label>
                                        <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={periodoData.mes} onChange={e => setPeriodoData({...periodoData, mes: parseInt(e.target.value)})}>
                                            {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => (
                                                <option key={m} value={i+1}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Año</label>
                                        <input type="number" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={periodoData.anio} onChange={e => setPeriodoData({...periodoData, anio: parseInt(e.target.value)})} />
                                    </div>
                                </div>

                                {/* Preview de Rango */}
                                <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl">
                                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Calendar className="w-3 h-3" /> Rango de Fechas Estimado
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-slate-700">{selectedRoute.dia_inicio_periodo}/{periodoData.mes === 1 ? 12 : periodoData.mes - 1}/{periodoData.mes === 1 ? periodoData.anio - 1 : periodoData.anio}</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase">Inicio</p>
                                        </div>
                                        <ArrowRight className="w-3 h-3 text-indigo-300" />
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-slate-700">{selectedRoute.dia_fin_periodo}/{periodoData.mes}/{periodoData.anio}</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase">Término</p>
                                        </div>
                                    </div>
                                </div>

                                <button disabled={creatingPeriodo} type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-[22px] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all hover:bg-indigo-700 active:scale-95">
                                    {creatingPeriodo ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'GENERAR PERIODO'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isActaModalOpen && (
                    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeActaModal} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden p-8 flex flex-col max-h-[95vh]">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Generar Acta de Conformidad Operativa</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configuración masiva de reporte oficial</p>
                                </div>
                                <button onClick={closeActaModal} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-all"><X className="w-5 h-5" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-10 pr-2 custom-scrollbar">
                                {/* Presets / Grupos de Rutas */}
                                <div className="bg-slate-50/50 border border-slate-100 p-5 rounded-[32px] space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><Target className="w-4 h-4" /></div>
                                            <div>
                                                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Grupos de Rutas Guardados</h4>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase">Carga rápida de selecciones frecuentes</p>
                                            </div>
                                        </div>
                                        {actaSelection.rutas.length > 0 && !showSavePresetInput && (
                                            <button 
                                                onClick={() => setShowSavePresetInput(true)}
                                                className="px-4 py-2 bg-white text-indigo-600 border border-indigo-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                            >
                                                Guardar Selección Actual
                                            </button>
                                        )}
                                    </div>

                                    {showSavePresetInput && (
                                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 p-3 bg-white rounded-2xl border border-indigo-100 shadow-sm">
                                            <input 
                                                autoFocus
                                                placeholder="Nombre del grupo (ej: Zona Norte)"
                                                className="flex-1 px-4 py-2 text-[11px] font-bold outline-none uppercase"
                                                value={newPresetName}
                                                onChange={e => setNewPresetName(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleSavePreset()}
                                            />
                                            <button onClick={handleSavePreset} disabled={isSavingPreset} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all">
                                                {isSavingPreset ? 'Guardando...' : 'Confirmar'}
                                            </button>
                                            <button onClick={() => setShowSavePresetInput(false)} className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                                        </motion.div>
                                    )}

                                    <div className="flex flex-wrap gap-2">
                                        {gruposPreset.map(grupo => (
                                            <div key={grupo.id} className="group relative">
                                                <button 
                                                    onClick={() => handleApplyPreset(grupo)}
                                                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-slate-600 uppercase tracking-tight hover:border-indigo-400 hover:text-indigo-600 transition-all shadow-sm flex items-center gap-2"
                                                >
                                                    {grupo.nombre}
                                                    <span className="text-[8px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md font-bold">{grupo.rutas.length} Rutas</span>
                                                </button>
                                                <button 
                                                    onClick={(e) => handleDeletePreset(e, grupo.id)}
                                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        {gruposPreset.length === 0 && (
                                            <p className="text-[9px] font-bold text-slate-300 uppercase italic ml-1 py-1">No tienes grupos guardados para este servicio.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Sección 1: Rutas */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Seleccionar Rutas ({actaSelection.rutas.length})</label>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setActaSelection({...actaSelection, rutas: rutas.map(r => r.id)})}
                                                className="text-[9px] font-black text-indigo-600 uppercase hover:underline"
                                            >
                                                Seleccionar Todas
                                            </button>
                                            <span className="text-slate-300">|</span>
                                            <button 
                                                onClick={() => setActaSelection({...actaSelection, rutas: [], periodos: [], establecimientos: []})}
                                                className="text-[9px] font-black text-slate-400 uppercase hover:underline"
                                            >
                                                Limpiar
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-2 max-h-[250px] overflow-y-auto p-1 custom-scrollbar">
                                        {rutas.map(r => {
                                            const isSelected = actaSelection.rutas.includes(r.id);
                                            return (
                                                <label 
                                                    key={r.id} 
                                                    className={`flex items-center gap-2.5 p-1.5 rounded-lg cursor-pointer transition-all group ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                                                >
                                                    <div className="relative flex items-center justify-center">
                                                        <input 
                                                            type="checkbox" 
                                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-all"
                                                            checked={isSelected}
                                                            onChange={() => {
                                                                setActaSelection({
                                                                    ...actaSelection, 
                                                                    rutas: isSelected ? actaSelection.rutas.filter(id => id !== r.id) : [...actaSelection.rutas, r.id]
                                                                });
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className={`text-[10px] uppercase truncate transition-all ${isSelected ? 'font-black text-indigo-700' : 'font-bold text-slate-600 group-hover:text-slate-900'}`}>
                                                            {r.nombre}
                                                        </div>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Sección 2: Periodos */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Seleccionar Periodo de Cobro</label>
                                        <div className="text-[9px] font-black text-slate-400 uppercase">
                                            {actaSelection.rutas.length === 0 ? 'Selecciona rutas primero' : `Analizando ${actaSelection.rutas.length} rutas`}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-1 max-h-[160px] overflow-y-auto custom-scrollbar">
                                        {(() => {
                                            const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                                            const selectedRutasData = rutas.filter(r => actaSelection.rutas.includes(r.id));
                                            
                                            // 1. Encontrar todos los Mes/Año únicos disponibles en las rutas seleccionadas
                                            const availableMonths = [];
                                            selectedRutasData.forEach(r => {
                                                r.periodos.forEach(p => {
                                                    const key = `${p.mes_referencia}-${p.anio_referencia}`;
                                                    if (!availableMonths.find(m => m.key === key)) {
                                                        availableMonths.push({
                                                            key,
                                                            mes: p.mes_referencia,
                                                            anio: p.anio_referencia,
                                                            label: `${monthNames[p.mes_referencia - 1]} ${p.anio_referencia}`
                                                        });
                                                    }
                                                });
                                            });

                                            // Ordenar por fecha (más reciente primero)
                                            availableMonths.sort((a, b) => (b.anio * 12 + b.mes) - (a.anio * 12 + a.mes));

                                            return availableMonths.map(m => {
                                                // 2. Verificar cuántas de las rutas seleccionadas tienen este periodo
                                                const matchingPeriodIds = [];
                                                let coverageCount = 0;
                                                selectedRutasData.forEach(r => {
                                                    const p = r.periodos.find(periodo => periodo.mes_referencia === m.mes && periodo.anio_referencia === m.anio);
                                                    if (p) {
                                                        matchingPeriodIds.push(p.id);
                                                        coverageCount++;
                                                    }
                                                });

                                                const isFullyCovered = coverageCount === selectedRutasData.length;
                                                const isSelected = matchingPeriodIds.length > 0 && matchingPeriodIds.every(id => actaSelection.periodos.includes(id));

                                                return (
                                                    <button 
                                                        key={m.key}
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                setActaSelection({
                                                                    ...actaSelection,
                                                                    periodos: actaSelection.periodos.filter(id => !matchingPeriodIds.includes(id))
                                                                });
                                                            } else {
                                                                setActaSelection({
                                                                    ...actaSelection,
                                                                    periodos: [...new Set([...actaSelection.periodos, ...matchingPeriodIds])]
                                                                });
                                                            }
                                                        }}
                                                        className={`px-3 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                                                            isSelected 
                                                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' 
                                                                : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2 overflow-hidden text-left">
                                                            <Calendar className={`w-3 h-3 shrink-0 ${isSelected ? 'text-emerald-200' : 'text-slate-400'}`} />
                                                            <span className="text-[10px] font-black uppercase truncate leading-none">{m.label}</span>
                                                        </div>
                                                        {!isFullyCovered && (
                                                            <AlertCircle className={`w-3 h-3 shrink-0 ${isSelected ? 'text-emerald-300' : 'text-amber-500'}`} />
                                                        )}
                                                    </button>
                                                );
                                            });
                                        })()}
                                        {actaSelection.rutas.length === 0 && (
                                            <div className="w-full p-8 border-2 border-dashed border-slate-100 rounded-[32px] text-center">
                                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Primero selecciona las rutas operativas</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Sección 3: Establecimientos */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3. Firmas de Establecimientos ({actaSelection.establecimientos.length})</label>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => {
                                                    const allEids = rutas.filter(r => actaSelection.rutas.includes(r.id)).flatMap(r => r.establecimientos);
                                                    setActaSelection({...actaSelection, establecimientos: [...new Set(allEids)]});
                                                }}
                                                className="text-[9px] font-black text-amber-600 uppercase hover:underline"
                                            >
                                                Incluir Todos
                                            </button>
                                            <span className="text-slate-300">|</span>
                                            <button 
                                                onClick={() => setActaSelection({...actaSelection, establecimientos: []})}
                                                className="text-[9px] font-black text-slate-400 uppercase hover:underline"
                                            >
                                                Limpiar
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
                                        {rutas.filter(r => actaSelection.rutas.includes(r.id)).flatMap(r => r.establecimientos_detalle || []).filter((v, i, a) => a.findIndex(t => t.id === v.id) === i).map(est => (
                                            <label key={est.id} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer hover:shadow-sm ${actaSelection.establecimientos.includes(est.id) ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500" 
                                                    checked={actaSelection.establecimientos.includes(est.id)} 
                                                    onChange={e => {
                                                        const newEsts = e.target.checked ? [...actaSelection.establecimientos, est.id] : actaSelection.establecimientos.filter(id => id !== est.id);
                                                        setActaSelection({...actaSelection, establecimientos: newEsts});
                                                    }}
                                                />
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[9px] font-black text-slate-700 uppercase leading-tight truncate">{est.nombre}</span>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">RBD: {est.rbd}</span>
                                                </div>
                                            </label>
                                        ))}
                                        {actaSelection.rutas.length === 0 && <div className="text-[10px] font-bold text-slate-300 uppercase py-2 ml-1 col-span-3">Selecciona rutas para identificar establecimientos</div>}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-8 border-t border-slate-100 flex gap-4">
                                <div className="flex-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Resumen de Selección</p>
                                    <div className="flex gap-4">
                                        <div className="text-[10px] font-bold text-slate-600 uppercase"><span className="text-indigo-600">{actaSelection.rutas.length}</span> Rutas</div>
                                        <div className="text-[10px] font-bold text-slate-600 uppercase"><span className="text-emerald-600">{actaSelection.periodos.length}</span> Meses</div>
                                        <div className="text-[10px] font-bold text-slate-600 uppercase"><span className="text-amber-600">{actaSelection.establecimientos.length}</span> Firmas</div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={closeActaModal} className="px-8 py-4 bg-slate-100 text-slate-500 rounded-3xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                                    <button 
                                        disabled={generatingActa || actaSelection.rutas.length === 0 || actaSelection.periodos.length === 0}
                                        onClick={handleGenerateActa}
                                        className="px-12 py-4 bg-indigo-600 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all active:scale-95"
                                    >
                                        {generatingActa ? <Loader2 className="w-5 h-5 animate-spin" /> : <><FileText className="w-5 h-5" /> Generar Acta de Conformidad</>}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Bulk Period Modal */}
                {isBulkModalOpen && (
                    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsBulkModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden p-8">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Apertura Masiva</h3>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{selectedRutasTable.length} Rutas Seleccionadas</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsBulkModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-all"><X className="w-5 h-5" /></button>
                            </div>

                            <form onSubmit={handleBulkCreatePeriod} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Mes del Periodo</label>
                                        <select 
                                            className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
                                            value={bulkPeriodoData.mes}
                                            onChange={e => setBulkPeriodoData({...bulkPeriodoData, mes: e.target.value})}
                                        >
                                            {[...Array(12)].map((_, i) => (
                                                <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('es-CL', { month: 'long' }).toUpperCase()}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Año</label>
                                        <input 
                                            type="number" 
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
                                            value={bulkPeriodoData.anio}
                                            onChange={e => setBulkPeriodoData({...bulkPeriodoData, anio: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl">
                                    <p className="text-[9px] font-bold text-amber-700 uppercase leading-relaxed text-center">
                                        Se generarán automáticamente los calendarios operativos para todas las rutas seleccionadas. Los periodos que ya existan serán ignorados.
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setIsBulkModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                                    <button 
                                        type="submit" 
                                        disabled={creatingBulk}
                                        className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-xl shadow-emerald-100 hover:shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        {creatingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generar Periodos Masivos"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- COMPONENTE CONSOLIDADO MODAL ---
const ConsolidadoModal = ({ isOpen, onClose, rutas }) => {
    const [selectedPeriodName, setSelectedPeriodName] = useState('');

    // Extraer nombres de periodos únicos de todas las rutas
    const availablePeriodNames = useMemo(() => {
        const names = new Set();
        rutas.forEach(r => {
            r.periodos?.forEach(p => {
                if (p.nombre_estandarizado) names.add(p.nombre_estandarizado);
            });
        });
        return Array.from(names).sort((a, b) => {
            // Ordenar por año y mes descendente (asumiendo formato "MES AÑO")
            const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
            const [mA, yA] = a.split(' ');
            const [mB, yB] = b.split(' ');
            if (yA !== yB) return yB - yA;
            return months.indexOf(mB) - months.indexOf(mA);
        });
    }, [rutas]);

    // Calcular datos consolidados por proveedor para el periodo seleccionado
    const consolidatedData = useMemo(() => {
        if (!selectedPeriodName) return [];

        const summary = {}; // { proveedorId: { nombre, rutasCount, diasTotal, montoTotal, rutasNames } }

        rutas.forEach(r => {
            const p = r.periodos?.find(per => per.nombre_estandarizado === selectedPeriodName);

            if (p) {
                const provId = r.proveedor || 'sin-prov';
                const provNombre = r.proveedor_nombre || 'PROVEEDOR NO ASIGNADO';

                if (!summary[provId]) {
                    summary[provId] = { 
                        nombre: provNombre, 
                        rutasCount: 0, 
                        diasTotal: 0, 
                        montoTotal: 0, 
                        rutasNames: [] 
                    };
                }

                const dias = parseFloat(p.dias_trabajados || 0);
                const monto = parseFloat(p.monto_total || 0);

                summary[provId].rutasCount += 1;
                summary[provId].diasTotal += dias;
                summary[provId].montoTotal += monto;
                summary[provId].rutasNames.push(r.nombre);
            }
        });

        return Object.values(summary).sort((a, b) => b.montoTotal - a.montoTotal);
    }, [selectedPeriodName, rutas]);

    const handleExportExcel = () => {
        if (!consolidatedData.length) return;

        const rows = [];
        let grandTotal = 0;

        consolidatedData.forEach(prov => {
            // Fila de Encabezado de Proveedor
            rows.push({
                'Proveedor / Ruta': prov.nombre.toUpperCase(),
                'Días': '',
                'Monto ($)': ''
            });

            // Filas de Rutas Individuales
            // Necesitamos buscar los periodos de nuevo o pasarlos en consolidatedData
            // Para ser eficientes, reconstruiremos el detalle
            rutas.forEach(r => {
                if ((r.proveedor === prov.id || r.proveedor_nombre === prov.nombre)) {
                    const p = r.periodos?.find(per => per.nombre_estandarizado === selectedPeriodName);
                    if (p) {
                        rows.push({
                            'Proveedor / Ruta': `   - ${r.nombre}`,
                            'Días': p.dias_trabajados,
                            'Monto ($)': p.monto_total
                        });
                    }
                }
            });

            // Fila de Subtotal por Proveedor
            rows.push({
                'Proveedor / Ruta': `TOTAL ${prov.nombre}`,
                'Días': prov.diasTotal,
                'Monto ($)': prov.montoTotal
            });

            // Fila en blanco para separar
            rows.push({ 'Proveedor / Ruta': '', 'Días': '', 'Monto ($)': '' });
            
            grandTotal += prov.montoTotal;
        });

        // Fila de Total General
        rows.push({
            'Proveedor / Ruta': 'TOTAL GENERAL CONSOLIDADO',
            'Días': '',
            'Monto ($)': grandTotal
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        
        // Aplicar formato de moneda a las celdas de monto
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: 2 }); // Columna C (Monto)
            if (ws[cellAddress] && typeof ws[cellAddress].v === 'number') {
                ws[cellAddress].t = 'n';
                ws[cellAddress].z = '"$"#,##0';
            }
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Detalle de Pagos");
        
        // Ajustar anchos
        ws['!cols'] = [{ wch: 50 }, { wch: 10 }, { wch: 20 }];

        XLSX.writeFile(wb, `Consolidado_Detallado_${selectedPeriodName.replace(' ', '_')}.xlsx`);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md cursor-pointer" 
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 30 }}
                className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col z-10"
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl shadow-sm">
                            <Calculator className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Consolidado de Pagos</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Resumen financiero por proveedor</p>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onClose(); }} 
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors border border-transparent hover:border-gray-200"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
                    {/* Filtro de Periodo */}
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Calendar className="w-3 h-3" /> Seleccionar periodos
                        </label>
                        <div className="relative w-full md:w-80">
                            <select
                                value={selectedPeriodName}
                                onChange={(e) => setSelectedPeriodName(e.target.value)}
                                className="w-full h-[52px] px-5 bg-white border border-slate-200 rounded-2xl text-[13px] font-black text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all cursor-pointer shadow-sm appearance-none pr-12 leading-none"
                            >
                                <option value="">-- ELIGE UN PERIODO --</option>
                                {availablePeriodNames.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <ChevronDown className="w-5 h-5" />
                            </div>
                        </div>
                    </div>

                    {selectedPeriodName ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="overflow-hidden border border-slate-100 rounded-[24px] shadow-sm bg-white">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4">Proveedor</th>
                                            <th className="px-6 py-4 text-center">Rutas</th>
                                            <th className="px-6 py-4 text-center">Días</th>
                                            <th className="px-6 py-4 text-right">Monto Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {consolidatedData.map((d, idx) => (
                                            <tr key={idx} className="hover:bg-emerald-50/20 transition-colors group">
                                                <td className="px-6 py-4 font-bold text-slate-700 text-sm uppercase tracking-tight">{d.nombre}</td>
                                                <td className="px-6 py-4 text-center text-slate-500 font-bold text-xs">{d.rutasCount}</td>
                                                <td className="px-6 py-4 text-center text-slate-600 font-black text-xs">{d.diasTotal}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-emerald-700 font-black text-sm font-mono">
                                                        ${new Intl.NumberFormat('es-CL').format(d.montoTotal)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-900 text-white border-t border-slate-800">
                                        <tr>
                                            <td className="px-6 py-5 font-black text-[10px] uppercase tracking-widest">TOTAL GENERAL</td>
                                            <td className="px-6 py-5 text-center font-black text-sm">
                                                {consolidatedData.reduce((acc, curr) => acc + curr.rutasCount, 0)}
                                            </td>
                                            <td className="px-6 py-5 text-center font-black text-sm">
                                                {consolidatedData.reduce((acc, curr) => acc + curr.diasTotal, 0)}
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <span className="text-emerald-400 font-black text-lg font-mono">
                                                    ${new Intl.NumberFormat('es-CL').format(consolidatedData.reduce((acc, curr) => acc + curr.montoTotal, 0))}
                                                </span>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={handleExportExcel}
                                    className="flex items-center gap-3 px-8 py-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 font-black text-[10px] uppercase tracking-widest active:scale-95 group"
                                >
                                    <FileSpreadsheet className="w-5 h-5 group-hover:rotate-6 transition-transform" />
                                    Descargar Resumen Detallado
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="py-24 flex flex-col items-center justify-center text-slate-300 gap-6 border-2 border-dashed border-slate-100 rounded-[32px]">
                            <div className="p-6 bg-slate-50 rounded-full">
                                <Calculator className="w-16 h-16 opacity-20" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-black uppercase tracking-widest">Esperando Selección</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Elija un periodo para generar el balance financiero</p>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

// --- COMPONENTE GESTIÓN ASISTENCIA MASIVA ---
// --- COMPONENTE GESTIÓN ASISTENCIA MASIVA (MODO MATRIZ PRO) ---
const BulkAsistenciaModal = ({ isOpen, onClose, rutas, onUpdate }) => {
    const { can } = usePermission();
    const [selectedPeriodName, setSelectedPeriodName] = useState('');
    const [loading, setLoading] = useState(false);
    const [feriados, setFeriados] = useState([]);
    const [togglingId, setTogglingId] = useState(null);

    const availablePeriodNames = useMemo(() => {
        const names = new Set();
        rutas.forEach(r => {
            r.periodos?.forEach(p => {
                if (p.nombre_estandarizado) names.add(p.nombre_estandarizado);
            });
        });
        return Array.from(names).sort((a, b) => {
            const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
            const [mA, yA] = (a || "").split(' ');
            const [mB, yB] = (b || "").split(' ');
            if (yA !== yB) return (yB || 0) - (yA || 0);
            return months.indexOf(mB) - months.indexOf(mA);
        });
    }, [rutas]);

    useEffect(() => {
        const fetchFeriados = async () => {
            try {
                const res = await api.get('contratos/feriados/');
                const lista = Array.isArray(res.data) ? res.data : (res.data.results || []);
                setFeriados(lista.map(f => f.fecha));
            } catch (error) {}
        };
        fetchFeriados();
    }, []);

    const applicableRutas = useMemo(() => {
        if (!selectedPeriodName) return [];
        return rutas.filter(r => r.periodos?.some(p => p.nombre_estandarizado === selectedPeriodName));
    }, [selectedPeriodName, rutas]);

    const diasGrid = useMemo(() => {
        if (!selectedPeriodName || applicableRutas.length === 0) return [];
        const firstRuta = applicableRutas[0];
        const p = firstRuta?.periodos.find(per => per.nombre_estandarizado === selectedPeriodName);
        if (!p) return [];
        return eachDayOfInterval({ start: parseISO(p.fecha_inicio), end: parseISO(p.fecha_fin) });
    }, [selectedPeriodName, applicableRutas]);

    const handleToggleCell = async (periodoId, fechaStr) => {
        if (!periodoId) return;
        setTogglingId(`${periodoId}-${fechaStr}`);
        try {
            await api.post(`contratos/periodos/${periodoId}/toggle-dia/`, { fecha: fechaStr });
            await onUpdate();
        } catch (error) {
            alert("No se pudo actualizar el día.");
        } finally {
            setTogglingId(null);
        }
    };

    const handleToggleColumn = async (fechaDate) => {
        const fStr = format(fechaDate, 'yyyy-MM-dd');
        const isSem = isWeekend(fechaDate);
        const isFer = feriados.includes(fStr);
        
        // Determinar qué periodos son válidos para este día según sus reglas
        const validPeriodoIds = [];
        applicableRutas.forEach(r => {
            const p = r.periodos.find(per => per.nombre_estandarizado === selectedPeriodName);
            if (p) {
                const incFinSem = p.regla?.incluir_fines_semana ?? r.incluir_fines_semana ?? false;
                const excFer = p.regla?.excluir_feriados ?? r.excluir_feriados ?? false;
                const isInvalid = (isSem && !incFinSem) || (isFer && excFer);
                if (!isInvalid) validPeriodoIds.push(p.id);
            }
        });

        if (validPeriodoIds.length === 0) return;

        setTogglingId(`col-${fStr}`);
        try {
            // Decidir el nuevo estado basándonos en el primer periodo válido
            const firstRuta = applicableRutas.find(r => r.periodos.some(per => per.nombre_estandarizado === selectedPeriodName));
            const firstP = firstRuta?.periodos.find(per => per.nombre_estandarizado === selectedPeriodName);
            const isCurrentlyAbsent = firstP?.ausencias?.includes(fStr);
            const newState = isCurrentlyAbsent ? 'presente' : 'ausente';

            await api.post(`contratos/periodos/bulk-toggle-dia/`, {
                periodo_ids: validPeriodoIds,
                fecha: fStr,
                force_state: newState
            });
            await onUpdate();
        } catch (error) {
            alert("Error al actualizar la columna.");
        } finally {
            setTogglingId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md cursor-pointer" />
            
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 30 }} className="relative bg-white rounded-[24px] shadow-2xl w-[98vw] max-w-[1800px] max-h-[92vh] overflow-hidden flex flex-col z-10">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
                            <LayoutGrid className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Planilla de Asistencia</h2>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Haz clic en un día para marcar toda la columna</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                             <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Periodo:</label>
                             <select
                                value={selectedPeriodName}
                                onChange={(e) => setSelectedPeriodName(e.target.value)}
                                className="h-8 px-3 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer shadow-sm"
                            >
                                <option value="">-- ELIGE UN PERIODO --</option>
                                {availablePeriodNames.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-white rounded-lg text-slate-400 transition-colors border border-transparent hover:border-slate-100"><X className="w-4 h-4" /></button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col bg-slate-100/30">
                    {!selectedPeriodName ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-200 py-20">
                             <Calendar className="w-16 h-16 mb-4 opacity-10" />
                             <h3 className="text-lg font-black uppercase tracking-tighter text-slate-300">Selecciona un Periodo</h3>
                             <p className="text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Para cargar la planilla</p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-auto custom-scrollbar bg-slate-50/30">
                            <table className="min-w-full border-separate border-spacing-0">
                                <thead className="sticky top-0 z-30 bg-white">
                                    <tr>
                                        <th className="sticky left-0 z-40 bg-white px-3 py-2 border-b border-r border-slate-100 text-left min-w-[180px]">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Rutas</span>
                                        </th>
                                        {diasGrid.map(fecha => {
                                            const fStr = format(fecha, 'yyyy-MM-dd');
                                            const isSem = isWeekend(fecha);
                                            const isFer = feriados.includes(fStr);
                                            const isTogglingCol = togglingId === `col-${fStr}`;
                                            
                                            return (
                                                <th 
                                                    key={fecha.toString()} 
                                                    className={`p-1 border-b border-r border-slate-100 min-w-[28px] bg-white cursor-pointer hover:bg-indigo-50 transition-colors group/th ${isSem ? 'bg-slate-50/80' : ''}`}
                                                    onClick={() => can('contratos.change_ausenciaruta') && handleToggleColumn(fecha)}
                                                >
                                                    <div className="flex flex-col items-center relative">
                                                        {isTogglingCol && <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center"><Loader2 className="w-3 h-3 animate-spin text-indigo-500" /></div>}
                                                        <span className={`text-[6px] font-black uppercase tracking-tighter ${isSem ? 'text-slate-300' : 'text-indigo-400 group-hover/th:text-indigo-600'}`}>
                                                            {format(fecha, 'EEE', { locale: es }).substring(0, 2)}
                                                        </span>
                                                        <span className={`text-[9px] font-black ${isFer ? 'text-amber-500' : 'text-slate-800 group-hover/th:text-indigo-600'}`}>
                                                            {format(fecha, 'd')}
                                                        </span>
                                                    </div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {applicableRutas.map(ruta => {
                                        const p = ruta.periodos.find(per => per.nombre_estandarizado === selectedPeriodName);
                                        return (
                                            <tr key={ruta.id} className="group hover:bg-slate-50 transition-colors">
                                                <td className="sticky left-0 z-20 bg-white group-hover:bg-slate-50 px-3 py-1.5 border-b border-r border-slate-100 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                                                    <p className="text-[11px] font-black text-slate-700 uppercase leading-none truncate max-w-[160px]">{ruta.nombre}</p>
                                                    <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest truncate mt-1">{ruta.proveedor_nombre}</p>
                                                    {ruta.itinerario && (
                                                        <p className="text-[9px] font-black text-amber-600 mt-1 truncate max-w-[160px]" title={ruta.itinerario}>
                                                            {ruta.itinerario}
                                                        </p>
                                                    )}
                                                </td>
                                                {diasGrid.map(fecha => {
                                                    const fStr = format(fecha, 'yyyy-MM-dd');
                                                    const isSem = isWeekend(fecha);
                                                    const isFer = feriados.includes(fStr);
                                                    const isAus = (p?.ausencias || []).includes(fStr);
                                                    
                                                    const incFinSem = p?.regla?.incluir_fines_semana ?? ruta.incluir_fines_semana ?? false;
                                                    const excFer = p?.regla?.excluir_feriados ?? ruta.excluir_feriados ?? false;
                                                    
                                                    const isInvalidSem = isSem && !incFinSem;
                                                    const isInvalidFer = isFer && excFer;
                                                    const isInvalid = isInvalidSem || isInvalidFer;
                                                    const isToggling = togglingId === `${p?.id}-${fStr}`;
 
                                                    return (
                                                        <td key={fStr} className={`p-0 border-b border-r border-slate-100 text-center ${isSem ? 'bg-slate-50/20' : ''}`}>
                                                            {isInvalid ? (
                                                                <div className={`w-full h-8 flex items-center justify-center cursor-not-allowed ${isInvalidFer ? 'bg-amber-200/60' : 'bg-slate-200'}`}>
                                                                    {isInvalidFer ? (
                                                                        <Flag className="w-2.5 h-2.5 text-amber-500" />
                                                                    ) : (
                                                                        <Coffee className="w-2.5 h-2.5 text-slate-400" />
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleToggleCell(p?.id, fStr)}
                                                                    disabled={isToggling || !p || !can('contratos.change_ausenciaruta')}
                                                                    className={`w-full h-8 transition-all duration-200 flex items-center justify-center relative border
                                                                        ${isAus ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100'}
                                                                    `}
                                                                    title={isAus ? 'Marcar como TRABAJADO' : 'Marcar como AUSENTE'}
                                                                >
                                                                    {isToggling ? (
                                                                        <Loader2 className="w-2.5 h-2.5 animate-spin opacity-40 text-slate-400" />
                                                                    ) : isAus ? (
                                                                        <X className="w-3 h-3 font-bold" />
                                                                    ) : (
                                                                        <Check className="w-3 h-3 font-bold opacity-60" />
                                                                    )}
                                                                </button>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                
                <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between">
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-emerald-50 border border-emerald-100" />
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Realizado</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-red-50 border border-red-100" />
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Inasistencia</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-slate-200" />
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Bloqueo Fin de Semana</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-amber-200/60 border border-amber-300" />
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Bloqueo Feriado</span>
                        </div>
                    </div>
                    <div className="text-[8px] font-black text-indigo-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Info className="w-3 h-3" />
                        Haz clic en una celda para alternar
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// --- Sub-component: BulkRouteSettingsModal ---
const BulkRouteSettingsModal = ({ isOpen, onClose, rutas, onUpdate }) => {
    const { can } = usePermission();
    const [selectedIds, setSelectedIds] = useState(rutas.map(r => r.id));
    const [updating, setUpdating] = useState(false);
    const [fields, setFields] = useState({
        incluir_fines_semana: null, // null means no change
        excluir_feriados: null,
        dia_inicio_periodo: '',
        dia_fin_periodo: '',
        valor_diario: ''
    });

    const handleApply = async () => {
        if (!can('contratos.change_rutatransporte')) return;
        if (selectedIds.length === 0) return alert("Seleccione al menos una ruta.");
        
        const dataToUpdate = {};
        // INVERTED LOGIC for weekends: if user wants to EXCLUDE (true), include_weekends becomes false.
        if (fields.incluir_fines_semana !== null) dataToUpdate.incluir_fines_semana = !fields.incluir_fines_semana;
        if (fields.excluir_feriados !== null) dataToUpdate.excluir_feriados = fields.excluir_feriados;
        if (fields.dia_inicio_periodo !== '') dataToUpdate.dia_inicio_periodo = parseInt(fields.dia_inicio_periodo);
        if (fields.dia_fin_periodo !== '') dataToUpdate.dia_fin_periodo = parseInt(fields.dia_fin_periodo);
        if (fields.valor_diario !== '') dataToUpdate.valor_diario = parseFloat(fields.valor_diario);

        if (Object.keys(dataToUpdate).length === 0) return alert("No ha seleccionado ningún cambio para aplicar.");

        if (!window.confirm(`¿Está seguro de aplicar estos cambios a ${selectedIds.length} rutas?`)) return;

        setUpdating(true);
        try {
            await api.post('contratos/rutas/bulk-update/', {
                ruta_ids: selectedIds,
                fields: dataToUpdate
            });
            onUpdate();
            onClose();
        } catch (error) {
            console.error(error);
            alert("Error al actualizar rutas.");
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }} 
                className="relative bg-white w-full max-w-2xl h-[80vh] rounded-[32px] shadow-2xl overflow-hidden p-8 flex flex-col"
            >
                <div className="flex justify-between items-center mb-8 shrink-0">
                    <div>
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Configuración Masiva de Rutas</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Afecta a múltiples rutas operativas de forma simultánea</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 min-h-0">
                    {/* Left: Route Selection */}
                    <div className="flex flex-col space-y-4 min-h-0">
                        <div className="flex items-center justify-between px-1 shrink-0">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Rutas a modificar ({selectedIds.length})</label>
                            <div className="flex gap-2">
                                <button onClick={() => setSelectedIds(rutas.map(r => r.id))} className="text-[9px] font-black text-indigo-600 uppercase hover:underline transition-all">Todas</button>
                                <button onClick={() => setSelectedIds([])} className="text-[9px] font-black text-slate-400 uppercase hover:underline transition-all">Ninguna</button>
                            </div>
                        </div>
                        <div className="flex-1 bg-slate-50 p-4 rounded-[24px] border border-slate-100 space-y-2 overflow-y-auto custom-scrollbar shadow-inner">
                            {rutas.map(r => (
                                <label key={r.id} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-100 cursor-pointer transition-all hover:bg-indigo-50/50 hover:border-indigo-200 shadow-sm group">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded text-indigo-600 border-slate-300 transition-all group-hover:scale-110" 
                                        checked={selectedIds.includes(r.id)} 
                                        onChange={e => {
                                            const newIds = e.target.checked ? [...selectedIds, r.id] : selectedIds.filter(id => id !== r.id);
                                            setSelectedIds(newIds);
                                        }} 
                                    />
                                    <span className="text-[10px] font-black text-slate-600 uppercase truncate tracking-tight">{r.nombre}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Right: Field Selection */}
                    <div className="space-y-6 overflow-y-auto pr-1 custom-scrollbar">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">2. Cambios a aplicar</label>
                        
                        <div className="space-y-4">
                            {/* Excluir Fines de Semana */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-[22px] border border-slate-100 shadow-sm">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">Excluir Fines de Semana</span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase">Sábados y Domingos</span>
                                </div>
                                <div className="flex gap-1 bg-white p-1.5 rounded-xl border border-slate-200 shadow-inner">
                                    <button 
                                        onClick={() => setFields({...fields, incluir_fines_semana: true})}
                                        className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${fields.incluir_fines_semana === true ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                                    >SÍ</button>
                                    <button 
                                        onClick={() => setFields({...fields, incluir_fines_semana: false})}
                                        className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${fields.incluir_fines_semana === false ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                                    >NO</button>
                                    <button 
                                        onClick={() => setFields({...fields, incluir_fines_semana: null})}
                                        className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${fields.incluir_fines_semana === null ? 'bg-slate-100 text-slate-600' : 'text-slate-400 hover:text-slate-600'}`}
                                    >-</button>
                                </div>
                            </div>

                            {/* Excluir Feriados */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-[22px] border border-slate-100 shadow-sm">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">Excluir Feriados</span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase">Días Nacionales</span>
                                </div>
                                <div className="flex gap-1 bg-white p-1.5 rounded-xl border border-slate-200 shadow-inner">
                                    <button 
                                        onClick={() => setFields({...fields, excluir_feriados: true})}
                                        className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${fields.excluir_feriados === true ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                                    >SÍ</button>
                                    <button 
                                        onClick={() => setFields({...fields, excluir_feriados: false})}
                                        className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${fields.excluir_feriados === false ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                                    >NO</button>
                                    <button 
                                        onClick={() => setFields({...fields, excluir_feriados: null})}
                                        className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${fields.excluir_feriados === null ? 'bg-slate-100 text-slate-600' : 'text-slate-400 hover:text-slate-600'}`}
                                    >-</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Día Inicio</label>
                                    <input type="number" placeholder="No cambiar" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold" value={fields.dia_inicio_periodo} onChange={e => setFields({...fields, dia_inicio_periodo: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Día Fin</label>
                                    <input type="number" placeholder="No cambiar" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold" value={fields.dia_fin_periodo} onChange={e => setFields({...fields, dia_fin_periodo: e.target.value})} />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor Diario ($)</label>
                                <input type="number" placeholder="No cambiar el valor..." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold" value={fields.valor_diario} onChange={e => setFields({...fields, valor_diario: e.target.value})} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-[24px] font-black text-[10px] uppercase tracking-widest shadow-sm">Cancelar</button>
                    <button 
                        onClick={handleApply}
                        disabled={updating || !can('contratos.change_rutatransporte')}
                        className="flex-[2] py-4 bg-indigo-600 text-white rounded-[24px] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center justify-center gap-2"
                    >
                        {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Aplicar a {selectedIds.length} Rutas
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default ServicioDetailPage;
