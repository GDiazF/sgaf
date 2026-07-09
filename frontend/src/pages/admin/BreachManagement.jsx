import React, { useState, useEffect } from 'react';
import {
    ShieldAlert, Plus, Calendar, AlertTriangle, Users,
    Database, CheckCircle2, XCircle, Search, RefreshCw,
    Info, Eye, EyeOff, Save, Check, X, ShieldCheck
} from 'lucide-react';
import api from '../../api';

const BreachManagement = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [search, setSearch] = useState('');
    const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });

    // Form State
    const [formData, setFormData] = useState({
        titulo: '',
        descripcion: '',
        fecha_incidente: '',
        fecha_descubrimiento: '',
        estimacion_afectados: 0,
        datos_comprometidos: '',
        medidas_mitigacion: '',
        notificado_agencia: false,
        fecha_notificacion_agencia: '',
        notificado_titulares: false,
        fecha_notificacion_titulares: ''
    });

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await api.get('admin/breach/');
            setReports(res.data.results || res.data || []);
        } catch (err) {
            console.error("Error al obtener reportes de brechas:", err);
            showAlert('error', 'No se pudieron cargar los registros de brechas.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const showAlert = (type, text) => {
        setAlertMsg({ type, text });
        setTimeout(() => setAlertMsg({ type: '', text: '' }), 5000);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!formData.titulo || !formData.descripcion || !formData.fecha_incidente || !formData.fecha_descubrimiento) {
            showAlert('error', 'Por favor complete todos los campos obligatorios.');
            return;
        }

        setLoading(true);
        try {
            const payload = { ...formData };
            if (!payload.fecha_notificacion_agencia) delete payload.fecha_notificacion_agencia;
            if (!payload.fecha_notificacion_titulares) delete payload.fecha_notificacion_titulares;

            await api.post('admin/breach/', payload);
            showAlert('success', 'Incidente de seguridad registrado exitosamente.');
            setShowModal(false);
            resetForm();
            fetchReports();
        } catch (err) {
            console.error("Error al guardar reporte de brecha:", err);
            showAlert('error', 'Error al registrar el incidente.');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            titulo: '',
            descripcion: '',
            fecha_incidente: '',
            fecha_descubrimiento: '',
            estimacion_afectados: 0,
            datos_comprometidos: '',
            medidas_mitigacion: '',
            notificado_agencia: false,
            fecha_notificacion_agencia: '',
            notificado_titulares: false,
            fecha_notificacion_titulares: ''
        });
    };

    const filteredReports = reports.filter(r =>
        r.titulo.toLowerCase().includes(search.toLowerCase()) ||
        r.descripcion.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-slate-200/80 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-lg font-black text-slate-800 tracking-tight leading-none uppercase">
                        Protocolo de Brechas de Seguridad
                    </h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1.5">
                        Registro y control de incidentes de privacidad de datos (Art. 14 sexies & septies)
                    </p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowModal(true); }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-95 flex-shrink-0"
                >
                    <Plus className="w-4 h-4" />
                    Registrar Brecha
                </button>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Alert Notification */}
                {alertMsg.text && (
                    <div className={`p-4 rounded-2xl flex gap-3 items-center border ${
                        alertMsg.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    }`}>
                        {alertMsg.type === 'error' ? <ShieldAlert className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                        <p className="text-xs font-bold">{alertMsg.text}</p>
                    </div>
                )}

                {/* Search Bar */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
                    <div className="relative">
                        <input
                            type="text"
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:border-slate-900 outline-none text-xs font-bold transition-all"
                            placeholder="Buscar incidentes por título o descripción..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                </div>

                {/* Main List */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left/Middle Column - List */}
                    <div className="lg:col-span-2 space-y-4">
                        {loading && filteredReports.length === 0 ? (
                            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-xs font-bold text-slate-400">
                                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                                Cargando incidentes...
                            </div>
                        ) : filteredReports.length === 0 ? (
                            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-xs font-bold text-slate-400">
                                No se registran brechas de seguridad.
                            </div>
                        ) : (
                            filteredReports.map((report) => (
                                <div
                                    key={report.id}
                                    onClick={() => setSelectedReport(report)}
                                    className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer text-left flex justify-between items-start gap-4 ${
                                        selectedReport?.id === report.id ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200/80'
                                    }`}
                                >
                                    <div className="space-y-3 flex-1">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                                                <AlertTriangle className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                                                    {report.titulo}
                                                </h3>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                                    ID: #{report.id} | Descubrimiento: {new Date(report.fecha_descubrimiento).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-slate-500 line-clamp-2">
                                            {report.descripcion}
                                        </p>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                                report.notificado_agencia ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                            }`}>
                                                {report.notificado_agencia ? 'Reportado APDP' : 'Pendiente Reporte APDP'}
                                            </span>
                                            <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                                report.notificado_titulares ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
                                            }`}>
                                                {report.notificado_titulares ? 'Titulares Notificados' : 'Pendiente Notif. Titulares'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Right Column - Detail Card */}
                    <div className="lg:col-span-1">
                        {selectedReport ? (
                            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm text-left space-y-4 sticky top-6">
                                <div className="border-b border-slate-100 pb-3">
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                                        Detalles del Incidente
                                    </h3>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                        {selectedReport.titulo}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Descripción del Suceso</label>
                                        <p className="text-xs text-slate-600 font-bold bg-slate-50 p-3 rounded-xl mt-1 border border-slate-100 whitespace-pre-wrap">
                                            {selectedReport.descripcion}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500">
                                        <div>
                                            <span className="text-[8px] font-black uppercase text-slate-400 block tracking-wider">Fecha del Incidente</span>
                                            <span>{new Date(selectedReport.fecha_incidente).toLocaleDateString()}</span>
                                        </div>
                                        <div>
                                            <span className="text-[8px] font-black uppercase text-slate-400 block tracking-wider">Fecha Descubrimiento</span>
                                            <span>{new Date(selectedReport.fecha_descubrimiento).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500">
                                        <div>
                                            <span className="text-[8px] font-black uppercase text-slate-400 block tracking-wider">Afectados Estimados</span>
                                            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-slate-400" /> {selectedReport.estimacion_afectados}</span>
                                        </div>
                                        <div>
                                            <span className="text-[8px] font-black uppercase text-slate-400 block tracking-wider">Registrado Por</span>
                                            <span>{selectedReport.registrado_por_nombre || 'Sistema'}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <span className="text-[8px] font-black uppercase text-slate-400 block tracking-wider">Datos Personales Comprometidos</span>
                                        <p className="text-xs text-slate-600 font-semibold bg-slate-50 p-2.5 rounded-xl mt-1 border border-slate-100">
                                            {selectedReport.datos_comprometidos || 'No detallado'}
                                        </p>
                                    </div>

                                    <div>
                                        <span className="text-[8px] font-black uppercase text-slate-400 block tracking-wider">Medidas de Mitigación Adoptadas</span>
                                        <p className="text-xs text-slate-600 font-semibold bg-slate-50 p-2.5 rounded-xl mt-1 border border-slate-100">
                                            {selectedReport.medidas_mitigacion || 'No detallado'}
                                        </p>
                                    </div>

                                    <div className="border-t border-slate-100 pt-3 space-y-2">
                                        <div className="flex justify-between items-center text-[10px] font-bold">
                                            <span className="text-slate-500">Notificado APDP:</span>
                                            <span className="font-black text-slate-800">{selectedReport.notificado_agencia ? `SÍ (${new Date(selectedReport.fecha_notificacion_agencia).toLocaleDateString()})` : 'NO'}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] font-bold">
                                            <span className="text-slate-500">Notificado Titulares:</span>
                                            <span className="font-black text-slate-800">{selectedReport.notificado_titulares ? `SÍ (${new Date(selectedReport.fecha_notificacion_titulares).toLocaleDateString()})` : 'NO'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center text-xs font-bold text-slate-400 sticky top-6">
                                Seleccione un incidente de la lista para ver el reporte detallado de brecha.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Creation Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl relative text-left">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5 text-rose-600" />
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">Registrar Incidente de Privacidad</h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors">
                                <X className="w-4 h-4 text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Título del Incidente *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-950 outline-none text-xs font-bold transition-all"
                                    placeholder="Ej: Fuga de datos por token expuesto, Acceso no autorizado..."
                                    value={formData.titulo}
                                    onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Descripción del Suceso & Vulnerabilidad *</label>
                                <textarea
                                    required
                                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-955 outline-none text-xs font-bold h-24 resize-none transition-all"
                                    placeholder="Detalles del fallo de seguridad y cómo ocurrió..."
                                    value={formData.descripcion}
                                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Fecha Estimada Incidente *</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-700"
                                        value={formData.fecha_incidente}
                                        onChange={e => setFormData({ ...formData, fecha_incidente: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Fecha Descubrimiento *</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-700"
                                        value={formData.fecha_descubrimiento}
                                        onChange={e => setFormData({ ...formData, fecha_descubrimiento: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Estimación Afectados</label>
                                    <input
                                        type="number"
                                        className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-700"
                                        value={formData.estimacion_afectados}
                                        onChange={e => setFormData({ ...formData, estimacion_afectados: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Datos Personales Afectados</label>
                                    <input
                                        type="text"
                                        className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-700"
                                        placeholder="Ej: RUT, nombres, correos"
                                        value={formData.datos_comprometidos}
                                        onChange={e => setFormData({ ...formData, datos_comprometidos: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Medidas de Solución / Mitigación Adoptadas</label>
                                <textarea
                                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-955 outline-none text-xs font-bold h-20 resize-none transition-all"
                                    placeholder="Qué acciones técnicas se han tomado para contener y solucionar..."
                                    value={formData.medidas_mitigacion}
                                    onChange={e => setFormData({ ...formData, medidas_mitigacion: e.target.value })}
                                />
                            </div>

                            <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-350"
                                            checked={formData.notificado_agencia}
                                            onChange={e => setFormData({ ...formData, notificado_agencia: e.target.checked, fecha_notificacion_agencia: e.target.checked ? new Date().toISOString().substring(0, 16) : '' })}
                                        />
                                        <span className="text-[9px] font-black text-slate-700 uppercase tracking-wider">Reportar a Agencia</span>
                                    </label>
                                    {formData.notificado_agencia && (
                                        <input
                                            type="datetime-local"
                                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-[10px] font-bold text-slate-700"
                                            value={formData.fecha_notificacion_agencia}
                                            onChange={e => setFormData({ ...formData, fecha_notificacion_agencia: e.target.value })}
                                        />
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-350"
                                            checked={formData.notificado_titulares}
                                            onChange={e => setFormData({ ...formData, notificado_titulares: e.target.checked, fecha_notificacion_titulares: e.target.checked ? new Date().toISOString().substring(0, 16) : '' })}
                                        />
                                        <span className="text-[9px] font-black text-slate-700 uppercase tracking-wider">Notificar Funcionarios</span>
                                    </label>
                                    {formData.notificado_titulares && (
                                        <input
                                            type="datetime-local"
                                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-[10px] font-bold text-slate-700"
                                            value={formData.fecha_notificacion_titulares}
                                            onChange={e => setFormData({ ...formData, fecha_notificacion_titulares: e.target.value })}
                                        />
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs uppercase font-black tracking-widest transition-all shadow-lg shadow-rose-100 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                            >
                                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Registrar Incidente</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BreachManagement;
