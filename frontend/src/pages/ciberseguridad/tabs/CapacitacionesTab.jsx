import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle2, ShieldAlert, RefreshCw, X, Download } from 'lucide-react';
import api from '../../../api';

const CapacitacionesTab = ({ user }) => {
    const [campanas, setCampanas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });

    const [formData, setFormData] = useState({
        nombre_campana: '',
        descripcion: '',
        documento: null,
        fecha_inicio: '',
        fecha_termino: ''
    });

    const fetchCampanas = async () => {
        setLoading(true);
        try {
            const res = await api.get('ciberseguridad/capacitaciones/');
            setCampanas(res.data.results || res.data || []);
        } catch (err) {
            showAlert('error', 'No se pudieron cargar las capacitaciones.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCampanas();
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
                if (formData[key] !== null && formData[key] !== '') {
                    data.append(key, formData[key]);
                }
            });

            await api.post('ciberseguridad/capacitaciones/', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showAlert('success', 'Campaña registrada exitosamente.');
            setShowModal(false);
            fetchCampanas();
        } catch (err) {
            showAlert('error', 'Error al guardar la campaña.');
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
                {user?.user_permissions?.includes('core.add_ciberseguridadcapacitacion') && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md"
                    >
                        <Plus className="w-4 h-4" /> Nueva Campaña
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full text-center text-slate-400 p-8"><RefreshCw className="w-6 h-6 animate-spin mx-auto" /></div>
                ) : campanas.length === 0 ? (
                    <div className="col-span-full text-center text-slate-400 p-8 bg-white rounded-2xl border border-slate-200">No hay campañas registradas.</div>
                ) : (
                    campanas.map(campana => (
                        <div key={campana.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{campana.nombre_campana}</h3>
                            <p className="text-xs text-slate-500">{campana.descripcion}</p>
                            
                            <div className="text-[10px] text-slate-500 pt-2 border-t space-y-1">
                                <div><span className="font-bold">Inicio:</span> {campana.fecha_inicio}</div>
                                <div><span className="font-bold">Término:</span> {campana.fecha_termino || 'Indefinido'}</div>
                            </div>
                            {campana.documento_url && (
                                <a href={campana.documento_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-2 bg-slate-50 hover:bg-slate-100 text-emerald-600 rounded-lg text-[10px] font-black uppercase mt-2">
                                    <Download className="w-3 h-3" /> Descargar Material
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
                            <h3 className="text-xs font-black uppercase text-emerald-600">Registrar Campaña / Capacitación</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:bg-slate-100 p-1 rounded-lg"><X className="w-5 h-5"/></button>
                        </div>
                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400">Nombre de la Campaña</label>
                                <input required className="w-full mt-1 px-4 py-2 border rounded-xl text-xs" onChange={e => setFormData({...formData, nombre_campana: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400">Descripción</label>
                                <textarea required className="w-full mt-1 px-4 py-2 border rounded-xl text-xs h-20" onChange={e => setFormData({...formData, descripcion: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400">Fecha Inicio</label>
                                    <input type="date" required className="w-full mt-1 px-4 py-2 border rounded-xl text-xs" onChange={e => setFormData({...formData, fecha_inicio: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400">Fecha Término</label>
                                    <input type="date" className="w-full mt-1 px-4 py-2 border rounded-xl text-xs" onChange={e => setFormData({...formData, fecha_termino: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400">Material Adjunto (PDF/Imagen)</label>
                                <input type="file" className="w-full mt-1 text-xs" onChange={e => setFormData({...formData, documento: e.target.files[0]})} />
                            </div>
                            <button type="submit" disabled={loading} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs uppercase font-black">Registrar Campaña</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
export default CapacitacionesTab;
