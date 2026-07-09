import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle2, ShieldAlert, RefreshCw, X, Download } from 'lucide-react';
import api from '../../../api';

const PlanesTab = ({ user }) => {
    const [planes, setPlanes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });

    const [formData, setFormData] = useState({
        titulo: '',
        tipo: 'CONTINUIDAD',
        documento: null,
        fecha_aprobacion: '',
        fecha_proxima_revision: '',
        activo: true
    });

    const fetchPlanes = async () => {
        setLoading(true);
        try {
            const res = await api.get('ciberseguridad/planes/');
            setPlanes(res.data.results || res.data || []);
        } catch (err) {
            showAlert('error', 'No se pudieron cargar los planes.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlanes();
    }, []);

    const showAlert = (type, text) => {
        setAlertMsg({ type, text });
        setTimeout(() => setAlertMsg({ type: '', text: '' }), 5000);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                if (formData[key] !== null) {
                    data.append(key, formData[key]);
                }
            });

            await api.post('ciberseguridad/planes/', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showAlert('success', 'Plan registrado exitosamente.');
            setShowModal(false);
            fetchPlanes();
        } catch (err) {
            showAlert('error', 'Error al guardar el plan.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {alertMsg.text && (
                <div className={`p-4 rounded-2xl flex gap-3 items-center border ${
                    alertMsg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                }`}>
                    {alertMsg.type === 'error' ? <ShieldAlert className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                    <p className="text-xs font-bold">{alertMsg.text}</p>
                </div>
            )}

            <div className="flex justify-end">
                {user?.user_permissions?.includes('core.add_ciberseguridadplan') && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md"
                    >
                        <Plus className="w-4 h-4" /> Registrar Plan
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full text-center text-slate-400 p-8"><RefreshCw className="w-6 h-6 animate-spin mx-auto" /></div>
                ) : planes.length === 0 ? (
                    <div className="col-span-full text-center text-slate-400 p-8 bg-white rounded-2xl border border-slate-200">No hay planes registrados.</div>
                ) : (
                    planes.map(plan => (
                        <div key={plan.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{plan.titulo}</h3>
                            <div className="flex gap-2">
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 uppercase">{plan.tipo}</span>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${plan.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100'}`}>
                                    {plan.activo ? 'Vigente' : 'Inactivo'}
                                </span>
                            </div>
                            <div className="text-[10px] text-slate-500 pt-2 border-t space-y-1">
                                <div><span className="font-bold">Aprobado:</span> {plan.fecha_aprobacion}</div>
                                <div><span className="font-bold">Próxima Revisión:</span> {plan.fecha_proxima_revision || 'No definida'}</div>
                            </div>
                            {plan.documento_url && (
                                <a href={plan.documento_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-2 bg-slate-50 hover:bg-slate-100 text-indigo-600 rounded-lg text-[10px] font-black uppercase mt-2">
                                    <Download className="w-3 h-3" /> Descargar Documento
                                </a>
                            )}
                        </div>
                    ))
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-xl p-6 space-y-4 text-left">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-xs font-black uppercase text-indigo-600">Registrar Plan SGSI</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:bg-slate-100 p-1 rounded-lg"><X className="w-5 h-5"/></button>
                        </div>
                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400">Título</label>
                                <input required className="w-full mt-1 px-4 py-2 border rounded-xl text-xs" onChange={e => setFormData({...formData, titulo: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400">Tipo de Plan</label>
                                <select className="w-full mt-1 px-4 py-2 border rounded-xl text-xs" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
                                    <option value="CONTINUIDAD">Continuidad Operativa</option>
                                    <option value="INCIDENTES">Respuesta a Incidentes</option>
                                    <option value="RECUPERACION">Recuperación (DRP)</option>
                                    <option value="OTRO">Otro</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400">Fecha Aprobación</label>
                                    <input type="date" required className="w-full mt-1 px-4 py-2 border rounded-xl text-xs" onChange={e => setFormData({...formData, fecha_aprobacion: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400">Próxima Revisión</label>
                                    <input type="date" className="w-full mt-1 px-4 py-2 border rounded-xl text-xs" onChange={e => setFormData({...formData, fecha_proxima_revision: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400">Documento PDF</label>
                                <input type="file" accept=".pdf,.doc,.docx" className="w-full mt-1 text-xs" onChange={e => setFormData({...formData, documento: e.target.files[0]})} />
                            </div>
                            <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs uppercase font-black">Guardar Plan</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
export default PlanesTab;
