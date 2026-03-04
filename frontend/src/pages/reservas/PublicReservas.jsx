import React, { useState, useEffect, useRef } from 'react';
import {
    Calendar, ChevronLeft, ChevronRight, Plus, X, Check,
    Clock, Truck, Monitor, Package, User, AlertCircle, Lock,
    RefreshCw, Building2, MapPin
} from 'lucide-react';
import api from '../../api';

// ─── Constantes ───────────────────────────────────────────────────────────────
const HOUR_START = 7;
const HOUR_END = 20;
const SLOT_MIN = 30;
const SLOT_HEIGHT = 44;

const TIME_SLOTS = [];
for (let h = HOUR_START; h < HOUR_END; h++) {
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

const RECURSO_ICONS = { SALA: Building2, VEHICULO: Truck, PROYECTOR: Monitor, OTRO: Package };
const TYPE_ORDER = { SALA: 0, VEHICULO: 1, PROYECTOR: 2, OTRO: 3 };
const TYPE_LABELS = { SALA: 'Salas', VEHICULO: 'Vehículos', PROYECTOR: 'Proyectores', OTRO: 'Otros' };
const sortByType = (a, b) => {
    const ta = TYPE_ORDER[a.tipo] ?? 9;
    const tb = TYPE_ORDER[b.tipo] ?? 9;
    if (ta !== tb) return ta - tb;
    return a.nombre.localeCompare(b.nombre, 'es');
};

const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
};

const toDateStr = d => {
    if (!(d instanceof Date)) d = new Date(d);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const dtMinutes = dt => {
    const d = new Date(dt);
    return d.getHours() * 60 + d.getMinutes();
};

const layoutEvents = (events) => {
    if (!events.length) return [];
    const sorted = [...events].sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio));
    const result = sorted.map(ev => ({ ev, colIndex: 0, colCount: 1 }));
    let groups = [];
    let current = [result[0]];
    for (let i = 1; i < result.length; i++) {
        const item = result[i];
        const startMin = dtMinutes(item.ev.fecha_inicio);
        const overlaps = current.some(c => dtMinutes(c.ev.fecha_fin) > startMin);
        if (overlaps) current.push(item);
        else { groups.push(current); current = [item]; }
    }
    groups.push(current);
    for (const group of groups) {
        const n = group.length;
        group.forEach((item, idx) => { item.colIndex = idx; item.colCount = n; });
    }
    return result;
};

import axios from 'axios';
const publicApi = axios.create({ baseURL: 'http://10.0.100.25:8000/api/' });

