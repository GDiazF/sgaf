import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Calendar, ChevronLeft, ChevronRight, Plus, X, Check,
    Clock, Truck, Monitor, Package, User, AlertCircle, Lock,
    RefreshCw, Building2, MapPin
} from 'lucide-react';
import api from '../../api';

// ─── Constantes ───────────────────────────────────────────────────────────────
const DEFAULT_HOUR_START = 7;
const DEFAULT_HOUR_END = 18;
const SLOT_MIN = 30;
const SLOT_HEIGHT = 44;

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

const bloqueoAppliesToDate = (b, dateStr) => {
    if (b.modo === 'DIA') return b.fecha_inicio === dateStr;
    if (b.modo === 'RANGO') return b.fecha_inicio <= dateStr && (!b.fecha_fin || dateStr <= b.fecha_fin);
    if (b.modo === 'INDEFINIDO') return dateStr >= b.fecha_inicio;
    return false;
};

import axios from 'axios';
const publicApi = axios.create({ baseURL: '/api/' });

const PublicReservas = () => {
    const [recursos, setRecursos] = useState([]);
    const [reservas, setReservas] = useState([]);
    const [bloqueos, setBloqueos] = useState([]);
    const [settings, setSettings] = useState({ hora_inicio: '07:00', hora_fin: '18:00' });
    const [loading, setLoading] = useState(true);

    const configStart = parseInt(settings.hora_inicio.split(':')[0]) || DEFAULT_HOUR_START;
    const configEnd = parseInt(settings.hora_fin.split(':')[0]) || DEFAULT_HOUR_END;
    const [hFinal, mFinal] = settings.hora_fin.split(':').map(Number);
    const MAX_MINS_FIN = hFinal * 60 + mFinal;

    const TIME_SLOTS = React.useMemo(() => {
        const slots = [];
        for (let h = configStart; h <= configEnd; h++) {
            const m0 = h * 60;
            const m30 = h * 60 + 30;
            if (m0 < MAX_MINS_FIN) slots.push(`${String(h).padStart(2, '0')}:00`);
            if (m30 < MAX_MINS_FIN) slots.push(`${String(h).padStart(2, '0')}:30`);
        }
        return slots;
    }, [configStart, configEnd, MAX_MINS_FIN]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('week');
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

    // Gestión de reserva existente
    const [manageOpen, setManageOpen] = useState(false);
    const [manageCode, setManageCode] = useState('');
    const [manageLoading, setManageLoading] = useState(false);
    const [manageError, setManageError] = useState('');
    const [manageReserva, setManageReserva] = useState(null);
    const [manageSuccess, setManageSuccess] = useState('');
    const [isEditing, setIsEditing] = useState(false);

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
            // Optimización: Solo traer reservas cercanas al mes que se está viendo
            const dStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
            const dEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 4, 0); // ~4 meses de margen
            
            const [rRes, sRes, tRes, bRes] = await Promise.all([
                publicApi.get('reservas/recursos/'),
                publicApi.get(`reservas/solicitudes/?fecha_inicio__gte=${toDateStr(dStart)}&fecha_inicio__lte=${toDateStr(dEnd)}`),
                publicApi.get('reservas/settings/').catch(() => ({ data: { hora_inicio: '07:00', hora_fin: '18:00' } })),
                publicApi.get('reservas/bloqueos/').catch(() => ({ data: [] }))
            ]);
            console.log("Resources:", rRes.data);
            setRecursos(rRes.data?.results || (Array.isArray(rRes.data) ? rRes.data : []));
            const rList = sRes.data?.results || (Array.isArray(sRes.data) ? sRes.data : []);
            console.log("Reservas loaded:", rList.length);
            setReservas(rList);
            const bList = bRes.data?.results || (Array.isArray(bRes.data) ? bRes.data : []);
            setBloqueos(bList);
            if (tRes.data) setSettings(tRes.data);
        } catch (e) {
            console.error('Error fetching public data:', e);
            setFormError('Error al conectar con el servidor. Por favor intenta más tarde.');
        }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [filtroRecurso, currentDate, viewMode]);

    // Responsividad: Forzar modo día en móviles
    useEffect(() => {
        const checkMobile = () => {
            if (window.innerWidth < 768 && viewMode === 'week') {
                setViewMode('day');
            }
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, [viewMode]);

    // Auto-ajuste de horas (igual que el Dashboard principal)
    useEffect(() => {
        if (!modalOpen || !formData.recurso || !formData.fecha) return;
        if (!Array.isArray(reservas)) return;
        const resDía = reservas.filter(r => parseInt(r.recurso) === parseInt(formData.recurso) && r.estado === 'APROBADA' && toDateStr(r.fecha_inicio) === formData.fecha);
        const getMins = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
        const now = new Date();
        const nowHourStart = now.getHours() * 60;
        const esHoy = formData.fecha === todayStr;

        const mInicio = getMins(formData.horaInicio);
        const estaOcupadoI = resDía.some(r => mInicio >= dtMinutes(r.fecha_inicio) && mInicio < dtMinutes(r.fecha_fin));
        const esPasado = esHoy && mInicio < nowHourStart;

        if (estaOcupadoI || esPasado) {
            const primerLibre = TIME_SLOTS.find(s => {
                const m = getMins(s);
                if (esHoy && m < nowHourStart) return false;
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

    // Optimización: Agrupar reservas por recurso y día una sola vez
    const reservasBuckets = useMemo(() => {
        const buckets = {};
        if (!Array.isArray(reservas)) return buckets;
        
        reservas.forEach(r => {
            const dayStr = toDateStr(r.fecha_inicio);
            const key = `${r.recurso}_${dayStr}`;
            const rEstado = (r.estado || "").toUpperCase();
            
            if (rEstado === 'PENDIENTE' || rEstado === 'APROBADA' || rEstado === 'FINALIZADA') {
                if (!buckets[key]) buckets[key] = [];
                buckets[key].push(r);
            }
        });
        return buckets;
    }, [reservas]);

    const recursosFiltrados = (() => {
        let list;
        if (filtroRecurso === 'all') list = recursos;
        else if (filtroRecurso.startsWith('tipo_')) {
            const tipo = filtroRecurso.replace('tipo_', '');
            list = recursos.filter(r => r.tipo === tipo);
        } else list = recursos.filter(r => r.id === parseInt(filtroRecurso));
        if (!Array.isArray(list)) return [];
        return list.slice().sort(sortByType);
    })();

    const getReservasForDayAndRecurso = (day, recursoId) => {
        const dayStr = toDateStr(day);
        return reservasBuckets[`${recursoId}_${dayStr}`] || [];
    };

    const getEventPos = (ev) => {
        const startMin = dtMinutes(ev.fecha_inicio);
        const endMin = dtMinutes(ev.fecha_fin);
        const top = ((startMin - configStart * 60) / SLOT_MIN) * SLOT_HEIGHT;
        const height = Math.max(((endMin - startMin) / SLOT_MIN) * SLOT_HEIGHT, 24);
        return { top, height };
    };

    const handleNav = dir => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + dir * (viewMode === 'week' ? 7 : 1));
        setCurrentDate(d);
    };

    // Auto-ajustar horas disponibles cuando cambia el recurso o fecha en el modal
    useEffect(() => {
        if (!modalOpen || !formData.recurso || !formData.fecha) return;

        const resDía = reservas.filter(r =>
            Number(r.recurso) === Number(formData.recurso) &&
            r.estado === 'APROBADA' &&
            toDateStr(r.fecha_inicio) === formData.fecha
        );

        const getMins = s => {
            if (!s) return 0;
            const [h, m] = s.split(':').map(Number);
            return h * 60 + m;
        };
        const now = new Date();
        const nowHourStart = now.getHours() * 60;
        const esHoy = formData.fecha === todayStr;

        // 1. Validar "Desde"
        const mInicio = getMins(formData.horaInicio);
        const estaOcupadoI = resDía.some(r => mInicio >= dtMinutes(r.fecha_inicio) && mInicio < dtMinutes(r.fecha_fin));
        const esPasado = esHoy && mInicio < nowHourStart;

        if (estaOcupadoI || esPasado) {
            const primerLibre = TIME_SLOTS.find(s => {
                const m = getMins(s);
                if (esHoy && m < nowHourStart) return false;
                return !resDía.some(r => m >= dtMinutes(r.fecha_inicio) && m < dtMinutes(r.fecha_fin));
            });
            if (primerLibre) setFormData(p => ({ ...p, horaInicio: primerLibre }));
        }

        // 2. Validar "Hasta" (debe ser posterior y no saltar)
        const mFin = getMins(formData.horaFin);
        const mActInicio = getMins(formData.horaInicio);

        const saltando = resDía.some(r => {
            const ri = dtMinutes(r.fecha_inicio);
            return ri >= mActInicio && ri < mFin;
        });

        if (mFin <= mActInicio || saltando) {
            const sigSlot = TIME_SLOTS.find(s => getMins(s) > mActInicio);
            if (sigSlot) setFormData(p => ({ ...p, horaFin: sigSlot }));
            else {
                // Si no hay slots posteriores, intentar ajustar hora de fin del día
                const hfLimit = settings.hora_fin.slice(0, 5);
                if (getMins(hfLimit) > mActInicio) setFormData(p => ({ ...p, horaFin: hfLimit }));
            }
        }
    }, [formData.recurso, formData.fecha, formData.horaInicio, modalOpen, reservas, todayStr, settings.hora_fin]);

    const handleSlotClick = (day, slotTime, recursoId) => {
        const dayStr = toDateStr(day);
        if (dayStr < todayStr) return; // BLOQUEAR EN EL PASADO
        let actualSlot = slotTime || '09:00';

        if (recursoId) {
            const dayEvents = (reservas || []).filter(r =>
                parseInt(r.recurso) === parseInt(recursoId) &&
                r.estado === 'APROBADA' &&
                toDateStr(r.fecha_inicio) === dayStr
            );

            const dayBloqueos = (bloqueos || []).filter(b =>
                parseInt(b.recurso) === parseInt(recursoId) &&
                bloqueoAppliesToDate(b, dayStr)
            );

            const isOccupied = (time) => {
                const [h, m] = time.split(':').map(Number);
                const sStart = h * 60 + m;
                const sEnd = sStart + SLOT_MIN;
                const hasReserva = dayEvents.some(r => dtMinutes(r.fecha_inicio) < sEnd && dtMinutes(r.fecha_fin) > sStart);
                const hasBloqueo = dayBloqueos.some(b => {
                    const bStart = parseInt(b.hora_inicio.split(':')[0]) * 60 + parseInt(b.hora_inicio.split(':')[1]);
                    const bEnd = parseInt(b.hora_fin.split(':')[0]) * 60 + parseInt(b.hora_fin.split(':')[1]);
                    return bStart < sEnd && bEnd > sStart;
                });
                return hasReserva || hasBloqueo;
            };

            if (isOccupied(actualSlot)) {
                const firstFree = TIME_SLOTS.find(s => !isOccupied(s));
                if (firstFree) actualSlot = firstFree;
            }
        }

        const [h, m] = actualSlot.split(':').map(Number);
        const endH = m === 30 ? h + 1 : h, endM = m === 30 ? 0 : 30;

        const rec = recursos.find(r => r.id === recursoId);
        setFormTipo(rec?.tipo || '');
        setFormData({
            recurso: recursoId || '',
            titulo: '',
            nombre_funcionario: '',
            descripcion: '',
            fecha: toDateStr(day),
            horaInicio: actualSlot,
            horaFin: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
            email_contacto: ''
        });
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
        if (!Array.isArray(recursosFiltrados)) return [];
        return recursosFiltrados;
    };

    const headerScrollRef = useRef(null);

    return (
        <div className="h-screen flex flex-col bg-slate-50 font-sans text-slate-900 overflow-hidden">
            {/* TOP BAR PÚBLICO - Responsive */}
            <div className="flex-shrink-0 bg-white border-b border-slate-100 px-4 py-3 flex flex-col md:flex-row md:items-center gap-3 shadow-sm z-20">
                <div className="flex items-center justify-between w-full md:w-auto">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h1 className="font-black text-slate-900 text-sm leading-none">Portal de Reservas</h1>
                            <p className="text-[10px] text-indigo-500 font-bold capitalize mt-0.5">{fmtMonth()}</p>
                        </div>
                    </div>
                    {/* Nav móvil */}
                    <div className="flex md:hidden items-center gap-1">
                        <button onClick={() => handleNav(-1)} className="p-2 rounded-lg hover:bg-slate-100 transition"><ChevronLeft className="w-5 h-5 text-slate-600" /></button>
                        <button onClick={() => handleNav(1)} className="p-2 rounded-lg hover:bg-slate-100 transition"><ChevronRight className="w-5 h-5 text-slate-600" /></button>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
                    <div className="hidden md:flex items-center gap-1 mx-4">
                        <button onClick={() => handleNav(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 transition"><ChevronLeft className="w-4 h-4 text-slate-600" /></button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition">Hoy</button>
                        <button onClick={() => handleNav(1)} className="p-1.5 rounded-lg hover:bg-slate-100 transition"><ChevronRight className="w-4 h-4 text-slate-600" /></button>
                    </div>

                    <div className="flex items-center bg-slate-100 rounded-lg p-0.5 flex-shrink-0">
                        {['day', 'week'].map(v => (
                            <button key={v} onClick={() => setViewMode(v)} className={`px-4 py-1.5 text-[11px] font-bold rounded-md transition ${viewMode === v ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                                {v === 'day' ? 'Día' : 'Semana'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2 ml-auto w-full md:w-auto mt-1 md:mt-0">
                    {!(viewMode === 'day' && toDateStr(currentDate) < todayStr) && (
                        <button
                            onClick={() => {
                                if (filtroRecurso !== 'all' && !filtroRecurso.startsWith('tipo_')) {
                                    const rec = recursos.find(r => r.id === parseInt(filtroRecurso));
                                    if (rec) {
                                        setFormTipo(rec.tipo);
                                        setFormData(prev => ({ ...prev, recurso: rec.id }));
                                    }
                                } else if (filtroRecurso.startsWith('tipo_')) {
                                    setFormTipo(filtroRecurso.replace('tipo_', ''));
                                    setFormData(prev => ({ ...prev, recurso: '' }));
                                } else {
                                    setFormTipo('');
                                    setFormData(prev => ({ ...prev, recurso: '' }));
                                }
                                setModalOpen(true);
                            }}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition shadow-md"
                        >
                            <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Solicitar Reserva</span><span className="sm:hidden">Solicitar</span>
                        </button>
                    )}

                    <button
                        onClick={() => {
                            setManageOpen(true);
                            setManageCode('');
                            setManageReserva(null);
                            setManageError('');
                            setManageSuccess('');
                            setIsEditing(false);
                        }}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-black hover:bg-slate-900 transition shadow-md"
                    >
                        <Lock className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Gestionar Mi Reserva</span><span className="sm:hidden">Gestionar</span>
                    </button>
                </div>
            </div>

            {/* FILTROS — grupos por tipo + recursos individuales */}
            {(() => {
                const tiposPresentes = [...new Set((Array.isArray(recursos) ? recursos : []).slice().sort(sortByType).map(r => r.tipo))];
                const recursosPorTipo = tiposPresentes.reduce((acc, tipo) => {
                    acc[tipo] = recursos.filter(r => r.tipo === tipo && r.activo !== false).sort(sortByType);
                    return acc;
                }, {});

                return (
                    <div className="flex-shrink-0 bg-white border-b border-slate-100 px-4 py-2 flex items-center gap-1 overflow-x-auto">
                        <button
                            onClick={() => setFiltroRecurso('all')}
                            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black transition mr-2 ${filtroRecurso === 'all'
                                ? 'bg-slate-800 text-white shadow-sm'
                                : 'text-slate-500 hover:bg-slate-100'
                                }`}
                        >
                            Todos
                        </button>

                        <div className="w-px h-5 bg-slate-200 flex-shrink-0 mr-2" />

                        {tiposPresentes.map((tipo, tIdx) => {
                            const Icon = RECURSO_ICONS[tipo] || Package;
                            const isTipoActive = filtroRecurso === `tipo_${tipo}`;

                            return (
                                <div key={tipo} className={`flex items-center gap-1 flex-shrink-0 ${tIdx > 0 ? 'ml-2 pl-2 border-l border-slate-100' : ''}`}>
                                    <button
                                        onClick={() => setFiltroRecurso(`tipo_${tipo}`)}
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition flex-shrink-0 ${isTipoActive
                                            ? 'bg-slate-700 text-white'
                                            : 'text-slate-600 hover:bg-slate-100'
                                            }`}
                                    >
                                        <Icon className="w-3 h-3" />
                                        {TYPE_LABELS[tipo] || tipo}
                                    </button>

                                    {recursosPorTipo[tipo].map(rec => {
                                        const isActive = filtroRecurso === String(rec.id);
                                        const color = rec.color || '#6366f1';
                                        return (
                                            <button
                                                key={rec.id}
                                                onClick={() => setFiltroRecurso(String(rec.id))}
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition flex-shrink-0 border"
                                                style={{
                                                    background: isActive ? color : hexToRgba(color, 0.08),
                                                    borderColor: isActive ? color : hexToRgba(color, 0.25),
                                                    color: isActive ? 'white' : color,
                                                }}
                                            >
                                                <div
                                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                                    style={{ background: isActive ? 'rgba(255,255,255,0.7)' : color }}
                                                />
                                                {rec.nombre}
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                );
            })()}

            {loading ? (
                <div className="flex-1 flex items-center justify-center bg-white"><RefreshCw className="w-8 h-8 animate-spin text-indigo-500" /></div>
            ) : (
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    {viewMode === 'week' ? (
                        /* MODO MATRIZ (RECURSOS EN FILAS, DÍAS EN COLUMNAS) */
                        <div className="flex-1 overflow-auto bg-slate-50/30">
                            <div className="min-w-max">
                                {/* Cabecera de Días */}
                                <div className="flex sticky top-0 z-30 bg-white border-b border-slate-200">
                                    <div className="w-56 flex-shrink-0 p-4 font-black text-slate-400 text-[10px] uppercase tracking-widest bg-slate-50 border-r border-slate-200">
                                        RECURSO / DÍA
                                    </div>
                                    {visibleDays.map(day => (
                                        <div key={toDateStr(day)} className={`flex-1 min-w-[160px] p-3 text-center border-r border-slate-100 ${toDateStr(day) === todayStr ? 'bg-indigo-50/50' : ''}`}>
                                            <div className="text-[10px] font-black text-indigo-500 uppercase">{fmtDay(day).split(' ')[0]}</div>
                                            <div className={`text-xl font-black ${toDateStr(day) === todayStr ? 'text-indigo-600' : 'text-slate-700'}`}>{day.getDate()}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Filas de Recursos */}
                                {recursosFiltrados.map(rec => {
                                    const Icon = RECURSO_ICONS[rec.tipo] || Package;
                                    const color = rec.color || '#6366f1';

                                    return (
                                        <div key={rec.id} className="flex border-b border-slate-100 group bg-white hover:bg-slate-50/50 transition-colors">
                                            {/* Info de Recurso (Sticky Left) */}
                                            <div className="w-56 sticky left-0 z-20 flex-shrink-0 p-4 bg-white border-r border-slate-200 flex items-start gap-3 shadow-[4px_0_8px_rgba(0,0,0,0.02)]">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-100" style={{ background: hexToRgba(color, 0.08), color }}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-black text-slate-800 text-[11px] leading-tight mb-1">{rec.nombre}</h4>
                                                    <span className="text-[9px] font-black uppercase tracking-tighter text-slate-400 px-1.5 py-0.5 bg-slate-100 rounded">
                                                        {TYPE_LABELS[rec.tipo]}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Celdas de Días */}
                                            {visibleDays.map(day => {
                                                const dayStr = toDateStr(day);
                                                const dayEvents = getReservasForDayAndRecurso(day, rec.id);
                                                const dayBloqueos = bloqueos.filter(b => Number(b.recurso) === Number(rec.id) && bloqueoAppliesToDate(b, dayStr));

                                                return (
                                                    <div key={dayStr}
                                                        onClick={() => dayStr >= todayStr && handleSlotClick(day, '', rec.id)}
                                                        className={`flex-1 min-w-[160px] p-2 border-r border-slate-50 min-h-[120px] transition-colors relative hover:bg-indigo-50/20 ${dayStr >= todayStr ? 'cursor-pointer' : ''} ${dayStr === todayStr ? 'bg-indigo-50/10' : ''}`}>

                                                        <div className="space-y-1.5 relative z-10">
                                                            {/* Bloqueos */}
                                                            {dayBloqueos.map(b => (
                                                                <div key={b.id} className="p-2 rounded-xl border border-amber-200 flex items-center gap-2"
                                                                    style={{ background: 'repeating-linear-gradient(45deg,rgba(251,191,36,0.05) 0,rgba(251,191,36,0.05) 4px,white 4px,white 10px)' }}>
                                                                    <Lock className="w-3 h-3 text-amber-500 flex-shrink-0" />
                                                                    <div className="min-w-0">
                                                                        <p className="text-[9px] font-black text-amber-700 leading-none">{b.hora_inicio.slice(0, 5)} - {b.hora_fin.slice(0, 5)}</p>
                                                                        <p className="text-[8px] font-bold text-amber-600 truncate mt-0.5">{b.motivo || 'Bloqueado'}</p>
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            {/* Reservas */}
                                                            {dayEvents.sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio)).map(ev => {
                                                                const evEstado = (ev.estado || "").toUpperCase();
                                                                const isApproved = evEstado === 'APROBADA';
                                                                return (
                                                                    <div key={ev.id}
                                                                        onClick={(e) => { 
                                                                            e.stopPropagation(); 
                                                                            setManageReserva(ev); 
                                                                            setManageCode(''); 
                                                                            setManageError(''); 
                                                                            setManageSuccess('');
                                                                            setIsEditing(false);
                                                                            setManageOpen(true); 
                                                                        }}
                                                                        className="p-2 mr-2 rounded-xl border flex flex-col gap-1 transition-all hover:translate-x-1 group/item shadow-sm mb-1.5 last:mb-0"
                                                                        style={{
                                                                            background: isApproved ? hexToRgba(rec.color || '#6366f1', 0.15) : 'white',
                                                                            borderColor: hexToRgba(rec.color || '#6366f1', 0.2),
                                                                            borderLeft: `4px solid ${rec.color || '#6366f1'}`,
                                                                            opacity: ev.estado === 'CANCELADA' || ev.estado === 'RECHAZADA' ? 0.35 : 1
                                                                        }}>
                                                                        <div className="flex items-center justify-between gap-1">
                                                                            <span className="text-[10px] font-black" style={{ color: rec.color || '#6366f1' }}>
                                                                                {new Date(ev.fecha_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                                {' - '}
                                                                                {new Date(ev.fecha_fin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                            </span>
                                                                            {isApproved && <Lock className="w-2.5 h-2.5 opacity-60" style={{ color: rec.color || '#6366f1' }} />}
                                                                        </div>
                                                                        <p className={`text-[10px] font-black leading-tight line-clamp-2 ${isApproved ? 'text-slate-800' : 'text-slate-500'}`}>
                                                                            {ev.titulo}
                                                                        </p>
                                                                        <p className="text-[8px] font-bold text-slate-400 truncate">
                                                                            {ev.nombre_funcionario}
                                                                        </p>
                                                                    </div>
                                                                );
                                                            })}

                                                            {/* Icono + para nuevas solicitudes: ocultar en días pasados */}
                                                            {dayStr >= todayStr && !dayBloqueos.some(b => b.hora_inicio <= '09:00' && b.hora_fin >= '18:00') && (
                                                                <div className="flex justify-center pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all">
                                                                        <Plus className="w-4 h-4" />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        /* MODO DÍA (CALENDARIO DE TIEMPO CLÁSICO) */
                        <>
                            {/* Cabecera del calendario con scroll horizontal coordinado */}
                            <div className="flex-shrink-0 bg-white border-b border-slate-100 overflow-x-auto no-scrollbar"
                                ref={headerScrollRef}
                                onScroll={(e) => { if (scrollRef.current) scrollRef.current.scrollLeft = e.target.scrollLeft; }}>
                                <div className="flex" style={{ minWidth: 'min-content' }}>
                                    <div className="w-14 flex-shrink-0 bg-white" />
                                    {visibleDays.map(day => {
                                        const dayRes = getDayResources(day);
                                        const dayMinWidth = '100%'; // En modo día ocupa todo el ancho

                                        return (
                                            <div key={toDateStr(day)} className="flex-1 border-l border-slate-100" style={{ minWidth: dayMinWidth }}>
                                                <div className="py-2 bg-white text-center">
                                                    <div className="text-[9px] font-black uppercase text-slate-400">{fmtDay(day).split(' ')[0]}</div>
                                                    <div className="text-lg font-black text-slate-700">{day.getDate()}</div>
                                                </div>
                                                {/* Sub-cabeceras de recursos */}
                                                {dayRes.length > 0 && (
                                                    <div className="flex border-t border-slate-100 bg-slate-50/50">
                                                        {dayRes.map(rec => (
                                                            <div key={rec.id} className="flex-1 py-1 px-1 text-center truncate border-r border-slate-100 last:border-0">
                                                                <div className="w-1.5 h-1.5 rounded-full mx-auto mb-0.5" style={{ background: rec.color }} />
                                                                <span className="text-[8px] font-black truncate block leading-none" style={{ color: rec.color }}>
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

                            {/* Calendar Grid Container */}
                            <div ref={scrollRef} className="flex-1 overflow-auto scroll-smooth"
                                style={{ scrollbarGutter: 'stable' }}
                                onScroll={(e) => { if (headerScrollRef.current) headerScrollRef.current.scrollLeft = e.target.scrollLeft; }}>
                                <div className="flex relative" style={{ minHeight: `${TIME_SLOTS.length * SLOT_HEIGHT}px`, minWidth: 'min-content' }}>
                                    <div className="w-14 bg-white border-r border-slate-100 relative sticky left-0 z-40">
                                        {TIME_SLOTS.map((slot, idx) => (
                                            <div key={slot} className="absolute right-2 text-[9px] font-bold text-slate-400" style={{ top: `${idx * SLOT_HEIGHT + 4}px` }}>
                                                {slot.endsWith(':00') && slot}
                                            </div>
                                        ))}
                                        {/* Final time label */}
                                        <div className="absolute right-2 text-[9px] font-bold text-slate-400" style={{ top: `${TIME_SLOTS.length * SLOT_HEIGHT + 4}px` }}>
                                            {settings.hora_fin.slice(0, 5)}
                                        </div>
                                    </div>

                                    {visibleDays.map(day => {
                                        const dayStr = toDateStr(day);
                                        const dayRes = getDayResources(day);
                                        const nRes = dayRes.length || 1;
                                        const isToday = dayStr === todayStr;
                                        const dayMinWidth = '100%';

                                        return (
                                            <div key={dayStr} className="flex-1 border-l border-slate-100 relative bg-white" style={{ minWidth: dayMinWidth }}>
                                                <div className="flex h-full">
                                                    {dayRes.map((recurso, rIdx) => (
                                                        <div key={recurso.id} className="flex-1 relative border-r border-slate-50 last:border-r-0">
                                                            {TIME_SLOTS.map((slot, idx) => (
                                                                <div key={slot} className={`absolute inset-x-0 border-t border-slate-50 hover:bg-slate-50/50 ${dayStr >= todayStr ? 'cursor-pointer' : ''}`}
                                                                    style={{ top: `${idx * SLOT_HEIGHT}px`, height: `${SLOT_HEIGHT}px` }}
                                                                    onClick={() => dayStr >= todayStr && handleSlotClick(day, slot, recurso.id)}>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                                {/* Final grid line base */}
                                                <div className="absolute left-0 right-0 border-t border-slate-200" style={{ top: `${TIME_SLOTS.length * SLOT_HEIGHT}px` }} />

                                                {/* Now indicator */}
                                                {isToday && (() => {
                                                    const now = new Date();
                                                    const top = ((now.getHours() * 60 + now.getMinutes() - configStart * 60) / SLOT_MIN) * SLOT_HEIGHT;
                                                    if (top < 0 || top > TIME_SLOTS.length * SLOT_HEIGHT) return null;
                                                    return (
                                                        <div className="absolute left-0 right-0 z-30 flex items-center pointer-events-none" style={{ top: `${top}px` }}>
                                                            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-md shadow-rose-500/50 -ml-1 border border-white flex-shrink-0" />
                                                            <div className="flex-1 h-0.5 bg-rose-400" />
                                                        </div>
                                                    );
                                                })()}

                                                {dayRes.map((recurso, rIdx) => {
                                                    const events = getReservasForDayAndRecurso(day, recurso.id);
                                                    const laid = layoutEvents(events);
                                                    const colW = 100 / nRes;
                                                    const colLeft = rIdx * colW;

                                                    return (
                                                        <React.Fragment key={recurso.id}>
                                                            {laid.map(({ ev, colIndex, colCount }) => {
                                                                const { top, height } = getEventPos(ev);
                                                                const color = recurso.color || '#6366f1';
                                                                const subW = colW / colCount;
                                                                const subLeft = colLeft + colIndex * subW;

                                                                return (
                                                                    <div key={ev.id} className="absolute z-10 p-0.5"
                                                                        style={{ top: `${top}px`, height: `${height}px`, left: `${subLeft}%`, width: `${subW}%` }}>
                                                                        <div className="h-full rounded border-l-4 bg-slate-100 flex flex-col items-center justify-center p-1 text-center"
                                                                            style={{ borderLeftColor: color, background: hexToRgba(color, 0.1) }}>
                                                                            {ev.estado === 'APROBADA' ? (
                                                                                <>
                                                                                    <Lock className="w-2 h-2 text-slate-400 opacity-60 mb-0.5" />
                                                                                    <span className="text-[7px] font-black text-slate-700 line-clamp-1 leading-tight uppercase">{ev.titulo}</span>
                                                                                    <span className="text-[6px] font-bold text-slate-400 truncate mt-0.5">{ev.nombre_funcionario}</span>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <Clock className="w-2 h-2 text-slate-300 opacity-60 mb-0.5" />
                                                                                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Pendiente</span>
                                                                                    <span className="text-[6px] font-bold text-slate-400 truncate mt-0.5">{ev.nombre_funcionario}</span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}

                                                            {/* Bloqueos de horario — overlay ámbar */}
                                                            {bloqueos
                                                                .filter(b => Number(b.recurso) === Number(recurso.id) && bloqueoAppliesToDate(b, dayStr))
                                                                .map(b => {
                                                                    const hiMins = (b.hora_inicio || '00:00').split(':').slice(0, 2).reduce((h, m) => h * 60 + Number(m), 0);
                                                                    const hfMins = (b.hora_fin || '00:00').split(':').slice(0, 2).reduce((h, m) => h * 60 + Number(m), 0);
                                                                    const top = ((hiMins - configStart * 60) / SLOT_MIN) * SLOT_HEIGHT;
                                                                    const height = ((hfMins - hiMins) / SLOT_MIN) * SLOT_HEIGHT;
                                                                    if (top < 0 || height <= 0) return null;
                                                                    return (
                                                                        <div key={`bloqueo-${b.id}`} className="absolute z-20 pointer-events-none"
                                                                            style={{ top: `${top}px`, height: `${height}px`, left: `${colLeft}%`, width: `${colW}%` }}>
                                                                            <div className="h-full mx-0.5 rounded flex items-center gap-1 px-1 overflow-hidden"
                                                                                style={{
                                                                                    background: 'repeating-linear-gradient(45deg,rgba(251,191,36,0.15) 0,rgba(251,191,36,0.15) 4px,rgba(254,243,199,0.4) 4px,rgba(254,243,199,0.4) 10px)',
                                                                                    border: '1px solid rgba(251,191,36,0.4)',
                                                                                }}>
                                                                                <Lock className="w-2.5 h-2.5 text-amber-500 flex-shrink-0" />
                                                                                {height > 25 && <span className="text-[7px] font-black text-amber-700 truncate">{b.motivo || 'Bloqueado'}</span>}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* MODAL RESERVA PÚBLICO */}
            {
                modalOpen && (
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
                                                const tieneRecursos = (Array.isArray(recursos) ? recursos : []).some(r => r.tipo === tipo && r.activo !== false);
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
                                        const recursosDeTipo = (Array.isArray(recursos) ? recursos : []).filter(r => r.tipo === formTipo && r.activo !== false).sort(sortByType);
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
                                                min={todayStr}
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
                                                    const nowHourStart = now.getHours() * 60;

                                                    // Filtro 1: No mostrar pasado (permitir desde inicio de la hora actual)
                                                    if (esHoy && slotMins < nowHourStart) return false;

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
                                                    // Filtro 3: No mostrar si está BLOQUEADO
                                                    if (formData.recurso) {
                                                        const bloqueado = bloqueos.some(b => {
                                                            const matchRec = Number(b.recurso) === Number(formData.recurso);
                                                            const matchDate = bloqueoAppliesToDate(b, formData.fecha);
                                                            if (!matchRec || !matchDate) return false;
                                                            const hi = (b.hora_inicio || '00:00').split(':').slice(0, 2).reduce((h, m) => h * 60 + Number(m), 0);
                                                            const hf = (b.hora_fin || '00:00').split(':').slice(0, 2).reduce((h, m) => h * 60 + Number(m), 0);
                                                            return slotMins >= hi && slotMins < hf;
                                                        });
                                                        if (bloqueado) return false;
                                                    }

                                                    return true;
                                                }).map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Hasta *</label>
                                            <select className="w-full p-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                                value={formData.horaFin} onChange={e => setFormData({ ...formData, horaFin: e.target.value })}>
                                                {(() => {
                                                    const getMins = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
                                                    const mDesde = getMins(formData.horaInicio);
                                                    const hfLimit = settings.hora_fin.slice(0, 5);

                                                    const resDía = reservas.filter(r =>
                                                        Number(r.recurso) === Number(formData.recurso) &&
                                                        r.estado === 'APROBADA' &&
                                                        toDateStr(r.fecha_inicio) === formData.fecha
                                                    );

                                                    return [...TIME_SLOTS, hfLimit]
                                                        .filter((s, idx, self) => self.indexOf(s) === idx)
                                                        .filter(s => {
                                                            const m = getMins(s);
                                                            if (m <= mDesde) return false;

                                                            // No puede saltar por encima de una reserva o bloqueo
                                                            const sigReserva = resDía
                                                                .filter(r => dtMinutes(r.fecha_inicio) >= mDesde)
                                                                .sort((a, b) => dtMinutes(a.fecha_inicio) - dtMinutes(b.fecha_inicio))[0];

                                                            if (sigReserva && m > dtMinutes(sigReserva.fecha_inicio)) return false;

                                                            const saltandoBloqueo = bloqueos.some(b => {
                                                                const matchRec = Number(b.recurso) === Number(formData.recurso);
                                                                const matchDate = bloqueoAppliesToDate(b, formData.fecha);
                                                                if (!matchRec || !matchDate) return false;
                                                                const hiB = (b.hora_inicio || '00:00').split(':').slice(0, 2).reduce((h, ms) => h * 60 + Number(ms), 0);
                                                                return hiB < m && hiB >= mDesde;
                                                            });
                                                            if (saltandoBloqueo) return false;

                                                            return true;
                                                        }).map(s => <option key={s} value={s}>{s}</option>);
                                                })()}
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
                )
            }

            {/* ── MODAL GESTIÓN DE RESERVA (EDITAR/ELIMINAR CON CÓDIGO) ── */}
            {manageOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-[10vh]" onClick={() => setManageOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b bg-slate-800 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black">{isEditing ? 'Editar Reserva' : 'Gestionar Reserva'}</h3>
                                <p className="text-slate-300 text-[10px] uppercase tracking-wider font-bold">Usa tu código de reserva</p>
                            </div>
                            <button onClick={() => setManageOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6 space-y-4">
                            {manageError && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-[11px] font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4" />{manageError}</div>}
                            {manageSuccess && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 text-[11px] font-bold flex items-center gap-2"><Check className="w-4 h-4" />{manageSuccess}</div>}

                            {!manageSuccess && (
                                <div className="space-y-4">
                                    {/* Info si ya hay reserva seleccionada (desde click calendario) */}
                                    {manageReserva && !manageReserva.verificado && !manageLoading && (
                                        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-2">
                                            <p className="text-[10px] font-black text-indigo-600 uppercase">Reserva Seleccionada</p>
                                            <h4 className="text-xs font-bold text-slate-800 leading-tight">{manageReserva.titulo}</h4>
                                            <div className="flex items-center gap-2 text-[9px] text-slate-500 font-bold">
                                                <Clock className="w-2.5 h-2.5" />
                                                {new Date(manageReserva.fecha_inicio).toLocaleDateString('es-CL')} | {new Date(manageReserva.fecha_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    )}

                                    {(!manageReserva || !manageReserva.verificado) && (
                                        <div className="space-y-4">
                                            <p className="text-xs text-slate-500 leading-relaxed">
                                                {manageReserva 
                                                    ? 'Para gestionar esta reserva, por favor ingresa el código de 6 caracteres que recibiste en tu correo.'
                                                    : 'Ingresa el código de 6 caracteres que recibiste en tu correo electrónico.'
                                                }
                                            </p>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Código de Reserva</label>
                                                <input
                                                    type="text"
                                                    maxLength={6}
                                                    value={manageCode}
                                                    onChange={e => setManageCode(e.target.value.toUpperCase())}
                                                    placeholder="EJ: XJ82K1"
                                                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-center text-xl font-black tracking-[0.5em] text-indigo-600 focus:border-indigo-500 outline-none transition"
                                                />
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    if (manageCode.length < 6) return setManageError('El código debe tener 6 caracteres.');
                                                    setManageLoading(true); setManageError('');
                                                    try {
                                                        const resp = await publicApi.post('reservas/solicitudes/public_manage/', { 
                                                            codigo_reserva: manageCode, 
                                                            accion: 'VIEW' 
                                                        });
                                                        setManageReserva({ ...resp.data, verificado: true });
                                                    } catch (err) {
                                                        setManageError('Código inválido o no encontrado.');
                                                    } finally { setManageLoading(false); }
                                                }}
                                                disabled={manageLoading || manageCode.length < 6}
                                                className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                                            >
                                                {manageLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                                                Verificar y Gestionar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {manageReserva && manageReserva.verificado && !isEditing && !manageSuccess && (() => {
                                const isPast = new Date(manageReserva.fecha_fin) < new Date();
                                return (
                                    <div className="space-y-4">
                                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[9px] font-black uppercase">{recursos.find(r => r.id === manageReserva.recurso)?.nombre}</div>
                                                <div className={`flex items-center gap-2`}>
                                                    <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${manageReserva.estado === 'APROBADA' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>{manageReserva.estado}</div>
                                                    {isPast && <div className="px-2 py-0.5 bg-slate-200 text-slate-500 rounded text-[9px] font-black uppercase">Finalizada</div>}
                                                </div>
                                            </div>
                                            <h4 className="font-black text-slate-800 text-sm leading-tight">{manageReserva.titulo}</h4>
                                            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold">
                                                <Clock className="w-3.5 h-3.5" />
                                                {new Date(manageReserva.fecha_inicio).toLocaleDateString('es-CL')} | {new Date(manageReserva.fecha_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(manageReserva.fecha_fin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>

                                        {!isPast ? (
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => {
                                                        setFormData({
                                                            ...manageReserva,
                                                            fecha: toDateStr(manageReserva.fecha_inicio),
                                                            horaInicio: new Date(manageReserva.fecha_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                                            horaFin: new Date(manageReserva.fecha_fin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                                        });
                                                        setFormTipo(recursos.find(r => r.id === manageReserva.recurso)?.tipo || '');
                                                        setIsEditing(true);
                                                    }}
                                                    className="py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-xs hover:bg-slate-50 transition"
                                                >Editar Reserva</button>
                                                <button
                                                    onClick={async () => {
                                                        if (!window.confirm('¿Estás seguro de que deseas anular esta reserva?')) return;
                                                        setManageLoading(true);
                                                        try {
                                                            await publicApi.post('reservas/solicitudes/public_manage/', { codigo_reserva: manageCode, accion: 'DELETE' });
                                                            setManageSuccess('Tu reserva ha sido anulada correctamente.');
                                                            setManageReserva(null);
                                                            fetchData();
                                                        } catch (err) {
                                                            setManageError('Error al anular la reserva.');
                                                        } finally { setManageLoading(false); }
                                                    }}
                                                    className="py-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl font-black text-xs hover:bg-rose-100 transition"
                                                >Anular Reserva</button>
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reserva Finalizada</p>
                                                <p className="text-[10px] text-slate-400 mt-1">No se pueden modificar reservas que ya han cumplido su horario.</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {isEditing && !manageSuccess && (
                                <div className="space-y-4">
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                        <p className="text-[10px] text-amber-700 leading-tight font-bold">Nota: Si modificas la reserva, el estado volverá a "Pendiente de Aprobación" y deberá ser revisada nuevamente por un administrador.</p>
                                    </div>
                                    
                                    {/* Campos de edición simplificados */}
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-400 uppercase">Título</label>
                                            <input type="text" className="w-full p-2 border-b-2 border-slate-100 text-sm outline-none focus:border-indigo-500 font-bold transition"
                                                value={formData.titulo} onChange={e => setFormData({ ...formData, titulo: e.target.value })} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-400 uppercase">Fecha</label>
                                                <input type="date" className="w-full p-2 border-b-2 border-slate-100 text-sm outline-none focus:border-indigo-500 font-bold transition"
                                                    value={formData.fecha} onChange={e => setFormData({ ...formData, fecha: e.target.value })} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-1">
                                                <div>
                                                    <label className="block text-[9px] font-black text-slate-400 uppercase">Desde</label>
                                                    <select className="w-full p-2 text-xs font-bold bg-transparent outline-none"
                                                        value={formData.horaInicio} onChange={e => setFormData({ ...formData, horaInicio: e.target.value })}>
                                                        {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-slate-400 uppercase">Hasta</label>
                                                    <select className="w-full p-2 text-xs font-bold bg-transparent outline-none"
                                                        value={formData.horaFin} onChange={e => setFormData({ ...formData, horaFin: e.target.value })}>
                                                        {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button onClick={() => setIsEditing(false)} className="flex-1 py-3 text-xs font-bold text-slate-500 transition">Regresar</button>
                                        <button
                                            onClick={async () => {
                                                setManageLoading(true); setManageError('');
                                                try {
                                                    await publicApi.post('reservas/solicitudes/public_manage/', {
                                                        codigo_reserva: manageCode,
                                                        accion: 'UPDATE',
                                                        titulo: formData.titulo,
                                                        fecha_inicio: `${formData.fecha}T${formData.horaInicio}:00`,
                                                        fecha_fin: `${formData.fecha}T${formData.horaFin}:00`,
                                                    });
                                                    setManageSuccess('Reserva actualizada. Volverá a ser revisada por administración.');
                                                    setManageReserva(null);
                                                    fetchData();
                                                } catch (err) {
                                                    setManageError('Error al guardar los cambios. Revisa el horario.');
                                                } finally { setManageLoading(false); }
                                            }}
                                            disabled={manageLoading}
                                            className="flex-2 py-3 px-6 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                                        >Guardar Cambios</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default PublicReservas;
