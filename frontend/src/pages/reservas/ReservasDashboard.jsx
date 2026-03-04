import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Calendar, ChevronLeft, ChevronRight, Plus, X, Check,
    Clock, Truck, Monitor, Package, User, AlertCircle, Lock,
    RefreshCw, Building2, Settings, Power, Trash2, Users, MapPin
} from 'lucide-react';
import api from '../../api';

// ─── Constantes ───────────────────────────────────────────────────────────────
const HOUR_START = 7;
const HOUR_END = 18;          // calendario hasta 17:30
const MAX_MINS_FIN = 17 * 60 + 30; // límite de término: 17:30
const SLOT_MIN = 30;
const SLOT_HEIGHT = 44; // px por franja de 30 min

// Slots de INICIO válidos: máx. 17:00 (para terminar a las 17:30)
const TIME_SLOTS = [];
for (let h = HOUR_START; h < HOUR_END; h++) {
    if (h * 60 < MAX_MINS_FIN) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
    if (h * 60 + 30 < MAX_MINS_FIN) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}
if (!TIME_SLOTS.includes('17:00')) TIME_SLOTS.push('17:00');

const RECURSO_ICONS = { SALA: Building2, VEHICULO: Truck, PROYECTOR: Monitor, OTRO: Package };
const TYPE_ORDER = { SALA: 0, VEHICULO: 1, PROYECTOR: 2, OTRO: 3 };
const TYPE_LABELS = { SALA: 'Salas', VEHICULO: 'Vehículos', PROYECTOR: 'Proyectores', OTRO: 'Otros' };
const sortByType = (a, b) => {
    const ta = TYPE_ORDER[a.tipo] ?? 9;
    const tb = TYPE_ORDER[b.tipo] ?? 9;
    if (ta !== tb) return ta - tb;
    return a.nombre.localeCompare(b.nombre, 'es');
};

const ESTADO_CFG = {
    PENDIENTE: { label: 'Pendiente', bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
    APROBADA: { label: 'Aprobada', bg: '#d1fae5', text: '#065f46', border: '#34d399' },
    RECHAZADA: { label: 'Rechazada', bg: '#fee2e2', text: '#991b1b', border: '#f87171' },
    CANCELADA: { label: 'Cancelada', bg: '#f1f5f9', text: '#64748b', border: '#94a3b8' },
    FINALIZADA: { label: 'Finalizada', bg: '#dbeafe', text: '#1e40af', border: '#60a5fa' },
};

// Paleta de defaults para nuevos recursos
const DEFAULT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Extrae YYYY-MM-DD en tiempo LOCAL */
const toDateStr = d => {
    if (!(d instanceof Date)) d = new Date(d);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
/** Obtiene minutos totales del día en tiempo LOCAL */
const dtMinutes = dt => {
    const d = new Date(dt);
    return d.getHours() * 60 + d.getMinutes();
};

/** Convierte un color hex a rgba con alpha dado */
const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
};

/**
 * Calcula columnas para eventos que se solapan.
 * Devuelve cada evento con {colIndex, colCount}.
 */
const layoutEvents = (events) => {
    if (!events.length) return [];
    // Ordenar por inicio
    const sorted = [...events].sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio));
    const result = sorted.map(ev => ({ ev, colIndex: 0, colCount: 1 }));
    // Grupos de solapamiento
    let groups = [];
    let current = [result[0]];
    for (let i = 1; i < result.length; i++) {
        const item = result[i];
        const startMin = dtMinutes(item.ev.fecha_inicio);
        // Comprueba si solapa con alguno del grupo actual
        const overlaps = current.some(c => dtMinutes(c.ev.fecha_fin) > startMin);
        if (overlaps) {
            current.push(item);
        } else {
            groups.push(current);
            current = [item];
        }
    }
    groups.push(current);

    // Asignar columna dentro de cada grupo
    for (const group of groups) {
        const n = group.length;
        group.forEach((item, idx) => {
            item.colIndex = idx;
            item.colCount = n;
        });
    }
    return result;
};

const bloqueoAppliesToDate = (b, dateStr) => {
    if (b.modo === 'DIA') return b.fecha_inicio === dateStr;
    if (b.modo === 'RANGO') return b.fecha_inicio <= dateStr && (!b.fecha_fin || dateStr <= b.fecha_fin);
    if (b.modo === 'INDEFINIDO') return dateStr >= b.fecha_inicio;
    return false;
};

