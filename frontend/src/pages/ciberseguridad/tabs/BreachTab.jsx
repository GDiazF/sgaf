import React, { useState, useEffect } from 'react';
import { ShieldAlert, Plus, AlertTriangle, Users, CheckCircle2, Search, RefreshCw, Save, X } from 'lucide-react';
import api from '../../../api';

const BreachTab = ({ user }) => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [search, setSearch] = useState('');
    const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });

    const [formData, setFormData] = useState({
        titulo: '',
        descripcion: '',
        tipo_amenaza: '',
        gravedad_incidente: 'BAJA',
        fecha_incidente: '',
        fecha_descubrimiento: '',
        estimacion_afectados: 0,
        datos_comprometidos: '',
        medidas_mitigacion: '',
        notificado_agencia: false,
        fecha_notificacion_agencia: '',
        notificado_titulares: false,
        fecha_notificacion_titulares: '',
        estado_csirt: 'ALERTA_TEMPRANA',
    });

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await api.get('ciberseguridad/breach/');
            setReports(res.data.results || res.data || []);
        } catch (err) {
            console.error("Error al obtener reportes:", err);
            showAlert('error', 'No se pudieron cargar los registros.');
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
        setLoading(true);
        try {
            const payload = { ...formData };
            if (!payload.fecha_notificacion_agencia) delete payload.fecha_notificacion_agencia;
            if (!payload.fecha_notificacion_titulares) delete payload.fecha_notificacion_titulares;

            await api.post('ciberseguridad/breach/', payload);
            showAlert('success', 'Incidente registrado exitosamente.');
            setShowModal(false);
            fetchReports();
        } catch (err) {
            console.error("Error:", err);
            showAlert('error', 'Error al registrar el incidente.');
        } finally {
            setLoading(false);
        }
    };

    const filteredReports = reports.filter(r =>
        r.titulo.toLowerCase().includes(search.toLowerCase()) ||
        r.descripcion.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            {/* Alert Notification */}
            {alertMsg.text && (
                <div className={`p-4 rounded-2xl flex gap-3 items-center border ${
                    alertMsg.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                }`}>
                    {alertMsg.type === 'error' ? <ShieldAlert className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                    <p className="text-xs font-bold">{alertMsg.text}</p>
                </div>
            )}

            <div className="flex justify-between items-center gap-4">
                <div className="flex-1 max-w-md relative">
                    <input
                        type="text"
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:bg-white focus:border-slate-400 outline-none text-xs font-bold transition-all shadow-sm"
                        placeholder="Buscar incidentes..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
                {user?.user_permissions?.includes('core.add_breachreport') && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md"
                    >
                        <Plus className="w-4 h-4" /> Registrar Incidente
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    {loading ? (
                        <div className="text-center text-slate-400 p-8"><RefreshCw className="w-6 h-6 animate-spin mx-auto" /></div>
                    ) : filteredReports.length === 0 ? (
                        <div className="text-center text-slate-400 p-8 bg-white rounded-2xl border border-slate-200">No hay incidentes registrados.</div>
                    ) : (
                        filteredReports.map((report) => (
                            <div key={report.id} onClick={() => setSelectedReport(report)} className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer ${selectedReport?.id === report.id ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{report.titulo}</h3>
                                <div className="flex gap-2 mt-2">
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 uppercase">{report.gravedad_incidente}</span>
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 uppercase">{report.estado_csirt}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="lg:col-span-1">
                    {selectedReport ? (
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-left space-y-4 sticky top-6">
                            <h3 className="text-xs font-black text-slate-800 uppercase">Detalle del Incidente</h3>
                            <p className="text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">{selectedReport.descripcion}</p>
                            <div className="text-[10px] font-bold text-slate-500">
                                <div><span className="block text-slate-400 uppercase">Gravedad</span> {selectedReport.gravedad_incidente}</div>
                                <div className="mt-2"><span className="block text-slate-400 uppercase">Estado CSIRT</span> {selectedReport.estado_csirt}</div>
                                <div className="mt-2"><span className="block text-slate-400 uppercase">Medidas</span> {selectedReport.medidas_mitigacion || 'N/A'}</div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs font-bold text-slate-400">Seleccione un incidente para ver detalles.</div>
                    )}
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4 text-left">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h3 className="text-xs font-black uppercase text-rose-600 flex items-center gap-2"><ShieldAlert className="w-5 h-5"/> Registrar Incidente</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:bg-slate-100 p-1 rounded-lg"><X className="w-5 h-5"/></button>
                        </div>
                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400">Título</label>
                                <input required className="w-full mt-1 px-4 py-2 border rounded-xl text-xs" value={formData.titulo} onChange={e => setFormData({...formData, titulo: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400">Descripción</label>
                                <textarea required className="w-full mt-1 px-4 py-2 border rounded-xl text-xs h-20" value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400">Gravedad</label>
                                    <select className="w-full mt-1 px-4 py-2 border rounded-xl text-xs" value={formData.gravedad_incidente} onChange={e => setFormData({...formData, gravedad_incidente: e.target.value})}>
                                        <option value="BAJA">BAJA</option>
                                        <option value="MEDIA">MEDIA</option>
                                        <option value="ALTA">ALTA</option>
                                        <option value="CRITICA">CRÍTICA</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400">Estado CSIRT</label>
                                    <select className="w-full mt-1 px-4 py-2 border rounded-xl text-xs" value={formData.estado_csirt} onChange={e => setFormData({...formData, estado_csirt: e.target.value})}>
                                        <option value="NO_REPORTADO">No Reportado</option>
                                        <option value="ALERTA_TEMPRANA">Alerta Temprana (3h)</option>
                                        <option value="ACTUALIZACION">Actualización (72h)</option>
                                        <option value="INFORME_FINAL">Informe Final (15 días)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400">Fecha Incidente</label>
                                    <input type="datetime-local" required className="w-full mt-1 px-4 py-2 border rounded-xl text-xs" value={formData.fecha_incidente} onChange={e => setFormData({...formData, fecha_incidente: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400">Fecha Descubrimiento</label>
                                    <input type="datetime-local" required className="w-full mt-1 px-4 py-2 border rounded-xl text-xs" value={formData.fecha_descubrimiento} onChange={e => setFormData({...formData, fecha_descubrimiento: e.target.value})} />
                                </div>
                            </div>
                            <button type="submit" disabled={loading} className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs uppercase font-black">Registrar Incidente</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
export default BreachTab;
