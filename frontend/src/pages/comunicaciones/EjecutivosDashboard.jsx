import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Building2, ArrowRight, ClipboardList, Clock, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const EjecutivoDashboard = () => {
    const [asignaciones, setAsignaciones] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMisEstablecimientos = async () => {
            try {
                const res = await api.get('ejecutivos/asignaciones/mis_asignaciones/');
                setAsignaciones(res.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchMisEstablecimientos();
    }, []);

    if (loading) return <div className="text-slate-500 font-medium">Cargando tus establecimientos...</div>;

    if (asignaciones.length === 0) {
        return (
            <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Building2 className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-700">Sin Asignaciones</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm">No tienes establecimientos asignados actualmente para realizar seguimiento.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {asignaciones.map(a => (
                <div key={a.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group">
                    <div className="p-4">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] uppercase font-black tracking-widest rounded-full">Activo</span>
                        </div>
                        <h3 className="font-bold text-slate-800 text-lg leading-tight mb-2">{a.establecimiento_details?.nombre}</h3>
                        <p className="text-xs font-semibold text-slate-400 mb-6">RBD: {a.establecimiento_details?.rbd}</p>
                        
                        <div className="flex gap-4">
                            <Link 
                                to={`/comunicaciones/ejecutivos/gestion/${a.establecimiento_details?.id}`}
                                className="flex-1 bg-slate-50 hover:bg-indigo-50 text-indigo-600 font-bold text-sm py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors group-hover:bg-indigo-600 group-hover:text-white"
                            >
                                Gestionar
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default EjecutivoDashboard;
