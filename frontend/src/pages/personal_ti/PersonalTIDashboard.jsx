import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Search, Plus, Edit2, Trash2, X,
    Building, Briefcase, FileText, Filter, AlertCircle,
    CheckCircle, RefreshCw, Phone, Mail, ShieldAlert,
    LayoutGrid, List
} from 'lucide-react';
import api from '../../api';
import BaseModal from '../../components/common/BaseModal';
import FormInput from '../../components/common/FormInput';
import FormSelect from '../../components/common/FormSelect';

// ─── CONSTANTES ────────────────────────────────────────────────────────────────

// Helpers
const hexToRgba = (hex, alpha) => {
    if (!hex || !hex.startsWith('#')) return 'rgba(0,0,0,0.1)';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
};

// ─── MODAL FORMULARIO ──────────────────────────────────────────────────────────

const PersonalModal = ({ isOpen, onClose, onSave, record, establecimientos, funciones, contratos, loading }) => {
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
        if (e) e.preventDefault();
        onSave(form);
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={record ? 'Editar Personal TI' : 'Nuevo Personal TI'}
            subtitle="Administra los datos de soporte y redes para este establecimiento"
            icon={Users}
            loading={loading}
            onSave={handleSubmit}
            saveLabel={record ? 'Guardar Cambios' : 'Registrar'}
            maxWidth="max-w-2xl"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormSelect
                        label="Establecimiento"
                        name="establecimiento"
                        required
                        value={form.establecimiento}
                        onChange={handleChange}
                        options={[
                            { value: '', label: '-- Selecciona un establecimiento --' },
                            ...establecimientos.map(e => ({ value: e.id, label: `${e.rbd ? `[${e.rbd}] ` : ''}${e.nombre}` }))
                        ]}
                    />

                    <FormSelect
                        label="Función"
                        name="funcion"
                        required
                        value={form.funcion}
                        onChange={handleChange}
                        options={[
                            { value: '', label: '-- Selecciona una función --' },
                            ...funciones.map(f => ({ value: f.id, label: f.nombre }))
                        ]}
                    />
                </div>

                <FormInput
                    label="Nombre Completo"
                    name="nombre_completo"
                    required
                    value={form.nombre_completo}
                    onChange={handleChange}
                    placeholder="MARIO RENE CAIPA AVALOS"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                        label="RUT"
                        name="rut"
                        required
                        value={form.rut}
                        onChange={handleChange}
                        placeholder="13413616-2"
                    />

                    <FormSelect
                        label="Tipo de Contrato"
                        name="tipo_contrato"
                        required
                        value={form.tipo_contrato}
                        onChange={handleChange}
                        options={[
                            { value: '', label: '-- Tipo --' },
                            ...contratos.map(c => ({ value: c.id, label: `${c.codigo} · ${c.nombre}` }))
                        ]}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                        label="Teléfono"
                        name="telefono"
                        value={form.telefono}
                        onChange={handleChange}
                        placeholder="+56 9 1234 5678"
                    />

                    <FormInput
                        label="Correo Electrónico"
                        name="correo"
                        type="email"
                        value={form.correo}
                        onChange={handleChange}
                        placeholder="usuario@slep.cl"
                    />
                </div>

                <FormInput
                    label="Observaciones"
                    name="observaciones"
                    value={form.observaciones}
                    onChange={handleChange}
                    placeholder="Notas adicionales..."
                />



                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <input
                        type="checkbox"
                        id="activo"
                        name="activo"
                        checked={form.activo}
                        onChange={handleChange}
                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer pointer-events-auto"
                    />
                    <label htmlFor="activo" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                        Registro activo (Habilitado en el sistema)
                    </label>
                </div>
            </form>
        </BaseModal>
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
        <td className="px-4 py-3 text-xs font-semibold text-slate-400 whitespace-nowrap">
            {record.establecimiento_detalle?.rbd || '—'}
        </td>
        <td className="px-4 py-3">
            <span className="text-xs font-semibold text-slate-700 block max-w-[180px] truncate" title={record.establecimiento_detalle?.nombre}>
                {record.establecimiento_detalle?.nombre || '—'}
            </span>
        </td>
        <td className="px-4 py-3">
            <span
                className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold border"
                style={{ backgroundColor: hexToRgba(record.funcion_color, 0.1), color: record.funcion_color, borderColor: hexToRgba(record.funcion_color, 0.3) }}
            >
                {record.funcion_display}
            </span>
        </td>
        <td className="px-4 py-3 text-xs font-mono text-slate-500 whitespace-nowrap">{record.rut}</td>
        <td className="px-4 py-3 text-xs font-semibold text-slate-800 max-w-[200px] truncate" title={record.nombre_completo}>
            {record.nombre_completo}
        </td>
        <td className="px-4 py-3">
            <span
                className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold"
                style={{ backgroundColor: hexToRgba(record.tipo_contrato_color, 0.1), color: record.tipo_contrato_color }}
            >
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
            <span className={`w-5 h-5 rounded-full flex items-center justify-center mx-auto ${record.activo ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                {record.activo ? <CheckCircle className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
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
        <div className="flex flex-col flex-1 min-h-0 gap-4">
            {/* Header cobertura */}
            <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Establecimientos', value: cobertura.length, color: 'bg-slate-50 text-slate-700', ring: 'ring-slate-200', filtro: 'todos' },
                    { label: 'Con Personal TI', value: conPersonal, color: 'bg-emerald-50 text-emerald-700', ring: 'ring-emerald-200', filtro: 'con' },
                    { label: 'Sin Técnico', value: sinTecnico, color: 'bg-amber-50 text-amber-700', ring: 'ring-amber-200', filtro: 'sin_tecnico' },
                    { label: 'Sin Personal TI', value: sinPersonal, color: 'bg-red-50 text-red-700', ring: 'ring-red-200', filtro: 'sin' },
                ].map(({ label, value, color, ring, filtro: f }) => (
                    <button
                        key={label}
                        onClick={() => setFiltro(f)}
                        className={`rounded-xl border p-3 flex flex-col gap-1 ring-1 text-left transition-all hover:scale-[1.01] active:scale-[0.98] ${filtro === f ? `${ring} ${color} shadow-sm` : `ring-slate-100 bg-white text-slate-600 hover:${ring}`
                            }`}
                    >
                        <p className="text-2xl font-bold text-slate-800">{value}</p>
                        <p className="text-[9px] font-semibold uppercase tracking-wider opacity-70 mt-1">{label}</p>
                    </button>
                ))}
            </div>

            {/* Table Container / Flota Container */}
            <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                {/* Filtros Bar */}
                <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-wrap gap-3 items-center shrink-0">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            placeholder="Buscar establecimiento..."
                            className="w-full pl-9 pr-4 h-9 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition no-global"
                        />
                    </div>
                    <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-slate-200/60 w-fit shrink-0">
                        {[
                            { id: 'todos', label: `Todos (${cobertura.length})`, color: '' },
                            { id: 'con', label: `Con TI (${conPersonal})`, color: 'text-emerald-600' },
                            { id: 'sin_tecnico', label: `Sin Técnico (${sinTecnico})`, color: 'text-amber-600' },
                            { id: 'sin', label: `Sin TI (${sinPersonal})`, color: 'text-red-500' },
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setFiltro(f.id)}
                                className={`px-3 h-7 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${filtro === f.id
                                    ? `bg-slate-900 text-white shadow-sm`
                                    : `${f.color || 'text-slate-500'} hover:text-slate-700 hover:bg-slate-50`
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tabla de cobertura */}
                <div className="flex-1 overflow-auto custom-scrollbar bg-white">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-10 h-10 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin" />
                        </div>
                    ) : (
                        <>
                            <table className="w-full whitespace-nowrap">
                                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        {['RBD', 'Establecimiento', 'Coordinadores', 'Técnicos', 'Total Personal', 'Estado', 'Acción'].map(h => (
                                            <th key={h} className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {datosFiltrados.map((e, i) => (
                                        <motion.tr
                                            key={e.id}
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.02 }}
                                            className={`group transition-colors border-b border-slate-100 ${!e.tiene_personal
                                                ? 'bg-red-50/20 hover:bg-red-50/40'
                                                : e.tecnicos === 0
                                                    ? 'bg-amber-50/20 hover:bg-amber-50/40'
                                                    : 'hover:bg-indigo-50/30'
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
                                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${e.coordinadores > 0 ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-400'}`}>
                                                    {e.coordinadores}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${e.tecnicos > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                                                    {e.tecnicos}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {e.total_personal > 0 ? (
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        <span className="text-xs font-semibold text-emerald-700">{e.total_personal} persona{e.total_personal > 1 ? 's' : ''}</span>
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                                        <span className="text-xs font-semibold text-red-500">Sin asignar</span>
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {!e.tiene_personal ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-semibold rounded-full border border-red-200/60">
                                                        <AlertCircle className="w-3 h-3" /> Sin cobertura
                                                    </span>
                                                ) : e.tecnicos === 0 ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded-full border border-amber-200/60">
                                                        <AlertCircle className="w-3 h-3" /> Sin técnico
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded-full border border-emerald-200/60">
                                                        <CheckCircle className="w-3 h-3" /> Cubierto
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => onAsignar(e)}
                                                    className="flex items-center justify-center gap-1 h-7 px-3 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all opacity-0 group-hover:opacity-100 uppercase tracking-wider"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                    <span>Asignar</span>
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                            {datosFiltrados.length === 0 && (
                                <div className="py-16 text-center text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                    No se encontraron establecimientos
                                </div>
                            )}
                        </>
                    )}
                </div>

                {!loading && datosFiltrados.length > 0 && (
                    <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 shrink-0">
                        <p className="text-[10px] text-slate-400">
                            Mostrando <span className="font-bold text-slate-600">{datosFiltrados.length}</span> de {cobertura.length} establecimientos
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── DASHBOARD PRINCIPAL ────────────────────────────────────────────────────────

const PersonalTIDashboard = () => {
    const [records, setRecords] = useState([]);
    const [establecimientos, setEstablecimientos] = useState([]);
    const [funciones, setFunciones] = useState([]);
    const [contratos, setContratos] = useState([]);
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
        // Cargar Establecimientos (Aumentado limite para mostrar todos)
        api.get('establecimientos/', { params: { page_size: 1000 } }).then(res => {
            const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
            setEstablecimientos(data);
        });
        // Cargar Mantenedores Dinámicos
        api.get('funciones-ti/').then(res => setFunciones(res.data.results || res.data));
        api.get('contratos-ti/').then(res => setContratos(res.data.results || res.data));
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
    const totalCoords = records.filter(r => r.funcion_display.toUpperCase().includes('COORDINADOR')).length;
    const establsUnicos = new Set(records.map(r => r.establecimiento)).size;

    const TABLE_HEADERS = ['RBD', 'Establecimiento', 'Función', 'RUT', 'Nombre Completo', 'Contrato', 'Teléfono', 'Correo', 'Estado', ''];

    return (
        <div className="flex flex-col h-[calc(100vh-150px)] gap-4 overflow-hidden m-2 lg:m-3">
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

            {/* Header Section Aligned to Institutional Design */}
            <div className="shrink-0 flex flex-row justify-between items-start lg:items-end gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase">Personal TI</h1>
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-bold uppercase tracking-wider rounded-md border border-indigo-200/60">Beta</span>
                    </div>
                    <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-1.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                        <span>Control de personal TI de establecimientos SLEP Iquique</span>
                    </p>
                </div>
                <button
                    onClick={() => { setSelectedRecord(null); setModalOpen(true); }}
                    className="flex items-center justify-center gap-2 h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/10 active:scale-95 shrink-0"
                >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nuevo Registro</span>
                </button>
            </div>

            {/* Stats */}
            <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Total Registros', value: records.length, icon: Users, color: 'bg-indigo-50 text-indigo-600', ring: 'ring-indigo-100' },
                    { label: 'Activos', value: totalActivos, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600', ring: 'ring-emerald-100' },
                    { label: 'Coordinadores', value: totalCoords, icon: Briefcase, color: 'bg-violet-50 text-violet-600', ring: 'ring-violet-100' },
                    { label: 'Establecimientos', value: establsUnicos, icon: Building, color: 'bg-amber-50 text-amber-600', ring: 'ring-amber-100' },
                ].map(({ label, value, icon: Icon, color, ring }) => (
                    <motion.div key={label} whileHover={{ y: -1 }} className={`bg-white rounded-xl border border-slate-100 p-3 shadow-sm flex items-center gap-3 ring-1 ${ring}`}>
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                            <Icon className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-slate-800 leading-none">{value}</p>
                            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-1">{label}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Tabs */}
            <div className="shrink-0 flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                {[
                    { id: 'personal', label: 'Personal TI', icon: List },
                    { id: 'cobertura', label: 'Cobertura', icon: LayoutGrid },
                ].map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`flex items-center gap-1.5 px-4 h-8 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{label}</span>
                    </button>
                ))}
            </div>

            {/* TAB: Personal TI */}
            {activeTab === 'personal' && (
                <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                    {/* Filtros Bar */}
                    <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-wrap gap-3 items-center shrink-0">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar por nombre, RUT o establecimiento..."
                                className="w-full pl-9 pr-4 h-9 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition no-global"
                            />
                        </div>
                        {[
                            { value: filterFuncion, onChange: setFilterFuncion, options: funciones.map(f => ({ value: f.id, label: f.nombre })), placeholder: 'Todas las funciones', icon: Filter },
                            { value: filterEstab, onChange: setFilterEstab, options: establecimientos.map(e => ({ value: e.id, label: e.nombre })), placeholder: 'Todos los establecimientos', icon: Building },
                            { value: filterContrato, onChange: setFilterContrato, options: contratos.map(c => ({ value: c.id, label: c.nombre })), placeholder: 'Todos los contratos', icon: FileText },
                        ].map(({ value, onChange, options, placeholder, icon: Icon }, i) => (
                            <div key={i} className="relative">
                                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                <select value={value} onChange={e => onChange(e.target.value)} className="pl-8 pr-8 h-9 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none max-w-[200px] cursor-pointer no-global appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%2522%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-8">
                                    <option value="">{placeholder}</option>
                                    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                        ))}
                        <button onClick={fetchRecords} className="h-9 w-9 flex items-center justify-center border border-slate-200 rounded-xl bg-white text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all active:scale-95" title="Actualizar">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* Tabla Container scrollable */}
                    <div className="flex-1 overflow-auto custom-scrollbar bg-white">
                        <table className="w-full">
                            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                                <tr>
                                    {TABLE_HEADERS.map(h => (
                                        <th key={h} className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={TABLE_HEADERS.length} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-10 h-10 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin" />
                                                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest animate-pulse">Cargando personal TI...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : records.length === 0 ? (
                                    <tr>
                                        <td colSpan={TABLE_HEADERS.length} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center">
                                                    <Users className="w-6 h-6 text-slate-300" />
                                                </div>
                                                <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">Sin registros encontrados</p>
                                            </div>
                                        </td>
                                    </tr>
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
                        <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 shrink-0">
                            <p className="text-[10px] text-slate-400">
                                Mostrando <span className="font-bold text-slate-600">{records.length}</span> registros
                            </p>
                        </div>
                    )}
                </div>
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
                funciones={funciones}
                contratos={contratos}
                loading={modalLoading}
            />
        </div>
    );
};

export default PersonalTIDashboard;