// ─── Componente Principal ─────────────────────────────────────────────────────
const ReservasDashboard = () => {
    const [recursos, setRecursos] = useState([]);
    const [reservas, setReservas] = useState([]);
    const [loading, setLoading] = useState(true);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('day');
    const [filtroRecurso, setFiltroRecurso] = useState('all');

    // Modal nueva reserva
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({ recurso: '', titulo: '', nombre_funcionario: '', descripcion: '', fecha: toDateStr(new Date()), horaInicio: '09:00', horaFin: '10:00' });
    const [formTipo, setFormTipo] = useState(''); // tipo seleccionado en el modal
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    // Detalle reserva
    const [detailReserva, setDetailReserva] = useState(null);
    const [rechazandoId, setRechazandoId] = useState(null); // controla el panel inline de rechazo
    const [motivoRechazo, setMotivoRechazo] = useState('');
    // Log/Historial
    const [historyOpen, setHistoryOpen] = useState(false);
    // Aviso cuando sl slot está bloqueado
    const [slotBloqueadoMsg, setSlotBloqueadoMsg] = useState('');

    // Panel admin recursos
    const [adminOpen, setAdminOpen] = useState(false);
    const [adminEditing, setAdminEditing] = useState(null);
    const [adminForm, setAdminForm] = useState({ nombre: '', tipo: 'SALA', ubicacion: '', capacidad: 1, descripcion: '', activo: true, color: '#6366f1' });
    const [adminError, setAdminError] = useState('');
    const [adminSaving, setAdminSaving] = useState(false);

    // Bloqueos de horario
    const [bloqueos, setBloqueos] = useState([]);
    const [bloqueoForm, setBloqueoForm] = useState({ modo: 'DIA', fecha_inicio: '', fecha_fin: '', hora_inicio: '08:00', hora_fin: '17:30', motivo: '' });
    const [bloqueoError, setBloqueoError] = useState('');
    const [bloqueoSaving, setBloqueoSaving] = useState(false);
    const [bloqueoTab, setBloqueoTab] = useState(false); // true = mostrando pestaña de bloqueos

    const scrollRef = useRef(null);

    // ── Data ──────────────────────────────────────────────────────────────────
    const fetchData = async () => {
        setLoading(true);
        try {
            const [rRes, sRes] = await Promise.all([
                api.get('reservas/recursos/'),
                api.get('reservas/solicitudes/'),
            ]);
            setRecursos(rRes.data);
            setReservas(sRes.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
        // Bloqueos: fetch separado para no bloquear si falla auth
        try {
            const bRes = await api.get('reservas/bloqueos/');
            setBloqueos(bRes.data);
        } catch (e) { console.warn('Bloqueos no disponibles:', e); }
    };

    // ── Formatters / Derived ──────────────────────────────────────────────────
    const todayStr = toDateStr(new Date());
    const fmtDay = d => new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: 'numeric' }).format(d);
    const fmtMonth = () => {
        const parts = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).formatToParts(currentDate);
        const month = parts.find(p => p.type === 'month')?.value;
        const year = parts.find(p => p.type === 'year')?.value;
        return `${month} ${year}`;
    };

    useEffect(() => { fetchData(); }, []);

    useEffect(() => {
        if (!loading && scrollRef.current) {
            const now = new Date();
            const px = Math.max(0, ((now.getHours() * 60 + now.getMinutes() - HOUR_START * 60) / SLOT_MIN) * SLOT_HEIGHT - 120);
            scrollRef.current.scrollTop = px;
        }
    }, [loading]);

    // Auto-ajustar horas disponibles cuando cambia el recurso o fecha en el modal
    useEffect(() => {
        if (!modalOpen || !formData.recurso || !formData.fecha) return;

        const resDía = reservas.filter(r =>
            parseInt(r.recurso) === parseInt(formData.recurso) &&
            r.estado === 'APROBADA' &&
            toDateStr(r.fecha_inicio) === formData.fecha
        );

        const getMins = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
        const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
        const esHoy = formData.fecha === todayStr;

        // 1. Validar "Desde"
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
        }
    }, [formData.recurso, formData.fecha, formData.horaInicio, modalOpen, reservas, todayStr]);

    // ── Derived ───────────────────────────────────────────────────────────────
    const visibleDays = viewMode === 'week'
        ? Array.from({ length: 7 }, (_, i) => {
            const mon = new Date(currentDate);
            mon.setDate(currentDate.getDate() - ((currentDate.getDay() + 6) % 7));
            return addDays(mon, i);
        })
        : [currentDate];

    const recursosFiltrados = (() => {
        let list;
        if (filtroRecurso === 'all') {
            list = recursos;
        } else if (filtroRecurso.startsWith('tipo_')) {
            const tipo = filtroRecurso.replace('tipo_', '');
            list = recursos.filter(r => r.tipo === tipo);
        } else {
            list = recursos.filter(r => r.id === parseInt(filtroRecurso));
        }
        return list.slice().sort(sortByType);
    })();

    const getReservasForDayAndRecurso = (day, recursoId) => {
        const dayStr = toDateStr(day);
        return reservas.filter(r =>
            toDateStr(r.fecha_inicio) === dayStr &&
            parseInt(r.recurso) === parseInt(recursoId) &&
            r.estado !== 'FINALIZADA' &&
            r.estado !== 'RECHAZADA' &&
            r.estado !== 'CANCELADA'
        );
    };

    const getEventPos = (ev) => {
        const startMin = dtMinutes(ev.fecha_inicio);
        const endMin = dtMinutes(ev.fecha_fin);
        const top = ((startMin - HOUR_START * 60) / SLOT_MIN) * SLOT_HEIGHT;
        const height = Math.max(((endMin - startMin) / SLOT_MIN) * SLOT_HEIGHT, 24);
        return { top, height };
    };

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleNav = dir => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + dir * (viewMode === 'week' ? 7 : 1));
        setCurrentDate(d);
    };

    const handleSlotClick = (day, slotTime, recursoId) => {
        const [h, m] = slotTime.split(':').map(Number);
        const slotStartMin = h * 60 + m;
        const slotEndMin = slotStartMin + SLOT_MIN;
        const endH = m === 30 ? h + 1 : h, endM = m === 30 ? 0 : 30;

        // ¿Hay alguna reserva APROBADA que cubra este slot exacto para este recurso?
        const dayStr = toDateStr(day);
        const ocupado = recursoId && reservas.some(r =>
            parseInt(r.recurso) === parseInt(recursoId) &&
            r.estado === 'APROBADA' &&
            toDateStr(r.fecha_inicio) === dayStr &&
            dtMinutes(r.fecha_inicio) < slotEndMin &&
            dtMinutes(r.fecha_fin) > slotStartMin
        );

        // ¿Hay algún bloqueo manual (admin)?
        const bloqueadoManual = recursoId && bloqueos.some(b => {
            if (parseInt(b.recurso) !== parseInt(recursoId)) return false;
            if (!bloqueoAppliesToDate(b, dayStr)) return false;
            const bStart = parseInt(b.hora_inicio.split(':')[0]) * 60 + parseInt(b.hora_inicio.split(':')[1]);
            const bEnd = parseInt(b.hora_fin.split(':')[0]) * 60 + parseInt(b.hora_fin.split(':')[1]);
            return bStart < slotEndMin && bEnd > slotStartMin;
        });

        if (ocupado || bloqueadoManual) {
            const rec = recursos.find(r => r.id === recursoId);
            setSlotBloqueadoMsg(bloqueadoManual
                ? `🔒 "${rec?.nombre || 'Recurso'}" está bloqueado por administración en este horario.`
                : `🔒 "${rec?.nombre || 'Recurso'}" ya tiene una reserva aprobada en este horario.`
            );
            setTimeout(() => setSlotBloqueadoMsg(''), 3500);
            return;
        }

        const rec = recursos.find(r => r.id === recursoId);
        setFormTipo(rec?.tipo || '');
        setFormData({ recurso: recursoId || '', titulo: '', nombre_funcionario: '', descripcion: '', fecha: toDateStr(day), horaInicio: slotTime, horaFin: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}` });
        setFormError('');
        setModalOpen(true);
    };

    const handleSubmit = async e => {
        e.preventDefault();
        if (!formData.recurso) { setFormError('Selecciona un recurso'); return; }
        setSubmitting(true); setFormError('');
        try {
            await api.post('reservas/solicitudes/', {
                recurso: formData.recurso,
                titulo: formData.titulo,
                nombre_funcionario: formData.nombre_funcionario,
                descripcion: formData.descripcion,
                fecha_inicio: `${formData.fecha}T${formData.horaInicio}:00`,
                fecha_fin: `${formData.fecha}T${formData.horaFin}:00`,
                estado: 'PENDIENTE',
            });
            setModalOpen(false); fetchData();
        } catch (err) {
            console.error('Error al solicitar reserva:', err.response?.data);
            const data = err.response?.data;
            if (data) {
                if (typeof data === 'string') setFormError(data);
                else if (Array.isArray(data)) setFormError(data.join(' | '));
                else if (data.non_field_errors) setFormError(data.non_field_errors.join(' | '));
                else if (data.detail) setFormError(data.detail);
                else {
                    const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ');
                    setFormError(msgs || 'Error al crear solicitud.');
                }
            } else {
                setFormError('Error de red al crear la solicitud.');
            }
        }
        finally { setSubmitting(false); }
    };

    const handleEstado = async (id, estado, motivo = '') => {
        try {
            if (estado === 'APROBADA') {
                if (!window.confirm('¿Confirmar aprobación de la reserva?')) return;
                await api.post(`reservas/solicitudes/${id}/aprobar/`);
            } else if (estado === 'RECHAZADA') {
                await api.post(`reservas/solicitudes/${id}/rechazar/`, { motivo });
            } else {
                await api.patch(`reservas/solicitudes/${id}/`, { estado });
            }
            setDetailReserva(null);
            setRechazandoId(null);
            setMotivoRechazo('');
            fetchData();
        }
        catch (err) { alert(err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Error al actualizar estado'); }
    };

    const openAdminEdit = r => { setAdminEditing(r); setAdminForm({ nombre: r.nombre, tipo: r.tipo, ubicacion: r.ubicacion || '', capacidad: r.capacidad || 1, descripcion: r.descripcion || '', activo: r.activo, color: r.color || '#6366f1' }); setAdminError(''); };
    const openAdminCreate = () => {
        const usedColors = recursos.map(r => r.color);
        const nextColor = DEFAULT_COLORS.find(c => !usedColors.includes(c)) || DEFAULT_COLORS[recursos.length % DEFAULT_COLORS.length];
        setAdminEditing(null); setAdminForm({ nombre: '', tipo: 'SALA', ubicacion: '', capacidad: 1, descripcion: '', activo: true, color: nextColor }); setAdminError('');
    };

    const handleAdminSave = async e => {
        e.preventDefault();
        if (!adminForm.nombre.trim()) { setAdminError('El nombre es obligatorio.'); return; }
        setAdminSaving(true); setAdminError('');
        try {
            if (adminEditing) await api.put(`reservas/recursos/${adminEditing.id}/`, adminForm);
            else await api.post('reservas/recursos/', adminForm);
            fetchData(); openAdminCreate();
        } catch (err) {
            console.error('Error al guardar recurso:', err.response?.data);
            // Extraer mensaje detallado del servidor
            const data = err.response?.data;
            if (data) {
                if (typeof data === 'string') setAdminError(data);
                else if (data.detail) setAdminError(data.detail);
                else {
                    // Errores de validación por campo
                    const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ');
                    setAdminError(msgs || 'Error al guardar.');
                }
            } else if (err.response?.status === 403) {
                setAdminError('Sin permisos. Solo administradores pueden gestionar recursos.');
            } else {
                setAdminError(`Error ${err.response?.status || ''}: No se pudo guardar.`);
            }
        }
        finally { setAdminSaving(false); }
    };

    const handleAdminToggle = async r => {
        if (!window.confirm(`¿${r.activo ? 'Desactivar' : 'Activar'} "${r.nombre}"?`)) return;
        try { await api.patch(`reservas/recursos/${r.id}/`, { activo: !r.activo }); fetchData(); }
        catch (err) { alert(err.response?.data?.detail || 'Error al actualizar recurso'); }
    };

    const handleAdminDelete = async r => {
        if (!window.confirm(`¿Eliminar permanentemente "${r.nombre}"?`)) return;
        try { await api.delete(`reservas/recursos/${r.id}/`); fetchData(); if (adminEditing?.id === r.id) openAdminCreate(); }
        catch { alert('Error al eliminar'); }
    };

    // ── Bloqueos de Horario ──────────────────────────────────────────────
    const handleBloqueoSave = async e => {
        e.preventDefault();
        if (!adminEditing) return;
        if (!bloqueoForm.fecha_inicio) { setBloqueoError('Selecciona una fecha de inicio.'); return; }
        if (bloqueoForm.modo === 'RANGO' && !bloqueoForm.fecha_fin) { setBloqueoError('Indica la fecha de fin del rango.'); return; }
        if (bloqueoForm.hora_fin <= bloqueoForm.hora_inicio) { setBloqueoError('La hora de fin debe ser posterior a la de inicio.'); return; }
        setBloqueoSaving(true); setBloqueoError('');
        try {
            const payload = {
                recurso: adminEditing.id,
                modo: bloqueoForm.modo,
                fecha_inicio: bloqueoForm.fecha_inicio,
                fecha_fin: bloqueoForm.modo === 'RANGO' ? bloqueoForm.fecha_fin : null,
                hora_inicio: bloqueoForm.hora_inicio,
                hora_fin: bloqueoForm.hora_fin,
                motivo: bloqueoForm.motivo,
            };
            await api.post('reservas/bloqueos/', payload);
            setBloqueoForm({ modo: 'DIA', fecha_inicio: '', fecha_fin: '', hora_inicio: '08:00', hora_fin: '17:30', motivo: '' });
            fetchData();
        } catch (err) {
            const data = err.response?.data;
            const msg = typeof data === 'string' ? data
                : data?.non_field_errors?.[0]
                || Object.values(data || {}).flat().join(' ')
                || 'Error al guardar bloqueo.';
            setBloqueoError(msg);
        } finally { setBloqueoSaving(false); }
    };

    const handleBloqueoDelete = async id => {
        try { await api.delete(`reservas/bloqueos/${id}/`); fetchData(); }
        catch { alert('Error al eliminar bloqueo'); }
    };

    // ── Render Helpers ────────────────────────────────────────────────────────

    /**
     * Recursos que tienen AL MENOS UNA reserva ese día, ordenados por tipo.
     */
    const getDayResources = (day) => {
        const dayStr = toDateStr(day);
        return recursosFiltrados
            .filter(rec =>
                reservas.some(r =>
                    toDateStr(r.fecha_inicio) === dayStr &&
                    parseInt(r.recurso) === parseInt(rec.id) &&
                    !['FINALIZADA', 'RECHAZADA', 'CANCELADA'].includes(r.estado)
                )
            )
            .sort(sortByType);
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">

            {/* TOP BAR */}
            <div className="flex-shrink-0 bg-white border-b border-slate-100 px-4 py-2.5 flex items-center gap-3 shadow-sm z-20">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h1 className="font-black text-slate-900 text-sm leading-none">Reservas</h1>
                        <p className="text-[10px] text-indigo-500 font-bold capitalize mt-0.5">{fmtMonth()}</p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button onClick={() => handleNav(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 transition"><ChevronLeft className="w-4 h-4 text-slate-600" /></button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition">Hoy</button>
                    <button onClick={() => handleNav(1)} className="p-1.5 rounded-lg hover:bg-slate-100 transition"><ChevronRight className="w-4 h-4 text-slate-600" /></button>
                </div>

                <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                    {['day', 'week'].map(v => (
                        <button key={v} onClick={() => setViewMode(v)} className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition ${viewMode === v ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                            {v === 'day' ? 'Día' : 'Semana'}
                        </button>
                    ))}
                </div>

                <select value={filtroRecurso} onChange={e => setFiltroRecurso(e.target.value)} className="hidden"></select>

                <div className="flex-1" />

                <button onClick={() => setHistoryOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-slate-500 hover:text-slate-800 transition text-xs font-bold border border-slate-200 rounded-xl hover:bg-slate-50">
                    <Clock className="w-3.5 h-3.5" /> Log
                </button>
                <div className="w-px h-4 bg-slate-200 mx-1" />
                <button onClick={fetchData} className="p-1.5 hover:bg-slate-100 rounded-lg transition" title="Actualizar">
                    <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={() => { openAdminCreate(); setAdminOpen(true); }} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-black hover:bg-slate-200 transition">
                    <Settings className="w-3.5 h-3.5" /> Administrar
                </button>
                <button onClick={() => { setFormTipo(''); setFormData({ recurso: '', titulo: '', nombre_funcionario: '', descripcion: '', fecha: toDateStr(currentDate), horaInicio: '09:00', horaFin: '10:00' }); setFormError(''); setModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition shadow-md shadow-indigo-500/20">
                    <Plus className="w-3.5 h-3.5" /> Nueva Reserva
                </button>
            </div>

            {/* FILTER BAR — grupos por tipo + recursos individuales */}
            {(() => {
                // Agrupar recursos por tipo (ya ordenados por sortByType)
                const tiposPresentes = [...new Set(recursos.slice().sort(sortByType).map(r => r.tipo))];
                const recursosPorTipo = tiposPresentes.reduce((acc, tipo) => {
                    acc[tipo] = recursos.filter(r => r.tipo === tipo).sort(sortByType);
                    return acc;
                }, {});

                return (
                    <div className="flex-shrink-0 bg-white border-b border-slate-100 px-4 py-2 flex items-center gap-1 overflow-x-auto">

                        {/* Chip: Todos */}
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

                        {/* Por tipo */}
                        {tiposPresentes.map((tipo, tIdx) => {
                            const Icon = RECURSO_ICONS[tipo] || Package;
                            const isTipoActive = filtroRecurso === `tipo_${tipo}`;
                            const firstRecursoColor = recursosPorTipo[tipo][0]?.color || '#6366f1';

                            return (
                                <div key={tipo} className={`flex items-center gap-1 flex-shrink-0 ${tIdx > 0 ? 'ml-2 pl-2 border-l border-slate-100' : ''}`}>

                                    {/* Cabecera del tipo — clickeable */}
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

                                    {/* Recursos individuales del tipo */}
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

            {/* BANNER: slot bloqueado */}
            {slotBloqueadoMsg && (
                <div className="flex-shrink-0 flex items-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2 animate-pulse">
                    <Lock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span className="text-xs font-bold text-amber-700">{slotBloqueadoMsg}</span>
                </div>
            )}

            {/* CALENDAR GRID */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">

                {/* Day headers + sub-resource labels */}
                <div className="flex-shrink-0 bg-white border-b border-slate-100">
                    {/* Fila de días */}
                    <div className="flex">
                        <div className="w-14 flex-shrink-0" />
                        {visibleDays.map(day => {
                            const isToday = toDateStr(day) === todayStr;
                            const dayRes = getDayResources(day);
                            return (
                                <div key={toDateStr(day)} className={`flex-1 text-center border-l border-slate-100 ${isToday ? 'bg-indigo-50' : ''}`}>
                                    <div className={`text-[9px] font-black uppercase tracking-wider pt-2 ${isToday ? 'text-indigo-400' : 'text-slate-400'}`}>{fmtDay(day).split(' ')[0]}</div>
                                    <div className={`text-lg font-black leading-tight pb-1 ${isToday ? 'text-indigo-600' : 'text-slate-700'}`}>{day.getDate()}</div>
                                    {/* Sub-cabeceras de recursos (solo si hay >1) */}
                                    {dayRes.length > 1 && (
                                        <div className="flex border-t border-slate-100">
                                            {dayRes.map(rec => (
                                                <div key={rec.id} className="flex-1 py-1 px-0.5 text-center truncate"
                                                    style={{ borderRight: '1px solid #f1f5f9' }}>
                                                    <div className="w-2 h-2 rounded-full mx-auto mb-0.5" style={{ background: rec.color || '#6366f1' }} />
                                                    <span className="text-[8px] font-black truncate block leading-none" style={{ color: rec.color || '#6366f1' }}>
                                                        {rec.nombre.length > 8 ? rec.nombre.slice(0, 7) + '…' : rec.nombre}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {/* Sub-cabecera única (1 recurso) */}
                                    {dayRes.length === 1 && (
                                        <div className="flex justify-center items-center gap-1 py-0.5 border-t border-slate-100">
                                            <div className="w-2 h-2 rounded-full" style={{ background: dayRes[0].color || '#6366f1' }} />
                                            <span className="text-[8px] font-black" style={{ color: dayRes[0].color || '#6366f1' }}>{dayRes[0].nombre}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Scrollable area */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
                    <div className="flex relative" style={{ minHeight: `${TIME_SLOTS.length * SLOT_HEIGHT}px` }}>

                        {/* Time gutter */}
                        <div className="w-14 flex-shrink-0 relative bg-white border-r border-slate-100">
                            {TIME_SLOTS.map((slot, idx) => (
                                <div key={slot} className="absolute right-2 flex items-start" style={{ top: `${idx * SLOT_HEIGHT}px`, height: `${SLOT_HEIGHT}px` }}>
                                    {slot.endsWith(':00') && <span className="text-[9px] font-bold text-slate-400 leading-none pt-1">{slot}</span>}
                                </div>
                            ))}
                        </div>

                        {/* Day columns */}
                        {visibleDays.map(day => {
                            const isToday = toDateStr(day) === todayStr;
                            // Recursos activos ESTE DÍA (dinámico)
                            const dayRes = getDayResources(day);
                            const nRes = dayRes.length || 1; // mínimo 1 para no dividir entre 0

                            return (
                                <div key={toDateStr(day)} className={`flex-1 border-l border-slate-100 relative ${isToday ? 'bg-indigo-50/20' : 'bg-white'}`}>

                                    {/* Líneas divisorias entre sub-columnas de recursos */}
                                    {dayRes.length > 1 && dayRes.slice(0, -1).map((_, rIdx) => (
                                        <div key={rIdx} className="absolute top-0 bottom-0 z-10 pointer-events-none"
                                            style={{ left: `${(rIdx + 1) * (100 / nRes)}%`, borderLeft: '1px dashed #e2e8f0' }} />
                                    ))}

                                    {/* Grid lines */}
                                    {TIME_SLOTS.map((slot, idx) => {
                                        const isHour = slot.endsWith(':00');
                                        return (
                                            <div key={slot} className="absolute left-0 right-0 cursor-pointer group"
                                                style={{
                                                    top: `${idx * SLOT_HEIGHT}px`, height: `${SLOT_HEIGHT}px`,
                                                    borderTop: isHour ? '1px solid #e2e8f0' : '1px dashed #f1f5f9'
                                                }}
                                                onClick={() => handleSlotClick(day, slot, recursosFiltrados[0]?.id)}>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute inset-0" style={{ background: 'rgba(99,102,241,0.05)' }} />
                                                <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute left-2 top-0.5 text-[9px] font-bold text-indigo-400">{slot}</span>
                                            </div>
                                        );
                                    })}

                                    {/* Now indicator */}
                                    {isToday && (() => {
                                        const now = new Date();
                                        const top = ((now.getHours() * 60 + now.getMinutes() - HOUR_START * 60) / SLOT_MIN) * SLOT_HEIGHT;
                                        if (top < 0 || top > TIME_SLOTS.length * SLOT_HEIGHT) return null;
                                        return (
                                            <div className="absolute left-0 right-0 z-30 flex items-center pointer-events-none" style={{ top: `${top}px` }}>
                                                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-md shadow-rose-500/50 -ml-1.5 flex-shrink-0" />
                                                <div className="flex-1 h-0.5 bg-rose-400 shadow-sm" />
                                            </div>
                                        );
                                    })()}

                                    {/* Eventos — por recurso activo ESE DÍA */}
                                    {dayRes.map((recurso, rIdx) => {
                                        const color = recurso.color || '#6366f1';
                                        const events = getReservasForDayAndRecurso(day, recurso.id);
                                        const laid = layoutEvents(events);

                                        // Sub-columna de este recurso dentro del día
                                        const colW = 100 / nRes;
                                        const colLeft = rIdx * colW;

                                        return laid.map(({ ev, colIndex, colCount }) => {
                                            const { top, height } = getEventPos(ev);
                                            const isPending = ev.estado === 'PENDIENTE';
                                            const isApproved = ev.estado === 'APROBADA';
                                            const isRejected = ev.estado === 'RECHAZADA' || ev.estado === 'CANCELADA';

                                            // Sub-sub-columna por solapamiento dentro del mismo recurso
                                            const subW = colW / colCount;
                                            const subLeft = colLeft + colIndex * subW;

                                            return (
                                                <div key={ev.id}
                                                    className="absolute z-20 cursor-pointer group transition-all hover:z-40"
                                                    style={{
                                                        top: `${top}px`, height: `${height}px`,
                                                        left: `${subLeft}%`, width: `calc(${subW}% - 3px)`,
                                                        opacity: isRejected ? 0.35 : 1
                                                    }}
                                                    onClick={e => { e.stopPropagation(); setDetailReserva(ev); }}>

                                                    <div className="h-full rounded-lg overflow-hidden flex flex-col"
                                                        style={{
                                                            background: isApproved
                                                                ? hexToRgba(color, 0.15)
                                                                : hexToRgba(color, 0.10),
                                                            borderLeft: `4px solid ${color}`,
                                                            borderTop: `1px solid ${hexToRgba(color, isApproved ? 0.5 : 0.25)}`,
                                                            borderRight: `1px solid ${hexToRgba(color, isApproved ? 0.5 : 0.25)}`,
                                                            borderBottom: `1px solid ${hexToRgba(color, isApproved ? 0.5 : 0.25)}`,
                                                            boxShadow: isApproved ? `0 2px 10px ${hexToRgba(color, 0.35)}` : 'none',
                                                        }}>

                                                        {/* Header del evento */}
                                                        <div className="flex-shrink-0 px-2 py-1 flex items-center gap-1"
                                                            style={{ background: hexToRgba(color, isPending ? 0.35 : isApproved ? 0.85 : 0.5) }}>
                                                            {isApproved && <Lock className="w-2.5 h-2.5 text-white flex-shrink-0 opacity-90" />}
                                                            {isPending && <AlertCircle className="w-2.5 h-2.5 text-white flex-shrink-0 opacity-90" />}
                                                            <p className="text-[10px] font-black truncate leading-tight text-white drop-shadow-sm flex-1">
                                                                {ev.titulo}
                                                                {isPending && <span className="ml-1 opacity-80 font-bold border border-white/30 rounded px-1 py-0 text-[8px]">POR APROBAR</span>}
                                                            </p>
                                                        </div>

                                                        {height > 40 && (
                                                            <div className="px-2 py-0.5 flex-1">
                                                                <p className="text-[9px] font-bold truncate" style={{ color }}>
                                                                    {new Date(ev.fecha_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(ev.fecha_fin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                                {height > 65 && <p className="text-[9px] text-slate-500 truncate">{recurso.nombre}</p>}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Borde punteado en PENDIENTE */}
                                                    {isPending && (
                                                        <div className="absolute inset-0 rounded-lg pointer-events-none" style={{ border: `2px dashed ${hexToRgba(color, 0.6)}` }} />
                                                    )}
                                                    {/* Patrón rayado en APROBADA para indicar bloqueo */}
                                                    {isApproved && (
                                                        <div className="absolute inset-0 rounded-lg pointer-events-none opacity-10"
                                                            style={{ backgroundImage: `repeating-linear-gradient(45deg, ${color} 0, ${color} 1px, transparent 0, transparent 50%)`, backgroundSize: '6px 6px' }} />
                                                    )}
                                                </div>
                                            );
                                        });
                                    })}

                                    {/* Bloqueos de horario — overlay ámbar */}
                                    {bloqueos
                                        .filter(b => bloqueoAppliesToDate(b, toDateStr(day)))
                                        .filter(b => filtroRecurso === 'all' || filtroRecurso === `tipo_${recursosFiltrados.find(r => r.id === b.recurso)?.tipo}` || filtroRecurso === String(b.recurso))
                                        .map(b => {
                                            const hiMins = parseInt(b.hora_inicio.split(':')[0]) * 60 + parseInt(b.hora_inicio.split(':')[1]);
                                            const hfMins = parseInt(b.hora_fin.split(':')[0]) * 60 + parseInt(b.hora_fin.split(':')[1]);
                                            const top = ((hiMins - HOUR_START * 60) / SLOT_MIN) * SLOT_HEIGHT;
                                            const height = ((hfMins - hiMins) / SLOT_MIN) * SLOT_HEIGHT;
                                            if (top < 0 || height <= 0) return null;
                                            const rec = recursos.find(r => r.id === b.recurso);
                                            return (
                                                <div key={`bloqueo-${b.id}`} className="absolute z-25 pointer-events-none left-0 right-0"
                                                    style={{ top: `${top}px`, height: `${height}px` }}>
                                                    <div className="h-full mx-0.5 rounded-md flex items-center gap-1 px-2 overflow-hidden"
                                                        style={{
                                                            background: 'repeating-linear-gradient(45deg,rgba(251,191,36,0.18) 0,rgba(251,191,36,0.18) 4px,rgba(254,243,199,0.5) 4px,rgba(254,243,199,0.5) 10px)',
                                                            border: '1.5px solid rgba(251,191,36,0.55)',
                                                        }}>
                                                        <Lock className="w-2.5 h-2.5 text-amber-500 flex-shrink-0" />
                                                        {height > 28 && (
                                                            <span className="text-[9px] font-black text-amber-700 truncate">
                                                                {rec?.nombre} {b.motivo ? `· ${b.motivo}` : '· Bloqueado'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    }
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── MODAL NUEVA RESERVA ── */}
            {modalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-[6vh]" onClick={() => setModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col" style={{ maxHeight: '88vh' }} onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-indigo-600 to-indigo-700">
                            <div>
                                <h3 className="font-black text-white text-sm">Nueva Reserva</h3>
                                <p className="text-indigo-200 text-[10px]">Solicitud de uso de recurso</p>
                            </div>
                            <button onClick={() => setModalOpen(false)} className="text-indigo-200 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
                            {formError && (
                                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                                    <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                                    <span className="text-xs font-bold text-rose-600">{formError}</span>
                                </div>
                            )}
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
                                // Solo recursos ACTIVOS del tipo elegido
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
                            {/* Título */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Título / Motivo *</label>
                                <input type="text" className="w-full rounded-xl border border-slate-200 text-sm px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.titulo} onChange={e => setFormData(p => ({ ...p, titulo: e.target.value }))} placeholder="Ej: Reunión de Directorio..." required />
                            </div>
                            {/* Funcionario */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                                    <span className="flex items-center gap-1.5">
                                        <User className="w-3 h-3" />
                                        Nombre del Funcionario *
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full rounded-xl border border-slate-200 text-sm px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.nombre_funcionario}
                                    onChange={e => setFormData(p => ({ ...p, nombre_funcionario: e.target.value }))}
                                    placeholder="Ej: Juan Pérez González"
                                    required
                                />
                            </div>
                            {/* Fecha y horas */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-3">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Fecha *</label>
                                    <input type="date" className="w-full rounded-xl border border-slate-200 text-sm px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.fecha} onChange={e => setFormData(p => ({ ...p, fecha: e.target.value }))} required />
                                </div>
                                <div className="col-span-3 grid grid-cols-2 gap-3">
                                    {(() => {
                                        // 1. Obtener reservas APROBADAS para este recurso y día
                                        const resDía = reservas.filter(r =>
                                            parseInt(r.recurso) === parseInt(formData.recurso) &&
                                            r.estado === 'APROBADA' &&
                                            toDateStr(r.fecha_inicio) === formData.fecha
                                        );

                                        // 2. Helper para convertir "HH:MM" a minutos
                                        const getMins = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };

                                        // 3. Filtrar slots para "Desde"
                                        const now = new Date();
                                        const nowMins = now.getHours() * 60 + now.getMinutes();
                                        const esHoy = formData.fecha === todayStr;

                                        const slotsDesde = TIME_SLOTS.filter(s => {
                                            const m = getMins(s);
                                            // Si es hoy, no mostrar horas que ya pasaron
                                            if (esHoy && m < nowMins - 15) return false; // Buffer de 15 min por si acaso

                                            // Un slot es válido para empezar si no está DENTRO de una reserva (inicio <= m < fin)
                                            return !resDía.some(r => {
                                                const ri = dtMinutes(r.fecha_inicio);
                                                const rf = dtMinutes(r.fecha_fin);
                                                return m >= ri && m < rf;
                                            });
                                        });

                                        // 4. Filtrar slots para "Hasta" basado en el "Desde" seleccionado
                                        const mDesde = getMins(formData.horaInicio);
                                        const slotsHasta = TIME_SLOTS.filter(s => {
                                            const m = getMins(s);
                                            if (m <= mDesde) return false; // Debe ser posterior
                                            // No puede saltar por encima de una reserva que empiece después de mDesde
                                            const sigReserva = resDía
                                                .filter(r => dtMinutes(r.fecha_inicio) >= mDesde)
                                                .sort((a, b) => dtMinutes(a.fecha_inicio) - dtMinutes(b.fecha_inicio))[0];

                                            if (sigReserva && m > dtMinutes(sigReserva.fecha_inicio)) return false;
                                            return true;
                                        });

                                        return (
                                            <>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Desde *</label>
                                                    <select className="w-full rounded-xl border border-slate-200 text-sm px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                        value={formData.horaInicio} onChange={e => setFormData(p => ({ ...p, horaInicio: e.target.value }))}>
                                                        {slotsDesde.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Hasta *</label>
                                                    <select className="w-full rounded-xl border border-slate-200 text-sm px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                        value={formData.horaFin} onChange={e => setFormData(p => ({ ...p, horaFin: e.target.value }))}>
                                                        {slotsHasta.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                            {/* Observaciones */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Observaciones</label>
                                <textarea rows={2} className="w-full rounded-xl border border-slate-200 text-sm px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                    value={formData.descripcion} onChange={e => setFormData(p => ({ ...p, descripcion: e.target.value }))} placeholder="Opcional..." />
                            </div>
                            <div className="pt-1">
                                <button type="submit" disabled={submitting} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                                    {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    {submitting ? 'Enviando...' : 'Enviar Solicitud'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL DETALLE ── */}
            {detailReserva && (() => {
                const rec = recursos.find(r => r.id === detailReserva.recurso);
                const color = rec?.color || '#6366f1';
                const cfg = ESTADO_CFG[detailReserva.estado] || ESTADO_CFG.PENDIENTE;
                const isRechazando = rechazandoId === detailReserva.id;
                return (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setDetailReserva(null); setRechazandoId(null); setMotivoRechazo(''); }}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="px-6 py-5" style={{ background: `linear-gradient(135deg, ${color}, ${hexToRgba(color, 0.7)})` }}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">{rec?.nombre}</div>
                                        <h3 className="font-black text-white text-base leading-tight">{detailReserva.titulo}</h3>
                                    </div>
                                    <button onClick={() => { setDetailReserva(null); setRechazandoId(null); setMotivoRechazo(''); }} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
                                </div>
                            </div>
                            <div className="p-5 space-y-4">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border"
                                    style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}>
                                    {cfg.label}
                                </span>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 text-sm">
                                        <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <div className="font-bold text-slate-800 capitalize">{new Date(detailReserva.fecha_inicio).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                                            <div className="text-slate-500 text-xs">{new Date(detailReserva.fecha_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(detailReserva.fecha_fin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                        <div className="flex flex-col">
                                            <span className="text-slate-800 font-bold leading-tight">{detailReserva.nombre_funcionario || 'No especificado'}</span>
                                            <span className="text-slate-400 text-[10px]">{detailReserva.solicitante_email} (Solicitante)</span>
                                        </div>
                                    </div>
                                    {detailReserva.descripcion && <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 border border-slate-100">{detailReserva.descripcion}</div>}
                                    {detailReserva.motivo_rechazo && (
                                        <div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
                                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-wider mb-1">Motivo de Rechazo</p>
                                            <p className="text-xs text-rose-700">{detailReserva.motivo_rechazo}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Panel inline de rechazo */}
                                {isRechazando && (
                                    <div className="bg-rose-50 rounded-xl p-4 border border-rose-200 space-y-3">
                                        <p className="text-xs font-black text-rose-600 uppercase tracking-wider">Motivo del Rechazo</p>
                                        <textarea
                                            autoFocus
                                            rows={3}
                                            value={motivoRechazo}
                                            onChange={e => setMotivoRechazo(e.target.value)}
                                            placeholder="Ej: El horario se superpone con otra actividad..."
                                            className="w-full rounded-xl border border-rose-200 text-sm px-3 py-2.5 focus:ring-2 focus:ring-rose-400 outline-none resize-none bg-white text-slate-700"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setRechazandoId(null); setMotivoRechazo(''); }}
                                                className="flex-1 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition border border-slate-200 bg-white"
                                            >Cancelar</button>
                                            <button
                                                onClick={() => handleEstado(detailReserva.id, 'RECHAZADA', motivoRechazo)}
                                                className="flex-1 py-2 bg-rose-600 text-white rounded-xl font-black text-xs hover:bg-rose-700 transition"
                                            >Confirmar Rechazo</button>
                                        </div>
                                    </div>
                                )}

                                {detailReserva.estado === 'PENDIENTE' && !isRechazando && (
                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                                        <button onClick={() => handleEstado(detailReserva.id, 'APROBADA')} className="flex items-center justify-center gap-2 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl font-black text-xs hover:bg-emerald-100 border border-emerald-200">
                                            <Check className="w-4 h-4" /> Aprobar
                                        </button>
                                        <button onClick={() => { setRechazandoId(detailReserva.id); setMotivoRechazo(''); }} className="flex items-center justify-center gap-2 py-2.5 bg-rose-50 text-rose-700 rounded-xl font-black text-xs hover:bg-rose-100 border border-rose-200">
                                            <X className="w-4 h-4" /> Rechazar
                                        </button>
                                    </div>
                                )}
                                {detailReserva.estado === 'APROBADA' && (
                                    <button onClick={() => handleEstado(detailReserva.id, 'FINALIZADA')} className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-700 rounded-xl font-black text-xs hover:bg-blue-100 border border-blue-200">
                                        <Check className="w-4 h-4" /> Marcar como Finalizada
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ── MODAL ADMINISTRACIÓN ── */}
            {adminOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setAdminOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center">
                                    <Settings className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h2 className="font-black text-slate-800 text-sm">Administrar Recursos</h2>
                                    <p className="text-[10px] text-slate-400">Salas, vehículos y equipos reservables</p>
                                </div>
                            </div>
                            <button onClick={() => setAdminOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="flex flex-1 overflow-hidden min-h-0">
                            {/* Lista */}
                            <div className="w-60 border-r border-slate-100 overflow-y-auto bg-slate-50/50">
                                <div className="p-3 space-y-1">
                                    <button onClick={openAdminCreate}
                                        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-black transition mb-3 ${!adminEditing ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
                                        <Plus className="w-3.5 h-3.5" /> Nuevo Recurso
                                    </button>
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 pb-1">Recursos existentes</div>
                                    {recursos.length === 0 && <p className="text-xs text-slate-400 italic text-center py-4">Sin recursos.</p>}
                                    {recursos.map(r => {
                                        const Icon = RECURSO_ICONS[r.tipo] || Package;
                                        const isSelected = adminEditing?.id === r.id;
                                        const color = r.color || '#6366f1';
                                        return (
                                            <div key={r.id} onClick={() => openAdminEdit(r)}
                                                className={`flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition ${!r.activo ? 'opacity-40' : ''} ${isSelected ? 'border' : 'hover:bg-white'}`}
                                                style={{ borderColor: isSelected ? color : 'transparent', background: isSelected ? hexToRgba(color, 0.06) : '' }}>
                                                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: isSelected ? color : '#f1f5f9' }}>
                                                    <Icon className="w-3.5 h-3.5" style={{ color: isSelected ? 'white' : '#94a3b8' }} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-black truncate" style={{ color: isSelected ? color : '#334155' }}>{r.nombre}</p>
                                                    <p className="text-[9px] text-slate-400 truncate">{r.tipo}</p>
                                                </div>
                                                {!r.activo && <span className="text-[8px] font-black text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full">INACT.</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Formulario */}
                            <div className="flex-1 overflow-y-auto p-6">
                                <h3 className="font-black text-slate-800 text-sm mb-4">
                                    {adminEditing ? `Editando: ${adminEditing.nombre}` : 'Crear nuevo recurso'}
                                </h3>
                                {adminError && (
                                    <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 mb-4">
                                        <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                                        <span className="text-xs font-bold text-rose-600">{adminError}</span>
                                    </div>
                                )}
                                <form onSubmit={handleAdminSave} className="space-y-4">
                                    {/* Tipo */}
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Tipo *</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[{ v: 'SALA', l: 'Sala de Reuniones', I: Building2 }, { v: 'VEHICULO', l: 'Vehículo', I: Truck }, { v: 'PROYECTOR', l: 'Proyector/Equipo', I: Monitor }, { v: 'OTRO', l: 'Otro', I: Package }].map(({ v, l, I }) => (
                                                <button key={v} type="button" onClick={() => setAdminForm(p => ({ ...p, tipo: v }))}
                                                    className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-left transition text-xs font-bold ${adminForm.tipo === v ? 'bg-slate-800 border-slate-800 text-white' : 'border-slate-100 text-slate-600 hover:border-slate-200'}`}>
                                                    <I className="w-3.5 h-3.5" /> {l}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Nombre */}
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Nombre *</label>
                                        <input type="text" className="w-full rounded-xl border border-slate-200 text-sm px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={adminForm.nombre} onChange={e => setAdminForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Sala Directorio, Van Toyota..." required />
                                    </div>

                                    {/* Color RGB */}
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Color en Calendario</label>
                                        <div className="flex items-center gap-3">
                                            <input type="color" value={adminForm.color} onChange={e => setAdminForm(p => ({ ...p, color: e.target.value }))}
                                                className="w-10 h-10 rounded-xl border-2 border-slate-200 cursor-pointer p-0.5 bg-white" />
                                            <div className="flex-1 grid grid-cols-4 gap-1.5">
                                                {DEFAULT_COLORS.map(c => (
                                                    <button key={c} type="button" onClick={() => setAdminForm(p => ({ ...p, color: c }))}
                                                        className="h-7 rounded-lg border-2 transition"
                                                        style={{ background: c, borderColor: adminForm.color === c ? '#1e293b' : 'transparent' }}
                                                        title={c} />
                                                ))}
                                            </div>
                                            <span className="text-xs font-bold text-slate-500 font-mono">{adminForm.color}</span>
                                        </div>
                                        {/* Preview */}
                                        <div className="mt-2 rounded-xl overflow-hidden border border-slate-100" style={{ background: hexToRgba(adminForm.color, 0.1) }}>
                                            <div className="px-3 py-2" style={{ background: hexToRgba(adminForm.color, 0.7) }}>
                                                <p className="text-[10px] font-black text-white">{adminForm.nombre || 'Nombre del recurso'}</p>
                                            </div>
                                            <div className="px-3 py-1">
                                                <p className="text-[9px] font-bold" style={{ color: adminForm.color }}>09:00 – 10:00</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Ubicación + Capacidad */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><MapPin className="w-3 h-3" /> Ubicación</label>
                                            <input type="text" className="w-full rounded-xl border border-slate-200 text-sm px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                value={adminForm.ubicacion} onChange={e => setAdminForm(p => ({ ...p, ubicacion: e.target.value }))} placeholder="Ej: Piso 2" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Users className="w-3 h-3" /> Capacidad</label>
                                            <input type="number" min="1" className="w-full rounded-xl border border-slate-200 text-sm px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                value={adminForm.capacidad} onChange={e => setAdminForm(p => ({ ...p, capacidad: parseInt(e.target.value) || 1 }))} />
                                        </div>
                                    </div>

                                    {/* Descripción */}
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Descripción</label>
                                        <textarea rows={2} className="w-full rounded-xl border border-slate-200 text-sm px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                            value={adminForm.descripcion} onChange={e => setAdminForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Equipamiento, notas..." />
                                    </div>

                                    {/* Botones */}
                                    <div className="flex gap-2 pt-2">
                                        <button type="submit" disabled={adminSaving}
                                            className="flex-1 py-2.5 text-white rounded-xl font-black text-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
                                            style={{ background: adminSaving ? '#94a3b8' : adminForm.color }}>
                                            {adminSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                            {adminEditing ? 'Guardar Cambios' : 'Crear Recurso'}
                                        </button>
                                        {adminEditing && (
                                            <>
                                                <button type="button" onClick={() => handleAdminToggle(adminEditing)}
                                                    className={`px-3 py-2.5 rounded-xl font-black text-xs transition flex items-center gap-1.5 border ${adminEditing.activo ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}>
                                                    <Power className="w-3.5 h-3.5" /> {adminEditing.activo ? 'Desactivar' : 'Activar'}
                                                </button>
                                                <button type="button" onClick={() => handleAdminDelete(adminEditing)}
                                                    className="px-3 py-2.5 bg-rose-50 text-rose-600 rounded-xl font-black text-xs hover:bg-rose-100 border border-rose-200">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </form>

                                {/* ── PANEL DE BLOQUEOS (solo al editar) ── */}
                                {adminEditing && (
                                    <div className="mt-6 border-t border-slate-100 pt-5">
                                        <button
                                            type="button"
                                            onClick={() => setBloqueoTab(p => !p)}
                                            className="flex items-center gap-2 w-full text-left mb-3"
                                        >
                                            <Lock className="w-3.5 h-3.5 text-amber-500" />
                                            <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                                                Bloqueos de Horario
                                            </span>
                                            <span className="ml-auto text-[10px] text-slate-400">
                                                {bloqueoTab ? '▲ ocultar' : '▼ ver/agregar'}
                                            </span>
                                        </button>

                                        {bloqueoTab && (
                                            <div className="space-y-4">
                                                {/* Lista de bloqueos actuales */}
                                                {bloqueos.filter(b => b.recurso === adminEditing.id).length > 0 ? (
                                                    <div className="space-y-2">
                                                        {bloqueos
                                                            .filter(b => b.recurso === adminEditing.id)
                                                            .map(b => {
                                                                const modoCfg = {
                                                                    DIA: { label: 'Día', color: 'text-amber-700 bg-amber-100' },
                                                                    RANGO: { label: 'Rango', color: 'text-blue-700 bg-blue-100' },
                                                                    INDEFINIDO: { label: '∞', color: 'text-rose-700 bg-rose-100' }
                                                                };
                                                                const mc = modoCfg[b.modo] || modoCfg.DIA;
                                                                const period = b.modo === 'DIA' ? b.fecha_inicio
                                                                    : b.modo === 'RANGO' ? `${b.fecha_inicio} → ${b.fecha_fin}`
                                                                        : `Desde ${b.fecha_inicio}`;
                                                                return (
                                                                    <div key={b.id} className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                                                                        <div className="min-w-0">
                                                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${mc.color}`}>{mc.label}</span>
                                                                                <p className="text-xs font-black text-amber-800 truncate">{period}</p>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <p className="text-[10px] text-amber-600 font-bold">{b.hora_inicio.slice(0, 5)} – {b.hora_fin.slice(0, 5)}</p>
                                                                                {b.motivo && <p className="text-[10px] text-amber-500 italic truncate opacity-70">| {b.motivo}</p>}
                                                                            </div>
                                                                        </div>
                                                                        <button type="button" onClick={() => handleBloqueoDelete(b.id)}
                                                                            className="text-rose-400 hover:text-rose-600 p-1 transition flex-shrink-0">
                                                                            <X className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })
                                                        }
                                                    </div>
                                                ) : (
                                                    <p className="text-[11px] text-slate-400 italic">Sin bloqueos para este recurso.</p>
                                                )}

                                                {/* Formulario para nuevo bloqueo */}
                                                <form onSubmit={handleBloqueoSave} className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-3">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Agregar Bloqueo</p>
                                                    {bloqueoError && (
                                                        <p className="text-[10px] text-rose-600 font-bold">{bloqueoError}</p>
                                                    )}

                                                    {/* Modo */}
                                                    <div>
                                                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Tipo de bloqueo *</label>
                                                        <div className="grid grid-cols-3 gap-1">
                                                            {[{ v: 'DIA', l: 'Día' }, { v: 'RANGO', l: 'Rango' }, { v: 'INDEFINIDO', l: 'Indefinido' }].map(({ v, l }) => (
                                                                <button key={v} type="button"
                                                                    onClick={() => setBloqueoForm(p => ({ ...p, modo: v, fecha_fin: '' }))}
                                                                    className={`py-1.5 rounded-lg text-[10px] font-black transition border ${bloqueoForm.modo === v ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-500 border-slate-200 hover:border-amber-300'}`}>
                                                                    {l}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Fechas según modo */}
                                                    <div className={`grid gap-2 ${bloqueoForm.modo === 'RANGO' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                                        <div>
                                                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">
                                                                {bloqueoForm.modo === 'DIA' ? 'Fecha *' : bloqueoForm.modo === 'INDEFINIDO' ? 'Desde *' : 'Fecha inicio *'}
                                                            </label>
                                                            <input type="date" required
                                                                className="w-full rounded-lg border border-slate-200 text-xs px-2 py-2 focus:ring-1 focus:ring-amber-400 outline-none"
                                                                value={bloqueoForm.fecha_inicio}
                                                                onChange={e => setBloqueoForm(p => ({ ...p, fecha_inicio: e.target.value }))} />
                                                        </div>
                                                        {bloqueoForm.modo === 'RANGO' && (
                                                            <div>
                                                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Fecha fin *</label>
                                                                <input type="date" required
                                                                    className="w-full rounded-lg border border-slate-200 text-xs px-2 py-2 focus:ring-1 focus:ring-amber-400 outline-none"
                                                                    value={bloqueoForm.fecha_fin}
                                                                    min={bloqueoForm.fecha_inicio}
                                                                    onChange={e => setBloqueoForm(p => ({ ...p, fecha_fin: e.target.value }))} />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Horas y motivo */}
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Hora inicio *</label>
                                                            <input type="time" required
                                                                className="w-full rounded-lg border border-slate-200 text-xs px-2 py-2 focus:ring-1 focus:ring-amber-400 outline-none"
                                                                value={bloqueoForm.hora_inicio}
                                                                onChange={e => setBloqueoForm(p => ({ ...p, hora_inicio: e.target.value }))} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Hora fin *</label>
                                                            <input type="time" required
                                                                className="w-full rounded-lg border border-slate-200 text-xs px-2 py-2 focus:ring-1 focus:ring-amber-400 outline-none"
                                                                value={bloqueoForm.hora_fin}
                                                                onChange={e => setBloqueoForm(p => ({ ...p, hora_fin: e.target.value }))} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Motivo (opcional)</label>
                                                        <input type="text"
                                                            className="w-full rounded-lg border border-slate-200 text-xs px-2 py-2 focus:ring-1 focus:ring-amber-400 outline-none"
                                                            placeholder="Ej: Mantención, feriado..."
                                                            value={bloqueoForm.motivo}
                                                            onChange={e => setBloqueoForm(p => ({ ...p, motivo: e.target.value }))} />
                                                    </div>

                                                    <button type="submit" disabled={bloqueoSaving}
                                                        className="w-full py-2 bg-amber-500 text-white rounded-lg text-xs font-black hover:bg-amber-600 transition disabled:opacity-50 flex items-center justify-center gap-1">
                                                        {bloqueoSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
                                                        Agregar Bloqueo
                                                    </button>
                                                </form>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* ── MODAL LOG / HISTORIAL ── */}
            {historyOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-end" onClick={() => setHistoryOpen(false)}>
                    <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col animate-in slide-in-from-right" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h2 className="text-xl font-black text-slate-900">Historial de Reservas</h2>
                                <p className="text-sm text-slate-500">Registros finalizados, rechazados o cancelados</p>
                            </div>
                            <button onClick={() => setHistoryOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition"><X className="w-6 h-6 text-slate-400" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
                            {reservas.filter(r => ['FINALIZADA', 'RECHAZADA', 'CANCELADA'].includes(r.estado))
                                .sort((a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio))
                                .map(r => {
                                    const rec = recursos.find(rec => rec.id === r.recurso);
                                    const cfg = ESTADO_CFG[r.estado] || ESTADO_CFG.PENDIENTE;
                                    const color = rec?.color || '#6366f1';
                                    return (
                                        <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-3">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{rec?.nombre || 'Recurso'}</span>
                                                </div>
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase border" style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}>{cfg.label}</span>
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-800 text-sm">{r.titulo}</h4>
                                                <p className="text-[11px] text-slate-500 mt-1">{r.nombre_funcionario || r.solicitante_email}</p>
                                            </div>
                                            <div className="flex items-center gap-4 pt-2 border-t border-slate-50">
                                                <div className="flex items-center gap-1.5 text-slate-500">
                                                    <Calendar className="w-3 h-3" />
                                                    <span className="text-[10px] font-bold">{toDateStr(r.fecha_inicio)}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-slate-500">
                                                    <Clock className="w-3 h-3" />
                                                    <span className="text-[10px] font-bold">{dtMinutes(r.fecha_inicio) / 60 | 0}:{String(dtMinutes(r.fecha_inicio) % 60).padStart(2, '0')} - {dtMinutes(r.fecha_fin) / 60 | 0}:{String(dtMinutes(r.fecha_fin) % 60).padStart(2, '0')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            {reservas.filter(r => ['FINALIZADA', 'RECHAZADA', 'CANCELADA'].includes(r.estado)).length === 0 && (
                                <div className="text-center py-20">
                                    <Clock className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                    <p className="text-slate-400 font-bold">No hay registros históricos aún</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReservasDashboard;