const PublicReservas = () => {
    const [recursos, setRecursos] = useState([]);
    const [reservas, setReservas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('day');
    const [filtroRecurso, setFiltroRecurso] = useState('all');

    // Modal reserva
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        recurso: '', titulo: '', nombre_funcionario: '', email_contacto: '',
        descripcion: '', fecha: toDateStr(new Date()), horaInicio: '09:00', horaFin: '10:00'
    });
    const [honeypot, setHoneypot] = useState(''); // Campo oculto para detectar bots
    const [formTipo, setFormTipo] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [slotBloqueadoMsg, setSlotBloqueadoMsg] = useState('');
    const scrollRef = useRef(null);

    const todayStr = toDateStr(new Date());
    const fmtDay = d => new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: 'numeric' }).format(d);
    const fmtMonth = () => {
        const parts = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).formatToParts(currentDate);
        const month = parts.find(p => p.type === 'month')?.value;
        const year = parts.find(p => p.type === 'year')?.value;
        return `${month} ${year}`;
    };

    const fetchData = async () => {
        setLoading(true);
        console.log("Fetching public data...");
        try {
            const [rRes, sRes] = await Promise.all([
                publicApi.get('reservas/recursos/'),
                publicApi.get('reservas/solicitudes/')
            ]);
            console.log("Resources:", rRes.data);
            setRecursos(rRes.data);
            setReservas(sRes.data);
        } catch (e) {
            console.error('Error fetching public data:', e);
            setFormError('Error al conectar con el servidor. Por favor intenta más tarde.');
        }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    // Auto-ajuste de horas (igual que el Dashboard principal)
    useEffect(() => {
        if (!modalOpen || !formData.recurso || !formData.fecha) return;
        const resDía = reservas.filter(r => parseInt(r.recurso) === parseInt(formData.recurso) && r.estado === 'APROBADA' && toDateStr(r.fecha_inicio) === formData.fecha);
        const getMins = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
        const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
        const esHoy = formData.fecha === todayStr;

        const mInicio = getMins(formData.horaInicio);
        const estaOcupadoI = resDía.some(r => mInicio >= dtMinutes(r.fecha_inicio) && mInicio < dtMinutes(r.fecha_fin));
        const esPasado = esHoy && mInicio < nowMins - 15;

        if (estaOcupadoI || esPasado) {
            const primerLibre = TIME_SLOTS.find(s => {
                const m = getMins(s);
                if (esHoy && m < nowMins - 15) return false;
                return !resDía.some(r => m >= dtMinutes(r.fecha_inicio) && m < dtMinutes(r.fecha_fin));
            });
            if (primerLibre) setFormData(p => ({ ...p, horaInicio: primerLibre }));
        }
        const mFin = getMins(formData.horaFin);
        const mActInicio = getMins(formData.horaInicio);
        const saltando = resDía.some(r => dtMinutes(r.fecha_inicio) >= mActInicio && dtMinutes(r.fecha_inicio) < mFin);
        if (mFin <= mActInicio || saltando) {
            const sigSlot = TIME_SLOTS.find(s => getMins(s) > mActInicio);
            if (sigSlot) setFormData(p => ({ ...p, horaFin: sigSlot }));
        }
    }, [formData.recurso, formData.fecha, formData.horaInicio, modalOpen, reservas, todayStr]);

    const visibleDays = viewMode === 'week'
        ? Array.from({ length: 7 }, (_, i) => {
            const mon = new Date(currentDate);
            mon.setDate(currentDate.getDate() - ((currentDate.getDay() + 6) % 7));
            return addDays(mon, i);
        })
        : [currentDate];

    const recursosFiltrados = (() => {
        let list;
        if (filtroRecurso === 'all') list = recursos;
        else if (filtroRecurso.startsWith('tipo_')) {
            const tipo = filtroRecurso.replace('tipo_', '');
            list = recursos.filter(r => r.tipo === tipo);
        } else list = recursos.filter(r => r.id === parseInt(filtroRecurso));
        return list.slice().sort(sortByType);
    })();

    const getReservasForDayAndRecurso = (day, recursoId) => {
        const dayStr = toDateStr(day);
        return reservas.filter(r =>
            toDateStr(r.fecha_inicio) === dayStr &&
            parseInt(r.recurso) === parseInt(recursoId) &&
            r.estado !== 'FINALIZADA' && r.estado !== 'RECHAZADA' && r.estado !== 'CANCELADA'
        );
    };

    const getEventPos = (ev) => {
        const startMin = dtMinutes(ev.fecha_inicio);
        const endMin = dtMinutes(ev.fecha_fin);
        const top = ((startMin - HOUR_START * 60) / SLOT_MIN) * SLOT_HEIGHT;
        const height = Math.max(((endMin - startMin) / SLOT_MIN) * SLOT_HEIGHT, 24);
        return { top, height };
    };

    const handleNav = dir => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + dir * (viewMode === 'week' ? 7 : 1));
        setCurrentDate(d);
    };

    const handleSlotClick = (day, slotTime, recursoId) => {
        const [h, m] = slotTime.split(':').map(Number);
        const slotStartMin = h * 60 + m;
        const slotEndMin = slotStartMin + SLOT_MIN;

        const dayStr = toDateStr(day);
        const bloqueado = recursoId && reservas.some(r =>
            parseInt(r.recurso) === parseInt(recursoId) &&
            r.estado === 'APROBADA' &&
            toDateStr(r.fecha_inicio) === dayStr &&
            dtMinutes(r.fecha_inicio) < slotEndMin &&
            dtMinutes(r.fecha_fin) > slotStartMin
        );

        if (bloqueado) {
            setSlotBloqueadoMsg(`🔒 Este horario ya está reservado.`);
            setTimeout(() => setSlotBloqueadoMsg(''), 3000);
            return;
        }

        const rec = recursos.find(r => r.id === recursoId);
        setFormTipo(rec?.tipo || '');
        setFormData({ ...formData, recurso: recursoId || '', fecha: toDateStr(day), horaInicio: slotTime, horaFin: (m === 30 ? `${String(h + 1).padStart(2, '0')}:00` : `${String(h).padStart(2, '0')}:30`) });
        setFormError(''); setSuccessMsg(''); setModalOpen(true);
    };

    const handleSubmit = async e => {
        e.preventDefault();
        // Si el honeypot tiene algo, es un bot
        if (honeypot) {
            console.warn("Honeypot detected bot submission");
            setSuccessMsg('Solicitud procesada correctamente.'); // Engañoso para el bot
            setTimeout(() => setModalOpen(false), 2000);
            return;
        }
        setSubmitting(true); setFormError('');
        try {
            await publicApi.post('reservas/solicitudes/', {
                ...formData,
                email_contacto: `${formData.email_contacto}@slepiquique.cl`,
                fecha_inicio: `${formData.fecha}T${formData.horaInicio}:00`,
                fecha_fin: `${formData.fecha}T${formData.horaFin}:00`,
                estado: 'PENDIENTE'
            });
            setSuccessMsg('¡Solicitud enviada! Un administrador revisará tu reserva pronto.');
            setTimeout(() => { setModalOpen(false); fetchData(); }, 3000);
        } catch (err) {
            console.error('Error submitting public reservation:', err.response?.data);
            setFormError('Error al enviar la solicitud. Verifica los campos.');
        } finally { setSubmitting(false); }
    };

    const getDayResources = (day) => {
        const dayStr = toDateStr(day);
        return recursosFiltrados.filter(rec =>
            reservas.some(r => toDateStr(r.fecha_inicio) === dayStr && parseInt(r.recurso) === parseInt(rec.id) && !['FINALIZADA', 'RECHAZADA', 'CANCELADA'].includes(r.estado))
        ).sort(sortByType);
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
            {/* TOP BAR PÚBLICO */}
            <div className="flex-shrink-0 bg-white border-b border-slate-100 px-4 py-2.5 flex items-center gap-3 shadow-sm z-20">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h1 className="font-black text-slate-900 text-sm leading-none">Portal de Reservas</h1>
                        <p className="text-[10px] text-indigo-500 font-bold capitalize mt-0.5">{fmtMonth()}</p>
                    </div>
                </div>

                <div className="flex items-center gap-1 mx-4">
                    <button onClick={() => handleNav(-1)} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronLeft className="w-4 h-4 text-slate-600" /></button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg">Hoy</button>
                    <button onClick={() => handleNav(1)} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronRight className="w-4 h-4 text-slate-600" /></button>
                </div>

                <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                    {['day', 'week'].map(v => (
                        <button key={v} onClick={() => setViewMode(v)} className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition ${viewMode === v ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                            {v === 'day' ? 'Día' : 'Semana'}
                        </button>
                    ))}
                </div>

                <div className="flex-1" />

                <button onClick={() => { setFormTipo(''); setModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition shadow-md">
                    <Plus className="w-3.5 h-3.5" /> Solicitar Reserva
                </button>
            </div>

            {/* FILTROS (Mismo que Dashboard pero sin Settings) */}
            <div className="flex-shrink-0 bg-white border-b border-slate-100 px-4 py-2 flex items-center gap-1 overflow-x-auto">
                <button onClick={() => setFiltroRecurso('all')} className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-black transition ${filtroRecurso === 'all' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>Todos</button>
                <div className="w-px h-5 bg-slate-200 flex-shrink-0 mx-2" />
                {recursos.reduce((acc, r) => acc.includes(r.tipo) ? acc : [...acc, r.tipo], []).sort().map(tipo => (
                    <button key={tipo} onClick={() => setFiltroRecurso(`tipo_${tipo}`)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${filtroRecurso === `tipo_${tipo}` ? 'bg-slate-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                        {TYPE_LABELS[tipo]}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center bg-white"><RefreshCw className="w-8 h-8 animate-spin text-indigo-500" /></div>
            ) : (
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    {/* CALENDARIO (Simplificado) */}
                    <div className="flex-shrink-0 bg-white border-b border-slate-100">
                        <div className="flex">
                            <div className="w-14 flex-shrink-0" />
                            {visibleDays.map(day => {
                                const dayRes = getDayResources(day);
                                return (
                                    <div key={toDateStr(day)} className="flex-1 text-center border-l border-slate-100">
                                        <div className="py-2">
                                            <div className="text-[9px] font-black uppercase text-slate-400">{fmtDay(day).split(' ')[0]}</div>
                                            <div className="text-lg font-black text-slate-700">{day.getDate()}</div>
                                        </div>
                                        {/* Sub-cabeceras de recursos */}
                                        {dayRes.length > 0 && (
                                            <div className="flex border-t border-slate-100 bg-slate-50/50">
                                                {dayRes.map(rec => (
                                                    <div key={rec.id} className="flex-1 py-1 px-0.5 text-center truncate border-r border-slate-100 last:border-0">
                                                        <div className="w-1.5 h-1.5 rounded-full mx-auto mb-0.5" style={{ background: rec.color }} />
                                                        <span className="text-[7px] font-black truncate block leading-none" style={{ color: rec.color }}>
                                                            {rec.nombre}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
                        <div className="flex relative" style={{ minHeight: `${TIME_SLOTS.length * SLOT_HEIGHT}px` }}>
                            <div className="w-14 bg-white border-r border-slate-100 relative">
                                {TIME_SLOTS.map((slot, idx) => (
                                    <div key={slot} className="absolute right-2 text-[9px] font-bold text-slate-400" style={{ top: `${idx * SLOT_HEIGHT + 4}px` }}>
                                        {slot.endsWith(':00') && slot}
                                    </div>
                                ))}
                            </div>

                            {visibleDays.map(day => {
                                const dayRes = getDayResources(day);
                                const nRes = dayRes.length || 1;
                                return (
                                    <div key={toDateStr(day)} className="flex-1 border-l border-slate-100 relative bg-white">
                                        {TIME_SLOTS.map((slot, idx) => (
                                            <div key={slot} className="absolute inset-x-0 border-t border-slate-50 cursor-pointer hover:bg-indigo-50/30"
                                                style={{ top: `${idx * SLOT_HEIGHT}px`, height: `${SLOT_HEIGHT}px` }}
                                                onClick={() => handleSlotClick(day, slot, recursosFiltrados[0]?.id)}>
                                            </div>
                                        ))}

                                        {dayRes.map((recurso, rIdx) => {
                                            const events = getReservasForDayAndRecurso(day, recurso.id);
                                            const laid = layoutEvents(events);
                                            const colW = 100 / nRes;
                                            const colLeft = rIdx * colW;

                                            return laid.map(({ ev, colIndex, colCount }) => {
                                                const { top, height } = getEventPos(ev);
                                                const color = recurso.color || '#6366f1';
                                                const subW = colW / colCount;
                                                const subLeft = colLeft + colIndex * subW;

                                                return (
                                                    <div key={ev.id} className="absolute z-10 p-0.5"
                                                        style={{ top: `${top}px`, height: `${height}px`, left: `${subLeft}%`, width: `${subW}%` }}>
                                                        <div className="h-full rounded border-l-4 bg-slate-100 flex flex-col items-center justify-center"
                                                            style={{ borderLeftColor: color, background: hexToRgba(color, 0.1) }}>
                                                            <Lock className="w-3 h-3 text-slate-400 opacity-50 mb-0.5" />
                                                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Ocupado</span>
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL RESERVA PÚBLICO */}
            {modalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-[10vh]" onClick={() => setModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col h-auto max-h-[85vh] overflow-hidden transition-all duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b bg-indigo-600 text-white flex-shrink-0 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black">Solicitar Reserva</h3>
                                <p className="text-indigo-100 text-xs mt-1">Completa los datos para solicitar el recurso.</p>
                            </div>
                            <button onClick={() => setModalOpen(false)} className="text-indigo-200 hover:text-white transition">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {successMsg ? (
                            <div className="p-10 text-center">
                                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                    <Check className="w-8 h-8" />
                                </div>
                                <h4 className="text-lg font-black text-slate-800">¡Recibido!</h4>
                                <p className="text-slate-500 text-sm mt-2">{successMsg}</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                                {formError && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4" />{formError}</div>}

                                {/* ─ PASO 1: Tipo de recurso ─ */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Tipo de recurso *</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {Object.entries(TYPE_LABELS).map(([tipo, label]) => {
                                            const Icon = RECURSO_ICONS[tipo] || Package;
                                            const tieneRecursos = recursos.some(r => r.tipo === tipo && r.activo !== false);
                                            const isSelected = formTipo === tipo;
                                            return (
                                                <button key={tipo} type="button"
                                                    disabled={!tieneRecursos}
                                                    onClick={() => {
                                                        setFormTipo(tipo);
                                                        setFormData(p => ({ ...p, recurso: '' })); // reset recurso al cambiar tipo
                                                    }}
                                                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition ${!tieneRecursos ? 'opacity-30 cursor-not-allowed border-slate-100 bg-slate-50' :
                                                        isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 bg-slate-50 hover:border-slate-300'
                                                        }`}
                                                >
                                                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-500' : 'bg-white shadow-sm'}`}>
                                                        <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                                                    </div>
                                                    <span className={`text-[10px] font-black leading-tight ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`}>{label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* ─ PASO 2: Recurso del tipo seleccionado ─ */}
                                {formTipo && (() => {
                                    const recursosDeTipo = recursos.filter(r => r.tipo === formTipo && r.activo !== false).sort(sortByType);
                                    return (
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                                                {TYPE_LABELS[formTipo]} disponibles *
                                            </label>
                                            {recursosDeTipo.length === 0 ? (
                                                <p className="text-xs text-slate-400 italic text-center py-3">No hay recursos de este tipo</p>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-2">
                                                    {recursosDeTipo.map(r => {
                                                        const Icon = RECURSO_ICONS[r.tipo] || Package;
                                                        const isSelected = parseInt(formData.recurso) === r.id;
                                                        const color = r.color || '#6366f1';
                                                        return (
                                                            <button key={r.id} type="button"
                                                                onClick={() => setFormData(p => ({ ...p, recurso: r.id }))}
                                                                className="flex items-center gap-2 p-2.5 rounded-xl border-2 text-left transition"
                                                                style={{ borderColor: isSelected ? color : '#f1f5f9', background: isSelected ? hexToRgba(color, 0.08) : '' }}>
                                                                <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: isSelected ? color : '#f1f5f9' }}>
                                                                    <Icon className="w-3 h-3" style={{ color: isSelected ? 'white' : '#94a3b8' }} />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-bold truncate" style={{ color: isSelected ? color : '#475569' }}>{r.nombre}</p>
                                                                    {r.ubicacion && <p className="text-[9px] text-slate-400 truncate">{r.ubicacion}</p>}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Título / Motivo *</label>
                                    <input type="text" className="w-full p-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={formData.titulo} onChange={e => setFormData({ ...formData, titulo: e.target.value })} placeholder="Ej: Reunión Comité" required />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Tu Nombre *</label>
                                        <input type="text" className="w-full p-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={formData.nombre_funcionario} onChange={e => setFormData({ ...formData, nombre_funcionario: e.target.value })} placeholder="Ej: Juan Pérez" required />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Correo Institucional *</label>
                                        <div className="flex items-stretch rounded-xl border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                                            <input
                                                type="text"
                                                className="flex-1 p-2.5 text-sm outline-none min-w-0"
                                                value={formData.email_contacto}
                                                onChange={e => setFormData({ ...formData, email_contacto: e.target.value.replace(/@.*/g, '') })}
                                                placeholder="tu.nombre"
                                                required
                                            />
                                            <span className="flex items-center px-2.5 bg-slate-100 text-slate-500 text-xs font-bold border-l border-slate-200 whitespace-nowrap flex-shrink-0">
                                                @slepiquique.cl
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Honeypot - Invisible para humanos */}
                                <div className="hidden" aria-hidden="true">
                                    <input type="text" value={honeypot} onChange={e => setHoneypot(e.target.value)} tabIndex="-1" autoComplete="off" />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Fecha *</label>
                                        <input type="date" className="w-full p-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={formData.fecha} onChange={e => setFormData({ ...formData, fecha: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Desde *</label>
                                        <select className="w-full p-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={formData.horaInicio} onChange={e => setFormData({ ...formData, horaInicio: e.target.value })}>
                                            {TIME_SLOTS.filter(s => {
                                                const [h, m] = s.split(':').map(Number);
                                                const slotMins = h * 60 + m;
                                                const esHoy = formData.fecha === todayStr;
                                                const now = new Date();
                                                const currentMins = now.getHours() * 60 + now.getMinutes();

                                                // Filtro 1: No mostrar pasado (con 15 min de margen)
                                                if (esHoy && slotMins < currentMins - 15) return false;

                                                // Filtro 2: No mostrar si está ocupado por otra APROBADA
                                                if (formData.recurso) {
                                                    const ocupado = reservas.some(r =>
                                                        parseInt(r.recurso) === parseInt(formData.recurso) &&
                                                        r.estado === 'APROBADA' &&
                                                        toDateStr(r.fecha_inicio) === formData.fecha &&
                                                        slotMins >= dtMinutes(r.fecha_inicio) &&
                                                        slotMins < dtMinutes(r.fecha_fin)
                                                    );
                                                    if (ocupado) return false;
                                                }
                                                return true;
                                            }).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Hasta *</label>
                                        <select className="w-full p-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={formData.horaFin} onChange={e => setFormData({ ...formData, horaFin: e.target.value })}>
                                            {TIME_SLOTS.filter(s => {
                                                const [h, m] = s.split(':').map(Number);
                                                const slotMins = h * 60 + m;
                                                const startMins = (() => {
                                                    const [sh, sm] = formData.horaInicio.split(':').map(Number);
                                                    return sh * 60 + sm;
                                                })();

                                                if (slotMins <= startMins) return false;

                                                // No dejar saltar sobre una reserva existente
                                                if (formData.recurso) {
                                                    const saltando = reservas.some(r =>
                                                        parseInt(r.recurso) === parseInt(formData.recurso) &&
                                                        r.estado === 'APROBADA' &&
                                                        toDateStr(r.fecha_inicio) === formData.fecha &&
                                                        dtMinutes(r.fecha_inicio) >= startMins &&
                                                        dtMinutes(r.fecha_inicio) < slotMins
                                                    );
                                                    if (saltando) return false;
                                                }
                                                return true;
                                            }).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition">Cancelar</button>
                                    <button type="submit" disabled={submitting} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:opacity-50">
                                        {submitting ? 'Enviando...' : 'Enviar Solicitud'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicReservas;
