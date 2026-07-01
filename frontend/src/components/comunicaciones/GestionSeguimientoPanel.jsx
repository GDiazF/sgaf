import React, { useState, useEffect } from 'react';
import { CheckCircle2, Plus, Clock, FileText, ListChecks } from 'lucide-react';

const TABS = [
    { id: 'descripcion', label: 'Descripción', icon: FileText },
    { id: 'pasos', label: 'Pasos', icon: ListChecks },
    { id: 'historial', label: 'Historial', icon: Clock },
];

const estadoBadgeClass = (estado) => {
    if (estado === 'PENDIENTE') return 'bg-rose-50 text-rose-600 border-rose-100';
    if (estado === 'EN_PROCESO') return 'bg-amber-50 text-amber-600 border-amber-100';
    if (estado === 'RESPONDIDO') return 'bg-blue-50 text-blue-600 border-blue-100';
    return 'bg-emerald-50 text-emerald-600 border-emerald-100';
};

const GestionSeguimientoPanel = ({
    gestion,
    newPaso,
    onNewPasoChange,
    onAddPaso,
    onToggleSubtarea,
    canEditPasos = true,
    lockedReason = '',
}) => {
    const [activeTab, setActiveTab] = useState('descripcion');

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActiveTab('descripcion');
    }, [gestion.id]);

    const pasosCount = gestion.subtareas?.length || 0;
    const historialCount = gestion.historial?.length || 0;

    return (
        <div className="bg-slate-50 p-3 md:p-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
                            Seguimiento de Atención
                        </p>
                        <p className="text-[11px] font-medium text-slate-600 uppercase tracking-tighter line-clamp-1 mt-0.5">
                            {gestion.requerimiento}
                        </p>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-tighter shrink-0 ${estadoBadgeClass(gestion.estado)}`}>
                        {gestion.estado?.replace('_', ' ')}
                    </span>
                </div>

                <div className="flex items-center gap-4 border-b border-slate-200 px-4 overflow-x-auto custom-scrollbar">
                    {TABS.map((tab) => {
                        const TabIcon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`pb-3 pt-3 text-[10px] uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 select-none ${
                                    activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600 font-black'
                                        : 'border-transparent text-slate-400 hover:text-slate-600 font-bold'
                                }`}
                            >
                                <TabIcon className="w-3.5 h-3.5" />
                                {tab.label}
                                {tab.id === 'pasos' && pasosCount > 0 && (
                                    <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md border border-blue-100">
                                        {pasosCount}
                                    </span>
                                )}
                                {tab.id === 'historial' && historialCount > 0 && (
                                    <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md border border-slate-200">
                                        {historialCount}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="p-4">
                    {activeTab === 'descripcion' && (
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 select-none">
                                    Descripción
                                </p>
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 min-h-[72px]">
                                    <p className="text-[11px] font-medium text-slate-600 uppercase tracking-tighter leading-relaxed whitespace-pre-wrap">
                                        {gestion.descripcion || 'Sin descripción registrada.'}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 select-none">
                                    Respuesta
                                </p>
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 min-h-[56px]">
                                    <p className="text-[11px] font-medium text-slate-600 uppercase tracking-tighter leading-relaxed whitespace-pre-wrap">
                                        {gestion.respuesta || 'Sin respuesta registrada.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'pasos' && (
                        <div className="space-y-3">
                            <div className="max-h-52 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                                {gestion.subtareas?.length > 0 ? (
                                    gestion.subtareas.map((sub) => (
                                        <button
                                            key={sub.id}
                                            type="button"
                                            onClick={() => onToggleSubtarea(sub, gestion)}
                                            disabled={!canEditPasos}
                                            className="w-full flex items-start gap-2.5 text-left p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 transition-all disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white disabled:hover:border-slate-100"
                                        >
                                            <CheckCircle2
                                                className={`w-4 h-4 mt-0.5 shrink-0 ${sub.completada ? 'text-emerald-500' : 'text-slate-300'}`}
                                            />
                                            <span
                                                className={`text-[11px] font-medium uppercase tracking-tighter leading-snug ${
                                                    sub.completada ? 'line-through text-slate-400' : 'text-slate-600'
                                                }`}
                                            >
                                                {sub.titulo}
                                            </span>
                                        </button>
                                    ))
                                ) : (
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center py-8 select-none">
                                        No hay pasos registrados
                                    </p>
                                )}
                            </div>

                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (!canEditPasos) return;
                                    onAddPaso();
                                }}
                                className="flex gap-2 pt-2 border-t border-slate-100"
                            >
                                <input
                                    type="text"
                                    placeholder={canEditPasos ? 'Nuevo paso...' : 'Pasos bloqueados...'}
                                    value={newPaso}
                                    onChange={(e) => onNewPasoChange(e.target.value.toUpperCase())}
                                    disabled={!canEditPasos}
                                    className="no-global flex-1 h-10 text-[10px] font-bold bg-white border border-slate-200 px-3 rounded-xl outline-none focus:border-blue-500 uppercase shadow-sm placeholder:text-slate-300 disabled:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                                />
                                <button
                                    type="submit"
                                    disabled={!canEditPasos}
                                    className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2 shrink-0 active:scale-95 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
                                >
                                    <Plus className="w-4 h-4" />
                                    Añadir
                                </button>
                            </form>
                            {!canEditPasos && lockedReason && (
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                    {lockedReason}
                                </p>
                            )}
                        </div>
                    )}

                    {activeTab === 'historial' && (
                        <div className="max-h-64 overflow-y-auto custom-scrollbar pr-1">
                            {gestion.historial?.length > 0 ? (
                                <div className="relative pl-4 border-l-2 border-blue-100 space-y-3">
                                    {gestion.historial.map((h) => (
                                        <div key={h.id} className="relative">
                                            <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-400 border-2 border-white" />
                                            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                                                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                                                    <span className="text-[11px] font-medium text-slate-700 uppercase tracking-tighter">
                                                        {h.accion}
                                                    </span>
                                                    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-widest shrink-0">
                                                        {new Date(h.fecha).toLocaleString('es-CL')}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] font-medium text-blue-600 uppercase tracking-tighter">
                                                    {h.usuario_nombre}
                                                </p>
                                                {h.detalles && (
                                                    <p className="text-[10px] font-medium text-slate-500 mt-1 leading-relaxed">
                                                        {h.detalles}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center py-8 select-none">
                                    Sin movimientos en el historial
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GestionSeguimientoPanel;
