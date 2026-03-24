import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Search, Plus, Edit2, Trash2, X, ChevronDown,
    Building, Briefcase, FileText, Filter, AlertCircle,
    CheckCircle, RefreshCw, Phone, Mail, ShieldAlert,
    LayoutGrid, List, ChevronRight
} from 'lucide-react';
import api from '../../api';

// ─── CONSTANTES ────────────────────────────────────────────────────────────────

const FUNCIONES = [
    { value: 'TECNICO_ENLACES', label: 'Técnico de Enlaces' },
    { value: 'COORDINADOR_ENLACES', label: 'Coordinador(a) de Enlaces' },
    { value: 'ENCARGADO_ENLACE', label: 'Encargado(a) Enlace' },
    { value: 'TECNICO_A_ENLACES', label: 'Técnico/a Enlace' },
    { value: 'OTRO', label: 'Otro' },
];

const CONTRATOS = [
    { value: '24', label: '24 · Profesor Titular' },
    { value: '25', label: '25 · Profesor Contrata' },
    { value: '27', label: '27 · Asist. Educación Plazo Fijo' },
    { value: '28', label: '28 · Asist. Educación Plazo Indefinido' },
    { value: 'OTRO', label: 'Otro' },
];

const FUNCION_COLORS = {
    TECNICO_ENLACES: 'bg-blue-100 text-blue-700 border-blue-200',
    COORDINADOR_ENLACES: 'bg-violet-100 text-violet-700 border-violet-200',
    ENCARGADO_ENLACE: 'bg-amber-100 text-amber-700 border-amber-200',
    TECNICO_A_ENLACES: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    OTRO: 'bg-slate-100 text-slate-600 border-slate-200',
};

const CONTRATO_COLORS = {
    '24': 'bg-emerald-100 text-emerald-700',
    '25': 'bg-teal-100 text-teal-700',
    '27': 'bg-orange-100 text-orange-700',
    '28': 'bg-indigo-100 text-indigo-700',
    'OTRO': 'bg-slate-100 text-slate-500',
};

// ─── MODAL FORMULARIO ──────────────────────────────────────────────────────────

