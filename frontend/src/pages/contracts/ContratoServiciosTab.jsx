import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Truck, Calendar, ArrowRight, Loader2, AlertCircle, Plus, Info } from 'lucide-react';
import api from '../../api';

const ContratoServiciosTab = ({ contractId }) => {
    const [servicios, setServicios] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchServicios = async () => {
            try {
                const servRes = await api.get(`contratos/servicios/?contrato=${contractId}`);
                setServicios(servRes.data.results || servRes.data);
            } catch (error) {
                console.error("Error al cargar servicios del contrato:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchServicios();
    }, [contractId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-10">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (servicios.length === 0) {
        return (
            <div className="p-12 text-center bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                    <Truck className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-700">Sin Contratos Operativos</h3>
                <p className="text-slate-500 text-sm mt-1 max-w-xs">Este contrato aún no tiene una gestión operativa vinculada.</p>
                <Link 
                    to="/contracts/servicios"
                    className="mt-6 flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Ir a Gestión de Contratos
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <Truck className="w-5 h-5 text-indigo-500" /> 
                        Gestión Operativa Vinculada
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Control de rutas, asistencia y periodos de cobro.</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {servicios.map(servicio => (
                    <div key={servicio.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-indigo-300 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                <Truck className="w-5 h-5" />
                            </div>
                            <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider">
                                {servicio.tipo_servicio_nombre}
                            </span>
                        </div>
                        
                        <h4 className="font-bold text-slate-800 text-sm mb-1">{servicio.nombre}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Operativo</p>
                        
                        <Link 
                            to={`/contracts/servicios/${servicio.id}`}
                            className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-indigo-50 hover:text-indigo-700 transition-all group/btn"
                        >
                            <span className="text-[10px] font-bold text-slate-500 group-hover/btn:text-indigo-600 uppercase tracking-widest">Abrir Centro Operativo</span>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover/btn:text-indigo-600" />
                        </Link>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                <Info className="w-5 h-5 text-blue-500 shrink-0" />
                <p className="text-xs text-blue-700 leading-relaxed">
                    <strong>Nota:</strong> El apartado operativo permite gestionar la ejecución diaria (asistencia de rutas, periodos de cobro y multas). Para crear una nueva gestión, diríjase al módulo de <strong>Gestión de Contratos</strong> en el menú lateral.
                </p>
            </div>
        </div>
    );
};

export default ContratoServiciosTab;
