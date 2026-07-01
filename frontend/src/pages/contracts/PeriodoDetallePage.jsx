import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Info, CheckCircle2, AlertCircle, Save, Loader2, RefreshCw } from 'lucide-react';
import { format, eachDayOfInterval, parseISO, isSameDay, getDay, isWeekend } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../../api';

// --- Sub-component: DiaCelda ---
const DiaCelda = ({ fecha, isTrabajado, isFeriado, isFinDeSemana, onClick, disabled }) => {
    let bgColor = "bg-white border-slate-200";
    let textColor = "text-slate-700";

    if (!isTrabajado) {
        bgColor = "bg-red-50 border-red-200";
        textColor = "text-red-700 font-medium";
    } else if (isFeriado) {
        bgColor = "bg-slate-100 border-slate-200 opacity-60";
        textColor = "text-slate-500 line-through";
    } else if (isFinDeSemana) {
        bgColor = "bg-slate-50 border-slate-200";
        textColor = "text-slate-500";
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
                flex flex-col items-center justify-center p-3 border rounded-xl 
                transition-all duration-200 hover:shadow-sm
                ${bgColor} ${textColor}
                ${disabled ? 'cursor-not-allowed opacity-75' : 'hover:-translate-y-0.5 cursor-pointer'}
            `}
        >
            <span className="text-xs font-semibold uppercase tracking-wider mb-1">
                {format(fecha, 'EEE', { locale: es })}
            </span>
            <span className="text-xl">
                {format(fecha, 'd')}
            </span>
        </button>
    );
};

// --- Sub-component: ResumenPeriodo ---
const ResumenPeriodo = ({ totalData, loadingTotal }) => {
    if (!totalData) return null;

    const { total, dias_base, ausencias, dias_cobrar, estado } = totalData;

    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-full">
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Info className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Resumen del Periodo</h3>
                </div>

                <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Días Base (Hábiles):</span>
                        <span className="font-semibold text-slate-700">{dias_base}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Días No Realizados (Ausencias):</span>
                        <span className="font-semibold text-red-600">-{ausencias}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-t border-slate-100 pt-3">
                        <span className="text-slate-600 font-medium">Días a Cobrar:</span>
                        <span className="font-bold text-slate-800">{dias_cobrar}</span>
                    </div>
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Total Calculado</p>
                    <p className="text-2xl font-black text-slate-800">
                        {loadingTotal ? (
                            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                        ) : (
                            new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(total)
                        )}
                    </p>
                </div>
                <div className="text-right">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${estado === 'CERRADO' ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}>
                        {estado}
                    </span>
                </div>
            </div>
        </div>
    );
};


// --- Main Component ---
const PeriodoDetallePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [loadingTotal, setLoadingTotal] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    const [calendario, setCalendario] = useState(null);
    const [totalData, setTotalData] = useState(null);
    const [diasGrid, setDiasGrid] = useState([]);

    const fetchCalendario = useCallback(async () => {
        try {
            const res = await api.get(`contratos/periodos/${id}/calendario/`);
            setCalendario(res.data);
            return res.data;
        } catch (error) {
            console.error("Error fetching calendario:", error);
            return null;
        }
    }, [id]);

    const fetchTotal = useCallback(async () => {
        setLoadingTotal(true);
        try {
            const res = await api.get(`contratos/periodos/${id}/total/`);
            setTotalData(res.data);
        } catch (error) {
            console.error("Error fetching total:", error);
        } finally {
            setLoadingTotal(false);
        }
    }, [id]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            const cal = await fetchCalendario();
            if (cal) {
                // Generar grid de días
                const start = parseISO(cal.fecha_inicio);
                const end = parseISO(cal.fecha_fin);
                const days = eachDayOfInterval({ start, end });
                setDiasGrid(days);
            }
            await fetchTotal();
            setLoading(false);
        };
        init();
    }, [fetchCalendario, fetchTotal]);

    const isClosed = calendario?.estado === 'CERRADO';

    const handleToggleDia = async (fechaDate) => {
        if (isClosed) return;

        const fechaStr = format(fechaDate, 'yyyy-MM-dd');
        
        // Optimistic Update
        const isCurrentlyAusente = calendario.ausencias.includes(fechaStr);
        const newAusencias = isCurrentlyAusente 
            ? calendario.ausencias.filter(d => d !== fechaStr)
            : [...calendario.ausencias, fechaStr];

        setCalendario(prev => ({ ...prev, ausencias: newAusencias }));

        try {
            await api.post(`contratos/periodos/${id}/toggle-dia/`, { fecha: fechaStr });
            // Fetch real total after success
            await fetchTotal();
        } catch (error) {
            console.error("Error toggling dia:", error);
            alert("No se pudo actualizar el día. Revise la conexión.");
            // Revert optimistic update
            setCalendario(prev => ({ ...prev, ausencias: isCurrentlyAusente ? newAusencias.filter(d => d !== fechaStr) : prev.ausencias.filter(d => d !== fechaStr) }));
            // Re-fetch to be safe
            fetchCalendario();
        }
    };

    const handleCerrarPeriodo = async () => {
        if (!window.confirm("¿Estás seguro de cerrar este periodo? Esta acción congelará el cálculo y no se podrán modificar los días.")) {
            return;
        }
        setIsClosing(true);
        try {
            await api.post(`contratos/periodos/${id}/cerrar/`);
            await fetchCalendario();
            await fetchTotal();
        } catch (error) {
            console.error("Error cerrando periodo:", error);
            alert("Ocurrió un error al intentar cerrar el periodo.");
        } finally {
            setIsClosing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-80px)] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!calendario) {
        return (
            <div className="p-6">
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    <p>No se pudo cargar la información del periodo.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full mx-auto max-w-6xl p-6 lg:p-8 space-y-6">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate(-1)}
                        className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <Calendar className="w-6 h-6 text-indigo-500" />
                            Detalle del Periodo
                        </h1>
                        <p className="text-sm text-slate-500 mt-1 font-medium">
                            {format(parseISO(calendario.fecha_inicio), "d 'de' MMMM, yyyy", { locale: es })} 
                            {' '} al {' '}
                            {format(parseISO(calendario.fecha_fin), "d 'de' MMMM, yyyy", { locale: es })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => { fetchCalendario(); fetchTotal(); }}
                        disabled={isClosing}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm disabled:opacity-50"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refrescar
                    </button>

                    {!isClosed && (
                        <button
                            onClick={handleCerrarPeriodo}
                            disabled={isClosing}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-sm font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isClosing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Cerrar Periodo
                        </button>
                    )}
                </div>
            </div>

            {/* Layout Main */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Col: Calendar Grid */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                Control de Asistencia
                            </h2>
                            <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300"></div>
                                    Trabajado
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-100 border border-red-300"></div>
                                    Ausencia
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-slate-100 border border-slate-300"></div>
                                    Feriado/Fin Sem.
                                </div>
                            </div>
                        </div>

                        {/* Custom Grid */}
                        <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                            {diasGrid.map((dia) => {
                                const fechaStr = format(dia, 'yyyy-MM-dd');
                                const isFinSemana = isWeekend(dia);
                                const isAusente = calendario.ausencias.includes(fechaStr);
                                
                                // Simulación simple de feriados para frontend (el cálculo real de pago ya está en backend)
                                // En una implementación avanzada el backend pasaría la lista de feriados al /calendario/
                                // Por ahora, si excluir_feriados = true, confiamos en el backend para los montos.
                                const isFeriado = false; 

                                // Reglas visuales de deshabilitación:
                                let disabledForInteraction = false;
                                if (isClosed) disabledForInteraction = true;
                                if (!calendario.regla.incluir_fines_semana && isFinSemana) disabledForInteraction = true;
                                if (calendario.regla.excluir_feriados && isFeriado) disabledForInteraction = true;

                                // Si está deshabilitado por regla y no es ausencia, mostramos como "No trabajado/Gris"
                                const isTrabajado = !isAusente;
                                const isFinDeSemanaOrFeriado = disabledForInteraction && !isClosed && isTrabajado;

                                return (
                                    <DiaCelda 
                                        key={fechaStr}
                                        fecha={dia}
                                        isTrabajado={isTrabajado}
                                        isFeriado={false}
                                        isFinDeSemana={isFinDeSemanaOrFeriado}
                                        disabled={disabledForInteraction}
                                        onClick={handleToggleDia}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Col: Summary Widget */}
                <div className="lg:col-span-1">
                    <ResumenPeriodo totalData={totalData} loadingTotal={loadingTotal} />
                </div>
            </div>

        </div>
    );
};

export default PeriodoDetallePage;