const PersonalModal = ({ isOpen, onClose, onSave, record, establecimientos, loading }) => {
    const emptyForm = {
        establecimiento: '',
        funcion: '',
        rut: '',
        nombre_completo: '',
        tipo_contrato: '',
        telefono: '',
        correo: '',
        activo: true,
        observaciones: '',
    };
    const [form, setForm] = useState(emptyForm);

    useEffect(() => {
        if (record) {
            setForm({
                establecimiento: record.establecimiento ?? '',
                funcion: record.funcion ?? '',
                rut: record.rut ?? '',
                nombre_completo: record.nombre_completo ?? '',
                tipo_contrato: record.tipo_contrato ?? '',
                telefono: record.telefono ?? '',
                correo: record.correo ?? '',
                activo: record.activo ?? true,
                observaciones: record.observaciones ?? '',
            });
        } else {
            setForm(emptyForm);
        }
    }, [record, isOpen]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(form);
    };

    if (!isOpen) return null;

    const InputField = ({ label, name, type = 'text', placeholder, required, icon: Icon }) => (
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
                <input
                    type={type}
                    name={name}
                    value={form[name]}
                    onChange={handleChange}
                    required={required}
                    placeholder={placeholder}
                    className={`w-full ${Icon ? 'pl-9' : 'pl-4'} pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition`}
                />
            </div>
        </div>
    );

    const SelectField = ({ label, name, options, required, icon: Icon }) => (
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
                <select
                    name={name}
                    value={form[name]}
                    onChange={handleChange}
                    required={required}
                    className={`w-full ${Icon ? 'pl-9' : 'pl-4'} pr-8 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition appearance-none`}
                >
                    {options.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
        </div>
    );

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                >
                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-600 to-violet-600">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-white">
                                    {record ? 'Editar Personal TI' : 'Nuevo Personal TI'}
                                </h2>
                                <p className="text-indigo-200 text-xs">Completa los campos requeridos</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                        <SelectField
                            label="Establecimiento" name="establecimiento" required
                            icon={Building}
                            options={[
                                { value: '', label: '-- Selecciona un establecimiento --' },
                                ...establecimientos.map(e => ({ value: e.id, label: `${e.rbd ? `[${e.rbd}] ` : ''}${e.nombre}` }))
                            ]}
                        />
                        <SelectField
                            label="Función" name="funcion" required icon={Briefcase}
                            options={[{ value: '', label: '-- Selecciona una función --' }, ...FUNCIONES]}
                        />

                        <InputField label="Nombre Completo" name="nombre_completo" required placeholder="Ej: MARIO RENE CAIPA AVALOS" />

                        {/* RUT + Contrato en la misma fila */}
                        <div className="grid grid-cols-2 gap-3">
                            <InputField label="RUT" name="rut" required placeholder="Ej: 13413616-2" />
                            <SelectField
                                label="Tipo de Contrato" name="tipo_contrato" required icon={FileText}
                                options={[{ value: '', label: '-- Tipo --' }, ...CONTRATOS]}
                            />
                        </div>

                        {/* Teléfono + Correo en la misma fila */}
                        <div className="grid grid-cols-2 gap-3">
                            <InputField label="Teléfono" name="telefono" placeholder="Ej: +56 9 1234 5678" icon={Phone} />
                            <InputField label="Correo Electrónico" name="correo" type="email" placeholder="usuario@slep.cl" icon={Mail} />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Observaciones</label>
                            <textarea
                                name="observaciones"
                                value={form.observaciones}
                                onChange={handleChange}
                                rows={2}
                                placeholder="Notas adicionales..."
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition resize-none"
                            />
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                            <input type="checkbox" id="activo" name="activo" checked={form.activo} onChange={handleChange} className="w-4 h-4 accent-indigo-600 rounded" />
                            <label htmlFor="activo" className="text-sm font-medium text-slate-700 cursor-pointer">Registro activo</label>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition">
                                Cancelar
                            </button>
                            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-sm font-bold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2">
                                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                {record ? 'Guardar Cambios' : 'Registrar'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// ─── FILA DE TABLA ─────────────────────────────────────────────────────────────

const PersonalRow = ({ record, onEdit, onDelete, index }) => (
    <motion.tr
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.025 }}
        className="group hover:bg-indigo-50/40 transition-colors border-b border-slate-100"
    >
        <td className="px-4 py-3 text-xs font-bold text-slate-400 whitespace-nowrap">
            {record.establecimiento_detalle?.rbd || '—'}
        </td>
        <td className="px-4 py-3">
            <span className="text-xs font-semibold text-slate-700 block max-w-[180px] truncate" title={record.establecimiento_detalle?.nombre}>
                {record.establecimiento_detalle?.nombre || '—'}
            </span>
        </td>
        <td className="px-4 py-3">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border ${FUNCION_COLORS[record.funcion] || FUNCION_COLORS.OTRO}`}>
                {record.funcion_display}
            </span>
        </td>
        <td className="px-4 py-3 text-xs font-mono text-slate-600 whitespace-nowrap">{record.rut}</td>
        <td className="px-4 py-3 text-xs font-semibold text-slate-800 max-w-[200px] truncate" title={record.nombre_completo}>
            {record.nombre_completo}
        </td>
        <td className="px-4 py-3">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold ${CONTRATO_COLORS[record.tipo_contrato] || CONTRATO_COLORS.OTRO}`}>
                {record.tipo_contrato_display}
            </span>
        </td>
        {/* Teléfono */}
        <td className="px-4 py-3">
            {record.telefono ? (
                <a href={`tel:${record.telefono}`} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-indigo-600 transition-colors group/tel whitespace-nowrap">
                    <Phone className="w-3 h-3 text-slate-400 group-hover/tel:text-indigo-500 flex-shrink-0" />
                    {record.telefono}
                </a>
            ) : (
                <span className="text-slate-300 text-xs">—</span>
            )}
        </td>
        {/* Correo */}
        <td className="px-4 py-3">
            {record.correo ? (
                <a href={`mailto:${record.correo}`} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-indigo-600 transition-colors group/mail max-w-[160px] truncate" title={record.correo}>
                    <Mail className="w-3 h-3 text-slate-400 group-hover/mail:text-indigo-500 flex-shrink-0" />
                    {record.correo}
                </a>
            ) : (
                <span className="text-slate-300 text-xs">—</span>
            )}
        </td>
        {/* Estado */}
        <td className="px-4 py-3">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center mx-auto ${record.activo ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                {record.activo ? <CheckCircle className="w-3 h-3" /> : <X className="w-3 h-3" />}
            </span>
        </td>
        <td className="px-4 py-3">
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEdit(record)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Editar">
                    <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onDelete(record.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Eliminar">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </td>
    </motion.tr>
);

// ─── TAB: COBERTURA ────────────────────────────────────────────────────────────

const CoberturaTab = ({ onAsignar }) => {
    const [cobertura, setCobertura] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState('todos'); // 'todos' | 'sin' | 'con' | 'sin_tecnico'
    const [busqueda, setBusqueda] = useState('');

    useEffect(() => {
        api.get('personal-ti/cobertura/')
            .then(res => setCobertura(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const datosFiltrados = cobertura.filter(e => {
        const matchFiltro =
            filtro === 'todos' ? true :
                filtro === 'sin' ? !e.tiene_personal :
                    filtro === 'con' ? e.tiene_personal :
                        filtro === 'sin_tecnico' ? e.tecnicos === 0 :  // sin técnico (aunque tenga coordinador)
                            true;
        const matchBusqueda = !busqueda || e.nombre.toLowerCase().includes(busqueda.toLowerCase());
        return matchFiltro && matchBusqueda;
    });

    const sinPersonal = cobertura.filter(e => !e.tiene_personal).length;
    const conPersonal = cobertura.filter(e => e.tiene_personal).length;
    const sinTecnico = cobertura.filter(e => e.tecnicos === 0).length;

    return (
        <div className="flex flex-col gap-5">
            {/* Header cobertura */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Establecimientos', value: cobertura.length, color: 'bg-slate-50 text-slate-700', ring: 'ring-slate-200', filtro: 'todos' },
                    { label: 'Con Personal TI', value: conPersonal, color: 'bg-emerald-50 text-emerald-700', ring: 'ring-emerald-200', filtro: 'con' },
                    { label: 'Sin Técnico', value: sinTecnico, color: 'bg-amber-50 text-amber-700', ring: 'ring-amber-200', filtro: 'sin_tecnico' },
                    { label: 'Sin Personal TI', value: sinPersonal, color: 'bg-red-50 text-red-700', ring: 'ring-red-200', filtro: 'sin' },
                ].map(({ label, value, color, ring, filtro: f }) => (
                    <button
                        key={label}
                        onClick={() => setFiltro(f)}
                        className={`rounded-2xl border p-4 flex flex-col gap-1 ring-1 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${filtro === f ? `${ring} ${color} shadow-md` : `ring-slate-100 bg-white text-slate-600 hover:${ring}`
                            }`}
                    >
                        <p className="text-3xl font-black">{value}</p>
                        <p className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</p>
                    </button>
                ))}
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-3 items-center bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                        placeholder="Buscar establecimiento..."
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl flex-wrap">
                    {[
                        { id: 'todos', label: `Todos (${cobertura.length})`, color: '' },
                        { id: 'con', label: `Con TI (${conPersonal})`, color: 'text-emerald-600' },
                        { id: 'sin_tecnico', label: `Sin Técnico (${sinTecnico})`, color: 'text-amber-600' },
                        { id: 'sin', label: `Sin TI (${sinPersonal})`, color: 'text-red-500' },
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFiltro(f.id)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filtro === f.id
                                ? `bg-white text-slate-900 shadow-sm`
                                : `${f.color || 'text-slate-500'} hover:text-slate-700 hover:bg-white/50`
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tabla de cobertura */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin" />
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                    <table className="w-full whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/80">
                                {['RBD', 'Establecimiento', 'Coordinadores', 'Técnicos', 'Total Personal', 'Estado', 'Acción'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {datosFiltrados.map((e, i) => (
                                <motion.tr
                                    key={e.id}
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.02 }}
                                    className={`border-b border-slate-100 group transition-colors ${!e.tiene_personal
                                        ? 'bg-red-50/40 hover:bg-red-50/70'
                                        : e.tecnicos === 0
                                            ? 'bg-amber-50/40 hover:bg-amber-50/70'
                                            : 'hover:bg-slate-50'
                                        }`}
                                >
                                    <td className="px-4 py-3 text-xs font-bold text-slate-400">{e.rbd || '—'}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {!e.tiene_personal
                                                ? <ShieldAlert className="w-3.5 h-3.5 text-red-400 flex-shrink-0" title="Sin personal TI" />
                                                : e.tecnicos === 0
                                                    ? <ShieldAlert className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" title="Sin técnico asignado" />
                                                    : null
                                            }
                                            <span className="text-xs font-semibold text-slate-700 max-w-[220px] truncate" title={e.nombre}>
                                                {e.nombre}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black ${e.coordinadores > 0 ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-400'}`}>
                                            {e.coordinadores}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black ${e.tecnicos > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                                            {e.tecnicos}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {e.total_personal > 0 ? (
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                <span className="text-xs font-bold text-emerald-700">{e.total_personal} persona{e.total_personal > 1 ? 's' : ''}</span>
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-red-400" />
                                                <span className="text-xs font-bold text-red-500">Sin asignar</span>
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {!e.tiene_personal ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">
                                                <AlertCircle className="w-3 h-3" /> Sin cobertura
                                            </span>
                                        ) : e.tecnicos === 0 ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
                                                <AlertCircle className="w-3 h-3" /> Sin técnico
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">
                                                <CheckCircle className="w-3 h-3" /> Cubierto
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => onAsignar(e)}
                                            className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Plus className="w-3 h-3" />
                                            Asignar
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                    {datosFiltrados.length === 0 && (
                        <div className="py-16 text-center text-slate-400 text-sm font-medium">
                            No se encontraron establecimientos con ese criterio
                        </div>
                    )}
                    <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                        <p className="text-xs text-slate-400">
                            Mostrando <span className="font-bold text-slate-600">{datosFiltrados.length}</span> de {cobertura.length} establecimientos
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── DASHBOARD PRINCIPAL ────────────────────────────────────────────────────────

const PersonalTIDashboard = () => {
    const [records, setRecords] = useState([]);
    const [establecimientos, setEstablecimientos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterFuncion, setFilterFuncion] = useState('');
    const [filterEstab, setFilterEstab] = useState('');
    const [filterContrato, setFilterContrato] = useState('');
    const [toast, setToast] = useState(null);
    const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'cobertura'

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchRecords = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterFuncion) params.funcion = filterFuncion;
            if (filterEstab) params.establecimiento = filterEstab;
            if (filterContrato) params.tipo_contrato = filterContrato;
            if (search) params.search = search;
            const res = await api.get('personal-ti/', { params });
            const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
            setRecords(data);
        } catch (err) {
            showToast('Error al cargar los datos', 'error');
        } finally {
            setLoading(false);
        }
    }, [search, filterFuncion, filterEstab, filterContrato]);

    useEffect(() => { fetchRecords(); }, [fetchRecords]);

    useEffect(() => {
        api.get('establecimientos/', { params: { limit: 300 } }).then(res => {
            const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
            setEstablecimientos(data);
        });
    }, []);

    const handleSave = async (form) => {
        setModalLoading(true);
        try {
            if (selectedRecord) {
                await api.patch(`personal-ti/${selectedRecord.id}/`, form);
                showToast('Registro actualizado correctamente');
            } else {
                await api.post('personal-ti/', form);
                showToast('Personal TI registrado correctamente');
            }
            setModalOpen(false);
            fetchRecords();
        } catch (err) {
            showToast('Error al guardar el registro', 'error');
        } finally {
            setModalLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de eliminar este registro?')) return;
        try {
            await api.delete(`personal-ti/${id}/`);
            setRecords(prev => prev.filter(r => r.id !== id));
            showToast('Registro eliminado');
        } catch {
            showToast('Error al eliminar el registro', 'error');
        }
    };

    // Desde cobertura → abrir modal pre-llenando el establecimiento
    const handleAsignarDesdeCobertura = (establecimiento) => {
        setSelectedRecord(null);
        setActiveTab('personal');
        setTimeout(() => {
            setSelectedRecord({ establecimiento: establecimiento.id, _preloaded: true });
            setModalOpen(true);
        }, 100);
    };

    const totalActivos = records.filter(r => r.activo).length;
    const totalCoords = records.filter(r => r.funcion === 'COORDINADOR_ENLACES').length;
    const establsUnicos = new Set(records.map(r => r.establecimiento)).size;

    const TABLE_HEADERS = ['RBD', 'Establecimiento', 'Función', 'RUT', 'Nombre Completo', 'Contrato', 'Teléfono', 'Correo', 'Estado', ''];

    return (
        <div className="flex flex-col gap-6 pb-8 max-w-[1900px] mx-auto">
            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl text-sm font-bold border ${toast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}
                    >
                        {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex flex-wrap justify-between items-end gap-4 border-b border-slate-200/60 pb-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Personal TI</h1>
                        <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-200">Beta</span>
                    </div>
                    <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        Control de personal TI de establecimientos SLEP Iquique
                    </p>
                </div>
                <button
                    onClick={() => { setSelectedRecord(null); setModalOpen(true); }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:opacity-90 hover:shadow-lg hover:shadow-indigo-500/20 transition-all active:scale-95"
                >
                    <Plus className="w-4 h-4" /> Nuevo Registro
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Registros', value: records.length, icon: Users, color: 'bg-indigo-50 text-indigo-600', ring: 'ring-indigo-100' },
                    { label: 'Activos', value: totalActivos, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600', ring: 'ring-emerald-100' },
                    { label: 'Coordinadores', value: totalCoords, icon: Briefcase, color: 'bg-violet-50 text-violet-600', ring: 'ring-violet-100' },
                    { label: 'Establecimientos', value: establsUnicos, icon: Building, color: 'bg-amber-50 text-amber-600', ring: 'ring-amber-100' },
                ].map(({ label, value, icon: Icon, color, ring }) => (
                    <motion.div key={label} whileHover={{ y: -2 }} className={`bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-4 ring-1 ${ring}`}>
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900">{value}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
                {[
                    { id: 'personal', label: 'Personal TI', icon: List },
                    { id: 'cobertura', label: 'Cobertura', icon: LayoutGrid },
                ].map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Icon className="w-4 h-4" /> {label}
                    </button>
                ))}
            </div>

            {/* TAB: Personal TI */}
            {activeTab === 'personal' && (
                <>
                    {/* Filtros */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar por nombre, RUT o establecimiento..."
                                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
                            />
                        </div>
                        {[
                            { value: filterFuncion, onChange: setFilterFuncion, options: FUNCIONES, placeholder: 'Todas las funciones', icon: Filter },
                            { value: filterEstab, onChange: setFilterEstab, options: establecimientos.map(e => ({ value: e.id, label: e.nombre })), placeholder: 'Todos los establecimientos', icon: Building },
                            { value: filterContrato, onChange: setFilterContrato, options: CONTRATOS, placeholder: 'Todos los contratos', icon: FileText },
                        ].map(({ value, onChange, options, placeholder, icon: Icon }, i) => (
                            <div key={i} className="relative">
                                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <select value={value} onChange={e => onChange(e.target.value)} className="pl-8 pr-8 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none appearance-none max-w-[200px]">
                                    <option value="">{placeholder}</option>
                                    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                            </div>
                        ))}
                        <button onClick={fetchRecords} className="p-2 border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all" title="Actualizar">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* Tabla */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/80">
                                        {TABLE_HEADERS.map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={TABLE_HEADERS.length} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin" />
                                                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Cargando personal TI...</p>
                                            </div>
                                        </td></tr>
                                    ) : records.length === 0 ? (
                                        <tr><td colSpan={TABLE_HEADERS.length} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center">
                                                    <Users className="w-8 h-8 text-slate-200" />
                                                </div>
                                                <p className="text-slate-400 font-bold text-sm">Sin registros encontrados</p>
                                            </div>
                                        </td></tr>
                                    ) : records.map((r, i) => (
                                        <PersonalRow
                                            key={r.id} record={r} index={i}
                                            onEdit={(rec) => { setSelectedRecord(rec); setModalOpen(true); }}
                                            onDelete={handleDelete}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {!loading && records.length > 0 && (
                            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                                <p className="text-xs text-slate-400">
                                    Mostrando <span className="font-bold text-slate-600">{records.length}</span> registros
                                </p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* TAB: Cobertura */}
            {activeTab === 'cobertura' && (
                <CoberturaTab onAsignar={handleAsignarDesdeCobertura} />
            )}

            {/* Modal */}
            <PersonalModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                record={selectedRecord}
                establecimientos={establecimientos}
                loading={modalLoading}
            />
        </div>
    );
};

export default PersonalTIDashboard;
